"use client";

import { useState } from "react";
import { Rocket, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCredits } from "@/lib/credits-context";
import { getPriceDisplayMode } from "@/lib/credits";
import type { ProductRecord } from "@/lib/airtable";

interface WeDoItForYouBannerProps {
  product: ProductRecord;
  onSelect: () => void;
}

export function WeDoItForYouBanner({ product, onSelect }: WeDoItForYouBannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { credits } = useCredits();
  const priceDisplayMode = getPriceDisplayMode(credits.total_purchased);

  const formattedPrice = `€${product.price % 1 === 0 ? product.price.toLocaleString("nl-NL") : product.price.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const creditInfo = (
    <p className="text-sm font-medium text-[#1F2D58] mb-4">
      {priceDisplayMode === "euros" ? (
        <>
          {formattedPrice}
          <span className="text-[#1F2D58]/60"> ({product.credits} credits)</span>
        </>
      ) : (
        <>{product.credits} credits</>
      )}
    </p>
  );

  return (
    <div className="border border-[#193DAB]/[0.12] rounded-t-[0.75rem] rounded-b-[2rem] p-5 mt-6">
      {/* Mobile: collapsible header */}
      <div
        className="flex items-center gap-3 sm:hidden cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="w-10 h-10 rounded-full bg-[#193DAB]/[0.12] flex items-center justify-center flex-shrink-0">
          <Rocket className="w-5 h-5 text-[#1F2D58]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[#1F2D58]/70">Geen tijd of hulp nodig?</p>
          <h4 className="text-base font-bold text-[#1F2D58] leading-tight">{product.display_name}</h4>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-[#1F2D58]/50 flex-shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </div>

      {/* Mobile: collapsible content */}
      {isOpen && (
        <div className="sm:hidden mt-3 pt-3 border-t border-[#193DAB]/[0.08]">
          {product.description && (
            <p className="text-sm text-[#1F2D58]/70 mb-3">{product.description}</p>
          )}
          {creditInfo}
          <Button variant="secondary" onClick={onSelect}>
            Regel het voor mij
          </Button>
        </div>
      )}

      {/* Desktop: always fully visible */}
      <div className="hidden sm:block">
        <div className="w-10 h-10 rounded-full bg-[#193DAB]/[0.12] flex items-center justify-center mb-3">
          <Rocket className="w-5 h-5 text-[#1F2D58]" />
        </div>
        <p className="text-xs text-[#1F2D58]/70 mb-1">Geen tijd of hulp nodig?</p>
        <h4 className="text-lg font-bold text-[#1F2D58] mb-2">{product.display_name}</h4>
        {product.description && (
          <p className="text-sm text-[#1F2D58]/70 mb-3">{product.description}</p>
        )}
        {creditInfo}
        <Button variant="secondary" onClick={onSelect}>
          Regel het voor mij
        </Button>
      </div>
    </div>
  );
}
