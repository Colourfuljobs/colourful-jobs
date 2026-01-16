"use client"

import { useEffect, useState } from "react"
import { Pencil, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
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

interface WebsiteData {
  display_name: string
  sector: string
  short_description: string
  logo: string | null
  header_image: string | null
  gallery_images: string[]
  video_url: string
  faq: { question: string; answer: string }[]
}

// Mock data - will be replaced with real API calls
const mockPersonalData: PersonalData = {
  first_name: "Jan",
  last_name: "de Vries",
  email: "jan@voorbeeld.nl",
  role: "HR Manager",
}

const mockCompanyData: CompanyData = {
  company_name: "Voorbeeld BV",
  phone: "+31 20 123 4567",
  kvk: "12345678",
  website_url: "https://www.voorbeeld.nl",
}

const mockBillingData: BillingData = {
  "reference-nr": "REF-2024-001",
  invoice_contact_name: "Piet Jansen",
  invoice_email: "facturen@voorbeeld.nl",
  invoice_street: "Voorbeeldstraat",
  "invoice_house-nr": "123",
  "invoice_house-nr-add": "A",
  "invoice_postal-code": "1234 AB",
  invoice_city: "Amsterdam",
  invoice_country: "Nederland",
}

const mockWebsiteData: WebsiteData = {
  display_name: "Voorbeeld",
  sector: "Technologie",
  short_description: "Wij zijn een innovatief bedrijf dat zich richt op het ontwikkelen van moderne softwareoplossingen voor de zakelijke markt. Onze missie is om bedrijven te helpen groeien door middel van technologie.",
  logo: null,
  header_image: null,
  gallery_images: [
    "https://images.unsplash.com/photo-1497366216548-37526070297c?w=100&h=100&fit=crop",
    "https://images.unsplash.com/photo-1497215842964-222b430dc094?w=100&h=100&fit=crop",
    "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=100&h=100&fit=crop",
  ],
  video_url: "",
  faq: [
    { question: "Wat voor bedrijf zijn jullie?", answer: "Wij zijn een technologiebedrijf gespecialiseerd in softwareontwikkeling." },
  ],
}

// Section edit states
type EditingSection = "personal" | "company" | "billing" | "website" | null

export default function GegevensPage() {
  // Loading state
  const [isLoading, setIsLoading] = useState(true)

  // Set page title
  useEffect(() => {
    document.title = "Gegevens | Colourful jobs"
  }, [])

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  // Data states
  const [personalData, setPersonalData] = useState<PersonalData>(mockPersonalData)
  const [companyData, setCompanyData] = useState<CompanyData>(mockCompanyData)
  const [billingData, setBillingData] = useState<BillingData>(mockBillingData)
  const [websiteData, setWebsiteData] = useState<WebsiteData>(mockWebsiteData)

  // Edit states
  const [editingSection, setEditingSection] = useState<EditingSection>(null)
  const [editPersonalData, setEditPersonalData] = useState<PersonalData>(mockPersonalData)
  const [editCompanyData, setEditCompanyData] = useState<CompanyData>(mockCompanyData)
  const [editBillingData, setEditBillingData] = useState<BillingData>(mockBillingData)
  const [editWebsiteData, setEditWebsiteData] = useState<WebsiteData>(mockWebsiteData)

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

  // Save section (mock - just updates local state)
  const saveSection = (section: EditingSection) => {
    if (section === "personal") {
      setPersonalData({ ...editPersonalData })
      toast.success("Persoonlijke gegevens opgeslagen")
    }
    if (section === "company") {
      setCompanyData({ ...editCompanyData })
      toast.success("Bedrijfsgegevens opgeslagen")
    }
    if (section === "billing") {
      setBillingData({ ...editBillingData })
      toast.success("Factuurgegevens opgeslagen")
    }
    if (section === "website") {
      setWebsiteData({ ...editWebsiteData })
      toast.success("Website gegevens opgeslagen")
    }
    setEditingSection(null)
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
    <Card className="bg-white border-none">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="!text-xl font-medium text-[#1F2D58]">
          {title}
        </CardTitle>
        <Skeleton className="h-8 w-24" />
      </CardHeader>
      <Separator className="mx-6 w-auto bg-[#E8EEF2]" />
      <CardContent className="pt-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: fieldCount }).map((_, i) => (
            <DataFieldSkeleton key={i} />
          ))}
        </div>
      </CardContent>
    </Card>
  )

  // Skeleton for website/bedrijfsprofiel section
  const WebsiteCardSkeleton = () => (
    <Card className="bg-white border-none">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="space-y-1">
          <CardTitle className="!text-xl font-medium text-[#1F2D58]">
            Bedrijfsprofiel
          </CardTitle>
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-8 w-24" />
      </CardHeader>
      <Separator className="mx-6 w-auto bg-[#E8EEF2]" />
      <CardContent className="pt-6">
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
      </CardContent>
    </Card>
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="contempora-large text-[#1F2D58]">Gegevens</h1>
        <CardSkeleton title="Persoonlijke gegevens" fieldCount={4} />
        <CardSkeleton title="Bedrijfsgegevens" fieldCount={4} />
        <CardSkeleton title="Factuurgegevens" fieldCount={4} />
        <WebsiteCardSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page title */}
      <h1 className="contempora-large text-[#1F2D58]">Gegevens</h1>

      {/* Personal Data Section */}
      <Card className="bg-white border-none">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="!text-xl font-medium text-[#1F2D58]">
            Persoonlijke gegevens
          </CardTitle>
          {editingSection !== "personal" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => startEditing("personal")}
              className="text-[#1F2D58] hover:text-[#193DAB]"
              showArrow={false}
            >
              <Pencil className="h-4 w-4 mr-1" />
              Bewerken
            </Button>
          )}
        </CardHeader>
        <Separator className="mx-6 w-auto bg-[#E8EEF2]" />
        <CardContent className="pt-6">
          {editingSection === "personal" ? (
            <PersonalDataForm
              data={editPersonalData}
              onChange={setEditPersonalData}
              onSave={() => saveSection("personal")}
              onCancel={cancelEditing}
            />
          ) : (
            <PersonalDataView data={personalData} />
          )}
        </CardContent>
      </Card>

      {/* Company Data Section */}
      <Card className="bg-white border-none">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="!text-xl font-medium text-[#1F2D58]">
            Bedrijfsgegevens
          </CardTitle>
          {editingSection !== "company" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => startEditing("company")}
              className="text-[#1F2D58] hover:text-[#193DAB]"
              showArrow={false}
            >
              <Pencil className="h-4 w-4 mr-1" />
              Bewerken
            </Button>
          )}
        </CardHeader>
        <Separator className="mx-6 w-auto bg-[#E8EEF2]" />
        <CardContent className="pt-6">
          {editingSection === "company" ? (
            <CompanyDataForm
              data={editCompanyData}
              onChange={setEditCompanyData}
              onSave={() => saveSection("company")}
              onCancel={cancelEditing}
            />
          ) : (
            <CompanyDataView data={companyData} />
          )}
        </CardContent>
      </Card>

      {/* Billing Data Section */}
      <Card className="bg-white border-none">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="!text-xl font-medium text-[#1F2D58]">
            Factuurgegevens
          </CardTitle>
          {editingSection !== "billing" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => startEditing("billing")}
              className="text-[#1F2D58] hover:text-[#193DAB]"
              showArrow={false}
            >
              <Pencil className="h-4 w-4 mr-1" />
              Bewerken
            </Button>
          )}
        </CardHeader>
        <Separator className="mx-6 w-auto bg-[#E8EEF2]" />
        <CardContent className="pt-6">
          {editingSection === "billing" ? (
            <BillingDataForm
              data={editBillingData}
              onChange={setEditBillingData}
              onSave={() => saveSection("billing")}
              onCancel={cancelEditing}
            />
          ) : (
            <BillingDataView data={billingData} />
          )}
        </CardContent>
      </Card>

      {/* Website Data Section */}
      <Card className="bg-white border-none">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="space-y-1">
            <CardTitle className="!text-xl font-medium text-[#1F2D58]">
              Bedrijfsprofiel
            </CardTitle>
            <p className="text-sm text-[#1F2D58]/60">
              Deze gegevens verschijnen op jullie bedrijfsprofiel op colourfuljobs.nl en zijn zichtbaar voor kandidaten.
            </p>
          </div>
          {editingSection !== "website" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => startEditing("website")}
              className="text-[#1F2D58] hover:text-[#193DAB]"
              showArrow={false}
            >
              <Pencil className="h-4 w-4 mr-1" />
              Bewerken
            </Button>
          )}
        </CardHeader>
        <Separator className="mx-6 w-auto bg-[#E8EEF2]" />
        <CardContent className="pt-6">
          {editingSection === "website" ? (
            <WebsiteDataForm
              data={editWebsiteData}
              onChange={setEditWebsiteData}
              onSave={() => saveSection("website")}
              onCancel={cancelEditing}
            />
          ) : (
            <WebsiteDataView data={websiteData} />
          )}
        </CardContent>
      </Card>
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
          <div className="flex gap-2 flex-wrap">
            {data.gallery_images.map((img, i) => (
              <img key={i} src={img} alt={`Gallery ${i + 1}`} className="h-20 w-20 rounded-lg object-cover" />
            ))}
          </div>
        ) : (
          <p className="text-[#1F2D58]/40 italic">Geen afbeeldingen</p>
        )}
      </div>

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

      {/* FAQ */}
      <div className="space-y-2">
        <p className="text-sm text-[#1F2D58]/60">Veelgestelde vragen</p>
        {data.faq.length > 0 ? (
          <div className="space-y-2">
            {data.faq.map((item, i) => (
              <p key={i} className="text-[#1F2D58]">{item.question}</p>
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
}

function FormActions({ onSave, onCancel }: FormActionsProps) {
  return (
    <div className="flex justify-end gap-2 pt-4">
      <Button variant="secondary" onClick={onCancel} showArrow={false}>
        Annuleren
      </Button>
      <Button onClick={onSave}>
        Opslaan
      </Button>
    </div>
  )
}

interface PersonalDataFormProps {
  data: PersonalData
  onChange: (data: PersonalData) => void
  onSave: () => void
  onCancel: () => void
}

function PersonalDataForm({ data, onChange, onSave, onCancel }: PersonalDataFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="first_name">Voornaam *</Label>
          <Input
            id="first_name"
            value={data.first_name}
            onChange={(e) => onChange({ ...data, first_name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">Achternaam *</Label>
          <Input
            id="last_name"
            value={data.last_name}
            onChange={(e) => onChange({ ...data, last_name: e.target.value })}
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
        />
      </div>
      <FormActions onSave={onSave} onCancel={onCancel} />
    </div>
  )
}

interface CompanyDataFormProps {
  data: CompanyData
  onChange: (data: CompanyData) => void
  onSave: () => void
  onCancel: () => void
}

function CompanyDataForm({ data, onChange, onSave, onCancel }: CompanyDataFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="company_name">Juridische bedrijfsnaam *</Label>
          <Input
            id="company_name"
            value={data.company_name}
            onChange={(e) => onChange({ ...data, company_name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telefoonnummer *</Label>
          <Input
            id="phone"
            type="tel"
            value={data.phone}
            onChange={(e) => onChange({ ...data, phone: e.target.value })}
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
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="website_url">Website-URL *</Label>
          <Input
            id="website_url"
            type="url"
            value={data.website_url}
            onChange={(e) => onChange({ ...data, website_url: e.target.value })}
          />
        </div>
      </div>
      <FormActions onSave={onSave} onCancel={onCancel} />
    </div>
  )
}

interface BillingDataFormProps {
  data: BillingData
  onChange: (data: BillingData) => void
  onSave: () => void
  onCancel: () => void
}

function BillingDataForm({ data, onChange, onSave, onCancel }: BillingDataFormProps) {
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
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="invoice_contact_name">Contactpersoon facturatie *</Label>
          <Input
            id="invoice_contact_name"
            value={data.invoice_contact_name}
            onChange={(e) => onChange({ ...data, invoice_contact_name: e.target.value })}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="invoice_email">E-mail facturatie *</Label>
          <Input
            id="invoice_email"
            type="email"
            value={data.invoice_email}
            onChange={(e) => onChange({ ...data, invoice_email: e.target.value })}
          />
        </div>

        {/* Row 2: Street (3) | Nr + Add (2) */}
        <div className="space-y-2 sm:col-span-3">
          <Label htmlFor="invoice_street">Straat *</Label>
          <Input
            id="invoice_street"
            value={data.invoice_street}
            onChange={(e) => onChange({ ...data, invoice_street: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2 grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="invoice_house-nr">Nr. *</Label>
            <Input
              id="invoice_house-nr"
              value={data["invoice_house-nr"]}
              onChange={(e) => onChange({ ...data, "invoice_house-nr": e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoice_house-nr-add">Toev.</Label>
            <Input
              id="invoice_house-nr-add"
              value={data["invoice_house-nr-add"]}
              onChange={(e) => onChange({ ...data, "invoice_house-nr-add": e.target.value })}
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
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="invoice_city">Plaats *</Label>
          <Input
            id="invoice_city"
            value={data.invoice_city}
            onChange={(e) => onChange({ ...data, invoice_city: e.target.value })}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="invoice_country">Land *</Label>
          <Select
            id="invoice_country"
            value={data.invoice_country}
            onChange={(e) => onChange({ ...data, invoice_country: e.target.value })}
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
      <FormActions onSave={onSave} onCancel={onCancel} />
    </div>
  )
}

interface WebsiteDataFormProps {
  data: WebsiteData
  onChange: (data: WebsiteData) => void
  onSave: () => void
  onCancel: () => void
}

function WebsiteDataForm({ 
  data, 
  onChange, 
  onSave, 
  onCancel,
}: WebsiteDataFormProps) {
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
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sector">Sector *</Label>
          <Input
            id="sector"
            value={data.sector}
            onChange={(e) => onChange({ ...data, sector: e.target.value })}
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
        />
      </div>

      {/* Image uploads */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Logo *</Label>
          <div className="flex items-center gap-1.5">
            {data.logo ? (
              <div className="relative group">
                <img src={data.logo} alt="Logo" className="h-12 w-12 rounded object-cover" />
                <button
                  type="button"
                  onClick={() => onChange({ ...data, logo: null })}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="h-12 w-12 rounded border-2 border-dashed border-slate-300 hover:border-[#193DAB] flex items-center justify-center text-slate-400 hover:text-[#193DAB] transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Headerbeeld *</Label>
          <div className="flex items-center gap-1.5">
            {data.header_image ? (
              <div className="relative group">
                <img src={data.header_image} alt="Header" className="h-12 w-12 rounded object-cover" />
                <button
                  type="button"
                  onClick={() => onChange({ ...data, header_image: null })}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="h-12 w-12 rounded border-2 border-dashed border-slate-300 hover:border-[#193DAB] flex items-center justify-center text-slate-400 hover:text-[#193DAB] transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Gallery */}
      <GalleryUpload
        images={data.gallery_images}
        onChange={(images) => onChange({ ...data, gallery_images: images })}
      />

      {/* Video URL */}
      <div className="space-y-2">
        <Label htmlFor="video_url">Video URL (YouTube of Vimeo)</Label>
        <Input
          id="video_url"
          type="url"
          placeholder="https://www.youtube.com/watch?v=..."
          value={data.video_url}
          onChange={(e) => onChange({ ...data, video_url: e.target.value })}
        />
      </div>

      {/* FAQ Builder */}
      <FAQBuilder
        items={data.faq}
        onChange={(faq) => onChange({ ...data, faq })}
      />

      <FormActions onSave={onSave} onCancel={onCancel} />
    </div>
  )
}

// ============================================
// GALLERY UPLOAD COMPONENT
// ============================================

interface GalleryUploadProps {
  images: string[]
  onChange: (images: string[]) => void
}

function GalleryUpload({ images, onChange }: GalleryUploadProps) {
  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <Label>Afbeeldingen gallery</Label>
      <div className="flex items-center gap-1.5 flex-wrap">
        {images.map((img, i) => (
          <div key={i} className="relative group">
            <img src={img} alt={`Gallery ${i + 1}`} className="h-12 w-12 rounded object-cover" />
            <button
              type="button"
              onClick={() => removeImage(i)}
              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        ))}
        {/* Add button */}
        <button
          type="button"
          className="h-12 w-12 rounded border-2 border-dashed border-slate-300 hover:border-[#193DAB] flex items-center justify-center text-slate-400 hover:text-[#193DAB] transition-colors"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </div>
  )
}


// ============================================
// FAQ BUILDER COMPONENT
// ============================================

interface FAQBuilderProps {
  items: { question: string; answer: string }[]
  onChange: (items: { question: string; answer: string }[]) => void
}

function FAQBuilder({ items, onChange }: FAQBuilderProps) {
  const addItem = () => {
    onChange([...items, { question: "", answer: "" }])
  }

  const updateItem = (index: number, field: "question" | "answer", value: string) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    onChange(newItems)
  }

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      <Label>Veelgestelde vragen</Label>
      {items.map((item, i) => (
        <div key={i} className="bg-[#E8EEF2] rounded-lg p-4 space-y-3">
          <div className="flex justify-between items-center gap-2">
            <div className="flex-1">
              <Input
                placeholder="Vraag"
                value={item.question}
                onChange={(e) => updateItem(i, "question", e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={() => removeItem(i)}
              className="flex-shrink-0 w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#1F2D58] hover:bg-[#1F2D58]/10 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <Textarea
            placeholder="Antwoord"
            rows={2}
            value={item.answer}
            onChange={(e) => updateItem(i, "answer", e.target.value)}
          />
        </div>
      ))}
      <Button type="button" variant="secondary" onClick={addItem} showArrow={false}>
        <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Vraag toevoegen
      </Button>
    </div>
  )
}
