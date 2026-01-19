import {
  getUserByInviteToken,
  getEmployerById,
  updateUser,
} from "@/lib/airtable";
import { logEvent, getClientIP } from "@/lib/events";
import { getErrorMessage } from "@/lib/utils";
import { NextResponse } from "next/server";

/**
 * GET /api/team/accept?token=xxx
 * Validates an invitation token and returns invitation details
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Token is required", valid: false },
        { status: 400 }
      );
    }

    // Get user by invite token
    const invitedUser = await getUserByInviteToken(token);

    if (!invitedUser) {
      return NextResponse.json(
        { error: "Uitnodiging niet gevonden of al gebruikt.", valid: false },
        { status: 404 }
      );
    }

    // Check if invitation is expired
    if (invitedUser.invite_expires) {
      const expiresAt = new Date(invitedUser.invite_expires);
      if (expiresAt < new Date()) {
        return NextResponse.json(
          { error: "Deze uitnodiging is verlopen. Vraag een nieuwe uitnodiging aan.", valid: false },
          { status: 410 }
        );
      }
    }

    // Check if already accepted
    if (invitedUser.status !== "invited") {
      return NextResponse.json(
        { error: "Deze uitnodiging is al geaccepteerd.", valid: false },
        { status: 410 }
      );
    }

    // Get employer details
    const employer = invitedUser.employer_id
      ? await getEmployerById(invitedUser.employer_id)
      : null;

    return NextResponse.json({
      valid: true,
      email: invitedUser.email,
      company_name: employer?.display_name || employer?.company_name || "",
    });
  } catch (error: unknown) {
    console.error("[Team Accept GET] error:", getErrorMessage(error));
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to validate invitation", valid: false },
      { status: 500 }
    );
  }
}

/**
 * POST /api/team/accept
 * Accepts an invitation and completes the user profile
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, first_name, last_name, role } = body;
    const clientIP = getClientIP(request);

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    if (!first_name || !last_name) {
      return NextResponse.json(
        { error: "Voornaam en achternaam zijn verplicht" },
        { status: 400 }
      );
    }

    // Get user by invite token
    const invitedUser = await getUserByInviteToken(token);

    if (!invitedUser) {
      return NextResponse.json(
        { error: "Uitnodiging niet gevonden of al gebruikt." },
        { status: 404 }
      );
    }

    // Check if invitation is expired
    if (invitedUser.invite_expires) {
      const expiresAt = new Date(invitedUser.invite_expires);
      if (expiresAt < new Date()) {
        return NextResponse.json(
          { error: "Deze uitnodiging is verlopen. Vraag een nieuwe uitnodiging aan." },
          { status: 410 }
        );
      }
    }

    // Check if already accepted
    if (invitedUser.status !== "invited") {
      return NextResponse.json(
        { error: "Deze uitnodiging is al geaccepteerd." },
        { status: 410 }
      );
    }

    // Update user: set profile data, clear invitation fields, set status to active
    const updatedUser = await updateUser(invitedUser.id, {
      first_name,
      last_name,
      role: role || undefined,
      status: "active",
      invite_token: null,
      invite_expires: null,
      // Keep invited_by for audit trail
    });

    // Log the event
    await logEvent({
      event_type: "user_joined_employer",
      actor_user_id: invitedUser.id,
      employer_id: invitedUser.employer_id || undefined,
      source: "web",
      ip_address: clientIP,
      payload: {
        email: invitedUser.email,
        first_name,
        last_name,
        invited_by: invitedUser.invited_by,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        first_name: updatedUser.first_name,
        last_name: updatedUser.last_name,
      },
    });
  } catch (error: unknown) {
    console.error("[Team Accept POST] error:", getErrorMessage(error));
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to accept invitation" },
      { status: 500 }
    );
  }
}
