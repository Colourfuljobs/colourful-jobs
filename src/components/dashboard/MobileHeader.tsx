"use client"

import { useState } from "react"
import Link from "next/link"
import { signOut } from "next-auth/react"
import { toast } from "sonner"
import { Coins, Plus, LogOut, User, Settings } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Spinner } from "@/components/ui/spinner"
import { CreditsCheckoutModal } from "@/components/checkout"
import { useCredits } from "@/lib/credits-context"

interface MobileHeaderProps {
  user?: {
    name?: string | null
    email?: string | null
  }
}

export function MobileHeader({ user }: MobileHeaderProps) {
  const { credits, isLoading, isPendingUpdate, updateCredits, setOptimisticUpdate } = useCredits()
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  
  const handleSignOut = async () => {
    await signOut({ redirect: true, callbackUrl: "/login" })
    toast.success("Je bent succesvol uitgelogd")
  }

  const handleCheckoutSuccess = (newBalance: number, purchasedAmount?: number) => {
    updateCredits(newBalance, purchasedAmount)
  }

  return (
    <header className="sm:hidden sticky top-0 z-50 bg-[#E8EEF2] px-4 pt-3">
      <div className="flex items-center justify-between">
        {/* Logo - alleen beeldmerk op mobiel */}
        <Link href="/dashboard" className="flex items-center">
          <img
            src="/icon.svg"
            alt="Colourful jobs"
            width={44}
            height={41}
            className="h-8 w-auto"
          />
        </Link>

        {/* Right side: Credits, User dropdown, New vacancy button */}
        <div className="flex items-center gap-2">
          {/* Credits info */}
          {!isLoading && (
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1.5 text-[#1F2D58]">
                {isPendingUpdate ? (
                  <>
                    <Spinner className="h-3 w-3" />
                    <span className="text-sm font-bold text-[#1F2D58]/70">...</span>
                  </>
                ) : (
                  <>
                    <Coins className="h-4 w-4" />
                    <span className="text-sm font-bold">{credits.available} credits</span>
                  </>
                )}
              </div>
              <button 
                onClick={() => setIsCheckoutOpen(true)}
                className="text-xs text-[#1F2D58]/70 hover:text-[#1F2D58] hover:underline"
              >
                + credits bijkopen
              </button>
            </div>
          )}

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1F2D58] focus-visible:ring-offset-2 rounded-full">
                <Avatar className="h-9 w-9 rounded-full">
                  <AvatarFallback className="rounded-full bg-[#193DAB]/12 text-[#1F2D58]">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-56 rounded-lg"
              side="bottom"
              align="end"
              sideOffset={4}
            >
              <div className="flex items-center gap-2 px-2 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-full">
                  <AvatarFallback className="rounded-full bg-[#193DAB]/12 text-[#1F2D58]">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold text-[#1F2D58]">
                    {user?.name || "Gebruiker"}
                  </span>
                  <span className="truncate text-xs text-[#1F2D58]/60">
                    {user?.email || ""}
                  </span>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="text-[#1F2D58] cursor-pointer">
                <Link href="/dashboard/gegevens">
                  <Settings className="mr-2 h-4 w-4" />
                  Gegevens
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-[#1F2D58] cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Uitloggen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* New vacancy button (icon only on mobile) */}
          <Button 
            size="icon" 
            className="h-9 w-9 rounded-full"
            showArrow={false}
            asChild
          >
            <Link href="/dashboard/vacatures/nieuw">
              <Plus className="h-4 w-4" />
            </Link>
          </Button>
        </div>
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
    </header>
  )
}
