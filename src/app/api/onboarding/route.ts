import { authOptions } from "@/lib/auth";
import { createEmployer, createUser, updateEmployer, updateUser, getUserByEmail, getEmployerByKVK } from "@/lib/airtable";
import { logEvent, getClientIP } from "@/lib/events";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, first_name, last_name, role } = body;
    const clientIP = getClientIP(request);

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(email);

    let userId: string;
    let employerId: string;

    if (existingUser) {
      // User already exists - don't allow creating duplicate account
      return NextResponse.json(
        { error: "Er bestaat al een account met dit e-mailadres. Log in om verder te gaan." },
        { status: 409 }
      );
    } else {
      // Create new employer
      const employer = await createEmployer({});
      
      // Create new user with name and role
      const user = await createUser({
        email,
        employer_id: employer.id,
        status: "pending_onboarding",
        first_name,
        last_name,
        role,
      });
      userId = user.id;
      employerId = employer.id;

      // Log employer_created event
      await logEvent({
        event_type: "employer_created",
        actor_user_id: userId,
        employer_id: employerId,
        source: "web",
        ip_address: clientIP,
      });

      // Log user_created event
      await logEvent({
        event_type: "user_created",
        actor_user_id: userId,
        employer_id: employerId,
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
        employer_id: employerId,
        source: "web",
        ip_address: clientIP,
      });
    }

    return NextResponse.json({
      userId,
      employerId,
    });
  } catch (error: any) {
    console.error("Onboarding POST error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create onboarding record" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
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
  if (!user.employer_id) {
    return NextResponse.json({ error: "Employer ID not found" }, { status: 400 });
  }

  const updated = await updateEmployer(user.employer_id, body);

  // Log employer_updated event
  await logEvent({
    event_type: "employer_updated",
    actor_user_id: user.id,
    employer_id: user.employer_id,
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
      employer_id: user.employer_id,
      source: "web",
      ip_address: clientIP,
    });
  }

  return NextResponse.json(updated);
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
      } : null,
    });
  } catch (error: any) {
    console.error("Error checking KVK:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check KVK" },
      { status: 500 }
    );
  }
}


