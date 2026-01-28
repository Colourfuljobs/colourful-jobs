"use client";

import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProductRecord } from "@/lib/airtable";

interface WeDoItForYouBannerProps {
  product: ProductRecord;
  onSelect: () => void;
}

export function WeDoItForYouBanner({ product, onSelect }: WeDoItForYouBannerProps) {
  return (
    <div className="border border-[#193DAB]/[0.12] rounded-t-[0.75rem] rounded-b-[2rem] p-5 mt-6">
      <div className="w-10 h-10 rounded-full bg-[#193DAB]/[0.12] flex items-center justify-center mb-3">
        <Rocket className="w-5 h-5 text-[#1F2D58]" />
      </div>
      <p className="text-xs text-[#1F2D58]/70 mb-1">Geen tijd of hulp nodig?</p>
      <h4 className="text-lg font-bold text-[#1F2D58] mb-2">{product.display_name}</h4>
      {product.description && (
        <p className="text-sm text-[#1F2D58]/70 mb-3">
          {product.description}
        </p>
      )}
      <p className="text-sm font-medium text-[#1F2D58] mb-4">
        +{product.credits} credits
      </p>
      <Button
        variant="secondary"
        onClick={onSelect}
      >
        Regel het voor mij
      </Button>
    </div>
  );
}
