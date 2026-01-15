"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Step1Props } from "./types";

export function Step1Personal({
  contact,
  setContact,
  emailSent,
  emailVerified,
  loading,
  isResending,
  emailError,
  setEmailError,
  onSubmit,
  onResendEmail,
  onClearState,
  onNextStep,
  onOpenRestartDialog,
  saving,
}: Step1Props) {
  // Not verified and email not sent yet - show form
  if (!emailSent && !emailVerified) {
    return (
      <div className="space-y-4">
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
          <Label htmlFor="role">Functie</Label>
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
            onClick={onSubmit}
            disabled={!contact.firstName || !contact.lastName || !contact.email || loading}
          >
            {loading ? "Bezig..." : "Email link sturen"}
          </Button>
        </div>
      </div>
    );
  }

  // Email sent but not verified yet - show waiting message
  if (emailSent && !emailVerified) {
    return (
      <Alert className="bg-[#193DAB]/[0.12] border-none">
        <AlertDescription className="text-[#1F2D58]">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path fill="#1F2D58" fillRule="evenodd" d="M20.204 4.01A2 2 0 0 1 22 6v12a2 2 0 0 1-1.796 1.99L20 20H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h16l.204.01ZM12 14 3 8.6V18a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V8.6L12 14ZM4 5a1 1 0 0 0-1 1v1.434l9 5.399 9-5.4V6a1 1 0 0 0-1-1H4Z" clipRule="evenodd"/>
              </svg>
            </div>
            <div className="flex-1">
              <strong className="block mb-1">Check je e-mail</strong>
              <p className="mb-2 text-sm">
                We hebben een e-mail gestuurd naar <strong>{contact.email}</strong> met een link om je email te verifiëren.
              </p>
              <p className="text-xs">
                Geen mail gezien? Check je spam of{" "}
                <button
                  onClick={onResendEmail}
                  disabled={isResending}
                  className="underline disabled:opacity-50"
                >
                  {isResending ? "Bezig..." : "verstuur 'm opnieuw"}
                </button>
                .
              </p>
              <p className="text-xs mt-2">
                Verkeerd e-mailadres?{" "}
                <button
                  onClick={onClearState}
                  className="underline"
                >
                  Vul andere gegevens in
                </button>
              </p>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Email verified - show editable form with read-only email
  return (
    <div className="space-y-4">
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
            onClick={onOpenRestartDialog}
            className="underline hover:no-underline text-[#1F2D58]"
          >
            Start opnieuw
          </button>
          {" "}(alle huidige gegevens gaan verloren)
        </p>
      </div>
      <div className="space-y-3">
        <Label htmlFor="role">Functie</Label>
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
          onClick={onNextStep}
          disabled={!contact.firstName || !contact.lastName || saving}
        >
          {saving ? "Opslaan..." : "Volgende stap"}
        </Button>
      </div>
    </div>
  );
}
