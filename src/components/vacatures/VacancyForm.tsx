"use client";

import { useState, useCallback } from "react";
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
import { Plus, Trash2, Image as ImageIcon } from "lucide-react";
import type { VacancyFormProps } from "./types";

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
}: VacancyFormProps) {
  const [showLogoDialog, setShowLogoDialog] = useState(false);
  const [showHeaderDialog, setShowHeaderDialog] = useState(false);
  const [showContactPhotoDialog, setShowContactPhotoDialog] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>(
    vacancy.recommendations ? JSON.parse(vacancy.recommendations) : []
  );

  // Helper to update a single field
  const updateField = useCallback(
    (field: string, value: any) => {
      onChange({ [field]: value });
    },
    [onChange]
  );

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
      <div className="space-y-8">
        {/* Section: Vacaturetekst */}
        <FormSection title="Vacaturetekst" description="Plak of schrijf de vacaturetekst">
          <div className="space-y-4">
            <div>
              <Label htmlFor="description">Vacaturetekst <span className="text-slate-400 text-sm">*</span></Label>
              <RichTextEditor
                value={vacancy.description || ""}
                onChange={(value) => updateField("description", value)}
                placeholder="Plak hier de vacaturetekst..."
                className="mt-1.5"
              />
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
        <FormSection title="Afbeeldingen" description="Upload een headerafbeelding">
          <div>
            <Label>Headerafbeelding <span className="text-slate-400 text-sm">*</span></Label>
            <MediaPickerButton
              onClick={() => setShowHeaderDialog(true)}
              hasImage={!!vacancy.media_assets?.length}
              label="Selecteer headerafbeelding"
            />
          </div>
        </FormSection>

        {/* Section: Solliciteren */}
        <FormSection title="Solliciteren" description="Hoe kunnen kandidaten solliciteren?">
          <ApplicationMethodFields
            showApplyForm={vacancy.show_apply_form || false}
            applyUrl={vacancy.apply_url || ""}
            applicationEmail={vacancy.application_email || ""}
            onShowApplyFormChange={(value) => updateField("show_apply_form", value)}
            onApplyUrlChange={(value) => updateField("apply_url", value)}
            onApplicationEmailChange={(value) => updateField("application_email", value)}
          />
        </FormSection>

        {/* Media picker dialogs */}
        <MediaPickerDialog
          open={showHeaderDialog}
          onOpenChange={setShowHeaderDialog}
          onSelect={(assets) => {
            if (assets.length > 0) {
              updateField("media_assets", [assets[0].id]);
            }
            setShowHeaderDialog(false);
          }}
          type="sfeerbeeld"
          multiple={false}
        />
      </div>
    );
  }

  // Full self-service form
  return (
    <div className="space-y-8">
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
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="intro_txt">Introductietekst <span className="text-slate-400 text-sm">*</span></Label>
            <Textarea
              id="intro_txt"
              value={vacancy.intro_txt || ""}
              onChange={(e) => updateField("intro_txt", e.target.value)}
              placeholder="Een korte, pakkende introductie van de vacature..."
              className="mt-1.5"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="description">Vacaturetekst <span className="text-slate-400 text-sm">*</span></Label>
            <RichTextEditor
              value={vacancy.description || ""}
              onChange={(value) => updateField("description", value)}
              placeholder="Beschrijf de functie, verantwoordelijkheden en wat je zoekt..."
              className="mt-1.5"
            />
          </div>
        </div>
      </FormSection>

      {/* Section 2: Media */}
      <FormSection title="Afbeeldingen" description="Upload logo en headerafbeelding">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Logo <span className="text-slate-400 text-sm">*</span></Label>
            <MediaPickerButton
              onClick={() => setShowLogoDialog(true)}
              hasImage={false} // TODO: check actual logo
              label="Selecteer logo"
            />
          </div>

          <div>
            <Label>Headerafbeelding <span className="text-slate-400 text-sm">*</span></Label>
            <MediaPickerButton
              onClick={() => setShowHeaderDialog(true)}
              hasImage={!!vacancy.media_assets?.length}
              label="Selecteer headerafbeelding"
            />
          </div>
        </div>
      </FormSection>

      {/* Section 3: Functie-informatie */}
      <FormSection title="Functie-informatie" description="Details over de functie">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="location">Plaats <span className="text-slate-400 text-sm">*</span></Label>
            <Input
              id="location"
              value={vacancy.location || ""}
              onChange={(e) => updateField("location", e.target.value)}
              placeholder="Bijv. Amsterdam"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="region">Regio <span className="text-slate-400 text-sm">*</span></Label>
            <Select
              value={vacancy.region_id || ""}
              onValueChange={(value) => updateField("region_id", value)}
            >
              <SelectTrigger className="mt-1.5">
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
          </div>

          <div>
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

          <div>
            <Label htmlFor="hrs_per_week">Uren per week</Label>
            <Input
              id="hrs_per_week"
              type="number"
              value={vacancy.hrs_per_week || ""}
              onChange={(e) => updateField("hrs_per_week", parseInt(e.target.value) || undefined)}
              placeholder="Bijv. 40"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="function_type">Functietype <span className="text-slate-400 text-sm">*</span></Label>
            <Select
              value={vacancy.function_type_id || ""}
              onValueChange={(value) => updateField("function_type_id", value)}
            >
              <SelectTrigger className="mt-1.5">
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
          </div>

          <div>
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

          <div>
            <Label htmlFor="field">Vakgebied <span className="text-slate-400 text-sm">*</span></Label>
            <Select
              value={vacancy.field_id || ""}
              onValueChange={(value) => updateField("field_id", value)}
            >
              <SelectTrigger className="mt-1.5">
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
          </div>

          <div>
            <Label htmlFor="sector">Sector <span className="text-slate-400 text-sm">*</span></Label>
            <Select
              value={vacancy.sector_id || ""}
              onValueChange={(value) => updateField("sector_id", value)}
            >
              <SelectTrigger className="mt-1.5">
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
          </div>

          <div>
            <Label htmlFor="salary">Salaris</Label>
            <Input
              id="salary"
              value={vacancy.salary || ""}
              onChange={(e) => updateField("salary", e.target.value)}
              placeholder="Bijv. €4.000 - €5.500"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="closing_date">Sluitingsdatum</Label>
            <Input
              id="closing_date"
              type="date"
              value={vacancy.closing_date?.split("T")[0] || ""}
              onChange={(e) => updateField("closing_date", e.target.value ? new Date(e.target.value).toISOString() : undefined)}
              className="mt-1.5"
            />
          </div>
        </div>
      </FormSection>

      {/* Section 4: Contactpersoon */}
      <FormSection title="Contactpersoon" description="Contactinformatie voor kandidaten">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <div>
            <Label htmlFor="contact_email">E-mailadres</Label>
            <Input
              id="contact_email"
              type="email"
              value={vacancy.contact_email || ""}
              onChange={(e) => updateField("contact_email", e.target.value)}
              placeholder="email@bedrijf.nl"
              className="mt-1.5"
            />
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

          <div>
            <Label>Foto</Label>
            <MediaPickerButton
              onClick={() => setShowContactPhotoDialog(true)}
              hasImage={!!vacancy.contact_photo_id}
              label="Selecteer foto"
            />
          </div>
        </div>
      </FormSection>

      {/* Section 5: Social Proof */}
      <FormSection title="Warm aanbevolen door" description="Voeg aanbevelingen toe (optioneel)">
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
                variant="ghost"
                size="sm"
                onClick={() => removeRecommendation(index)}
                className="shrink-0"
                showArrow={false}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
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
            Aanbeveling toevoegen
          </Button>
        </div>
      </FormSection>

      {/* Section 6: Solliciteren */}
      <FormSection title="Solliciteren" description="Hoe kunnen kandidaten solliciteren?">
        <ApplicationMethodFields
          showApplyForm={vacancy.show_apply_form || false}
          applyUrl={vacancy.apply_url || ""}
          applicationEmail={vacancy.application_email || ""}
          onShowApplyFormChange={(value) => updateField("show_apply_form", value)}
          onApplyUrlChange={(value) => updateField("apply_url", value)}
          onApplicationEmailChange={(value) => updateField("application_email", value)}
        />
      </FormSection>

      {/* Media picker dialogs */}
      <MediaPickerDialog
        open={showLogoDialog}
        onOpenChange={setShowLogoDialog}
        onSelect={(assets) => {
          // Logo selection - would need to handle separately
          setShowLogoDialog(false);
        }}
        type="logo"
        multiple={false}
      />

      <MediaPickerDialog
        open={showHeaderDialog}
        onOpenChange={setShowHeaderDialog}
        onSelect={(assets) => {
          if (assets.length > 0) {
            updateField("media_assets", [assets[0].id]);
          }
          setShowHeaderDialog(false);
        }}
        type="sfeerbeeld"
        multiple={false}
      />

      <MediaPickerDialog
        open={showContactPhotoDialog}
        onOpenChange={setShowContactPhotoDialog}
        onSelect={(assets) => {
          if (assets.length > 0) {
            updateField("contact_photo_id", assets[0].id);
          }
          setShowContactPhotoDialog(false);
        }}
        type="sfeerbeeld"
        multiple={false}
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
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  statusElement?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-t-[0.75rem] rounded-b-[2rem] p-6">
      <div className="flex items-start justify-between mb-4">
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
      {children}
    </div>
  );
}

function MediaPickerButton({
  onClick,
  hasImage,
  label,
}: {
  onClick: () => void;
  hasImage: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-1.5 w-full h-24 border-2 border-dashed border-[#1F2D58]/20 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-[#1F2D58]/40 hover:bg-[#1F2D58]/5 transition-colors"
    >
      <ImageIcon className="h-6 w-6 text-[#1F2D58]/50" />
      <span className="text-sm text-[#1F2D58]/70">
        {hasImage ? "Afbeelding wijzigen" : label}
      </span>
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
}: {
  showApplyForm: boolean;
  applyUrl: string;
  applicationEmail: string;
  onShowApplyFormChange: (value: boolean) => void;
  onApplyUrlChange: (value: string) => void;
  onApplicationEmailChange: (value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="applyMethod"
            checked={!showApplyForm}
            onChange={() => onShowApplyFormChange(false)}
            className="w-4 h-4 text-[#1F2D58]"
          />
          <span className="text-sm text-[#1F2D58]">Externe link</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="applyMethod"
            checked={showApplyForm}
            onChange={() => onShowApplyFormChange(true)}
            className="w-4 h-4 text-[#1F2D58]"
          />
          <span className="text-sm text-[#1F2D58]">Colourful jobs formulier</span>
        </label>
      </div>

      {!showApplyForm ? (
        <div>
          <Label htmlFor="apply_url">Sollicitatie URL <span className="text-slate-400 text-sm">*</span></Label>
          <Input
            id="apply_url"
            type="url"
            value={applyUrl}
            onChange={(e) => onApplyUrlChange(e.target.value)}
            placeholder="https://werkenbij.bedrijf.nl/vacature"
            className="mt-1.5"
          />
        </div>
      ) : (
        <div>
          <Label htmlFor="application_email">E-mailadres voor sollicitaties <span className="text-slate-400 text-sm">*</span></Label>
          <Input
            id="application_email"
            type="email"
            value={applicationEmail}
            onChange={(e) => onApplicationEmailChange(e.target.value)}
            placeholder="sollicitaties@bedrijf.nl"
            className="mt-1.5"
          />
        </div>
      )}
    </div>
  );
}
