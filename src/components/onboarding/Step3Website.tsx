"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ImageUpload";
import type { Step3Props } from "./types";

export function Step3Website({
  register,
  watch,
  formErrors,
  saving,
  logoPreview,
  headerPreview,
  uploadingLogo,
  uploadingHeader,
  logoError,
  headerError,
  onImageUpload,
  onPrevious,
  onSubmit,
}: Step3Props) {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="space-y-2">
          <h4>Bedrijfsprofiel</h4>
          <p className="p-regular text-slate-600">
            Deze gegevens verschijnen op jullie bedrijfsprofiel op colourfuljobs.nl en zijn zichtbaar voor kandidaten.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="display_name">Weergavenaam bedrijf <span className="text-slate-400 text-sm">*</span></Label>
            <Input
              id="display_name"
              {...register("display_name")}
              className={formErrors.display_name ? "border-red-500" : ""}
            />
            {formErrors.display_name && (
              <p className="text-sm text-red-500">{formErrors.display_name}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="sector">Sector <span className="text-slate-400 text-sm">*</span></Label>
            <Input
              id="sector"
              {...register("sector")}
              className={formErrors.sector ? "border-red-500" : ""}
            />
            {formErrors.sector && (
              <p className="text-sm text-red-500">{formErrors.sector}</p>
            )}
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="short_description">Omschrijving bedrijf <span className="text-slate-400 text-sm">*</span></Label>
            <Textarea
              id="short_description"
              rows={4}
              {...register("short_description")}
              className={formErrors.short_description ? "border-red-500" : ""}
            />
            {formErrors.short_description && (
              <p className="text-sm text-red-500">{formErrors.short_description}</p>
            )}
          </div>
          <div>
            <ImageUpload
              id="logo"
              label="Logo"
              required
              preview={logoPreview || undefined}
              uploading={uploadingLogo}
              onFileSelect={(file) => onImageUpload(file, "logo")}
              error={logoError || undefined}
            />
          </div>
          <div>
            <ImageUpload
              id="header_image"
              label="Headerbeeld"
              required
              preview={headerPreview || undefined}
              uploading={uploadingHeader}
              onFileSelect={(file) => onImageUpload(file, "header")}
              error={headerError || undefined}
            />
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-between items-center">
        <button
          type="button"
          onClick={onPrevious}
          className="p-regular text-slate-500 underline hover:no-underline cursor-pointer transition-colors"
        >
          Vorige
        </button>
        <Button onClick={onSubmit} disabled={saving}>
          {saving ? "Opslaan..." : "Account aanmaken"}
        </Button>
      </div>
    </div>
  );
}
