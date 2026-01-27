"use client";

import { useEffect } from "react";
import { VacancyWizard } from "@/components/vacatures";

export default function NieuweVacaturePage() {
  // Set page title
  useEffect(() => {
    document.title = "Vacature plaatsen | Colourful jobs";
  }, []);

  return <VacancyWizard />;
}
