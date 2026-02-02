"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { MediaPickerDialog } from "@/components/MediaPickerDialog";
import { Plus, Trash2, Image as ImageIcon, Pencil, Upload, ChevronDownIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { nl } from "react-day-picker/locale";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { InfoTooltip } from "@/components/ui/tooltip";
import type { VacancyFormProps } from "./types";

interface MediaAsset {
  id: string;
  url: string;
}

// Employment type options (from Airtable dropdown)
const EMPLOYMENT_TYPES = [
  { value: "Full-time", label: "Fulltime" },
  { value: "Part-time", label: "Parttime" },
  { value: "Contract", label: "Contract" },
  { value: "Temporary", label: "Tijdelijk" },
  { value: "Internship", label: "Stage" },
  { value: "Other", label: "Anders" },
];

interface Recommendation {
  firstName: string;
  lastName: string;
}

export function VacancyForm({
  vacancy,
  inputType,
  lookups,
  onChange,
  validationErrors = {},
  selectedPackage,
}: VacancyFormProps) {
  // Helper to check if selected package has a specific feature by action_tag
  const hasFeature = (actionTag: string) => {
    return selectedPackage?.populatedFeatures?.some(
      (feature) => feature.action_tags?.includes(actionTag)
    ) ?? false;
  };
  const [showHeaderDialog, setShowHeaderDialog] = useState(false);
  const [showGalleryDialog, setShowGalleryDialog] = useState(false);
  const [showContactPhotoDialog, setShowContactPhotoDialog] = useState(false);
  const [closingDateOpen, setClosingDateOpen] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>(
    vacancy.recommendations ? JSON.parse(vacancy.recommendations) : []
  );
  
  // Media state for previews
  const [employerLogo, setEmployerLogo] = useState<MediaAsset | null>(null);
  const [headerImage, setHeaderImage] = useState<MediaAsset | null>(null);
  const [galleryImages, setGalleryImages] = useState<MediaAsset[]>([]);
  const [availableImages, setAvailableImages] = useState<MediaAsset[]>([]);
  const [contactPhoto, setContactPhoto] = useState<MediaAsset | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  
  // Track initial load to prevent overwriting user selections
  const [initialMediaLoaded, setInitialMediaLoaded] = useState(false);

  // Fetch employer media on mount (only once)
  useEffect(() => {
    async function fetchMedia() {
      try {
        const response = await fetch("/api/media");
        if (response.ok) {
          const data = await response.json();
          // Set employer logo
          if (data.logo) {
            setEmployerLogo({ id: data.logo.id, url: data.logo.url });
          }
          
          // Only set header image on initial load, not when user changes selection
          if (!initialMediaLoaded) {
            let foundHeader: MediaAsset | null = null;
            
            // Find header image - priority: vacancy's header_image > employer's default header
            if (data.images && data.images.length > 0) {
              // First, check if vacancy has header_image set
              if (vacancy.header_image) {
                const vacancyHeader = data.images.find((img: { id: string; url: string }) => 
                  img.id === vacancy.header_image
                );
                if (vacancyHeader) {
                  foundHeader = { id: vacancyHeader.id, url: vacancyHeader.url };
                }
              }
              
              // If no vacancy header, use employer's default header image
              if (!foundHeader && data.headerImageId) {
                const defaultHeader = data.images.find((img: { id: string; url: string }) => 
                  img.id === data.headerImageId
                );
                if (defaultHeader) {
                  foundHeader = { id: defaultHeader.id, url: defaultHeader.url };
                }
              }
              
              // If still no header found, use the first image marked as header (isHeader)
              if (!foundHeader) {
                const markedHeader = data.images.find((img: { id: string; url: string; isHeader?: boolean }) => 
                  img.isHeader === true
                );
                if (markedHeader) {
                  foundHeader = { id: markedHeader.id, url: markedHeader.url };
                }
              }
              
              // Final fallback: use first gallery image if nothing else found
              if (!foundHeader && data.images.length > 0) {
                const firstImage = data.images[0];
                foundHeader = { id: firstImage.id, url: firstImage.url };
              }
              
              if (foundHeader) {
                setHeaderImage(foundHeader);
                // If vacancy doesn't have header_image yet, set the default header
                if (!vacancy.header_image) {
                  onChange({ header_image: foundHeader.id });
                }
              }
            }
            
            // If vacancy has contact_photo_id, find the contact photo
            if (vacancy.contact_photo_id && data.images) {
              const contactAsset = data.images.find((img: { id: string; url: string }) => 
                img.id === vacancy.contact_photo_id
              );
              if (contactAsset) {
                setContactPhoto({ id: contactAsset.id, url: contactAsset.url });
              }
            }
            
            // Store all available images for gallery selection
            if (data.images) {
              setAvailableImages(data.images.map((img: { id: string; url: string }) => ({
                id: img.id,
                url: img.url,
              })));
              
              // Load gallery images from vacancy or default to all images (except header)
              if (vacancy.gallery?.length) {
                const galleryAssets = vacancy.gallery
                  .map((id: string) => data.images.find((img: { id: string; url: string }) => img.id === id))
                  .filter((img: { id: string; url: string } | undefined): img is { id: string; url: string } => !!img)
                  .map((img: { id: string; url: string }) => ({ id: img.id, url: img.url }));
                setGalleryImages(galleryAssets);
              } else {
                // Default: all images except the header image
                const defaultGallery = data.images
                  .filter((img: { id: string; url: string }) => img.id !== foundHeader?.id)
                  .map((img: { id: string; url: string }) => ({ id: img.id, url: img.url }));
                setGalleryImages(defaultGallery);
                // Save default gallery to vacancy
                if (defaultGallery.length > 0) {
                  onChange({ gallery: defaultGallery.map((img: MediaAsset) => img.id) });
                }
              }
            }
            
            setInitialMediaLoaded(true);
          }
        }
      } catch (error) {
        console.error("Error fetching media:", error);
      }
    }
    fetchMedia();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Helper to update a single field
  const updateField = useCallback(
    (field: string, value: any) => {
      onChange({ [field]: value });
    },
    [onChange]
  );

  // Handle logo upload
  const handleLogoUpload = async (file: File) => {
    // Validate file type (PNG/SVG only for logos)
    const allowedLogoTypes = ["image/png", "image/svg+xml"];
    if (!allowedLogoTypes.includes(file.type)) {
      toast.error("Ongeldig bestandstype", {
        description: "Upload je logo als PNG of SVG. Deze formaten behouden de kwaliteit en ondersteunen transparante achtergronden.",
      });
      return;
    }

    // Validate file size (1MB for logos)
    if (file.size > 1 * 1024 * 1024) {
      toast.error("Bestand te groot", {
        description: "Logo mag maximaal 1MB zijn",
      });
      return;
    }

    setIsUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "logo");

      const response = await fetch("/api/media", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const data = await response.json();
      setEmployerLogo({ id: data.asset.id, url: data.asset.url });
      toast.success("Logo geüpload", {
        description: "Je nieuwe logo is opgeslagen.",
      });
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("Upload mislukt", {
        description: error instanceof Error ? error.message : "Probeer het opnieuw.",
      });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Handle recommendation changes
  const addRecommendation = () => {
    const newRecs = [...recommendations, { firstName: "", lastName: "" }];
    setRecommendations(newRecs);
    onChange({ recommendations: JSON.stringify(newRecs) });
  };

  const updateRecommendation = (index: number, field: keyof Recommendation, value: string) => {
    const newRecs = [...recommendations];
    newRecs[index] = { ...newRecs[index], [field]: value };
    setRecommendations(newRecs);
    onChange({ recommendations: JSON.stringify(newRecs) });
  };

  const removeRecommendation = (index: number) => {
    const newRecs = recommendations.filter((_, i) => i !== index);
    setRecommendations(newRecs);
    onChange({ recommendations: JSON.stringify(newRecs) });
  };

  // Show simplified form for "We do it for you"
  if (inputType === "we_do_it_for_you") {
    return (
      <div className="space-y-4">
        {/* Section: Vacaturetekst */}
        <FormSection title="Vacaturetekst" description="Plak of schrijf de vacaturetekst">
          <div className="space-y-4">
            <div>
              <Label htmlFor="description">Vacaturetekst <span className="text-slate-400 text-sm">*</span></Label>
              <RichTextEditor
                value={vacancy.description || ""}
                onChange={(value) => updateField("description", value)}
                placeholder="Plak hier de vacaturetekst..."
                className={`mt-1.5 ${validationErrors.description ? "!border-red-500" : ""}`}
              />
              {validationErrors.description && (
                <p className="text-sm text-red-500 mt-1">{validationErrors.description}</p>
              )}
            </div>

            <div>
              <Label htmlFor="notes">Opmerkingen</Label>
              <Textarea
                id="notes"
                placeholder="Eventuele opmerkingen voor het Colourful jobs team..."
                className="mt-1.5"
                rows={4}
              />
            </div>
          </div>
        </FormSection>

        {/* Section: Media */}
        <FormSection title="Afbeeldingen" description="Selecteer een headerafbeelding uit je beeldbank">
          <div>
            <Label>Headerafbeelding <span className="text-slate-400 text-sm">*</span></Label>
            <MediaPreviewButton
              onClick={() => setShowHeaderDialog(true)}
              imageUrl={headerImage?.url}
              label="Selecteer headerafbeelding"
            />
          </div>
        </FormSection>

        {/* Section: Solliciteren */}
        <FormSection title="Sollicitatiemethode" description="Kies hoe kandidaten op deze vacature kunnen reageren." isLast={true}>
          <ApplicationMethodFields
            showApplyForm={vacancy.show_apply_form || false}
            applyUrl={vacancy.apply_url || ""}
            applicationEmail={vacancy.application_email || ""}
            onShowApplyFormChange={(value) => updateField("show_apply_form", value)}
            onApplyUrlChange={(value) => updateField("apply_url", value)}
            onApplicationEmailChange={(value) => updateField("application_email", value)}
            validationErrors={validationErrors}
          />
        </FormSection>

        {/* Media picker dialogs */}
        <MediaPickerDialog
          open={showHeaderDialog}
          onOpenChange={setShowHeaderDialog}
          title="Headerafbeelding selecteren"
          description="Kies een afbeelding uit je beeldbank"
          selectedIds={headerImage ? [headerImage.id] : []}
          onSelect={(assets) => {
            if (assets.length > 0) {
              setHeaderImage({ id: assets[0].id, url: assets[0].url });
              updateField("header_image", assets[0].id);
            }
          }}
          singleSelect={true}
          filter="gallery"
        />
      </div>
    );
  }

  // Full self-service form
  return (
    <div className="space-y-4">
      {/* Section 1: Basis & Content */}
      <FormSection 
        title="Basis informatie" 
        description="De belangrijkste informatie over de vacature"
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Vacaturetitel <span className="text-slate-400 text-sm">*</span></Label>
            <Input
              id="title"
              value={vacancy.title || ""}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="Bijv. Senior Frontend Developer"
              className={`mt-1.5 ${validationErrors.title ? "border-red-500" : ""}`}
            />
            {validationErrors.title && (
              <p className="text-sm text-red-500 mt-1">{validationErrors.title}</p>
            )}
          </div>

          <div>
            <Label htmlFor="intro_txt">Introductietekst <span className="text-slate-400 text-sm">*</span></Label>
            <Textarea
              id="intro_txt"
              value={vacancy.intro_txt || ""}
              onChange={(e) => updateField("intro_txt", e.target.value)}
              placeholder="Een korte, pakkende introductie van de vacature..."
              className={`mt-1.5 ${validationErrors.intro_txt ? "border-red-500" : ""}`}
              rows={3}
            />
            {validationErrors.intro_txt && (
              <p className="text-sm text-red-500 mt-1">{validationErrors.intro_txt}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Vacaturetekst <span className="text-slate-400 text-sm">*</span></Label>
            <RichTextEditor
              value={vacancy.description || ""}
              onChange={(value) => updateField("description", value)}
              placeholder="Beschrijf de functie, verantwoordelijkheden en wat je zoekt..."
              className={`mt-1.5 ${validationErrors.description ? "!border-red-500" : ""}`}
            />
            {validationErrors.description && (
              <p className="text-sm text-red-500 mt-1">{validationErrors.description}</p>
            )}
          </div>
        </div>
      </FormSection>

      {/* Section 2: Media */}
      <FormSection title="Afbeeldingen" description="Voeg een logo, headerafbeelding en foto's toe om je vacature aantrekkelijker te maken. De fotogalerij verschijnt onderaan de vacaturetekst.">
        <div className="space-y-6">
          {/* Logo and Header */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Label className="!mb-0">Logo <span className="text-slate-400 text-sm">*</span></Label>
                <InfoTooltip content="Upload je logo als PNG of SVG met een transparante achtergrond. Zo blijft je logo scherp en past het mooi op de website." />
              </div>
              <LogoUploadButton
                logoUrl={employerLogo?.url}
                isUploading={isUploadingLogo}
                onFileSelect={handleLogoUpload}
              />
            </div>

            <div>
              <Label>Headerafbeelding <span className="text-slate-400 text-sm">*</span></Label>
              <MediaPreviewButton
                onClick={() => setShowHeaderDialog(true)}
                imageUrl={headerImage?.url}
                label="Selecteer headerafbeelding"
              />
            </div>
          </div>

          {/* Gallery */}
          <div>
            <Label className="mb-2 block">Gallery afbeeldingen</Label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {/* Selected gallery images */}
              {galleryImages.map((img) => (
                <div
                  key={img.id}
                  className="group relative aspect-square rounded-lg overflow-hidden bg-[#1F2D58]/5"
                >
                  <img
                    src={img.url}
                    alt="Gallery"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newGallery = galleryImages.filter((g) => g.id !== img.id);
                      setGalleryImages(newGallery);
                      updateField("gallery", newGallery.map((g) => g.id));
                    }}
                    className="absolute top-1 right-1 p-1.5 bg-white/90 rounded-full text-red-600 hover:bg-white hover:text-red-700 transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              
              {/* Add/upload tile */}
              <button
                type="button"
                onClick={() => setShowGalleryDialog(true)}
                className="aspect-square rounded-lg border-2 border-dashed border-[#1F2D58]/20 flex flex-col items-center justify-center gap-1.5 hover:border-[#1F2D58]/40 hover:bg-[#1F2D58]/5 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-[#193DAB]/12 flex items-center justify-center">
                  <Plus className="h-5 w-5 text-[#1F2D58]" />
                </div>
                <span className="text-xs text-[#1F2D58]/60">Toevoegen</span>
              </button>
            </div>
          </div>
        </div>
      </FormSection>

      {/* Section 3: Functie-informatie */}
      <FormSection title="Vacaturegegevens" description="Volledige vacatures trekken meer geschikte kandidaten aan. Vul daarom zoveel mogelijk in.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
          <div className="flex flex-col">
            <Label htmlFor="location">Plaats <span className="text-slate-400 text-sm">*</span></Label>
            <Input
              id="location"
              value={vacancy.location || ""}
              onChange={(e) => updateField("location", e.target.value)}
              placeholder="Bijv. Amsterdam"
              className={`mt-1.5 ${validationErrors.location ? "border-red-500" : ""}`}
            />
            {validationErrors.location && (
              <p className="text-sm text-red-500 mt-1">{validationErrors.location}</p>
            )}
          </div>

          <div className="flex flex-col">
            <Label htmlFor="region">Regio <span className="text-slate-400 text-sm">*</span></Label>
            <Select
              value={vacancy.region_id || ""}
              onValueChange={(value) => updateField("region_id", value)}
            >
              <SelectTrigger className={`mt-1.5 ${validationErrors.region_id ? "border-red-500" : ""}`}>
                <SelectValue placeholder="Selecteer regio" />
              </SelectTrigger>
              <SelectContent>
                {lookups.regions.map((region) => (
                  <SelectItem key={region.id} value={region.id}>
                    {region.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {validationErrors.region_id && (
              <p className="text-sm text-red-500 mt-1">{validationErrors.region_id}</p>
            )}
          </div>

          <div className="flex flex-col">
            <Label htmlFor="employment_type">Dienstverband</Label>
            <Select
              value={vacancy.employment_type || ""}
              onValueChange={(value) => updateField("employment_type", value)}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Selecteer dienstverband" />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col">
            <Label htmlFor="hrs_per_week">Uren per week</Label>
            <Input
              id="hrs_per_week"
              type="text"
              value={vacancy.hrs_per_week || ""}
              onChange={(e) => updateField("hrs_per_week", e.target.value || undefined)}
              placeholder="Bijv. 32-40"
              className="mt-1.5"
            />
          </div>

          <div className="flex flex-col">
            <Label htmlFor="function_type">Functietype <span className="text-slate-400 text-sm">*</span></Label>
            <Select
              value={vacancy.function_type_id || ""}
              onValueChange={(value) => updateField("function_type_id", value)}
            >
              <SelectTrigger className={`mt-1.5 ${validationErrors.function_type_id ? "border-red-500" : ""}`}>
                <SelectValue placeholder="Selecteer functietype" />
              </SelectTrigger>
              <SelectContent>
                {lookups.functionTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {validationErrors.function_type_id && (
              <p className="text-sm text-red-500 mt-1">{validationErrors.function_type_id}</p>
            )}
          </div>

          <div className="flex flex-col">
            <Label htmlFor="education_level">Opleidingsniveau</Label>
            <Select
              value={vacancy.education_level_id || ""}
              onValueChange={(value) => updateField("education_level_id", value)}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Selecteer niveau" />
              </SelectTrigger>
              <SelectContent>
                {lookups.educationLevels.map((level) => (
                  <SelectItem key={level.id} value={level.id}>
                    {level.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col">
            <Label htmlFor="field">Vakgebied <span className="text-slate-400 text-sm">*</span></Label>
            <Select
              value={vacancy.field_id || ""}
              onValueChange={(value) => updateField("field_id", value)}
            >
              <SelectTrigger className={`mt-1.5 ${validationErrors.field_id ? "border-red-500" : ""}`}>
                <SelectValue placeholder="Selecteer vakgebied" />
              </SelectTrigger>
              <SelectContent>
                {lookups.fields.map((field) => (
                  <SelectItem key={field.id} value={field.id}>
                    {field.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {validationErrors.field_id && (
              <p className="text-sm text-red-500 mt-1">{validationErrors.field_id}</p>
            )}
          </div>

          <div className="flex flex-col">
            <Label htmlFor="sector">Sector <span className="text-slate-400 text-sm">*</span></Label>
            <Select
              value={vacancy.sector_id || ""}
              onValueChange={(value) => updateField("sector_id", value)}
            >
              <SelectTrigger className={`mt-1.5 ${validationErrors.sector_id ? "border-red-500" : ""}`}>
                <SelectValue placeholder="Selecteer sector" />
              </SelectTrigger>
              <SelectContent>
                {lookups.sectors.map((sector) => (
                  <SelectItem key={sector.id} value={sector.id}>
                    {sector.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {validationErrors.sector_id && (
              <p className="text-sm text-red-500 mt-1">{validationErrors.sector_id}</p>
            )}
          </div>

          <div className="flex flex-col">
            <Label htmlFor="salary">Salaris</Label>
            <Input
              id="salary"
              value={vacancy.salary || ""}
              onChange={(e) => updateField("salary", e.target.value)}
              placeholder="Bijv. €4.000 - €5.500"
              className="mt-1.5"
            />
          </div>

          <div className="flex flex-col">
            <Label htmlFor="closing_date">Sluitingsdatum</Label>
            <Popover open={closingDateOpen} onOpenChange={setClosingDateOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  id="closing_date"
                  className="flex h-10 w-full items-center justify-between rounded-lg border border-[rgba(31,45,88,0.2)] bg-[#E8EEF2] px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1.5"
                >
                  <span className={vacancy.closing_date ? "text-[#1F2D58]" : "text-[#1F2D58]/40"}>
                    {vacancy.closing_date
                      ? new Date(vacancy.closing_date).toLocaleDateString("nl-NL", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "Selecteer datum"}
                  </span>
                  <ChevronDownIcon className="h-4 w-4 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-white" align="start">
                <Calendar
                  mode="single"
                  selected={vacancy.closing_date ? new Date(vacancy.closing_date) : undefined}
                  onSelect={(date) => {
                    // Format as YYYY-MM-DD for Airtable date field
                    const formattedDate = date 
                      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
                      : undefined;
                    updateField("closing_date", formattedDate);
                    setClosingDateOpen(false);
                  }}
                  locale={nl}
                  className="w-full"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </FormSection>

      {/* Section 4: Contactpersoon */}
      <FormSection title="Contactpersoon" description="Deze gegevens worden getoond bij de vacature zodat kandidaten je kunnen bereiken.">
        <div className="space-y-4">
          {/* Row 1: Naam, Functie, Bedrijf */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="contact_name">Naam</Label>
              <Input
                id="contact_name"
                value={vacancy.contact_name || ""}
                onChange={(e) => updateField("contact_name", e.target.value)}
                placeholder="Volledige naam"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="contact_role">Functie</Label>
              <Input
                id="contact_role"
                value={vacancy.contact_role || ""}
                onChange={(e) => updateField("contact_role", e.target.value)}
                placeholder="Bijv. HR Manager"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="contact_company">Bedrijf</Label>
              <Input
                id="contact_company"
                value={vacancy.contact_company || ""}
                onChange={(e) => updateField("contact_company", e.target.value)}
                placeholder="Bedrijfsnaam"
                className="mt-1.5"
              />
            </div>
          </div>

          {/* Row 2: Email, Telefoon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contact_email">E-mailadres</Label>
              <Input
                id="contact_email"
                type="email"
                value={vacancy.contact_email || ""}
                onChange={(e) => updateField("contact_email", e.target.value)}
                placeholder="email@bedrijf.nl"
                className={`mt-1.5 ${validationErrors.contact_email ? "border-red-500" : ""}`}
              />
              {validationErrors.contact_email && (
                <p className="text-sm text-red-500 mt-1">{validationErrors.contact_email}</p>
              )}
            </div>

            <div>
              <Label htmlFor="contact_phone">Telefoonnummer</Label>
              <Input
                id="contact_phone"
                type="tel"
                value={vacancy.contact_phone || ""}
                onChange={(e) => updateField("contact_phone", e.target.value)}
                placeholder="+31 6 12345678"
                className="mt-1.5"
              />
            </div>
          </div>

          {/* Row 3: Foto */}
          <div>
            <Label>Foto</Label>
            <MediaPreviewButton
              onClick={() => setShowContactPhotoDialog(true)}
              imageUrl={contactPhoto?.url}
              label="Selecteer foto"
            />
          </div>
        </div>
      </FormSection>

      {/* Section 5: Social Proof - only show if package has cj_social_post feature */}
      {hasFeature("cj_social_post") && (
        <FormSection title="Aanbevolen door collega's" description="Tag collega's die deze vacature kunnen aanbevelen. Zij worden vermeld in de LinkedIn-post, zo krijgt de post meer bereik.">
          <div className="space-y-3">
            {recommendations.map((rec, index) => (
              <div key={index} className="flex items-center gap-3">
                <Input
                  value={rec.firstName}
                  onChange={(e) => updateRecommendation(index, "firstName", e.target.value)}
                  placeholder="Voornaam"
                  className="flex-1"
                />
                <Input
                  value={rec.lastName}
                  onChange={(e) => updateRecommendation(index, "lastName", e.target.value)}
                  placeholder="Achternaam"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="tertiary"
                  size="icon"
                  onClick={() => removeRecommendation(index)}
                  className="w-[30px] h-[30px] shrink-0"
                  showArrow={false}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={addRecommendation}
              showArrow={false}
            >
              <Plus className="h-4 w-4 mr-1" />
              Collega toevoegen
            </Button>
          </div>
        </FormSection>
      )}

      {/* Section 6: Solliciteren */}
      <FormSection title="Sollicitatiemethode" description="Kies hoe kandidaten op deze vacature kunnen reageren." isLast={true}>
        <ApplicationMethodFields
          showApplyForm={vacancy.show_apply_form || false}
          applyUrl={vacancy.apply_url || ""}
          applicationEmail={vacancy.application_email || ""}
          onShowApplyFormChange={(value) => updateField("show_apply_form", value)}
          onApplyUrlChange={(value) => updateField("apply_url", value)}
          onApplicationEmailChange={(value) => updateField("application_email", value)}
          validationErrors={validationErrors}
        />
      </FormSection>

      {/* Media picker dialogs */}
      <MediaPickerDialog
        open={showHeaderDialog}
        onOpenChange={setShowHeaderDialog}
        title="Headerafbeelding selecteren"
        description="Kies een afbeelding uit je beeldbank"
        selectedIds={headerImage ? [headerImage.id] : []}
        onSelect={(assets) => {
          if (assets.length > 0) {
            setHeaderImage({ id: assets[0].id, url: assets[0].url });
            updateField("header_image", assets[0].id);
          }
        }}
        singleSelect={true}
        filter="gallery"
      />

      <MediaPickerDialog
        open={showContactPhotoDialog}
        onOpenChange={setShowContactPhotoDialog}
        title="Contactpersoon foto"
        description="Kies een foto voor de contactpersoon"
        selectedIds={contactPhoto ? [contactPhoto.id] : []}
        onSelect={(assets) => {
          if (assets.length > 0) {
            setContactPhoto({ id: assets[0].id, url: assets[0].url });
            updateField("contact_photo_id", assets[0].id);
          }
        }}
        singleSelect={true}
        filter="gallery"
      />

      <MediaPickerDialog
        open={showGalleryDialog}
        onOpenChange={setShowGalleryDialog}
        title="Gallery afbeeldingen"
        description="Selecteer afbeeldingen voor de vacature gallery"
        selectedIds={galleryImages.map((img) => img.id)}
        onSelect={(assets) => {
          setGalleryImages(assets.map((a) => ({ id: a.id, url: a.url })));
          updateField("gallery", assets.map((a) => a.id));
        }}
        singleSelect={false}
        filter="gallery"
        maxSelection={10}
      />
    </div>
  );
}

// Helper components
function FormSection({
  title,
  description,
  children,
  statusElement,
  isLast = false,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  statusElement?: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <div className={`bg-white p-6 ${isLast ? "rounded-t-[0.75rem] rounded-b-[2rem]" : "rounded-[0.75rem]"}`}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-[#1F2D58] mb-1">{title}</h3>
          <p className="text-sm text-[#1F2D58]/70">{description}</p>
        </div>
        {statusElement && (
          <div className="flex-shrink-0">
            {statusElement}
          </div>
        )}
      </div>
      <Separator className="my-4 bg-[#193DAB]/12" />
      {children}
    </div>
  );
}

function LogoUploadButton({
  logoUrl,
  isUploading,
  onFileSelect,
}: {
  logoUrl?: string;
  isUploading: boolean;
  onFileSelect: (file: File) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
      // Reset input so same file can be selected again
      e.target.value = "";
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/svg+xml"
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={handleClick}
        disabled={isUploading}
        className="mt-1.5 w-full h-44 border-2 border-dashed border-[#1F2D58]/20 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-[#1F2D58]/40 hover:bg-[#1F2D58]/5 transition-colors overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Spinner className="h-5 w-5 text-[#1F2D58]" />
            <span className="text-sm text-[#1F2D58]/70">Uploaden...</span>
          </div>
        ) : logoUrl ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-28 h-24 rounded-[0.75rem] bg-white border border-gray-200 flex items-center justify-center p-3">
              <img
                src={logoUrl}
                alt="Logo"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <p className="text-xs text-[#1F2D58]/50">Zo ziet het eruit op de website</p>
            <div className="flex items-center gap-1.5 text-sm text-[#1F2D58]/70 group-hover:text-[#1F2D58]">
              <Upload className="h-4 w-4" />
              <span>Vervangen</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-6 w-6 text-[#1F2D58]/50" />
            <span className="text-sm text-[#1F2D58]/70">Logo uploaden</span>
            <span className="text-xs text-[#1F2D58]/50">PNG of SVG, max 1MB</span>
          </div>
        )}
      </button>
    </>
  );
}

function MediaPreviewButton({
  onClick,
  imageUrl,
  label,
}: {
  onClick: () => void;
  imageUrl?: string;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-1.5 w-full h-40 p-4 border-2 border-dashed border-[#1F2D58]/20 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-[#1F2D58]/40 hover:bg-[#1F2D58]/5 transition-colors overflow-hidden group"
    >
      {imageUrl ? (
        <>
          <div className="h-28 w-40 flex items-center justify-center overflow-hidden rounded">
            <img
              src={imageUrl}
              alt="Header"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex items-center gap-1.5 text-sm text-[#1F2D58]/70 group-hover:text-[#1F2D58]">
            <Pencil className="h-4 w-4" />
            <span>Wijzigen</span>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <ImageIcon className="h-6 w-6 text-[#1F2D58]/50" />
          <span className="text-sm text-[#1F2D58]/70">{label}</span>
        </div>
      )}
    </button>
  );
}

function ApplicationMethodFields({
  showApplyForm,
  applyUrl,
  applicationEmail,
  onShowApplyFormChange,
  onApplyUrlChange,
  onApplicationEmailChange,
  validationErrors = {},
}: {
  showApplyForm: boolean;
  applyUrl: string;
  applicationEmail: string;
  onShowApplyFormChange: (value: boolean) => void;
  onApplyUrlChange: (value: string) => void;
  onApplicationEmailChange: (value: string) => void;
  validationErrors?: Record<string, string>;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="applyMethod"
            checked={!showApplyForm}
            onChange={() => onShowApplyFormChange(false)}
            className="w-4 h-4 text-[#1F2D58]"
          />
          <span className="text-sm text-[#1F2D58]">Externe link — Kandidaten solliciteren via je eigen website</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="applyMethod"
            checked={showApplyForm}
            onChange={() => onShowApplyFormChange(true)}
            className="w-4 h-4 text-[#1F2D58]"
          />
          <span className="text-sm text-[#1F2D58]">Via Colourful jobs — Kandidaten solliciteren direct op dit platform</span>
        </label>
      </div>

      {!showApplyForm ? (
        <div>
          <Label htmlFor="apply_url">Link naar sollicitatieformulier <span className="text-slate-400 text-sm">*</span></Label>
          <p className="text-sm text-[#1F2D58]/70 mt-1">Kandidaten worden doorgestuurd naar deze pagina</p>
          <Input
            id="apply_url"
            type="url"
            value={applyUrl}
            onChange={(e) => onApplyUrlChange(e.target.value)}
            onBlur={(e) => {
              const value = e.target.value.trim();
              if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
                onApplyUrlChange('https://' + value);
              }
            }}
            placeholder="https://werkenbij.bedrijf.nl/vacature"
            className={`mt-1.5 ${validationErrors.apply_url ? "border-red-500" : ""}`}
          />
          {validationErrors.apply_url && (
            <p className="text-sm text-red-500 mt-1">{validationErrors.apply_url}</p>
          )}
        </div>
      ) : (
        <div>
          <Label htmlFor="application_email">E-mailadres ontvanger <span className="text-slate-400 text-sm">*</span></Label>
          <p className="text-sm text-[#1F2D58]/70 mt-1">Sollicitaties worden naar dit adres gestuurd</p>
          <Input
            id="application_email"
            type="email"
            value={applicationEmail}
            onChange={(e) => onApplicationEmailChange(e.target.value)}
            placeholder="sollicitaties@bedrijf.nl"
            className={`mt-1.5 ${validationErrors.application_email ? "border-red-500" : ""}`}
          />
          {validationErrors.application_email && (
            <p className="text-sm text-red-500 mt-1">{validationErrors.application_email}</p>
          )}
        </div>
      )}
    </div>
  );
}
