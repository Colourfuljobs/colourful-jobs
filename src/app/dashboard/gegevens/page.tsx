"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import Link from "next/link"
import { Pencil, Image as ImageIcon, RefreshCw, Plus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { MediaPickerDialog } from "@/components/MediaPickerDialog"
import { SortableGallery } from "@/components/SortableGallery"
import { DesktopHeader } from "@/components/dashboard"
import { countries } from "@/lib/countries"

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
  "invoice_house-nr": string
  "invoice_house-nr-add": string
  "invoice_postal-code": string
  invoice_city: string
  invoice_country: string
}

interface GalleryImage {
  id: string
  url: string
}

interface FAQItem {
  id?: string
  question: string
  answer: string
  order?: number
}

interface WebsiteData {
  display_name: string
  sector: string
  short_description: string
  logo: string | null
  logo_id: string | null
  header_image: string | null
  header_image_id: string | null
  gallery_images: GalleryImage[]
  video_url: string
  faq: FAQItem[]
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
  "invoice_house-nr": "",
  "invoice_house-nr-add": "",
  "invoice_postal-code": "",
  invoice_city: "",
  invoice_country: "",
}

const emptyWebsiteData: WebsiteData = {
  display_name: "",
  sector: "",
  short_description: "",
  logo: null,
  logo_id: null,
  header_image: null,
  header_image_id: null,
  gallery_images: [],
  video_url: "",
  faq: [],
}

// Section edit states
type EditingSection = "personal" | "company" | "billing" | "website" | null

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
  const [websiteData, setWebsiteData] = useState<WebsiteData>(emptyWebsiteData)

  // Edit states
  const [editingSection, setEditingSection] = useState<EditingSection>(null)
  const [editPersonalData, setEditPersonalData] = useState<PersonalData>(emptyPersonalData)
  const [editCompanyData, setEditCompanyData] = useState<CompanyData>(emptyCompanyData)
  const [editBillingData, setEditBillingData] = useState<BillingData>(emptyBillingData)
  const [editWebsiteData, setEditWebsiteData] = useState<WebsiteData>(emptyWebsiteData)

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
      if (data.website) {
        setWebsiteData({
          display_name: data.website.display_name || "",
          sector: data.website.sector || "",
          short_description: data.website.short_description || "",
          logo: data.website.logo || null,
          logo_id: data.website.logo_id || null,
          header_image: data.website.header_image || null,
          header_image_id: data.website.header_image_id || null,
          gallery_images: data.website.gallery_images || [],
          video_url: data.website.video_url || "",
          faq: data.website.faq || [],
        })
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
    if (section === "website") setEditWebsiteData({ ...websiteData })
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
        sectionName = "Bedrijfsgegevens"
      }
      if (section === "billing") {
        dataToSave = editBillingData
        sectionName = "Factuurgegevens"
      }
      if (section === "website") {
        dataToSave = {
          display_name: editWebsiteData.display_name,
          sector: editWebsiteData.sector,
          short_description: editWebsiteData.short_description,
          video_url: editWebsiteData.video_url,
          // Include media selections - send as arrays of IDs
          logo: editWebsiteData.logo_id ? [editWebsiteData.logo_id] : [],
          header_image: editWebsiteData.header_image_id ? [editWebsiteData.header_image_id] : [],
          gallery: editWebsiteData.gallery_images.map((img) => img.id),
        }
        sectionName = "Bedrijfsprofiel"
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
      if (section === "website") {
        setWebsiteData({ ...editWebsiteData })
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
  const CardSkeleton = ({ title, fieldCount = 4 }: { title: string; fieldCount?: number }) => (
    <div className="rounded-t-[0.75rem] rounded-b-[2rem] overflow-hidden">
      <div className="bg-white/50 px-4 pt-4 pb-4 flex items-center justify-between">
        <h2 className="!text-[1.5rem] font-semibold text-[#1F2D58]">
          {title}
        </h2>
        <Skeleton className="h-8 w-24" />
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

  // Skeleton for website/bedrijfsprofiel section
  const WebsiteCardSkeleton = () => (
    <div className="rounded-t-[0.75rem] rounded-b-[2rem] overflow-hidden">
      <div className="bg-white/50 px-4 pt-4 pb-4 flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="!text-[1.5rem] font-semibold text-[#1F2D58]">
            Bedrijfsprofiel
          </h2>
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="bg-white p-6">
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <DataFieldSkeleton />
            <DataFieldSkeleton />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-20 w-full" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-24 w-24 rounded-lg" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-24 w-24 rounded-lg" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <div className="flex gap-2">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <Skeleton className="h-12 w-12 rounded-lg" />
              <Skeleton className="h-12 w-12 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <DesktopHeader title="Gegevens" />
        <CardSkeleton title="Persoonlijke gegevens" fieldCount={4} />
        <CardSkeleton title="Bedrijfsgegevens" fieldCount={4} />
        <CardSkeleton title="Factuurgegevens" fieldCount={4} />
        <WebsiteCardSkeleton />
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
      <div className="rounded-t-[0.75rem] rounded-b-[2rem] overflow-hidden">
        <div className="bg-white/50 px-4 pt-4 pb-4 flex items-center justify-between">
          <h2 className="!text-[1.5rem] font-semibold text-[#1F2D58]">
            Persoonlijke gegevens
          </h2>
          {editingSection !== "personal" && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => startEditing("personal")}
              showArrow={false}
            >
              <Pencil className="h-4 w-4 mr-1" />
              Bewerken
            </Button>
          )}
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
      <div className="rounded-t-[0.75rem] rounded-b-[2rem] overflow-hidden">
        <div className="bg-white/50 px-4 pt-4 pb-4 flex items-center justify-between">
          <h2 className="!text-[1.5rem] font-semibold text-[#1F2D58]">
            Bedrijfsgegevens
          </h2>
          {editingSection !== "company" && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => startEditing("company")}
              showArrow={false}
            >
              <Pencil className="h-4 w-4 mr-1" />
              Bewerken
            </Button>
          )}
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
        <div className="bg-white/50 px-4 pt-4 pb-4 flex items-center justify-between">
          <h2 className="!text-[1.5rem] font-semibold text-[#1F2D58]">
            Factuurgegevens
          </h2>
          {editingSection !== "billing" && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => startEditing("billing")}
              showArrow={false}
            >
              <Pencil className="h-4 w-4 mr-1" />
              Bewerken
            </Button>
          )}
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

      {/* Website Data Section */}
      <div className="rounded-t-[0.75rem] rounded-b-[2rem] overflow-hidden">
        <div className="bg-white/50 px-4 pt-4 pb-4 flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="!text-[1.5rem] font-semibold text-[#1F2D58]">
              Bedrijfsprofiel
            </h2>
            <p className="text-sm text-[#1F2D58]/60">
              Deze gegevens verschijnen op jullie bedrijfsprofiel op colourfuljobs.nl en zijn zichtbaar voor kandidaten.
            </p>
          </div>
          {editingSection !== "website" && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => startEditing("website")}
              showArrow={false}
            >
              <Pencil className="h-4 w-4 mr-1" />
              Bewerken
            </Button>
          )}
        </div>
        <div className="bg-white p-6">
          {editingSection === "website" ? (
            <WebsiteDataForm
              data={editWebsiteData}
              onChange={setEditWebsiteData}
              onSave={() => saveSection("website")}
              onCancel={cancelEditing}
              isSaving={isSaving}
            />
          ) : (
            <WebsiteDataView data={websiteData} />
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
      <DataField label="Juridische bedrijfsnaam" value={data.company_name} />
      <DataField label="Telefoonnummer" value={data.phone} />
      <DataField label="KVK-nummer" value={data.kvk} />
      <DataField label="Website-URL" value={data.website_url} />
    </div>
  )
}

function BillingDataView({ data }: { data: BillingData }) {
  const address = [
    data.invoice_street,
    data["invoice_house-nr"],
    data["invoice_house-nr-add"],
  ].filter(Boolean).join(" ")
  
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
          <p>{data.invoice_country}</p>
        </div>
      </div>
    </div>
  )
}

function WebsiteDataView({ data }: { data: WebsiteData }) {
  return (
    <div className="space-y-6">
      {/* Basic info */}
      <div className="grid gap-4 sm:grid-cols-2">
        <DataField label="Weergavenaam" value={data.display_name} />
        <DataField label="Sector" value={data.sector} />
      </div>
      
      {/* Description */}
      <div className="space-y-1">
        <p className="text-sm text-[#1F2D58]/60">Omschrijving</p>
        <p className="text-[#1F2D58]">{data.short_description || "-"}</p>
      </div>

      <hr className="border-[#E8EEF2]" />

      {/* Images */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm text-[#1F2D58]/60">Logo</p>
          {data.logo ? (
            <img src={data.logo} alt="Logo" className="max-h-24 rounded-lg object-contain" />
          ) : (
            <p className="text-[#1F2D58]/40 italic">Geen logo geüpload</p>
          )}
        </div>
        <div className="space-y-2">
          <p className="text-sm text-[#1F2D58]/60">Headerbeeld</p>
          {data.header_image ? (
            <img src={data.header_image} alt="Header" className="max-h-24 rounded-lg object-contain" />
          ) : (
            <p className="text-[#1F2D58]/40 italic">Geen headerbeeld geüpload</p>
          )}
        </div>
      </div>

      {/* Gallery */}
      <div className="space-y-2">
        <p className="text-sm text-[#1F2D58]/60">Afbeeldingen gallery</p>
        {data.gallery_images.length > 0 ? (
          <div className="flex gap-2 flex-wrap items-end">
            {data.gallery_images.map((img) => (
              <img key={img.id} src={img.url} alt="Gallery" className="h-20 max-w-32 rounded-lg object-contain" />
            ))}
          </div>
        ) : (
          <p className="text-[#1F2D58]/40 italic">Geen afbeeldingen</p>
        )}
      </div>

      <hr className="border-[#E8EEF2]" />

      {/* Video */}
      <div className="space-y-1">
        <p className="text-sm text-[#1F2D58]/60">Video URL</p>
        {data.video_url ? (
          <a href={data.video_url} target="_blank" rel="noopener noreferrer" className="text-[#193DAB] underline">
            {data.video_url}
          </a>
        ) : (
          <p className="text-[#1F2D58]/40 italic">Geen video toegevoegd</p>
        )}
      </div>

      <hr className="border-[#E8EEF2]" />

      {/* FAQ */}
      <div className="space-y-2">
        <p className="text-sm text-[#1F2D58]/60">Veelgestelde vragen</p>
        {data.faq.length > 0 ? (
          <div className="space-y-2">
            {data.faq.map((item, i) => (
              <div key={item.id || i} className="bg-[#E8EEF2] rounded-lg p-3">
                <p className="font-medium text-[#1F2D58]">{item.question}</p>
                <p className="text-sm text-[#1F2D58]/70 mt-1">{item.answer}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[#1F2D58]/40 italic">Geen veelgestelde vragen</p>
        )}
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
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="company_name">Juridische bedrijfsnaam *</Label>
          <Input
            id="company_name"
            value={data.company_name}
            onChange={(e) => onChange({ ...data, company_name: e.target.value })}
            disabled={isSaving}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telefoonnummer *</Label>
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
            onChange={(e) => onChange({ ...data, website_url: e.target.value })}
            disabled={isSaving}
          />
        </div>
      </div>
      <FormActions onSave={onSave} onCancel={onCancel} isSaving={isSaving} />
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

        {/* Row 2: Street (3) | Nr + Add (2) */}
        <div className="space-y-2 sm:col-span-3">
          <Label htmlFor="invoice_street">Straat *</Label>
          <Input
            id="invoice_street"
            value={data.invoice_street}
            onChange={(e) => onChange({ ...data, invoice_street: e.target.value })}
            disabled={isSaving}
          />
        </div>
        <div className="sm:col-span-2 grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="invoice_house-nr">Nr. *</Label>
            <Input
              id="invoice_house-nr"
              value={data["invoice_house-nr"]}
              onChange={(e) => onChange({ ...data, "invoice_house-nr": e.target.value })}
              disabled={isSaving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoice_house-nr-add">Toev.</Label>
            <Input
              id="invoice_house-nr-add"
              value={data["invoice_house-nr-add"]}
              onChange={(e) => onChange({ ...data, "invoice_house-nr-add": e.target.value })}
              disabled={isSaving}
            />
          </div>
        </div>

        {/* Row 3: Postal (1) | City (2) | Country (2) */}
        <div className="space-y-2 sm:col-span-1">
          <Label htmlFor="invoice_postal-code">Postcode *</Label>
          <Input
            id="invoice_postal-code"
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
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="invoice_country">Land *</Label>
          <Select
            id="invoice_country"
            value={data.invoice_country}
            onChange={(e) => onChange({ ...data, invoice_country: e.target.value })}
            disabled={isSaving}
          >
            <option value="">Selecteer een land</option>
            {countries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <FormActions onSave={onSave} onCancel={onCancel} isSaving={isSaving} />
    </div>
  )
}

interface WebsiteDataFormProps {
  data: WebsiteData
  onChange: (data: WebsiteData) => void
  onSave: () => void
  onCancel: () => void
  isSaving?: boolean
}

function WebsiteDataForm({ 
  data, 
  onChange, 
  onSave, 
  onCancel,
  isSaving,
}: WebsiteDataFormProps) {
  // Dialog states for media pickers
  const [headerPickerOpen, setHeaderPickerOpen] = useState(false)
  const [galleryPickerOpen, setGalleryPickerOpen] = useState(false)
  
  // Logo upload state
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  // Handle logo upload
  const handleLogoUpload = async (file: File) => {
    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/avif", "image/svg+xml"]
    if (!allowedTypes.includes(file.type)) {
      toast.error("Ongeldig bestandstype", {
        description: "Alleen JPEG, PNG, WebP, AVIF of SVG afbeeldingen zijn toegestaan",
      })
      return
    }

    // Validate file size (5MB for logo)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Bestand te groot", {
        description: "Logo mag maximaal 5MB zijn",
      })
      return
    }

    setIsUploadingLogo(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", "logo")

      const response = await fetch("/api/media", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Upload failed")
      }

      const result = await response.json()
      
      // Update form data with new logo
      onChange({ ...data, logo: result.asset.url, logo_id: result.asset.id })
      
      toast.success("Logo geüpload", {
        description: "Je logo is succesvol bijgewerkt.",
      })
    } catch (error) {
      console.error("Error uploading logo:", error)
      toast.error("Upload mislukt", {
        description: error instanceof Error ? error.message : "Probeer het opnieuw.",
      })
    } finally {
      setIsUploadingLogo(false)
      if (logoInputRef.current) {
        logoInputRef.current.value = ""
      }
    }
  }

  const handleLogoInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleLogoUpload(file)
  }

  // Handle header selection from picker
  const handleHeaderSelect = (selectedAssets: { id: string; url: string }[]) => {
    if (selectedAssets.length > 0) {
      const selected = selectedAssets[0]
      onChange({ ...data, header_image: selected.url, header_image_id: selected.id })
    } else {
      onChange({ ...data, header_image: null, header_image_id: null })
    }
  }

  // Handle gallery selection from picker
  const handleGallerySelect = (selectedAssets: { id: string; url: string }[]) => {
    // Update gallery with selected assets (preserving order from selection)
    onChange({ ...data, gallery_images: selectedAssets })
  }

  // Handle gallery reorder (drag & drop)
  const handleGalleryReorder = (newImages: { id: string; url: string }[]) => {
    onChange({ ...data, gallery_images: newImages })
  }

  // Handle remove from gallery
  const handleGalleryRemove = (id: string) => {
    onChange({
      ...data,
      gallery_images: data.gallery_images.filter((img) => img.id !== id),
      // Also clear header if it was the removed image
      ...(data.header_image_id === id && { header_image: null, header_image_id: null }),
    })
  }

  return (
    <div className="space-y-6">
      {/* Basic info */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="display_name">Weergavenaam bedrijf *</Label>
          <Input
            id="display_name"
            value={data.display_name}
            onChange={(e) => onChange({ ...data, display_name: e.target.value })}
            disabled={isSaving}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sector">Sector *</Label>
          <Input
            id="sector"
            value={data.sector}
            onChange={(e) => onChange({ ...data, sector: e.target.value })}
            disabled={isSaving}
          />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="short_description">Omschrijving bedrijf *</Label>
        <Textarea
          id="short_description"
          rows={4}
          value={data.short_description}
          onChange={(e) => onChange({ ...data, short_description: e.target.value })}
          disabled={isSaving}
        />
      </div>

      <hr className="border-[#E8EEF2]" />

      {/* Logo and Header with pickers */}
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Logo */}
        <div className="space-y-3">
          <Label>Logo</Label>
          {/* Hidden file input for logo upload */}
          <input
            ref={logoInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/avif,image/svg+xml"
            onChange={handleLogoInputChange}
            className="hidden"
          />
          <div className="flex items-center gap-3">
            {data.logo ? (
              <div className="h-16 w-16 rounded-lg bg-[#193DAB]/12 flex items-center justify-center overflow-hidden">
                <img src={data.logo} alt="Logo" className="h-full w-full object-contain p-1" />
              </div>
            ) : (
              <div className="h-16 w-16 rounded-lg bg-[#193DAB]/12 flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-[#1F2D58]/40" />
              </div>
            )}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              showArrow={false}
              onClick={() => logoInputRef.current?.click()}
              disabled={isSaving || isUploadingLogo}
            >
              {isUploadingLogo ? (
                <>
                  <Spinner className="h-4 w-4 mr-1" />
                  Uploaden...
                </>
              ) : data.logo ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Vervangen
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  Uploaden
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Header */}
        <div className="space-y-3">
          <Label>Headerbeeld</Label>
          <div className="flex items-center gap-3">
            {data.header_image ? (
              <div className="h-16 w-28 rounded-lg bg-[#193DAB]/12 overflow-hidden">
                <img src={data.header_image} alt="Header" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="h-16 w-28 rounded-lg bg-[#193DAB]/12 flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-[#1F2D58]/40" />
              </div>
            )}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              showArrow={false}
              onClick={() => setHeaderPickerOpen(true)}
              disabled={isSaving}
            >
              {data.header_image ? "Wijzigen" : "Kiezen"}
            </Button>
          </div>
        </div>
      </div>

      <hr className="border-[#E8EEF2]" />

      {/* Gallery with drag & drop */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Afbeeldingen gallery</Label>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            showArrow={false}
            onClick={() => setGalleryPickerOpen(true)}
            disabled={isSaving}
          >
            Selectie aanpassen
          </Button>
        </div>
        
        {data.gallery_images.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-[#1F2D58]/50">Sleep om de volgorde te wijzigen</p>
            <SortableGallery
              images={data.gallery_images}
              onReorder={handleGalleryReorder}
              onRemove={handleGalleryRemove}
              disabled={isSaving}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 rounded-lg border-2 border-dashed border-[#1F2D58]/20">
            <ImageIcon className="h-8 w-8 text-[#1F2D58]/30 mb-2" />
            <p className="text-sm text-[#1F2D58]/50">Geen afbeeldingen geselecteerd</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              showArrow={false}
              className="mt-3"
              onClick={() => setGalleryPickerOpen(true)}
              disabled={isSaving}
            >
              Afbeeldingen kiezen
            </Button>
          </div>
        )}
      </div>

      <hr className="border-[#E8EEF2]" />

      {/* Video URL */}
      <div className="space-y-2">
        <Label htmlFor="video_url">Video URL (YouTube of Vimeo)</Label>
        <Input
          id="video_url"
          type="url"
          placeholder="https://www.youtube.com/watch?v=..."
          value={data.video_url}
          onChange={(e) => onChange({ ...data, video_url: e.target.value })}
          disabled={isSaving}
        />
      </div>

      {/* FAQ Builder - read-only for now, will be editable via separate flow */}
      <div className="space-y-2">
        <Label>Veelgestelde vragen</Label>
        {data.faq.length > 0 ? (
          <div className="space-y-2">
            {data.faq.map((item, i) => (
              <div key={item.id || i} className="bg-[#E8EEF2] rounded-lg p-4">
                <p className="font-medium text-[#1F2D58]">{item.question}</p>
                <p className="text-sm text-[#1F2D58]/70 mt-1">{item.answer}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[#1F2D58]/40 italic text-sm">Geen veelgestelde vragen</p>
        )}
      </div>

      <FormActions onSave={onSave} onCancel={onCancel} isSaving={isSaving} />

      {/* Media Picker Dialogs */}
      <MediaPickerDialog
        open={headerPickerOpen}
        onOpenChange={setHeaderPickerOpen}
        title="Headerbeeld kiezen"
        description="Selecteer een afbeelding als header voor je bedrijfsprofiel."
        selectedIds={data.header_image_id ? [data.header_image_id] : []}
        onSelect={handleHeaderSelect}
        singleSelect
        filter="gallery"
      />

      <MediaPickerDialog
        open={galleryPickerOpen}
        onOpenChange={setGalleryPickerOpen}
        title="Gallery afbeeldingen kiezen"
        description="Selecteer welke afbeeldingen op je bedrijfsprofiel worden getoond."
        selectedIds={data.gallery_images.map((img) => img.id)}
        onSelect={handleGallerySelect}
        maxSelection={10}
        filter="gallery"
      />
    </div>
  )
}

