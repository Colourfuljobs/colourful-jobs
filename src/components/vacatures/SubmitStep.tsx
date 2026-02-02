"use client";

import * as React from "react";
import Link from "next/link";
import { Check, ChevronDown, AlertCircle, Building2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { SubmitStepProps, InvoiceDetails } from "./types";

export function SubmitStep({
  selectedPackage,
  selectedUpsells,
  availableUpsells,
  availableCredits,
  onToggleUpsell,
  onBuyCredits,
  onInvoiceDetailsChange,
  showInvoiceError = false,
  profileComplete = true,
  profileEditUrl,
}: SubmitStepProps) {
  // Get features from the selected package
  const features = selectedPackage.populatedFeatures || [];

  // Calculate if user has enough credits
  const packageCredits = selectedPackage.credits || 0;
  const upsellCredits = selectedUpsells.reduce((sum, u) => sum + u.credits, 0);
  const totalCredits = packageCredits + upsellCredits;
  const hasEnoughCredits = availableCredits >= totalCredits;

  // Invoice details state
  const [useAccountDetails, setUseAccountDetails] = React.useState(false);
  const [isLoadingAccountDetails, setIsLoadingAccountDetails] = React.useState(false);
  const [invoiceDetailsOpen, setInvoiceDetailsOpen] = React.useState(false);
  const [invoiceDetails, setInvoiceDetails] = React.useState<InvoiceDetails>({
    contact_name: "",
    email: "",
    street: "",
    postal_code: "",
    city: "",
    reference_nr: "",
  });

  // Track if account has missing billing details
  const [hasMissingBillingDetails, setHasMissingBillingDetails] = React.useState(false);

  const fetchAccountDetails = async () => {
    setIsLoadingAccountDetails(true);
    setHasMissingBillingDetails(false);
    try {
      const response = await fetch("/api/account");
      if (!response.ok) {
        throw new Error("Failed to fetch account");
      }
      const data = await response.json();
      const billing = data.billing || {};
      const details: InvoiceDetails = {
        contact_name: billing.invoice_contact_name || "",
        email: billing.invoice_email || "",
        street: billing.invoice_street || "",
        postal_code: billing["invoice_postal-code"] || "",
        city: billing.invoice_city || "",
        reference_nr: billing["reference-nr"] || "",
      };
      setInvoiceDetails(details);
      
      // Check if required billing fields are filled
      const hasRequiredFields = details.contact_name && details.email && 
        details.street && details.postal_code && details.city;
      
      if (hasRequiredFields) {
        onInvoiceDetailsChange(details);
        setHasMissingBillingDetails(false);
      } else {
        // Account doesn't have complete billing details
        setHasMissingBillingDetails(true);
        onInvoiceDetailsChange(null);
      }
    } catch (error) {
      console.error("Error fetching account details:", error);
      toast.error("Fout", {
        description: "Kon factuurgegevens niet ophalen",
      });
      onInvoiceDetailsChange(null);
    } finally {
      setIsLoadingAccountDetails(false);
    }
  };

  const handleUseAccountDetailsChange = (checked: boolean) => {
    setUseAccountDetails(checked);
    if (checked) {
      fetchAccountDetails();
    } else {
      setInvoiceDetails({
        contact_name: "",
        email: "",
        street: "",
        postal_code: "",
        city: "",
        reference_nr: "",
      });
      onInvoiceDetailsChange(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white/50 rounded-[0.75rem] pt-4 px-6 pb-6 mt-6">
        <h2 className="text-xl font-bold text-[#1F2D58] mb-1">4. Vacature plaatsen</h2>
        <p className="text-[#1F2D58]/70 text-sm">
          Je rekent nu af om je vacature te publiceren.
        </p>
      </div>

      {/* Profile status message */}
      {!profileComplete ? (
        <Alert className="bg-[#F86600]/10 border-none p-6">
          <AlertDescription className="text-[#1F2D58]">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center">
                <Building2 className="w-5 h-5 text-[#F86600]" />
              </div>
              <div className="flex-1">
                <strong className="block mb-1">Werkgeversprofiel niet compleet</strong>
                <p className="text-sm mb-3">
                  Om een vacature in te sturen heb je een compleet werkgeversprofiel nodig. Vul deze eerst aan.
                </p>
                {profileEditUrl && (
                  <Link href={profileEditUrl}>
                    <Button>
                      Werkgeversprofiel invullen
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="bg-[#2F9D07]/10 border-none p-6">
          <AlertDescription className="text-[#1F2D58]">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center">
                <Check className="w-5 h-5 text-[#2F9D07]" />
              </div>
              <div className="flex-1">
                <strong className="block mb-1">Je werkgeversprofiel is compleet</strong>
                <p className="text-sm">
                  Je kunt nu je vacature indienen.
                </p>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Package summary */}
      <div className={`bg-white p-6 ${availableUpsells.length === 0 ? "rounded-t-[0.75rem] rounded-b-[2rem]" : "rounded-[0.75rem]"}`}>
        <p className="text-xs text-[#1F2D58]/60 mb-1">Gekozen pakket</p>
        <h3 className="text-lg font-bold text-[#1F2D58] mb-4">{selectedPackage.display_name}</h3>

        <ul className="space-y-1.5 text-sm text-[#1F2D58]">
          {features.map((feature) => (
            <li key={feature.id} className="flex items-start gap-2">
              <Check className="w-4 h-4 text-[#2F9D07] shrink-0 mt-0.5" />
              <span>{feature.display_name}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Invoice details section - only show when not enough credits */}
      {!hasEnoughCredits && (
      <div className={cn(
        "rounded-[0.75rem] p-4 transition-colors",
        showInvoiceError && !useAccountDetails
          ? "border-2 border-red-500 bg-red-50"
          : "border border-[#1F2D58]/10",
        invoiceDetailsOpen && useAccountDetails && invoiceDetails.contact_name
          ? "bg-white"
          : !showInvoiceError || useAccountDetails ? "bg-transparent" : ""
      )}>
        {/* Checkbox and collapsible toggle row */}
        <div className="flex items-center justify-between">
          {/* Checkbox to load from account */}
          <Field orientation="horizontal" className="justify-start items-center w-auto">
            <Checkbox
              id="useAccountDetails"
              checked={useAccountDetails}
              onCheckedChange={handleUseAccountDetailsChange}
            />
<FieldLabel
                    htmlFor="useAccountDetails"
                    className={cn(
                      "text-sm cursor-pointer !mb-0 leading-none -mt-0.5",
                      showInvoiceError && !useAccountDetails
                        ? "text-red-600 font-medium"
                        : "text-[#1F2D58]"
                    )}
                  >
                    Haal factuurgegevens op uit account <span className={showInvoiceError && !useAccountDetails ? "text-red-400" : "text-slate-400"}>*</span>
                  </FieldLabel>
            {isLoadingAccountDetails && <Spinner className="h-4 w-4" />}
          </Field>

          {/* Collapsible invoice details toggle */}
          {useAccountDetails && invoiceDetails.contact_name && (
            <button
              type="button"
              onClick={() => setInvoiceDetailsOpen(!invoiceDetailsOpen)}
              className="flex items-center gap-2 text-sm text-[#1F2D58]/70 hover:text-[#1F2D58] transition-colors"
            >
              {invoiceDetailsOpen ? "Verberg factuurgegevens" : "Bekijk factuurgegevens"}
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  invoiceDetailsOpen && "rotate-180"
                )}
              />
            </button>
          )}
        </div>

        {/* Warning when account has missing billing details */}
        {useAccountDetails && hasMissingBillingDetails && !isLoadingAccountDetails && (
          <Alert className="mt-4 bg-[#F86600]/10 border-none">
            <AlertDescription className="text-[#1F2D58]">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-[#F86600]" />
                </div>
                <div className="flex-1">
                  <strong className="block mb-1">Factuurgegevens ontbreken</strong>
                  <p className="text-sm mb-2">
                    Vul eerst je factuurgegevens in bij je accountinstellingen voordat je de vacature kunt insturen.
                  </p>
                  <Link 
                    href="/dashboard/gegevens" 
                    className="text-sm font-medium text-[#F86600] hover:underline"
                  >
                    Ga naar accountinstellingen →
                  </Link>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Collapsible invoice details content */}
        {useAccountDetails && invoiceDetails.contact_name && invoiceDetailsOpen && (
          <div className="mt-4 space-y-4">
            {/* Row 1: Ref nr (1/3) - Contact person (1/3) - Email (1/3) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reference_nr" className="text-[#1F2D58]">
                  Referentienummer
                </Label>
                <Input
                  id="reference_nr"
                  value={invoiceDetails.reference_nr}
                  onChange={(e) =>
                    setInvoiceDetails({
                      ...invoiceDetails,
                      reference_nr: e.target.value,
                    })
                  }
                  placeholder="Uw referentie"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_name" className="text-[#1F2D58]">
                  Contactpersoon
                </Label>
                <Input
                  id="contact_name"
                  value={invoiceDetails.contact_name}
                  onChange={(e) =>
                    setInvoiceDetails({
                      ...invoiceDetails,
                      contact_name: e.target.value,
                    })
                  }
                  placeholder="Naam contactpersoon"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#1F2D58]">
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={invoiceDetails.email}
                  onChange={(e) =>
                    setInvoiceDetails({
                      ...invoiceDetails,
                      email: e.target.value,
                    })
                  }
                  placeholder="factuur@bedrijf.nl"
                />
              </div>
            </div>

            {/* Row 2: Street (40%) - Postal code (20%) - City (40%) */}
            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_2fr] gap-4">
              <div className="space-y-2">
                <Label htmlFor="street" className="text-[#1F2D58]">
                  Straat en huisnummer
                </Label>
                <Input
                  id="street"
                  value={invoiceDetails.street}
                  onChange={(e) =>
                    setInvoiceDetails({
                      ...invoiceDetails,
                      street: e.target.value,
                    })
                  }
                  placeholder="Straatnaam 123"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="postal_code" className="text-[#1F2D58]">
                  Postcode
                </Label>
                <Input
                  id="postal_code"
                  value={invoiceDetails.postal_code}
                  onChange={(e) =>
                    setInvoiceDetails({
                      ...invoiceDetails,
                      postal_code: e.target.value,
                    })
                  }
                  placeholder="1234 AB"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city" className="text-[#1F2D58]">
                  Plaats
                </Label>
                <Input
                  id="city"
                  value={invoiceDetails.city}
                  onChange={(e) =>
                    setInvoiceDetails({
                      ...invoiceDetails,
                      city: e.target.value,
                    })
                  }
                  placeholder="Amsterdam"
                />
              </div>
            </div>

            <p className="text-xs text-[#1F2D58]/60">
              De bovenstaande factuurgegevens worden uitsluitend voor deze aankoop gebruikt.
            </p>
          </div>
        )}
      </div>
      )}

      {/* Upsells selection */}
      {availableUpsells.length > 0 && (
        <div className="bg-white p-6 rounded-t-[0.75rem] rounded-b-[2rem]">
          <h3 className="text-lg font-bold text-[#1F2D58] mb-1">Kies extra&apos;s</h3>
          <p className="text-sm text-[#1F2D58]/70 mb-4">
            Vergroot de zichtbaarheid van je vacature
          </p>

          <div className="space-y-3">
            {availableUpsells.map((upsell) => {
              const isSelected = selectedUpsells.some((s) => s.id === upsell.id);
              
              return (
                <label
                  key={upsell.id}
                  htmlFor={`upsell-${upsell.id}`}
                  className={`block p-4 border rounded-lg cursor-pointer transition-colors ${
                    isSelected 
                      ? "border-[#2F9D07]/30 bg-[#2F9D07]/5" 
                      : "border-[#1F2D58]/10 hover:border-[#1F2D58]/30"
                  }`}
                >
                  {/* Top row: checkbox + title + credits */}
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id={`upsell-${upsell.id}`}
                      checked={isSelected}
                      onCheckedChange={() => onToggleUpsell(upsell)}
                    />
                    <span className="font-medium text-[#1F2D58] flex-1">
                      {upsell.display_name}
                    </span>
                    <span className="text-sm text-[#1F2D58] font-medium shrink-0">
                      +{upsell.credits} credits
                    </span>
                  </div>
                  
                  {/* Description below */}
                  {upsell.description && (
                    <p className="text-sm text-[#1F2D58]/60 mt-1 ml-7">
                      {upsell.description}
                    </p>
                  )}
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
