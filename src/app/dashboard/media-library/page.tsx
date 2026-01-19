"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Trash2, Image as ImageIcon, Check, RefreshCw, Plus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DesktopHeader } from "@/components/dashboard"

// Types
interface MediaAsset {
  id: string
  url: string
  fileType: string
  fileSize: string
  isHeader?: boolean
  altText?: string
}

interface MediaData {
  logo: MediaAsset | null
  images: MediaAsset[]
  headerImageId: string | null
  maxImages: number
}

const MAX_IMAGES = 10

export default function MediaLibraryPage() {
  // Set page title
  useEffect(() => {
    document.title = "Beeldbank | Colourful jobs"
  }, [])

  // Loading states
  const [isLoading, setIsLoading] = useState(true)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSettingHeader, setIsSettingHeader] = useState<string | null>(null)

  // Data state
  const [logo, setLogo] = useState<MediaAsset | null>(null)
  const [images, setImages] = useState<MediaAsset[]>([])
  const [headerImageId, setHeaderImageId] = useState<string | null>(null)

  // Dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{ id: string } | null>(null)

  // File input refs
  const logoInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  // Fetch media data
  const fetchMedia = useCallback(async () => {
    try {
      const response = await fetch("/api/media")
      if (!response.ok) {
        throw new Error("Failed to fetch media")
      }
      const data: MediaData = await response.json()
      setLogo(data.logo)
      setImages(data.images)
      setHeaderImageId(data.headerImageId)
    } catch (error) {
      console.error("Error fetching media:", error)
      toast.error("Fout bij laden", {
        description: "Kon media niet laden. Probeer het opnieuw.",
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMedia()
  }, [fetchMedia])

  // Upload handlers
  const handleLogoUpload = async (file: File) => {
    // Validate file
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/avif", "image/svg+xml"]
    if (!allowedTypes.includes(file.type)) {
      toast.error("Ongeldig bestandstype", {
        description: "Alleen JPEG, PNG, WebP, AVIF of SVG afbeeldingen zijn toegestaan",
      })
      return
    }

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

      const data = await response.json()
      setLogo(data.asset)
      toast.success("Logo geüpload", {
        description: "Je logo is succesvol geüpload.",
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

  const handleImageUpload = async (file: File) => {
    // Validate file
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/avif", "image/svg+xml"]
    if (!allowedTypes.includes(file.type)) {
      toast.error("Ongeldig bestandstype", {
        description: "Alleen JPEG, PNG, WebP, AVIF of SVG afbeeldingen zijn toegestaan",
      })
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Bestand te groot", {
        description: "Afbeelding mag maximaal 10MB zijn",
      })
      return
    }

    if (images.length >= MAX_IMAGES) {
      toast.error("Maximum bereikt", {
        description: `Je kunt maximaal ${MAX_IMAGES} afbeeldingen uploaden`,
      })
      return
    }

    setIsUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", "sfeerbeeld")

      const response = await fetch("/api/media", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Upload failed")
      }

      const data = await response.json()
      setImages((prev) => [...prev, data.asset])
      toast.success("Afbeelding geüpload", {
        description: "Je afbeelding is succesvol toegevoegd.",
      })
    } catch (error) {
      console.error("Error uploading image:", error)
      toast.error("Upload mislukt", {
        description: error instanceof Error ? error.message : "Probeer het opnieuw.",
      })
    } finally {
      setIsUploadingImage(false)
      if (imageInputRef.current) {
        imageInputRef.current.value = ""
      }
    }
  }

  // Header selection handler
  const handleSetHeader = async (assetId: string) => {
    // If already the header, remove it
    const action = headerImageId === assetId ? "remove_header" : "set_header"
    
    setIsSettingHeader(assetId)
    try {
      const response = await fetch("/api/media", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId, action }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update")
      }

      const data = await response.json()
      setHeaderImageId(data.headerImageId)
      
      if (action === "set_header") {
        toast.success("Header ingesteld", {
          description: "Deze afbeelding wordt nu als header gebruikt.",
        })
      } else {
        toast.success("Header verwijderd", {
          description: "De header afbeelding is verwijderd.",
        })
      }
    } catch (error) {
      console.error("Error setting header:", error)
      toast.error("Fout", {
        description: "Kon header niet instellen. Probeer het opnieuw.",
      })
    } finally {
      setIsSettingHeader(null)
    }
  }

  // Delete handlers (only for images, not logo)
  const handleDeleteClick = (id: string) => {
    setItemToDelete({ id })
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return

    setIsDeleting(true)
    try {
      const response = await fetch(
        `/api/media?id=${itemToDelete.id}&type=sfeerbeeld`,
        { method: "DELETE" }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Delete failed")
      }

      setImages((prev) => prev.filter((img) => img.id !== itemToDelete.id))
      // Clear header if deleted image was the header
      if (headerImageId === itemToDelete.id) {
        setHeaderImageId(null)
      }
      toast.success("Afbeelding verwijderd", {
        description: "De afbeelding is succesvol verwijderd.",
      })
    } catch (error) {
      console.error("Error deleting:", error)
      toast.error("Verwijderen mislukt", {
        description: error instanceof Error ? error.message : "Probeer het opnieuw.",
      })
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setItemToDelete(null)
    }
  }

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false)
    setItemToDelete(null)
  }

  // File input change handlers
  const handleLogoInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleLogoUpload(file)
  }

  const handleImageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleImageUpload(file)
  }

  // Skeleton components
  const LogoSkeleton = () => (
    <div className="rounded-t-[0.75rem] rounded-b-[2rem] overflow-hidden">
      <div className="bg-white/50 px-4 pt-4 pb-4 flex items-center justify-between">
        <h2 className="!text-[1.5rem] font-semibold text-[#1F2D58]">
          Logo
        </h2>
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="bg-white p-6">
        <div className="flex items-start gap-4">
          <Skeleton className="h-20 w-[200px] rounded-lg" />
          <div className="flex flex-col gap-1">
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-4 w-14" />
          </div>
        </div>
      </div>
    </div>
  )

  const ImagesSkeleton = () => (
    <div className="rounded-t-[0.75rem] rounded-b-[2rem] overflow-hidden">
      <div className="bg-white/50 px-4 pt-4 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="!text-[1.5rem] font-semibold text-[#1F2D58]">
            Afbeeldingen
          </h2>
          <Skeleton className="h-4 w-10" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="bg-white p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[100px] sm:h-[120px] rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <DesktopHeader title="Beeldbank" />
        <LogoSkeleton />
        <ImagesSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Hidden file inputs */}
      <input
        ref={logoInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/avif,image/svg+xml"
        onChange={handleLogoInputChange}
        className="hidden"
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/avif,image/svg+xml"
        onChange={handleImageInputChange}
        className="hidden"
      />

      {/* Page header with title, credits and actions */}
      <DesktopHeader title="Beeldbank" />

      {/* Logo Section */}
      <div className="rounded-t-[0.75rem] rounded-b-[2rem] overflow-hidden">
        <div className="bg-white/50 px-4 pt-4 pb-4 flex items-center justify-between">
          <h2 className="!text-[1.5rem] font-semibold text-[#1F2D58]">
            Logo
          </h2>
          <Button
            variant="secondary"
            size="sm"
            showArrow={false}
            onClick={() => logoInputRef.current?.click()}
            disabled={isUploadingLogo}
          >
            {isUploadingLogo ? (
              <>
                <Spinner className="h-4 w-4 mr-1" />
                Uploaden...
              </>
            ) : (
              <>
                {logo ? (
                  <RefreshCw className="h-4 w-4 mr-1" />
                ) : (
                  <Plus className="h-4 w-4 mr-1" />
                )}
                {logo ? "Vervangen" : "Uploaden"}
              </>
            )}
          </Button>
        </div>
        <div className="bg-white p-6">
          <p className="text-sm text-[#1F2D58]/60 mb-4">
            Het logo wordt op de Colourful jobs website gebruikt bij de vacatures en op het bedrijfsprofiel. Je kunt maar één logo uploaden.
          </p>
          {logo ? (
            <div className="flex items-start gap-4">
              {/* Logo preview */}
              <div className="bg-[#193DAB]/12 rounded-lg overflow-hidden">
                <img
                  src={logo.url}
                  alt={logo.altText || "Bedrijfslogo"}
                  className="h-20 w-auto max-w-[200px] object-contain p-2"
                />
              </div>
              {/* File type badge */}
              <Badge variant="secondary" className="bg-[#193DAB]/12 text-[#1F2D58] text-xs hover:bg-[#193DAB]/12 border-none w-fit">
                {logo.fileType}
              </Badge>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4 py-2 text-center sm:text-left">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#193DAB]/12 flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-[#1F2D58]/60" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-[#1F2D58]">Nog geen logo</p>
                <p className="text-sm text-[#1F2D58]/60">Upload een logo om je bedrijf herkenbaar te maken.</p>
              </div>
              <Button 
                showArrow={false}
                onClick={() => logoInputRef.current?.click()}
                disabled={isUploadingLogo}
              >
                {isUploadingLogo ? (
                  <>
                    <Spinner className="h-4 w-4 mr-1" />
                    Uploaden...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-1" />
                    Logo uploaden
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Images Section */}
      <div className="rounded-t-[0.75rem] rounded-b-[2rem] overflow-hidden">
        <div className="bg-white/50 px-4 pt-4 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="!text-[1.5rem] font-semibold text-[#1F2D58]">
              Afbeeldingen
            </h2>
            <span className="text-sm text-[#1F2D58]/60">
              {images.length}/{MAX_IMAGES}
            </span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            disabled={images.length >= MAX_IMAGES || isUploadingImage}
            showArrow={false}
            onClick={() => imageInputRef.current?.click()}
          >
            {isUploadingImage ? (
              <>
                <Spinner className="h-4 w-4 mr-1" />
                Uploaden...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1" />
                Uploaden
              </>
            )}
          </Button>
        </div>
        <div className="bg-white p-6">
          {images.length > 0 ? (
            <>
              <p className="text-sm text-[#1F2D58]/60 mb-4">
                Selecteer de afbeelding die je als headerbeeld op je bedrijfsprofiel wilt gebruiken. De overige afbeeldingen komen in de fotogalerij en kun je gebruiken in vacatures.
              </p>
              <div className="flex flex-wrap gap-4 items-end">
                {images.map((image) => {
                  const isHeader = headerImageId === image.id
                  const isSettingThis = isSettingHeader === image.id
                  
                  return (
                    <div
                      key={image.id}
                      className={`group relative rounded-lg overflow-hidden cursor-pointer transition-all ${
                        isHeader ? "ring-2 ring-[#F86600] ring-offset-2" : "hover:ring-2 hover:ring-[#193DAB]/40"
                      }`}
                      onClick={() => !isSettingThis && handleSetHeader(image.id)}
                    >
                      {/* Image preview */}
                      <img
                        src={image.url}
                        alt={image.altText || "Media asset"}
                        className="h-24 sm:h-32 max-w-48 rounded-lg object-contain"
                      />
                      
                      {/* Header badge */}
                      {isHeader && (
                        <div className="absolute top-2 left-2">
                          <Badge className="bg-[#F86600] text-white text-xs hover:bg-[#F86600] border-none">
                            <Check className="h-3 w-3 mr-1" />
                            Header
                          </Badge>
                        </div>
                      )}
                      
                      {/* Loading overlay */}
                      {isSettingThis && (
                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
                          <Spinner className="h-6 w-6 text-[#193DAB]" />
                        </div>
                      )}
                      
                      {/* Delete button on hover */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteClick(image.id)
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full text-red-600 hover:bg-white hover:text-red-700 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4 py-2 text-center sm:text-left">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#193DAB]/12 flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-[#1F2D58]/60" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-[#1F2D58]">Nog geen afbeeldingen</p>
                <p className="text-sm text-[#1F2D58]/60">Upload afbeeldingen om te gebruiken op je bedrijfspagina en vacatures.</p>
              </div>
              <Button 
                showArrow={false}
                onClick={() => imageInputRef.current?.click()}
                disabled={isUploadingImage}
              >
                {isUploadingImage ? (
                  <>
                    <Spinner className="h-4 w-4 mr-1" />
                    Uploaden...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-1" />
                    Afbeeldingen uploaden
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Afbeelding verwijderen</DialogTitle>
            <DialogDescription className="text-[#1F2D58]/70">
              Weet je het zeker? De handeling kan niet worden teruggedraaid en de afbeelding zal van het bedrijfsprofiel verwijderd worden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-6">
            <Button
              variant="secondary"
              onClick={handleCancelDelete}
              showArrow={false}
              disabled={isDeleting}
            >
              Annuleren
            </Button>
            <Button
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Spinner className="h-4 w-4 mr-1" />
                  Verwijderen...
                </>
              ) : (
                "Verwijderen"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
