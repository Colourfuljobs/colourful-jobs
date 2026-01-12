import type { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { createTransport } from "nodemailer";
import { AirtableAdapter } from "./airtable-adapter";
import { logEvent } from "./events";
import { getUserByEmail } from "./airtable";

export type EmployerStatus = "pending_onboarding" | "active";

declare module "next-auth" {
  interface User {
    employerId?: string | null;
    status?: EmployerStatus;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      employerId?: string | null;
      status?: EmployerStatus;
    };
  }
}

// Plain text version of verification email (new accounts)
function verificationEmailText({ url }: { url: string }) {
  return `Verifieer je email voor Colourful jobs\n\nKlik op de link hieronder om je e-mailadres te bevestigen en het aanmaken van je account verder af te ronden.\n\n${url}\n\nDeze link is 24 uur geldig en kan maar één keer worden gebruikt. Heb je dit niet aangevraagd? Dan kun je deze e-mail negeren.\n\nMet vriendelijke groet,\nHet Colourful jobs team`;
}

// HTML version of verification email (new accounts)
function verificationEmailHtml({ url }: { url: string }) {
  const backgroundColor = "#E8EEF2";
  const textColor = "#1F2D58";
  const buttonColor = "#F86600";
  
  return `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verifieer je email - Colourful jobs</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; background-color: ${backgroundColor};">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: ${backgroundColor};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px 12px 32px 32px; overflow: hidden; box-shadow: 0 2px 8px rgba(31, 45, 88, 0.08);">
          
          <!-- Content -->
          <tr>
            <td style="padding: 48px 40px;">
              
              <!-- Heading -->
              <h1 style="margin: 0 0 24px; font-size: 24px; font-weight: 700; line-height: 1.3; color: ${textColor};">
                Verifieer je email
              </h1>
              
              <!-- Body text -->
              <p style="margin: 0 0 32px; font-size: 16px; line-height: 1.6; color: ${textColor};">
                Klik op de knop hieronder om je e-mailadres te bevestigen en het aanmaken van je account verder af te ronden.
              </p>
              
              <!-- Button -->
              <table role="presentation" style="margin: 0 0 32px;">
                <tr>
                  <td style="border-radius: 100px; background-color: ${buttonColor};">
                    <a href="${url}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 100px; text-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);">
                      Email direct verifiëren
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Disclaimer -->
              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: ${textColor}; font-style: italic;">
                Deze link is 24 uur geldig en kan maar één keer worden gebruikt. Heb je dit niet aangevraagd? Dan kun je deze e-mail negeren.
              </p>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0;">
              <p style="margin: 0 0 8px; font-size: 14px; line-height: 1.6; color: ${textColor};">
                Met vriendelijke groet,<br>
                Het Colourful jobs team
              </p>
            </td>
          </tr>
          
        </table>
        
        <!-- Small print -->
        <p style="margin: 24px 0 0; font-size: 12px; line-height: 1.5; color: #64748b; text-align: center;">
          © ${new Date().getFullYear()} Colourful jobs
        </p>
        
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

// Plain text version of login email (existing users)
function loginEmailText({ url }: { url: string }) {
  return `Inloggen bij Colourful jobs\n\nKlik op de link hieronder om je e-mailadres te bevestigen en in te loggen.\n\n${url}\n\nDeze link is 24 uur geldig en kan maar één keer worden gebruikt. Heb je dit niet aangevraagd? Dan kun je deze e-mail negeren.\n\nMet vriendelijke groet,\nHet Colourful jobs team`;
}

// HTML version of login email (existing users)
function loginEmailHtml({ url }: { url: string }) {
  const backgroundColor = "#E8EEF2";
  const textColor = "#1F2D58";
  const buttonColor = "#F86600";
  
  return `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inloggen bij Colourful jobs</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; background-color: ${backgroundColor};">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: ${backgroundColor};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px 12px 32px 32px; overflow: hidden; box-shadow: 0 2px 8px rgba(31, 45, 88, 0.08);">
          
          <!-- Content -->
          <tr>
            <td style="padding: 48px 40px;">
              
              <!-- Heading -->
              <h1 style="margin: 0 0 24px; font-size: 24px; font-weight: 700; line-height: 1.3; color: ${textColor};">
                Inloggen bij Colourful jobs
              </h1>
              
              <!-- Body text -->
              <p style="margin: 0 0 32px; font-size: 16px; line-height: 1.6; color: ${textColor};">
                Klik op de knop hieronder om je e-mailadres te bevestigen en in te loggen.
              </p>
              
              <!-- Button -->
              <table role="presentation" style="margin: 0 0 32px;">
                <tr>
                  <td style="border-radius: 100px; background-color: ${buttonColor};">
                    <a href="${url}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 100px; text-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);">
                      Direct inloggen
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Disclaimer -->
              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: ${textColor}; font-style: italic;">
                Deze link is 24 uur geldig en kan maar één keer worden gebruikt. Heb je dit niet aangevraagd? Dan kun je deze e-mail negeren.
              </p>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0;">
              <p style="margin: 0 0 8px; font-size: 14px; line-height: 1.6; color: ${textColor};">
                Met vriendelijke groet,<br>
                Het Colourful jobs team
              </p>
            </td>
          </tr>
          
        </table>
        
        <!-- Small print -->
        <p style="margin: 24px 0 0; font-size: 12px; line-height: 1.5; color: #64748b; text-align: center;">
          © ${new Date().getFullYear()} Colourful jobs
        </p>
        
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  adapter: AirtableAdapter(),
  pages: {
    signIn: "/login",
  },
  providers: [
    EmailProvider({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
      sendVerificationRequest: async ({ identifier, url, provider }) => {
        const transport = createTransport(provider.server);
        
        // Check if user exists and is active
        const existingUser = await getUserByEmail(identifier);
        const isActiveUser = existingUser && existingUser.status === "active";
        
        // Use different email based on user status
        const subject = isActiveUser 
          ? "Inloggen bij Colourful jobs" 
          : "Verifieer je email voor Colourful jobs";
        const textContent = isActiveUser 
          ? loginEmailText({ url }) 
          : verificationEmailText({ url });
        const htmlContent = isActiveUser 
          ? loginEmailHtml({ url }) 
          : verificationEmailHtml({ url });
        
        // Extract email address from provider.from (could be "Name <email>" or just "email")
        const emailMatch = provider.from.match(/<(.+)>/) || [null, provider.from];
        const emailAddress = emailMatch[1];
        const fromField = `"Colourful jobs" <${emailAddress}>`;
        
        const result = await transport.sendMail({
          to: identifier,
          from: fromField,
          subject,
          text: textContent,
          html: htmlContent,
          headers: {
            'X-MailerSend-Footer': 'false',
          },
        });
        
        const failed = result.rejected.concat(result.pending).filter(Boolean);
        if (failed.length) {
          throw new Error(`Email failed to send to ${failed.join(", ")}`);
        }
      },
    }),
  ],
  events: {
    async signIn({ user }) {
      // Fetch user from database to get employer_id and status
      let employerId: string | null = (user as any).employerId || null;
      let userStatus: string | null = null;
      
      if (user.email) {
        const dbUser = await getUserByEmail(user.email);
        if (dbUser) {
          if (!employerId && dbUser.employer_id) {
            employerId = dbUser.employer_id;
          }
          userStatus = dbUser.status || null;
        }
      }
      
      // Log different event based on user status
      // - user_email_verified: user is still in onboarding (just verified their email)
      // - user_login: user has completed onboarding and is logging in
      const eventType = userStatus === "pending_onboarding" ? "user_email_verified" : "user_login";
      
      await logEvent({
        event_type: eventType,
        actor_user_id: user.id,
        employer_id: employerId,
        source: "web",
      });
    },
    async signOut({ token }) {
      // Log user_logout event when user signs out
      if (token?.sub) {
        await logEvent({
          event_type: "user_logout",
          actor_user_id: token.sub,
          employer_id: (token as any).employerId || null,
          source: "web",
        });
      }
    },
  },
  callbacks: {
    async signIn({ user }) {
      // Allow sign in
      return true;
    },
    async redirect({ url, baseUrl }) {
      // After successful sign in, redirect to dashboard
      // If url is a relative path, make it absolute
      if (url.startsWith("/")) {
        // Don't redirect back to login after successful sign in
        if (url === "/login" || url.startsWith("/login")) {
          return `${baseUrl}/dashboard`;
        }
        return `${baseUrl}${url}`;
      }
      // If url is from same origin, use it (unless it's login)
      if (new URL(url).origin === baseUrl) {
        if (url.includes("/login")) {
          return `${baseUrl}/dashboard`;
        }
        return url;
      }
      // Default: redirect to dashboard
      return `${baseUrl}/dashboard`;
    },
    async jwt({ token, user }) {
      if (user) {
        (token as any).employerId = (user as any).employerId ?? null;
        (token as any).status =
          ((user as any).status as EmployerStatus) ?? "pending_onboarding";
      }
      return token;
    },
    async session({ session, token }) {
      if (!token || !token.sub) {
        // If token is missing, return session as-is (will be null/unauthorized)
        return session;
      }
      session.user = {
        id: token.sub as string,
        email: (token.email as string) || session.user?.email || "",
        employerId: (token as any).employerId ?? null,
        status:
          ((token as any).status as EmployerStatus) ?? "pending_onboarding",
      };
      return session;
    },
  },
};



