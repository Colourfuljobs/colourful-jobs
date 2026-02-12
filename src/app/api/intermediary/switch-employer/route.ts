import { authOptions } from "@/lib/auth";
import {
  getUserByEmail,
  setActiveEmployer,
  getEmployerById,
} from "@/lib/airtable";
import { logEvent, getClientIP } from "@/lib/events";
import { getErrorMessage } from "@/lib/utils";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

/**
 * POST /api/intermediary/switch-employer
 * Switch the active employer for an intermediary user
 * Body: { employer_id: string }
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { employer_id } = body;
    const clientIP = getClientIP(request);

    if (!employer_id) {
      return NextResponse.json({ error: "employer_id is required" }, { status: 400 });
    }

    // Get user from database
    const user = await getUserByEmail(session.user.email);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user is an intermediary
    if (user.role_id !== "intermediary") {
      return NextResponse.json(
        { error: "Only intermediaries can switch employers" },
        { status: 403 }
      );
    }

    // Check if employer_id is in managed_employers
    if (!user.managed_employers || !user.managed_employers.includes(employer_id)) {
      return NextResponse.json(
        { error: "Employer not in your managed employers list" },
        { status: 403 }
      );
    }

    // Set the active employer
    await setActiveEmployer(user.id, employer_id);

    // Get employer data to return
    const employer = await getEmployerById(employer_id);

    if (!employer) {
      return NextResponse.json({ error: "Employer not found" }, { status: 404 });
    }

    // Log event
    await logEvent({
      event_type: "user_updated",
      actor_user_id: user.id,
      source: "web",
      ip_address: clientIP,
      payload: {
        action: "switch_active_employer",
        employer_id,
        employer_name: employer.company_name,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: employer.id,
        company_name: employer.company_name || "",
        display_name: employer.display_name || "",
      },
    });
  } catch (error: unknown) {
    console.error("[Switch Employer] error:", getErrorMessage(error));
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to switch employer" },
      { status: 500 }
    );
  }
}
