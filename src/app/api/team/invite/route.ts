import { authOptions } from "@/lib/auth";
import {
  getUserByEmail,
  getEmployerById,
  createUser,
  updateUser,
} from "@/lib/airtable";
import { logEvent, getClientIP } from "@/lib/events";
import { getErrorMessage } from "@/lib/utils";
import { checkRateLimit, onboardingRateLimiter, getIdentifier } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { createTransport } from "nodemailer";
import { randomUUID } from "crypto";

// Email template configuration for invitations
interface InvitationEmailConfig {
  inviterName: string;
  companyName: string;
  inviteUrl: string;
}

function generateInvitationEmailText(config: InvitationEmailConfig): string {
  return `Je bent uitgenodigd voor ${config.companyName} op Colourful jobs

${config.inviterName} heeft je uitgenodigd om deel te nemen aan het werkgeversaccount van ${config.companyName} op Colourful jobs.

Klik op de link hieronder om de uitnodiging te accepteren:
${config.inviteUrl}

Deze link is 24 uur geldig.

Met vriendelijke groet,
Het Colourful jobs team`;
}

function generateInvitationEmailHtml(config: InvitationEmailConfig): string {
  const backgroundColor = "#E8EEF2";
  const textColor = "#1F2D58";
  const textColorWithOpacity = "rgba(31, 45, 88, 0.7)";
  const buttonColor = "#F86600";
  const logoUrl = `${process.env.NEXTAUTH_URL}/email/colourful-jobs_logo.png`;

  return `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Je bent uitgenodigd voor ${config.companyName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; background-color: ${backgroundColor};">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: ${backgroundColor};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        
        <!-- Logo -->
        <div style="text-align: center; margin-bottom: 24px;">
          <img src="${logoUrl}" alt="Colourful jobs" style="height: 32px; width: auto; display: block; margin: 0 auto;">
        </div>
        
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px 12px 32px 32px; overflow: hidden; box-shadow: 0 2px 8px rgba(31, 45, 88, 0.08);">
          
          <!-- Content -->
          <tr>
            <td style="padding: 48px 40px;">
              
              <!-- Heading -->
              <h1 style="margin: 0 0 24px; font-size: 24px; font-weight: 700; line-height: 1.3; color: ${textColor};">
                Je bent uitgenodigd!
              </h1>
              
              <!-- Body text -->
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: ${textColorWithOpacity};">
                <strong style="color: ${textColor};">${config.inviterName}</strong> heeft je uitgenodigd om deel te nemen aan het werkgeversaccount van <strong style="color: ${textColor};">${config.companyName}</strong> op Colourful jobs.
              </p>
              <p style="margin: 0 0 32px; font-size: 16px; line-height: 1.6; color: ${textColorWithOpacity};">
                Klik op de knop hieronder om de uitnodiging te accepteren en je account aan te maken.
              </p>
              
              <!-- Button -->
              <table role="presentation" style="margin: 0 0 32px;">
                <tr>
                  <td style="border-radius: 100px; background-color: ${buttonColor};">
                    <a href="${config.inviteUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 100px; text-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);">
                      Uitnodiging accepteren
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Disclaimer -->
              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: ${textColorWithOpacity}; font-style: italic;">
                Deze link is 24 uur geldig. Heb je deze uitnodiging niet verwacht? Dan kun je deze e-mail negeren.
              </p>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0;">
              <p style="margin: 0 0 8px; font-size: 14px; line-height: 1.6; color: ${textColorWithOpacity};">
                Met vriendelijke groet,<br>
                Het Colourful jobs team
              </p>
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

/**
 * POST /api/team/invite
 * Sends an invitation to join the employer account
 */
export async function POST(request: Request) {
  try {
    // Rate limiting: 10 invitations per hour per IP
    const identifier = getIdentifier(request);
    const rateLimitResult = await checkRateLimit(identifier, onboardingRateLimiter, 10, 3600000);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Te veel uitnodigingen verstuurd. Probeer het over een uur opnieuw." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": rateLimitResult.limit.toString(),
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": rateLimitResult.reset.toString(),
          },
        }
      );
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { email } = body;
    const clientIP = getClientIP(request);

    if (!email) {
      return NextResponse.json(
        { error: "E-mailadres is verplicht" },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Ongeldig e-mailadres" },
        { status: 400 }
      );
    }

    // Get current user from database
    const currentUser = await getUserByEmail(session.user.email);

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Determine effective employer ID
    const effectiveEmployerId = currentUser.role_id === "intermediary" 
      ? currentUser.active_employer 
      : currentUser.employer_id;

    if (!effectiveEmployerId) {
      return NextResponse.json(
        { error: currentUser.role_id === "intermediary"
            ? "Selecteer eerst een werkgever"
            : "No employer linked to this account" },
        { status: 400 }
      );
    }

    // Get employer details for the email
    const employer = await getEmployerById(effectiveEmployerId);

    if (!employer) {
      return NextResponse.json(
        { error: "Employer not found" },
        { status: 404 }
      );
    }

    // Check if email already exists as a user
    const existingUser = await getUserByEmail(email.toLowerCase());

    // Generate invitation token and expiry (24 hours)
    const inviteToken = randomUUID();
    const inviteExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    let invitedUser;

    if (existingUser) {
      // Check if already a team member of this employer
      if (existingUser.employer_id === effectiveEmployerId) {
        if (existingUser.status === "invited") {
          return NextResponse.json(
            { error: "Dit e-mailadres heeft al een openstaande uitnodiging." },
            { status: 409 }
          );
        }
        if (existingUser.status === "active") {
          return NextResponse.json(
            { error: "Dit e-mailadres is al een teamlid." },
            { status: 409 }
          );
        }
      }

      // User exists and is active at another employer
      if (existingUser.status === "active" && existingUser.employer_id) {
        return NextResponse.json(
          { error: "Dit e-mailadres heeft al een account bij Colourful jobs." },
          { status: 409 }
        );
      }

      // User was deleted or is in pending_onboarding - reactivate with new invitation
      if (existingUser.status === "deleted" || existingUser.status === "pending_onboarding") {
        invitedUser = await updateUser(existingUser.id, {
          employer_id: effectiveEmployerId,
          status: "invited",
          invite_token: inviteToken,
          invite_expires: inviteExpires,
          invited_by: currentUser.id,
        });
      } else {
        // Fallback: create new user (shouldn't happen but just in case)
        invitedUser = await createUser({
          email: email.toLowerCase(),
          employer_id: effectiveEmployerId,
          status: "invited",
          invite_token: inviteToken,
          invite_expires: inviteExpires,
          invited_by: currentUser.id,
        });
      }
    } else {
      // No existing user, create new invited user record
      invitedUser = await createUser({
        email: email.toLowerCase(),
        employer_id: effectiveEmployerId,
        status: "invited",
        invite_token: inviteToken,
        invite_expires: inviteExpires,
        invited_by: currentUser.id,
      });
    }

    // Send invitation email
    const inviteUrl = `${process.env.NEXTAUTH_URL}/invitation/${inviteToken}`;
    const inviterName = [currentUser.first_name, currentUser.last_name]
      .filter(Boolean)
      .join(" ") || currentUser.email;
    const companyName = employer.display_name || employer.company_name || "het werkgeversaccount";

    try {
      const transport = createTransport(process.env.EMAIL_SERVER);

      // Extract email address from EMAIL_FROM
      const emailFrom = process.env.EMAIL_FROM || "";
      const emailMatch = emailFrom.match(/<(.+)>/) || [null, emailFrom];
      const emailAddress = emailMatch[1];
      const fromField = `"Colourful jobs" <${emailAddress}>`;

      await transport.sendMail({
        to: email.toLowerCase(),
        from: fromField,
        subject: `Je bent uitgenodigd voor ${companyName} op Colourful jobs`,
        text: generateInvitationEmailText({
          inviterName,
          companyName,
          inviteUrl,
        }),
        html: generateInvitationEmailHtml({
          inviterName,
          companyName,
          inviteUrl,
        }),
      });

      console.log("✅ Invitation email sent to", email);
    } catch (emailError: unknown) {
      console.error("⚠️ Failed to send invitation email:", getErrorMessage(emailError));
      // Don't fail the request, the invitation is still created
    }

    // Log the event
    await logEvent({
      event_type: "user_invited",
      actor_user_id: currentUser.id,
      target_user_id: invitedUser.id,
      employer_id: effectiveEmployerId,
      source: "web",
      ip_address: clientIP,
      payload: {
        invited_email: email.toLowerCase(),
        company_name: companyName,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Uitnodiging verstuurd",
    });
  } catch (error: unknown) {
    console.error("[Team Invite] error:", getErrorMessage(error));
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to send invitation" },
      { status: 500 }
    );
  }
}
