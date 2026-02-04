import { authOptions } from "@/lib/auth";
import {
  getUserByEmail,
  getUsersByEmployerId,
  getUserById,
  unlinkUserFromEmployer,
  deleteUser,
} from "@/lib/airtable";
import { logEvent, getClientIP } from "@/lib/events";
import { getErrorMessage } from "@/lib/utils";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

/**
 * GET /api/team
 * Fetches all team members for the logged-in user's employer
 * Returns both active users and pending invitations
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from database
    const user = await getUserByEmail(session.user.email);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.employer_id) {
      return NextResponse.json(
        { error: "No employer linked to this account" },
        { status: 400 }
      );
    }

    // Get all team members (active and invited)
    const teamMembers = await getUsersByEmployerId(user.employer_id);

    // Transform to response format
    const response = teamMembers.map((member) => ({
      id: member.id,
      first_name: member.first_name || "",
      last_name: member.last_name || "",
      email: member.email,
      status: member.status === "invited" ? "invited" : "active",
      role: member.role || "",
    }));

    return NextResponse.json({ team: response });
  } catch (error: unknown) {
    console.error("[Team GET] error:", getErrorMessage(error));
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to fetch team members" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/team
 * Removes a team member from the employer account
 * For active users: unlinks them from employer (keeps user account)
 * For invited users: deletes the invitation record
 */
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { user_id } = body;
    const clientIP = getClientIP(request);

    if (!user_id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Get current user from database
    const currentUser = await getUserByEmail(session.user.email);

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!currentUser.employer_id) {
      return NextResponse.json(
        { error: "No employer linked to this account" },
        { status: 400 }
      );
    }

    // Get the user to be removed
    const targetUser = await getUserById(user_id);

    if (!targetUser) {
      return NextResponse.json(
        { error: "Team member not found" },
        { status: 404 }
      );
    }

    // Verify the target user belongs to the same employer
    if (targetUser.employer_id !== currentUser.employer_id) {
      return NextResponse.json(
        { error: "User does not belong to your team" },
        { status: 403 }
      );
    }

    // Check if this would leave the team with no members
    const allTeamMembers = await getUsersByEmployerId(currentUser.employer_id);
    const activeMembers = allTeamMembers.filter(
      (member) => member.status !== "invited"
    );

    // If removing an active member (not invited), check if at least one active member remains
    if (targetUser.status !== "invited" && activeMembers.length <= 1) {
      return NextResponse.json(
        { error: "Er moet minimaal één actief teamlid overblijven" },
        { status: 400 }
      );
    }

    // Handle removal based on status
    if (targetUser.status === "invited") {
      // For invited users, delete the record entirely
      await deleteUser(user_id);
    } else {
      // For active users, unlink from employer (they keep their account)
      await unlinkUserFromEmployer(user_id);
    }

    // Log the event
    await logEvent({
      event_type: "user_removed",
      actor_user_id: currentUser.id,
      target_user_id: user_id,
      employer_id: currentUser.employer_id,
      source: "web",
      ip_address: clientIP,
      payload: {
        target_email: targetUser.email,
        was_invited: targetUser.status === "invited",
        self_removal: currentUser.id === user_id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[Team DELETE] error:", getErrorMessage(error));
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to remove team member" },
      { status: 500 }
    );
  }
}
