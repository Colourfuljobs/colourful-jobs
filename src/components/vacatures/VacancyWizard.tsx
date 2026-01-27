"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { CreditsCheckoutModal } from "@/components/checkout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StepIndicator } from "./StepIndicator";
import { CostSidebar } from "./CostSidebar";
import { PackageSelector } from "./PackageSelector";
import { VacancyForm } from "./VacancyForm";
import { VacancyPreview } from "./VacancyPreview";
import { SubmitStep } from "./SubmitStep";
import { WeDoItForYouBanner } from "./WeDoItForYouBanner";
import type {
  WizardStep,
  VacancyWizardState,
  ProductWithFeatures,
} from "./types";
import type { ProductRecord, LookupRecord, VacancyRecord } from "@/lib/airtable";

interface VacancyWizardProps {
  initialVacancyId?: string;
}

export function VacancyWizard({ initialVacancyId }: VacancyWizardProps) {
  const router = useRouter();
  
  // Wizard state
  const [state, setState] = useState<VacancyWizardState>({
    currentStep: 1,
    inputType: "self_service",
    isDirty: false,
    selectedPackage: null,
    selectedUpsells: [],
    vacancyData: {},
    vacancyId: initialVacancyId || null,
  });

  // Data state
  const [packages, setPackages] = useState<ProductWithFeatures[]>([]);
  const [upsells, setUpsells] = useState<ProductRecord[]>([]);
  const [lookups, setLookups] = useState<{
    educationLevels: LookupRecord[];
    fields: LookupRecord[];
    functionTypes: LookupRecord[];
    regions: LookupRecord[];
    sectors: LookupRecord[];
  } | null>(null);
  const [availableCredits, setAvailableCredits] = useState(0);
  
  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [weDoItForYouProduct, setWeDoItForYouProduct] = useState<ProductRecord | null>(null);

  // Auto-save ref
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [lastSavedData, setLastSavedData] = useState<string>("");

  // Unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.isDirty) {
        e.preventDefault();
        e.returnValue = "Je hebt niet-opgeslagen wijzigingen. Weet je zeker dat je wilt vertrekken?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [state.isDirty]);

  // Fetch initial data
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch packages, upsells, lookups, and credits in parallel
        const [packagesRes, upsellsRes, lookupsRes, accountRes] = await Promise.all([
          fetch("/api/products?type=vacancy_package&includeFeatures=true"),
          fetch("/api/products?type=upsell"),
          fetch("/api/lookups?type=all"),
          fetch("/api/account"),
        ]);

        if (packagesRes.ok) {
          const data = await packagesRes.json();
          setPackages(data.products || []);
        }

        if (upsellsRes.ok) {
          const data = await upsellsRes.json();
          const allUpsells = data.products || [];
          // Find "We do it for you" product
          const wdify = allUpsells.find(
            (p: ProductRecord) => p.display_name === "We do it for you"
          );
          if (wdify) {
            setWeDoItForYouProduct(wdify);
          }
          // Filter out "We do it for you" from regular upsells
          setUpsells(allUpsells.filter(
            (p: ProductRecord) => p.display_name !== "We do it for you"
          ));
        }

        if (lookupsRes.ok) {
          const data = await lookupsRes.json();
          setLookups(data);
        }

        if (accountRes.ok) {
          const data = await accountRes.json();
          setAvailableCredits(data.credits?.available || 0);
        }

        // If editing existing vacancy, fetch it
        if (initialVacancyId) {
          const vacancyRes = await fetch(`/api/vacancies/${initialVacancyId}`);
          if (vacancyRes.ok) {
            const data = await vacancyRes.json();
            const vacancy = data.vacancy as VacancyRecord;
            
            setState((prev) => ({
              ...prev,
              vacancyData: vacancy,
              inputType: vacancy.input_type || "self_service",
              // If vacancy has a package, we should be on step 2
              currentStep: vacancy.package_id ? 2 : 1,
            }));

            // Set selected package if exists
            if (vacancy.package_id) {
              const pkgRes = await fetch(`/api/products?type=vacancy_package&includeFeatures=true`);
              if (pkgRes.ok) {
                const pkgData = await pkgRes.json();
                const pkg = pkgData.products?.find((p: ProductWithFeatures) => p.id === vacancy.package_id);
                if (pkg) {
                  setState((prev) => ({ ...prev, selectedPackage: pkg }));
                }
              }
            }
          }
        }
      } catch (error) {
        console.error("Error fetching wizard data:", error);
        toast.error("Er ging iets mis bij het laden van de gegevens");
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [initialVacancyId]);

  // Calculate completed steps
  const getCompletedSteps = useCallback((): WizardStep[] => {
    const completed: WizardStep[] = [];
    
    // Step 1 is complete if package is selected
    if (state.selectedPackage) completed.push(1);
    
    // Step 2 is complete if basic form is filled
    // (For now, just check if we have a vacancy ID)
    if (state.vacancyId && state.vacancyData.title) completed.push(2);
    
    // Step 3 is complete if we've viewed the preview
    // (tracked by moving to step 4)
    if (state.currentStep >= 4) completed.push(3);
    
    return completed;
  }, [state.selectedPackage, state.vacancyId, state.vacancyData.title, state.currentStep]);

  // Handle package selection
  const handleSelectPackage = useCallback((pkg: ProductRecord) => {
    setState((prev) => ({
      ...prev,
      selectedPackage: pkg,
      isDirty: true,
    }));
  }, []);

  // Validate vacancy data for step 2 → 3 transition
  const validateVacancy = useCallback((): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const { vacancyData, inputType } = state;

    if (inputType === "we_do_it_for_you") {
      // Simplified validation for "We do it for you"
      if (!vacancyData.description?.trim()) {
        errors.push("Vacaturetekst is verplicht");
      }
      // Application method
      if (vacancyData.show_apply_form) {
        if (!vacancyData.application_email?.trim()) {
          errors.push("E-mailadres voor sollicitaties is verplicht");
        }
      } else {
        if (!vacancyData.apply_url?.trim()) {
          errors.push("Sollicitatie URL is verplicht");
        }
      }
    } else {
      // Full validation for self-service
      if (!vacancyData.title?.trim()) {
        errors.push("Vacaturetitel is verplicht");
      }
      if (!vacancyData.intro_txt?.trim()) {
        errors.push("Introductietekst is verplicht");
      }
      if (!vacancyData.description?.trim()) {
        errors.push("Vacaturetekst is verplicht");
      }
      if (!vacancyData.location?.trim()) {
        errors.push("Plaats is verplicht");
      }
      if (!vacancyData.region_id) {
        errors.push("Regio is verplicht");
      }
      if (!vacancyData.function_type_id) {
        errors.push("Functietype is verplicht");
      }
      if (!vacancyData.field_id) {
        errors.push("Vakgebied is verplicht");
      }
      if (!vacancyData.sector_id) {
        errors.push("Sector is verplicht");
      }
      // Application method
      if (vacancyData.show_apply_form) {
        if (!vacancyData.application_email?.trim()) {
          errors.push("E-mailadres voor sollicitaties is verplicht");
        }
      } else {
        if (!vacancyData.apply_url?.trim()) {
          errors.push("Sollicitatie URL is verplicht");
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }, [state]);

  // Auto-save function (defined before handleNext since it depends on it)
  const saveVacancy = useCallback(async () => {
    if (!state.vacancyId || !state.isDirty) return;

    const currentData = JSON.stringify(state.vacancyData);
    if (currentData === lastSavedData) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/vacancies/${state.vacancyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state.vacancyData),
      });

      if (res.ok) {
        setLastSavedData(currentData);
        setState((prev) => ({ ...prev, isDirty: false }));
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error("Auto-save failed:", res.status, errorData);
        toast.error("Opslaan mislukt", { 
          description: errorData.error || "Er ging iets mis bij het opslaan" 
        });
      }
    } catch (error) {
      console.error("Auto-save error:", error);
      toast.error("Opslaan mislukt", { 
        description: "Controleer je internetverbinding" 
      });
    } finally {
      setIsSaving(false);
    }
  }, [state.vacancyId, state.vacancyData, state.isDirty, lastSavedData]);

  // Navigate to next step
  const handleNext = useCallback(async () => {
    const { currentStep, selectedPackage, vacancyId } = state;

    // Validation per step
    if (currentStep === 1 && !selectedPackage) {
      toast.error("Selecteer eerst een pakket");
      return;
    }

    // Create vacancy when moving from step 1 to step 2 (if not already created)
    if (currentStep === 1 && !vacancyId) {
      setIsSaving(true);
      try {
        const res = await fetch("/api/vacancies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            package_id: selectedPackage?.id,
            input_type: state.inputType,
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to create vacancy");
        }

        const data = await res.json();
        // Initialize lastSavedData with the vacancy data so we can track actual changes
        setLastSavedData(JSON.stringify(data.vacancy));
        setState((prev) => ({
          ...prev,
          vacancyId: data.vacancy.id,
          vacancyData: data.vacancy,
          currentStep: (prev.currentStep + 1) as WizardStep,
          isDirty: false, // Reset dirty state when entering step 2
        }));
        toast.success("Concept vacature aangemaakt");
      } catch (error) {
        console.error("Error creating vacancy:", error);
        toast.error("Er ging iets mis bij het aanmaken van de vacature");
      } finally {
        setIsSaving(false);
      }
      return;
    }

    // Validate before moving from step 2 to step 3
    if (currentStep === 2) {
      const validation = validateVacancy();
      if (!validation.valid) {
        // Show first 3 errors
        const errorList = validation.errors.slice(0, 3).join(", ");
        toast.error("Vul de verplichte velden in", {
          description: errorList + (validation.errors.length > 3 ? ` (+${validation.errors.length - 3} meer)` : ""),
        });
        return;
      }
      
      // Save before moving to preview
      if (state.isDirty) {
        await saveVacancy();
      }
    }

    // Just navigate to next step
    setState((prev) => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, 4) as WizardStep,
    }));
  }, [state, validateVacancy, saveVacancy]);

  // Navigate to previous step
  const handlePrevious = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 1) as WizardStep,
    }));
  }, []);

  // Handle step click in indicator
  const handleStepClick = useCallback((step: WizardStep) => {
    const completedSteps = getCompletedSteps();
    
    // Can go to step if it's completed or is the next step after current
    if (completedSteps.includes(step) || step <= state.currentStep) {
      setState((prev) => ({ ...prev, currentStep: step }));
    }
  }, [state.currentStep, getCompletedSteps]);

  // Handle credits purchase success
  const handleCreditsSuccess = useCallback((newBalance: number) => {
    setAvailableCredits(newBalance);
    setShowCheckoutModal(false);
    toast.success("Credits toegevoegd aan je account");
  }, []);

  // Handle vacancy data changes with auto-save
  const handleVacancyChange = useCallback((updates: Partial<VacancyRecord>) => {
    setState((prev) => ({
      ...prev,
      vacancyData: { ...prev.vacancyData, ...updates },
      isDirty: true,
    }));
  }, []);

  // Debounced auto-save
  useEffect(() => {
    if (state.isDirty && state.vacancyId) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveVacancy();
      }, 2000); // Save after 2 seconds of inactivity
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state.isDirty, state.vacancyId, saveVacancy]);

  // Handle "We do it for you" selection
  const handleWeDoItForYou = useCallback(() => {
    setState((prev) => {
      // Add weDoItForYou product to selected upsells if not already there
      const alreadySelected = prev.selectedUpsells.some(
        (u) => u.id === weDoItForYouProduct?.id
      );
      const newUpsells = alreadySelected || !weDoItForYouProduct
        ? prev.selectedUpsells
        : [...prev.selectedUpsells, weDoItForYouProduct];

      return {
        ...prev,
        inputType: "we_do_it_for_you",
        selectedUpsells: newUpsells,
        isDirty: true,
      };
    });
    // Update vacancy in database
    if (state.vacancyId) {
      fetch(`/api/vacancies/${state.vacancyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input_type: "we_do_it_for_you" }),
      });
    }
  }, [state.vacancyId, weDoItForYouProduct]);

  // Handle upsell toggle
  const handleToggleUpsell = useCallback((upsell: ProductRecord) => {
    setState((prev) => {
      const isSelected = prev.selectedUpsells.some((u) => u.id === upsell.id);
      const newUpsells = isSelected
        ? prev.selectedUpsells.filter((u) => u.id !== upsell.id)
        : [...prev.selectedUpsells, upsell];
      
      return {
        ...prev,
        selectedUpsells: newUpsells,
      };
    });
  }, []);

  // Handle back button with unsaved changes check
  const handleBack = useCallback(() => {
    if (state.isDirty) {
      setShowLeaveDialog(true);
    } else {
      router.back();
    }
  }, [state.isDirty, router]);

  // Handle leave confirmation
  const handleLeaveConfirm = useCallback(async (shouldSave: boolean) => {
    if (shouldSave && state.vacancyId) {
      await saveVacancy();
    }
    setShowLeaveDialog(false);
    router.back();
  }, [state.vacancyId, saveVacancy, router]);

  // Handle vacancy submission
  const handleSubmit = useCallback(async () => {
    if (!state.vacancyId || !state.selectedPackage) {
      toast.error("Geen vacature of pakket geselecteerd");
      return;
    }

    setIsSaving(true);
    try {
      // First, update the vacancy with selected upsells
      const upsellIds = state.selectedUpsells.map((u) => u.id);
      await fetch(`/api/vacancies/${state.vacancyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selected_upsells: upsellIds,
        }),
      });

      // Then submit the vacancy
      const res = await fetch(`/api/vacancies/${state.vacancyId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit vacancy");
      }

      const data = await res.json();
      
      // Update credits balance
      setAvailableCredits(data.new_balance);
      
      // Show success message
      toast.success("Vacature ingediend", {
        description: "Je vacature wordt beoordeeld door ons team.",
      });

      // Redirect to vacatures overview
      router.push("/dashboard/vacatures");
    } catch (error) {
      console.error("Error submitting vacancy:", error);
      toast.error("Er ging iets mis bij het indienen", {
        description: error instanceof Error ? error.message : "Probeer het opnieuw",
      });
    } finally {
      setIsSaving(false);
    }
  }, [state.vacancyId, state.selectedPackage, state.selectedUpsells, router]);

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner className="size-8 text-[#1F2D58]" />
      </div>
    );
  }

  // Render current step content
  const renderStepContent = () => {
    switch (state.currentStep) {
      case 1:
        return (
          <PackageSelector
            packages={packages}
            selectedPackage={state.selectedPackage}
            onSelectPackage={handleSelectPackage}
            availableCredits={availableCredits}
          />
        );
      case 2:
        return (
          <div className="space-y-6">
            <div className="bg-white/50 rounded-xl pt-4 px-6 pb-6">
              <h2 className="text-xl font-bold text-[#1F2D58] mb-1">2. Vacature opstellen</h2>
              <p className="text-[#1F2D58]/70 text-sm">
                Vul de vacature gegevens in en kies of upload bijpassende afbeeldingen
              </p>
            </div>
            
            {lookups && (
              <VacancyForm
                vacancy={state.vacancyData}
                inputType={state.inputType}
                lookups={lookups}
                onChange={handleVacancyChange}
              />
            )}
          </div>
        );
      case 3:
        return lookups ? (
          <VacancyPreview
            vacancy={state.vacancyData}
            selectedPackage={state.selectedPackage}
            selectedUpsells={state.selectedUpsells}
            lookups={lookups}
          />
        ) : (
          <div className="bg-white rounded-t-[0.75rem] rounded-b-[2rem] p-6">
            <Spinner className="w-6 h-6 text-[#1F2D58]" />
          </div>
        );
      case 4:
        return state.selectedPackage ? (
          <SubmitStep
            vacancy={state.vacancyData}
            selectedPackage={state.selectedPackage}
            selectedUpsells={state.selectedUpsells}
            availableUpsells={upsells}
            availableCredits={availableCredits}
            onToggleUpsell={handleToggleUpsell}
            onSubmit={handleSubmit}
            onBuyCredits={() => setShowCheckoutModal(true)}
            isSubmitting={isSaving}
          />
        ) : (
          <div className="bg-white rounded-t-[0.75rem] rounded-b-[2rem] p-6">
            <p className="text-[#1F2D58]/50">Geen pakket geselecteerd</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-bold text-[#1F2D58]">Vacature plaatsen</h1>

      {/* Step indicator */}
      <StepIndicator
        currentStep={state.currentStep}
        completedSteps={getCompletedSteps()}
        onStepClick={handleStepClick}
      />

      {/* Main content with sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content area - full width on steps 1-3, 2/3 width on step 2 with banner or step 4 */}
        <div className={state.currentStep === 4 || (state.currentStep === 2 && state.inputType === "self_service" && weDoItForYouProduct) ? "lg:col-span-2" : "lg:col-span-3"}>
          {renderStepContent()}
        </div>

        {/* We do it for you banner - only show on step 2 when in self_service mode */}
        {state.currentStep === 2 && state.inputType === "self_service" && weDoItForYouProduct && (
          <div className="lg:col-span-1">
            <WeDoItForYouBanner
              product={weDoItForYouProduct}
              onSelect={handleWeDoItForYou}
            />
          </div>
        )}

        {/* Cost sidebar - only show in step 4 */}
        {state.currentStep === 4 && (
          <div className="lg:col-span-1 space-y-4">
            <CostSidebar
              selectedPackage={state.selectedPackage}
              selectedUpsells={state.selectedUpsells}
              availableCredits={availableCredits}
              showPackageInfo={true}
              onChangePackage={() => handleStepClick(1)}
              onBuyCredits={() => setShowCheckoutModal(true)}
            />
          </div>
        )}
      </div>

      {/* Spacer for sticky navigation bar */}
      <div className="h-24" />

      {/* Sticky navigation bar */}
      <div className="fixed bottom-4 left-0 right-0 z-50 px-4 sm:left-[var(--sidebar-width)]">
        <div className="max-w-[62.5rem] mx-auto">
          <div className="bg-white rounded-[0.75rem] shadow-lg py-4 pr-4 pl-8">
            <div className="flex items-center justify-between">
              <div>
                {state.currentStep > 1 && (
                  <button
                    type="button"
                    onClick={handlePrevious}
                    disabled={isSaving}
                    className="text-[#1F2D58] hover:text-[#1F2D58]/70 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Vorige
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                {/* Save status badge - only show in step 2 */}
                {state.currentStep === 2 && (
                  isSaving ? (
                    <Badge variant="muted" className="flex items-center gap-1.5">
                      <Spinner className="w-3 h-3" />
                      <span>Opslaan...</span>
                    </Badge>
                  ) : state.isDirty ? (
                    <Badge variant="muted">Niet opgeslagen</Badge>
                  ) : state.vacancyId ? (
                    <Badge variant="success">Opgeslagen</Badge>
                  ) : null
                )}
                {state.currentStep < 4 && (
                  <Button
                    onClick={handleNext}
                    disabled={isSaving || (state.currentStep === 1 && !state.selectedPackage)}
                    showArrow={!isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Spinner className="w-4 h-4 mr-2" />
                        Laden...
                      </>
                    ) : (
                      `Verder naar ${state.currentStep === 1 ? "opstellen" : state.currentStep === 2 ? "voorbeeld" : "plaatsen"}`
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Credits checkout modal */}
      <CreditsCheckoutModal
        open={showCheckoutModal}
        onOpenChange={setShowCheckoutModal}
        context="vacancy"
        currentBalance={availableCredits}
        onSuccess={handleCreditsSuccess}
      />

      {/* Leave confirmation dialog */}
      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Niet-opgeslagen wijzigingen</DialogTitle>
            <DialogDescription>
              Je hebt wijzigingen die nog niet zijn opgeslagen. Wat wil je doen?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowLeaveDialog(false)}
              showArrow={false}
            >
              Annuleren
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleLeaveConfirm(false)}
              showArrow={false}
            >
              Verlaten zonder opslaan
            </Button>
            <Button
              onClick={() => handleLeaveConfirm(true)}
              showArrow={false}
            >
              Opslaan en verlaten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
