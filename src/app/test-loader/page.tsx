"use client";

import { useState } from "react";
import { PageLoader } from "@/components/ui/page-loader";
import { Button } from "@/components/ui/button";

type LoaderVariant = "default" | "with-text";

export default function TestLoaderPage() {
  const [activeVariant, setActiveVariant] = useState<LoaderVariant | null>(null);

  if (activeVariant) {
    return (
      <div className="relative">
        {/* Close button */}
        <button
          onClick={() => setActiveVariant(null)}
          className="fixed top-6 right-6 z-50 bg-white rounded-full px-4 py-2 shadow-lg text-sm font-medium text-[#1F2D58] hover:bg-gray-100"
        >
          ← Terug naar overzicht
        </button>

        {/* Render the selected variant */}
        {activeVariant === "default" && <PageLoader />}
        {activeVariant === "with-text" && (
          <PageLoader 
            title="Even geduld..." 
            description="We laden je gegevens."
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-[#1F2D58] mb-2">PageLoader Test</h1>
        <p className="text-[#1F2D58]/70 mb-8">
          Klik op een variant om deze full-screen te bekijken.
        </p>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Variant 1: Default */}
          <div className="rounded-xl border border-[#193DAB]/20 overflow-hidden">
            <div className="bg-[#E8EEF2] h-48 flex items-center justify-center relative">
              <div className="absolute top-3 left-3 scale-[0.4] origin-top-left">
                <img src="/logo.svg" alt="Logo" className="h-[29px]" />
              </div>
              <div className="scale-50">
                <PageLoader />
              </div>
            </div>
            <div className="bg-white p-4">
              <h3 className="font-semibold text-[#1F2D58] mb-1">Standaard</h3>
              <p className="text-sm text-[#1F2D58]/60 mb-3">
                Logo + spinner. Voor snelle loading states en redirects.
              </p>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => setActiveVariant("default")}
                showArrow={false}
              >
                Bekijk full-screen
              </Button>
            </div>
          </div>

          {/* Variant 2: With Text */}
          <div className="rounded-xl border border-[#193DAB]/20 overflow-hidden">
            <div className="bg-[#E8EEF2] h-48 flex items-center justify-center relative">
              <div className="absolute top-3 left-3 scale-[0.4] origin-top-left">
                <img src="/logo.svg" alt="Logo" className="h-[29px]" />
              </div>
              <div className="scale-50">
                <PageLoader 
                  title="Even geduld..." 
                  description="We laden je gegevens."
                />
              </div>
            </div>
            <div className="bg-white p-4">
              <h3 className="font-semibold text-[#1F2D58] mb-1">Met tekst</h3>
              <p className="text-sm text-[#1F2D58]/60 mb-3">
                Wanneer de actie langer duurt en context helpt.
              </p>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => setActiveVariant("with-text")}
                showArrow={false}
              >
                Bekijk full-screen
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-12 p-6 bg-white rounded-xl border border-[#193DAB]/20">
          <h2 className="font-semibold text-[#1F2D58] mb-4">Gebruik richtlijnen</h2>
          <div className="space-y-3 text-sm text-[#1F2D58]/80">
            <p><strong>Standaard:</strong> Dashboard layout, AuthGuard, login, invitation, korte redirects</p>
            <p><strong>Met tekst:</strong> Account activatie, onboarding voltooien, langere processen waar context nuttig is</p>
          </div>
        </div>
      </div>
    </div>
  );
}
