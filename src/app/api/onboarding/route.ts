import { authOptions } from "@/lib/auth";
import { createEmployer, createUser, createWallet, updateEmployer, updateUser, getUserByEmail, getEmployerByKVK, deleteUser, deleteEmployer } from "@/lib/airtable";
import { logEvent, getClientIP } from "@/lib/events";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, first_name, last_name, role, joinMode, target_employer_id } = body;
    const clientIP = getClientIP(request);

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(email);

    let userId: string;
    let employerId: string | null = null;

    if (existingUser) {
      // Check if user is still in pending_onboarding status
      if (existingUser.status === "pending_onboarding") {
        // User exists but hasn't verified yet - allow them to continue
        // Update their name/role if provided
        if (first_name || last_name || role) {
          await updateUser(existingUser.id, {
            first_name: first_name || existingUser.first_name,
            last_name: last_name || existingUser.last_name,
            role: role || existingUser.role,
          });
        }
        
        // Log that we're resending verification
        await logEvent({
          event_type: "user_email_pending",
          actor_user_id: existingUser.id,
          employer_id: existingUser.employer_id || undefined,
          source: "web",
          ip_address: clientIP,
          payload: { resend: true },
        });

        // Return existing user/employer IDs so frontend can send magic link
        return NextResponse.json({
          userId: existingUser.id,
          employerId: existingUser.employer_id,
          resend: true,
        });
      }
      
      // User already exists and is active - don't allow creating duplicate account
      return NextResponse.json(
        { error: "Er bestaat al een account met dit e-mailadres. Log in om verder te gaan." },
        { status: 409 }
      );
    } else if (joinMode) {
      // JOIN MODE: Create user WITHOUT creating a new employer
      // User will be linked to existing employer after email verification
      const user = await createUser({
        email,
        status: "pending_onboarding",
        first_name,
        last_name,
        role,
      });
      userId = user.id;

      // Log user_created event - link to target employer for tracking
      await logEvent({
        event_type: "user_created",
        actor_user_id: userId,
        employer_id: target_employer_id || undefined, // Link to employer they're joining
        source: "web",
        ip_address: clientIP,
        payload: {
          email,
          first_name,
          last_name,
          role,
          joinMode: true,
          target_employer_id,
        },
      });

      // Log email pending event - link to target employer for tracking
      await logEvent({
        event_type: "user_email_pending",
        actor_user_id: userId,
        employer_id: target_employer_id || undefined, // Link to employer they're joining
        source: "web",
        ip_address: clientIP,
        payload: { joinMode: true, target_employer_id },
      });

      return NextResponse.json({
        userId: user.id,
        joinMode: true,
      });
    } else {
      // NORMAL MODE: Create user WITHOUT employer
      // Employer will be created in step 2 when user submits company details
      // This allows users to switch to join flow without creating empty employers
      const user = await createUser({
        email,
        status: "pending_onboarding",
        first_name,
        last_name,
        role,
      });
      userId = user.id;

      // Log user_created event (without employer - will be linked in step 2)
      await logEvent({
        event_type: "user_created",
        actor_user_id: userId,
        source: "web",
        ip_address: clientIP,
        payload: {
          email,
          first_name,
          last_name,
          role,
        },
      });

      // Log onboarding_started event
      await logEvent({
        event_type: "onboarding_started",
        actor_user_id: userId,
        source: "web",
        ip_address: clientIP,
      });

      // Log user_email_pending event (magic link will be sent)
      await logEvent({
        event_type: "user_email_pending",
        actor_user_id: userId,
        source: "web",
        ip_address: clientIP,
      });
    }

    return NextResponse.json({
      userId,
      employerId,
    });
  } catch (error: any) {
    console.error("[Onboarding POST] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create onboarding record" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const clientIP = getClientIP(request);

    // Get user from database by email (more reliable than session.user.id)
    const user = await getUserByEmail(session.user.email);
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if this is a user update (has first_name, last_name, or role - these are user-only fields)
    // Note: status alone is not enough to determine user vs employer update
    if (body.first_name !== undefined || body.last_name !== undefined || body.role !== undefined) {
      // Update user
      const updatedUser = await updateUser(user.id, {
        first_name: body.first_name,
        last_name: body.last_name,
        role: body.role,
        status: body.status,
      });

      // Log user_updated event
      await logEvent({
        event_type: "user_updated",
        actor_user_id: user.id,
        employer_id: user.employer_id,
        source: "web",
        ip_address: clientIP,
        payload: {
          updated_fields: Object.keys(body).filter((key) => body[key] !== undefined),
        },
      });

      return NextResponse.json(updatedUser);
    }

    // Update employer (everything else)
    let employerId = user.employer_id;
    
    // If user doesn't have an employer yet, create one (this happens in step 2)
    if (!employerId) {
      const employer = await createEmployer(body);
      employerId = employer.id;
      
      // Create wallet for the employer
      let walletId: string | null = null;
      try {
        const wallet = await createWallet(employer.id);
        walletId = wallet.id;
      } catch (error) {
        console.error("Failed to create wallet for employer:", employer.id, error);
      }
      
      // Link user to the new employer
      await updateUser(user.id, { employer_id: employerId });
      
      // Log employer_created event
      await logEvent({
        event_type: "employer_created",
        actor_user_id: user.id,
        employer_id: employerId,
        source: "web",
        ip_address: clientIP,
        payload: {
          created_fields: Object.keys(body).filter((key) => body[key] !== undefined),
        },
      });
      
      // Log wallet_created event
      if (walletId) {
        await logEvent({
          event_type: "wallet_created",
          actor_user_id: user.id,
          employer_id: employerId,
          source: "web",
          ip_address: clientIP,
          payload: { wallet_id: walletId },
        });
      }
      
      return NextResponse.json(employer);
    }

    const updated = await updateEmployer(employerId, body);

    // Log employer_updated event
    await logEvent({
      event_type: "employer_updated",
      actor_user_id: user.id,
      employer_id: employerId,
      source: "web",
      ip_address: clientIP,
      payload: {
        updated_fields: Object.keys(body).filter((key) => body[key] !== undefined),
      },
    });

    // Check if onboarding is completed (employer status changed to active)
    if (body.status === "active") {
      await logEvent({
        event_type: "onboarding_completed",
        actor_user_id: user.id,
        employer_id: employerId,
        source: "web",
        ip_address: clientIP,
      });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("[Onboarding PATCH] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update onboarding data" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const kvkNumber = searchParams.get("kvk");
  const getUserData = searchParams.get("user");

  // If user parameter is set, return user data for the logged-in user
  if (getUserData === "true") {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const user = await getUserByEmail(session.user.email);
      
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      return NextResponse.json({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        role: user.role || "",
        email: user.email,
      });
    } catch (error: any) {
      console.error("Error getting user data:", error);
      return NextResponse.json(
        { error: error.message || "Failed to get user data" },
        { status: 500 }
      );
    }
  }

  // Check for KVK duplicate
  if (!kvkNumber) {
    return NextResponse.json({ error: "KVK number is required" }, { status: 400 });
  }

  try {
    const existingEmployer = await getEmployerByKVK(kvkNumber);
    
    return NextResponse.json({
      exists: !!existingEmployer,
      employer: existingEmployer ? {
        id: existingEmployer.id,
        company_name: existingEmployer.company_name,
        display_name: existingEmployer.display_name,
        website_url: existingEmployer.website_url,
      } : null,
    });
  } catch (error: any) {
    console.error("[Onboarding GET] Error checking KVK:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check KVK" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientIP = getClientIP(request);

  try {
    // Get user from database
    const user = await getUserByEmail(session.user.email);
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Log user removal event before deletion
    await logEvent({
      event_type: "user_removed",
      actor_user_id: user.id,
      employer_id: user.employer_id || undefined,
      source: "web",
      ip_address: clientIP,
      payload: {
        reason: "onboarding_restart",
        email: user.email,
      },
    });

    // Delete the employer first (if exists)
    if (user.employer_id) {
      try {
        await deleteEmployer(user.employer_id);
      } catch (error) {
        console.error("Error deleting employer:", error);
        // Continue with user deletion even if employer deletion fails
      }
    }

    // Delete the user
    await deleteUser(user.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Onboarding DELETE] Error deleting onboarding data:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete onboarding data" },
      { status: 500 }
    );
  }
}


