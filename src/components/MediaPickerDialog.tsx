"use client"

import { useState, useEffect, useCallback, useRef, DragEvent } from "react"
import { Check, Image as ImageIcon, Plus, Trash2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"

interface MediaAsset {
  id: string
  url: string
  fileType: string
  fileSize: string
  isHeader?: boolean
  altText?: string
}

interface SelectedAsset {
  id: string
  url: string
}

interface MediaPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  selectedIds: string[]
  onSelect: (selectedAssets: SelectedAsset[]) => void
  maxSelection?: number
  /** If true, only allow single selection (for logo/header) */
  singleSelect?: boolean
  /** Filter to show only certain types - "logo" shows only logo, "gallery" shows only sfeerbeelden */
  filter?: "logo" | "gallery" | "all"
}

export function MediaPickerDialog({
  open,
  onOpenChange,
  title,
  description,
  selectedIds,
  onSelect,
  maxSelection = 10,
  singleSelect = false,
  filter = "all",
}: MediaPickerDialogProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [logo, setLogo] = useState<MediaAsset | null>(null)
  const [images, setImages] = useState<MediaAsset[]>([])
  const [localSelection, setLocalSelection] = useState<string[]>(selectedIds || [])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Whether to show upload option (not for logo filter)
  const showUpload = filter !== "logo"

  // Fetch media when dialog opens
  const fetchMedia = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/media")
      if (!response.ok) throw new Error("Failed to fetch media")
      
      const data = await response.json()
      setLogo(data.logo)
      setImages(data.images || [])
    } catch (error) {
      console.error("Error fetching media:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Handle file upload
  const handleUpload = async (file: File) => {
    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/avif", "image/svg+xml"]
    if (!allowedTypes.includes(file.type)) {
      toast.error("Ongeldig bestandstype", {
        description: "Alleen JPEG, PNG, WebP, AVIF of SVG afbeeldingen zijn toegestaan",
      })
      return
    }

    // Validate file size (10MB for gallery images)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Bestand te groot", {
        description: "Afbeelding mag maximaal 10MB zijn",
      })
      return
    }

    // Check max images
    if (images.length >= 10) {
      toast.error("Maximum bereikt", {
        description: "Je kunt maximaal 10 afbeeldingen uploaden",
      })
      return
    }

    setIsUploading(true)
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
      
      // Add new image to list
      setImages((prev) => [...prev, data.asset])
      
      // Auto-select the new image if not at max selection
      if (!singleSelect && localSelection.length < maxSelection) {
        setLocalSelection((prev) => [...prev, data.asset.id])
      } else if (singleSelect) {
        setLocalSelection([data.asset.id])
      }

      toast.success("Afbeelding geüpload", {
        description: "De afbeelding is toegevoegd aan je Beeldbank.",
      })
    } catch (error) {
      console.error("Error uploading:", error)
      toast.error("Upload mislukt", {
        description: error instanceof Error ? error.message : "Probeer het opnieuw.",
      })
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  // File input change handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleUpload(file)
  }

  // Drag and drop handlers
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleUpload(file)
  }

  // Delete handler
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  
  const handleDelete = async (assetId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering selection
    
    setIsDeleting(assetId)
    try {
      const response = await fetch(`/api/media?id=${assetId}&type=sfeerbeeld`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Delete failed")
      }

      // Remove from local state
      setImages((prev) => prev.filter((img) => img.id !== assetId))
      // Also remove from selection if selected
      setLocalSelection((prev) => prev.filter((id) => id !== assetId))

      toast.success("Afbeelding verwijderd")
    } catch (error) {
      console.error("Error deleting:", error)
      toast.error("Verwijderen mislukt", {
        description: error instanceof Error ? error.message : "Probeer het opnieuw.",
      })
    } finally {
      setIsDeleting(null)
    }
  }

  // Reset local selection when dialog opens
  // Trim to maxSelection if initial selection exceeds it
  useEffect(() => {
    if (open) {
      const initialSelection = selectedIds || []
      // If initial selection exceeds max, trim it
      if (!singleSelect && initialSelection.length > maxSelection) {
        setLocalSelection(initialSelection.slice(0, maxSelection))
      } else {
        setLocalSelection(initialSelection)
      }
      fetchMedia()
    }
  }, [open, selectedIds, fetchMedia, maxSelection, singleSelect])

  // Get the assets to display based on filter
  const displayAssets = (() => {
    if (filter === "logo") {
      return logo ? [logo] : []
    }
    if (filter === "gallery") {
      return images
    }
    // "all" - show both logo and images
    return logo ? [logo, ...images] : images
  })()

  // Toggle selection
  const handleToggle = (assetId: string) => {
    if (singleSelect) {
      // Single select mode - replace selection
      setLocalSelection([assetId])
    } else {
      // Multi select mode
      setLocalSelection((prev) => {
        if (prev.includes(assetId)) {
          // Remove from selection
          return prev.filter((id) => id !== assetId)
        } else {
          // Add to selection (if under max)
          if (prev.length >= maxSelection) {
            return prev // Don't add if at max
          }
          return [...prev, assetId]
        }
      })
    }
  }

  // Handle confirm
  const handleConfirm = () => {
    // Validate selection doesn't exceed max
    if (!singleSelect && localSelection.length > maxSelection) {
      toast.error(`Selecteer maximaal ${maxSelection} afbeeldingen`)
      return
    }

    // Return full asset objects (id + url) for selected items
    const selectedAssets = localSelection
      .map((id) => displayAssets.find((asset) => asset.id === id))
      .filter((asset): asset is MediaAsset => asset !== undefined)
      .map((asset) => ({ id: asset.id, url: asset.url }))
    
    onSelect(selectedAssets)
    onOpenChange(false)
  }

  // Handle cancel
  const handleCancel = () => {
    setLocalSelection(selectedIds || []) // Reset to original
    onOpenChange(false)
  }

  const isSelected = (id: string) => localSelection.includes(id)
  const canSelectMore = singleSelect || localSelection.length < maxSelection

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-[#1F2D58]">{title}</DialogTitle>
          {(description || showUpload) && (
            <div className="flex items-center justify-between gap-4">
              {description && (
                <DialogDescription className="text-[#1F2D58]/70 flex-1">
                  {description}
                </DialogDescription>
              )}
              {showUpload && !isLoading && (
                <span className="text-sm text-[#1F2D58]/50 flex-shrink-0">{images.length}/10</span>
              )}
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pt-8 pb-4">
          {/* Hidden file input */}
          {showUpload && (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/avif,image/svg+xml"
              onChange={handleFileChange}
              className="hidden"
            />
          )}

          {isLoading ? (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 p-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          ) : displayAssets.length === 0 && !showUpload ? (
            // Empty state without upload option (logo picker with no logo)
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-[#193DAB]/12 flex items-center justify-center mb-4">
                <ImageIcon className="h-8 w-8 text-[#1F2D58]/60" />
              </div>
              <p className="font-medium text-[#1F2D58] mb-1">Geen logo beschikbaar</p>
              <p className="text-sm text-[#1F2D58]/60 mb-4">
                Upload eerst een logo via de Beeldbank.
              </p>
              <Link href="/dashboard/media-library">
                <Button variant="secondary" showArrow={false} onClick={() => onOpenChange(false)}>
                  Naar Beeldbank
                </Button>
              </Link>
            </div>
          ) : (
            // Grid with images and optional upload tile (5 columns for 2 rows of 5)
            <div className="px-2">
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {displayAssets.map((asset) => {
                  const selected = isSelected(asset.id)
                  const disabled = !selected && !canSelectMore
                  const deleting = isDeleting === asset.id

                  return (
                    <div
                      key={asset.id}
                      className="group relative"
                    >
                      <button
                        type="button"
                        onClick={() => !disabled && !deleting && handleToggle(asset.id)}
                        disabled={disabled || deleting}
                        className={`
                          relative aspect-square rounded-lg overflow-hidden transition-all w-full
                          focus:outline-none focus:ring-2 focus:ring-[#1F2D58] focus:ring-offset-2
                          ${selected 
                            ? "ring-2 ring-[#F86600] ring-offset-2" 
                            : "hover:ring-2 hover:ring-[#193DAB]/40"
                          }
                          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                          ${deleting ? "opacity-50" : ""}
                        `}
                      >
                        <img
                          src={asset.url}
                          alt={asset.altText || "Media asset"}
                          className="w-full h-full object-cover"
                        />
                        
                        {/* Selection indicator */}
                        {selected && !deleting && (
                          <div className="absolute inset-0 bg-[#F86600]/20 flex items-center justify-center">
                            <div className="w-8 h-8 rounded-full bg-[#F86600] flex items-center justify-center">
                              <Check className="h-5 w-5 text-white" />
                            </div>
                          </div>
                        )}

                        {/* Deleting spinner */}
                        {deleting && (
                          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                            <Spinner className="h-6 w-6 text-[#1F2D58]" />
                          </div>
                        )}
                      </button>

                      {/* Delete button - only for gallery images, not logo */}
                      {showUpload && !deleting && (
                        <button
                          type="button"
                          onClick={(e) => handleDelete(asset.id, e)}
                          className="absolute top-1 right-1 p-1.5 bg-white/90 rounded-full text-red-600 hover:bg-white hover:text-red-700 transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )
                })}

              {/* Upload tile - as last grid item */}
              {showUpload && (() => {
                const isAtMaxImages = images.length >= 10
                const isDisabled = isAtMaxImages || isUploading

                return (
                  <div
                    onDragOver={!isDisabled ? handleDragOver : undefined}
                    onDragLeave={!isDisabled ? handleDragLeave : undefined}
                    onDrop={!isDisabled ? handleDrop : undefined}
                    onClick={() => !isDisabled && fileInputRef.current?.click()}
                    className={`
                      relative aspect-square rounded-lg border-2 border-dashed transition-all
                      flex flex-col items-center justify-center gap-2
                      ${isDisabled
                        ? "border-[#1F2D58]/10 bg-[#1F2D58]/5 cursor-not-allowed"
                        : isDragging
                          ? "border-[#F86600] bg-[#F86600]/10 cursor-pointer"
                          : "border-[#1F2D58]/20 hover:border-[#193DAB] hover:bg-[#193DAB]/5 cursor-pointer"
                      }
                    `}
                  >
                    {isUploading ? (
                      <Spinner className="h-6 w-6 text-[#193DAB]" />
                    ) : isAtMaxImages ? (
                      <>
                        <div className="w-10 h-10 rounded-full bg-[#1F2D58]/10 flex items-center justify-center">
                          <ImageIcon className="h-5 w-5 text-[#1F2D58]/40" />
                        </div>
                        <span className="text-xs text-[#1F2D58]/40 text-center px-2">Maximum bereikt</span>
                      </>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-full bg-[#193DAB]/12 flex items-center justify-center">
                          <Plus className="h-5 w-5 text-[#1F2D58]" />
                        </div>
                        <span className="text-xs text-[#1F2D58]/60 text-center px-2">Uploaden</span>
                      </>
                    )}
                  </div>
                )
              })()}
              </div>
            </div>
          )}
        </div>

        {/* Footer with selection count and actions */}
        <div className="border-t border-[#E8EEF2] pt-4 mt-2">
          <div className="flex items-center justify-between">
            <div className="text-sm text-[#1F2D58]/60">
              {!singleSelect && (
                <>
                  {localSelection.length} van {maxSelection} geselecteerd
                </>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={handleCancel}
                showArrow={false}
                disabled={isUploading}
              >
                Annuleren
              </Button>
              <Button onClick={handleConfirm} disabled={isUploading}>
                {singleSelect ? "Selecteren" : "Opslaan"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
