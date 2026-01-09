import type { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { AirtableAdapter } from "./airtable-adapter";
import { logEvent } from "./events";

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
    }),
  ],
  events: {
    async signIn({ user }) {
      // Log user_login event when user successfully signs in
      await logEvent({
        event_type: "user_login",
        actor_user_id: user.id,
        employer_id: (user as any).employerId || null,
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



