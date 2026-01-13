"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

export function SessionProvider({ children }: { children: ReactNode }) {
  return (
    <NextAuthSessionProvider basePath="/api/auth" refetchOnWindowFocus={false}>
      {children}
    </NextAuthSessionProvider>
  );
}


