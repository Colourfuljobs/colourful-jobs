"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await signIn("email", { 
        email, 
        redirect: false,
        callbackUrl: "/dashboard"
      });
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Card className="p-8">
        <CardHeader>
          <CardTitle>Inloggen voor werkgevers</CardTitle>
          <CardDescription className="p-regular mt-2">
            Vul je e-mailadres in en we sturen je een magic link om veilig in te
            loggen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mailadres</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jouw@email.nl"
              />
            </div>
            <Button type="submit" disabled={!email || loading}>
              {loading ? "Versturen..." : "Verstuur magic link"}
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
                    <p className="text-xs">Geen mail gezien? Check je spam of verstuur &apos;m opnieuw.</p>
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


