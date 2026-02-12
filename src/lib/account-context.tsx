"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import { useSession } from "next-auth/react"

interface ExpiringCredits {
  total: number
  days_until: number | null
  earliest_date: string | null
}

interface CreditsData {
  available: number
  total_purchased: number
  total_spent: number
  expiring_soon: ExpiringCredits | null
}

interface ManagedEmployer {
  id: string
  company_name: string
  display_name: string
  logo_url: string | null
}

interface ActiveEmployer {
  id: string
  company_name: string
  display_name: string
}

interface AccountData {
  personal: {
    first_name: string
    last_name: string
    email: string
    role: string
  }
  role_id: string // "employer" | "intermediary"
  profile_complete: boolean
  profile_missing_fields: string[]
  credits: CreditsData
  onboarding_dismissed: boolean
  // Intermediary-specific fields
  managed_employers?: ManagedEmployer[]
  active_employer?: ActiveEmployer | null
}

interface AccountContextType {
  accountData: AccountData | null
  isLoading: boolean
  refreshAccount: () => Promise<void>
  // Credits-specific methods for CreditsProvider compatibility
  updateCredits: (newBalance: number, purchasedAmount?: number) => void
  setOptimisticUpdate: (pending: boolean) => void
  isPendingUpdate: boolean
}

const AccountContext = createContext<AccountContextType | undefined>(undefined)

const defaultCredits: CreditsData = {
  available: 0,
  total_purchased: 0,
  total_spent: 0,
  expiring_soon: null,
}

const defaultAccountData: AccountData = {
  personal: {
    first_name: "",
    last_name: "",
    email: "",
    role: "",
  },
  role_id: "employer", // Default to employer
  profile_complete: true,
  profile_missing_fields: [],
  credits: defaultCredits,
  onboarding_dismissed: false,
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()
  const [accountData, setAccountData] = useState<AccountData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPendingUpdate, setIsPendingUpdate] = useState(false)

  const fetchAccountData = useCallback(async () => {
    try {
      const response = await fetch("/api/account")
      if (response.ok) {
        const data = await response.json()
        setAccountData({
          personal: {
            first_name: data.personal?.first_name || "",
            last_name: data.personal?.last_name || "",
            email: data.personal?.email || session?.user?.email || "",
            role: data.personal?.role || "",
          },
          role_id: data.role_id || "employer",
          profile_complete: data.profile_complete ?? true,
          profile_missing_fields: data.profile_missing_fields ?? [],
          credits: {
            available: data.credits?.available ?? 0,
            total_purchased: data.credits?.total_purchased ?? 0,
            total_spent: data.credits?.total_spent ?? 0,
            expiring_soon: data.credits?.expiring_soon ?? null,
          },
          onboarding_dismissed: data.onboarding_dismissed ?? false,
          // Intermediary-specific fields
          managed_employers: data.managed_employers,
          active_employer: data.active_employer,
        })
      }
    } catch (error) {
      console.error("Failed to fetch account data:", error)
      // Set default data on error so UI doesn't break
      setAccountData(defaultAccountData)
    } finally {
      setIsLoading(false)
      setIsPendingUpdate(false)
    }
  }, [session?.user?.email])

  // Fetch on mount when authenticated
  useEffect(() => {
    if (status === "authenticated") {
      fetchAccountData()
    } else if (status === "unauthenticated") {
      setIsLoading(false)
    }
  }, [status, fetchAccountData])

  // Listen for profile updates to refresh data
  useEffect(() => {
    const handleProfileUpdate = () => {
      if (status === "authenticated") {
        fetchAccountData()
      }
    }
    window.addEventListener("profile-updated", handleProfileUpdate)
    return () => window.removeEventListener("profile-updated", handleProfileUpdate)
  }, [status, fetchAccountData])

  const refreshAccount = useCallback(async () => {
    setIsLoading(true)
    await fetchAccountData()
  }, [fetchAccountData])

  // Update credits after a successful purchase (for CreditsProvider compatibility)
  const updateCredits = useCallback((newBalance: number, purchasedAmount?: number) => {
    setAccountData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        credits: {
          ...prev.credits, // Preserve expiring_soon
          available: newBalance,
          total_purchased: purchasedAmount
            ? prev.credits.total_purchased + purchasedAmount
            : prev.credits.total_purchased + (newBalance - prev.credits.available),
          total_spent: prev.credits.total_spent,
        },
      }
    })
    setIsPendingUpdate(false)
  }, [])

  // Set optimistic update state (show loading indicator)
  const setOptimisticUpdate = useCallback((pending: boolean) => {
    setIsPendingUpdate(pending)
  }, [])

  return (
    <AccountContext.Provider value={{ 
      accountData, 
      isLoading, 
      refreshAccount,
      updateCredits,
      setOptimisticUpdate,
      isPendingUpdate,
    }}>
      {children}
    </AccountContext.Provider>
  )
}

export function useAccount() {
  const context = useContext(AccountContext)
  if (context === undefined) {
    throw new Error("useAccount must be used within an AccountProvider")
  }
  return context
}

/**
 * Check if the current user is an intermediary
 */
export function useIsIntermediary(): boolean {
  const { accountData } = useAccount()
  return accountData?.role_id === "intermediary"
}

/**
 * Get the active employer for intermediaries
 * Returns null for non-intermediaries or if no employer is selected
 */
export function useActiveEmployer(): ActiveEmployer | null {
  const { accountData } = useAccount()
  if (accountData?.role_id !== "intermediary") return null
  return accountData?.active_employer || null
}

/**
 * Get all managed employers for intermediaries
 * Returns empty array for non-intermediaries
 */
export function useManagedEmployers(): ManagedEmployer[] {
  const { accountData } = useAccount()
  if (accountData?.role_id !== "intermediary") return []
  return accountData?.managed_employers || []
}
