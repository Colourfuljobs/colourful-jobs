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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { X, Rocket, Check } from "lucide-react";
import { ProductRecord, TransactionRecord } from "@/lib/airtable";
import { useCredits } from "@/lib/credits-context";
import { CreditsCheckoutModal } from "@/components/checkout/CreditsCheckoutModal";
import {
  getPackageBaseDuration,
  calculateDateRange,
} from "@/lib/vacancy-duration";
import {
  filterUpsellsByRepeatMode,
  RepeatModeContext,
} from "@/lib/upsell-filters";
import { cn } from "@/lib/utils";
import { ExtensionCard } from "./ExtensionCard";

interface BoostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vacancyId: string;
  vacancyTitle: string;
  onSuccess?: () => void;
}

// Vacancy data fetched from API
interface VacancyData {
  id: string;
  status: string;
  package_id?: string;
  selected_upsells?: string[];
  "first-published-at"?: string;
  "last-published-at"?: string;
  closing_date?: string;
}


// Active upsell displayed in the right column
interface ActiveUpsellItem {
  id: string;
  display_name: string;
  source: "included" | "purchased";
  expiryLabel?: string;
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

  // Extend duration state
  const [extensionUpsell, setExtensionUpsell] = React.useState<ProductRecord | null>(null);
  const [extensionChecked, setExtensionChecked] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>();
  const [datePickerOpen, setDatePickerOpen] = React.useState(false);
  const [dateRange, setDateRange] = React.useState<{ minDate: Date; maxDate: Date } | null>(null);
  const [vacancyData, setVacancyData] = React.useState<VacancyData | null>(null);
  const [isPremiumPackage, setIsPremiumPackage] = React.useState(false);

  // Active upsells for the right column
  const [activeUpsells, setActiveUpsells] = React.useState<ActiveUpsellItem[]>([]);

  // Fetch boost upsells when modal opens
  React.useEffect(() => {
    if (open) {
      setSelectedUpsellIds([]);
      setExtensionChecked(false);
      setSelectedDate(undefined);
      setExtensionUpsell(null);
      setDateRange(null);
      setIsPremiumPackage(false);
      setActiveUpsells([]);
      fetchData();
    }
  }, [open, vacancyId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch ALL upsells (no availability filter), vacancy data (with transactions), and packages in parallel
      const [upsellsRes, vacancyRes, packagesRes] = await Promise.all([
        fetch("/api/products?type=upsell"),
        fetch(`/api/vacancies/${vacancyId}?includeTransactions=true`),
        fetch("/api/products?type=vacancy_package"),
      ]);

      if (!upsellsRes.ok || !vacancyRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const [upsellsData, vacancyDataRes] = await Promise.all([
        upsellsRes.json(),
        vacancyRes.json(),
      ]);

      const allUpsells: ProductRecord[] = upsellsData.products || [];
      const vacancy: VacancyData = vacancyDataRes.vacancy;
      const vacancyTransactions: TransactionRecord[] = vacancyDataRes.transactions || [];
      setVacancyData(vacancy);

      // Build a lookup map for all upsell products (used for active upsells display)
      const upsellMap = new Map<string, ProductRecord>(allUpsells.map((u) => [u.id, u]));

      // Filter for boost-option availability (for selectable cards in left column)
      const boostOptionUpsells = allUpsells.filter((u) =>
        u.availability?.includes("boost-option")
      );

      // Collect IDs of upsells already on this vacancy (purchased as add-on)
      const alreadyOwnedIds = new Set<string>(vacancy.selected_upsells || []);

      // Get packages data for feature lookup and included upsells
      let packageBaseDuration = 30; // fallback
      let packageIncludedIds = new Set<string>();
      if (packagesRes.ok) {
        const packagesData = await packagesRes.json();
        const packages: ProductRecord[] = packagesData.products || [];

        if (vacancy.package_id) {
          const pkg = packages.find((p) => p.id === vacancy.package_id);
          if (pkg) {
            // Mark included upsells as already owned
            for (const id of pkg.included_upsells || []) {
              alreadyOwnedIds.add(id);
              packageIncludedIds.add(id);
            }
            // Get base duration from product directly
            packageBaseDuration = getPackageBaseDuration(pkg);

            // Check if this is a Premium package (365 days = no extension possible)
            if (packageBaseDuration >= 365) {
              setIsPremiumPackage(true);
            }
          }
        }
      }

      // ── Build active upsells for the right column ──
      const activeItems: ActiveUpsellItem[] = [];

      // 1. Package-included upsells → "Inbegrepen" with expiry if renewable
      for (const upsellId of packageIncludedIds) {
        const product = upsellMap.get(upsellId);
        if (product) {
          let expiryLabel: string | undefined;

          // For renewable included upsells, calculate expiry from the "included" transaction
          if (product.repeat_mode === "renewable" && product.duration_days) {
            const tx = vacancyTransactions
              .filter((t) => t.product_ids?.includes(upsellId))
              .sort((a, b) => {
                const dateA = a["created-at"] ? new Date(a["created-at"]).getTime() : 0;
                const dateB = b["created-at"] ? new Date(b["created-at"]).getTime() : 0;
                return dateB - dateA;
              })[0];

            if (tx?.["created-at"]) {
              const expiresAt = new Date(tx["created-at"]);
              expiresAt.setDate(expiresAt.getDate() + product.duration_days);
              expiryLabel = `Tot ${expiresAt.toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}`;
            }
          }

          activeItems.push({
            id: upsellId,
            display_name: product.display_name,
            source: "included",
            expiryLabel,
          });
        }
      }

      // 2. Purchased upsells (on vacancy, not in package) → with status
      const seenPurchased = new Set<string>();
      for (const upsellId of vacancy.selected_upsells || []) {
        if (packageIncludedIds.has(upsellId)) continue;
        if (seenPurchased.has(upsellId)) continue;
        seenPurchased.add(upsellId);

        const product = upsellMap.get(upsellId);
        if (product) {
          let expiryLabel: string | undefined;

          // For renewable products, calculate expiry from most recent transaction
          if (product.repeat_mode === "renewable" && product.duration_days) {
            const tx = vacancyTransactions
              .filter((t) => t.product_ids?.includes(upsellId))
              .sort((a, b) => {
                const dateA = a["created-at"] ? new Date(a["created-at"]).getTime() : 0;
                const dateB = b["created-at"] ? new Date(b["created-at"]).getTime() : 0;
                return dateB - dateA;
              })[0];

            if (tx?.["created-at"]) {
              const expiresAt = new Date(tx["created-at"]);
              expiresAt.setDate(expiresAt.getDate() + product.duration_days);
              expiryLabel = `Tot ${expiresAt.toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}`;
            }
          }

          // For until_max (extension), show the closing date
          if (product.repeat_mode === "until_max" && vacancy.closing_date) {
            const closingDate = new Date(vacancy.closing_date);
            expiryLabel = `Tot ${closingDate.toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}`;
          }

          activeItems.push({
            id: upsellId,
            display_name: product.display_name,
            source: "purchased",
            expiryLabel,
          });
        }
      }

      setActiveUpsells(activeItems);

      // ── Filter selectable upsells for the left column ──

      // First pass: remove upsells that are already owned/included,
      // BUT only for "once" mode (or no repeat_mode). Products with other
      // repeat_modes (unlimited, renewable, until_max) can be repurchased
      // even if already in the package or selected_upsells.
      const availableUpsells = boostOptionUpsells.filter(
        (upsell) => {
          // Check both id and slug for robustness
          if (!alreadyOwnedIds.has(upsell.id) && !alreadyOwnedIds.has(upsell.slug || "")) return true; // Not owned → keep
          const mode = upsell.repeat_mode || "once";
          return mode !== "once"; // Owned but repeatable → keep
        }
      );

      // Second pass: apply repeat_mode filtering based on vacancy transactions
      const publishedAt = vacancy["first-published-at"] || vacancy["last-published-at"];
      const repeatModeContext: RepeatModeContext = {
        vacancyTransactions,
        firstPublishedAt: publishedAt,
        closingDate: vacancy.closing_date,
      };

      const filterResults = filterUpsellsByRepeatMode(availableUpsells, repeatModeContext);

      // Collect all visible upsells and sort by sort_order
      const visibleUpsells: ProductRecord[] = [];
      let extUpsell: ProductRecord | null = null;
      let extMaxDate: Date | undefined;

      for (const result of filterResults) {
        if (!result.visible) continue; // Hidden by repeat_mode filter

        if (result.product.repeat_mode === "until_max") {
          extUpsell = result.product;
          extMaxDate = result.maxDate;
        }
        
        visibleUpsells.push(result.product);
      }

      // Sort all visible upsells by sort_order
      visibleUpsells.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

      // Store all upsells in sorted order (including extension)
      setBoostUpsells(visibleUpsells);
      setExtensionUpsell(extUpsell);

      // Calculate date range for the datepicker if extension is possible
      if (extUpsell && publishedAt && packageBaseDuration < 365) {
        const range = calculateDateRange(publishedAt, vacancy.closing_date);

        // If until_max provided a maxDate, use it to constrain the range
        if (extMaxDate && extMaxDate < range.maxDate) {
          range.maxDate = extMaxDate;
        }

        // Only show extension if there's room to extend (maxDate > minDate)
        if (range.maxDate > range.minDate) {
          setDateRange(range);

          // Auto-check extension for verlopen vacancies (required)
          if (vacancy.status === "verlopen") {
            setExtensionChecked(true);
          }
        } else {
          // No room to extend
          setExtensionUpsell(null);
        }
      }
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
  const extensionCost = extensionChecked && selectedDate && extensionUpsell ? extensionUpsell.credits : 0;
  const upsellsCost = React.useMemo(() => {
    return boostUpsells
      .filter((u) => selectedUpsellIds.includes(u.id))
      .reduce((sum, u) => sum + u.credits, 0);
  }, [selectedUpsellIds, boostUpsells]);
  const totalCost = upsellsCost + extensionCost;

  const availableCreditsAmount = credits.available;
  const remaining = availableCreditsAmount - totalCost;
  const hasEnoughCredits = remaining >= 0;
  const hasSelection = selectedUpsellIds.length > 0 || (extensionChecked && !!selectedDate);

  // For verlopen vacancies, extension is required
  const isExpired = vacancyData?.status === "verlopen";
  const extensionRequired = isExpired;

  // Toggle upsell selection
  const toggleUpsell = (upsellId: string) => {
    setSelectedUpsellIds((prev) =>
      prev.includes(upsellId)
        ? prev.filter((id) => id !== upsellId)
        : [...prev, upsellId]
    );
  };

  // Determine if submit is allowed
  const canSubmit = React.useMemo(() => {
    if (isSubmitting) return false;
    if (!hasEnoughCredits) return false;
    if (!hasSelection) return false;
    // For verlopen vacancies, extension must be checked with a date
    if (extensionRequired && (!extensionChecked || !selectedDate)) return false;
    // If extension is checked but no date selected yet, can't submit
    if (extensionChecked && !selectedDate) return false;
    return true;
  }, [isSubmitting, hasEnoughCredits, hasSelection, extensionRequired, extensionChecked, selectedDate]);

  // Submit boost
  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      // Build request body
      const upsellIds = [...selectedUpsellIds];
      if (extensionChecked && selectedDate && extensionUpsell) {
        upsellIds.push(extensionUpsell.id);
      }

      const requestBody: { upsell_ids: string[]; new_closing_date?: string } = {
        upsell_ids: upsellIds,
      };

      // Add new_closing_date if extension is checked and a date was selected
      if (extensionChecked && selectedDate) {
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
        const day = String(selectedDate.getDate()).padStart(2, "0");
        requestBody.new_closing_date = `${year}-${month}-${day}`;
      }

      const response = await fetch(`/api/vacancies/${vacancyId}/boost`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Boost mislukt");
      }

      // Update credits in context
      if (data.new_balance !== undefined) {
        updateCredits(data.new_balance);
      }

      // Build success message
      const parts: string[] = [];
      if (selectedUpsellIds.length > 0) {
        parts.push(
          `${selectedUpsellIds.length} boost${selectedUpsellIds.length > 1 ? "s" : ""}`
        );
      }
      if (extensionChecked && selectedDate) {
        parts.push("looptijdverlenging");
      }

      toast.success("Vacature geboost!", {
        description: `${parts.join(" en ")} toegevoegd aan '${vacancyTitle}'`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error boosting vacancy:", error);
      toast.error("Boost mislukt", {
        description:
          error instanceof Error ? error.message : "Er ging iets mis",
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

  // Status-specific config for the extension section
  const getExtensionConfig = () => {
    if (vacancyData?.status === "verlopen") {
      return { required: true };
    }
    return { required: false };
  };

  // Check if there are any options to show (upsells or extension)
  const hasAnyOptions = boostUpsells.length > 0 || (extensionUpsell && dateRange && !isPremiumPackage);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[760px] lg:max-w-[900px] xl:max-w-[1000px] max-h-[90vh] rounded-t-[0.75rem] rounded-b-[2rem] p-0 gap-0 bg-[#E8EEF2] overflow-hidden">
          {/* Close button - absolute positioned, always 16px from top and right */}
          <DialogClose className="absolute top-4 right-4 z-20 flex w-[30px] h-[30px] rounded-full bg-white border border-[#1F2D58]/20 items-center justify-center hover:bg-[#1F2D58]/5 transition-colors shadow-sm">
            <X className="h-4 w-4 text-[#1F2D58]" />
            <span className="sr-only">Sluiten</span>
          </DialogClose>

          {/* Scrollable content */}
          <div className="overflow-y-auto max-h-[90vh]">
            {/* Header - full width */}
            <div className="p-6 pb-4">
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
            </div>

            <div className="border-t border-[#1F2D58]/10 mx-0" />

            {isLoading ? (
              <div className="p-6 pt-0 space-y-3">
                <Skeleton className="h-20 w-full rounded-lg bg-white/60" />
                <Skeleton className="h-20 w-full rounded-lg bg-white/60" />
                <Skeleton className="h-20 w-full rounded-lg bg-white/60" />
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row">
                {/* ── Left column: selectable option cards ── */}
                <div className="w-full sm:w-[53%] min-w-0 p-6 pt-4 space-y-2">
                  {hasAnyOptions ? (
                    <>
                      <p className="text-xs font-semibold text-[#1F2D58]/50 uppercase tracking-wider mb-3">
                        Extra opties
                      </p>

                      {/* Render all upsells in sort_order */}
                      {boostUpsells.map((upsell) => {
                        // Extension duration option (checkbox + datepicker)
                        if (upsell.repeat_mode === "until_max" && dateRange && !isPremiumPackage) {
                          return (
                            <ExtensionCard
                              key={upsell.id}
                              extensionUpsell={upsell}
                              isChecked={extensionChecked}
                              onToggle={(checked) => {
                                setExtensionChecked(checked);
                                if (!checked) {
                                  setSelectedDate(undefined);
                                }
                              }}
                              selectedDate={selectedDate}
                              onSelectDate={setSelectedDate}
                              datePickerOpen={datePickerOpen}
                              onDatePickerOpenChange={setDatePickerOpen}
                              dateRange={dateRange}
                              currentClosingDate={vacancyData?.closing_date}
                              required={getExtensionConfig().required}
                              idPrefix="boost"
                            />
                          );
                        }

                        // Regular boost upsells (checkboxes)
                        const isSelected = selectedUpsellIds.includes(upsell.id);
                        let labelClasses =
                          "border-[#1F2D58]/10 hover:border-[#1F2D58]/30";
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

                      {/* Extension required warning for verlopen vacancies */}
                      {extensionRequired && extensionChecked && !selectedDate && extensionUpsell && dateRange && (
                        <div className="bg-[#193DAB]/[0.12] border-none rounded-lg p-4 text-sm text-[#1F2D58]">
                          <p>
                            Selecteer een nieuwe sluitingsdatum om je verlopen vacature opnieuw te publiceren.
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="bg-white rounded-lg p-4 text-sm text-[#1F2D58]/60">
                      <p>Er zijn momenteel geen boost opties beschikbaar.</p>
                    </div>
                  )}
                </div>

                {/* Vertical divider (hidden on mobile) */}
                <div className="hidden sm:block w-px bg-[#1F2D58]/10 shrink-0" />
                {/* Horizontal divider (mobile only) */}
                <div className="sm:hidden border-t border-[#1F2D58]/10 mx-6" />

                {/* ── Right column: active upsells + cost summary + button ── */}
                <div className="w-full sm:w-[47%] shrink-0 p-6 pt-4 flex flex-col gap-4">
                  {/* Active upsells on this vacancy */}
                  {activeUpsells.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-[#1F2D58]/50 uppercase tracking-wider mb-3">
                        Actief op deze vacature
                      </p>
                      <div className="space-y-2">
                        {activeUpsells.map((item) => (
                          <div
                            key={`active-${item.id}-${item.source}`}
                            className="flex items-center gap-2 bg-white rounded-lg px-3 py-2"
                          >
                            <div className="w-5 h-5 rounded-full bg-[#DEEEE3] flex items-center justify-center shrink-0">
                              <Check className="h-3 w-3 text-[#41712F]" />
                            </div>
                            <span className="text-sm text-[#1F2D58] truncate flex-1">
                              {item.display_name}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              {item.source === "included" && (
                                <Badge variant="muted">Inbegrepen</Badge>
                              )}
                              {item.expiryLabel ? (
                                <Badge variant="muted">{item.expiryLabel}</Badge>
                              ) : item.source !== "included" ? (
                                <Badge variant="muted">Actief</Badge>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Divider between active upsells and cost summary */}
                  {activeUpsells.length > 0 && (
                    <div className="border-t border-[#1F2D58]/10" />
                  )}

                  {/* Cost summary */}
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-[#1F2D58]">
                      <span>Totale kosten:</span>
                      <span className="font-medium">{totalCost}</span>
                    </div>
                    <div className="flex justify-between text-[#1F2D58]">
                      <span>Beschikbaar:</span>
                      <span className="font-medium">
                        {availableCreditsAmount}
                      </span>
                    </div>
                    <div>
                      <div className="flex justify-between text-[#1F2D58] font-semibold">
                        <span>Resterend:</span>
                        <span
                          className={cn(remaining < 0 && "text-[#BC0000]")}
                        >
                          {remaining}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Insufficient credits warning */}
                  {hasSelection && !hasEnoughCredits && (
                    <div className="bg-[#F4DCDC] border border-[#BC0000]/30 rounded-lg p-3 text-sm text-[#BC0000]">
                      <p>
                        Niet genoeg credits.{" "}
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

                  {/* Submit button - pushed to bottom */}
                  <div className="mt-auto">
                    <Button
                      onClick={handleSubmit}
                      disabled={!canSubmit}
                      showArrow={false}
                      className="w-full"
                    >
                      {isSubmitting ? (
                        <>
                          <Spinner className="h-4 w-4" />
                          Bezig...
                        </>
                      ) : (
                        <>
                          {hasSelection ? (
                            <>
                              <Rocket className="h-4 w-4" />
                              {(vacancyData?.status === "verlopen" || vacancyData?.status === "gedepubliceerd")
                                ? `Boost en publiceer`
                                : `Boost je vacature`}
                            </>
                          ) : extensionRequired ? (
                            "Selecteer een sluitingsdatum"
                          ) : (
                            "Kies een of meerdere opties"
                          )}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
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

