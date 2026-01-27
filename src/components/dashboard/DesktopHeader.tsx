"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Coins, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { CreditsCheckoutModal } from "@/components/checkout"

interface DesktopHeaderProps {
  title: string
}

export function DesktopHeader({ title }: DesktopHeaderProps) {
  const [credits, setCredits] = useState<{ available: number } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)

  // Fetch credits from account API on mount
  useEffect(() => {
    async function fetchCredits() {
      try {
        const response = await fetch("/api/account")
        if (response.ok) {
          const data = await response.json()
          setCredits({ available: data.credits?.available ?? 0 })
        }
      } catch (error) {
        console.error("Failed to fetch credits:", error)
        setCredits({ available: 0 })
      } finally {
        setIsLoading(false)
      }
    }
    fetchCredits()
  }, [])

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      {/* Page title - visible on all screens */}
      <h1 className="contempora-large text-[#1F2D58]">{title}</h1>
      
      {/* Right side: credits and actions - only visible on desktop */}
      <div className="hidden sm:flex flex-wrap-reverse items-center justify-end gap-3">
        {/* Credits info - always on the left, or at the bottom when wrapped */}
        {isLoading ? (
          <Skeleton className="h-12 w-28" />
        ) : credits ? (
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1.5 text-[#1F2D58]">
              <Coins className="h-4 w-4" />
              <span className="font-bold">{credits.available} credits</span>
            </div>
            <button 
              onClick={() => setIsCheckoutOpen(true)}
              className="text-sm text-[#1F2D58]/70 hover:text-[#1F2D58] hover:underline"
            >
              + credits bijkopen
            </button>
          </div>
        ) : null}
        
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
        currentBalance={credits?.available ?? 0}
      />
    </div>
  )
}
