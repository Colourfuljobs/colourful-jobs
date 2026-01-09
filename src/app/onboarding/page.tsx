"use client";

import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
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
import { onboardingFormSchema, type OnboardingFormData } from "@/lib/validation";
import { countries } from "@/lib/countries";
import { toast } from "sonner";

type Step = 1 | 2;

export default function OnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const [contact, setContact] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "",
  });

  // Step 2 form state
  const [showKVKSearch, setShowKVKSearch] = useState(true);
  const [kvkSelected, setKvkSelected] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateEmployer, setDuplicateEmployer] = useState<{ id: string; company_name?: string; display_name?: string } | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [headerPreview, setHeaderPreview] = useState<string | null>(null);
  const [logoUploaded, setLogoUploaded] = useState(false);
  const [headerUploaded, setHeaderUploaded] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingHeader, setUploadingHeader] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [headerError, setHeaderError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Custom form errors state (not using zodResolver to avoid runtime errors)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  // Email error for step 1 (e.g., duplicate email)
  const [emailError, setEmailError] = useState<string | null>(null);

  const {
    register,
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

  // Check if user is logged in and set step accordingly
  useEffect(() => {
    if (status === "authenticated" && session) {
      // User is logged in, show step 2
      if (step === 1) {
        setStep(2);
      }
      // Set email in form if available
      if (session.user?.email) {
        setValue("email", session.user.email, { shouldValidate: false });
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
            // Store role in contact state for the form
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
      // Use shouldValidate: false to prevent validation during prefilling
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
    // Clear previous image errors and start upload
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
    
    // Get current form values for alt text generation
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

      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      let data: any;

      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        // If not JSON, read as text to see what the error is
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

      // Use Cloudinary URL for preview and set uploaded state
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

  // Handle form submission
  const onSubmit = async (data: OnboardingFormData) => {
    setSaving(true);
    try {
      // Update user with personal data (from step 1), role, and set status to active
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

      // Update employer with all other data and set status to active
      const employerResponse = await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: data.company_name,
          display_name: data.display_name,
          kvk: data.kvk,
          phone: data.phone,
          website_url: data.website_url,
          "reference-nr": data["reference-nr"],
          invoice_contact_name: data.invoice_contact_name,
          invoice_email: data.invoice_email,
          invoice_street: data.invoice_street,
          "invoice_house-nr": data["invoice_house-nr"],
          "invoice_house-nr-add": data["invoice_house-nr-add"],
          "invoice_postal-code": data["invoice_postal-code"],
          invoice_city: data.invoice_city,
          invoice_country: data.invoice_country,
          sector: data.sector,
          location: data.location,
          short_description: data.short_description,
          status: "active",
        }),
      });

      if (employerResponse.ok) {
        // Show success toast and redirect to dashboard
        toast.success("Welkom bij Colourful Jobs!", {
          description: "Je werkgeversaccount is succesvol aangemaakt.",
        });
        router.push("/dashboard");
      } else {
        toast.error("Fout bij opslaan", {
          description: "Er ging iets mis bij het opslaan van je bedrijfsgegevens. Probeer het opnieuw.",
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
  };

  async function handleSubmitStep1() {
    if (!contact.email || !contact.firstName || !contact.lastName) return;
    setLoading(true);
    try {
      // First create user/employer in Airtable
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
        // Then send magic link via NextAuth
        try {
          await signIn("email", {
            email: contact.email,
            redirect: false,
            callbackUrl: "/onboarding",
          });
          setEmailSent(true);
        } catch (signInError) {
          console.error("Error sending magic link:", signInError);
          // Still show success message even if email fails
          setEmailSent(true);
        }
      } else {
        // Handle error response
        const data = await response.json();
        if (response.status === 409) {
          // Email already exists - show inline error and toast
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

  // Function to resend email without creating a new account
  async function handleResendEmail() {
    if (!contact.email) return;
    setIsResending(true);
    try {
      // Only send magic link, don't create account again
      await signIn("email", {
        email: contact.email,
        redirect: false,
        callbackUrl: "/onboarding",
      });
      // Update message to show it was resent
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

  const steps = [
    "Persoonlijke gegevens",
    "KVK nummer",
    "Bedrijfsgegevens",
  ];

  // Calculate active tab based on current step and showKVKSearch state
  const activeTab = step === 1 ? 1 : (showKVKSearch ? 2 : 3);

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
          Stap {activeTab} van {steps.length}: {steps[activeTab - 1]}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">

      <div className="mb-8 flex gap-2">
        {steps.map((label, index) => {
          const tabNumber = index + 1;
          const isActive = tabNumber === activeTab;
          const isDone = tabNumber < activeTab;
          return (
            <div
              key={label}
              className={`flex-1 rounded-full px-3 py-1 text-center p-small font-medium ${
                isActive
                  ? "bg-[#1F2D58]/20 text-[#1F2D58]"
                  : isDone
                  ? "border border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border border-slate-200 bg-slate-50 text-slate-500"
              }`}
            >
              {label}
            </div>
          );
        })}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          {!emailSent ? (
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
                    // Clear email error when user starts typing
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
                  {loading ? "Bezig..." : "Volgende stap"}
                </Button>
              </div>
            </>
          ) : (
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
                    {isResending ? "Bezig..." : "verstuur \u0027m opnieuw"}
                  </button>
                  .
                </p>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {step === 2 && status === "authenticated" && (
        <form 
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            
            // Clear previous errors
            setLogoError(null);
            setHeaderError(null);
            setFormErrors({});
            
            // Step 1: Get form values and add personal data from step 1
            const formValues = getValues();
            const formData = {
              ...formValues,
              // Use form values first, fallback to contact state for backwards compatibility
              first_name: formValues.first_name || contact.firstName,
              last_name: formValues.last_name || contact.lastName,
              email: formValues.email || session?.user?.email || "",
            };
            
            // Step 2: Run form validation using safeParse - this NEVER throws exceptions
            const result = onboardingFormSchema.safeParse(formData);
            
            // Step 3: Check image uploads
            let hasImageError = false;
            if (!logoUploaded) {
              setLogoError("Logo upload is verplicht");
              hasImageError = true;
            }
            if (!headerUploaded) {
              setHeaderError("Header afbeelding upload is verplicht");
              hasImageError = true;
            }
            
            // Step 4: If form validation failed, set errors and scroll to first error
            if (!result.success) {
              // Convert Zod errors to our error format
              const newErrors: Record<string, string> = {};
              result.error.issues.forEach((err) => {
                const fieldName = err.path.map(String).join(".");
                // Only store the first error for each field
                if (!newErrors[fieldName]) {
                  newErrors[fieldName] = err.message;
                }
              });
              setFormErrors(newErrors);
              
              // Scroll to first error field
              const firstErrorField = Object.keys(newErrors)[0];
              if (firstErrorField) {
                setTimeout(() => {
                  const element = document.querySelector(`[name="${firstErrorField}"], #${firstErrorField}`);
                  if (element) {
                    element.scrollIntoView({ behavior: "smooth", block: "center" });
                  }
                }, 100);
              }
              return; // Don't proceed if form validation failed
            }
            
            // Step 5: If image errors exist, scroll to image section
            if (hasImageError) {
              const logoElement = document.getElementById("logo");
              if (logoElement) {
                logoElement.scrollIntoView({ behavior: "smooth", block: "center" });
              }
              return; // Don't proceed if image validation failed
            }
            
            // Step 6: All validation passed, submit the form
            await onSubmit(result.data);
          }} 
          className="space-y-8"
        >
          {/* KVK Search Section */}
          {showKVKSearch && (
            <div className="space-y-4">
              <h4 className="mb-4">Zoek je bedrijf via KVK</h4>
              <KVKSearch onSelect={handleKVKSelect} onSkip={handleSkipKVK} />
            </div>
          )}

          {/* Form Sections */}
          {!showKVKSearch && (
            <>
              {/* Company Data Section */}
              <div className="space-y-4 rounded-t-[0.75rem] rounded-b-[2rem] bg-white p-6">
                <h4 className="mb-4">Bedrijfsgegevens</h4>
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
              <div className="space-y-4 rounded-t-[0.75rem] rounded-b-[2rem] bg-white p-6">
                <h4 className="mb-4">Factuurgegevens</h4>
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

              {/* Website Data Section */}
              <div className="space-y-4 rounded-t-[0.75rem] rounded-b-[2rem] bg-white p-6">
                <h4 className="mb-4">Websitegegevens</h4>
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
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setShowKVKSearch(true)}
                  className="p-regular text-[#1F2D58] underline hover:no-underline cursor-pointer"
                >
                  Vorige
                </button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Opslaan..." : "Volgende"}
                </Button>
              </div>
            </>
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
        </form>
      )}

      </CardContent>
      </Card>
      {step === 1 && !emailSent && (
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
    </div>
  );
}


