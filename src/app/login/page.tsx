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
            <Alert className="mt-4 border-emerald-200 bg-emerald-50">
              <AlertDescription className="text-emerald-700 text-xs">
                We hebben je een link gestuurd. Check je inbox om verder te gaan.
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


