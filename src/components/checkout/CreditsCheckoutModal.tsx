"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field, FieldLabel } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { InfoTooltip } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { X, ChevronDown, Coins, Check } from "lucide-react";
import { ProductRecord } from "@/lib/airtable";
import { cn } from "@/lib/utils";

export type CheckoutContext =
  | "dashboard"
  | "vacancy"
  | "boost"
  | "renew"
  | "transactions";

interface InvoiceDetails {
  contact_name: string;
  email: string;
  street: string;
  postal_code: string;
  city: string;
  reference_nr: string;
}

interface CreditsCheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: CheckoutContext;
  currentBalance: number;
  onSuccess?: (newBalance: number, purchasedAmount?: number) => void;
  onPendingChange?: (isPending: boolean) => void;
}

export function CreditsCheckoutModal({
  open,
  onOpenChange,
  context,
  currentBalance,
  onSuccess,
  onPendingChange,
}: CreditsCheckoutModalProps) {
  const [products, setProducts] = React.useState<ProductRecord[]>([]);
  const [selectedProduct, setSelectedProduct] = React.useState<ProductRecord | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
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

  // Fetch credit bundles when modal opens
  React.useEffect(() => {
    if (open) {
      fetchProducts();
      // Reset state when opening
      setSelectedProduct(null);
      setUseAccountDetails(false);
      setInvoiceDetailsOpen(false);
      setInvoiceDetails({
        contact_name: "",
        email: "",
        street: "",
        postal_code: "",
        city: "",
        reference_nr: "",
      });
    }
  }, [open]);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/products?type=credit_bundle");
      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }
      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Fout", {
        description: "Kon credit bundels niet ophalen",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAccountDetails = async () => {
    setIsLoadingAccountDetails(true);
    try {
      const response = await fetch("/api/account");
      if (!response.ok) {
        throw new Error("Failed to fetch account");
      }
      const data = await response.json();
      const billing = data.billing || {};
      setInvoiceDetails({
        contact_name: billing.invoice_contact_name || "",
        email: billing.invoice_email || "",
        street: billing.invoice_street || "",
        postal_code: billing["invoice_postal-code"] || "",
        city: billing.invoice_city || "",
        reference_nr: billing["reference-nr"] || "",
      });
      // Automatically open the details section when data is loaded
      setInvoiceDetailsOpen(true);
    } catch (error) {
      console.error("Error fetching account details:", error);
      toast.error("Fout", {
        description: "Kon factuurgegevens niet ophalen",
      });
    } finally {
      setIsLoadingAccountDetails(false);
    }
  };

  const handleUseAccountDetailsChange = (checked: boolean) => {
    setUseAccountDetails(checked);
    if (checked) {
      fetchAccountDetails();
    } else {
      // Clear the form and close details when unchecking
      setInvoiceDetails({
        contact_name: "",
        email: "",
        street: "",
        postal_code: "",
        city: "",
        reference_nr: "",
      });
      setInvoiceDetailsOpen(false);
    }
  };

  const handleSelectProduct = (product: ProductRecord) => {
    setSelectedProduct(product);
  };

  const handleSubmit = async () => {
    if (!selectedProduct) {
      toast.error("Selecteer een bundel");
      return;
    }

    // Validate invoice details
    if (
      !invoiceDetails.contact_name ||
      !invoiceDetails.email ||
      !invoiceDetails.street ||
      !invoiceDetails.postal_code ||
      !invoiceDetails.city
    ) {
      toast.error("Vink de checkbox aan om factuurgegevens op te halen");
      return;
    }

    setIsSubmitting(true);
    
    // Signal that an update is pending (optimistic UI)
    onPendingChange?.(true);
    
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: selectedProduct.id,
          context,
          invoice_details: invoiceDetails,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Checkout failed");
      }

      const data = await response.json();

      // Close modal first for snappy UX
      onOpenChange(false);
      
      // Update credits with new balance (includes purchased amount for accurate tracking)
      onSuccess?.(data.new_balance, selectedProduct.credits);

      // Show success toast with new balance
      toast.success("Credits gekocht!", {
        description: `${selectedProduct.credits} credits toegevoegd. Nieuw saldo: ${data.new_balance} credits`,
      });
    } catch (error) {
      console.error("Checkout error:", error);
      // Reset pending state on error
      onPendingChange?.(false);
      toast.error("Fout", {
        description:
          error instanceof Error
            ? error.message
            : "Er ging iets mis bij de checkout",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price).replace(/\s/g, ""); // Remove space between € and amount
  };

  // Calculate how many vacancies can be placed (rough estimate: 16 credits per basic vacancy)
  const getVacancyEstimate = (credits: number) => {
    const basicVacancyCredits = 16; // Based on prod_vacancy_basic in Products table
    return Math.floor(credits / basicVacancyCredits);
  };

  // Format validity months to Dutch text
  const formatValidity = (months: number | null | undefined): string => {
    const m = months ?? 12; // Default to 12 months (1 year)
    if (m === 12) return "1 jaar";
    if (m === 18) return "1,5 jaar";
    if (m === 24) return "2 jaar";
    if (m === 6) return "6 maanden";
    if (m % 12 === 0) return `${m / 12} jaar`;
    return `${m} maanden`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[900px] max-h-[90vh] rounded-t-[0.75rem] rounded-b-[2rem] p-0 gap-0 bg-[#E8EEF2] overflow-hidden">
        {/* Close button - absolute positioned, always 16px from top and right */}
        <DialogClose className="absolute top-4 right-4 z-20 flex w-[30px] h-[30px] rounded-full bg-white border border-[#1F2D58]/20 items-center justify-center hover:bg-[#1F2D58]/5 transition-colors shadow-sm">
          <X className="h-4 w-4 text-[#1F2D58]" />
          <span className="sr-only">Sluiten</span>
        </DialogClose>

        {/* Scrollable content */}
        <div className="overflow-y-auto max-h-[90vh]">
          {/* Header section with white/50 background */}
          <div className="bg-white/50 px-6 pt-6 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <DialogHeader className="pr-12">
                <DialogTitle className="text-2xl font-bold text-[#1F2D58]">
                  Profiteer van bundelvoordeel
                </DialogTitle>
                <p className="text-[#1F2D58]/70 text-sm mt-1">
                  Grotere bundels, lagere prijs per plaatsing
                </p>
              </DialogHeader>

              {/* Current balance - inline on one line, aligned with content below (24px from right) */}
              <div className="flex items-center justify-center sm:justify-end gap-1.5 text-sm">
                <span className="text-[#1F2D58]/70">Huidig saldo</span>
                <Coins className="h-4 w-4 text-[#1F2D58]" />
                <span className="font-bold text-[#1F2D58]">{currentBalance} credits</span>
              </div>
            </div>
          </div>

        {/* Content section with light blue background */}
        <div className="bg-[#E8EEF2] px-6 pb-6">
          {isLoading ? (
            <div className="space-y-6 pt-6">
              {/* Skeleton product cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                {[0, 1, 2, 3].map((index) => (
                  <div
                    key={index}
                    className="flex flex-col bg-white overflow-hidden rounded-[0.75rem]"
                  >
                    <div className="p-4 pb-3">
                      <Skeleton className="h-10 w-16 mb-2" />
                      <Skeleton className="h-5 w-24 mb-3" />
                      <Skeleton className="h-8 w-32 rounded" />
                    </div>
                    <div className="p-4 pt-1 mt-auto">
                      <Skeleton className="h-7 w-20 mb-2" />
                      <Skeleton className="h-5 w-28 rounded-full mb-4" />
                      <Skeleton className="h-[30px] w-full rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Skeleton invoice section */}
              <Skeleton className="h-[50px] w-full rounded-[0.75rem]" />
              
              {/* Skeleton submit row */}
              <div className="flex items-center justify-between pt-2">
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-10 w-[200px] rounded-full" />
              </div>
            </div>
          ) : (
            <div className="space-y-6 pt-6">
            {/* Product cards */}
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                {products.map((product) => {
                  const isSelected = selectedProduct?.id === product.id;
                  const vacancyEstimate = getVacancyEstimate(product.credits);

                  return (
                    <div
                      key={product.id}
                      className={cn(
                        "relative flex flex-col transition-all cursor-pointer overflow-hidden rounded-[0.75rem] border",
                        isSelected
                          ? "bg-white shadow-lg border-transparent"
                          : "bg-transparent border-[#1F2D58]/10 hover:border-[#1F2D58]/40"
                      )}
                      onClick={() => handleSelectProduct(product)}
                    >
                      {/* Top section */}
                      <div className="p-4 pb-3">
                        {/* Product name - Contempora style */}
                        <h3 className="contempora-medium text-[#1F2D58] !text-[2rem] sm:!text-[2.5rem]">
                          {product.display_name}
                        </h3>

                        {/* Description (if available) */}
                        {product.description && (
                          <p className="text-sm text-[#1F2D58]/70 mt-1">
                            {product.description}
                          </p>
                        )}

                        {/* Credits */}
                        <p className="text-base text-[#1F2D58] mt-1">
                          <span className="font-bold">{product.credits} credits</span>
                          <span className="text-sm font-normal text-[#1F2D58]/60 ml-1.5">{formatValidity(product.validity_months)} geldig</span>
                        </p>

                      </div>

                      {/* Vacancy estimate with tooltip */}
                      <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-[#1F2D58]/10">
                        <div className="flex flex-col">
                          <span className="text-sm leading-5 text-[#1F2D58]">
                            Plaats {vacancyEstimate} vacatures
                          </span>
                          <span className="text-sm leading-5 text-[#1F2D58]/60">
                            Vanaf {formatPrice(Math.round(product.price / vacancyEstimate))} p/st
                          </span>
                        </div>
                        <InfoTooltip content="Dit is een indicatie gebaseerd op basis vacatures (16 credits). Credits zijn vrij inzetbaar voor vacatures, boosts, verlengingen en andere acties." />
                      </div>

                      {/* Bottom section - Pricing & Button */}
                      <div className="px-4 pb-4 pt-3 mt-auto border-t border-[#1F2D58]/10">
                        {/* Pricing */}
                        <div className="space-y-1.5">
                          {/* Price row: old price → new price */}
                          <div className="flex items-baseline gap-2">
                            {product.base_price && product.base_price > product.price && (
                              <span className="text-sm text-[#1F2D58]/50 line-through">
                                {formatPrice(product.base_price)}
                              </span>
                            )}
                            <span className="text-xl font-bold text-[#1F2D58]">
                              {formatPrice(product.price)}
                            </span>
                          </div>
                          
                          {/* Savings badge */}
                          {product.base_price && product.base_price > product.price && (
                            <Badge variant="success">
                              Bespaar {formatPrice(product.base_price - product.price)}
                            </Badge>
                          )}
                        </div>

                        {/* Select button */}
                        <div className="mt-4">
                          <Button
                            variant="secondary"
                            size="sm"
                            showArrow={!isSelected}
                            className={cn(
                              "w-full",
                              isSelected && "bg-[#1F2D58] text-white hover:bg-[#1F2D58]/90"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectProduct(product);
                            }}
                          >
                            {isSelected ? (
                              <>
                                <Check className="h-4 w-4" />
                                Geselecteerd
                              </>
                            ) : (
                              `Koop ${product.credits} credits`
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Invoice details section */}
            <div className={cn(
              "border border-[#1F2D58]/10 rounded-[0.75rem] p-4 transition-colors",
              invoiceDetailsOpen && useAccountDetails && invoiceDetails.contact_name
                ? "bg-white"
                : "bg-transparent"
            )}>
              {/* Checkbox and collapsible toggle row */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                {/* Checkbox to load from account */}
                <Field orientation="horizontal" className="justify-start items-center w-auto">
                  <Checkbox
                    id="useAccountDetails"
                    checked={useAccountDetails}
                    onCheckedChange={handleUseAccountDetailsChange}
                  />
                  <FieldLabel
                    htmlFor="useAccountDetails"
                    className="text-sm text-[#1F2D58] cursor-pointer !mb-0 leading-none -mt-0.5"
                  >
                    Haal factuurgegevens op uit account
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

              {/* Collapsible invoice details content */}
              {useAccountDetails && invoiceDetails.contact_name && invoiceDetailsOpen && (
                <div className="mt-4 space-y-4">
                      {/* Row 1: Contact person (1/3) - Email (1/3) - Ref nr (1/3) */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                        <div className="space-y-2">
                          <Label htmlFor="reference_nr" className="text-[#1F2D58]">
                            Referentie/Inkooporder nr
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

            {/* Submit button with invoice info */}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
              <p className="text-sm text-[#1F2D58]/70 text-center sm:text-left">
                De factuur wordt verzonden naar het e-mailadres dat bij facturatie is ingesteld.
              </p>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !selectedProduct || !useAccountDetails || isLoadingAccountDetails || !invoiceDetails.contact_name}
                className="w-full sm:w-auto sm:min-w-[200px]"
              >
                {isSubmitting ? (
                  "Bezig..."
                ) : !selectedProduct ? (
                  "Selecteer een bundel"
                ) : !useAccountDetails || isLoadingAccountDetails || !invoiceDetails.contact_name ? (
                  "Haal factuurgegevens op"
                ) : (
                  <>
                    Koop {selectedProduct.credits} credits /{" "}
                    {formatPrice(selectedProduct.price)}
                  </>
                )}
              </Button>
            </div>
          </div>
          )}
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
