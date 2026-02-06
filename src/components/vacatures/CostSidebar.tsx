"use client";

import { Coins } from "lucide-react";
import type { CostSidebarProps } from "./types";

export function CostSidebar({
  selectedPackage,
  selectedUpsells,
  availableCredits,
  showPackageInfo = true,
  onChangePackage,
  onBuyCredits,
}: CostSidebarProps) {
  // Calculate credit totals
  const packageCredits = selectedPackage?.credits || 0;
  const upsellCredits = selectedUpsells.reduce((sum, u) => sum + u.credits, 0);
  const totalCredits = packageCredits + upsellCredits;
  const shortage = Math.max(0, totalCredits - availableCredits);
  const hasEnoughCredits = shortage === 0;
  const creditsRemaining = availableCredits - totalCredits;

  // Calculate prices from database
  const packagePrice = selectedPackage?.price || 0;
  const upsellsPrice = selectedUpsells.reduce((sum, u) => sum + u.price, 0);
  const totalPrice = packagePrice + upsellsPrice;
  
  // Calculate shortage price proportionally based on actual prices
  const shortagePrice = totalCredits > 0 
    ? Math.round((shortage / totalCredits) * totalPrice)
    : 0;

  return (
    <div className="space-y-4 mt-6">
      {/* Cost Overview Card */}
      <div className="bg-white rounded-t-[0.75rem] rounded-b-[2rem] pt-4 px-6 pb-6 text-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[#E8EEF2] flex items-center justify-center flex-shrink-0">
            <Coins className="h-5 w-5 text-[#1F2D58]" />
          </div>
          <h3 className="text-xl font-bold text-[#1F2D58]">Overzicht</h3>
        </div>

        <hr className="border-[#1F2D58]/10 mb-4" />

        {/* Table header */}
        <div className="flex justify-end mb-2">
          <span className="text-sm font-bold text-[#1F2D58]">Credits</span>
        </div>

        {/* Cost breakdown - only show if package selected */}
        {selectedPackage && (
          <div className="space-y-2">
            {/* Package */}
            <div className="flex justify-between">
              <span className="text-[#1F2D58]">{selectedPackage.display_name}</span>
              <span className="text-[#1F2D58]">{packageCredits}</span>
            </div>

            {/* Upsells */}
            {selectedUpsells.map((upsell) => (
              <div key={upsell.id} className="flex justify-between">
                <span className="text-[#1F2D58]">+ {upsell.display_name}</span>
                <span className="text-[#1F2D58]">{upsell.credits}</span>
              </div>
            ))}

            {/* Totaal */}
            <div className="flex justify-between pt-2 mt-2 border-t border-[#1F2D58]/10">
              <span className="font-bold text-[#1F2D58]">Totaal</span>
              <span className="font-bold text-[#1F2D58]">{totalCredits}</span>
            </div>

            {/* Beschikbare credits */}
            <div className="flex justify-between pt-2 mt-2 border-t border-[#1F2D58]/10">
              <span className="text-[#1F2D58]">Beschikbare credits</span>
              <span className="text-[#1F2D58]">{availableCredits}</span>
            </div>

            {/* Scenario 1: Genoeg credits - toon "Over na plaatsing" */}
            {hasEnoughCredits && (
              <div className="flex justify-between">
                <span className="text-[#1F2D58]">Over na plaatsing</span>
                <span className="text-[#1F2D58]">{creditsRemaining}</span>
              </div>
            )}

            {/* Scenario 2: Te weinig credits - toon "Tekort aan credits" */}
            {!hasEnoughCredits && (
              <div className="flex justify-between">
                <span className="text-[#1F2D58]">Tekort aan credits</span>
                <span className="text-[#1F2D58]">{shortage} (€{shortagePrice})</span>
              </div>
            )}

            {/* Bundle promotion - alleen tonen als je 50 of minder credits hebt */}
            {availableCredits <= 50 && (
              <button
                type="button"
                onClick={onBuyCredits}
                className="w-full mt-4 px-4 pt-2 pb-3 border-2 border-[#DEEEE3] bg-[#DEEEE3]/20 rounded-lg text-center hover:bg-[#DEEEE3]/40 transition-colors"
              >
                {hasEnoughCredits ? (
                  <p className="text-sm text-[#1F2D58]">
                    Extra credits kopen met voordeel?
                    <br />
                    Bespaar tot 30% met een{" "}
                    <span className="underline">credit bundel</span>
                  </p>
                ) : (
                  <p className="text-sm text-[#1F2D58]">
                    Plaats je vaker vacatures?
                    <br />
                    Bespaar tot 30% met een{" "}
                    <span className="underline">credit bundel</span>
                  </p>
                )}
              </button>
            )}

            {/* Onderaan: Credits totaal (scenario 1) of Te betalen (scenario 2) */}
            <div className="flex justify-between pt-4 mt-4 border-t border-[#1F2D58]/10">
              {hasEnoughCredits ? (
                <>
                  <span className="font-bold text-[#1F2D58]">Totaal</span>
                  <span className="font-bold text-[#1F2D58]">{totalCredits} credits</span>
                </>
              ) : (
                <>
                  <span className="font-bold text-[#1F2D58]">Te betalen</span>
                  <div className="text-right">
                    <span className="font-bold text-[#1F2D58]">{availableCredits} credits + €{shortagePrice}</span>
                    <p className="text-xs text-[#1F2D58]/60">excl. btw</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Package Info Card - only show if package selected and showPackageInfo is true */}
      {showPackageInfo && selectedPackage && (
        <div className="bg-white rounded-t-[0.75rem] rounded-b-[2rem] p-6">
          <p className="text-xs text-[#1F2D58]/70 mb-1">Gekozen pakket</p>
          <h4 className="text-lg font-bold text-[#1F2D58] mb-3">{selectedPackage.display_name}</h4>
          
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
