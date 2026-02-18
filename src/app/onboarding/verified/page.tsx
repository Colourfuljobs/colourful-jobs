"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export default function VerifiedPage() {
  useEffect(() => {
    document.title = "E-mail geverifieerd | Colourful jobs";
  }, []);

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <Link href="https://www.colourfuljobs.nl/">
              <Image src="/logo.svg" alt="Colourful jobs" width={180} height={29} priority />
            </Link>
          </div>
          <Card className="p-0 overflow-hidden">
            <CardContent className="p-6 sm:p-8 bg-white">
              <div className="flex flex-col items-center justify-center py-8 px-6 text-center">
                <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-[#DEEEE3] mb-4">
                  <CheckCircle2 className="w-8 h-8 text-[#41712F]" />
                </div>
                <div className="max-w-md space-y-3">
                  <h3 className="text-lg font-semibold text-[#1F2D58]">
                    E-mail geverifieerd!
                  </h3>
                  <p className="p-regular text-slate-600">
                    Je kunt dit tabblad nu sluiten.<br />
                    De registratie gaat verder in het oorspronkelijke tabblad.
                  </p>
                  <div className="!mt-6">
                    <Link href="/onboarding">
                      <Button variant="secondary" showArrow={false}>
                        Doorgaan met registratie
                      </Button>
                    </Link>
                  </div>
                  <p className="p-small text-slate-500 !mt-2">
                    Oorspronkelijk tabblad gesloten? Klik dan hierboven om verder te gaan.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
