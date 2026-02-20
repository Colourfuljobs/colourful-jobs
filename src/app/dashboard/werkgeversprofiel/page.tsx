"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Pencil, Image as ImageIcon, RefreshCw, Plus, Trash2, GripVertical, X, Check } from "lucide-react"
import { toast } from "sonner"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { InfoTooltip } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MediaPickerDialog } from "@/components/MediaPickerDialog"
import { SortableGallery } from "@/components/SortableGallery"
import { DesktopHeader } from "@/components/dashboard"
import { uploadMedia, validateFile } from "@/lib/cloudinary-upload"
import { sortLookupWithOverigeLast } from "@/lib/utils"

// Types for form data
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

interface ProfileData {
  display_name: string
  sector: string
  sector_id: string | null
  website_url: string
  short_description: string
  logo: string | null
  logo_id: string | null
  header_image: string | null
  header_image_id: string | null
  gallery_images: GalleryImage[]
  video_url: string
  faq: FAQItem[]
}

interface Sector {
  id: string
  name: string
}

// Default empty data
const emptyProfileData: ProfileData = {
  display_name: "",
  sector: "",
  sector_id: null,
  website_url: "",
  short_description: "",
  logo: null,
  logo_id: null,
  header_image: null,
  header_image_id: null,
  gallery_images: [],
  video_url: "",
  faq: [],
}

export default function WerkgeversprofielPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnToVacancy = searchParams.get("returnTo")

  // Loading states
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)

  // Data states - profileData holds saved data, editData holds current form state
  const [profileData, setProfileData] = useState<ProfileData>(emptyProfileData)
  const [editData, setEditData] = useState<ProfileData>(emptyProfileData)
  const [sectors, setSectors] = useState<Sector[]>([])
  const [loadingSectors, setLoadingSectors] = useState(false)

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({})

  // FAQ state (lifted from ProfileForm for validation)
  const [newFaqQuestion, setNewFaqQuestion] = useState("")
  const [newFaqAnswer, setNewFaqAnswer] = useState("")

  // Example profile modal
  const [showExampleModal, setShowExampleModal] = useState(false)

  // Unsaved changes dialog
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)

  // Check if there are unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    // Compare editData with profileData
    // We need to do a deep comparison for objects and arrays
    const compareGallery = (a: GalleryImage[], b: GalleryImage[]) => {
      if (a.length !== b.length) return false
      return a.every((img, i) => img.id === b[i]?.id)
    }

    const compareFaq = (a: FAQItem[], b: FAQItem[]) => {
      if (a.length !== b.length) return false
      return a.every((item, i) =>
        item.id === b[i]?.id &&
        item.question === b[i]?.question &&
        item.answer === b[i]?.answer
      )
    }

    return (
      editData.display_name !== profileData.display_name ||
      editData.sector_id !== profileData.sector_id ||
      editData.website_url !== profileData.website_url ||
      editData.short_description !== profileData.short_description ||
      editData.logo_id !== profileData.logo_id ||
      editData.header_image_id !== profileData.header_image_id ||
      editData.video_url !== profileData.video_url ||
      !compareGallery(editData.gallery_images, profileData.gallery_images) ||
      !compareFaq(editData.faq, profileData.faq)
    )
  }, [editData, profileData])

  // Browser beforeunload handler - warns user when closing tab/browser
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) {
        e.preventDefault()
        e.returnValue = "" // Required for Chrome
        return ""
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [hasUnsavedChanges])

  // Handle browser back/forward button
  useEffect(() => {
    // Push a dummy state so we can intercept back button
    if (!isLoading) {
      window.history.pushState({ werkgeversprofiel: true }, "")
    }

    const handlePopState = (e: PopStateEvent) => {
      if (hasUnsavedChanges()) {
        // Prevent navigation by pushing state back
        window.history.pushState({ werkgeversprofiel: true }, "")
        // Show dialog
        setPendingNavigation("back")
        setShowUnsavedDialog(true)
      }
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [hasUnsavedChanges, isLoading])

  // Set page title
  useEffect(() => {
    document.title = "Werkgeversprofiel | Colourful jobs"
  }, [])

  // Fetch sectors
  useEffect(() => {
    const fetchSectors = async () => {
      setLoadingSectors(true)
      try {
        const response = await fetch("/api/lookups?type=sectors")
        if (response.ok) {
          const data = await response.json()
          if (data.sectors) {
            setSectors(sortLookupWithOverigeLast(data.sectors))
          }
        }
      } catch (error) {
        console.error("Error fetching sectors:", error)
      } finally {
        setLoadingSectors(false)
      }
    }
    fetchSectors()
  }, [])

  // Fetch profile data from API
  const fetchProfileData = useCallback(async () => {
    try {
      setIsLoading(true)
      setLoadError(null)

      const response = await fetch("/api/account")
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Kon gegevens niet ophalen")
      }

      const data = await response.json()

      if (data.website) {
        const newProfileData: ProfileData = {
          display_name: data.website.display_name || "",
          sector: data.website.sector || "",
          sector_id: data.website.sector_id || null,
          website_url: data.website.website_url || "",
          short_description: data.website.short_description || "",
          logo: data.website.logo || null,
          logo_id: data.website.logo_id || null,
          header_image: data.website.header_image || null,
          header_image_id: data.website.header_image_id || null,
          gallery_images: data.website.gallery_images || [],
          video_url: data.website.video_url || "",
          faq: data.website.faq || [],
        }
        setProfileData(newProfileData)
        setEditData(newProfileData)
      }
    } catch (error) {
      console.error("Error fetching profile data:", error)
      setLoadError(error instanceof Error ? error.message : "Er is een fout opgetreden")
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load data on mount
  useEffect(() => {
    fetchProfileData()
  }, [fetchProfileData])

  // Reset changes - revert editData to last saved profileData
  const resetChanges = () => {
    setEditData({ ...profileData })
    setErrors({})
  }

  // Handle navigation with unsaved changes check
  const handleNavigation = (url: string) => {
    if (hasUnsavedChanges()) {
      setPendingNavigation(url)
      setShowUnsavedDialog(true)
    } else {
      router.push(url)
    }
  }

  // Dialog action: Discard changes and navigate
  const handleDiscardAndNavigate = () => {
    setShowUnsavedDialog(false)
    if (pendingNavigation === "back") {
      // Go back in history
      router.back()
    } else if (pendingNavigation) {
      router.push(pendingNavigation)
    }
    setPendingNavigation(null)
  }

  // Dialog action: Save and navigate (only if validation passes)
  const handleSaveAndNavigate = async () => {
    // Try to save
    const isValid = validateProfile()
    if (!isValid) {
      setShowUnsavedDialog(false)
      toast.error("Vul de verplichte velden in", {
        description: "Niet alle verplichte velden zijn ingevuld. Vul deze eerst aan voordat je de pagina verlaat.",
      })
      setPendingNavigation(null)
      return
    }

    setIsSaving(true)
    try {
      const dataToSave = {
        display_name: editData.display_name,
        sector: editData.sector_id ? [editData.sector_id] : [],
        website_url: editData.website_url,
        short_description: editData.short_description,
        video_url: editData.video_url,
        logo: editData.logo_id ? [editData.logo_id] : [],
        header_image: editData.header_image_id ? [editData.header_image_id] : [],
        gallery: editData.gallery_images.map((img) => img.id),
      }

      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "website", data: dataToSave }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Kon gegevens niet opslaan")
      }

      // Check if FAQ changed
      const compareFaqArrays = (a: FAQItem[], b: FAQItem[]) => {
        if (a.length !== b.length) return false
        return a.every((item, i) =>
          item.id === b[i]?.id &&
          item.question === b[i]?.question &&
          item.answer === b[i]?.answer
        )
      }

      const faqChanged = !compareFaqArrays(editData.faq, profileData.faq)
      let syncedFaqs = editData.faq

      if (faqChanged) {
        const faqResponse = await fetch("/api/account", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            section: "faq",
            action: "sync",
            data: {
              items: editData.faq.map((item, index) => ({
                id: item.id,
                question: item.question,
                answer: item.answer,
                order: index,
              })),
            },
          }),
        })

        if (!faqResponse.ok) {
          const errorData = await faqResponse.json()
          throw new Error(errorData.error || "Kon FAQ niet opslaan")
        }

        const faqResult = await faqResponse.json()
        syncedFaqs = faqResult.data
      }

      // Update local state with saved data (including real FAQ IDs)
      const savedData = { ...editData, faq: syncedFaqs }
      setProfileData(savedData)
      setEditData(savedData)

      window.dispatchEvent(new Event('profile-updated'))
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 3000)
      toast.success("Werkgeversprofiel opgeslagen")
      
      setShowUnsavedDialog(false)
      if (pendingNavigation === "back") {
        router.back()
      } else if (pendingNavigation) {
        router.push(pendingNavigation)
      }
      setPendingNavigation(null)
    } catch (error) {
      console.error("Error saving profile:", error)
      toast.error(error instanceof Error ? error.message : "Er is een fout opgetreden bij het opslaan")
      setShowUnsavedDialog(false)
      setPendingNavigation(null)
    } finally {
      setIsSaving(false)
    }
  }

  // Dialog action: Cancel navigation
  const handleCancelNavigation = () => {
    setShowUnsavedDialog(false)
    setPendingNavigation(null)
  }

  // Validate required fields (only display_name, sector, and logo are required)
  const validateProfile = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!editData.display_name.trim()) {
      newErrors.display_name = "Weergavenaam is verplicht"
    }
    if (!editData.sector_id) {
      newErrors.sector = "Sector is verplicht"
    }
    if (!editData.logo) {
      newErrors.logo = "Logo is verplicht"
    }
    
    // Check for unsaved FAQ content
    if (newFaqQuestion.trim() || newFaqAnswer.trim()) {
      newErrors.unsavedFaq = "Sla de vraag nog op of maak de velden leeg."
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Save profile to API
  const saveProfile = async () => {
    if (!validateProfile()) {
      toast.error("Vul de verplichte velden in", {
        description: "Niet alle verplichte velden zijn ingevuld.",
      })
      return
    }

    setIsSaving(true)

    try {
      const dataToSave = {
        display_name: editData.display_name,
        sector: editData.sector_id ? [editData.sector_id] : [],
        website_url: editData.website_url,
        short_description: editData.short_description,
        video_url: editData.video_url,
        logo: editData.logo_id ? [editData.logo_id] : [],
        header_image: editData.header_image_id ? [editData.header_image_id] : [],
        gallery: editData.gallery_images.map((img) => img.id),
      }

      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          section: "website",
          data: dataToSave,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Kon gegevens niet opslaan")
      }

      // Check if FAQ changed
      const compareFaqArrays = (a: FAQItem[], b: FAQItem[]) => {
        if (a.length !== b.length) return false
        return a.every((item, i) =>
          item.id === b[i]?.id &&
          item.question === b[i]?.question &&
          item.answer === b[i]?.answer
        )
      }

      const faqChanged = !compareFaqArrays(editData.faq, profileData.faq)
      let syncedFaqs = editData.faq

      if (faqChanged) {
        const faqResponse = await fetch("/api/account", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            section: "faq",
            action: "sync",
            data: {
              items: editData.faq.map((item, index) => ({
                id: item.id,
                question: item.question,
                answer: item.answer,
                order: index,
              })),
            },
          }),
        })

        if (!faqResponse.ok) {
          const errorData = await faqResponse.json()
          throw new Error(errorData.error || "Kon FAQ niet opslaan")
        }

        const faqResult = await faqResponse.json()
        syncedFaqs = faqResult.data // Contains real Airtable IDs for new items
      }

      // Update local state with saved data (including real FAQ IDs)
      const savedData = { ...editData, faq: syncedFaqs }
      setProfileData(savedData)
      setEditData(savedData) // Important: update editData with real IDs

      // Dispatch event to notify layout to refresh profile status
      window.dispatchEvent(new Event('profile-updated'))

      // Show "just saved" indicator
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 3000)

      // Show success toast with optional return link
      if (returnToVacancy) {
        toast.success("Werkgeversprofiel opgeslagen", {
          description: "Je kunt nu verder met je vacature.",
          action: {
            label: "Terug naar vacature",
            onClick: () => router.push(returnToVacancy),
          },
        })
      } else {
        toast.success("Werkgeversprofiel opgeslagen")
      }
    } catch (error) {
      console.error("Error saving profile:", error)
      toast.error(error instanceof Error ? error.message : "Er is een fout opgetreden bij het opslaan")
    } finally {
      setIsSaving(false)
    }
  }

  // Skeleton for loading state
  const ProfileSkeleton = () => (
    <div className="rounded-t-[0.75rem] rounded-b-[2rem] overflow-hidden">
      <div className="bg-white/50 px-6 py-4 flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="bg-white p-6">
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-24 w-full" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-24 w-24 rounded-lg" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-24 w-32 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <DesktopHeader title={<>Werkgevers<br />profiel</>} />
        <ProfileSkeleton />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <DesktopHeader title={<>Werkgevers<br />profiel</>} />
        <div className="rounded-t-[0.75rem] rounded-b-[2rem] bg-white p-6">
          <p className="text-red-600">{loadError}</p>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => fetchProfileData()}
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
      {/* Page header with title */}
      <DesktopHeader title={<>Werkgevers<br />profiel</>} />

      {/* Profile section */}
      <div className="rounded-t-[0.75rem] rounded-b-[2rem] overflow-hidden">
        <div className="bg-white/50 px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div className="space-y-1">
              <h2 className="!text-[1.125rem] sm:!text-[1.5rem] font-semibold text-[#1F2D58] -mt-1">
                Maak indruk op kandidaten
              </h2>
              <p className="text-sm text-[#1F2D58]/60 max-w-[600px]">
                Dit profiel wordt zichtbaar op colourfuljobs.nl. Zorg dat het compleet is om de juiste kandidaten aan te spreken.
                {" "}Benieuwd hoe een werkgeversprofiel eruit ziet?{" "}
                <button
                  type="button"
                  onClick={() => setShowExampleModal(true)}
                  className="text-[#1F2D58] underline hover:text-[#1F2D58]/70 transition-colors"
                >
                  Bekijk hier een voorbeeld!
                </button>
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6">
          <ProfileForm
            data={editData}
            onChange={setEditData}
            isSaving={isSaving}
            errors={errors}
            onClearError={(field) => setErrors(prev => {
              const newErrors = { ...prev }
              delete newErrors[field]
              return newErrors
            })}
            sectors={sectors}
            loadingSectors={loadingSectors}
            newFaqQuestion={newFaqQuestion}
            setNewFaqQuestion={setNewFaqQuestion}
            newFaqAnswer={newFaqAnswer}
            setNewFaqAnswer={setNewFaqAnswer}
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
              <Button onClick={saveProfile} disabled={isSaving} showArrow={false}>
                {isSaving ? "Opslaan..." : <><Check className="h-4 w-4" />Opslaan</>}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Example profile modal */}
      <Dialog open={showExampleModal} onOpenChange={setShowExampleModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto p-0">
          <div className="relative">
            <div className="sticky top-0 w-full flex justify-end p-4 z-10 pointer-events-none" style={{ marginBottom: '-62px' }}>
              <Button
                variant="tertiary"
                size="icon"
                className="w-[30px] h-[30px] bg-white/80 hover:bg-white shadow-sm pointer-events-auto"
                onClick={() => setShowExampleModal(false)}
                showArrow={false}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <img
              src="/voorbeeld-werkgeversprofiel.jpg"
              alt="Voorbeeld werkgeversprofiel"
              className="w-full h-auto"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Unsaved changes dialog */}
      <Dialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#1F2D58]">Niet-opgeslagen wijzigingen</DialogTitle>
            <DialogDescription className="text-[#1F2D58]/70">
              Je hebt wijzigingen gemaakt die nog niet zijn opgeslagen. Wat wil je doen?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-2">
            <Button
              variant="secondary"
              onClick={handleCancelNavigation}
              showArrow={false}
              className="order-3 sm:order-1"
            >
              Annuleren
            </Button>
            <Button
              variant="secondary"
              onClick={handleDiscardAndNavigate}
              showArrow={false}
              className="order-2 sm:order-2"
            >
              Niet opslaan
            </Button>
            <Button
              onClick={handleSaveAndNavigate}
              disabled={isSaving}
              className="order-1 sm:order-3"
            >
              {isSaving ? "Opslaan..." : "Opslaan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================
// SORTABLE FAQ ITEM COMPONENT
// ============================================

interface SortableFAQItemProps {
  item: FAQItem
  isEditing: boolean
  editQuestion: string
  editAnswer: string
  onEditQuestionChange: (value: string) => void
  onEditAnswerChange: (value: string) => void
  onStartEdit: () => void
  onCancelEdit: () => void
  onSave: () => void
  onDelete: () => void
  isSaving: boolean
  disabled: boolean
}

function SortableFAQItem({
  item,
  isEditing,
  editQuestion,
  editAnswer,
  onEditQuestionChange,
  onEditAnswerChange,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
  isSaving,
  disabled,
}: SortableFAQItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id!, disabled: disabled || isEditing })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        bg-[#E8EEF2] rounded-lg p-4
        ${isDragging ? "shadow-lg ring-2 ring-[#F86600]" : ""}
      `}
    >
      {isEditing ? (
        // Edit mode
        <div className="space-y-3">
          <Input
            value={editQuestion}
            onChange={(e) => onEditQuestionChange(e.target.value)}
            placeholder="Vraag"
            disabled={isSaving}
          />
          <Textarea
            value={editAnswer}
            onChange={(e) => onEditAnswerChange(e.target.value)}
            placeholder="Antwoord"
            rows={3}
            disabled={isSaving}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={onSave}
              disabled={isSaving}
              showArrow={false}
            >
              {isSaving ? "Opslaan..." : <><Check className="h-4 w-4" />Opslaan</>}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onCancelEdit}
              disabled={isSaving}
              showArrow={false}
            >
              Annuleren
            </Button>
          </div>
        </div>
      ) : (
        // View mode with drag handle
        <div className="flex items-start gap-3">
          {/* Drag handle */}
          {!disabled && (
            <div
              {...attributes}
              {...listeners}
              className="flex-shrink-0 mt-1 cursor-grab active:cursor-grabbing text-[#1F2D58]/40 hover:text-[#1F2D58]/70"
            >
              <GripVertical className="h-5 w-5" />
            </div>
          )}
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-[#1F2D58]">{item.question}</p>
            <p className="text-sm text-[#1F2D58]/70 mt-1">{item.answer}</p>
          </div>
          
          {/* Action buttons */}
          <div className="flex gap-1 flex-shrink-0">
            <Button
              type="button"
              variant="tertiary"
              size="icon"
              className="w-[30px] h-[30px]"
              onClick={onStartEdit}
              disabled={disabled || isSaving}
              showArrow={false}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="tertiary"
              size="icon"
              className="w-[30px] h-[30px]"
              onClick={onDelete}
              disabled={disabled || isSaving}
              showArrow={false}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// FORM COMPONENT
// ============================================

interface ProfileFormProps {
  data: ProfileData
  onChange: (data: ProfileData) => void
  isSaving: boolean
  errors: Record<string, string>
  onClearError: (field: string) => void
  sectors: Sector[]
  loadingSectors: boolean
  newFaqQuestion: string
  setNewFaqQuestion: (value: string) => void
  newFaqAnswer: string
  setNewFaqAnswer: (value: string) => void
}

function ProfileForm({ 
  data, 
  onChange, 
  isSaving,
  errors,
  onClearError,
  sectors,
  loadingSectors,
  newFaqQuestion,
  setNewFaqQuestion,
  newFaqAnswer,
  setNewFaqAnswer,
}: ProfileFormProps) {
  // Dialog states for media pickers
  const [headerPickerOpen, setHeaderPickerOpen] = useState(false)
  const [galleryPickerOpen, setGalleryPickerOpen] = useState(false)
  
  // Logo upload state
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  // Handle logo upload - direct to Cloudinary
  const handleLogoUpload = async (file: File) => {
    // Validate file locally first
    const validation = validateFile(file, "logo")
    if (!validation.valid) {
      toast.error("Ongeldig bestand", {
        description: validation.error,
      })
      return
    }

    setIsUploadingLogo(true)
    try {
      // Use direct Cloudinary upload (bypasses Vercel 4.5MB limit)
      const result = await uploadMedia(file, "logo")
      
      // Update form data with new logo
      onChange({ ...data, logo: result.asset.url, logo_id: result.asset.id })
      onClearError("logo")
      
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
      onClearError("header_image")
    } else {
      onChange({ ...data, header_image: null, header_image_id: null })
    }
  }

  // Handle gallery selection from picker
  const handleGallerySelect = (selectedAssets: { id: string; url: string }[]) => {
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
      ...(data.header_image_id === id && { header_image: null, header_image_id: null }),
    })
  }

  // FAQ state (newFaqQuestion and newFaqAnswer are now props)
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null)
  const [editFaqQuestion, setEditFaqQuestion] = useState("")
  const [editFaqAnswer, setEditFaqAnswer] = useState("")

  // Add new FAQ item (local state only)
  const handleAddFaq = () => {
    if (!newFaqQuestion.trim() || !newFaqAnswer.trim()) {
      toast.error("Vul beide velden in", {
        description: "Vraag en antwoord zijn verplicht.",
      })
      return
    }

    onChange({
      ...data,
      faq: [...data.faq, {
        id: `temp-${Date.now()}`, // Tijdelijk ID, wordt bij sync vervangen door Airtable ID
        question: newFaqQuestion,
        answer: newFaqAnswer,
        order: data.faq.length,
      }],
    })
    setNewFaqQuestion("")
    setNewFaqAnswer("")
  }

  // Start editing FAQ item
  const startEditFaq = (item: FAQItem) => {
    setEditingFaqId(item.id || null)
    setEditFaqQuestion(item.question)
    setEditFaqAnswer(item.answer)
  }

  // Cancel editing FAQ item
  const cancelEditFaq = () => {
    setEditingFaqId(null)
    setEditFaqQuestion("")
    setEditFaqAnswer("")
  }

  // Save edited FAQ item (local state only)
  const handleSaveFaq = (id: string) => {
    if (!editFaqQuestion.trim() || !editFaqAnswer.trim()) {
      toast.error("Vul beide velden in")
      return
    }

    onChange({
      ...data,
      faq: data.faq.map((item) =>
        item.id === id
          ? { ...item, question: editFaqQuestion, answer: editFaqAnswer }
          : item
      ),
    })
    cancelEditFaq()
  }

  // Delete FAQ item (local state only)
  const handleDeleteFaq = (id: string) => {
    onChange({
      ...data,
      faq: data.faq.filter((item) => item.id !== id),
    })
  }

  // DnD sensors for FAQ reordering
  const faqSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Handle FAQ reorder (drag & drop - local state only)
  const handleFaqDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = data.faq.findIndex((item) => item.id === active.id)
      const newIndex = data.faq.findIndex((item) => item.id === over.id)
      const newOrder = arrayMove(data.faq, oldIndex, newIndex)
      onChange({ ...data, faq: newOrder })
    }
  }

  return (
    <div className="space-y-6">
      {/* Basic info */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="display_name">
            Weergavenaam organisatie <span className="text-slate-400 text-sm">*</span>
          </Label>
          <Input
            id="display_name"
            value={data.display_name}
            onChange={(e) => onChange({ ...data, display_name: e.target.value })}
            disabled={isSaving}
            className={errors.display_name ? "border-red-500" : ""}
          />
          {errors.display_name && (
            <p className="text-sm text-red-500">{errors.display_name}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="sector">
            Sector <span className="text-slate-400 text-sm">*</span>
          </Label>
          <Select
            value={data.sector_id || ""}
            onValueChange={(value) => {
              const selectedSector = sectors.find((s) => s.id === value)
              onChange({ 
                ...data, 
                sector: selectedSector?.name || "",
                sector_id: value 
              })
            }}
            disabled={isSaving || loadingSectors}
          >
            <SelectTrigger id="sector" className={errors.sector ? "border-red-500" : ""}>
              <SelectValue placeholder={loadingSectors ? "Laden..." : "Selecteer sector"} />
            </SelectTrigger>
            <SelectContent>
              {sectors.map((sector) => (
                <SelectItem key={sector.id} value={sector.id}>
                  {sector.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.sector && (
            <p className="text-sm text-red-500">{errors.sector}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="website_url">
            Website-URL <span className="text-slate-400 text-sm">*</span>
          </Label>
          <Input
            id="website_url"
            type="url"
            placeholder="www.voorbeeld.nl"
            value={data.website_url}
            onChange={(e) => onChange({ ...data, website_url: e.target.value })}
            disabled={isSaving}
          />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="short_description" className="!mb-0">
            Omschrijving organisatie
          </Label>
          <InfoTooltip content="Een korte introductie van je organisatie in 2-4 zinnen. Denk aan: wat jullie doen, waar jullie voor staan, of wat jullie uniek maakt." />
        </div>
        <Textarea
          id="short_description"
          rows={4}
          value={data.short_description}
          onChange={(e) => onChange({ ...data, short_description: e.target.value })}
          disabled={isSaving}
        />
      </div>

      <hr className="border-[#E8EEF2]" />

      {/* Header and Logo with pickers */}
      <div className="flex flex-col sm:flex-row gap-6">
        {/* Header */}
        <div className="space-y-3 flex-1">
          <div className="flex items-center gap-2">
            <Label className="!mb-0">
              Headerbeeld
            </Label>
            <InfoTooltip content="Upload een breed, liggend beeld dat je organisatie representeert. Dit wordt prominent getoond bovenaan je werkgeversprofiel." />
          </div>
          <div className="space-y-3">
            {data.header_image ? (
              <div className="h-32 w-full max-w-md rounded-[0.75rem] bg-[#193DAB]/12 overflow-hidden">
                <img src={data.header_image} alt="Header" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="h-32 w-full max-w-md rounded-[0.75rem] bg-[#193DAB]/12 flex items-center justify-center">
                <ImageIcon className="h-8 w-8 text-[#1F2D58]/40" />
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

        {/* Vertical divider - only visible on sm+ */}
        <div className="hidden sm:block w-px bg-[#E8EEF2] self-stretch" />

        {/* Logo */}
        <div className="space-y-3 flex-1">
          <div className="flex items-center gap-2">
            <Label className={`!mb-0 ${errors.logo ? "text-red-500" : ""}`}>
              Logo <span className="text-slate-400 text-sm">*</span>
            </Label>
            <InfoTooltip content="Upload je logo als JPG, PNG of SVG. PNG en SVG met een transparante achtergrond werken het beste." />
          </div>
          {/* Hidden file input for logo upload */}
          <input
            ref={logoInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/svg+xml"
            onChange={handleLogoInputChange}
            className="hidden"
          />
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center gap-1.5">
              {data.logo ? (
                <div className={`w-28 h-24 rounded-[0.75rem] bg-white border border-gray-200 flex items-center justify-center p-3 ${errors.logo ? "ring-2 ring-red-500" : ""}`}>
                  <img src={data.logo} alt="Logo" className="max-h-full max-w-full object-contain" />
                </div>
              ) : (
                <div className={`w-28 h-24 rounded-[0.75rem] bg-white border border-gray-200 flex items-center justify-center ${errors.logo ? "ring-2 ring-red-500" : ""}`}>
                  <ImageIcon className="h-8 w-8 text-[#1F2D58]/40" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
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
              <p className="text-xs text-[#1F2D58]/50">JPG, PNG of SVG, max 5MB</p>
            </div>
          </div>
          {errors.logo && (
            <p className="text-sm text-red-500">{errors.logo}</p>
          )}
        </div>
      </div>

      <hr className="border-[#E8EEF2]" />

      {/* Gallery with drag & drop */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Label className="!mb-0">Afbeeldingen</Label>
          <InfoTooltip content="Laat je kantoor, team of werksfeer zien. Foto's geven kandidaten een kijkje achter de schermen." />
        </div>
        
        {data.gallery_images.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-[#1F2D58]/50">Kies maximaal twee afbeeldingen</p>
            <SortableGallery
              images={data.gallery_images}
              onReorder={handleGalleryReorder}
              onRemove={handleGalleryRemove}
              onAdd={() => setGalleryPickerOpen(true)}
              disabled={isSaving}
            />
            <p className="text-xs text-[#1F2D58]/50">Sleep om de volgorde te wijzigen</p>
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
        <div className="flex items-center gap-2">
          <Label htmlFor="video_url" className="!mb-0">Video URL (YouTube of Vimeo)</Label>
          <InfoTooltip content="Heb je een bedrijfsvideo? Voeg de YouTube of Vimeo link toe. Video's maken je profiel persoonlijker." />
        </div>
        <Input
          id="video_url"
          type="url"
          placeholder="https://www.youtube.com/watch?v=..."
          value={data.video_url}
          onChange={(e) => onChange({ ...data, video_url: e.target.value })}
          disabled={isSaving}
        />
      </div>

      {/* FAQ */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Label className="!mb-0">Veelgestelde vragen</Label>
          <InfoTooltip content="Beantwoord vragen die kandidaten vaak hebben, zoals over werkuren, thuiswerken of het sollicitatieproces." />
        </div>

        {/* Existing FAQ items with drag & drop */}
        {data.faq.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-[#1F2D58]/50">Sleep om de volgorde te wijzigen</p>
            <DndContext
              sensors={faqSensors}
              collisionDetection={closestCenter}
              onDragEnd={handleFaqDragEnd}
            >
              <SortableContext
                items={data.faq.map((item) => item.id!)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {data.faq.map((item) => (
                    <SortableFAQItem
                      key={item.id}
                      item={item}
                      isEditing={editingFaqId === item.id}
                      editQuestion={editFaqQuestion}
                      editAnswer={editFaqAnswer}
                      onEditQuestionChange={setEditFaqQuestion}
                      onEditAnswerChange={setEditFaqAnswer}
                      onStartEdit={() => startEditFaq(item)}
                      onCancelEdit={cancelEditFaq}
                      onSave={() => handleSaveFaq(item.id!)}
                      onDelete={() => handleDeleteFaq(item.id!)}
                      isSaving={isSaving}
                      disabled={isSaving}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}

        {/* Add new FAQ form */}
        <div className="border-2 border-dashed border-[#1F2D58]/20 rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-[#1F2D58]">Nieuwe vraag toevoegen</p>
          <Input
            value={newFaqQuestion}
            onChange={(e) => {
              setNewFaqQuestion(e.target.value)
              if (errors.unsavedFaq) {
                onClearError("unsavedFaq")
              }
            }}
            placeholder="Vraag (bijv. Hoe ziet het sollicitatieproces eruit?)"
            disabled={isSaving}
            className={errors.unsavedFaq ? "border-red-500" : ""}
          />
          <Textarea
            value={newFaqAnswer}
            onChange={(e) => {
              setNewFaqAnswer(e.target.value)
              if (errors.unsavedFaq) {
                onClearError("unsavedFaq")
              }
            }}
            placeholder="Antwoord"
            rows={3}
            disabled={isSaving}
            className={errors.unsavedFaq ? "border-red-500" : ""}
          />
          {errors.unsavedFaq && (
            <p className="text-sm text-red-500">{errors.unsavedFaq}</p>
          )}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleAddFaq}
            disabled={isSaving || !newFaqQuestion.trim() || !newFaqAnswer.trim()}
            showArrow={false}
          >
            <Plus className="h-4 w-4" />
            Toevoegen
          </Button>
        </div>
      </div>

      {/* Media Picker Dialogs */}
      <MediaPickerDialog
        open={headerPickerOpen}
        onOpenChange={setHeaderPickerOpen}
        title="Headerbeeld kiezen"
        description="Selecteer een afbeelding als header voor je werkgeversprofiel."
        selectedIds={data.header_image_id ? [data.header_image_id] : []}
        onSelect={handleHeaderSelect}
        singleSelect
        filter="gallery"
      />

      <MediaPickerDialog
        open={galleryPickerOpen}
        onOpenChange={setGalleryPickerOpen}
        title="Kies max. 2 afbeeldingen"
        description="Selecteer welke afbeeldingen op je werkgeversprofiel worden getoond."
        selectedIds={data.gallery_images.map((img) => img.id)}
        onSelect={handleGallerySelect}
        maxSelection={2}
        filter="gallery"
      />
    </div>
  )
}
