"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export default function OnboardingError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      import("@sentry/nextjs").then((Sentry) => {
        Sentry.captureException(error)
      })
    }
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#E8EEF2]">
      <div className="max-w-md w-full bg-white rounded-t-[0.75rem] rounded-b-[2rem] p-8 text-center">
        <div className="mb-4 flex justify-center">
          <div className="w-16 h-16 rounded-full bg-[#F4DCDC] flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-[#BC0000]" />
          </div>
        </div>
        <h2 className="text-xl font-semibold text-[#1F2D58] mb-2">
          Er ging iets mis
        </h2>
        <p className="text-[#1F2D58]/70 mb-6">
          We hebben de fout gemeld en kijken ernaar. Probeer het opnieuw.
        </p>
        <Button onClick={reset} showArrow={false}>
          Opnieuw proberen
        </Button>
      </div>
    </div>
  )
}
