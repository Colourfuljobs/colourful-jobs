"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  // Map NextAuth error codes to Dutch messages
  const getErrorMessage = () => {
    switch (error) {
      case "Verification":
        return {
          title: "Niet gelukt om in te loggen",
          description: "De link die je hebt gebruikt is niet meer geldig. Waarschijnlijk is de link al een keer gebruikt of verlopen.",
        };
      case "Configuration":
        return {
          title: "Configuratiefout",
          description: "Er is een probleem met de server configuratie. Neem contact op met support.",
        };
      case "AccessDenied":
        return {
          title: "Toegang geweigerd",
          description: "Je hebt geen toegang tot deze pagina.",
        };
      case "OAuthSignin":
      case "OAuthCallback":
      case "OAuthCreateAccount":
      case "EmailCreateAccount":
      case "Callback":
        return {
          title: "Authenticatiefout",
          description: "Er ging iets mis tijdens het inloggen. Probeer het opnieuw.",
        };
      case "EmailSignin":
        return {
          title: "E-mail niet verzonden",
          description: "We konden geen e-mail verzenden. Probeer het later opnieuw.",
        };
      case "CredentialsSignin":
        return {
          title: "Ongeldige gegevens",
          description: "De inloggegevens zijn onjuist. Probeer het opnieuw.",
        };
      case "SessionRequired":
        return {
          title: "Sessie vereist",
          description: "Je moet ingelogd zijn om deze pagina te bekijken.",
        };
      default:
        return {
          title: "Er ging iets mis",
          description: "Er is een onverwachte fout opgetreden. Probeer het later opnieuw.",
        };
    }
  };

  const { title, description } = getErrorMessage();

  return (
    <div className="flex items-center justify-center px-4 -mt-8" style={{ minHeight: 'calc(100vh - 160px)' }}>
      <div className="mx-auto max-w-md w-full">
        <Card className="pt-6 sm:pt-8 px-6 sm:px-8 pb-6 sm:pb-8 bg-white rounded-t-[0.75rem] rounded-b-[2rem] border-none">
          <CardHeader className="p-0 mb-6 text-center">
            <div className="mb-4 flex justify-center">
              <div className="w-16 h-16 rounded-full bg-[#193DAB]/[0.12] flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24">
                  <path fill="#1F2D58" fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2ZM3 12a9 9 0 1 1 18 0 9 9 0 0 1-18 0Zm9-4a1 1 0 0 1 1 1v4a1 1 0 1 1-2 0V9a1 1 0 0 1 1-1Zm0 8a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" clipRule="evenodd"/>
                </svg>
              </div>
            </div>
            <CardTitle className="h4 mb-3">{title}</CardTitle>
            <CardDescription className="p-regular text-[#1F2D58]/70">
              {description}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Link href="/login">
              <Button className="w-full">
                Probeer opnieuw
              </Button>
            </Link>
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
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center px-4 -mt-8" style={{ minHeight: 'calc(100vh - 160px)' }}>
        <Spinner className="size-8 text-[#1F2D58]" />
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
}
