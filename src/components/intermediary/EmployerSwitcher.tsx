"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAccount } from "@/lib/account-context";
import { toast } from "sonner";
import { Building2, Loader2 } from "lucide-react";

export function EmployerSwitcher() {
  const { accountData, refreshAccount } = useAccount();
  const [isLoading, setIsLoading] = useState(false);

  if (!accountData || accountData.role_id !== "intermediary") {
    return null;
  }

  const managedEmployers = accountData.managed_employers || [];
  const activeEmployer = accountData.active_employer;

  const handleSwitch = async (employerId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/intermediary/switch-employer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employer_id: employerId }),
      });

      if (!response.ok) {
        throw new Error("Failed to switch employer");
      }

      // Refresh account data to get the new active employer
      await refreshAccount();
      
      const data = await response.json();
      toast.success("Gelukt!", {
        description: `Je bent overgestapt naar ${data.data.display_name || data.data.company_name}.`,
      });
    } catch (error) {
      console.error("Error switching employer:", error);
      toast.error("Fout", {
        description: "Er ging iets mis bij het wisselen van werkgever",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-[#1F2D58]">
        Actieve werkgever
      </label>
      <Select
        value={activeEmployer?.id || ""}
        onValueChange={handleSwitch}
        disabled={isLoading || managedEmployers.length === 0}
      >
        <SelectTrigger className="w-full bg-white border-[#193DAB]/12">
          <div className="flex items-center gap-2">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-[#1F2D58]" />
            ) : (
              <Building2 className="h-4 w-4 text-[#1F2D58]" />
            )}
            <SelectValue placeholder="Selecteer een werkgever" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {managedEmployers.length === 0 ? (
            <div className="p-2 text-sm text-[#1F2D58]/60">
              Geen werkgevers beschikbaar
            </div>
          ) : (
            managedEmployers.map((employer) => (
              <SelectItem key={employer.id} value={employer.id}>
                {employer.display_name || employer.company_name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
