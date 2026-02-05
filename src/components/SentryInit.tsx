"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Initialize Sentry on the client side
if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 1,
    debug: process.env.NODE_ENV === "development",
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
  });
}

export function SentryInit() {
  useEffect(() => {
    if (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_SENTRY_DSN) {
      console.log("[Sentry] Initialized with DSN:", process.env.NEXT_PUBLIC_SENTRY_DSN?.substring(0, 30) + "...");
    }
  }, []);

  return null;
}
