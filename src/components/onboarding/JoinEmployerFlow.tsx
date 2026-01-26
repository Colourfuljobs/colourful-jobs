"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { JoinFlowProps } from "./types";

export function JoinEmployerFlow({
  joinEmployer,
  joinEmail,
  setJoinEmail,
  joinDomainError,
  setJoinDomainError,
  joinStep,
  joinLoading,
  joinContact,
  setJoinContact,
  joinResending,
  sessionEmail,
  onSubmit,
  onResendEmail,
  onCancel,
}: JoinFlowProps) {
  const isSameEmail = sessionEmail && joinEmail.toLowerCase() === sessionEmail.toLowerCase();

  return (
    <div className="space-y-6">
      <p className="p-regular text-slate-600">
        Je voegt jezelf toe aan: <strong>{joinEmployer?.company_name || joinEmployer?.display_name}</strong>
      </p>

      {/* Combined confirm step - all fields in one screen */}
      {joinStep === "confirm" && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <Label htmlFor="join-firstName">Voornaam <span className="text-slate-400 text-sm">*</span></Label>
              <Input
                id="join-firstName"
                value={joinContact.firstName}
                onChange={(e) => setJoinContact(c => ({ ...c, firstName: e.target.value }))}
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="join-lastName">Achternaam <span className="text-slate-400 text-sm">*</span></Label>
              <Input
                id="join-lastName"
                value={joinContact.lastName}
                onChange={(e) => setJoinContact(c => ({ ...c, lastName: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-3">
            <Label htmlFor="join-email">Zakelijk e-mailadres <span className="text-slate-400 text-sm">*</span></Label>
            <Input
              id="join-email"
              type="email"
              value={joinEmail}
              onChange={(e) => {
                setJoinEmail(e.target.value);
                if (joinDomainError) setJoinDomainError(null);
              }}
              placeholder="jouw.naam@bedrijf.nl"
              className={joinDomainError ? "border-red-500" : ""}
            />
            {joinDomainError && (
              <Alert className="bg-red-50 border-red-200">
                <AlertDescription className="text-red-700">
                  {joinDomainError}
                </AlertDescription>
              </Alert>
            )}
            <p className="p-small text-slate-500">
              Je e-mailadres moet overeenkomen met het domein van het werkgeversaccount.
              {isSameEmail && (
                <span className="block mt-1 text-emerald-600">
                  Dit is je al geverifieerde e-mailadres — geen nieuwe verificatie nodig.
                </span>
              )}
            </p>
          </div>
          <div className="space-y-3">
            <Label htmlFor="join-role">Functie</Label>
            <Input
              id="join-role"
              value={joinContact.role}
              onChange={(e) => setJoinContact(c => ({ ...c, role: e.target.value }))}
            />
          </div>
          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={onCancel}
              className="p-regular text-slate-500 underline hover:no-underline cursor-pointer transition-colors"
            >
              Annuleren
            </button>
            <Button
              onClick={onSubmit}
              disabled={!joinContact.firstName || !joinContact.lastName || !joinEmail || joinLoading}
            >
              {joinLoading 
                ? "Bezig..." 
                : isSameEmail
                  ? "Toevoegen"
                  : "Verstuur verificatie e-mail"
              }
            </Button>
          </div>
        </div>
      )}

      {/* Verification step - only shown when different email is used */}
      {joinStep === "verification" && (
        <Alert className="bg-[#193DAB]/[0.12] border-none">
          <AlertDescription className="text-[#1F2D58]">
            <div className="flex flex-col sm:flex-row items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                  <path fill="#1F2D58" fillRule="evenodd" d="M20.204 4.01A2 2 0 0 1 22 6v12a2 2 0 0 1-1.796 1.99L20 20H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h16l.204.01ZM12 14 3 8.6V18a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V8.6L12 14ZM4 5a1 1 0 0 0-1 1v1.434l9 5.399 9-5.4V6a1 1 0 0 0-1-1H4Z" clipRule="evenodd"/>
                </svg>
              </div>
              <div className="flex-1 text-left">
                <strong className="block mb-1">Check je e-mail</strong>
                <p className="mb-2 text-sm">
                  We hebben een e-mail gestuurd naar <strong>{joinEmail}</strong> met een link om je toe te voegen aan {joinEmployer?.company_name || joinEmployer?.display_name}.
                </p>
                <p className="text-xs">
                  Geen mail gezien? Check je spam of{" "}
                  <button
                    onClick={onResendEmail}
                    disabled={joinResending}
                    className="underline disabled:opacity-50"
                  >
                    {joinResending ? "Bezig..." : "verstuur 'm opnieuw"}
                  </button>
                  .
                </p>
                <p className="text-xs mt-2">
                  Verkeerd e-mailadres?{" "}
                  <button
                    onClick={onCancel}
                    className="underline"
                  >
                    Wijzig je gegevens
                  </button>
                </p>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
