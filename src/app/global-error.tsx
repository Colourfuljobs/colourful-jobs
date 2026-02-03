"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#E8EEF2]">
          <div className="max-w-md w-full bg-white rounded-t-[0.75rem] rounded-b-[2rem] p-8 text-center">
            <h2 className="text-xl font-semibold text-[#1F2D58] mb-4">
              Er ging iets mis
            </h2>
            <p className="text-[#1F2D58]/70 mb-6">
              We hebben een fout gemeld en kijken ernaar. Probeer het opnieuw.
            </p>
            <button
              onClick={reset}
              className="bg-[#F86600] text-white px-6 py-3 rounded-full font-medium hover:bg-[#1F2D58] transition-colors"
            >
              Probeer opnieuw
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
