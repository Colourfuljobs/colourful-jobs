"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

interface InvitationData {
  valid: boolean;
  email: string;
  company_name: string;
  error?: string;
}

export default function InvitationPage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Set page title
  useEffect(() => {
    document.title = "Uitnodiging accepteren | Colourful jobs";
  }, []);

  // Validate token on load
  useEffect(() => {
    const validateToken = async () => {
      try {
        const response = await fetch(`/api/team/accept?token=${encodeURIComponent(token)}`);
        const data = await response.json();

        if (data.valid) {
          setInvitationData(data);
        } else {
          setError(data.error || "Ongeldige uitnodiging");
        }
      } catch (err) {
        console.error("Error validating invitation:", err);
        setError("Er ging iets mis bij het valideren van de uitnodiging.");
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      validateToken();
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const errors: Record<string, string> = {};
    if (!firstName.trim()) {
      errors.firstName = "Voornaam is verplicht";
    }
    if (!lastName.trim()) {
      errors.lastName = "Achternaam is verplicht";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setSubmitting(true);

    try {
      const response = await fetch("/api/team/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("Welkom bij Colourful jobs!", {
          description: `Je bent toegevoegd aan ${invitationData?.company_name || "het werkgeversaccount"}.`,
        });
        // User is now logged in via session cookie, do a hard refresh to ensure cookie is sent
        window.location.href = "/dashboard";
      } else {
        toast.error("Fout bij accepteren", {
          description: data.error || "Er ging iets mis. Probeer het later opnieuw.",
        });
      }
    } catch (err) {
      console.error("Error accepting invitation:", err);
      toast.error("Fout bij accepteren", {
        description: "Er ging iets mis. Probeer het later opnieuw.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md">
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

  // Error state
  if (error || !invitationData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <Link href="https://www.colourfuljobs.nl/">
              <Image src="/logo.svg" alt="Colourful jobs" width={180} height={29} priority />
            </Link>
          </div>
          <Card className="p-0 overflow-hidden">
            <div className="bg-white/50 px-6 pt-6 pb-6">
              <CardTitle>Uitnodiging</CardTitle>
            </div>
            <CardContent className="p-6 bg-white">
              <Alert className="bg-red-50 border-red-200">
                <AlertDescription className="text-red-700">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                        <path fill="#DC2626" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <strong className="block mb-1">Uitnodiging niet geldig</strong>
                      <p className="text-sm">{error}</p>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
              <div className="mt-6 text-center">
                <Link href="/login" className="text-[#193DAB] underline hover:no-underline">
                  Ga naar inloggen
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Success state - show form
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link href="https://www.colourfuljobs.nl/">
            <Image src="/logo.svg" alt="Colourful jobs" width={180} height={29} priority />
          </Link>
        </div>
        <Card className="p-0 overflow-hidden">
          <div className="bg-white/50 px-6 pt-6 pb-6">
            <CardTitle>Uitnodiging accepteren</CardTitle>
          </div>
          <CardContent className="p-6 bg-white">
            <Alert className="bg-[#193DAB]/[0.12] border-none mb-6">
              <AlertDescription className="text-[#1F2D58]">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                      <path fill="#1F2D58" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <strong className="block mb-1">Je bent uitgenodigd!</strong>
                    <p className="text-sm">
                      Je bent uitgenodigd om deel te nemen aan <strong>{invitationData.company_name}</strong>.
                      Vul je gegevens in om je account aan te maken.
                    </p>
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email field - disabled, floating label style */}
              <div>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    value={invitationData.email}
                    disabled
                    placeholder=" "
                    className="peer h-12 pt-5 pb-1 px-4 text-sm bg-slate-50"
                  />
                  <Label
                    htmlFor="email"
                    className="absolute left-4 top-1 text-xs text-[#1F2D58]/60 pointer-events-none"
                  >
                    E-mailadres
                  </Label>
                </div>
                <p className="text-xs text-[#1F2D58]/60 mt-1">
                  Je e-mailadres kan niet worden gewijzigd.
                </p>
              </div>

              {/* Name fields with floating labels */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="relative">
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value);
                        if (formErrors.firstName) {
                          setFormErrors((prev) => {
                            const newErrors = { ...prev };
                            delete newErrors.firstName;
                            return newErrors;
                          });
                        }
                      }}
                      placeholder=" "
                      className={`peer h-12 pt-5 pb-1 px-4 text-sm ${formErrors.firstName ? "border-red-500" : ""}`}
                    />
                    <Label
                      htmlFor="firstName"
                      className={`absolute left-4 transition-all duration-200 pointer-events-none
                        ${firstName.length > 0
                          ? "top-1 text-xs text-[#1F2D58]/60"
                          : "top-1/2 -translate-y-1/2 text-sm text-slate-500"
                        }
                        peer-focus:top-1 peer-focus:text-xs peer-focus:text-[#1F2D58]/60 peer-focus:translate-y-0`}
                    >
                      Voornaam <span className="text-slate-400">*</span>
                    </Label>
                  </div>
                  {formErrors.firstName && (
                    <p className="text-xs text-red-600 mt-1">{formErrors.firstName}</p>
                  )}
                </div>

                <div>
                  <div className="relative">
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => {
                        setLastName(e.target.value);
                        if (formErrors.lastName) {
                          setFormErrors((prev) => {
                            const newErrors = { ...prev };
                            delete newErrors.lastName;
                            return newErrors;
                          });
                        }
                      }}
                      placeholder=" "
                      className={`peer h-12 pt-5 pb-1 px-4 text-sm ${formErrors.lastName ? "border-red-500" : ""}`}
                    />
                    <Label
                      htmlFor="lastName"
                      className={`absolute left-4 transition-all duration-200 pointer-events-none
                        ${lastName.length > 0
                          ? "top-1 text-xs text-[#1F2D58]/60"
                          : "top-1/2 -translate-y-1/2 text-sm text-slate-500"
                        }
                        peer-focus:top-1 peer-focus:text-xs peer-focus:text-[#1F2D58]/60 peer-focus:translate-y-0`}
                    >
                      Achternaam <span className="text-slate-400">*</span>
                    </Label>
                  </div>
                  {formErrors.lastName && (
                    <p className="text-xs text-red-600 mt-1">{formErrors.lastName}</p>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={submitting}
              >
                {submitting ? "Bezig..." : "Account aanmaken"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
