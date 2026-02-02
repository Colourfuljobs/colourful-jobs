"use client"

import { useEffect, useState, useCallback } from "react"
import { Pencil, User, Building2, FileText } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
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

// Section edit states
type EditingSection = "personal" | "company" | "billing" | null

export default function GegevensPage() {
  // Loading states
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Set page title
  useEffect(() => {
    document.title = "Gegevens | Colourful jobs"
  }, [])

  // Data states
  const [personalData, setPersonalData] = useState<PersonalData>(emptyPersonalData)
  const [companyData, setCompanyData] = useState<CompanyData>(emptyCompanyData)
  const [billingData, setBillingData] = useState<BillingData>(emptyBillingData)

  // Edit states
  const [editingSection, setEditingSection] = useState<EditingSection>(null)
  const [editPersonalData, setEditPersonalData] = useState<PersonalData>(emptyPersonalData)
  const [editCompanyData, setEditCompanyData] = useState<CompanyData>(emptyCompanyData)
  const [editBillingData, setEditBillingData] = useState<BillingData>(emptyBillingData)

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

      // Update all data states
      if (data.personal) {
        setPersonalData(data.personal)
      }
      if (data.company) {
        setCompanyData(data.company)
      }
      if (data.billing) {
        setBillingData(data.billing)
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

  // Start editing a section
  const startEditing = (section: EditingSection) => {
    if (section === "personal") setEditPersonalData({ ...personalData })
    if (section === "company") setEditCompanyData({ ...companyData })
    if (section === "billing") setEditBillingData({ ...billingData })
    setEditingSection(section)
  }

  // Cancel editing
  const cancelEditing = () => {
    setEditingSection(null)
  }

  // Save section to API
  const saveSection = async (section: EditingSection) => {
    if (!section) return

    setIsSaving(true)

    try {
      let dataToSave: Record<string, any> = {}
      let sectionName = ""

      if (section === "personal") {
        dataToSave = {
          first_name: editPersonalData.first_name,
          last_name: editPersonalData.last_name,
          role: editPersonalData.role,
        }
        sectionName = "Persoonlijke gegevens"
      }
      if (section === "company") {
        dataToSave = editCompanyData
        sectionName = "Organisatiegegevens"
      }
      if (section === "billing") {
        dataToSave = editBillingData
        sectionName = "Factuurgegevens"
      }

      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          section,
          data: dataToSave,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Kon gegevens niet opslaan")
      }

      // Update local state with saved data
      if (section === "personal") {
        setPersonalData({ ...editPersonalData })
      }
      if (section === "company") {
        setCompanyData({ ...editCompanyData })
      }
      if (section === "billing") {
        setBillingData({ ...editBillingData })
      }

      toast.success(`${sectionName} opgeslagen`)
      setEditingSection(null)
    } catch (error) {
      console.error("Error saving section:", error)
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                <User className="h-5 w-5 text-[#1F2D58]" />
              </div>
              <h2 className="!text-[1.125rem] sm:!text-[1.5rem] font-semibold text-[#1F2D58] -mt-1">
                Persoonlijke gegevens
              </h2>
            </div>
            {editingSection !== "personal" && (
              <Button
                variant="tertiary"
                size="sm"
                onClick={() => startEditing("personal")}
                showArrow={false}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Bewerken
              </Button>
            )}
          </div>
        </div>
        <div className="bg-white p-6">
          {editingSection === "personal" ? (
            <PersonalDataForm
              data={editPersonalData}
              onChange={setEditPersonalData}
              onSave={() => saveSection("personal")}
              onCancel={cancelEditing}
              isSaving={isSaving}
            />
          ) : (
            <PersonalDataView data={personalData} />
          )}
        </div>
      </div>

      {/* Company Data Section */}
      <div className="rounded-[0.75rem] overflow-hidden">
        <div className="bg-white/50 px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                <Building2 className="h-5 w-5 text-[#1F2D58]" />
              </div>
              <h2 className="!text-[1.125rem] sm:!text-[1.5rem] font-semibold text-[#1F2D58] -mt-1">
                Organisatiegegevens
              </h2>
            </div>
            {editingSection !== "company" && (
              <Button
                variant="tertiary"
                size="sm"
                onClick={() => startEditing("company")}
                showArrow={false}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Bewerken
              </Button>
            )}
          </div>
        </div>
        <div className="bg-white p-6">
          {editingSection === "company" ? (
            <CompanyDataForm
              data={editCompanyData}
              onChange={setEditCompanyData}
              onSave={() => saveSection("company")}
              onCancel={cancelEditing}
              isSaving={isSaving}
            />
          ) : (
            <CompanyDataView data={companyData} />
          )}
        </div>
      </div>

      {/* Billing Data Section */}
      <div className="rounded-t-[0.75rem] rounded-b-[2rem] overflow-hidden">
        <div className="bg-white/50 px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                <FileText className="h-5 w-5 text-[#1F2D58]" />
              </div>
              <h2 className="!text-[1.125rem] sm:!text-[1.5rem] font-semibold text-[#1F2D58] -mt-1">
                Factuurgegevens
              </h2>
            </div>
            {editingSection !== "billing" && (
              <Button
                variant="tertiary"
                size="sm"
                onClick={() => startEditing("billing")}
                showArrow={false}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Bewerken
              </Button>
            )}
          </div>
        </div>
        <div className="bg-white p-6">
          {editingSection === "billing" ? (
            <BillingDataForm
              data={editBillingData}
              onChange={setEditBillingData}
              onSave={() => saveSection("billing")}
              onCancel={cancelEditing}
              isSaving={isSaving}
            />
          ) : (
            <BillingDataView data={billingData} />
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================
// VIEW COMPONENTS
// ============================================

function DataField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="space-y-1">
      <p className="text-sm text-[#1F2D58]/60">{label}</p>
      <p className="text-[#1F2D58] font-medium">{value || "-"}</p>
    </div>
  )
}

function PersonalDataView({ data }: { data: PersonalData }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <DataField label="Voornaam" value={data.first_name} />
      <DataField label="Achternaam" value={data.last_name} />
      <DataField label="E-mailadres" value={data.email} />
      <DataField label="Functie" value={data.role} />
    </div>
  )
}

function CompanyDataView({ data }: { data: CompanyData }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <DataField label="Juridische organisatienaam" value={data.company_name} />
      <DataField label="Telefoonnummer" value={data.phone} />
      <DataField label="KVK-nummer" value={data.kvk} />
      <DataField label="Website-URL" value={data.website_url} />
    </div>
  )
}

function BillingDataView({ data }: { data: BillingData }) {
  const address = data.invoice_street
  const cityPostal = [data["invoice_postal-code"], data.invoice_city].filter(Boolean).join(" ")

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <DataField label="Referentienummer" value={data["reference-nr"]} />
      <DataField label="Contactpersoon" value={data.invoice_contact_name} />
      <DataField label="E-mail facturatie" value={data.invoice_email} />
      <div className="space-y-1">
        <p className="text-sm text-[#1F2D58]/60">Adres</p>
        <div className="text-[#1F2D58] font-medium">
          <p>{address}</p>
          <p>{cityPostal}</p>
        </div>
      </div>
    </div>
  )
}

// ============================================
// FORM COMPONENTS
// ============================================

interface FormActionsProps {
  onSave: () => void
  onCancel: () => void
  isSaving?: boolean
}

function FormActions({ onSave, onCancel, isSaving = false }: FormActionsProps) {
  return (
    <div className="flex justify-end gap-2 pt-4">
      <Button variant="secondary" onClick={onCancel} showArrow={false} disabled={isSaving}>
        Annuleren
      </Button>
      <Button onClick={onSave} disabled={isSaving}>
        {isSaving ? "Opslaan..." : "Opslaan"}
      </Button>
    </div>
  )
}

interface PersonalDataFormProps {
  data: PersonalData
  onChange: (data: PersonalData) => void
  onSave: () => void
  onCancel: () => void
  isSaving?: boolean
}

function PersonalDataForm({ data, onChange, onSave, onCancel, isSaving }: PersonalDataFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="first_name">Voornaam *</Label>
          <Input
            id="first_name"
            value={data.first_name}
            onChange={(e) => onChange({ ...data, first_name: e.target.value })}
            disabled={isSaving}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">Achternaam *</Label>
          <Input
            id="last_name"
            value={data.last_name}
            onChange={(e) => onChange({ ...data, last_name: e.target.value })}
            disabled={isSaving}
          />
        </div>
      </div>
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
      <FormActions onSave={onSave} onCancel={onCancel} isSaving={isSaving} />
    </div>
  )
}

interface CompanyDataFormProps {
  data: CompanyData
  onChange: (data: CompanyData) => void
  onSave: () => void
  onCancel: () => void
  isSaving?: boolean
}

function CompanyDataForm({ data, onChange, onSave, onCancel, isSaving }: CompanyDataFormProps) {
  const [urlError, setUrlError] = useState<string | null>(null);

  const handleSave = () => {
    // Validate URL before saving
    if (data.website_url && !isValidUrl(data.website_url)) {
      setUrlError("Voer een geldige URL in (bijv. www.voorbeeld.nl)");
      toast.error("Ongeldige URL", {
        description: "Controleer of de website-URL correct is geschreven.",
      });
      return;
    }
    setUrlError(null);
    onSave();
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="company_name">Juridische organisatienaam *</Label>
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
          <Label htmlFor="kvk">KVK-nummer *</Label>
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
          <Label htmlFor="website_url">Website-URL *</Label>
          <Input
            id="website_url"
            type="url"
            value={data.website_url}
            className={urlError ? "border-red-500" : ""}
            onChange={(e) => {
              onChange({ ...data, website_url: e.target.value });
              if (urlError) setUrlError(null);
            }}
            disabled={isSaving}
          />
          {urlError && (
            <p className="text-sm text-red-500">{urlError}</p>
          )}
        </div>
      </div>
      <FormActions onSave={handleSave} onCancel={onCancel} isSaving={isSaving} />
    </div>
  )
}

interface BillingDataFormProps {
  data: BillingData
  onChange: (data: BillingData) => void
  onSave: () => void
  onCancel: () => void
  isSaving?: boolean
}

function BillingDataForm({ data, onChange, onSave, onCancel, isSaving }: BillingDataFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
        {/* Row 1: Ref (1) | Contact (2) | Email (2) */}
        <div className="space-y-2 sm:col-span-1">
          <Label htmlFor="reference-nr">Ref.nr.</Label>
          <Input
            id="reference-nr"
            value={data["reference-nr"]}
            onChange={(e) => onChange({ ...data, "reference-nr": e.target.value })}
            disabled={isSaving}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="invoice_contact_name">Contactpersoon facturatie *</Label>
          <Input
            id="invoice_contact_name"
            value={data.invoice_contact_name}
            onChange={(e) => onChange({ ...data, invoice_contact_name: e.target.value })}
            disabled={isSaving}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="invoice_email">E-mail facturatie *</Label>
          <Input
            id="invoice_email"
            type="email"
            value={data.invoice_email}
            onChange={(e) => onChange({ ...data, invoice_email: e.target.value })}
            disabled={isSaving}
          />
        </div>

        {/* Row 2: Street (40% = 2 cols) | Postal (20% = 1 col) | City (40% = 2 cols) */}
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="invoice_street">Straat en huisnummer *</Label>
          <Input
            id="invoice_street"
            placeholder="Voorbeeldstraat 123"
            value={data.invoice_street}
            onChange={(e) => onChange({ ...data, invoice_street: e.target.value })}
            disabled={isSaving}
          />
        </div>
        <div className="space-y-2 sm:col-span-1">
          <Label htmlFor="invoice_postal-code">Postcode *</Label>
          <Input
            id="invoice_postal-code"
            placeholder="1234 AB"
            value={data["invoice_postal-code"]}
            onChange={(e) => onChange({ ...data, "invoice_postal-code": e.target.value })}
            disabled={isSaving}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="invoice_city">Plaats *</Label>
          <Input
            id="invoice_city"
            value={data.invoice_city}
            onChange={(e) => onChange({ ...data, invoice_city: e.target.value })}
            disabled={isSaving}
          />
        </div>
      </div>
      <FormActions onSave={onSave} onCancel={onCancel} isSaving={isSaving} />
    </div>
  )
}
