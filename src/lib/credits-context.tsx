"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

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

const CreditsContext = createContext<CreditsContextType | undefined>(undefined);

interface CreditsProviderProps {
  children: ReactNode;
}

export function CreditsProvider({ children }: CreditsProviderProps) {
  const [credits, setCredits] = useState<CreditsData>(defaultCredits);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPendingUpdate, setIsPendingUpdate] = useState(false);

  const fetchCredits = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch("/api/account");
      if (!response.ok) {
        throw new Error("Failed to fetch credits");
      }
      const data = await response.json();
      setCredits({
        available: data.credits?.available ?? 0,
        total_purchased: data.credits?.total_purchased ?? 0,
        total_spent: data.credits?.total_spent ?? 0,
      });
    } catch (err) {
      console.error("Failed to fetch credits:", err);
      setError("Kon credits niet ophalen");
    } finally {
      setIsLoading(false);
      setIsPendingUpdate(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  // Update credits after a successful purchase
  const updateCredits = useCallback(
    (newBalance: number, purchasedAmount?: number) => {
      setCredits((prev) => ({
        available: newBalance,
        total_purchased: purchasedAmount
          ? prev.total_purchased + purchasedAmount
          : prev.total_purchased + (newBalance - prev.available),
        total_spent: prev.total_spent,
      }));
      setIsPendingUpdate(false);
    },
    []
  );

  // Set optimistic update state (show loading indicator)
  const setOptimisticUpdate = useCallback((pending: boolean) => {
    setIsPendingUpdate(pending);
  }, []);

  const value: CreditsContextType = {
    credits,
    isLoading,
    error,
    refetch: fetchCredits,
    updateCredits,
    setOptimisticUpdate,
    isPendingUpdate,
  };

  return (
    <CreditsContext.Provider value={value}>{children}</CreditsContext.Provider>
  );
}

export function useCredits() {
  const context = useContext(CreditsContext);
  if (context === undefined) {
    throw new Error("useCredits must be used within a CreditsProvider");
  }
  return context;
}
