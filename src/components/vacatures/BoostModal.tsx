"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { X, Rocket } from "lucide-react";
import { ProductRecord } from "@/lib/airtable";
import { useCredits } from "@/lib/credits-context";
import { CreditsCheckoutModal } from "@/components/checkout/CreditsCheckoutModal";
import { cn } from "@/lib/utils";

interface BoostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vacancyId: string;
  vacancyTitle: string;
  onSuccess?: () => void;
}

export function BoostModal({
  open,
  onOpenChange,
  vacancyId,
  vacancyTitle,
  onSuccess,
}: BoostModalProps) {
  const { credits, updateCredits } = useCredits();

  const [boostUpsells, setBoostUpsells] = React.useState<ProductRecord[]>([]);
  const [selectedUpsellIds, setSelectedUpsellIds] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = React.useState(false);

  // Fetch boost upsells when modal opens
  React.useEffect(() => {
    if (open) {
      setSelectedUpsellIds([]);
      fetchData();
    }
  }, [open, vacancyId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch upsells and vacancy data in parallel
      const [upsellsRes, vacancyRes] = await Promise.all([
        fetch("/api/products?type=upsell&availability=boost-option"),
        fetch(`/api/vacancies/${vacancyId}`),
      ]);

      if (!upsellsRes.ok || !vacancyRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const [upsellsData, vacancyData] = await Promise.all([
        upsellsRes.json(),
        vacancyRes.json(),
      ]);

      const allUpsells: ProductRecord[] = upsellsData.products || [];
      const vacancy = vacancyData.vacancy;

      // Collect IDs of upsells already on this vacancy (purchased as add-on)
      const alreadyOwnedIds = new Set<string>(vacancy.selected_upsells || []);

      // Also check upsells included in the package
      if (vacancy.package_id) {
        try {
          const pkgRes = await fetch("/api/products?type=vacancy_package");
          if (pkgRes.ok) {
            const pkgData = await pkgRes.json();
            const pkg = (pkgData.products || []).find(
              (p: ProductRecord) => p.id === vacancy.package_id
            );
            for (const id of pkg?.included_upsells || []) {
              alreadyOwnedIds.add(id);
            }
          }
        } catch {
          // Not critical, continue without package data
        }
      }

      // Only show upsells that aren't already owned
      setBoostUpsells(allUpsells.filter((u) => !alreadyOwnedIds.has(u.id)));
    } catch (error) {
      console.error("Error fetching boost data:", error);
      toast.error("Fout", {
        description: "Kon boost opties niet ophalen",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate costs
  const totalCost = React.useMemo(() => {
    return boostUpsells
      .filter((u) => selectedUpsellIds.includes(u.id))
      .reduce((sum, u) => sum + u.credits, 0);
  }, [selectedUpsellIds, boostUpsells]);

  const availableCreditsAmount = credits.available;
  const remaining = availableCreditsAmount - totalCost;
  const hasEnoughCredits = remaining >= 0;
  const hasSelection = selectedUpsellIds.length > 0;

  // Toggle upsell selection
  const toggleUpsell = (upsellId: string) => {
    setSelectedUpsellIds((prev) =>
      prev.includes(upsellId)
        ? prev.filter((id) => id !== upsellId)
        : [...prev, upsellId]
    );
  };

  // Submit boost
  const handleSubmit = async () => {
    if (!hasSelection || !hasEnoughCredits) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/vacancies/${vacancyId}/boost`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upsell_ids: selectedUpsellIds }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Boost mislukt");
      }

      // Update credits in context
      if (data.new_balance !== undefined) {
        updateCredits(data.new_balance);
      }

      toast.success("Vacature geboost!", {
        description: `${selectedUpsellIds.length} boost${selectedUpsellIds.length > 1 ? "s" : ""} toegevoegd aan '${vacancyTitle}'`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error boosting vacancy:", error);
      toast.error("Boost mislukt", {
        description: error instanceof Error ? error.message : "Er ging iets mis",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle credits purchase success
  const handleCreditsPurchased = (newBalance: number) => {
    updateCredits(newBalance);
    setShowCheckoutModal(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[540px] max-h-[90vh] rounded-t-[0.75rem] rounded-b-[2rem] p-0 gap-0 bg-[#E8EEF2] overflow-hidden">
          {/* Close button - absolute positioned, always 16px from top and right */}
          <DialogClose className="absolute top-4 right-4 z-20 flex w-[30px] h-[30px] rounded-full bg-white border border-[#1F2D58]/20 items-center justify-center hover:bg-[#1F2D58]/5 transition-colors shadow-sm">
            <X className="h-4 w-4 text-[#1F2D58]" />
            <span className="sr-only">Sluiten</span>
          </DialogClose>

          {/* Scrollable content */}
          <div className="overflow-y-auto max-h-[90vh] p-6 space-y-4">
            {/* Header */}
            <DialogHeader className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                  <Rocket className="h-5 w-5 text-[#1F2D58]" />
                </div>
                <div>
                  <DialogTitle className="!text-[1.125rem] sm:!text-[1.5rem] font-semibold text-[#1F2D58]">
                    Boost je vacature!
                  </DialogTitle>
                </div>
              </div>
              <p className="text-sm text-[#1F2D58]/70 ml-[52px]">
                Geef je vacature &apos;{vacancyTitle}&apos; extra zichtbaarheid
              </p>
            </DialogHeader>

            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full rounded-lg bg-white/60" />
                <Skeleton className="h-20 w-full rounded-lg bg-white/60" />
                <Skeleton className="h-20 w-full rounded-lg bg-white/60" />
              </div>
            ) : (
              <>
                {/* Boost upsells */}
                {boostUpsells.length > 0 ? (
                  <div className="space-y-2">
                    {boostUpsells.map((upsell) => {
                      const isSelected = selectedUpsellIds.includes(upsell.id);
                      let labelClasses = "border-[#1F2D58]/10 hover:border-[#1F2D58]/30";
                      if (isSelected) {
                        labelClasses = "border-[#41712F]/30 bg-[#DEEEE3]";
                      }

                      return (
                        <label
                          key={upsell.id}
                          htmlFor={`boost-upsell-${upsell.id}`}
                          className={`block p-4 border rounded-lg cursor-pointer transition-colors ${labelClasses}`}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              id={`boost-upsell-${upsell.id}`}
                              checked={isSelected}
                              onCheckedChange={() => toggleUpsell(upsell.id)}
                            />
                            <span className="font-medium text-[#1F2D58] flex-1">
                              {upsell.display_name}
                            </span>
                            <span className="text-sm text-[#1F2D58] font-medium shrink-0">
                              +{upsell.credits} credits
                            </span>
                          </div>
                          {upsell.description && (
                            <p className="text-sm text-[#1F2D58]/60 mt-1 ml-7">
                              {upsell.description}
                            </p>
                          )}
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white rounded-lg p-4 text-sm text-[#1F2D58]/60">
                    <p>Er zijn momenteel geen boost opties beschikbaar.</p>
                  </div>
                )}

                {/* Credit overview */}
                <div className="bg-white rounded-lg p-4">
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-[#1F2D58]">
                      <span>Totale kosten:</span>
                      <span className="font-medium">{totalCost}</span>
                    </div>
                    <div className="flex justify-between text-[#1F2D58]">
                      <span>Beschikbare credits:</span>
                      <span className="font-medium">{availableCreditsAmount}</span>
                    </div>
                    <div className="border-t border-[#1F2D58]/10 pt-1.5">
                      <div className="flex justify-between text-[#1F2D58] font-semibold">
                        <span>Resterende credits:</span>
                        <span className={cn(
                          remaining < 0 && "text-[#BC0000]"
                        )}>
                          {remaining}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Insufficient credits warning */}
                {hasSelection && !hasEnoughCredits && (
                  <div className="bg-[#F4DCDC] border border-[#BC0000]/30 rounded-lg p-4 text-sm text-[#BC0000]">
                    <p>
                      Niet genoeg credits beschikbaar.{" "}
                      <button
                        type="button"
                        onClick={() => setShowCheckoutModal(true)}
                        className="underline font-medium hover:opacity-70 transition-opacity"
                      >
                        Koop meer credits.
                      </button>
                    </p>
                  </div>
                )}

                {/* Submit button */}
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleSubmit}
                    disabled={!hasSelection || !hasEnoughCredits || isSubmitting}
                    showArrow={false}
                  >
                    {isSubmitting ? (
                      <>
                        <Spinner className="h-4 w-4" />
                        Bezig...
                      </>
                    ) : (
                      <>
                        <Rocket className="h-4 w-4" />
                        {hasSelection
                          ? `Boost voor ${totalCost} credits`
                          : "Selecteer een boost optie"}
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Credits checkout modal */}
      <CreditsCheckoutModal
        open={showCheckoutModal}
        onOpenChange={setShowCheckoutModal}
        context="boost"
        currentBalance={availableCreditsAmount}
        onSuccess={handleCreditsPurchased}
      />
    </>
  );
}
