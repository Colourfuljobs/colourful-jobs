"use client";

import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CostSidebarProps } from "./types";

export function CostSidebar({
  selectedPackage,
  selectedUpsells,
  includedUpsellProducts = [],
  availableCredits,
  showPackageInfo = true,
  onChangePackage,
  onBuyCredits,
}: CostSidebarProps) {
  // Calculate credit totals
  const packageCredits = selectedPackage?.credits || 0;

  // Only count extra upsells (not the ones included in the package)
  const includedIds = new Set(selectedPackage?.included_upsells || []);
  const extraUpsells = selectedUpsells.filter((u) => !includedIds.has(u.id));
  const extraCredits = extraUpsells.reduce((sum, u) => sum + u.credits, 0);

  const totalCredits = packageCredits + extraCredits;
  const shortage = Math.max(0, totalCredits - availableCredits);
  const hasEnoughCredits = shortage === 0;
  const creditsRemaining = availableCredits - totalCredits;

  // Calculate prices from database
  const packagePrice = selectedPackage?.price || 0;
  const extraPrice = extraUpsells.reduce((sum, u) => sum + u.price, 0);
  const totalPrice = packagePrice + extraPrice;

  // Calculate shortage price proportionally based on actual prices
  const shortagePrice =
    totalCredits > 0
      ? Math.round((shortage / totalCredits) * totalPrice)
      : 0;

  return (
    <div className="space-y-4 mt-6 sticky top-6 self-start">
      {/* Cost Overview Card */}
      <div className="bg-white rounded-t-[0.75rem] rounded-b-[2rem] pt-4 px-6 pb-6 text-sm">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-xl font-bold text-[#1F2D58]">Overzicht</h3>
        </div>

        {/* Gekozen optie(s) section */}
        {selectedPackage && (
          <>
            <hr className="border-[#1F2D58]/10 mb-4" />
            <p className="text-xs font-semibold text-[#1F2D58]/50 uppercase tracking-wider mb-2">
              {extraUpsells.length > 0 ? "Gekozen opties" : "Gekozen optie"}
            </p>
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 border border-[#1F2D58]/10 rounded-lg px-3 py-2">
                <div className="w-5 h-5 rounded-full bg-[#E8EEF2] flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 text-[#1F2D58]" />
                </div>
                <span className="text-sm font-medium text-[#1F2D58] truncate flex-1">
                  {selectedPackage.display_name}
                </span>
              </div>
              {extraUpsells.map((upsell) => (
                <div
                  key={upsell.id}
                  className="flex items-center gap-2 border border-[#41712F]/25 bg-[#DEEEE3]/40 rounded-lg px-3 py-2"
                >
                  <div className="w-5 h-5 rounded-full bg-[#DEEEE3] flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 text-[#41712F]" />
                  </div>
                  <span className="text-sm font-medium text-[#1F2D58] truncate flex-1">
                    {upsell.display_name}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        <hr className="border-[#1F2D58]/10 mb-2" />

        {/* Cost breakdown - only show if package selected */}
        {selectedPackage && (
          <div className="space-y-2">
            {/* Column header */}
            <div className="flex justify-end">
              <span className="text-xs font-semibold text-[#1F2D58]/50 uppercase tracking-wider">Credits</span>
            </div>

            {/* Package cost */}
            <div className="flex justify-between">
              <span className="text-[#1F2D58]">{selectedPackage.display_name}</span>
              <span className="text-[#1F2D58]">{packageCredits}</span>
            </div>

            {/* Extras cost (only if any) */}
            {extraUpsells.length > 0 && (
              <div className="flex justify-between">
                <span className="text-[#1F2D58]">
                  Extra&apos;s ({extraUpsells.length})
                </span>
                <span className="text-[#1F2D58]">+{extraCredits}</span>
              </div>
            )}

            <hr className="border-[#1F2D58]/10" />

            {/* Totaal */}
            <div className="flex justify-between">
              <span className="font-bold text-[#1F2D58]">Totaal</span>
              <span className="font-bold text-[#1F2D58]">{totalCredits}</span>
            </div>

            {/* Beschikbare credits */}
            <div className="flex justify-between pt-2 border-t border-[#1F2D58]/10">
              <span className="text-[#1F2D58]">Beschikbare credits</span>
              <span className="text-[#1F2D58]">{availableCredits}</span>
            </div>

            {/* Scenario 1: Genoeg credits */}
            {hasEnoughCredits && (
              <>
                {/* Only show intermediate "Over na plaatsing" if no extras */}
                {extraUpsells.length === 0 && (
                  <div className="flex justify-between">
                    <span className="text-[#1F2D58]">Over na plaatsing</span>
                    <span className="text-[#1F2D58]">{creditsRemaining}</span>
                  </div>
                )}

                {/* Bottom total */}
                <div className="flex justify-between pt-2 mt-2 border-t border-[#1F2D58]/10">
                  {extraUpsells.length > 0 ? (
                    <>
                      <span className="font-bold text-[#1F2D58]">
                        Over na plaatsing
                      </span>
                      <span className="font-bold text-[#1F2D58]">
                        {creditsRemaining}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="font-bold text-[#1F2D58]">Totaal</span>
                      <span className="font-bold text-[#1F2D58]">
                        {totalCredits}
                      </span>
                    </>
                  )}
                </div>
              </>
            )}

            {/* Scenario 2: Te weinig credits */}
            {!hasEnoughCredits && (
              <>
                <div className="flex justify-between">
                  <span className="text-[#1F2D58]">Tekort aan credits</span>
                  <span className="text-[#1F2D58]">
                    {shortage} (€{shortagePrice})
                  </span>
                </div>

                {/* Bundle promotion */}
                {availableCredits <= 50 && (
                  <button
                    type="button"
                    onClick={onBuyCredits}
                    className="w-full mt-4 px-4 pt-2 pb-3 border-2 border-[#DEEEE3] bg-[#DEEEE3]/20 rounded-lg text-center hover:bg-[#DEEEE3]/40 transition-colors"
                  >
                    <p className="text-sm text-[#1F2D58]">
                      Plaats je vaker vacatures?
                      <br />
                      Bespaar tot 30% met een{" "}
                      <span className="underline">credit bundel</span>
                    </p>
                  </button>
                )}

                <div className="flex justify-between pt-4 mt-4 border-t border-[#1F2D58]/10">
                  <span className="font-bold text-[#1F2D58]">Te betalen</span>
                  <div className="text-right">
                    <span className="font-bold text-[#1F2D58]">
                      {(() => {
                        // Conditional formatting: only show non-zero values
                        if (availableCredits > 0 && shortagePrice > 0) {
                          return `${availableCredits} credits + €${shortagePrice}`;
                        } else if (availableCredits > 0) {
                          return `${availableCredits} credits`;
                        } else {
                          return `€${shortagePrice}`;
                        }
                      })()}
                    </span>
                    <p className="text-xs text-[#1F2D58]/60">excl. btw</p>
                  </div>
                </div>
              </>
            )}

            {/* Bundle promotion for enough credits but low balance */}
            {hasEnoughCredits && availableCredits <= 50 && (
              <button
                type="button"
                onClick={onBuyCredits}
                className="w-full mt-4 px-4 pt-2 pb-3 border-2 border-[#DEEEE3] bg-[#DEEEE3]/20 rounded-lg text-center hover:bg-[#DEEEE3]/40 transition-colors"
              >
                <p className="text-sm text-[#1F2D58]">
                  Extra credits kopen met voordeel?
                  <br />
                  Bespaar tot 30% met een{" "}
                  <span className="underline">credit bundel</span>
                </p>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Package Info Card - only show if package selected and showPackageInfo is true */}
      {showPackageInfo && selectedPackage && (
        <div className="bg-white rounded-t-[0.75rem] rounded-b-[2rem] p-6">
          <p className="text-xs text-[#1F2D58]/70 mb-1">Gekozen pakket</p>
          <h4 className="text-lg font-bold text-[#1F2D58] mb-3">
            {selectedPackage.display_name}
          </h4>

          {/* Package features would come from Features table */}
          <ul className="space-y-1 text-sm text-[#1F2D58] mb-4">
            <li className="flex items-start gap-2">
              <span className="text-[#1F2D58]/50">•</span>
              <span>tot 60 dagen online</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#1F2D58]/50">•</span>
              <span>in dagelijkse mailing</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#1F2D58]/50">•</span>
              <span>gedeeld op socials</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#1F2D58]/50">•</span>
              <span>betaalde google ads</span>
            </li>
          </ul>

          {onChangePackage && (
            <button
              type="button"
              onClick={onChangePackage}
              className="text-sm text-[#1F2D58] underline hover:no-underline"
            >
              Wijzig
            </button>
          )}
        </div>
      )}
    </div>
  );
}
