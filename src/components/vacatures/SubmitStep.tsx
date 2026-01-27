"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { InsufficientCreditsAlert } from "@/components/checkout";
import { CheckCircle, AlertTriangle } from "lucide-react";
import { checkSufficientCredits } from "@/lib/credits";
import type { SubmitStepProps } from "./types";

export function SubmitStep({
  vacancy,
  selectedPackage,
  selectedUpsells,
  availableUpsells,
  availableCredits,
  onToggleUpsell,
  onSubmit,
  onBuyCredits,
  isSubmitting,
}: SubmitStepProps) {
  // Calculate totals
  const packageCredits = selectedPackage.credits;
  const upsellCredits = selectedUpsells.reduce((sum, u) => sum + u.credits, 0);
  const totalCredits = packageCredits + upsellCredits;

  // Check if we have enough credits
  const creditCheck = checkSufficientCredits(totalCredits, availableCredits);

  // Filter out already selected upsells from available
  const selectableUpsells = availableUpsells.filter(
    (upsell) => !selectedUpsells.some((s) => s.id === upsell.id)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-t-[0.75rem] rounded-b-[2rem] p-6">
        <h2 className="text-xl font-bold text-[#1F2D58] mb-1">3. Vacature plaatsen</h2>
        <p className="text-[#1F2D58]/70 text-sm">
          Je rekent nu af om je vacature te publiceren.
        </p>
      </div>

      {/* Package summary */}
      <div className="bg-white rounded-t-[0.75rem] rounded-b-[2rem] p-6">
        <p className="text-xs text-[#1F2D58]/60 mb-1">Gekozen pakket</p>
        <h3 className="text-lg font-bold text-[#1F2D58] mb-4">{selectedPackage.display_name}</h3>

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
      </div>

      {/* Upsells selection */}
      {selectableUpsells.length > 0 && (
        <div className="bg-white rounded-t-[0.75rem] rounded-b-[2rem] p-6">
          <h3 className="text-lg font-bold text-[#1F2D58] mb-1">Kies extra&apos;s</h3>
          <p className="text-sm text-[#1F2D58]/70 mb-4">
            Vergroot de zichtbaarheid van je vacature
          </p>

          <div className="space-y-3">
            {selectableUpsells.map((upsell) => {
              const isSelected = selectedUpsells.some((s) => s.id === upsell.id);
              
              return (
                <label
                  key={upsell.id}
                  className="flex items-start gap-3 p-4 border border-[#1F2D58]/10 rounded-lg cursor-pointer hover:border-[#1F2D58]/30 transition-colors"
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleUpsell(upsell)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[#1F2D58]">
                        {upsell.display_name}
                      </span>
                      <span className="text-sm text-[#1F2D58] font-medium">
                        +{upsell.credits} credits
                      </span>
                    </div>
                    <p className="text-sm text-[#1F2D58]/60 mt-0.5">
                      {getUpsellDescription(upsell.display_name)}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Already selected upsells */}
      {selectedUpsells.length > 0 && (
        <div className="bg-white rounded-t-[0.75rem] rounded-b-[2rem] p-6">
          <h3 className="text-base font-bold text-[#1F2D58] mb-3">Geselecteerde extra&apos;s</h3>
          <div className="space-y-2">
            {selectedUpsells.map((upsell) => (
              <div
                key={upsell.id}
                className="flex items-center justify-between py-2 border-b border-[#1F2D58]/10 last:border-0"
              >
                <span className="text-sm text-[#1F2D58]">{upsell.display_name}</span>
                <span className="text-sm text-[#1F2D58] font-medium">
                  +{upsell.credits} credits
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Credit check result */}
      {!creditCheck.sufficient ? (
        <InsufficientCreditsAlert
          requiredCredits={totalCredits}
          availableCredits={availableCredits}
          onBuyCredits={onBuyCredits}
        />
      ) : (
        <Alert className="bg-[#193DAB]/[0.12] border-none">
          <AlertDescription className="text-[#1F2D58]">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1 text-left">
                <strong className="block mb-1">Voldoende credits</strong>
                <p className="text-sm">
                  Je hebt {availableCredits} credits beschikbaar. Na plaatsing heb je nog{" "}
                  {availableCredits - totalCredits} credits over.
                </p>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Review notice */}
      <Alert className="bg-[#193DAB]/[0.12] border-none">
        <AlertDescription className="text-[#1F2D58]">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-[#1F2D58]" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm">
                Na het insturen beoordeelt wij je vacature. Je ontvangt automatisch een
                factuur op het ingegeven facturatie-e-mailadres.
              </p>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Submit button */}
      <div className="flex items-center justify-end gap-3">
        <Button
          onClick={onSubmit}
          disabled={isSubmitting || !creditCheck.sufficient}
          className="min-w-[200px]"
        >
          {isSubmitting ? (
            <>
              <Spinner className="w-4 h-4 mr-2" />
              Bezig met indienen...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Vacature insturen
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// Helper function to get upsell descriptions
function getUpsellDescription(name: string): string {
  const descriptions: Record<string, string> = {
    "Uitgelichte vacature":
      "Vacature krijgt afwijkend ontwerp waardoor het meer opvalt en wordt hoger in de vacature lijsten geplaatst.",
    "Zelfde dag online":
      "Zend de vacature voor 15:00 en wij zorgen dat hij vandaag nog gecontroleerd en gepubliceerd is.",
    "Extra social":
      "Extra promotie op onze social media kanalen voor meer bereik.",
    "Verleng publicatie":
      "Verleng de publicatieperiode van je vacature met 30 dagen.",
  };
  return descriptions[name] || "Vergroot de zichtbaarheid van je vacature.";
}
