"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { KVKSearch } from "@/components/KVKSearch";
import { ImageUpload } from "@/components/ImageUpload";
import { getKVKDetails, type KVKSearchResult } from "@/lib/kvk";
import { 
  personalDataSchema, 
  companyDataSchema, 
  billingDataSchema, 
  websiteDataSchema,
  type OnboardingFormData 
} from "@/lib/validation";
import { countries } from "@/lib/countries";
import { toast } from "sonner";

type Step = 1 | 2 | 3;

const stepLabels = [
  "Persoonlijke gegevens",
  "Bedrijfs- & Factuurgegevens",
  "Websitegegevens",
];

export default function OnboardingPage() {
  const { data: session, status } = useSession();
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

  const [contact, setContact] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "",
  });

  // Step 2 state
  const [showKVKSearch, setShowKVKSearch] = useState(true);
  const [kvkSelected, setKvkSelected] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateEmployer, setDuplicateEmployer] = useState<{ id: string; company_name?: string; display_name?: string } | null>(null);
  
  // Step 3 state (image uploads)
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [headerPreview, setHeaderPreview] = useState<string | null>(null);
  const [logoUploaded, setLogoUploaded] = useState(false);
  const [headerUploaded, setHeaderUploaded] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingHeader, setUploadingHeader] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [headerError, setHeaderError] = useState<string | null>(null);
  
  // Form state
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

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
      "invoice_house-nr": "",
      "invoice_house-nr-add": "",
      "invoice_postal-code": "",
      invoice_city: "",
      invoice_country: "Nederland",
      display_name: "",
      sector: "",
      location: "",
      short_description: "",
    },
  });

  // Custom register that clears error on change
  const register = (name: keyof OnboardingFormData) => {
    const registration = registerOriginal(name);
    return {
      ...registration,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        // Clear the error for this field when user types
        if (formErrors[name]) {
          setFormErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[name];
            return newErrors;
          });
        }
        // Call the original onChange
        registration.onChange(e);
      },
    };
  };

  // Track if initial redirect has happened
  const [initialRedirectDone, setInitialRedirectDone] = useState(false);

  // Check if user is logged in and set step accordingly
  useEffect(() => {
    if (status === "authenticated" && session) {
      // User is logged in = email is verified
      setEmailVerified(true);
      setStep1Complete(true);
      
      // Only redirect to step 2 on initial load, not when navigating back
      if (step === 1 && !emailSent && !initialRedirectDone) {
        setStep(2);
        setInitialRedirectDone(true);
      }
      
      // Set email in form if available
      if (session.user?.email) {
        setValue("email", session.user.email, { shouldValidate: false });
        setContact(c => ({ ...c, email: session.user?.email || "" }));
      }
      
      // Fetch user data from database to pre-fill form
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
      // Email sent but not logged in yet, stay on step 1 with email sent message
      setStep(1);
    }
  }, [status, session, emailSent, step, setValue]);

  // Handle step click navigation
  const handleStepClick = useCallback((targetStep: Step) => {
    // Can always go to step 1
    if (targetStep === 1) {
      setStep(1);
      return;
    }
    
    // Can only go to step 2 if step 1 is complete (email verified)
    if (targetStep === 2) {
      if (step1Complete) {
        setStep(2);
      } else {
        toast.error("Stap 1 nog niet voltooid", {
          description: "Verifieer eerst je e-mailadres om verder te gaan.",
        });
      }
      return;
    }
    
    // Can only go to step 3 if step 2 is complete
    if (targetStep === 3) {
      if (step2Complete) {
        setStep(3);
      } else {
        toast.error("Stap 2 nog niet voltooid", {
          description: "Vul eerst je bedrijfs- en factuurgegevens in.",
        });
      }
      return;
    }
  }, [step1Complete, step2Complete]);

  // Handle KVK selection
  const handleKVKSelect = async (result: KVKSearchResult) => {
    // Check for duplicate
    const checkResponse = await fetch(`/api/onboarding?kvk=${result.kvkNumber}`);
    if (checkResponse.ok) {
      const checkData = await checkResponse.json();
      if (checkData.exists) {
        setDuplicateEmployer(checkData.employer);
        setDuplicateDialogOpen(true);
        return;
      }
    }

    // Get full details and prefill form
    const details = await getKVKDetails(result.kvkNumber);
    if (details) {
      setValue("kvk", details.kvkNumber, { shouldValidate: false });
      setValue("company_name", details.companyName, { shouldValidate: false });
      setValue("display_name", details.companyName, { shouldValidate: false });
      if (details.address) {
        setValue("invoice_street", details.address.street, { shouldValidate: false });
        setValue("invoice_house-nr", details.address.houseNumber, { shouldValidate: false });
        setValue("invoice_house-nr-add", details.address.houseNumberAddition || "", { shouldValidate: false });
        setValue("invoice_postal-code", details.address.postalCode, { shouldValidate: false });
        setValue("invoice_city", details.address.city, { shouldValidate: false });
        setValue("invoice_country", details.address.country, { shouldValidate: false });
      }
      if (details.phone) setValue("phone", details.phone, { shouldValidate: false });
      if (details.website) setValue("website_url", details.website, { shouldValidate: false });
    }
    setKvkSelected(true);
    setShowKVKSearch(false);
  };

  // Handle skip KVK
  const handleSkipKVK = () => {
    setShowKVKSearch(false);
  };

  // Handle image upload
  const handleImageUpload = async (file: File, type: "logo" | "header") => {
    if (type === "logo") {
      setLogoError(null);
      setUploadingLogo(true);
    } else {
      setHeaderError(null);
      setUploadingHeader(true);
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);
    
    const companyData = watch();
    formData.append("companyData", JSON.stringify({
      display_name: companyData.display_name,
      company_name: companyData.company_name,
      sector: companyData.sector,
      location: companyData.location,
    }));

    try {
      const response = await fetch("/api/onboarding/upload", {
        method: "POST",
        body: formData,
      });

      const contentType = response.headers.get("content-type");
      let data: any;

      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error("Non-JSON response:", text);
        const errorMessage = response.status === 500 
          ? "Server error bij uploaden. Probeer het opnieuw."
          : `Fout bij uploaden: ${response.statusText || "Onbekende fout"}`;
        
        if (type === "logo") {
          setLogoError(errorMessage);
        } else {
          setHeaderError(errorMessage);
        }
        return;
      }

      if (!response.ok) {
        const errorMessage = data.error || "Fout bij uploaden van afbeelding";
        if (type === "logo") {
          setLogoError(errorMessage);
        } else {
          setHeaderError(errorMessage);
        }
        return;
      }

      if (type === "logo") {
        setLogoPreview(data.url);
        setLogoUploaded(true);
        setLogoError(null);
      } else {
        setHeaderPreview(data.url);
        setHeaderUploaded(true);
        setHeaderError(null);
      }
    } catch (error: any) {
      console.error("Error uploading image:", error);
      const errorMessage = error.message || "Fout bij uploaden van afbeelding";
      if (type === "logo") {
        setLogoError(errorMessage);
      } else {
        setHeaderError(errorMessage);
      }
    } finally {
      if (type === "logo") {
        setUploadingLogo(false);
      } else {
        setUploadingHeader(false);
      }
    }
  };

  // Submit step 1 - Create user and send magic link
  async function handleSubmitStep1() {
    if (!contact.email || !contact.firstName || !contact.lastName) return;
    setLoading(true);
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
        try {
          await signIn("email", {
            email: contact.email,
            redirect: false,
            callbackUrl: "/onboarding",
          });
          setEmailSent(true);
        } catch (signInError) {
          console.error("Error sending magic link:", signInError);
          setEmailSent(true);
        }
      } else {
        const data = await response.json();
        if (response.status === 409) {
          const errorMessage = "Er bestaat al een account met dit e-mailadres. Log in om verder te gaan.";
          setEmailError(errorMessage);
          toast.error("E-mailadres al in gebruik", {
            description: errorMessage,
          });
        } else {
          toast.error("Fout bij aanmelden", {
            description: data.error || "Er ging iets mis. Probeer het later opnieuw.",
          });
        }
      }
    } catch (error) {
      console.error("Error submitting step 1:", error);
      toast.error("Fout bij aanmelden", {
        description: "Er ging iets mis. Probeer het later opnieuw.",
      });
    } finally {
      setLoading(false);
    }
  }

  // Resend email verification
  async function handleResendEmail() {
    if (!contact.email) return;
    setIsResending(true);
    try {
      await signIn("email", {
        email: contact.email,
        redirect: false,
        callbackUrl: "/onboarding",
      });
      setEmailSent(true);
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
  }

  // Handle restart onboarding (delete account and start fresh)
  async function handleRestartOnboarding() {
    setIsRestarting(true);
    try {
      // Delete current user/employer
      const response = await fetch("/api/onboarding", {
        method: "DELETE",
      });

      if (response.ok) {
        // Sign out and redirect to fresh onboarding
        await signOut({ redirect: false });
        
        // Reset all state
        setContact({ firstName: "", lastName: "", email: "", role: "" });
        setEmailVerified(false);
        setStep1Complete(false);
        setStep2Complete(false);
        setEmailSent(false);
        setShowKVKSearch(true);
        setKvkSelected(false);
        setLogoPreview(null);
        setHeaderPreview(null);
        setLogoUploaded(false);
        setHeaderUploaded(false);
        setFormErrors({});
        setStep(1);
        setRestartDialogOpen(false);
        
        toast.success("Account verwijderd", {
          description: "Je kunt nu opnieuw beginnen met een nieuw e-mailadres.",
        });
        
        // Reload to ensure clean state
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
  }

  // Save step 1 data (update user)
  async function saveStep1Data() {
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

      if (response.ok) {
        setStep1Complete(true);
        return true;
      } else {
        toast.error("Fout bij opslaan", {
          description: "Er ging iets mis bij het opslaan van je gegevens.",
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
  }

  // Save step 2 data (update employer with company + billing)
  async function saveStep2Data() {
    const formData = getValues();
    
    // Validate step 2 data
    const companyResult = companyDataSchema.safeParse(formData);
    const billingResult = billingDataSchema.safeParse(formData);
    
    const newErrors: Record<string, string> = {};
    
    if (!companyResult.success) {
      companyResult.error.issues.forEach((err) => {
        const fieldName = err.path.map(String).join(".");
        if (!newErrors[fieldName]) {
          newErrors[fieldName] = err.message;
        }
      });
    }
    
    if (!billingResult.success) {
      billingResult.error.issues.forEach((err) => {
        const fieldName = err.path.map(String).join(".");
        if (!newErrors[fieldName]) {
          newErrors[fieldName] = err.message;
        }
      });
    }
    
    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors);
      // Scroll to first error
      const firstErrorField = Object.keys(newErrors)[0];
      setTimeout(() => {
        const element = document.querySelector(`[name="${firstErrorField}"], #${firstErrorField}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
      return false;
    }
    
    setFormErrors({});
    setSaving(true);
    
    try {
      const response = await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: formData.company_name,
          kvk: formData.kvk,
          phone: formData.phone,
          website_url: formData.website_url,
          "reference-nr": formData["reference-nr"],
          invoice_contact_name: formData.invoice_contact_name,
          invoice_email: formData.invoice_email,
          invoice_street: formData.invoice_street,
          "invoice_house-nr": formData["invoice_house-nr"],
          "invoice_house-nr-add": formData["invoice_house-nr-add"],
          "invoice_postal-code": formData["invoice_postal-code"],
          invoice_city: formData.invoice_city,
          invoice_country: formData.invoice_country,
        }),
      });

      if (response.ok) {
        setStep2Complete(true);
        toast.success("Opgeslagen", {
          description: "Bedrijfs- en factuurgegevens zijn opgeslagen.",
        });
        return true;
      } else {
        toast.error("Fout bij opslaan", {
          description: "Er ging iets mis bij het opslaan van je gegevens.",
        });
        return false;
      }
    } catch (error) {
      console.error("Error saving step 2:", error);
      toast.error("Fout bij opslaan", {
        description: "Er ging iets mis. Probeer het later opnieuw.",
      });
      return false;
    } finally {
      setSaving(false);
    }
  }

  // Final submit - Save step 3 and complete onboarding
  async function handleFinalSubmit() {
    const formData = getValues();
    
    // Validate step 3 data
    const websiteResult = websiteDataSchema.safeParse(formData);
    
    const newErrors: Record<string, string> = {};
    
    if (!websiteResult.success) {
      websiteResult.error.issues.forEach((err) => {
        const fieldName = err.path.map(String).join(".");
        if (!newErrors[fieldName]) {
          newErrors[fieldName] = err.message;
        }
      });
    }
    
    // Check image uploads
    let hasImageError = false;
    if (!logoUploaded) {
      setLogoError("Logo upload is verplicht");
      hasImageError = true;
    }
    if (!headerUploaded) {
      setHeaderError("Header afbeelding upload is verplicht");
      hasImageError = true;
    }
    
    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors);
      const firstErrorField = Object.keys(newErrors)[0];
      setTimeout(() => {
        const element = document.querySelector(`[name="${firstErrorField}"], #${firstErrorField}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
      return;
    }
    
    if (hasImageError) {
      const logoElement = document.getElementById("logo");
      if (logoElement) {
        logoElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }
    
    setFormErrors({});
    setSaving(true);
    
    try {
      // First update user status to active
      const userResponse = await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: contact.firstName,
          last_name: contact.lastName,
          role: contact.role,
          status: "active",
        }),
      });

      if (!userResponse.ok) {
        toast.error("Fout bij opslaan", {
          description: "Er ging iets mis bij het opslaan van je persoonlijke gegevens.",
        });
        return;
      }

      // Then update employer with website data and set status to active
      const employerResponse = await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: formData.display_name,
          sector: formData.sector,
          location: formData.location,
          short_description: formData.short_description,
          status: "active",
        }),
      });

      if (employerResponse.ok) {
        toast.success("Welkom bij Colourful Jobs!", {
          description: "Je werkgeversaccount is succesvol aangemaakt.",
        });
        router.push("/dashboard");
      } else {
        toast.error("Fout bij opslaan", {
          description: "Er ging iets mis bij het opslaan van je websitegegevens. Probeer het opnieuw.",
        });
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Fout bij opslaan", {
        description: "Er ging iets mis. Probeer het later opnieuw.",
      });
    } finally {
      setSaving(false);
    }
  }

  // Show loading state while session is being checked
  if (status === "loading") {
    return (
      <Card className="mx-auto max-w-3xl p-8">
        <CardHeader className="p-0 pb-6">
          <CardTitle>Account aanmaken</CardTitle>
          <CardDescription className="p-regular mt-1">
            Laden...
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#F86600] border-t-transparent"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Card className="p-8">
        <CardHeader className="p-0 pb-6">
          <CardTitle>Account aanmaken</CardTitle>
          <CardDescription className="p-regular mt-1">
            Stap {step} van {stepLabels.length}: {stepLabels[step - 1]}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {/* Clickable Step Indicator */}
          <div className="mb-8 flex gap-2">
            {stepLabels.map((label, index) => {
              const stepNumber = (index + 1) as Step;
              const isActive = stepNumber === step;
              const isCompleted = stepNumber === 1 ? step1Complete : stepNumber === 2 ? step2Complete : false;
              const isClickable = stepNumber === 1 || (stepNumber === 2 && step1Complete) || (stepNumber === 3 && step2Complete);
              
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => isClickable && handleStepClick(stepNumber)}
                  disabled={!isClickable}
                  className={`flex-1 rounded-full px-3 py-1.5 text-center p-small font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-[#1F2D58]/20 text-[#1F2D58] ring-2 ring-[#1F2D58]/30"
                      : isCompleted
                      ? "border border-emerald-500 bg-emerald-50 text-emerald-700 cursor-pointer hover:bg-emerald-100 hover:border-emerald-600"
                      : isClickable
                      ? "border border-slate-200 bg-slate-50 text-slate-600 cursor-pointer hover:bg-slate-100 hover:border-slate-300"
                      : "border border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed opacity-60"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Step 1: Personal Data */}
          {step === 1 && (
            <div className="space-y-4">
              {!emailSent && !emailVerified ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <Label htmlFor="firstName">Voornaam *</Label>
                      <Input
                        id="firstName"
                        value={contact.firstName}
                        onChange={(e) =>
                          setContact((c) => ({ ...c, firstName: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="lastName">Achternaam *</Label>
                      <Input
                        id="lastName"
                        value={contact.lastName}
                        onChange={(e) =>
                          setContact((c) => ({ ...c, lastName: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="email-step1">E-mailadres *</Label>
                    <Input
                      id="email-step1"
                      type="email"
                      value={contact.email}
                      className={emailError ? "border-red-500" : ""}
                      onChange={(e) => {
                        setContact((c) => ({ ...c, email: e.target.value }));
                        if (emailError) setEmailError(null);
                      }}
                    />
                    {emailError && (
                      <p className="text-sm text-red-500">
                        Er bestaat al een account met dit e-mailadres.{" "}
                        <Link href="/login" className="underline hover:text-red-700">
                          Log in
                        </Link>{" "}
                        om verder te gaan.
                      </p>
                    )}
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="role">Rol</Label>
                    <Input
                      id="role"
                      value={contact.role}
                      onChange={(e) =>
                        setContact((c) => ({ ...c, role: e.target.value }))
                      }
                    />
                  </div>
                  <p className="p-small text-slate-500">
                    We sturen je een e-mail met een link om veilig in te loggen en verder te gaan.
                  </p>
                  <div className="mt-4 flex justify-end">
                    <Button
                      onClick={handleSubmitStep1}
                      disabled={!contact.firstName || !contact.lastName || !contact.email || loading}
                    >
                      {loading ? "Bezig..." : "Email link sturen"}
                    </Button>
                  </div>
                </>
              ) : emailSent && !emailVerified ? (
                <Alert className="border-emerald-200 bg-emerald-50">
                  <AlertTitle className="text-lg font-semibold text-emerald-900">
                    Check je e-mail
                  </AlertTitle>
                  <AlertDescription className="text-emerald-700">
                    <p className="p-regular mb-2">
                      We hebben je een e-mail gestuurd met een link om je email te verifiëren.
                    </p>
                    <p className="p-small text-emerald-600">
                      Geen mail gezien? Check je spam of{" "}
                      <button
                        onClick={handleResendEmail}
                        disabled={isResending}
                        className="underline disabled:opacity-50"
                      >
                        {isResending ? "Bezig..." : "verstuur 'm opnieuw"}
                      </button>
                      .
                    </p>
                  </AlertDescription>
                </Alert>
              ) : (
                /* Email is verified - show editable form with read-only email */
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <Label htmlFor="firstName">Voornaam *</Label>
                      <Input
                        id="firstName"
                        value={contact.firstName}
                        onChange={(e) =>
                          setContact((c) => ({ ...c, firstName: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="lastName">Achternaam *</Label>
                      <Input
                        id="lastName"
                        value={contact.lastName}
                        onChange={(e) =>
                          setContact((c) => ({ ...c, lastName: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-verified">E-mailadres *</Label>
                    <Input
                      id="email-verified"
                      type="email"
                      value={contact.email}
                      disabled
                      className="bg-slate-100 text-slate-600"
                    />
                    <p className="p-small text-slate-500">
                      E-mail kan niet meer gewijzigd worden. Wil je dit toch?{" "}
                      <button
                        type="button"
                        onClick={() => setRestartDialogOpen(true)}
                        className="underline hover:no-underline text-[#1F2D58]"
                      >
                        Start opnieuw
                      </button>
                      {" "}(alle huidige gegevens gaan verloren)
                    </p>
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="role">Rol</Label>
                    <Input
                      id="role"
                      value={contact.role}
                      onChange={(e) =>
                        setContact((c) => ({ ...c, role: e.target.value }))
                      }
                    />
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button
                      onClick={async () => {
                        const success = await saveStep1Data();
                        if (success) {
                          setStep(2);
                        }
                      }}
                      disabled={!contact.firstName || !contact.lastName || saving}
                    >
                      {saving ? "Opslaan..." : "Volgende stap"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 2: Company & Billing Data */}
          {step === 2 && status === "authenticated" && (
            <div className="space-y-8">
              {/* KVK Search Section */}
              {showKVKSearch && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4>Bedrijf zoeken via KVK (optioneel)</h4>
                      <p className="p-regular text-slate-600">
                        Vul je KVK-nummer of bedrijfsnaam in om je bedrijfsgegevens automatisch in te vullen. 
                        Of sla over om alles handmatig in te vullen.
                      </p>
                    </div>
                    <KVKSearch onSelect={handleKVKSelect} onSkip={handleSkipKVK} />
                  </div>
                </div>
              )}

              {/* Company & Billing Form */}
              {!showKVKSearch && (
                <>
                  {/* Company Data Section */}
                  <div className="space-y-4">
                    <h4>Bedrijfsgegevens</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="company_name">Juridische bedrijfsnaam *</Label>
                        <Input
                          id="company_name"
                          {...register("company_name")}
                          className={formErrors.company_name ? "border-red-500" : ""}
                        />
                        {formErrors.company_name && (
                          <p className="text-sm text-red-500">{formErrors.company_name}</p>
                        )}
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="kvk">KVK-nummer *</Label>
                        <Input
                          id="kvk"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={8}
                          placeholder="12345678"
                          {...register("kvk")}
                          className={formErrors.kvk ? "border-red-500" : ""}
                        />
                        {formErrors.kvk && (
                          <p className="text-sm text-red-500">{formErrors.kvk}</p>
                        )}
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="phone">Telefoonnummer *</Label>
                        <Input
                          id="phone"
                          type="tel"
                          {...register("phone")}
                          className={formErrors.phone ? "border-red-500" : ""}
                        />
                        {formErrors.phone && (
                          <p className="text-sm text-red-500">{formErrors.phone}</p>
                        )}
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="website_url">Website-URL</Label>
                        <Input 
                          id="website_url" 
                          type="url" 
                          {...register("website_url")} 
                          placeholder="https://www.voorbeeld.nl"
                          className={formErrors.website_url ? "border-red-500" : ""}
                        />
                        {formErrors.website_url && (
                          <p className="text-sm text-red-500">{formErrors.website_url}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Billing Data Section */}
                  <div className="space-y-4">
                    <h4>Factuurgegevens</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="reference-nr">Referentienummer</Label>
                        <Input id="reference-nr" {...register("reference-nr")} />
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="invoice_contact_name">Contactpersoon facturatie *</Label>
                        <Input
                          id="invoice_contact_name"
                          {...register("invoice_contact_name")}
                          className={formErrors.invoice_contact_name ? "border-red-500" : ""}
                        />
                        {formErrors.invoice_contact_name && (
                          <p className="text-sm text-red-500">{formErrors.invoice_contact_name}</p>
                        )}
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="invoice_email">E-mail facturatie *</Label>
                        <Input
                          id="invoice_email"
                          type="email"
                          {...register("invoice_email")}
                          className={formErrors.invoice_email ? "border-red-500" : ""}
                        />
                        {formErrors.invoice_email && (
                          <p className="text-sm text-red-500">{formErrors.invoice_email}</p>
                        )}
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="invoice_street">Straat *</Label>
                        <Input
                          id="invoice_street"
                          {...register("invoice_street")}
                          className={formErrors.invoice_street ? "border-red-500" : ""}
                        />
                        {formErrors.invoice_street && (
                          <p className="text-sm text-red-500">{formErrors.invoice_street}</p>
                        )}
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="invoice_house-nr">Huisnummer *</Label>
                        <Input
                          id="invoice_house-nr"
                          {...register("invoice_house-nr")}
                          className={formErrors["invoice_house-nr"] ? "border-red-500" : ""}
                        />
                        {formErrors["invoice_house-nr"] && (
                          <p className="p-small text-red-500">{formErrors["invoice_house-nr"]}</p>
                        )}
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="invoice_house-nr-add">Toevoeging</Label>
                        <Input id="invoice_house-nr-add" {...register("invoice_house-nr-add")} />
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="invoice_postal-code">Postcode *</Label>
                        <Input
                          id="invoice_postal-code"
                          {...register("invoice_postal-code")}
                          className={formErrors["invoice_postal-code"] ? "border-red-500" : ""}
                        />
                        {formErrors["invoice_postal-code"] && (
                          <p className="p-small text-red-500">{formErrors["invoice_postal-code"]}</p>
                        )}
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="invoice_city">Plaats *</Label>
                        <Input
                          id="invoice_city"
                          {...register("invoice_city")}
                          className={formErrors.invoice_city ? "border-red-500" : ""}
                        />
                        {formErrors.invoice_city && (
                          <p className="text-sm text-red-500">{formErrors.invoice_city}</p>
                        )}
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="invoice_country">Land *</Label>
                        <Select
                          id="invoice_country"
                          {...register("invoice_country")}
                          className={formErrors.invoice_country ? "border-red-500" : ""}
                        >
                          <option value="">Selecteer een land</option>
                          {countries.map((country) => (
                            <option key={country} value={country}>
                              {country}
                            </option>
                          ))}
                        </Select>
                        {formErrors.invoice_country && (
                          <p className="text-sm text-red-500">{formErrors.invoice_country}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex justify-between items-center">
                    <button
                      type="button"
                      onClick={() => setShowKVKSearch(true)}
                      className="p-regular text-[#1F2D58] underline hover:no-underline cursor-pointer transition-colors"
                    >
                      Vorige
                    </button>
                    <Button 
                      onClick={async () => {
                        const success = await saveStep2Data();
                        if (success) {
                          setStep(3);
                        }
                      }}
                      disabled={saving}
                    >
                      {saving ? "Opslaan..." : "Volgende stap"}
                    </Button>
                  </div>
                </>
              )}

              {/* Show back button on KVK search screen */}
              {showKVKSearch && (
                <div className="flex justify-start">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="p-regular text-[#1F2D58] underline hover:no-underline cursor-pointer transition-colors"
                  >
                    Vorige
                  </button>
                </div>
              )}

              {/* Duplicate Dialog */}
              <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Bedrijf bestaat al</DialogTitle>
                    <DialogDescription>
                      Het geselecteerde KVK-nummer is al gekoppeld aan een bestaand werkgeversaccount:{" "}
                      <strong>{duplicateEmployer?.company_name || duplicateEmployer?.display_name}</strong>
                    </DialogDescription>
                  </DialogHeader>
                  <p className="p-regular mb-4">
                    Je kunt geen nieuw werkgeversaccount aanmaken met hetzelfde KVK-nummer. 
                    Neem contact op met de beheerder om jezelf toe te voegen aan het bestaande account.
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => setDuplicateDialogOpen(false)}>
                      Sluiten
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* Step 3: Website Data */}
          {step === 3 && status === "authenticated" && (
            <div className="space-y-8">
              <div className="space-y-4">
                <h4>Websitegegevens</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="display_name">Weergavenaam organisatie *</Label>
                    <Input
                      id="display_name"
                      {...register("display_name")}
                      className={formErrors.display_name ? "border-red-500" : ""}
                    />
                    {formErrors.display_name && (
                      <p className="text-sm text-red-500">{formErrors.display_name}</p>
                    )}
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="sector">Sector *</Label>
                    <Input
                      id="sector"
                      {...register("sector")}
                      className={formErrors.sector ? "border-red-500" : ""}
                    />
                    {formErrors.sector && (
                      <p className="text-sm text-red-500">{formErrors.sector}</p>
                    )}
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="location">Locatie *</Label>
                    <Input
                      id="location"
                      {...register("location")}
                      className={formErrors.location ? "border-red-500" : ""}
                    />
                    {formErrors.location && (
                      <p className="text-sm text-red-500">{formErrors.location}</p>
                    )}
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="short_description">Omschrijving organisatie *</Label>
                    <Textarea
                      id="short_description"
                      rows={4}
                      {...register("short_description")}
                      className={formErrors.short_description ? "border-red-500" : ""}
                    />
                    {formErrors.short_description && (
                      <p className="text-sm text-red-500">{formErrors.short_description}</p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <ImageUpload
                      id="logo"
                      label="Logo"
                      required
                      preview={logoPreview || undefined}
                      uploading={uploadingLogo}
                      onFileSelect={(file) => handleImageUpload(file, "logo")}
                      error={logoError || undefined}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <ImageUpload
                      id="header_image"
                      label="Hoofdafbeelding / headerbeeld"
                      required
                      preview={headerPreview || undefined}
                      uploading={uploadingHeader}
                      onFileSelect={(file) => handleImageUpload(file, "header")}
                      error={headerError || undefined}
                    />
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="p-regular text-[#1F2D58] underline hover:no-underline cursor-pointer transition-colors"
                >
                  Vorige
                </button>
                <Button onClick={handleFinalSubmit} disabled={saving}>
                  {saving ? "Opslaan..." : "Account aanmaken"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Login link for step 1 */}
      {step === 1 && !emailSent && !emailVerified && (
        <div className="mt-4 text-center">
          <p className="p-small text-[#1F2D58]">
            Heb je al een account?{" "}
            <Link 
              href="/login" 
              className="underline hover:text-[#193DAB]"
            >
              Log in
            </Link>
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
    </div>
  );
}
