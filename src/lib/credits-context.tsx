"use client";

/**
 * CreditsProvider - Thin wrapper around AccountProvider for credits data
 * 
 * This provider now uses AccountProvider's shared data instead of fetching separately.
 * This eliminates a duplicate /api/account call and improves loading performance.
 */

import { ReactNode } from "react";
import { useAccount } from "./account-context";

interface CreditsData {
  available: number;
  total_purchased: number;
  total_spent: number;
}

interface CreditsContextType {
  credits: CreditsData;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateCredits: (newBalance: number, purchasedAmount?: number) => void;
  setOptimisticUpdate: (pending: boolean) => void;
  isPendingUpdate: boolean;
}

const defaultCredits: CreditsData = {
  available: 0,
  total_purchased: 0,
  total_spent: 0,
};

// CreditsProvider is now just a pass-through - children render directly
// Credits data comes from AccountProvider via useCredits hook
export function CreditsProvider({ children }: { children: ReactNode }) {
  // No separate fetch needed - AccountProvider handles it
  return <>{children}</>;
}

/**
 * useCredits hook - Gets credits data from AccountProvider
 * 
 * This maintains the same API as before, but now uses shared account data
 * instead of fetching separately.
 */
export function useCredits(): CreditsContextType {
  const { 
    accountData, 
    isLoading, 
    refreshAccount, 
    updateCredits, 
    setOptimisticUpdate,
    isPendingUpdate 
  } = useAccount();

  return {
    credits: accountData?.credits ?? defaultCredits,
    isLoading,
    error: null, // Error handling is done in AccountProvider
    refetch: refreshAccount,
    updateCredits,
    setOptimisticUpdate,
    isPendingUpdate,
  };
}
