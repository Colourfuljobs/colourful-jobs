"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { Spinner } from "@/components/ui/spinner"
import { AppSidebar, MobileHeader, MobileNav } from "@/components/dashboard"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [credits, setCredits] = useState<{ available: number } | null>(null)
  const [userData, setUserData] = useState<{ first_name: string; last_name: string; email: string } | null>(null)

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login")
    }
  }, [status, router])

  // Redirect pending_onboarding users to onboarding
  useEffect(() => {
    if (status === "authenticated" && session?.user?.status === "pending_onboarding") {
      router.replace("/onboarding")
    }
  }, [status, session, router])

  // Fetch user data and credits from account API
  useEffect(() => {
    async function fetchAccountData() {
      try {
        const response = await fetch("/api/account")
        if (response.ok) {
          const data = await response.json()
          setCredits({ available: data.credits?.available ?? 0 })
          setUserData({
            first_name: data.personal?.first_name || "",
            last_name: data.personal?.last_name || "",
            email: data.personal?.email || session?.user?.email || "",
          })
        }
      } catch (error) {
        console.error("Failed to fetch account data:", error)
      }
    }
    if (status === "authenticated") {
      fetchAccountData()
    }
  }, [status, session?.user?.email])

  // Show loading state while checking session
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="size-12 text-[#1F2D58]" />
      </div>
    )
  }

  // Don't render for unauthenticated or pending users
  if (status === "unauthenticated" || session?.user?.status === "pending_onboarding") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="size-12 text-[#1F2D58]" />
      </div>
    )
  }

  // Show loading state while fetching user data
  if (!userData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="size-12 text-[#1F2D58]" />
      </div>
    )
  }

  const user = {
    name: userData.first_name || "Gebruiker",
    email: userData.email,
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Mobile Header - Row 1: Logo left, actions right */}
      <MobileHeader 
        user={user}
        credits={credits ?? undefined}
      />
      
      {/* Mobile Navigation - Row 2: Horizontal scrollable menu */}
      <MobileNav />

      {/* Desktop layout with sidebar */}
      <SidebarProvider>
        {/* Desktop Sidebar - hidden on mobile */}
        <div className="hidden sm:block">
          <AppSidebar user={user} />
        </div>

        {/* Main content */}
        <main className="flex-1 w-full sm:ml-[var(--sidebar-width)] mt-4 sm:mt-6 mb-10">
          <div className="max-w-[62.5rem] mx-auto px-4 sm:p-6">
            {children}
          </div>
        </main>
      </SidebarProvider>
    </div>
  )
}
