"use client";

import { Button } from "@/components/ui/button";
import type { ProductRecord } from "@/lib/airtable";

interface WeDoItForYouBannerProps {
  product: ProductRecord;
  onSelect: () => void;
}

export function WeDoItForYouBanner({ product, onSelect }: WeDoItForYouBannerProps) {
  return (
    <div className="bg-white rounded-t-[0.75rem] rounded-b-[2rem] p-5">
      <p className="text-xs text-[#1F2D58]/70 mb-1">Hulp nodig?</p>
      <h4 className="text-lg font-bold text-[#1F2D58] mb-2">We do it for you</h4>
      <p className="text-sm text-[#1F2D58]/70 mb-3">
        Vacature opstellen uit handen genomen worden?
      </p>
      <p className="text-sm font-medium text-[#1F2D58] mb-4">
        +€{product.price} / {product.credits} credits
      </p>
      <Button
        variant="secondary"
        onClick={onSelect}
      >
        Dit wil ik
      </Button>
    </div>
  );
}
