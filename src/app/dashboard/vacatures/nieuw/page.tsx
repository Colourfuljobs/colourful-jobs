"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { VacancyWizard } from "@/components/vacatures";

export default function NieuweVacaturePage() {
  const searchParams = useSearchParams();
  const vacancyId = searchParams.get("id");
  const stepParam = searchParams.get("step");
  const initialStep = stepParam ? parseInt(stepParam, 10) : undefined;

  // Set page title
  useEffect(() => {
    document.title = "Vacature plaatsen | Colourful jobs";
  }, []);

  return (
    <VacancyWizard 
      initialVacancyId={vacancyId || undefined} 
      initialStep={initialStep as 1 | 2 | 3 | 4 | undefined}
    />
  );
}
