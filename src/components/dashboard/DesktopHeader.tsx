"use client"

import Link from "next/link"
import { Coins, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

interface DesktopHeaderProps {
  credits?: {
    available: number
  }
  isLoading?: boolean
}

export function DesktopHeader({ credits, isLoading = false }: DesktopHeaderProps) {
  return (
    <div className="hidden sm:flex items-center justify-end gap-3 mb-6">
      {/* Credits info */}
      {isLoading ? (
        <Skeleton className="h-12 w-28" />
      ) : credits ? (
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1.5 text-[#1F2D58]">
            <Coins className="h-4 w-4" />
            <span className="font-bold">{credits.available} credits</span>
          </div>
          <Link 
            href="/credits" 
            className="text-sm text-[#1F2D58]/70 hover:text-[#1F2D58] hover:underline"
          >
            + credits bijkopen
          </Link>
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
  )
}
