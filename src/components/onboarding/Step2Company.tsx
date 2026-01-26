"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { KVKSearch } from "@/components/KVKSearch";
import type { Step2Props, EmployerInfo } from "./types";
import type { KVKSearchResult } from "@/lib/kvk";

interface Step2CompanyProps extends Step2Props {
  onKVKSelect: (result: KVKSearchResult) => Promise<void>;
  onKvkManualChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
}

export function Step2Company({
  register,
  setValue,
  watch,
  getValues,
  formErrors,
  saving,
  showKVKSearch,
  setShowKVKSearch,
  kvkSelected,
  setKvkSelected,
  kvkCheckResult,
  setKvkCheckResult,
  checkingKvk,
  duplicateEmployer,
  duplicateDialogOpen,
  setDuplicateDialogOpen,
  onPrevious,
  onNext,
  onStartJoinFlow,
  onKVKSelect,
  onKvkManualChange,
}: Step2CompanyProps) {
  // Local state for editing mode
  const [isEditingKvk, setIsEditingKvk] = useState(false);

  // Get current form values to check if KVK is already filled
  const currentKvk = watch("kvk");
  const currentCompanyName = watch("company_name");
  const currentCity = watch("invoice_city");
  const currentPostalCode = watch("invoice_postal-code");
  const currentStreet = watch("invoice_street");

  // Check if we have existing KVK data (user already selected a company)
  const hasExistingKvkData = currentKvk && currentKvk.length === 8 && currentCompanyName;

  // Handler for selecting a new KVK (wraps onKVKSelect to also exit editing mode)
  const handleKvkSelectWithEdit = async (result: KVKSearchResult) => {
    await onKVKSelect(result);
    setIsEditingKvk(false);
  };

  // KVK Edit screen - shown when user clicks "Wijzigen" on existing KVK
  if (showKVKSearch && hasExistingKvkData && isEditingKvk) {
    return (
      <div className="space-y-8">
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <h4>Ander bedrijf zoeken</h4>
              <p className="p-regular text-slate-600">
                Zoek een ander bedrijf of annuleer om terug te gaan naar je huidige selectie.
              </p>
            </div>
            <KVKSearch 
              onSelect={handleKvkSelectWithEdit} 
              onSkip={() => setShowKVKSearch(false)} 
              onSearchStart={() => setKvkCheckResult(null)}
            />
            
            {/* Inline alert for KVK duplicate */}
            {kvkCheckResult?.exists && (
              <Alert className="bg-[#193DAB]/[0.12] border-none">
                <AlertDescription className="text-[#1F2D58]">
                  <div className="flex flex-col sm:flex-row items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                        <path fill="#1F2D58" fillRule="evenodd" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm1 15h-2v-2h2v2Zm0-4h-2V7h2v6Z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <strong className="block mb-1">Bedrijf bestaat al</strong>
                      <p className="mb-2 text-sm">
                        Voor dit KVK-nummer bestaat al een account: <strong>{kvkCheckResult.employer?.company_name || kvkCheckResult.employer?.display_name}</strong>
                      </p>
                      <button
                        type="button"
                        onClick={() => kvkCheckResult.employer && onStartJoinFlow(kvkCheckResult.employer)}
                        className="text-sm underline hover:no-underline text-left"
                      >
                        Voeg jezelf toe aan dit werkgeversaccount
                      </button>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={() => {
              setIsEditingKvk(false);
              setKvkCheckResult(null);
            }}
            className="p-regular text-slate-500 underline hover:no-underline cursor-pointer transition-colors"
          >
            Annuleren
          </button>
        </div>

        {/* Duplicate Dialog */}
        <DuplicateDialog
          open={duplicateDialogOpen}
          onOpenChange={setDuplicateDialogOpen}
          employer={duplicateEmployer}
          onJoin={onStartJoinFlow}
        />
      </div>
    );
  }

  // KVK Summary screen - shown when user clicks "Vorige" but already has KVK data
  if (showKVKSearch && hasExistingKvkData) {
    const addressParts = [
      currentStreet,
      currentPostalCode,
      currentCity,
    ].filter(Boolean);

    return (
      <div className="space-y-8">
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <h4>Geselecteerd bedrijf</h4>
              <p className="p-regular text-slate-600">
                Je hebt al een bedrijf geselecteerd voor dit account.
              </p>
            </div>
            
            {/* Selected company card with edit button */}
            <div className="p-4 rounded-[0.75rem] bg-white border border-slate-200">
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1 flex-1">
                  <div className="font-semibold text-lg text-[#1F2D58]">{currentCompanyName}</div>
                  <div className="p-small text-slate-600">
                    KVK: {currentKvk}
                    {addressParts.length > 0 && (
                      <> • {addressParts.join(", ")}</>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingKvk(true);
                    setKvkCheckResult(null);
                  }}
                  className="p-small text-[#1F2D58] underline hover:no-underline cursor-pointer flex-shrink-0"
                >
                  Wijzigen
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={onPrevious}
            className="p-regular text-slate-500 underline hover:no-underline cursor-pointer transition-colors"
          >
            Vorige
          </button>
          <Button onClick={() => setShowKVKSearch(false)}>
            Volgende stap
          </Button>
        </div>
      </div>
    );
  }

  // KVK Search screen - shown when no KVK data exists yet
  if (showKVKSearch) {
    return (
      <div className="space-y-8">
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <h4>Bedrijfsgegevens ophalen</h4>
              <p className="p-regular text-slate-600">
                Vul je bedrijfsnaam of KVK-nummer in, zodat wij in de volgende stap je bedrijfsgegevens automatisch kunnen invullen.
              </p>
            </div>
            <KVKSearch 
              onSelect={onKVKSelect} 
              onSkip={() => setShowKVKSearch(false)} 
              onSearchStart={() => setKvkCheckResult(null)}
            />
            
            {/* Inline alert for KVK duplicate */}
            {kvkCheckResult?.exists && (
              <Alert className="bg-[#193DAB]/[0.12] border-none">
                <AlertDescription className="text-[#1F2D58]">
                  <div className="flex flex-col sm:flex-row items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                        <path fill="#1F2D58" fillRule="evenodd" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm1 15h-2v-2h2v2Zm0-4h-2V7h2v6Z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <strong className="block mb-1">Bedrijf bestaat al</strong>
                      <p className="mb-2 text-sm">
                        Voor dit KVK-nummer bestaat al een account: <strong>{kvkCheckResult.employer?.company_name || kvkCheckResult.employer?.display_name}</strong>
                      </p>
                      <button
                        type="button"
                        onClick={() => kvkCheckResult.employer && onStartJoinFlow(kvkCheckResult.employer)}
                        className="text-sm underline hover:no-underline text-left"
                      >
                        Voeg jezelf toe aan dit werkgeversaccount
                      </button>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={onPrevious}
            className="p-regular text-slate-500 underline hover:no-underline cursor-pointer transition-colors"
          >
            Vorige
          </button>
          <button
            type="button"
            onClick={() => setShowKVKSearch(false)}
            className="p-regular text-slate-500 underline hover:no-underline cursor-pointer transition-colors"
          >
            Overslaan en handmatig invullen
          </button>
        </div>

        {/* Duplicate Dialog */}
        <DuplicateDialog
          open={duplicateDialogOpen}
          onOpenChange={setDuplicateDialogOpen}
          employer={duplicateEmployer}
          onJoin={onStartJoinFlow}
        />
      </div>
    );
  }

  // Company & Billing Form
  return (
    <div className="space-y-8">
      {/* Company Data Section */}
      <div className="space-y-4">
        <h4>Algemene gegevens</h4>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="company_name">Naam organisatie <span className="text-slate-400 text-sm">*</span></Label>
            <Input
              id="company_name"
              {...register("company_name")}
              className={formErrors.company_name ? "border-red-500" : ""}
            />
            {formErrors.company_name && (
              <p className="text-sm text-red-500">{formErrors.company_name}</p>
            )}
          </div>
          <div className="space-y-3">
            <Label htmlFor="phone">Telefoonnummer <span className="text-slate-400 text-sm">*</span></Label>
            <Input
              id="phone"
              type="tel"
              {...register("phone")}
              className={formErrors.phone ? "border-red-500" : ""}
            />
            {formErrors.phone && (
              <p className="text-sm text-red-500">{formErrors.phone}</p>
            )}
          </div>
          {/* KVK en Website-URL naast elkaar op desktop */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="space-y-2 sm:w-1/2">
                <Label htmlFor="kvk">KVK-nummer <span className="text-slate-400 text-sm">*</span></Label>
                <Input
                  id="kvk"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={8}
                  placeholder="12345678"
                  value={watch("kvk") || ""}
                  onChange={onKvkManualChange}
                  className={formErrors.kvk ? "border-red-500" : ""}
                />
                {checkingKvk && (
                  <p className="text-sm text-slate-500">KVK-nummer controleren...</p>
                )}
                {formErrors.kvk && (
                  <p className="text-sm text-red-500">{formErrors.kvk}</p>
                )}
              </div>
              <div className="space-y-2 sm:w-1/2">
                <Label htmlFor="website_url">Website-URL <span className="text-slate-400 text-sm">*</span></Label>
                <Input 
                  id="website_url" 
                  type="url" 
                  {...register("website_url")} 
                  placeholder="https://www.voorbeeld.nl"
                  className={formErrors.website_url ? "border-red-500" : ""}
                />
                {formErrors.website_url && (
                  <p className="text-sm text-red-500">{formErrors.website_url}</p>
                )}
              </div>
            </div>
            {/* KVK duplicate alert - volle breedte */}
            {kvkCheckResult?.exists && !kvkSelected && (
              <Alert className="bg-[#193DAB]/[0.12] border-none">
                <AlertDescription className="text-[#1F2D58]">
                  <div className="flex flex-col sm:flex-row items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                        <path fill="#1F2D58" fillRule="evenodd" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm1 15h-2v-2h2v2Zm0-4h-2V7h2v6Z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <strong className="block mb-1">Bedrijf bestaat al</strong>
                      <p className="mb-2 text-sm">
                        Voor dit KVK-nummer bestaat al een account: <strong>{kvkCheckResult.employer?.company_name || kvkCheckResult.employer?.display_name}</strong>
                      </p>
                      <button
                        type="button"
                        onClick={() => kvkCheckResult.employer && onStartJoinFlow(kvkCheckResult.employer)}
                        className="text-sm underline hover:no-underline text-left"
                      >
                        Voeg jezelf toe aan dit werkgeversaccount
                      </button>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </div>

      {/* Billing Data Section */}
      <div className="space-y-4">
        <h4>Factuurgegevens</h4>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          {/* Rij 1: Contact (volle breedte op mobiel, 2.5 cols op desktop) | Email (2.5 cols) */}
          <div className="space-y-2 sm:col-span-5 md:col-span-2">
            <Label htmlFor="invoice_contact_name">Contactpersoon facturatie <span className="text-slate-400 text-sm">*</span></Label>
            <Input
              id="invoice_contact_name"
              {...register("invoice_contact_name")}
              className={formErrors.invoice_contact_name ? "border-red-500" : ""}
            />
            {formErrors.invoice_contact_name && (
              <p className="text-sm text-red-500">{formErrors.invoice_contact_name}</p>
            )}
          </div>
          <div className="space-y-2 sm:col-span-5 md:col-span-3">
            <Label htmlFor="invoice_email">Facturatie e-mailadres <span className="text-slate-400 text-sm">*</span></Label>
            <Input
              id="invoice_email"
              type="email"
              {...register("invoice_email")}
              className={formErrors.invoice_email ? "border-red-500" : ""}
            />
            {formErrors.invoice_email && (
              <p className="text-sm text-red-500">{formErrors.invoice_email}</p>
            )}
          </div>

          {/* Rij 2: Straat (40% = 2 cols) | Postcode (20% = 1 col) | Plaats (40% = 2 cols) */}
          <div className="space-y-2 sm:col-span-5 md:col-span-2">
            <Label htmlFor="invoice_street">Straat en huisnummer <span className="text-slate-400 text-sm">*</span></Label>
            <Input
              id="invoice_street"
              placeholder="Voorbeeldstraat 123"
              {...register("invoice_street")}
              className={formErrors.invoice_street ? "border-red-500" : ""}
            />
            {formErrors.invoice_street && (
              <p className="text-sm text-red-500">{formErrors.invoice_street}</p>
            )}
          </div>
          <div className="space-y-2 sm:col-span-2 md:col-span-1">
            <Label htmlFor="invoice_postal-code">Postcode <span className="text-slate-400 text-sm">*</span></Label>
            <Input
              id="invoice_postal-code"
              placeholder="1234 AB"
              {...register("invoice_postal-code")}
              className={formErrors["invoice_postal-code"] ? "border-red-500" : ""}
            />
            {formErrors["invoice_postal-code"] && (
              <p className="p-small text-red-500">{formErrors["invoice_postal-code"]}</p>
            )}
          </div>
          <div className="space-y-2 sm:col-span-3 md:col-span-2">
            <Label htmlFor="invoice_city">Plaats <span className="text-slate-400 text-sm">*</span></Label>
            <Input
              id="invoice_city"
              {...register("invoice_city")}
              className={formErrors.invoice_city ? "border-red-500" : ""}
            />
            {formErrors.invoice_city && (
              <p className="text-sm text-red-500">{formErrors.invoice_city}</p>
            )}
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-between items-center">
        <button
          type="button"
          onClick={() => setShowKVKSearch(true)}
          className="p-regular text-slate-500 underline hover:no-underline cursor-pointer transition-colors"
        >
          Vorige
        </button>
        <Button 
          onClick={onNext}
          disabled={saving}
        >
          {saving ? "Opslaan..." : "Volgende stap"}
        </Button>
      </div>

      {/* Duplicate Dialog */}
      <DuplicateDialog
        open={duplicateDialogOpen}
        onOpenChange={setDuplicateDialogOpen}
        employer={duplicateEmployer}
        onJoin={onStartJoinFlow}
      />
    </div>
  );
}

// Separate dialog component
function DuplicateDialog({
  open,
  onOpenChange,
  employer,
  onJoin,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employer: EmployerInfo | null;
  onJoin: (employer: EmployerInfo) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bedrijf bestaat al</DialogTitle>
          <DialogDescription>
            Voor dit KVK-nummer bestaat al een account:{" "}
            <strong>{employer?.company_name || employer?.display_name}</strong>
          </DialogDescription>
        </DialogHeader>
        <p className="p-regular mb-4">
          Werk je hier? Je kunt jezelf toevoegen aan dit bestaande werkgeversaccount.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button onClick={() => employer && onJoin(employer)}>
            Voeg jezelf toe
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
