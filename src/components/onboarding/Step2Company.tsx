"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { KVKSearch } from "@/components/KVKSearch";
import { countries } from "@/lib/countries";
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
  kvkCheckResult,
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
  // KVK Search screen
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
            <KVKSearch onSelect={onKVKSelect} onSkip={() => setShowKVKSearch(false)} />
            
            {/* Inline alert for KVK duplicate */}
            {kvkCheckResult?.exists && (
              <Alert className="bg-[#193DAB]/[0.12] border-none">
                <AlertDescription className="text-[#1F2D58]">
                  <div className="flex items-start gap-3">
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

        <div className="flex justify-start">
          <button
            type="button"
            onClick={onPrevious}
            className="p-regular text-slate-500 underline hover:no-underline cursor-pointer transition-colors"
          >
            Vorige
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
        <h4>Bedrijfsgegevens</h4>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="company_name">Juridische bedrijfsnaam *</Label>
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
            <Label htmlFor="phone">Telefoonnummer *</Label>
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
          {/* KVK en Website-URL naast elkaar */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex gap-4">
              <div className="space-y-2 w-1/2">
                <Label htmlFor="kvk">KVK-nummer *</Label>
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
              <div className="space-y-2 w-1/2">
                <Label htmlFor="website_url">Website-URL *</Label>
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
                  <div className="flex items-start gap-3">
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
        <div className="grid grid-cols-5 gap-4">
          {/* Rij 1: Ref (1) | Contact (2) | Email (2) */}
          <div className="space-y-2 col-span-1">
            <Label htmlFor="reference-nr">Ref.nr.</Label>
            <Input id="reference-nr" {...register("reference-nr")} />
          </div>
          <div className="space-y-2 col-span-2">
            <Label htmlFor="invoice_contact_name">Contactpersoon facturatie *</Label>
            <Input
              id="invoice_contact_name"
              {...register("invoice_contact_name")}
              className={formErrors.invoice_contact_name ? "border-red-500" : ""}
            />
            {formErrors.invoice_contact_name && (
              <p className="text-sm text-red-500">{formErrors.invoice_contact_name}</p>
            )}
          </div>
          <div className="space-y-2 col-span-2">
            <Label htmlFor="invoice_email">E-mail facturatie *</Label>
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

          {/* Rij 2: Straat (3) | Nr (1) | Toev (1) */}
          <div className="space-y-2 col-span-3">
            <Label htmlFor="invoice_street">Straat *</Label>
            <Input
              id="invoice_street"
              {...register("invoice_street")}
              className={formErrors.invoice_street ? "border-red-500" : ""}
            />
            {formErrors.invoice_street && (
              <p className="text-sm text-red-500">{formErrors.invoice_street}</p>
            )}
          </div>
          <div className="space-y-2 col-span-1">
            <Label htmlFor="invoice_house-nr">Nr. *</Label>
            <Input
              id="invoice_house-nr"
              {...register("invoice_house-nr")}
              className={formErrors["invoice_house-nr"] ? "border-red-500" : ""}
            />
            {formErrors["invoice_house-nr"] && (
              <p className="p-small text-red-500">{formErrors["invoice_house-nr"]}</p>
            )}
          </div>
          <div className="space-y-2 col-span-1">
            <Label htmlFor="invoice_house-nr-add">Toev.</Label>
            <Input id="invoice_house-nr-add" {...register("invoice_house-nr-add")} />
          </div>

          {/* Rij 3: Postcode (1) | Plaats (2) | Land (2) */}
          <div className="space-y-2 col-span-1">
            <Label htmlFor="invoice_postal-code">Postcode *</Label>
            <Input
              id="invoice_postal-code"
              {...register("invoice_postal-code")}
              className={formErrors["invoice_postal-code"] ? "border-red-500" : ""}
            />
            {formErrors["invoice_postal-code"] && (
              <p className="p-small text-red-500">{formErrors["invoice_postal-code"]}</p>
            )}
          </div>
          <div className="space-y-2 col-span-2">
            <Label htmlFor="invoice_city">Plaats *</Label>
            <Input
              id="invoice_city"
              {...register("invoice_city")}
              className={formErrors.invoice_city ? "border-red-500" : ""}
            />
            {formErrors.invoice_city && (
              <p className="text-sm text-red-500">{formErrors.invoice_city}</p>
            )}
          </div>
          <div className="space-y-2 col-span-2">
            <Label htmlFor="invoice_country">Land *</Label>
            <Select
              id="invoice_country"
              {...register("invoice_country")}
              className={formErrors.invoice_country ? "border-red-500" : ""}
            >
              <option value="">Selecteer een land</option>
              {countries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </Select>
            {formErrors.invoice_country && (
              <p className="text-sm text-red-500">{formErrors.invoice_country}</p>
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
