"use client"

import { useEffect, useState, useCallback } from "react"
import { User, Building2, FileText, Check } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { DesktopHeader } from "@/components/dashboard"
import { normalizeUrl } from "@/lib/utils"

// URL validation helper - must have valid domain with TLD
// e.g., "example.nl" is valid, "examplenl" or "www.examplenl" is not
function isValidUrl(url: string): boolean {
  if (!url || url.trim() === "") return false;
  const normalized = normalizeUrl(url);
  try {
    const parsedUrl = new URL(normalized);
    // Remove www. prefix for domain validation
    const hostname = parsedUrl.hostname.replace(/^www\./, '');
    // Domain must still contain a dot (e.g., "jansmit.nl" not "jansmitnl")
    if (!hostname.includes('.')) return false;
    // TLD must be at least 2 characters
    const parts = hostname.split('.');
    const tld = parts[parts.length - 1];
    if (tld.length < 2) return false;
    return true;
  } catch {
    return false;
  }
}

// Types for form data
interface PersonalData {
  first_name: string
  last_name: string
  email: string
  role: string
}

interface CompanyData {
  company_name: string
  phone: string
  kvk: string
  website_url: string
}

interface BillingData {
  "reference-nr": string
  invoice_contact_name: string
  invoice_email: string
  invoice_street: string
  "invoice_postal-code": string
  invoice_city: string
}

// Default empty data
const emptyPersonalData: PersonalData = {
  first_name: "",
  last_name: "",
  email: "",
  role: "",
}

const emptyCompanyData: CompanyData = {
  company_name: "",
  phone: "",
  kvk: "",
  website_url: "",
}

const emptyBillingData: BillingData = {
  "reference-nr": "",
  invoice_contact_name: "",
  invoice_email: "",
  invoice_street: "",
  "invoice_postal-code": "",
  invoice_city: "",
}

export default function GegevensPage() {
  // Loading states
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)

  // Set page title
  useEffect(() => {
    document.title = "Gegevens | Colourful jobs"
  }, [])

  // Data states - original saved data
  const [personalData, setPersonalData] = useState<PersonalData>(emptyPersonalData)
  const [companyData, setCompanyData] = useState<CompanyData>(emptyCompanyData)
  const [billingData, setBillingData] = useState<BillingData>(emptyBillingData)

  // Edit states - current form values
  const [editPersonalData, setEditPersonalData] = useState<PersonalData>(emptyPersonalData)
  const [editCompanyData, setEditCompanyData] = useState<CompanyData>(emptyCompanyData)
  const [editBillingData, setEditBillingData] = useState<BillingData>(emptyBillingData)

  // URL validation error
  const [urlError, setUrlError] = useState<string | null>(null)

  // Check if there are unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    return (
      editPersonalData.first_name !== personalData.first_name ||
      editPersonalData.last_name !== personalData.last_name ||
      editPersonalData.role !== personalData.role ||
      editCompanyData.company_name !== companyData.company_name ||
      editCompanyData.phone !== companyData.phone ||
      editCompanyData.kvk !== companyData.kvk ||
      editCompanyData.website_url !== companyData.website_url ||
      editBillingData["reference-nr"] !== billingData["reference-nr"] ||
      editBillingData.invoice_contact_name !== billingData.invoice_contact_name ||
      editBillingData.invoice_email !== billingData.invoice_email ||
      editBillingData.invoice_street !== billingData.invoice_street ||
      editBillingData["invoice_postal-code"] !== billingData["invoice_postal-code"] ||
      editBillingData.invoice_city !== billingData.invoice_city
    )
  }, [editPersonalData, editCompanyData, editBillingData, personalData, companyData, billingData])

  // Fetch account data from API
  const fetchAccountData = useCallback(async () => {
    try {
      setIsLoading(true)
      setLoadError(null)

      const response = await fetch("/api/account")
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Kon gegevens niet ophalen")
      }

      const data = await response.json()

      // Update all data states (both saved and edit)
      if (data.personal) {
        setPersonalData(data.personal)
        setEditPersonalData(data.personal)
      }
      if (data.company) {
        setCompanyData(data.company)
        setEditCompanyData(data.company)
      }
      if (data.billing) {
        setBillingData(data.billing)
        setEditBillingData(data.billing)
      }
    } catch (error) {
      console.error("Error fetching account data:", error)
      setLoadError(error instanceof Error ? error.message : "Er is een fout opgetreden")
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load data on mount
  useEffect(() => {
    fetchAccountData()
  }, [fetchAccountData])

  // Reset changes - revert to last saved data
  const resetChanges = () => {
    setEditPersonalData({ ...personalData })
    setEditCompanyData({ ...companyData })
    setEditBillingData({ ...billingData })
    setUrlError(null)
  }

  // Save all sections to API
  const saveAllSections = async () => {
    // Validate URL before saving
    if (editCompanyData.website_url && !isValidUrl(editCompanyData.website_url)) {
      setUrlError("Voer een geldige URL in (bijv. www.voorbeeld.nl)")
      toast.error("Ongeldige URL", {
        description: "Controleer of de website-URL correct is geschreven.",
      })
      return
    }
    setUrlError(null)

    setIsSaving(true)

    try {
      // Save personal data
      const personalResponse = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "personal",
          data: {
            first_name: editPersonalData.first_name,
            last_name: editPersonalData.last_name,
            role: editPersonalData.role,
          },
        }),
      })

      if (!personalResponse.ok) {
        const errorData = await personalResponse.json()
        throw new Error(errorData.error || "Kon persoonlijke gegevens niet opslaan")
      }

      // Save company data
      const companyResponse = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "company",
          data: editCompanyData,
        }),
      })

      if (!companyResponse.ok) {
        const errorData = await companyResponse.json()
        throw new Error(errorData.error || "Kon organisatiegegevens niet opslaan")
      }

      // Save billing data
      const billingResponse = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "billing",
          data: editBillingData,
        }),
      })

      if (!billingResponse.ok) {
        const errorData = await billingResponse.json()
        throw new Error(errorData.error || "Kon factuurgegevens niet opslaan")
      }

      // Update local state with saved data
      setPersonalData({ ...editPersonalData })
      setCompanyData({ ...editCompanyData })
      setBillingData({ ...editBillingData })

      // Show success indicator
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 3000)

      toast.success("Gegevens opgeslagen")
    } catch (error) {
      console.error("Error saving data:", error)
      toast.error(error instanceof Error ? error.message : "Er is een fout opgetreden bij het opslaan")
    } finally {
      setIsSaving(false)
    }
  }

  // Skeleton for data fields
  const DataFieldSkeleton = () => (
    <div className="space-y-1">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-5 w-32" />
    </div>
  )

  // Skeleton for a card section
  const CardSkeleton = ({ title, fieldCount = 4, isLast = false }: { title: string; fieldCount?: number; isLast?: boolean }) => (
    <div className={`overflow-hidden ${isLast ? "rounded-t-[0.75rem] rounded-b-[2rem]" : "rounded-[0.75rem]"}`}>
      <div className="bg-white/50 px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <h2 className="!text-[1.125rem] sm:!text-[1.5rem] font-semibold text-[#1F2D58] -mt-1">
              {title}
            </h2>
          </div>
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
      <div className="bg-white p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: fieldCount }).map((_, i) => (
            <DataFieldSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <DesktopHeader title="Gegevens" />
        <CardSkeleton title="Persoonlijke gegevens" fieldCount={4} />
        <CardSkeleton title="Organisatiegegevens" fieldCount={4} />
        <CardSkeleton title="Factuurgegevens" fieldCount={4} isLast />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <DesktopHeader title="Gegevens" />
        <div className="rounded-t-[0.75rem] rounded-b-[2rem] bg-white p-6">
          <p className="text-red-600">{loadError}</p>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => fetchAccountData()}
            showArrow={false}
          >
            Opnieuw proberen
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header with title, credits and actions */}
      <DesktopHeader title="Gegevens" />

      {/* Personal Data Section */}
      <div className="rounded-[0.75rem] overflow-hidden">
        <div className="bg-white/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0">
              <User className="h-5 w-5 text-[#1F2D58]" />
            </div>
            <h2 className="!text-[1.125rem] sm:!text-[1.5rem] font-semibold text-[#1F2D58] -mt-1">
              Persoonlijke gegevens
            </h2>
          </div>
        </div>
        <div className="bg-white p-6">
          <PersonalDataForm
            data={editPersonalData}
            onChange={setEditPersonalData}
            isSaving={isSaving}
          />
        </div>
      </div>

      {/* Company Data Section */}
      <div className="rounded-[0.75rem] overflow-hidden">
        <div className="bg-white/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0">
              <Building2 className="h-5 w-5 text-[#1F2D58]" />
            </div>
            <h2 className="!text-[1.125rem] sm:!text-[1.5rem] font-semibold text-[#1F2D58] -mt-1">
              Organisatiegegevens
            </h2>
          </div>
        </div>
        <div className="bg-white p-6">
          <CompanyDataForm
            data={editCompanyData}
            onChange={setEditCompanyData}
            isSaving={isSaving}
            urlError={urlError}
            onUrlErrorClear={() => setUrlError(null)}
          />
        </div>
      </div>

      {/* Billing Data Section */}
      <div className="rounded-t-[0.75rem] rounded-b-[2rem] overflow-hidden">
        <div className="bg-white/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0">
              <FileText className="h-5 w-5 text-[#1F2D58]" />
            </div>
            <h2 className="!text-[1.125rem] sm:!text-[1.5rem] font-semibold text-[#1F2D58] -mt-1">
              Factuurgegevens
            </h2>
          </div>
        </div>
        <div className="bg-white p-6">
          <BillingDataForm
            data={editBillingData}
            onChange={setEditBillingData}
            isSaving={isSaving}
          />
        </div>
      </div>

      {/* Spacer for sticky navigation bar */}
      <div className="h-20" />

      {/* Sticky navigation bar */}
      <div className="fixed bottom-0 left-0 sm:left-[var(--sidebar-width)] right-0 z-40 bg-[#E8EEF2] border-t border-[#193DAB]/[0.12]">
        <div className="max-w-[62.5rem] mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <Button variant="secondary" onClick={resetChanges} showArrow={false} disabled={isSaving}>
              Wijzigingen ongedaan maken
            </Button>
            <div className="flex items-center gap-4">
              {/* Save status indicator */}
              {isSaving ? (
                <div className="hidden sm:flex items-center gap-2 text-sm text-[#1F2D58]/60">
                  <Spinner className="h-4 w-4" />
                  <span>Opslaan...</span>
                </div>
              ) : justSaved ? (
                <div className="hidden sm:flex items-center gap-2 text-sm text-green-600">
                  <span>Opgeslagen</span>
                </div>
              ) : hasUnsavedChanges() ? (
                <div className="hidden sm:flex items-center gap-2 text-sm text-red-500">
                  <span>Niet opgeslagen</span>
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-2 text-sm text-green-600">
                  <span>Opgeslagen</span>
                </div>
              )}
              <Button onClick={saveAllSections} disabled={isSaving} showArrow={false}>
                {isSaving ? "Opslaan..." : <><Check className="h-4 w-4" />Opslaan</>}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// FORM COMPONENTS
// ============================================

interface PersonalDataFormProps {
  data: PersonalData
  onChange: (data: PersonalData) => void
  isSaving?: boolean
}

function PersonalDataForm({ data, onChange, isSaving }: PersonalDataFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="first_name">Voornaam <span className="text-slate-400 text-sm">*</span></Label>
          <Input
            id="first_name"
            value={data.first_name}
            onChange={(e) => onChange({ ...data, first_name: e.target.value })}
            disabled={isSaving}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">Achternaam <span className="text-slate-400 text-sm">*</span></Label>
          <Input
            id="last_name"
            value={data.last_name}
            onChange={(e) => onChange({ ...data, last_name: e.target.value })}
            disabled={isSaving}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email">E-mailadres</Label>
          <Input
            id="email"
            type="email"
            value={data.email}
            disabled
            className="bg-slate-100 text-slate-600"
          />
          <p className="text-sm text-[#1F2D58]/60">
            E-mailadres kan niet worden gewijzigd
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Functie</Label>
          <Input
            id="role"
            value={data.role}
            onChange={(e) => onChange({ ...data, role: e.target.value })}
            disabled={isSaving}
          />
        </div>
      </div>
    </div>
  )
}

interface CompanyDataFormProps {
  data: CompanyData
  onChange: (data: CompanyData) => void
  isSaving?: boolean
  urlError?: string | null
  onUrlErrorClear?: () => void
}

function CompanyDataForm({ data, onChange, isSaving, urlError, onUrlErrorClear }: CompanyDataFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="company_name">Juridische organisatienaam <span className="text-slate-400 text-sm">*</span></Label>
          <Input
            id="company_name"
            value={data.company_name}
            onChange={(e) => onChange({ ...data, company_name: e.target.value })}
            disabled={isSaving}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telefoonnummer</Label>
          <Input
            id="phone"
            type="tel"
            value={data.phone}
            onChange={(e) => onChange({ ...data, phone: e.target.value })}
            disabled={isSaving}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="kvk">KVK-nummer <span className="text-slate-400 text-sm">*</span></Label>
          <Input
            id="kvk"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={8}
            value={data.kvk}
            onChange={(e) => onChange({ ...data, kvk: e.target.value })}
            disabled={isSaving}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="website_url">Website-URL <span className="text-slate-400 text-sm">*</span></Label>
          <Input
            id="website_url"
            type="url"
            value={data.website_url}
            className={urlError ? "border-red-500" : ""}
            onChange={(e) => {
              onChange({ ...data, website_url: e.target.value });
              if (urlError && onUrlErrorClear) onUrlErrorClear();
            }}
            disabled={isSaving}
          />
          {urlError && (
            <p className="text-sm text-red-500">{urlError}</p>
          )}
        </div>
      </div>
    </div>
  )
}

interface BillingDataFormProps {
  data: BillingData
  onChange: (data: BillingData) => void
  isSaving?: boolean
}

function BillingDataForm({ data, onChange, isSaving }: BillingDataFormProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Row 1: Contact | Email */}
      <div className="space-y-2">
        <Label htmlFor="invoice_contact_name">Contactpersoon facturatie <span className="text-slate-400 text-sm">*</span></Label>
        <Input
          id="invoice_contact_name"
          value={data.invoice_contact_name}
          onChange={(e) => onChange({ ...data, invoice_contact_name: e.target.value })}
          disabled={isSaving}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="invoice_email">E-mail facturatie <span className="text-slate-400 text-sm">*</span></Label>
        <Input
          id="invoice_email"
          type="email"
          value={data.invoice_email}
          onChange={(e) => onChange({ ...data, invoice_email: e.target.value })}
          disabled={isSaving}
        />
      </div>

      {/* Row 2: Street (40%) | Postal (20%) | City (40%) */}
      <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-5 gap-4">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="invoice_street">Straat en huisnummer <span className="text-slate-400 text-sm">*</span></Label>
          <Input
            id="invoice_street"
            placeholder="Voorbeeldstraat 123"
            value={data.invoice_street}
            onChange={(e) => onChange({ ...data, invoice_street: e.target.value })}
            disabled={isSaving}
          />
        </div>
        <div className="space-y-2 sm:col-span-1">
          <Label htmlFor="invoice_postal-code">Postcode <span className="text-slate-400 text-sm">*</span></Label>
          <Input
            id="invoice_postal-code"
            placeholder="1234 AB"
            value={data["invoice_postal-code"]}
            onChange={(e) => onChange({ ...data, "invoice_postal-code": e.target.value })}
            disabled={isSaving}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="invoice_city">Plaats <span className="text-slate-400 text-sm">*</span></Label>
          <Input
            id="invoice_city"
            value={data.invoice_city}
            onChange={(e) => onChange({ ...data, invoice_city: e.target.value })}
            disabled={isSaving}
          />
        </div>
      </div>
    </div>
  )
}
