"use client"

import { useSession } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { PageLoader } from "@/components/ui/page-loader"
import { AppSidebar, MobileHeader, MobileNav } from "@/components/dashboard"
import { CreditsProvider } from "@/lib/credits-context"
import { AccountProvider, useAccount } from "@/lib/account-context"

// Inner layout that uses the account context
function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const { accountData, isLoading: isAccountLoading } = useAccount()
  
  // Check if we're on a focused page (no sidebar)
  const isFocusedPage = pathname === "/dashboard/vacatures/nieuw"

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

  // Show loading state while checking session
  if (status === "loading") {
    return <PageLoader />
  }

  // Don't render for unauthenticated or pending users
  if (status === "unauthenticated" || session?.user?.status === "pending_onboarding") {
    return <PageLoader />
  }

  // Show loading state while fetching account data
  if (isAccountLoading || !accountData) {
    return <PageLoader />
  }

  const user = {
    name: accountData.personal.first_name || "Gebruiker",
    email: accountData.personal.email,
  }

  // Focused page layout (no sidebar, full width)
  if (isFocusedPage) {
    return (
      <div className="min-h-screen">
        <main className="w-full mb-10">
          {children}
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Mobile Header - Row 1: Logo left, actions right */}
      <MobileHeader user={user} />
      
      {/* Mobile Navigation - Row 2: Horizontal scrollable menu */}
      <MobileNav />

      {/* Desktop layout with sidebar */}
      <SidebarProvider>
        {/* Desktop Sidebar - hidden on mobile */}
        <div className="hidden sm:block">
          <AppSidebar user={user} profileComplete={accountData.profile_complete} />
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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AccountProvider>
      <CreditsProvider>
        <DashboardLayoutInner>{children}</DashboardLayoutInner>
      </CreditsProvider>
    </AccountProvider>
  )
}
