"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import type { Step1Props } from "./types";

// Email validation regex that matches Zod's email validation
// Must have: local part, @, domain with at least one dot, TLD of 2+ chars
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

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
  // Handle form submission with email validation
  const handleSubmit = () => {
    // Validate email format before submitting
    if (!isValidEmail(contact.email)) {
      setEmailError("Voer een geldig e-mailadres in (bijv. naam@bedrijf.nl)");
      toast.error("Ongeldig e-mailadres", {
        description: "Controleer of je e-mailadres correct is geschreven.",
      });
      return;
    }
    onSubmit();
  };

  // Not verified and email not sent yet - show form
  if (!emailSent && !emailVerified) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <Label htmlFor="firstName">Voornaam <span className="text-slate-400 text-sm">*</span></Label>
            <Input
              id="firstName"
              value={contact.firstName}
              onChange={(e) =>
                setContact((c) => ({ ...c, firstName: e.target.value }))
              }
            />
          </div>
          <div className="space-y-3">
            <Label htmlFor="lastName">Achternaam <span className="text-slate-400 text-sm">*</span></Label>
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
          <Label htmlFor="email-step1">E-mailadres <span className="text-slate-400 text-sm">*</span></Label>
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
              {emailError.includes("bestaat al") ? (
                <>
                  Er bestaat al een account met dit e-mailadres.{" "}
                  <Link href="/login" className="underline hover:text-red-700">
                    Log in
                  </Link>{" "}
                  om verder te gaan.
                </>
              ) : (
                emailError
              )}
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
        <div className="mt-4 flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={!contact.firstName || !contact.lastName || !contact.email || loading}
          >
            {loading ? "Bezig..." : "Verstuur email link"}
          </Button>
        </div>
      </div>
    );
  }

  // Email sent but not verified yet - show waiting message
  if (emailSent && !emailVerified) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-6 text-center bg-[#193DAB]/[0.12] rounded-lg">
        <div className="flex size-10 sm:size-16 shrink-0 items-center justify-center rounded-full bg-white mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 sm:w-7 sm:h-7" fill="none" viewBox="0 0 24 24">
            <path fill="#1F2D58" fillRule="evenodd" d="M20.204 4.01A2 2 0 0 1 22 6v12a2 2 0 0 1-1.796 1.99L20 20H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h16l.204.01ZM12 14 3 8.6V18a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V8.6L12 14ZM4 5a1 1 0 0 0-1 1v1.434l9 5.399 9-5.4V6a1 1 0 0 0-1-1H4Z" clipRule="evenodd"/>
          </svg>
        </div>
        <div className="max-w-md space-y-3">
          <h3 className="text-lg font-semibold text-[#1F2D58]">
            Bevestig je e-mailadres<br />om verder te gaan
          </h3>
          <p className="p-regular text-slate-600">
            We hebben een activatielink gestuurd naar<br />
            <strong className="text-[#1F2D58] break-all">{contact.email}</strong>.
          </p>
          <p className="p-small text-slate-500 !mt-7">
            Geen mail gezien? Check je spam of{" "}
            <button
              onClick={onResendEmail}
              disabled={isResending}
              className="underline hover:no-underline disabled:opacity-50"
            >
              {isResending ? "Bezig..." : "verstuur 'm opnieuw"}
            </button>
            .
          </p>
          <p className="p-small text-slate-500 !mt-0.5">
            Verkeerd e-mailadres?{" "}
            <button
              onClick={onClearState}
              className="underline hover:no-underline"
            >
              Vul andere gegevens in
            </button>
          </p>
        </div>
      </div>
    );
  }

  // Email verified - show editable form with read-only email
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <Label htmlFor="firstName">Voornaam <span className="text-slate-400 text-sm">*</span></Label>
          <Input
            id="firstName"
            value={contact.firstName}
            onChange={(e) =>
              setContact((c) => ({ ...c, firstName: e.target.value }))
            }
          />
        </div>
        <div className="space-y-3">
          <Label htmlFor="lastName">Achternaam <span className="text-slate-400 text-sm">*</span></Label>
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
        <Label htmlFor="email-verified">E-mailadres <span className="text-slate-400 text-sm">*</span></Label>
        <Input
          id="email-verified"
          type="email"
          value={contact.email}
          disabled
          className="bg-slate-100 text-slate-600"
        />
        <p className="p-small text-slate-500">
          E-mail kan niet meer gewijzigd worden, omdat deze al gevalideerd is.
          <br />
          Wil je toch wijzigen?{" "}
          <button
            type="button"
            onClick={onOpenRestartDialog}
            className="underline hover:no-underline text-[#1F2D58]"
          >
            Start dan opnieuw
          </button>
          .
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
