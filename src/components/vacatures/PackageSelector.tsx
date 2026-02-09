"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { Check, Coins } from "lucide-react";
import { useCredits } from "@/lib/credits-context";
import type { FeatureRecord } from "@/lib/airtable";
import type { ProductWithFeatures } from "./types";

interface PackageSelectorProps {
  packages: ProductWithFeatures[];
  selectedPackage: ProductWithFeatures | null;
  onSelectPackage: (pkg: ProductWithFeatures) => void;
  availableCredits: number;
  onBuyCredits?: () => void;
}

// Category labels - using Dutch values as keys since that's what Airtable returns
const CATEGORY_LABELS: Record<string, string> = {
  "Altijd inbegrepen": "Altijd inbegrepen",
  "Extra boost": "Extra boost",
  "Snel en in de spotlight": "Snel en in de spotlight",
  "Upsell": "Upsell",
};

// Normalize category to standard key (handle various possible formats)
const normalizeCategory = (cat: string | null | undefined): string => {
  if (!cat) return "Altijd inbegrepen";
  // Return the category as-is if it's already a known Dutch category
  if (CATEGORY_LABELS[cat]) return cat;
  // Fallback normalization for unexpected formats
  const lower = cat.toLowerCase().trim();
  if (lower.includes("always") || lower.includes("altijd")) return "Altijd inbegrepen";
  if (lower.includes("extra") || lower.includes("boost")) return "Extra boost";
  if (lower.includes("spotlight") || lower.includes("snel")) return "Snel en in de spotlight";
  if (lower.includes("upsell")) return "Upsell";
  return "Altijd inbegrepen";
};

// Category order for display (excluding Upsell which is handled separately)
const CATEGORY_ORDER: string[] = [
  "Altijd inbegrepen",
  "Extra boost",
  "Snel en in de spotlight",
];

export function PackageSelector({
  packages,
  selectedPackage,
  onSelectPackage,
  availableCredits,
  onBuyCredits,
}: PackageSelectorProps) {
  const { isPendingUpdate } = useCredits();
  // Group features by category
  const groupFeaturesByCategory = (features: FeatureRecord[]) => {
    const grouped: Record<string, FeatureRecord[]> = {};
    
    features.forEach((feature) => {
      const category = normalizeCategory(feature.package_category);
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(feature);
    });

    return grouped;
  };

  // Find the "Compleet" package index for "Meest gekozen" badge
  const mostChosenIndex = packages.findIndex(
    (pkg) => pkg.slug === "prod_vacancy_complete"
  );

  return (
    <div className="space-y-6">
      <div className="pt-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#1F2D58] mb-2">Kies je vacaturepakket</h2>
            <p className="text-[#1F2D58]/70">
              Selecteer het vacaturepakket dat het beste past bij jouw wensen
            </p>
          </div>
          <div className="flex flex-col items-end flex-shrink-0">
            <div className="flex items-center gap-1.5 text-[#1F2D58]">
              {isPendingUpdate ? (
                <>
                  <Spinner className="h-4 w-4" />
                  <span className="font-bold text-[#1F2D58]/70">Bijwerken...</span>
                </>
              ) : (
                <>
                  <Coins className="h-4 w-4" />
                  <span className="font-bold">{availableCredits} credits</span>
                </>
              )}
            </div>
            {onBuyCredits && (
              <button
                onClick={onBuyCredits}
                className="text-sm text-[#1F2D58]/70 hover:text-[#1F2D58] hover:underline"
              >
                + credits bijkopen
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Wrapper to ensure badge and cards are connected */}
      <div className="flex flex-col">
        {/* "Meest gekozen" badge row - positioned above middle card */}
        <div className="hidden md:grid grid-cols-3 gap-2">
          <div />
          <div className="bg-[#1F2D58]/10 text-center pt-0.5 pb-1.5 rounded-t-[0.75rem]">
            <span className="text-xs font-medium text-[#1F2D58]">Meest gekozen</span>
          </div>
          <div />
        </div>

        {/* Package cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-y-0 md:gap-x-2">
        {packages.map((pkg, index) => {
          const isSelected = selectedPackage?.id === pkg.id;
          const isMostChosen = index === mostChosenIndex || (mostChosenIndex === -1 && index === 1);
          const groupedFeatures = groupFeaturesByCategory(pkg.populatedFeatures || []);

          return (
            <div
              key={pkg.id}
              className={cn(
                "relative flex flex-col overflow-hidden transition-all h-full",
                // Border radius: first = large bottom-left, middle = all small, third = large bottom-right
                index === 0 && "rounded-t-[0.75rem] rounded-br-[0.75rem] rounded-bl-[2rem]",
                index === 1 && "md:rounded-t-none rounded-b-[0.75rem]",
                index === 2 && "rounded-t-[0.75rem] rounded-bl-[0.75rem] rounded-br-[2rem]",
                index === 1 ? "bg-white" : "bg-white/50",
index !== 1 && "hover:shadow-md"
              )}
            >
              {/* Mobile only: "Meest gekozen" badge inside card */}
              {isMostChosen && (
                <div className="md:hidden bg-[#1F2D58]/10 text-center py-1.5">
                  <span className="text-xs font-medium text-[#1F2D58]">Meest gekozen</span>
                </div>
              )}
              
              {/* Package content */}
              <div className="p-5 flex flex-col flex-1">
                {/* Package name - Contempora style */}
                <h3 className="contempora-medium text-[#1F2D58] !text-[2rem] sm:!text-[2.5rem]">
                  {pkg.display_name}
                </h3>

                {/* Short description from database */}
                {pkg.description && (
                  <p className="text-sm text-[#1F2D58]/70 mb-4">
                    {pkg.description}
                  </p>
                )}

                {/* CTA Button */}
                <Button
                  onClick={() => onSelectPackage(pkg)}
                  showArrow={!isSelected}
                  className={cn(
                    "w-full mb-4",
                    isSelected && "bg-[#1F2D58] hover:bg-[#1F2D58]/90"
                  )}
                >
                  {isSelected ? (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      Geselecteerd
                    </>
                  ) : (
                    `Kies ${pkg.display_name.toLowerCase()} vacature`
                  )}
                </Button>

                {/* Credits */}
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-[#1F2D58]">
                    {pkg.credits} credits
                  </span>
                  <span className="text-sm text-[#1F2D58]/50">
                    €{pkg.price % 1 === 0 ? pkg.price.toLocaleString("nl-NL") : pkg.price.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Divider under price */}
                <hr className="my-4 border-t border-[#1F2D58]/10" />

                {/* Features by category */}
                <div className="space-y-4 flex-1">
                  {CATEGORY_ORDER.map((category, catIndex) => {
                    const features = groupedFeatures[category];
                    if (!features || features.length === 0) return null;

                    // Check if next category has features (for conditional divider)
                    const hasSpotlightSection = groupedFeatures["Snel en in de spotlight"]?.length > 0;
                    const showDividerAfter = 
                      category === "Altijd inbegrepen" || 
                      (category === "Extra boost" && hasSpotlightSection);

                    return (
                      <div key={category}>
                        {/* Category label as tag */}
                        <span 
                          className={cn(
                            "inline-block text-xs font-medium text-[#1F2D58] mb-2 px-2 pt-0.5 pb-1.5 rounded-[4px]",
                            index === 1 ? "bg-[#193DAB]/[0.12]" : "bg-white"
                          )}
                        >
                          {CATEGORY_LABELS[category]}
                        </span>
                        
                        {/* Feature list */}
                        <ul className="space-y-2.5">
                          {features.map((feature) => (
                            <li
                              key={feature.id}
                              className="flex items-start gap-2 text-sm text-[#1F2D58]"
                            >
                              <Check className="w-4 h-4 text-[#2F9D07] shrink-0 mt-0.5" />
                              <span>{feature.display_name}</span>
                            </li>
                          ))}
                        </ul>

                        {/* Divider after category */}
                        {showDividerAfter && (
                          <hr className="mt-4 border-t border-[#1F2D58]/10" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
