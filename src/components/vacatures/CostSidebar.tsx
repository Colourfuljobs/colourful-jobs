"use client";

import { Button } from "@/components/ui/button";
import { formatCredits } from "@/lib/credits";
import type { CostSidebarProps } from "./types";

export function CostSidebar({
  selectedPackage,
  selectedUpsells,
  availableCredits,
  showPackageInfo = true,
  onChangePackage,
  onBuyCredits,
}: CostSidebarProps) {
  // Calculate totals
  const packageCredits = selectedPackage?.credits || 0;
  const upsellCredits = selectedUpsells.reduce((sum, u) => sum + u.credits, 0);
  const totalCredits = packageCredits + upsellCredits;
  const remainingCredits = availableCredits - totalCredits;
  const hasEnoughCredits = remainingCredits >= 0;

  return (
    <div className="space-y-4">
      {/* Credits Overview Card */}
      <div className="bg-white rounded-t-[0.75rem] rounded-b-[2rem] p-5">
        <h3 className="text-base font-bold text-[#1F2D58] mb-4">Kostenoverzicht</h3>

        {/* Available credits */}
        <div className="mb-4">
          <p className="text-sm text-[#1F2D58]/70 mb-1">Beschikbare credits</p>
          <p className="text-3xl font-bold text-[#1F2D58]">{availableCredits}</p>
        </div>

        {/* Buy more credits button */}
        {onBuyCredits && (
          <Button
            variant="secondary"
            className="w-full mb-4"
            onClick={onBuyCredits}
          >
            Meer credits kopen
          </Button>
        )}

        {/* Cost breakdown - only show if package selected */}
        {selectedPackage && (
          <>
            <div className="border-t border-[#1F2D58]/10 pt-4 mt-4">
              <p className="text-sm text-[#1F2D58]/70 mb-2">Kosten breakdown</p>
              
              {/* Package */}
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[#1F2D58]">{selectedPackage.display_name}</span>
                <span className="text-[#1F2D58] font-medium">{packageCredits}</span>
              </div>

              {/* Upsells */}
              {selectedUpsells.map((upsell) => (
                <div key={upsell.id} className="flex justify-between text-sm mb-1">
                  <span className="text-[#1F2D58]">{upsell.display_name}</span>
                  <span className="text-[#1F2D58] font-medium">+{upsell.credits}</span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="border-t border-[#1F2D58]/10 pt-3 mt-3">
              <div className="flex justify-between">
                <span className="font-bold text-[#1F2D58]">Totaal benodigd</span>
                <span className="font-bold text-[#1F2D58]">{totalCredits}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-[#1F2D58]/70">Na plaatsing over</span>
                <span className={`font-medium ${hasEnoughCredits ? "text-[#1F2D58]" : "text-red-600"}`}>
                  {remainingCredits}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Package Info Card - only show if package selected and showPackageInfo is true */}
      {showPackageInfo && selectedPackage && (
        <div className="bg-white rounded-t-[0.75rem] rounded-b-[2rem] p-5">
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
