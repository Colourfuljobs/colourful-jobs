"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { KVKSearchResult, KVKDetails } from "@/lib/kvk";
import { 
  companyDataSchema, 
  billingDataSchema,
  type OnboardingFormData 
} from "@/lib/validation";
import { toast } from "sonner";
import { normalizeUrl } from "@/lib/utils";

// Import new components
import {
  Step1Personal,
  Step2Company,
  JoinEmployerFlow,
  type Step,
  type ContactData,
  type EmployerInfo,
  type KvkCheckResult,
} from "@/components/onboarding";

const ONBOARDING_STORAGE_KEY = "colourful_onboarding_state";

export default function OnboardingPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  
  // Step management
  const [step, setStep] = useState<Step>(1);
  const [step1Complete, setStep1Complete] = useState(false);
  const [step2Complete, setStep2Complete] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  
  // Step 1 state
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [restartDialogOpen, setRestartDialogOpen] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [contact, setContact] = useState<ContactData>({
    firstName: "",
    lastName: "",
    email: "",
    role: "",
  });

  // Step 2 state
  const [showKVKSearch, setShowKVKSearch] = useState(true);
  const [kvkSelected, setKvkSelected] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateEmployer, setDuplicateEmployer] = useState<EmployerInfo | null>(null);
  const [kvkCheckResult, setKvkCheckResult] = useState<KvkCheckResult | null>(null);
  const [checkingKvk, setCheckingKvk] = useState(false);
  
  // Join existing employer flow state
  const [joinMode, setJoinMode] = useState(false);
  const [joinEmployer, setJoinEmployer] = useState<EmployerInfo | null>(null);
  const [joinEmail, setJoinEmail] = useState("");
  const [joinDomainError, setJoinDomainError] = useState<string | null>(null);
  const [joinStep, setJoinStep] = useState<"confirm" | "verification">("confirm");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinContact, setJoinContact] = useState({ firstName: "", lastName: "", role: "" });
  const [joinResending, setJoinResending] = useState(false);
  const [joinCompleting, setJoinCompleting] = useState(false);
  const [isJoinCallback, setIsJoinCallback] = useState(false);
  
  // Session switch detection state
  const [sessionSwitchedDialogOpen, setSessionSwitchedDialogOpen] = useState(false);
  const [originalEmail, setOriginalEmail] = useState<string | null>(null);
  
  // Form state
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [initialRedirectDone, setInitialRedirectDone] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  const {
    register: registerOriginal,
    setValue,
    watch,
    getValues,
  } = useForm<OnboardingFormData>({
    defaultValues: {
      first_name: "",
      last_name: "",
      email: session?.user?.email || "",
      company_name: "",
      kvk: "",
      phone: "",
      website_url: "",
      "reference-nr": "",
      invoice_contact_name: "",
      invoice_email: "",
      invoice_street: "",
      "invoice_postal-code": "",
      invoice_city: "",
    },
  });

  // Custom register that clears error on change
  const register = (name: keyof OnboardingFormData) => {
    const registration = registerOriginal(name);
    return {
      ...registration,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        if (formErrors[name]) {
          setFormErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[name];
            return newErrors;
          });
        }
        registration.onChange(e);
      },
    };
  };

  // LocalStorage helpers
  const saveOnboardingState = useCallback((contactData: ContactData, emailSentState: boolean) => {
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({
        contact: contactData,
        emailSent: emailSentState,
        timestamp: Date.now(),
      }));
    } catch (e) {
      console.error("Error saving onboarding state:", e);
    }
  }, []);

  const clearOnboardingState = useCallback(() => {
    try {
      localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    } catch (e) {
      console.error("Error clearing onboarding state:", e);
    }
  }, []);

  // Set page title
  useEffect(() => {
    document.title = "Account aanmaken | Colourful jobs";
  }, []);

  // Early detection of join callback
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const hasJoinParam = urlParams.get("join") === "true";
      const hasStoredEmployer = !!localStorage.getItem("colourful_join_employer_id");
      if (hasJoinParam && hasStoredEmployer) {
        setIsJoinCallback(true);
      }
    }
  }, []);

  // Restore onboarding state from localStorage
  useEffect(() => {
    if (status === "unauthenticated") {
      try {
        const saved = localStorage.getItem(ONBOARDING_STORAGE_KEY);
        if (saved) {
          const { contact: savedContact, emailSent: savedEmailSent, timestamp } = JSON.parse(saved);
          const twentyFourHours = 24 * 60 * 60 * 1000;
          if (Date.now() - timestamp < twentyFourHours) {
            setContact(savedContact);
            setEmailSent(savedEmailSent);
            // Store the original email for session switch detection
            if (savedContact.email) {
              setOriginalEmail(savedContact.email);
            }
          } else {
            clearOnboardingState();
          }
        }
      } catch (e) {
        console.error("Error restoring onboarding state:", e);
      }
    }
  }, [status, clearOnboardingState]);
  
  // Detect session switch: when user is authenticated with a different email than they started with
  useEffect(() => {
    if (status === "authenticated" && session?.user?.email && originalEmail) {
      const sessionEmail = session.user.email.toLowerCase();
      const startedEmail = originalEmail.toLowerCase();
      
      // If emails don't match, user has switched accounts
      if (sessionEmail !== startedEmail) {
        setSessionSwitchedDialogOpen(true);
      }
    }
  }, [status, session, originalEmail]);

  // Handle authentication and join flow completion
  useEffect(() => {
    if (status === "authenticated" && session) {
      // If user is already active, redirect to dashboard
      // They shouldn't be on the onboarding page
      // Skip if we just activated in this session (to avoid duplicate toast)
      if (session.user?.status === "active" && !isActivating) {
        toast.success("Je account is al aangemaakt!", {
          description: "Je wordt doorgestuurd naar het dashboard.",
        });
        router.push("/dashboard");
        return;
      }
      
      setEmailVerified(true);
      setStep1Complete(true);
      clearOnboardingState();

      // Check if this is a join flow completion
      const storedEmployerId = localStorage.getItem("colourful_join_employer_id");
      const urlParams = new URLSearchParams(window.location.search);
      const isJoinCallbackUrl = urlParams.get("join") === "true";
      
      if (isJoinCallbackUrl && storedEmployerId && session.user?.email) {
        setJoinCompleting(true);
        localStorage.removeItem("colourful_join_pending_verification");
        
        const completeJoin = async () => {
          try {
            const response = await fetch("/api/onboarding/join", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ employer_id: storedEmployerId }),
            });
            
            if (response.ok) {
              localStorage.removeItem("colourful_join_employer_id");
              await update();
              toast.success("Welkom bij Colourful jobs!", {
                description: "Je bent succesvol toegevoegd aan het werkgeversaccount.",
              });
              router.push("/dashboard");
            } else {
              const errorData = await response.json();
              toast.error("Fout bij voltooien", {
                description: errorData.error || "Er ging iets mis. Probeer het later opnieuw.",
              });
              setIsJoinCallback(false);
              setJoinCompleting(false);
            }
          } catch (error) {
            console.error("Error completing join flow:", error);
            toast.error("Fout bij voltooien", {
              description: "Er ging iets mis. Probeer het later opnieuw.",
            });
            setIsJoinCallback(false);
            setJoinCompleting(false);
          }
        };
        completeJoin();
        return;
      }

      // Redirect to step 2 on initial load
      if (step === 1 && !emailSent && !initialRedirectDone) {
        setStep(2);
        setInitialRedirectDone(true);
      }

      // Set email in form
      if (session.user?.email) {
        setValue("email", session.user.email, { shouldValidate: false });
        setContact(c => ({ ...c, email: session.user?.email || "" }));
      }

      // Fetch user data
      const fetchUserData = async () => {
        try {
          const response = await fetch("/api/onboarding?user=true");
          if (response.ok) {
            const userData = await response.json();
            if (userData.first_name) {
              setValue("first_name", userData.first_name, { shouldValidate: false });
              setContact(c => ({ ...c, firstName: userData.first_name }));
            }
            if (userData.last_name) {
              setValue("last_name", userData.last_name, { shouldValidate: false });
              setContact(c => ({ ...c, lastName: userData.last_name }));
            }
            if (userData.role) {
              setContact(c => ({ ...c, role: userData.role }));
            }
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      };
      fetchUserData();
    } else if (status === "unauthenticated" && emailSent) {
      setStep(1);
    }
  }, [status, session, emailSent, step, setValue, clearOnboardingState, initialRedirectDone, router, update, isActivating]);

  // Handle step navigation click (used for going back from step 2 to step 1)
  const handleStepClick = useCallback((targetStep: Step) => {
    if (targetStep === 1) {
      setStep(1);
      return;
    }
    if (targetStep === 2) {
      if (step1Complete) {
        setStep(2);
      } else {
        toast.error("Stap 1 nog niet voltooid", {
          description: "Verifieer eerst je e-mailadres om verder te gaan.",
        });
      }
    }
  }, [step1Complete]);

  // Step 1 handlers
  const handleSubmitStep1 = async () => {
    if (!contact.email || !contact.firstName || !contact.lastName) return;
    setEmailError(null);
    setLoading(true);
    
    try {
      // First check if email already exists and is active
      // This prevents showing "check your email" only to revert it later
      const checkResponse = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: contact.email }),
      });
      
      // Handle rate limiting from check-email
      if (checkResponse.status === 429) {
        const data = await checkResponse.json();
        toast.error("Te veel pogingen", {
          description: data.error || "Probeer het over een minuut opnieuw.",
        });
        setLoading(false);
        return;
      }
      
      // If status 200 = email exists AND is active → show error immediately
      if (checkResponse.ok) {
        setEmailError("Er bestaat al een account met dit e-mailadres. Log in om verder te gaan.");
        toast.error("E-mailadres al in gebruik", {
          description: "Er bestaat al een account met dit e-mailadres. Log in om verder te gaan.",
        });
        setLoading(false);
        return;
      }
      
      // Status 404 = email doesn't exist → proceed
      // Status 403 = email exists but pending_onboarding → also OK (is a resend)
      
      // Now show optimistic UI
      setEmailSent(true);
      saveOnboardingState(contact, true);
      setLoading(false);
      
      // Run user creation and email sending in background
      (async () => {
        try {
          const response = await fetch("/api/onboarding", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: contact.email,
              first_name: contact.firstName,
              last_name: contact.lastName,
              role: contact.role,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            
            if (data.resend) {
              toast.success("Verificatie e-mail opnieuw verstuurd", {
                description: "Check je inbox voor de nieuwe verificatielink.",
              });
            }
            
            // Send magic link in background (don't await)
            signIn("email", {
              email: contact.email,
              redirect: false,
              callbackUrl: "/onboarding",
            }).catch((signInError) => {
              console.error("Error sending magic link:", signInError);
              toast.error("Fout bij versturen", {
                description: "De verificatie e-mail kon niet worden verstuurd. Klik op 'opnieuw versturen'.",
              });
            });
          } else {
            // Error: revert optimistic UI
            const data = await response.json();
            setEmailSent(false);
            clearOnboardingState();
            
            if (response.status === 429) {
              toast.error("Te veel aanmeldpogingen", {
                description: data.error || "Probeer het over een uur opnieuw.",
              });
            } else if (response.status === 409) {
              setEmailError("Er bestaat al een account met dit e-mailadres. Log in om verder te gaan.");
              toast.error("E-mailadres al in gebruik", {
                description: "Er bestaat al een account met dit e-mailadres. Log in om verder te gaan.",
              });
            } else {
              toast.error("Fout bij aanmelden", {
                description: data.error || "Er ging iets mis. Probeer het later opnieuw.",
              });
            }
          }
        } catch (error) {
          // Error: revert optimistic UI
          console.error("Error submitting step 1:", error);
          setEmailSent(false);
          clearOnboardingState();
          toast.error("Fout bij aanmelden", {
            description: "Er ging iets mis. Probeer het later opnieuw.",
          });
        }
      })();
    } catch (error) {
      console.error("Error checking email:", error);
      setLoading(false);
      toast.error("Fout bij controleren", {
        description: "Er ging iets mis. Probeer het later opnieuw.",
      });
    }
  };

  const handleResendEmail = async () => {
    if (!contact.email) return;
    setIsResending(true);
    try {
      await signIn("email", {
        email: contact.email,
        redirect: false,
        callbackUrl: "/onboarding",
      });
      setEmailSent(true);
      saveOnboardingState(contact, true);
      toast.success("E-mail opnieuw verstuurd", {
        description: "Check je inbox opnieuw.",
      });
    } catch (error) {
      console.error("Error resending email:", error);
      toast.error("Fout bij versturen", {
        description: "Er ging iets mis. Probeer het later opnieuw.",
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleClearStep1State = () => {
    clearOnboardingState();
    setEmailSent(false);
    setContact({ firstName: "", lastName: "", email: "", role: "" });
  };

  const saveStep1Data = async (): Promise<boolean> => {
    setSaving(true);
    try {
      const response = await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: contact.firstName,
          last_name: contact.lastName,
          role: contact.role,
        }),
      });

      const data = await response.json();
      
      // If account is already complete (from another tab), redirect to dashboard
      if (data.alreadyComplete) {
        toast.success("Je account is al aangemaakt!", {
          description: "Je wordt doorgestuurd naar het dashboard.",
        });
        router.push("/dashboard");
        return true;
      }

      if (response.ok) {
        setStep1Complete(true);
        setStep(2);
        return true;
      } else {
        toast.error("Fout bij opslaan", {
          description: data.error || "Er ging iets mis bij het opslaan van je gegevens.",
        });
        return false;
      }
    } catch (error) {
      console.error("Error saving step 1:", error);
      toast.error("Fout bij opslaan", {
        description: "Er ging iets mis. Probeer het later opnieuw.",
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Restart onboarding
  const handleRestartOnboarding = async () => {
    setIsRestarting(true);
    try {
      const response = await fetch("/api/onboarding", { method: "DELETE" });
      if (response.ok) {
        await signOut({ redirect: false });
        clearOnboardingState();
        setContact({ firstName: "", lastName: "", email: "", role: "" });
        setEmailVerified(false);
        setStep1Complete(false);
        setStep2Complete(false);
        setEmailSent(false);
        setShowKVKSearch(true);
        setKvkSelected(false);
        setFormErrors({});
        setStep(1);
        setRestartDialogOpen(false);
        toast.success("Account verwijderd", {
          description: "Je kunt nu opnieuw beginnen met een nieuw e-mailadres.",
        });
        router.refresh();
      } else {
        toast.error("Fout bij verwijderen", {
          description: "Er ging iets mis. Probeer het later opnieuw.",
        });
      }
    } catch (error) {
      console.error("Error restarting onboarding:", error);
      toast.error("Fout bij verwijderen", {
        description: "Er ging iets mis. Probeer het later opnieuw.",
      });
    } finally {
      setIsRestarting(false);
    }
  };

  // Step 2 handlers
  const handleKVKSelect = async (result: KVKSearchResult) => {
    // First check if this KVK number already exists
    const checkResponse = await fetch(`/api/onboarding?kvk=${result.kvkNumber}`);
    if (checkResponse.ok) {
      const checkData = await checkResponse.json();
      if (checkData.exists) {
        setDuplicateEmployer(checkData.employer);
        setKvkCheckResult(checkData);
        setDuplicateDialogOpen(true);
        return;
      }
    }

    // Fetch detailed company info via API route
    try {
      const detailsResponse = await fetch(`/api/kvk/details?kvk=${result.kvkNumber}`);
      const detailsData = await detailsResponse.json();
      
      if (detailsResponse.ok && detailsData.details) {
        const details: KVKDetails = detailsData.details;
        setValue("kvk", details.kvkNumber, { shouldValidate: false });
        setValue("company_name", details.companyName, { shouldValidate: false });
        setValue("display_name", details.companyName, { shouldValidate: false });
        if (details.address) {
          setValue("invoice_street", details.address.street, { shouldValidate: false });
          setValue("invoice_postal-code", details.address.postalCode, { shouldValidate: false });
          setValue("invoice_city", details.address.city, { shouldValidate: false });
        }
        if (details.phone) setValue("phone", details.phone, { shouldValidate: false });
        if (details.website) setValue("website_url", details.website, { shouldValidate: false });
      } else {
        // Fallback: use data from search result if details API fails
        setValue("kvk", result.kvkNumber, { shouldValidate: false });
        setValue("company_name", result.name, { shouldValidate: false });
        setValue("display_name", result.name, { shouldValidate: false });
        if (result.address || result.city) {
          setValue("invoice_city", result.city, { shouldValidate: false });
          setValue("invoice_postal-code", result.postalCode, { shouldValidate: false });
        }
        console.warn("Could not fetch KVK details, using search result data");
      }
    } catch (error) {
      // Fallback: use data from search result if fetch fails
      console.error("Error fetching KVK details:", error);
      setValue("kvk", result.kvkNumber, { shouldValidate: false });
      setValue("company_name", result.name, { shouldValidate: false });
      setValue("display_name", result.name, { shouldValidate: false });
      if (result.address || result.city) {
        setValue("invoice_city", result.city, { shouldValidate: false });
        setValue("invoice_postal-code", result.postalCode, { shouldValidate: false });
      }
    }

    setKvkSelected(true);
    setKvkCheckResult(null);
    setShowKVKSearch(false);
  };

  const handleKvkManualChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    setValue("kvk", value, { shouldValidate: false });
    
    if (formErrors.kvk) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.kvk;
        return newErrors;
      });
    }
    
    if (value.length === 8) {
      setCheckingKvk(true);
      try {
        const response = await fetch(`/api/onboarding?kvk=${value}`);
        const data = await response.json();
        if (data.exists) {
          setDuplicateEmployer(data.employer);
          setKvkCheckResult(data);
        } else {
          setKvkCheckResult(null);
        }
      } catch (error) {
        console.error("Error checking KVK:", error);
      } finally {
        setCheckingKvk(false);
      }
    } else {
      setKvkCheckResult(null);
    }
  };

  const saveStep2Data = async (): Promise<boolean> => {
    const formData = getValues();
    
    if (formData.kvk && formData.kvk.length !== 8) {
      setFormErrors(prev => ({ ...prev, kvk: "KVK-nummer moet 8 cijfers bevatten" }));
      return false;
    }

    if (formData.kvk && !kvkSelected) {
      const checkResponse = await fetch(`/api/onboarding?kvk=${formData.kvk}`);
      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        if (checkData.exists) {
          setDuplicateEmployer(checkData.employer);
          setKvkCheckResult(checkData);
          setDuplicateDialogOpen(true);
          return false;
        }
      }
    }
    
    const companyResult = companyDataSchema.safeParse(formData);
    const billingResult = billingDataSchema.safeParse(formData);
    
    const newErrors: Record<string, string> = {};
    if (!companyResult.success) {
      companyResult.error.issues.forEach((err) => {
        const fieldName = err.path.map(String).join(".");
        if (!newErrors[fieldName]) newErrors[fieldName] = err.message;
      });
    }
    if (!billingResult.success) {
      billingResult.error.issues.forEach((err) => {
        const fieldName = err.path.map(String).join(".");
        if (!newErrors[fieldName]) newErrors[fieldName] = err.message;
      });
    }
    
    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors);
      const firstErrorField = Object.keys(newErrors)[0];
      setTimeout(() => {
        const element = document.querySelector(`[name="${firstErrorField}"], #${firstErrorField}`);
        if (element) element.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      return false;
    }
    
    setFormErrors({});
    setSaving(true);
    
    try {
      // Save company and billing data
      const companyResponse = await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: formData.company_name,
          kvk: formData.kvk,
          phone: formData.phone,
          website_url: normalizeUrl(formData.website_url),
          invoice_contact_name: formData.invoice_contact_name,
          invoice_email: formData.invoice_email,
          invoice_street: formData.invoice_street,
          "invoice_postal-code": formData["invoice_postal-code"],
          invoice_city: formData.invoice_city,
        }),
      });

      // Check response
      const companyData = await companyResponse.json();
      
      // If account is already complete (from another tab), redirect to dashboard
      if (companyData.alreadyComplete) {
        toast.success("Je account is al aangemaakt!", {
          description: "Je wordt doorgestuurd naar het dashboard.",
        });
        router.push("/dashboard");
        return true;
      }
      
      if (!companyResponse.ok) {
        const errorMessage = companyData.error || "Er ging iets mis bij het opslaan van je organisatiegegevens.";
        
        toast.error("Fout bij opslaan", {
          description: errorMessage,
          action: {
            label: "Probeer opnieuw",
            onClick: () => saveStep2Data(),
          },
        });
        return false;
      }

      // Activate user and employer accounts
      const activateResponse = await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: contact.firstName,
          last_name: contact.lastName,
          role: contact.role,
          status: "active",
        }),
      });

      const activateData = await activateResponse.json();
      
      // If account is already complete (from another tab), redirect to dashboard
      if (activateData.alreadyComplete) {
        toast.success("Je account is al aangemaakt!", {
          description: "Je wordt doorgestuurd naar het dashboard.",
        });
        router.push("/dashboard");
        return true;
      }
      
      if (activateResponse.ok) {
        setIsActivating(true);
        await update();
        toast.success("Welkom bij Colourful jobs!", {
          description: "Je werkgeversaccount is succesvol aangemaakt.",
        });
        router.push("/dashboard");
        return true;
      } else {
        const errorMessage = activateData.error || "Er ging iets mis bij het activeren van je account.";
        
        toast.error("Fout bij activeren", {
          description: errorMessage,
          action: {
            label: "Probeer opnieuw",
            onClick: () => saveStep2Data(),
          },
        });
        return false;
      }
    } catch (error) {
      console.error("Error saving step 2:", error);
      toast.error("Fout bij opslaan", {
        description: "Er ging iets mis. Controleer je internetverbinding en probeer het opnieuw.",
        action: {
          label: "Probeer opnieuw",
          onClick: () => saveStep2Data(),
        },
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Join flow handlers
  const startJoinFlow = (employer: EmployerInfo) => {
    setJoinMode(true);
    setJoinEmployer(employer);
    setJoinEmail(session?.user?.email || contact.email || "");
    setJoinDomainError(null);
    setJoinStep("confirm");
    setJoinContact({ 
      firstName: contact.firstName || "", 
      lastName: contact.lastName || "", 
      role: contact.role || "" 
    });
    setDuplicateDialogOpen(false);
  };

  const cancelJoinFlow = () => {
    setJoinMode(false);
    setJoinEmployer(null);
    setJoinEmail("");
    setJoinDomainError(null);
    setJoinStep("confirm");
    setKvkCheckResult(null);
    localStorage.removeItem("colourful_join_employer_id");
    localStorage.removeItem("colourful_join_pending_verification");
  };

  const handleJoinSubmit = async () => {
    if (!joinContact.firstName || !joinContact.lastName || !joinEmail || !joinEmployer) return;
    
    setJoinLoading(true);
    setJoinDomainError(null);
    
    try {
      const validateResponse = await fetch("/api/onboarding/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: joinEmail, employer_id: joinEmployer.id }),
      });
      
      const validateData = await validateResponse.json();
      
      if (!validateData.valid) {
        setJoinDomainError(validateData.error || "De domeinnaam van je e-mailadres komt niet overeen met dit werkgeversaccount.");
        setJoinLoading(false);
        return;
      }
      
      const verifiedEmail = session?.user?.email;
      const isSameEmail = joinEmail.toLowerCase() === verifiedEmail?.toLowerCase();
      
      if (isSameEmail) {
        await fetch("/api/onboarding", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            first_name: joinContact.firstName,
            last_name: joinContact.lastName,
            role: joinContact.role,
          }),
        });
        
        const joinResponse = await fetch("/api/onboarding/join", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ employer_id: joinEmployer.id }),
        });
        
        if (joinResponse.ok) {
          await update();
          toast.success("Welkom bij Colourful jobs!", {
            description: `Je bent succesvol toegevoegd aan ${joinEmployer.company_name || joinEmployer.display_name}.`,
          });
          router.push("/dashboard");
        } else {
          const errorData = await joinResponse.json();
          toast.error("Fout bij toevoegen", {
            description: errorData.error || "Er ging iets mis. Probeer het later opnieuw.",
          });
        }
      } else {
        // OPTIMISTIC UI: Show verification step immediately
        // User creation and email sending happen in background
        localStorage.setItem("colourful_join_employer_id", joinEmployer.id);
        localStorage.setItem("colourful_join_pending_verification", "true");
        setJoinStep("verification");
        setJoinLoading(false);
        
        // Capture values for async closure
        const emailToUse = joinEmail;
        const employerId = joinEmployer.id;
        const contactData = { ...joinContact };
        
        // Run user creation and email sending in background
        (async () => {
          try {
            const createResponse = await fetch("/api/onboarding", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: emailToUse,
                first_name: contactData.firstName,
                last_name: contactData.lastName,
                role: contactData.role,
                joinMode: true,
                target_employer_id: employerId,
              }),
            });
            
            if (!createResponse.ok) {
              // Error: revert optimistic UI
              const errorData = await createResponse.json();
              localStorage.removeItem("colourful_join_employer_id");
              localStorage.removeItem("colourful_join_pending_verification");
              setJoinStep("confirm");
              
              if (createResponse.status === 409) {
                toast.error("E-mailadres al in gebruik", {
                  description: "Er bestaat al een account met dit e-mailadres. Log in om verder te gaan.",
                });
              } else {
                toast.error("Fout bij aanmelden", {
                  description: errorData.error || "Er ging iets mis. Probeer het later opnieuw.",
                });
              }
              return;
            }
            
            // Send magic link in background (don't await)
            signIn("email", {
              email: emailToUse,
              redirect: false,
              callbackUrl: "/onboarding?join=true",
            }).catch((signInError) => {
              console.error("Error sending magic link:", signInError);
              toast.error("Fout bij versturen", {
                description: "De verificatie e-mail kon niet worden verstuurd. Klik op 'opnieuw versturen'.",
              });
            });
          } catch (error) {
            // Error: revert optimistic UI
            console.error("Error in join flow:", error);
            localStorage.removeItem("colourful_join_employer_id");
            localStorage.removeItem("colourful_join_pending_verification");
            setJoinStep("confirm");
            toast.error("Fout bij aanmelden", {
              description: "Er ging iets mis. Probeer het later opnieuw.",
            });
          }
        })();
      }
    } catch (error) {
      console.error("Error in join flow:", error);
      toast.error("Fout bij toevoegen", {
        description: "Er ging iets mis. Probeer het later opnieuw.",
      });
      setJoinLoading(false);
    }
  };

  const handleJoinResendEmail = async () => {
    if (!joinEmail) return;
    setJoinResending(true);
    try {
      await signIn("email", {
        email: joinEmail,
        redirect: false,
        callbackUrl: "/onboarding?join=true",
      });
      toast.success("E-mail opnieuw verstuurd", {
        description: "Check je inbox opnieuw.",
      });
    } catch (error) {
      console.error("Error resending join email:", error);
      toast.error("Fout bij versturen", {
        description: "Er ging iets mis. Probeer het later opnieuw.",
      });
    } finally {
      setJoinResending(false);
    }
  };

  // Loading states
  if (isActivating) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-[600px]">
        <div className="flex justify-center mb-8">
          <Link href="https://www.colourfuljobs.nl/">
            <Image src="/logo.svg" alt="Colourful jobs" width={180} height={29} priority />
          </Link>
        </div>
        <Card className="p-6 sm:p-8 bg-white">
          <CardContent className="p-0 flex flex-col items-center justify-center py-12">
            <Spinner className="size-12 text-[#F86600] mb-4" />
            <p className="p-large text-[#1F2D58]">Je account wordt aangemaakt...</p>
            <p className="p-regular text-slate-500 mt-2">Even geduld, je wordt doorgestuurd naar het dashboard.</p>
          </CardContent>
        </Card>
        </div>
      </div>
    );
  }

  if (joinCompleting || isJoinCallback) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-[600px]">
        <div className="flex justify-center mb-8">
          <Link href="https://www.colourfuljobs.nl/">
            <Image src="/logo.svg" alt="Colourful jobs" width={180} height={29} priority />
          </Link>
        </div>
        <Card className="p-6 sm:p-8 bg-white">
          <CardContent className="p-0 flex flex-col items-center justify-center py-12">
            <Spinner className="size-12 text-[#F86600] mb-4" />
            <p className="p-large text-[#1F2D58]">Account wordt gekoppeld...</p>
            <p className="p-regular text-slate-500 mt-2">Even geduld, je wordt doorgestuurd naar het dashboard.</p>
          </CardContent>
        </Card>
        </div>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-[600px]">
          <div className="flex justify-center mb-8">
            <Link href="https://www.colourfuljobs.nl/">
              <Image src="/logo.svg" alt="Colourful jobs" width={180} height={29} priority />
            </Link>
          </div>
          <div className="flex justify-center">
            <Spinner className="size-12 text-[#1F2D58]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className={`w-full ${step === 1 && !joinMode ? 'max-w-[440px]' : 'max-w-[600px]'}`}>
      <div className="flex justify-center mb-8">
        <Link href="https://www.colourfuljobs.nl/">
          <Image src="/logo.svg" alt="Colourful jobs" width={180} height={29} priority />
        </Link>
      </div>
      <Card className="p-0 overflow-hidden">
        {/* Header - step 1: full intro, hidden during email verification waiting state */}
        {!joinMode && step === 1 && !(emailSent && !emailVerified) && (
          <div className="bg-white/50 px-6 sm:px-8 pt-6 sm:pt-8 pb-6 sm:pb-8">
            <CardTitle className="mb-3 contempora-small text-[1.75rem] sm:text-[2.5rem]">Bouw aan je werkgeversmerk</CardTitle>
            <p className="p-regular text-slate-600">
              Maak een account aan en bereik geschikte kandidaten die passen bij jouw organisatie.
            </p>
          </div>
        )}
        
        {/* Join mode header */}
        {joinMode && (
          <div className="bg-white/50 px-6 sm:px-8 pt-6 sm:pt-8 pb-6 sm:pb-8">
            <CardTitle>Toevoegen aan werkgeversaccount</CardTitle>
          </div>
        )}
        
        {/* Form content */}
        <CardContent className="p-6 sm:p-8 bg-white">
          {/* Step 1 */}
          {step === 1 && !joinMode && (
            <Step1Personal
              contact={contact}
              setContact={setContact}
              emailSent={emailSent}
              emailVerified={emailVerified}
              loading={loading}
              isResending={isResending}
              emailError={emailError}
              setEmailError={setEmailError}
              onSubmit={handleSubmitStep1}
              onResendEmail={handleResendEmail}
              onClearState={handleClearStep1State}
              onNextStep={saveStep1Data}
              onOpenRestartDialog={() => setRestartDialogOpen(true)}
              saving={saving}
            />
          )}

          {/* Step 2 */}
          {step === 2 && !joinMode && (
            <>
              <h2 className="text-base sm:text-lg font-semibold text-[#1F2D58] mb-4">Account aanmaken</h2>
              <div className="border-b border-[#1F2D58]/10 mb-6" />
              <Step2Company
              register={register}
              setValue={setValue}
              watch={watch}
              getValues={getValues}
              formErrors={formErrors}
              setFormErrors={setFormErrors}
              saving={saving}
              showKVKSearch={showKVKSearch}
              setShowKVKSearch={setShowKVKSearch}
              kvkSelected={kvkSelected}
              setKvkSelected={setKvkSelected}
              kvkCheckResult={kvkCheckResult}
              setKvkCheckResult={setKvkCheckResult}
              checkingKvk={checkingKvk}
              setCheckingKvk={setCheckingKvk}
              duplicateEmployer={duplicateEmployer}
              setDuplicateEmployer={setDuplicateEmployer}
              duplicateDialogOpen={duplicateDialogOpen}
              setDuplicateDialogOpen={setDuplicateDialogOpen}
              onPrevious={() => setStep(1)}
              onNext={saveStep2Data}
              onStartJoinFlow={startJoinFlow}
              onKVKSelect={handleKVKSelect}
              onKvkManualChange={handleKvkManualChange}
            />
            </>
          )}

          {/* Join Flow */}
          {joinMode && (
            <JoinEmployerFlow
              joinEmployer={joinEmployer}
              joinEmail={joinEmail}
              setJoinEmail={setJoinEmail}
              joinDomainError={joinDomainError}
              setJoinDomainError={setJoinDomainError}
              joinStep={joinStep}
              setJoinStep={setJoinStep}
              joinLoading={joinLoading}
              joinContact={joinContact}
              setJoinContact={setJoinContact}
              joinResending={joinResending}
              sessionEmail={session?.user?.email || null}
              onSubmit={handleJoinSubmit}
              onResendEmail={handleJoinResendEmail}
              onCancel={cancelJoinFlow}
            />
          )}
        </CardContent>
      </Card>

      {/* Login link - hidden during email verification, join verification, and step 2 form */}
      {!(joinMode && joinStep === "verification") && !(emailSent && !emailVerified) && !(step === 2 && !showKVKSearch) && (
        <div className="mt-4 text-center">
          <p className="text-sm text-[#1F2D58]">
            Heb je al een account?{" "}
            <button
              onClick={async () => {
                // Sign out first (if authenticated) to allow login with different account
                if (status === "authenticated") {
                  await signOut({ redirect: false });
                }
                router.push("/login");
              }}
              className="text-[#39ADE5] font-semibold hover:underline"
            >
              Log in
            </button>
          </p>
        </div>
      )}

      {/* Restart Dialog */}
      <Dialog open={restartDialogOpen} onOpenChange={setRestartDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Opnieuw beginnen?</DialogTitle>
            <DialogDescription>
              Let op: alle ingevulde gegevens gaan verloren en je moet opnieuw beginnen vanaf stap 1. Weet je het zeker?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={() => setRestartDialogOpen(false)}>
              Annuleren
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRestartOnboarding}
              disabled={isRestarting}
            >
              {isRestarting ? "Bezig..." : "Ja, opnieuw beginnen"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Session Switched Dialog */}
      <Dialog open={sessionSwitchedDialogOpen} onOpenChange={setSessionSwitchedDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Je bent ingelogd met een ander e-mailadres</DialogTitle>
            <DialogDescription className="space-y-3">
              <span className="block">
                Je was bezig met een account voor <strong className="text-[#1F2D58]">{originalEmail}</strong>, maar je bent nu ingelogd als <strong className="text-[#1F2D58]">{session?.user?.email}</strong>.
              </span>
              <span className="block text-sm">
                Dit kan gebeuren als je in een andere tab een nieuw account hebt aangemaakt.
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4">
            <Button 
              variant="secondary" 
              onClick={async () => {
                // Sign out and restart onboarding
                setSessionSwitchedDialogOpen(false);
                setOriginalEmail(null);
                clearOnboardingState();
                await signOut({ redirect: false });
                // Reset all state
                setStep(1);
                setStep1Complete(false);
                setStep2Complete(false);
                setEmailVerified(false);
                setEmailSent(false);
                setContact({ firstName: "", lastName: "", email: "", role: "" });
              }}
              showArrow={false}
            >
              Opnieuw beginnen
            </Button>
            <Button 
              onClick={() => {
                // Continue with current session
                setSessionSwitchedDialogOpen(false);
                setOriginalEmail(null);
                clearOnboardingState();
              }}
            >
              Doorgaan als {session?.user?.email}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
