"use client";

import * as React from "react";
import Link from "next/link";
import { Check, CheckCircle, AlertCircle, Building2, Pencil, Clock } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ExtensionCard } from "./ExtensionCard";
import type { SubmitStepProps, InvoiceDetails } from "./types";

export function SubmitStep({
  selectedPackage,
  selectedUpsells,
  availableUpsells,
  availableCredits,
  onToggleUpsell,
  onBuyCredits,
  onInvoiceDetailsChange,
  onChangePackage,
  showInvoiceError = false,
  profileComplete = true,
  profileEditUrl,
  extensionDateRange,
  selectedClosingDate,
  onClosingDateChange,
  currentClosingDate,
  inputType = "self_service",
  isSocialPostUpsell,
  onOpenColleaguesModal,
}: SubmitStepProps) {
  // Get features from the selected package
  const features = selectedPackage.populatedFeatures || [];

  // Extension datepicker local state
  const [datePickerOpen, setDatePickerOpen] = React.useState(false);

  // Calculate if user has enough credits
  const packageCredits = selectedPackage.credits || 0;
  const upsellCredits = selectedUpsells.reduce((sum, u) => sum + u.credits, 0);
  const totalCredits = packageCredits + upsellCredits;
  const hasEnoughCredits = availableCredits >= totalCredits;

  // Check if "Vandaag online" upsell is selected
  const hasVandaagOnline = selectedUpsells.some(
    (u) => u.slug === "prod_upsell_same_day"
  );

  // Check if current time is before 15:00 NL time
  const isBeforeCutoff = React.useMemo(() => {
    if (!hasVandaagOnline) return false;
    const now = new Date();
    const nlHour = Number(
      new Intl.DateTimeFormat("nl-NL", {
        hour: "numeric",
        hour12: false,
        timeZone: "Europe/Amsterdam",
      }).format(now)
    );
    return nlHour < 15;
  }, [hasVandaagOnline]);

  // Invoice details state
  const [isLoadingAccountDetails, setIsLoadingAccountDetails] = React.useState(false);
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

  // Auto-fetch account details on mount when invoice is needed
  const hasFetchedRef = React.useRef(false);
  React.useEffect(() => {
    if (hasEnoughCredits || hasFetchedRef.current) return;
    hasFetchedRef.current = true;

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

    fetchAccountDetails();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasEnoughCredits]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white/50 rounded-[0.75rem] pt-4 px-6 pb-6 mt-6">
        <h2 className="text-xl font-bold text-[#1F2D58] mb-1">4. Vacature plaatsen</h2>
        <p className="text-[#1F2D58]/70 text-sm">
          Je rekent nu af om je vacature te publiceren.
        </p>
      </div>

      {/* Review notice */}
      <Alert className="bg-[#193DAB]/[0.12] border-none">
        <AlertDescription className="text-[#1F2D58]">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-[#1F2D58]" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm">
                {inputType === "we_do_it_for_you" 
                  ? "Na plaatsing stelt ons team je vacature op. Je ontvangt een notificatie zodra je vacature gereed is of als er aanpassingen nodig zijn."
                  : "Na plaatsing wordt je vacature beoordeeld door ons team. Je ontvangt een notificatie zodra je vacature is goedgekeurd of als er aanpassingen nodig zijn."
                }{!hasEnoughCredits && " Je ontvangt de factuur automatisch per e-mail."}
              </p>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Profile status message - only show when profile is incomplete */}
      {!profileComplete && (
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
      )}

      {/* Package summary */}
      <div className="bg-white p-6 rounded-[0.75rem]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-[#1F2D58]/60 mb-1">Gekozen pakket</p>
            <h3 className="text-lg font-bold text-[#1F2D58] mb-4">{selectedPackage.display_name}</h3>
          </div>
          {onChangePackage && (
            <Button
              variant="link"
              onClick={onChangePackage}
              showArrow={false}
              className="shrink-0"
            >
              <Pencil className="h-4 w-4" />
              Wijzigen
            </Button>
          )}
        </div>

        <ul className="space-y-1.5 text-sm text-[#1F2D58]">
          {features.map((feature) => (
            <li key={feature.id} className="flex items-start gap-2">
              <Check className="w-4 h-4 text-[#2F9D07] shrink-0 mt-0.5" />
              <span>{feature.display_name}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Upsells selection */}
      {availableUpsells.length > 0 && (() => {
        // Sort all upsells by sort_order first
        const sortedUpsells = [...availableUpsells].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        
        // Separate extension upsell (until_max) from regular upsells while preserving order
        const extensionUpsell = sortedUpsells.find((u) => u.repeat_mode === "until_max");
        const regularUpsells = sortedUpsells.filter((u) => u.repeat_mode !== "until_max");
        const extensionSelected = extensionUpsell ? selectedUpsells.some((s) => s.id === extensionUpsell.id) : false;

        return (
          <div className="bg-white p-6 rounded-t-[0.75rem] rounded-b-[2rem]">
            <h3 className="text-lg font-bold text-[#1F2D58] mb-1">Kies extra&apos;s</h3>
            <p className="text-sm text-[#1F2D58]/70 mb-4">
              Vergroot de zichtbaarheid van je vacature
            </p>

            <div className="space-y-3">
              {/* Render all upsells in sort_order */}
              {sortedUpsells.map((upsell) => {
                // Extension upsell with datepicker (until_max)
                if (upsell.repeat_mode === "until_max" && extensionDateRange) {
                  return (
                    <ExtensionCard
                      key={upsell.id}
                      extensionUpsell={upsell}
                      isChecked={extensionSelected}
                      onToggle={(checked) => {
                        onToggleUpsell(upsell);
                        if (!checked && onClosingDateChange) {
                          onClosingDateChange(undefined);
                        }
                      }}
                      selectedDate={selectedClosingDate}
                      onSelectDate={(date) => onClosingDateChange?.(date)}
                      datePickerOpen={datePickerOpen}
                      onDatePickerOpenChange={setDatePickerOpen}
                      dateRange={extensionDateRange}
                      currentClosingDate={currentClosingDate}
                      idPrefix="submit"
                    />
                  );
                }

                // Regular upsells (checkboxes)
                const isSelected = selectedUpsells.some((s) => s.id === upsell.id);
                const isSameDay = upsell.slug === "prod_upsell_same_day";
                const sameDaySelected = isSameDay && isSelected;
                const isSocialPost = isSocialPostUpsell?.(upsell) ?? false;
                const socialPostSelected = isSocialPost && isSelected;

                // Determine border/bg based on state
                let labelClasses = "border-[#1F2D58]/10 hover:border-[#1F2D58]/30";
                if (isSelected) {
                  labelClasses = "border-[#41712F]/30 bg-[#DEEEE3]";
                }
                
                return (
                  <label
                    key={upsell.id}
                    htmlFor={`upsell-${upsell.id}`}
                    className={`block p-4 border rounded-lg cursor-pointer transition-colors ${labelClasses}`}
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
                        {upsell.credits} credits
                      </span>
                    </div>
                    
                    {/* Description below */}
                    {upsell.description && (
                      <p className="text-sm text-[#1F2D58]/60 mt-1 ml-7">
                        {upsell.description}
                      </p>
                    )}

                    {/* Social post: colleagues tagging option */}
                    {socialPostSelected && onOpenColleaguesModal && (
                      <div className="flex items-center gap-3 mt-3 ml-7">
                        <span className="text-sm font-medium text-[#1F2D58]">
                          Vergroot het bereik van je post
                        </span>
                        <Button
                          type="button"
                          variant="tertiary"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            onOpenColleaguesModal();
                          }}
                          showArrow={false}
                        >
                          Tag collega&apos;s
                        </Button>
                      </div>
                    )}

                    {/* Same day online: cutoff status message */}
                    {sameDaySelected && (
                      <div className="flex items-start gap-2 mt-3 ml-7 text-sm font-medium text-[#41712F]">
                        {isBeforeCutoff ? (
                          <>
                            <Check className="w-4 h-4 shrink-0 mt-[3px]" />
                            <span>Insturen is op tijd – je vacature wordt vandaag nog beoordeeld en gepubliceerd.</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-4 h-4 shrink-0 mt-[3px]" />
                            <span>Het is na 15:00 uur. Vaak lukt het ons nog wel om de vacature vandaag te plaatsen, maar mocht dat niet meer lukken, dan zorgen we ervoor dat deze morgenochtend vóór 12:00 uur online staat.</span>
                          </>
                        )}
                      </div>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Invoice details section - only show when not enough credits */}
      {!hasEnoughCredits && (
      <div className="bg-white rounded-t-[0.75rem] rounded-b-[2rem] p-6">
        <h3 className="text-lg font-bold text-[#1F2D58] mb-1">Factuurgegevens</h3>
        <p className="text-sm text-[#1F2D58]/70 mb-4">
          Je credits worden automatisch verrekend. Voor het overige bedrag ontvang je een factuur.
        </p>

        {/* Loading state */}
        {isLoadingAccountDetails && (
          <div className="flex items-center gap-2 text-sm text-[#1F2D58]/60 py-4">
            <Spinner className="h-4 w-4" />
            <span>Factuurgegevens ophalen...</span>
          </div>
        )}

        {/* Warning when account has missing billing details */}
        {hasMissingBillingDetails && !isLoadingAccountDetails && (
          <Alert className="mb-4 bg-[#F86600]/10 border-none">
            <AlertDescription className="text-[#1F2D58]">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-[#F86600]" />
                </div>
                <div className="flex-1">
                  <strong className="block mb-1">Factuurgegevens ontbreken</strong>
                  <p className="text-sm mb-2">
                    Vul de onderstaande velden in of ga naar je accountinstellingen om je factuurgegevens op te slaan.
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

        {/* Invoice details fields - always visible */}
        {!isLoadingAccountDetails && (
          <div className="space-y-4">
            {/* Row 1: Ref nr (1/3) - Contact person (1/3) - Email (1/3) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reference_nr" className="text-[#1F2D58]">
                  Referentienummer
                </Label>
                <Input
                  id="reference_nr"
                  value={invoiceDetails.reference_nr}
                  onChange={(e) => {
                    const updated = { ...invoiceDetails, reference_nr: e.target.value };
                    setInvoiceDetails(updated);
                    onInvoiceDetailsChange(updated);
                  }}
                  placeholder="Uw referentie"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_name" className="text-[#1F2D58]">
                  Contactpersoon <span className="text-slate-400 text-sm">*</span>
                </Label>
                <Input
                  id="contact_name"
                  value={invoiceDetails.contact_name}
                  onChange={(e) => {
                    const updated = { ...invoiceDetails, contact_name: e.target.value };
                    setInvoiceDetails(updated);
                    onInvoiceDetailsChange(updated);
                  }}
                  placeholder="Naam contactpersoon"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#1F2D58]">
                  E-mail <span className="text-slate-400 text-sm">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={invoiceDetails.email}
                  onChange={(e) => {
                    const updated = { ...invoiceDetails, email: e.target.value };
                    setInvoiceDetails(updated);
                    onInvoiceDetailsChange(updated);
                  }}
                  placeholder="factuur@bedrijf.nl"
                />
              </div>
            </div>

            {/* Row 2: Street (40%) - Postal code (20%) - City (40%) */}
            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_2fr] gap-4">
              <div className="space-y-2">
                <Label htmlFor="street" className="text-[#1F2D58]">
                  Straat en huisnummer <span className="text-slate-400 text-sm">*</span>
                </Label>
                <Input
                  id="street"
                  value={invoiceDetails.street}
                  onChange={(e) => {
                    const updated = { ...invoiceDetails, street: e.target.value };
                    setInvoiceDetails(updated);
                    onInvoiceDetailsChange(updated);
                  }}
                  placeholder="Straatnaam 123"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="postal_code" className="text-[#1F2D58]">
                  Postcode <span className="text-slate-400 text-sm">*</span>
                </Label>
                <Input
                  id="postal_code"
                  value={invoiceDetails.postal_code}
                  onChange={(e) => {
                    const updated = { ...invoiceDetails, postal_code: e.target.value };
                    setInvoiceDetails(updated);
                    onInvoiceDetailsChange(updated);
                  }}
                  placeholder="1234 AB"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city" className="text-[#1F2D58]">
                  Plaats <span className="text-slate-400 text-sm">*</span>
                </Label>
                <Input
                  id="city"
                  value={invoiceDetails.city}
                  onChange={(e) => {
                    const updated = { ...invoiceDetails, city: e.target.value };
                    setInvoiceDetails(updated);
                    onInvoiceDetailsChange(updated);
                  }}
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

    </div>
  );
}
