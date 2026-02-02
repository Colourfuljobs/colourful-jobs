"use client";

import { useState, useEffect } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

export default function LoginPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Set page title
  useEffect(() => {
    document.title = "Inloggen | Colourful jobs";
  }, []);

  // If user has an active session, redirect to dashboard
  // If user has a pending_onboarding session, silently clear it so they can log in
  useEffect(() => {
    if (sessionStatus === "authenticated" && session?.user) {
      // Active users should go to dashboard
      if (session.user.status === "active") {
        router.push("/dashboard");
        return;
      }
      
      // Pending onboarding users: clear session so they can log in with existing account
      if (session.user.status === "pending_onboarding") {
        setIsSigningOut(true);
        // Clear any localStorage onboarding state
        try {
          localStorage.removeItem("colourful_onboarding_state");
          localStorage.removeItem("colourful_join_employer_id");
          localStorage.removeItem("colourful_join_pending_verification");
        } catch (e) {
          // Ignore localStorage errors
        }
        signOut({ redirect: false }).then(() => {
          setIsSigningOut(false);
        });
      }
    }
  }, [sessionStatus, session, router]);

  // Email validation regex that matches Zod's email validation
  // Must have: local part, @, domain with at least one dot, TLD of 2+ chars
  const isValidEmail = (emailToValidate: string): boolean => {
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    return EMAIL_REGEX.test(emailToValidate);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    
    // Validate email format before submitting
    if (!isValidEmail(email)) {
      setEmailError("Voer een geldig e-mailadres in (bijv. naam@bedrijf.nl)");
      toast.error("Ongeldig e-mailadres", {
        description: "Controleer of je e-mailadres correct is geschreven.",
      });
      return;
    }
    
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

      // OPTIMISTIC UI: Show success immediately, send email in background
      // This provides instant feedback while the email is being sent
      setSent(true);
      setLoading(false);

      // Send magic link in background (don't await)
      signIn("email", { 
        email, 
        redirect: false,
        callbackUrl: "/dashboard"
      }).catch((error) => {
        // If email sending fails, show error toast (user already sees success UI)
        console.error("Error sending login email:", error);
        toast.error("Fout bij versturen", {
          description: "De e-mail kon niet worden verstuurd. Probeer het opnieuw.",
        });
      });
    } catch (error) {
      console.error("Error during login:", error);
      toast.error("Fout bij inloggen", {
        description: "Er ging iets mis. Probeer het later opnieuw.",
      });
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

  // Show loading state while signing out or redirecting active users
  if (isSigningOut || (sessionStatus === "authenticated" && session?.user?.status === "pending_onboarding") || (sessionStatus === "authenticated" && session?.user?.status === "active")) {
    return (
      <div className="min-h-screen flex">
        {/* Left side - Loading state */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="flex justify-center mb-8">
              <Link href="https://www.colourfuljobs.nl/">
                <Image src="/logo.svg" alt="Colourful jobs" width={180} height={29} priority />
              </Link>
            </div>
            <Card className="p-6 sm:p-8">
              <CardContent className="p-0 flex flex-col items-center justify-center py-12">
                <Spinner className="size-8 text-[#F86600] mb-4" />
                <p className="p-regular text-[#1F2D58]">Even geduld...</p>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Right side - Screenshot (hidden on mobile) */}
        <div className="hidden lg:flex flex-shrink-0 items-center">
          <Image
            src="/onboarding-screenshot.png"
            alt="Colourful jobs dashboard"
            width={800}
            height={900}
            className="h-[80vh] w-auto"
            priority
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Login form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <Link href="https://www.colourfuljobs.nl/">
              <Image src="/logo.svg" alt="Colourful jobs" width={180} height={29} priority />
            </Link>
          </div>
          <Card className="p-0 overflow-hidden">
            {/* Intro section with title - 50% opacity background */}
            <div className="bg-white/50 px-6 sm:px-8 pt-6 pb-6 sm:pb-8">
              <CardTitle className="contempora-small mb-2">Inloggen</CardTitle>
              <CardDescription className="p-regular text-[#1F2D58]/70">
                {sent 
                  ? "We hebben je een e-mail gestuurd met een link om in te loggen."
                  : "Vul je e-mailadres in en ontvang in je mailbox een link om in te loggen."
                }
              </CardDescription>
            </div>
            
            {/* Form content - 100% white background */}
            <CardContent className="p-6 sm:p-8 bg-white">
              {sent ? (
                <div className="flex flex-col items-center justify-center py-8 px-6 text-center bg-[#193DAB]/[0.12] rounded-lg">
                  <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-white mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24">
                      <path fill="#1F2D58" fillRule="evenodd" d="M20.204 4.01A2 2 0 0 1 22 6v12a2 2 0 0 1-1.796 1.99L20 20H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h16l.204.01ZM12 14 3 8.6V18a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V8.6L12 14ZM4 5a1 1 0 0 0-1 1v1.434l9 5.399 9-5.4V6a1 1 0 0 0-1-1H4Z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <div className="max-w-md space-y-3">
                    <h3 className="text-lg font-semibold text-[#1F2D58]">
                      Bevestig je e-mailadres<br />om verder te gaan
                    </h3>
                    <p className="p-regular text-slate-600">
                      We hebben een activatielink gestuurd naar <strong className="text-[#1F2D58]">{email}</strong>.
                    </p>
                    <p className="p-small text-slate-500 !mt-7">
                      Geen mail gezien? Check je spam of{" "}
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={isResending}
                        className="underline hover:no-underline disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isResending ? "Bezig..." : "verstuur 'm opnieuw"}
                      </button>
                      .
                    </p>
                    <p className="p-small text-slate-500 !mt-0.5">
                      Verkeerd e-mailadres?{" "}
                      <button
                        type="button"
                        onClick={() => setSent(false)}
                        className="underline hover:no-underline"
                      >
                        Vul een ander adres in
                      </button>
                    </p>
                  </div>
                </div>
              ) : (
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
                    {loading ? "Versturen..." : "Stuur e-mail link"}
                  </Button>
                </form>
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
      </div>
      
      {/* Right side - Screenshot (hidden on mobile) */}
      <div className="hidden lg:flex flex-shrink-0 items-center">
        <Image
          src="/onboarding-screenshot.png"
          alt="Colourful jobs dashboard"
          width={800}
          height={900}
          className="h-[80vh] w-auto"
          priority
        />
      </div>
    </div>
  );
}


