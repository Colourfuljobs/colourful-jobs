"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
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
import { ColleaguesSidebar } from "./ColleaguesSidebar";
import type {
  WizardStep,
  VacancyWizardState,
  ProductWithFeatures,
  InvoiceDetails,
} from "./types";
import type { ProductRecord, LookupRecord, VacancyRecord } from "@/lib/airtable";
import { useCredits } from "@/lib/credits-context";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, Rocket } from "lucide-react";
import Link from "next/link";

interface VacancyWizardProps {
  initialVacancyId?: string;
  initialStep?: 1 | 2 | 3 | 4;
}

export function VacancyWizard({ initialVacancyId, initialStep }: VacancyWizardProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  // Credits from global context - ensures sync across all components
  const { credits, refetch: refetchCredits } = useCredits();
  const availableCredits = credits.available;
  
  // Wizard state
  const [state, setState] = useState<VacancyWizardState>({
    currentStep: initialStep || 1,
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
  
  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [weDoItForYouProduct, setWeDoItForYouProduct] = useState<ProductRecord | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [invoiceDetails, setInvoiceDetails] = useState<InvoiceDetails | null>(null);
  const [showInvoiceError, setShowInvoiceError] = useState(false);
  const [profileComplete, setProfileComplete] = useState(true);
  const [contactPhotoUrl, setContactPhotoUrl] = useState<string | null>(null);
  const [headerImageUrl, setHeaderImageUrl] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  
  // Track recommendations in wizard state (for ColleaguesSidebar)
  const [recommendations, setRecommendations] = useState<{firstName: string; lastName: string}[]>([]);

  // Auto-save ref
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [lastSavedData, setLastSavedData] = useState<string>("");
  
  // Track if initial data has been loaded (prevents re-fetching on URL step changes)
  const initialLoadDoneRef = useRef(false);
  
  // Track if vacancy was submitted (prevents URL sync from overriding redirect)
  const isSubmittedRef = useRef(false);

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

  // Sync state to URL for persistence across refreshes
  useEffect(() => {
    // Only update URL if we have a vacancy ID (after step 1)
    // Skip if vacancy was submitted (prevents overriding the redirect to dashboard)
    if (state.vacancyId && !isSubmittedRef.current) {
      const params = new URLSearchParams();
      params.set("id", state.vacancyId);
      params.set("step", state.currentStep.toString());
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [state.vacancyId, state.currentStep, pathname, router]);

  // Fetch initial data - only runs once on mount or when vacancyId changes
  useEffect(() => {
    // Skip if we've already loaded initial data and the vacancyId hasn't changed
    if (initialLoadDoneRef.current) {
      return;
    }

    async function fetchData() {
      try {
        // Fetch packages, upsells, lookups and account data in parallel
        // Credits are handled by CreditsContext, no need to fetch here
        const [packagesRes, upsellsRes, lookupsRes, accountRes] = await Promise.all([
          fetch("/api/products?type=vacancy_package&includeFeatures=true"),
          fetch("/api/products?type=upsell&availability=add-vacancy"),
          fetch("/api/lookups?type=all"),
          fetch("/api/account"),
        ]);

        // Check profile completeness from account data
        if (accountRes.ok) {
          const accountData = await accountRes.json();
          setProfileComplete(accountData.profile_complete ?? true);
        }

        if (packagesRes.ok) {
          const data = await packagesRes.json();
          setPackages(data.products || []);
        }

        // Track wdify product at function scope so we can use it when restoring vacancy
        let wdifyProduct: ProductRecord | null = null;

        if (upsellsRes.ok) {
          const data = await upsellsRes.json();
          const allUpsells = data.products || [];
          // Find "We do it for you" product by slug
          const wdify = allUpsells.find(
            (p: ProductRecord) => p.slug === "prod_upsell_we-do-it-for-you"
          );
          if (wdify) {
            setWeDoItForYouProduct(wdify);
            wdifyProduct = wdify;
          }
          // Filter out "We do it for you" from regular upsells
          setUpsells(allUpsells.filter(
            (p: ProductRecord) => p.slug !== "prod_upsell_we-do-it-for-you"
          ));
        }

        if (lookupsRes.ok) {
          const data = await lookupsRes.json();
          setLookups(data);
        }

        // If editing existing vacancy, fetch it
        if (initialVacancyId) {
          const vacancyRes = await fetch(`/api/vacancies/${initialVacancyId}`);
          if (vacancyRes.ok) {
            const data = await vacancyRes.json();
            const vacancy = data.vacancy as VacancyRecord;
            
            // Determine step: use initialStep from URL if valid, otherwise determine from vacancy state
            let stepToUse = initialStep;
            if (!stepToUse || stepToUse < 1 || stepToUse > 4) {
              // Default: if vacancy has a package, go to step 2, otherwise step 1
              stepToUse = vacancy.package_id ? 2 : 1;
            }
            
            // Restore "We do it for you" upsell in selectedUpsells if applicable
            const restoredUpsells: ProductRecord[] = [];
            if (vacancy.input_type === "we_do_it_for_you" && wdifyProduct) {
              restoredUpsells.push(wdifyProduct);
            }

            setState((prev) => ({
              ...prev,
              vacancyData: vacancy,
              inputType: vacancy.input_type || "self_service",
              currentStep: stepToUse as WizardStep,
              selectedUpsells: restoredUpsells,
            }));
            
            // Initialize recommendations from vacancy data
            if (vacancy.recommendations) {
              try {
                setRecommendations(JSON.parse(vacancy.recommendations));
              } catch { /* ignore parse errors */ }
            }

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
        
        // Mark initial load as done
        initialLoadDoneRef.current = true;
      } catch (error) {
        console.error("Error fetching wizard data:", error);
        toast.error("Er ging iets mis bij het laden van de gegevens");
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Check if selected package has social post feature
  const hasSocialPostFeature = state.selectedPackage?.populatedFeatures?.some(
    (feature) => feature.action_tags?.includes("cj_social_post")
  ) ?? false;

  // Clean up empty recommendation entries from local state
  const cleanupEmptyRecommendations = useCallback(() => {
    setRecommendations((prev) => {
      const filled = prev.filter(
        (rec) => rec.firstName?.trim() || rec.lastName?.trim()
      );
      // Only update if something actually changed
      if (filled.length !== prev.length) return filled;
      return prev;
    });
  }, []);

  // Handle recommendation changes (for ColleaguesSidebar)
  const handleRecommendationsChange = useCallback((newRecs: {firstName: string; lastName: string}[]) => {
    setRecommendations(newRecs);
    // Only persist non-empty recommendations to vacancy data
    const filledRecs = newRecs.filter(
      (rec) => rec.firstName?.trim() || rec.lastName?.trim()
    );
    setState((prev) => ({
      ...prev,
      vacancyData: { ...prev.vacancyData, recommendations: JSON.stringify(filledRecs) },
      isDirty: true,
    }));
  }, []);

  // Handle package selection
  const handleSelectPackage = useCallback((pkg: ProductWithFeatures) => {
    setState((prev) => ({
      ...prev,
      selectedPackage: pkg,
      // Don't set isDirty here - package selection is saved separately, not as part of vacancyData
    }));
  }, []);

  // Validate vacancy data for step 2 → 3 transition
  const validateVacancy = useCallback((): { valid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {};
    const { vacancyData, inputType } = state;
    
    // Email validation helper
    const isValidEmail = (email: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };

    if (inputType === "we_do_it_for_you") {
      // Simplified validation for "We do it for you"
      if (!vacancyData.description?.trim()) {
        errors.description = "Vacaturetekst is verplicht";
      }
      // Application method
      if (vacancyData.show_apply_form) {
        if (!vacancyData.application_email?.trim()) {
          errors.application_email = "E-mailadres voor sollicitaties is verplicht";
        } else if (!isValidEmail(vacancyData.application_email)) {
          errors.application_email = "Voer een geldig e-mailadres in";
        }
      } else {
        if (!vacancyData.apply_url?.trim()) {
          errors.apply_url = "Sollicitatie URL is verplicht";
        }
      }
    } else {
      // Full validation for self-service
      if (!vacancyData.title?.trim()) {
        errors.title = "Vacaturetitel is verplicht";
      }
      if (!vacancyData.intro_txt?.trim()) {
        errors.intro_txt = "Introductietekst is verplicht";
      }
      if (!vacancyData.description?.trim()) {
        errors.description = "Vacaturetekst is verplicht";
      }
      if (!vacancyData.location?.trim()) {
        errors.location = "Plaats is verplicht";
      }
      if (!vacancyData.region_id) {
        errors.region_id = "Regio is verplicht";
      }
      if (!vacancyData.function_type_id) {
        errors.function_type_id = "Functietype is verplicht";
      }
      if (!vacancyData.field_id) {
        errors.field_id = "Vakgebied is verplicht";
      }
      if (!vacancyData.sector_id) {
        errors.sector_id = "Sector is verplicht";
      }
      // Contact email validation (optional field, but must be valid if filled)
      if (vacancyData.contact_email?.trim() && !isValidEmail(vacancyData.contact_email)) {
        errors.contact_email = "Voer een geldig e-mailadres in";
      }
      // Application method
      if (vacancyData.show_apply_form) {
        if (!vacancyData.application_email?.trim()) {
          errors.application_email = "E-mailadres voor sollicitaties is verplicht";
        } else if (!isValidEmail(vacancyData.application_email)) {
          errors.application_email = "Voer een geldig e-mailadres in";
        }
      } else {
        if (!vacancyData.apply_url?.trim()) {
          errors.apply_url = "Sollicitatie URL is verplicht";
        }
      }
    }

    return { valid: Object.keys(errors).length === 0, errors };
  }, [state]);

  // Auto-save function (defined before handleNext since it depends on it)
  const saveVacancy = useCallback(async () => {
    if (!state.vacancyId || !state.isDirty) return;

    const currentData = JSON.stringify(state.vacancyData);
    if (currentData === lastSavedData) {
      // No actual changes, but isDirty was true - reset it
      setState((prev) => ({ ...prev, isDirty: false }));
      return;
    }

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
        
        // Scroll to top of page
        window.scrollTo({ top: 0, behavior: "smooth" });
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
      // Clean up empty colleague entries before leaving step 2
      cleanupEmptyRecommendations();
      
      const validation = validateVacancy();
      if (!validation.valid) {
        // Set validation errors for inline display
        setValidationErrors(validation.errors);
        const errorCount = Object.keys(validation.errors).length;
        toast.error("Vul de verplichte velden in", {
          description: `${errorCount} ${errorCount === 1 ? "veld is" : "velden zijn"} niet correct ingevuld`,
        });
        return;
      }
      
      // Clear any previous validation errors
      setValidationErrors({});
      
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
    
    // Scroll to top of page
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [state, validateVacancy, saveVacancy, cleanupEmptyRecommendations]);

  // Navigate to previous step
  const handlePrevious = useCallback(() => {
    // Clean up empty colleague entries when leaving step 2
    if (state.currentStep === 2) {
      cleanupEmptyRecommendations();
    }
    
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 1) as WizardStep,
    }));
    
    // Scroll to top of page
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [state.currentStep, cleanupEmptyRecommendations]);

  // Handle step click in indicator
  const handleStepClick = useCallback((step: WizardStep) => {
    const completedSteps = getCompletedSteps();
    
    // Can go to step if it's completed or is the next step after current
    if (completedSteps.includes(step) || step <= state.currentStep) {
      // Clean up empty colleague entries when leaving step 2
      if (state.currentStep === 2 && step !== 2) {
        cleanupEmptyRecommendations();
      }
      
      setState((prev) => ({ ...prev, currentStep: step }));
      
      // Scroll to top of page
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [state.currentStep, getCompletedSteps, cleanupEmptyRecommendations]);

  // Handle credits purchase success
  const handleCreditsSuccess = useCallback(async (_newBalance: number, _purchasedAmount?: number) => {
    // Refetch credits from context to sync across all components
    await refetchCredits();
    setShowCheckoutModal(false);
    toast.success("Credits toegevoegd aan je account");
  }, [refetchCredits]);

  // Handle vacancy data changes with auto-save
  const handleVacancyChange = useCallback((updates: Partial<VacancyRecord>) => {
    setState((prev) => ({
      ...prev,
      vacancyData: { ...prev.vacancyData, ...updates },
      isDirty: true,
    }));
    // Clear validation errors for updated fields
    const updatedFields = Object.keys(updates);
    setValidationErrors((prev) => {
      const newErrors = { ...prev };
      updatedFields.forEach((field) => {
        delete newErrors[field];
      });
      return newErrors;
    });
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
    // Scroll to top of page
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [state.vacancyId, weDoItForYouProduct]);

  // Handle switching back to self-service
  const handleSwitchToSelfService = useCallback(() => {
    setState((prev) => {
      // Remove weDoItForYou product from selected upsells
      const newUpsells = weDoItForYouProduct
        ? prev.selectedUpsells.filter((u) => u.id !== weDoItForYouProduct.id)
        : prev.selectedUpsells;

      return {
        ...prev,
        inputType: "self_service",
        selectedUpsells: newUpsells,
        isDirty: true,
      };
    });
    // Update vacancy in database
    if (state.vacancyId) {
      fetch(`/api/vacancies/${state.vacancyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input_type: "self_service" }),
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

  // Handle invoice details change from SubmitStep
  const handleInvoiceDetailsChange = useCallback((details: InvoiceDetails | null) => {
    setInvoiceDetails(details);
    // Reset error state when user provides valid invoice details
    if (details !== null) {
      setShowInvoiceError(false);
    }
  }, []);

  // Handle back button with unsaved changes check
  const handleBack = useCallback(() => {
    if (state.isDirty) {
      setShowLeaveDialog(true);
    } else {
      router.push("/dashboard");
    }
  }, [state.isDirty, router]);

  // Handle leave confirmation
  const handleLeaveConfirm = useCallback(async (shouldSave: boolean) => {
    if (shouldSave && state.vacancyId) {
      await saveVacancy();
    }
    setShowLeaveDialog(false);
    router.push("/dashboard");
  }, [state.vacancyId, saveVacancy, router]);

  // Handle vacancy submission
  const handleSubmit = useCallback(async () => {
    // Block submission if profile is not complete
    if (!profileComplete) {
      toast.error("Werkgeversprofiel niet compleet", {
        description: "Vul eerst je werkgeversprofiel aan voordat je een vacature kunt insturen.",
      });
      return;
    }

    if (!state.vacancyId || !state.selectedPackage) {
      toast.error("Geen vacature of pakket geselecteerd");
      return;
    }

    // Calculate if we need invoice details
    const packageCredits = state.selectedPackage?.credits || 0;
    const upsellCredits = state.selectedUpsells.reduce((sum, u) => sum + u.credits, 0);
    const totalCredits = packageCredits + upsellCredits;
    const hasEnoughCredits = availableCredits >= totalCredits;

    // If not enough credits, invoice details are required
    if (!hasEnoughCredits && !invoiceDetails) {
      setShowInvoiceError(true);
      toast.error("Factuurgegevens vereist", {
        description: "Vul de verplichte factuurgegevens in om door te gaan.",
      });
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

      // Then submit the vacancy with invoice details if needed
      const res = await fetch(`/api/vacancies/${state.vacancyId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_details: !hasEnoughCredits ? invoiceDetails : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit vacancy");
      }

      const data = await res.json();
      
      // Mark as submitted IMMEDIATELY to prevent URL sync effect from overriding navigation
      isSubmittedRef.current = true;
      
      // Reset dirty state so beforeunload doesn't block navigation
      setState((prev) => ({ ...prev, isDirty: false }));
      
      // Show success message
      toast.success("Vacature ingediend", {
        description: data.credits_invoiced > 0 
          ? "Je vacature wordt beoordeeld. Je ontvangt de factuur per e-mail na goedkeuring."
          : "Je vacature wordt beoordeeld door ons team.",
      });

      // Use window.location for a full page navigation to guarantee redirect works
      // This prevents any React effects or router.replace calls from interfering
      // Credits will be fresh on the new page load anyway
      window.location.href = "/dashboard/vacatures";
    } catch (error) {
      console.error("Error submitting vacancy:", error);
      toast.error("Er ging iets mis bij het indienen", {
        description: error instanceof Error ? error.message : "Probeer het opnieuw",
      });
    } finally {
      setIsSaving(false);
    }
  }, [state.vacancyId, state.selectedPackage, state.selectedUpsells, availableCredits, invoiceDetails, profileComplete]);

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
          <>
            {/* Profile incomplete warning */}
            {!profileComplete && (
              <Alert className="bg-[#F86600]/10 border-none mb-4 p-6">
                <AlertDescription className="text-[#1F2D58]">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-[#F86600]" />
                    </div>
                    <div className="flex-1">
                      <strong className="block mb-1">Werkgeversprofiel niet compleet</strong>
                      <p className="text-sm mb-3">
                        Om een vacature aan te maken heb je een compleet werkgeversprofiel nodig. Vul deze eerst aan.
                      </p>
                      <Link href={`/dashboard/werkgeversprofiel?returnTo=${encodeURIComponent(pathname + (state.vacancyId ? `?id=${state.vacancyId}` : ''))}`}>
                        <Button>
                          Werkgeversprofiel invullen
                        </Button>
                      </Link>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            <PackageSelector
              packages={packages}
              selectedPackage={state.selectedPackage}
              onSelectPackage={handleSelectPackage}
              availableCredits={availableCredits}
              onBuyCredits={() => setShowCheckoutModal(true)}
            />
          </>
        );
      case 2:
        return (
          <div className="space-y-4">
            <div className="bg-white/50 rounded-[0.75rem] pt-4 px-6 pb-6 mt-6 relative">
              {state.inputType === "we_do_it_for_you" && (
                <Badge variant="info" className="absolute top-3 right-4">We do it for you</Badge>
              )}
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
                validationErrors={validationErrors}
                onContactPhotoChange={setContactPhotoUrl}
                onHeaderImageChange={setHeaderImageUrl}
                onLogoChange={setLogoUrl}
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
            contactPhotoUrl={contactPhotoUrl || undefined}
            headerImageUrl={headerImageUrl || undefined}
            logoUrl={logoUrl || undefined}
          />
        ) : (
          <div className="bg-white rounded-t-[0.75rem] rounded-b-[2rem] p-6">
            <Spinner className="w-6 h-6 text-[#1F2D58]" />
          </div>
        );
      case 4:
        // Filter out upsells that are already included in the selected package
        const filteredUpsells = upsells.filter(
          (upsell) => !state.selectedPackage?.included_upsells?.includes(upsell.id)
        );
        return state.selectedPackage ? (
          <SubmitStep
            selectedPackage={state.selectedPackage}
            selectedUpsells={state.selectedUpsells}
            availableUpsells={filteredUpsells}
            availableCredits={availableCredits}
            onToggleUpsell={handleToggleUpsell}
            onBuyCredits={() => setShowCheckoutModal(true)}
            onInvoiceDetailsChange={handleInvoiceDetailsChange}
            onChangePackage={() => handleStepClick(1)}
            showInvoiceError={showInvoiceError}
            profileComplete={profileComplete}
            profileEditUrl={`/dashboard/werkgeversprofiel?returnTo=${encodeURIComponent(pathname + (state.vacancyId ? `?id=${state.vacancyId}&step=4` : ''))}`}
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
    <>
      {/* Top header bar - full width */}
      <div className="bg-[#E8EEF2] border-b border-[#193DAB]/[0.12]">
        {/* Main row with full-height vertical borders */}
        <div className="flex items-stretch h-[80px]">
          {/* Left: Logo with right border */}
          <div className="flex items-center border-r border-[#193DAB]/[0.12] pl-4 sm:pl-8 pr-4 sm:pr-8 py-4 sm:py-6">
            <img 
              src="/logo.svg" 
              alt="Colourful jobs" 
              className="h-6 w-auto"
            />
          </div>

          {/* Center: Step indicator - only visible on larger screens */}
          <div className="hidden md:flex flex-1 items-center justify-center py-4 sm:py-6 relative">
            <div className="w-full">
              <StepIndicator
                currentStep={state.currentStep}
                completedSteps={getCompletedSteps()}
                onStepClick={handleStepClick}
              />
            </div>
            {/* Progress bar at bottom, edge-to-edge */}
            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-transparent">
              <div
                className="h-full bg-[#193DAB]/[0.12] transition-all duration-300"
                style={{ width: `${(state.currentStep / 4) * 100}%` }}
              />
            </div>
          </div>

          {/* Spacer on mobile when step indicator is hidden */}
          <div className="flex-1 md:hidden" />

          {/* Right: Close + save status with left border */}
          <div className="flex flex-col items-end justify-center border-l border-[#193DAB]/[0.12] pl-4 sm:pl-8 pr-4 sm:pr-8 py-4 sm:py-6">
            <Button
              variant="link"
              onClick={handleBack}
              showArrow={false}
              className="whitespace-nowrap"
            >
              Sluiten
            </Button>
            {state.currentStep >= 2 && (
              <div>
                {isSaving ? (
                  <div className="flex items-center gap-1.5 text-xs text-[#1F2D58]/60 mt-0.5">
                    <Spinner className="h-3 w-3" />
                    <span>Opslaan...</span>
                  </div>
                ) : state.isDirty ? (
                  <span className="text-xs text-red-500 mt-0.5">Niet opgeslagen</span>
                ) : (
                  <span className="text-xs text-green-600 mt-0.5">Opgeslagen</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile: Step indicator below logo row */}
        <div className="md:hidden relative">
          <div className="px-4 sm:px-8 pb-3">
            <StepIndicator
              currentStep={state.currentStep}
              completedSteps={getCompletedSteps()}
              onStepClick={handleStepClick}
            />
          </div>
          {/* Progress bar at bottom, edge-to-edge */}
          <div className="h-[3px] bg-transparent">
            <div
              className="h-full bg-[#193DAB]/[0.12] transition-all duration-300"
              style={{ width: `${(state.currentStep / 4) * 100}%` }}
            />
          </div>
        </div>
      </div>

    {/* Main content with max-width container */}
    <div className="max-w-[62.5rem] mx-auto px-4 sm:px-6 mt-6 space-y-6">

      {/* Main content with sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content area - full width on steps 1-3, 2/3 width on step 2 with sidebar or step 4 */}
        <div className={state.currentStep === 4 || (state.currentStep === 2 && (hasSocialPostFeature || weDoItForYouProduct)) ? "lg:col-span-2" : "lg:col-span-3"}>
          {renderStepContent()}
        </div>

        {/* Step 2 sidebar: Colleagues + We Do It For You */}
        {state.currentStep === 2 && (hasSocialPostFeature || weDoItForYouProduct) && (
          <div className={`lg:col-span-1 order-first lg:order-none space-y-4 ${hasSocialPostFeature ? "mt-6" : ""}`}>
            {hasSocialPostFeature && (
              <ColleaguesSidebar
                recommendations={recommendations}
                onChange={handleRecommendationsChange}
                packageName={state.selectedPackage?.display_name}
              />
            )}
            {state.inputType === "self_service" && weDoItForYouProduct && (
              <WeDoItForYouBanner
                product={weDoItForYouProduct}
                onSelect={handleWeDoItForYou}
              />
            )}
            {state.inputType === "we_do_it_for_you" && weDoItForYouProduct && (
              <div className="border border-[#193DAB]/[0.12] rounded-t-[0.75rem] rounded-b-[2rem] p-5 mt-6">
                <div className="flex items-center gap-3 pb-3 mb-3 border-b border-[#193DAB]/[0.12]">
                  <div className="w-10 h-10 rounded-full bg-[#193DAB]/[0.12] flex items-center justify-center flex-shrink-0">
                    <Rocket className="w-5 h-5 text-[#1F2D58]" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-[#1F2D58]">{weDoItForYouProduct.display_name}</h4>
                    <p className="text-xs text-[#1F2D58]/60">+{weDoItForYouProduct.credits} credits (€{weDoItForYouProduct.price.toFixed(2).replace(".", ",")})</p>
                  </div>
                </div>
                <Button variant="link" className="px-0" showArrow={false} onClick={handleSwitchToSelfService}>
                  Toch liever zelf opstellen?
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Cost sidebar - only show in step 4 */}
        {state.currentStep === 4 && (
          <div className="lg:col-span-1 space-y-4">
            <CostSidebar
              selectedPackage={state.selectedPackage}
              selectedUpsells={state.selectedUpsells}
              availableCredits={availableCredits}
              showPackageInfo={false}
              onChangePackage={() => handleStepClick(1)}
              onBuyCredits={() => setShowCheckoutModal(true)}
            />
          </div>
        )}
      </div>

      {/* Spacer for sticky navigation bar */}
      <div className="h-20" />

      {/* Sticky navigation bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#E8EEF2] border-t border-[#193DAB]/[0.12]">
        <div className="max-w-[62.5rem] mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
              <div className="flex-shrink-0">
                {state.currentStep > 1 && (
                  <Button
                    variant="tertiary"
                    onClick={handlePrevious}
                    disabled={isSaving}
                    showArrow={false}
                  >
                    {state.currentStep === 4 ? "Vacature bekijken" : state.currentStep === 3 ? "Vacature aanpassen" : "Pakket wijzigen"}
                  </Button>
                )}
              </div>

              {/* Center: Package, cost & credit info */}
              {state.selectedPackage && state.currentStep < 4 && (
                <div className="hidden sm:flex flex-col items-center text-sm text-[#1F2D58]">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span>Gekozen pakket: {state.selectedPackage.display_name}</span>
                    <span className="text-[#1F2D58]/30 font-normal">|</span>
                    <span>
                      {(() => {
                        const pkgCredits = state.selectedPackage?.credits || 0;
                        const upsellCreds = state.selectedUpsells.reduce((sum, u) => sum + u.credits, 0);
                        return pkgCredits + upsellCreds;
                      })()} credits
                    </span>
                    <span className="text-[#1F2D58]/30 font-normal">|</span>
                    <span>
                      €{(() => {
                        const pkgPrice = state.selectedPackage?.price || 0;
                        const upsellsPrice = state.selectedUpsells.reduce((sum, u) => sum + u.price, 0);
                        const total = pkgPrice + upsellsPrice;
                        return total % 1 === 0 ? total.toLocaleString("nl-NL") : total.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      })()}
                    </span>
                  </div>
                  {state.inputType === "we_do_it_for_you" && weDoItForYouProduct && (
                    <span className="text-[#1F2D58]/60 text-xs">
                      We do it for you (+{weDoItForYouProduct.credits} credits / €{weDoItForYouProduct.price.toFixed(2).replace(".", ",")})
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3 flex-shrink-0">
                {state.currentStep < 4 ? (
                  <Button
                    onClick={handleNext}
                    disabled={isSaving || (state.currentStep === 1 && !state.selectedPackage)}
                    showArrow={!(isSaving && state.currentStep !== 2)}
                  >
                    {isSaving && state.currentStep !== 2 ? (
                      <>
                        <Spinner className="w-4 h-4 mr-2" />
                        Laden...
                      </>
                    ) : (
                      `Verder naar ${state.currentStep === 1 ? "opstellen" : state.currentStep === 2 ? "voorbeeld" : "plaatsen"}`
                    )}
                  </Button>
                ) : (
                  (() => {
                    const packageCredits = state.selectedPackage?.credits || 0;
                    const upsellCredits = state.selectedUpsells.reduce((sum, u) => sum + u.credits, 0);
                    const totalCredits = packageCredits + upsellCredits;
                    const shortage = Math.max(0, totalCredits - availableCredits);
                    const hasEnoughCredits = shortage === 0;
                    const packagePrice = state.selectedPackage?.price || 0;
                    const upsellsPrice = state.selectedUpsells.reduce((sum, u) => sum + u.price, 0);
                    const totalPrice = packagePrice + upsellsPrice;
                    const shortagePrice = totalCredits > 0 
                      ? Math.round((shortage / totalCredits) * totalPrice)
                      : 0;
                    
                    // Credits that will be deducted from balance
                    const creditsFromBalance = Math.min(availableCredits, totalCredits);
                    
                    return (
                      <Button
                        onClick={handleSubmit}
                        disabled={isSaving || !profileComplete}
                        showArrow={!isSaving}
                      >
                        {isSaving ? (
                          <>
                            <Spinner className="w-4 h-4 mr-2" />
                            Bezig met indienen...
                          </>
                        ) : hasEnoughCredits ? (
                          `Vacature insturen (${totalCredits} credits)`
                        ) : (
                          `Vacature insturen (${creditsFromBalance} credits + €${shortagePrice})`
                        )}
                      </Button>
                    );
                  })()
                )}
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
    </>
  );
}
