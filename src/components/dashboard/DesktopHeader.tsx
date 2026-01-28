"use client"

import { useState } from "react"
import Link from "next/link"
import { Coins, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { CreditsCheckoutModal } from "@/components/checkout"
import { useCredits } from "@/lib/credits-context"

interface DesktopHeaderProps {
  title: string
}

export function DesktopHeader({ title }: DesktopHeaderProps) {
  const { credits, isLoading, isPendingUpdate, updateCredits, setOptimisticUpdate } = useCredits()
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)

  const handleCheckoutSuccess = (newBalance: number, purchasedAmount?: number) => {
    updateCredits(newBalance, purchasedAmount)
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      {/* Page title - visible on all screens */}
      <h1 className="contempora-large text-[#1F2D58]">{title}</h1>
      
      {/* Right side: credits and actions - only visible on desktop */}
      <div className="hidden sm:flex flex-wrap-reverse items-center justify-end gap-3">
        {/* Credits info - always on the left, or at the bottom when wrapped */}
        {isLoading ? (
          <Skeleton className="h-12 w-28" />
        ) : (
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1.5 text-[#1F2D58]">
              {isPendingUpdate ? (
                <>
                  <Spinner className="h-4 w-4" />
                  <span className="font-bold text-[#1F2D58]/70">Bijwerken...</span>
                </>
              ) : (
                <>
                  <Coins className="h-4 w-4" />
                  <span className="font-bold">{credits.available} credits</span>
                </>
              )}
            </div>
            <button 
              onClick={() => setIsCheckoutOpen(true)}
              className="text-sm text-[#1F2D58]/70 hover:text-[#1F2D58] hover:underline"
            >
              + credits bijkopen
            </button>
          </div>
        )}
        
        {/* New vacancy button */}
        <Button showArrow={false} asChild>
          <Link href="/dashboard/vacatures/nieuw">
            <Plus className="h-4 w-4 mr-1" />
            Nieuwe vacature
          </Link>
        </Button>
      </div>

      {/* Credits checkout modal */}
      <CreditsCheckoutModal 
        open={isCheckoutOpen} 
        onOpenChange={setIsCheckoutOpen}
        context="dashboard"
        currentBalance={credits.available}
        onSuccess={handleCheckoutSuccess}
        onPendingChange={setOptimisticUpdate}
      />
    </div>
  )
}
