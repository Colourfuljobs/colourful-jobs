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

// Floating label input component for step 1
interface FloatingInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  error?: boolean;
  className?: string;
}

function FloatingInput({
  id,
  label,
  value,
  onChange,
  type = "text",
  required = false,
  disabled = false,
  error = false,
  className = "",
}: FloatingInputProps) {
  const hasValue = value.length > 0;
  
  return (
    <div className="relative">
      <Input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder=" "
        className={`peer h-12 pt-5 pb-1 px-4 text-sm ${disabled ? "bg-slate-100 text-slate-600" : ""} ${error ? "border-red-500" : ""} ${className}`}
      />
      <Label
        htmlFor={id}
        className={`absolute left-4 transition-all duration-200 pointer-events-none
          ${hasValue || disabled
            ? "top-1 text-xs text-[#1F2D58]/60"
            : "top-1/2 -translate-y-1/2 text-sm text-slate-500"
          }
          peer-focus:top-1 peer-focus:text-xs peer-focus:text-[#1F2D58]/60 peer-focus:translate-y-0`}
      >
        {label}
      </Label>
    </div>
  );
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
        <FloatingInput
          id="firstName"
          label="Voornaam"
          value={contact.firstName}
          onChange={(e) => setContact((c) => ({ ...c, firstName: e.target.value }))}
          required
        />
        <FloatingInput
          id="lastName"
          label="Achternaam"
          value={contact.lastName}
          onChange={(e) => setContact((c) => ({ ...c, lastName: e.target.value }))}
          required
        />
        <div>
          <FloatingInput
            id="email-step1"
            label="E-mailadres"
            type="email"
            value={contact.email}
            onChange={(e) => {
              setContact((c) => ({ ...c, email: e.target.value }));
              if (emailError) setEmailError(null);
            }}
            error={!!emailError}
            required
          />
          {emailError && (
            <p className="text-sm text-red-500 mt-2">
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
        <div className="mt-4 flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={!contact.firstName || !contact.lastName || !contact.email || loading}
          >
            {loading ? "Bezig..." : "Stuur e-mail link"}
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
      <FloatingInput
        id="firstName-verified"
        label="Voornaam"
        value={contact.firstName}
        onChange={(e) => setContact((c) => ({ ...c, firstName: e.target.value }))}
        required
      />
      <FloatingInput
        id="lastName-verified"
        label="Achternaam"
        value={contact.lastName}
        onChange={(e) => setContact((c) => ({ ...c, lastName: e.target.value }))}
        required
      />
      <div>
        <FloatingInput
          id="email-verified"
          label="E-mailadres"
          type="email"
          value={contact.email}
          onChange={() => {}}
          disabled
          required
        />
        <p className="p-small text-slate-500 mt-2">
          E-mail kan niet meer gewijzigd worden, omdat deze al gevalideerd is. Wil je toch wijzigen?{" "}
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
