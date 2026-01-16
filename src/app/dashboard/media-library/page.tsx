"use client"

import { useEffect, useState } from "react"
import { Upload, Trash2, Image as ImageIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// Types
interface MediaAsset {
  id: string
  url: string
  fileType: string
  fileSize: string
}

// Mock data
const mockLogo: MediaAsset | null = {
  id: "logo-1",
  url: "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=200&h=80&fit=crop",
  fileType: "AVIF",
  fileSize: "12 KB",
}

const mockImages: MediaAsset[] = [
  { 
    id: "img-1", 
    url: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=300&h=200&fit=crop",
    fileType: "AVIF",
    fileSize: "245 KB"
  },
  { 
    id: "img-2", 
    url: "https://images.unsplash.com/photo-1497215842964-222b430dc094?w=300&h=200&fit=crop",
    fileType: "AVIF",
    fileSize: "189 KB"
  },
  { 
    id: "img-3", 
    url: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=300&h=200&fit=crop",
    fileType: "AVIF",
    fileSize: "312 KB"
  },
  { 
    id: "img-4", 
    url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=300&h=200&fit=crop",
    fileType: "AVIF",
    fileSize: "278 KB"
  },
  { 
    id: "img-5", 
    url: "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=300&h=200&fit=crop",
    fileType: "AVIF",
    fileSize: "156 KB"
  },
]

const MAX_IMAGES = 10

export default function MediaLibraryPage() {
  // Loading state
  const [isLoading, setIsLoading] = useState(true)

  // Set page title
  useEffect(() => {
    document.title = "Media Library | Colourful jobs"
  }, [])

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  // State
  const [logo, setLogo] = useState<MediaAsset | null>(mockLogo)
  const [images, setImages] = useState<MediaAsset[]>(mockImages)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{ type: "logo" | "image"; id: string } | null>(null)

  // Handlers
  const handleDeleteClick = (type: "logo" | "image", id: string) => {
    setItemToDelete({ type, id })
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      if (itemToDelete.type === "logo") {
        setLogo(null)
      } else {
        setImages(images.filter(img => img.id !== itemToDelete.id))
      }
    }
    setDeleteDialogOpen(false)
    setItemToDelete(null)
  }

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false)
    setItemToDelete(null)
  }

  // Skeleton components
  const LogoSkeleton = () => (
    <Card className="bg-white border-none">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="!text-xl font-medium text-[#1F2D58]">
          Logo
        </CardTitle>
        <Skeleton className="h-9 w-28" />
      </CardHeader>
      <Separator className="mx-6 w-auto bg-[#E8EEF2]" />
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <Skeleton className="h-20 w-[200px] rounded-lg" />
          <div className="flex flex-col gap-1">
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-4 w-14" />
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const ImagesSkeleton = () => (
    <Card className="bg-white border-none">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <CardTitle className="!text-xl font-medium text-[#1F2D58]">
            Afbeeldingen
          </CardTitle>
          <Skeleton className="h-4 w-10" />
        </div>
        <Skeleton className="h-9 w-28" />
      </CardHeader>
      <Separator className="mx-6 w-auto bg-[#E8EEF2]" />
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[100px] sm:h-[120px] rounded-lg" />
          ))}
        </div>
      </CardContent>
    </Card>
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="contempora-large text-[#1F2D58]">Media Library</h1>
        <LogoSkeleton />
        <ImagesSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page title */}
      <h1 className="contempora-large text-[#1F2D58]">Media Library</h1>

      {/* Logo Section */}
      <Card className="bg-white border-none">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="!text-xl font-medium text-[#1F2D58]">
            Logo
          </CardTitle>
          <Button
            variant="secondary"
            size="sm"
            showArrow={false}
          >
            <Upload className="h-4 w-4 mr-1" />
            Uploaden
          </Button>
        </CardHeader>
        <Separator className="mx-6 w-auto bg-[#E8EEF2]" />
        <CardContent className="pt-6">
          {logo ? (
            <div className="flex items-start gap-4">
              {/* Logo preview */}
              <div className="relative group">
                <div className="bg-[#193DAB]/12 rounded-lg overflow-hidden">
                  <img
                    src={logo.url}
                    alt="Bedrijfslogo"
                    className="h-20 w-auto max-w-[200px] object-contain p-2"
                  />
                </div>
                {/* Delete button on hover */}
                <button
                  onClick={() => handleDeleteClick("logo", logo.id)}
                  className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full text-red-600 hover:bg-white hover:text-red-700 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {/* Info next to logo, stacked vertically */}
              <div className="flex flex-col gap-1">
                <Badge variant="secondary" className="bg-[#193DAB]/12 text-[#1F2D58] text-xs hover:bg-[#193DAB]/12 border-none w-fit">
                  {logo.fileType}
                </Badge>
                <span className="text-xs text-[#1F2D58]/60">{logo.fileSize}</span>
              </div>
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
              <Button showArrow={false}>
                <Upload className="h-4 w-4 mr-1" />
                Logo uploaden
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Images Section */}
      <Card className="bg-white border-none">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="flex items-center gap-3">
            <CardTitle className="!text-xl font-medium text-[#1F2D58]">
              Afbeeldingen
            </CardTitle>
            <span className="text-sm text-[#1F2D58]/60">
              {images.length}/{MAX_IMAGES}
            </span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            disabled={images.length >= MAX_IMAGES}
            showArrow={false}
          >
            <Upload className="h-4 w-4 mr-1" />
            Uploaden
          </Button>
        </CardHeader>
        <Separator className="mx-6 w-auto bg-[#E8EEF2]" />
        <CardContent className="pt-6">
          {images.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {images.map((image) => (
                <div
                  key={image.id}
                  className="group relative bg-[#E8EEF2] rounded-lg overflow-hidden"
                >
                  {/* Image preview */}
                  <img
                    src={image.url}
                    alt="Media asset"
                    className="w-full h-[100px] sm:h-[120px] object-cover"
                  />
                  {/* Overlay with info */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Delete button */}
                    <button
                      onClick={() => handleDeleteClick("image", image.id)}
                      className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full text-red-600 hover:bg-white hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {/* Info bar */}
                  <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-black/50 flex items-center justify-between">
                    <Badge variant="secondary" className="bg-white/20 text-white text-xs hover:bg-white/20 border-none">
                      {image.fileType}
                    </Badge>
                    <span className="text-xs text-white/80">{image.fileSize}</span>
                  </div>
                </div>
              ))}
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
              <Button showArrow={false}>
                <Upload className="h-4 w-4 mr-1" />
                Afbeeldingen uploaden
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {itemToDelete?.type === "logo" ? "Logo verwijderen" : "Afbeelding verwijderen"}
            </DialogTitle>
            <DialogDescription className="text-[#1F2D58]/70">
              Weet je het zeker? De handeling kan niet worden teruggedraaid en de afbeelding zal van het bedrijfsprofiel verwijderd worden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-6">
            <Button
              variant="secondary"
              onClick={handleCancelDelete}
              showArrow={false}
            >
              Annuleren
            </Button>
            <Button
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Verwijderen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
