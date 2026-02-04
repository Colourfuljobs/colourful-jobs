"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Trash2, Image as ImageIcon, Plus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
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
import { uploadMedia, validateFile } from "@/lib/cloudinary-upload"

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
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Data state
  const [images, setImages] = useState<MediaAsset[]>([])

  // Dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{ id: string } | null>(null)

  // File input refs
  const imageInputRef = useRef<HTMLInputElement>(null)

  // Fetch media data
  const fetchMedia = useCallback(async () => {
    try {
      const response = await fetch("/api/media")
      if (!response.ok) {
        throw new Error("Failed to fetch media")
      }
      const data: MediaData = await response.json()
      setImages(data.images)
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

  const handleImageUpload = async (file: File) => {
    // Validate file locally first
    const validation = validateFile(file, "sfeerbeeld")
    if (!validation.valid) {
      toast.error("Ongeldig bestand", {
        description: validation.error,
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
      // Use direct Cloudinary upload (bypasses Vercel 4.5MB limit)
      const result = await uploadMedia(file, "sfeerbeeld")
      
      setImages((prev) => [...prev, result.asset])
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

  // Delete handlers
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

  // File input change handler (supports multiple files)
  const handleImageInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Check how many slots are remaining
    const remaining = MAX_IMAGES - images.length
    const filesToUpload = files.slice(0, remaining)

    // Show warning if some files were skipped
    if (files.length > remaining) {
      toast.warning("Niet alle bestanden geüpload", {
        description: `Je kunt nog ${remaining} afbeelding${remaining === 1 ? "" : "en"} uploaden. ${files.length - remaining} bestand${files.length - remaining === 1 ? " is" : "en zijn"} overgeslagen.`,
      })
    }

    // Upload files sequentially
    for (const file of filesToUpload) {
      await handleImageUpload(file)
    }
  }

  // Skeleton component
  const ImagesSkeleton = () => (
    <div className="rounded-t-[0.75rem] rounded-b-[2rem] overflow-hidden">
      <div className="bg-white/50 px-6 py-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="!text-[1.125rem] sm:!text-[1.5rem] font-semibold text-[#1F2D58] -mt-1">
              Afbeeldingen
            </h2>
            <Skeleton className="h-6 w-12 rounded-full -mt-1" />
          </div>
          <p className="text-sm text-[#1F2D58]/60 max-w-[600px] mt-1">
            Upload afbeeldingen in je beeldbank, zodat je deze kunt gebruiken in vacatures en in je werkgeversprofiel. Maximaal 10 afbeeldingen.
          </p>
        </div>
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
        <ImagesSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Hidden file input */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/avif,image/svg+xml"
        onChange={handleImageInputChange}
        className="hidden"
        multiple
      />

      {/* Page header with title, credits and actions */}
      <DesktopHeader title="Beeldbank" />

      {/* Images Section */}
      <div className="rounded-t-[0.75rem] rounded-b-[2rem] overflow-hidden">
        <div className="bg-white/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <h2 className="!text-[1.125rem] sm:!text-[1.5rem] font-semibold text-[#1F2D58] -mt-1">
              Afbeeldingen
            </h2>
            <span className="bg-white px-2 py-0.5 rounded-full text-sm text-[#1F2D58]/60 -mt-1">
              {images.length}/{MAX_IMAGES}
            </span>
          </div>
          <p className="text-sm text-[#1F2D58]/60 max-w-[600px] mt-1">
            Upload afbeeldingen in je beeldbank, zodat je deze kunt gebruiken in vacatures en in je werkgeversprofiel. Maximaal 10 afbeeldingen.
          </p>
        </div>
        <div className="bg-white p-6">
          {images.length > 0 ? (
            <div className="flex flex-wrap gap-4 items-end">
              {images.map((image) => (
                <div
                  key={image.id}
                  className="group relative"
                >
                  {/* Image preview */}
                  <img
                    src={image.url}
                    alt={image.altText || "Media asset"}
                    className="h-24 sm:h-32 w-auto rounded-lg"
                  />
                  
                  {/* Delete button on hover */}
                  <button
                    onClick={() => handleDeleteClick(image.id)}
                    className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full text-red-600 hover:bg-white hover:text-red-700 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {/* Upload button card */}
              {images.length < MAX_IMAGES && (
                <button
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isUploadingImage}
                  className="h-24 sm:h-32 w-24 sm:w-32 rounded-lg border-2 border-dashed border-[#193DAB]/20 hover:border-[#193DAB]/40 bg-[#E8EEF2]/50 hover:bg-[#E8EEF2] flex flex-col items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-10 h-10 rounded-full bg-[#193DAB]/12 flex items-center justify-center">
                    {isUploadingImage ? (
                      <Spinner className="h-5 w-5 text-[#1F2D58]" />
                    ) : (
                      <Plus className="h-5 w-5 text-[#1F2D58]" />
                    )}
                  </div>
                  <span className="text-sm text-[#1F2D58]">Uploaden</span>
                </button>
              )}
            </div>
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
