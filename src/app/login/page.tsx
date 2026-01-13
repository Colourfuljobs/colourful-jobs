"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    
    setLoading(true);
    setEmailError(null);
    
    try {
      // First check if email exists and is active
      const checkResponse = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!checkResponse.ok) {
        const data = await checkResponse.json();
        const errorMessage = data.error || "Er ging iets mis. Probeer het later opnieuw.";
        
        setEmailError(errorMessage);
        
        if (checkResponse.status === 404) {
          // Email doesn't exist
          toast.error("Account niet gevonden", {
            description: "Er bestaat nog geen account met dit e-mailadres. Maak eerst een account aan.",
          });
        } else if (checkResponse.status === 403) {
          // Account not active (still in onboarding)
          toast.error("Account nog niet actief", {
            description: "Dit account is nog niet geactiveerd. Voltooi eerst de onboarding.",
          });
        } else {
          toast.error("Fout bij inloggen", {
            description: errorMessage,
          });
        }
        setLoading(false);
        return;
      }

      // Email exists and is active, send magic link
      await signIn("email", { 
        email, 
        redirect: false,
        callbackUrl: "/dashboard"
      });
      setSent(true);
    } catch (error) {
      console.error("Error during login:", error);
      toast.error("Fout bij inloggen", {
        description: "Er ging iets mis. Probeer het later opnieuw.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!email || isResending) return;
    
    setIsResending(true);
    
    try {
      // Check if email exists and is active
      const checkResponse = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!checkResponse.ok) {
        const data = await checkResponse.json();
        toast.error("Fout bij versturen", {
          description: data.error || "Er ging iets mis. Probeer het later opnieuw.",
        });
        setIsResending(false);
        return;
      }

      // Email exists and is active, send magic link again
      await signIn("email", { 
        email, 
        redirect: false,
        callbackUrl: "/dashboard"
      });
      
      toast.success("E-mail opnieuw verstuurd", {
        description: "Check je inbox voor de nieuwe inloglink.",
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

  return (
    <div className="mx-auto max-w-md">
      <Card className="pt-6 px-8 pb-8">
        <CardHeader className="p-0 mb-6">
          <CardTitle>Inloggen</CardTitle>
          <CardDescription className="p-regular mt-2 text-[#1F2D58]/70">
            Vul je e-mailadres in en ontvang in je mailbox een link om in te loggen.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mailadres</Label>
              <Input
                id="email"
                type="email"
                value={email}
                required
                className={emailError ? "border-red-500" : ""}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(null);
                  // Clear browser validation error when user types
                  e.target.setCustomValidity("");
                }}
                onInvalid={(e) => {
                  e.preventDefault();
                  const target = e.target as HTMLInputElement;
                  const errorMessage = target.validity.valueMissing
                    ? "E-mailadres is verplicht"
                    : target.validity.typeMismatch
                    ? "Voer een geldig e-mailadres in"
                    : "Ongeldig e-mailadres";
                  
                  setEmailError(errorMessage);
                  toast.error("Ongeldig e-mailadres", {
                    description: errorMessage,
                  });
                  
                  // Prevent default browser validation message
                  target.setCustomValidity(errorMessage);
                }}
                placeholder="jouw@email.nl"
              />
              {emailError && (
                <p className="text-sm text-red-500">
                  {emailError.includes("bestaat") ? (
                    <>
                      {emailError}{" "}
                      <Link href="/onboarding" className="underline hover:text-red-700">
                        Maak een account aan
                      </Link>
                      .
                    </>
                  ) : emailError.includes("niet geactiveerd") ? (
                    <>
                      Dit account is nog niet geactiveerd. Voltooi eerst de{" "}
                      <Link href="/onboarding" className="underline hover:text-red-700">
                        onboarding
                      </Link>
                      .
                    </>
                  ) : (
                    emailError
                  )}
                </p>
              )}
            </div>
            <Button type="submit" disabled={!email || loading}>
              {loading ? "Versturen..." : "Verstuur verificatielink"}
            </Button>
          </form>
          {sent && (
            <Alert className="mt-4 bg-[#193DAB]/[0.12] border-none">
              <AlertDescription className="text-[#1F2D58]">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                      <path fill="#1F2D58" fillRule="evenodd" d="M20.204 4.01A2 2 0 0 1 22 6v12a2 2 0 0 1-1.796 1.99L20 20H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h16l.204.01ZM12 14 3 8.6V18a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V8.6L12 14ZM4 5a1 1 0 0 0-1 1v1.434l9 5.399 9-5.4V6a1 1 0 0 0-1-1H4Z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <strong className="block mb-1">Check je e-mail</strong>
                    <p className="mb-2 text-sm">We hebben je een e-mail gestuurd met een link om veilig in te loggen.</p>
                    <p className="text-xs">
                      Geen mail gezien? Check je spam of{" "}
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={isResending}
                        className="underline hover:text-[#193DAB] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isResending ? "versturen..." : "verstuur 'm opnieuw"}
                      </button>
                      .
                    </p>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      <div className="mt-4 text-center">
        <p className="p-small text-[#1F2D58]">
          Nog geen account?{" "}
          <Link 
            href="/onboarding" 
            className="underline hover:text-[#193DAB]"
          >
            Maak een account aan
          </Link>
        </p>
      </div>
    </div>
  );
}


