import type { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { createTransport } from "nodemailer";
import { AirtableAdapter } from "./airtable-adapter";
import { logEvent, getTargetEmployerFromPendingEvent } from "./events";
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
  const textColorWithOpacity = "rgba(31, 45, 88, 0.7)";
  const buttonColor = "#F86600";
  const logoUrl = `${process.env.NEXTAUTH_URL}/email/colourful-jobs_logo.png`;
  
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
                Verifieer je email
              </h1>
              
              <!-- Body text -->
              <p style="margin: 0 0 32px; font-size: 16px; line-height: 1.6; color: ${textColorWithOpacity};">
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
              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: ${textColorWithOpacity}; font-style: italic;">
                Deze link is 24 uur geldig en kan maar één keer worden gebruikt. Heb je dit niet aangevraagd? Dan kun je deze e-mail negeren.
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

// Plain text version of login email (existing users)
function loginEmailText({ url }: { url: string }) {
  return `Inloggen bij Colourful jobs\n\nKlik op de link hieronder om je e-mailadres te bevestigen en in te loggen.\n\n${url}\n\nDeze link is 24 uur geldig en kan maar één keer worden gebruikt. Heb je dit niet aangevraagd? Dan kun je deze e-mail negeren.\n\nMet vriendelijke groet,\nHet Colourful jobs team`;
}

// HTML version of login email (existing users)
function loginEmailHtml({ url }: { url: string }) {
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
  <title>Inloggen bij Colourful jobs</title>
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
                Inloggen bij Colourful jobs
              </h1>
              
              <!-- Body text -->
              <p style="margin: 0 0 32px; font-size: 16px; line-height: 1.6; color: ${textColorWithOpacity};">
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
              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: ${textColorWithOpacity}; font-style: italic;">
                Deze link is 24 uur geldig en kan maar één keer worden gebruikt. Heb je dit niet aangevraagd? Dan kun je deze e-mail negeren.
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

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  adapter: AirtableAdapter(),
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
    maxAge: 14 * 24 * 60 * 60, // 14 dagen in seconden
    updateAge: 60 * 60, // Ververs sessie elke 60 minuten bij activiteit
  },
  providers: [
    EmailProvider({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
      sendVerificationRequest: async ({ identifier, url, provider }) => {
        try {
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
            console.error(`⚠️ Email failed to send to ${failed.join(", ")}`);
          } else {
            console.log("✅ Email succesvol verzonden naar", identifier);
          }
        } catch (emailError: any) {
          // Log de error maar gooi NIET - NextAuth verwacht dat deze functie niet faalt
          console.error("⚠️ Email verzending mislukt:", emailError.message);
          throw new Error("Email kon niet worden verzonden. Probeer het later opnieuw.");
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
          
          // For join flow users without employer_id, check for target employer from pending event
          if (!employerId && userStatus === "pending_onboarding") {
            const targetEmployerId = await getTargetEmployerFromPendingEvent(dbUser.id);
            if (targetEmployerId) {
              employerId = targetEmployerId;
            }
          }
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
      // After successful sign in, redirect to appropriate page
      if (url.startsWith("/")) {
        // Don't redirect back to login after successful sign in
        if (url === "/login" || url.startsWith("/login")) {
          return `${baseUrl}/dashboard`;
        }
        return `${baseUrl}${url}`;
      }
      // If url is from same origin, use it (unless it's login)
      try {
        if (new URL(url).origin === baseUrl) {
          if (url.includes("/login")) {
            return `${baseUrl}/dashboard`;
          }
          return url;
        }
      } catch {
        // Invalid URL, fall through to default
      }
      // Default: redirect to dashboard
      return `${baseUrl}/dashboard`;
    },
    async jwt({ token, user, trigger }) {
      // Bij nieuwe login: haal ALTIJD verse data uit database
      // NextAuth's Email provider geeft niet alle custom velden door
      if (user) {
        const userEmail = user.email || token.email as string;
        
        if (userEmail) {
          try {
            const dbUser = await getUserByEmail(userEmail);
            if (dbUser) {
              (token as any).employerId = dbUser.employer_id ?? null;
              (token as any).status = (dbUser.status as EmployerStatus) ?? "pending_onboarding";
            } else {
              // Fallback naar user object als db lookup faalt
              (token as any).employerId = (user as any).employerId ?? null;
              (token as any).status = ((user as any).status as EmployerStatus) ?? "pending_onboarding";
            }
          } catch {
            // Fallback naar user object
            (token as any).employerId = (user as any).employerId ?? null;
            (token as any).status = ((user as any).status as EmployerStatus) ?? "pending_onboarding";
          }
        } else {
          // Geen email beschikbaar, gebruik user object direct
          (token as any).employerId = (user as any).employerId ?? null;
          (token as any).status = ((user as any).status as EmployerStatus) ?? "pending_onboarding";
        }
        (token as any).lastActivity = Date.now();
      }
      
      // Bij session update: haal verse user data op uit database
      if (trigger === "update" && token.email) {
        try {
          const freshUser = await getUserByEmail(token.email as string);
          if (freshUser) {
            (token as any).employerId = freshUser.employer_id ?? null;
            (token as any).status = (freshUser.status as EmployerStatus) ?? "pending_onboarding";
          }
        } catch (error) {
          console.error("[Auth] Error refreshing user data:", error);
        }
      }
      
      // Vangnet: als token status pending_onboarding is maar database zegt active, update de token
      // Dit vangt gevallen op waar de token al bestond met oude status
      if (!user && token.email && (token as any).status === "pending_onboarding") {
        try {
          const dbUser = await getUserByEmail(token.email as string);
          if (dbUser && dbUser.status === "active") {
            (token as any).employerId = dbUser.employer_id ?? null;
            (token as any).status = "active";
          }
        } catch {
          // Silently fail - dit is een optimistische check
        }
      }
      
      // Check inactiviteit (60 minuten)
      const inactivityTimeout = 60 * 60 * 1000;
      const lastActivity = (token as any).lastActivity || Date.now();
      const isInactive = Date.now() - lastActivity > inactivityTimeout;
      
      if (isInactive) {
        return null as any;
      }
      
      // Update lastActivity bij elke request
      (token as any).lastActivity = Date.now();
      
      return token;
    },
    async session({ session, token }) {
      if (!token || !token.sub) {
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



