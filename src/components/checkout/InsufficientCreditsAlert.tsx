"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Coins, AlertTriangle } from "lucide-react";
import { formatCredits } from "@/lib/credits";

interface InsufficientCreditsAlertProps {
  requiredCredits: number;
  availableCredits: number;
  onBuyCredits: () => void;
  className?: string;
}

/**
 * Alert component shown when user has insufficient credits for an action
 * Displays shortage amount and CTA to open checkout modal
 */
export function InsufficientCreditsAlert({
  requiredCredits,
  availableCredits,
  onBuyCredits,
  className,
}: InsufficientCreditsAlertProps) {
  const shortage = requiredCredits - availableCredits;

  return (
    <Alert className={`bg-[#193DAB]/[0.12] border-none ${className || ""}`}>
      <AlertDescription className="text-[#1F2D58]">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-[#F86600]" />
          </div>
          <div className="flex-1">
            <strong className="block mb-1">Onvoldoende credits</strong>
            <p className="mb-3 text-sm">
              Je hebt {formatCredits(availableCredits)} beschikbaar, maar hebt{" "}
              {formatCredits(requiredCredits)} nodig voor deze actie. Koop nog
              minimaal {formatCredits(shortage)} bij om door te gaan.
            </p>
            <Button
              size="sm"
              onClick={onBuyCredits}
              showArrow={false}
            >
              <Coins className="h-4 w-4 mr-1" />
              Credits bijkopen
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
