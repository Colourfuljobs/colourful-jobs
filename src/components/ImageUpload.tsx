"use client";

import { useRef, useState, DragEvent } from "react";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

interface ImageUploadProps {
  id: string;
  label: string;
  required?: boolean;
  tooltip?: string;
  preview?: string | null;
  uploading?: boolean;
  onFileSelect: (file: File) => void;
  error?: string;
  /** Maximum file size in MB (default: 10MB) */
  maxSizeMB?: number;
  /** Restrict to logo formats only (PNG/SVG) */
  logoOnly?: boolean;
}

export function ImageUpload({
  id,
  label,
  required = false,
  tooltip,
  preview,
  uploading = false,
  onFileSelect,
  error,
  maxSizeMB = 10,
  logoOnly = false,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Define allowed types based on logoOnly prop
  const allowedTypes = logoOnly
    ? ["image/png", "image/svg+xml"]
    : ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/avif", "image/svg+xml"];

  const allowedTypesText = logoOnly
    ? "PNG of SVG"
    : "JPEG, PNG, WebP, AVIF of SVG";

  const handleFile = (file: File) => {
    // Validate file type
    if (!allowedTypes.includes(file.type)) {
      toast.error("Ongeldig bestandstype", {
        description: logoOnly
          ? "Upload je logo als PNG of SVG bestand. Deze formaten behouden de kwaliteit en ondersteunen transparante achtergronden."
          : `Alleen ${allowedTypesText} afbeeldingen zijn toegestaan`,
      });
      return;
    }

    // Validate file size
    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("Bestand te groot", {
        description: `Afbeelding mag maximaal ${maxSizeMB}MB zijn`,
      });
      return;
    }

    onFileSelect(file);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  return (
    <div className="space-y-2 flex flex-col h-full">
      <Label htmlFor={id} className={tooltip ? "flex items-center" : undefined}>
        {label}{required ? <span className="text-slate-400 text-sm"> *</span> : null}{tooltip && (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300 hover:text-slate-600 transition-colors text-xs font-medium ml-1.5">
                  ?
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p>{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </Label>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`
          relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 sm:p-8 transition-colors flex-1
          ${
            isDragging
              ? "border-[#193DAB] bg-[#193DAB]/5"
              : error
              ? "border-red-300 bg-red-50"
              : "border-slate-300 bg-slate-50 hover:border-[#193DAB] hover:bg-slate-100"
          }
        `}
      >
        <input
          ref={fileInputRef}
          id={id}
          type="file"
          accept={logoOnly ? "image/png,image/svg+xml" : "image/jpeg,image/jpg,image/png,image/webp,image/avif,image/svg+xml"}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={uploading}
        />

        {preview ? (
          <div className="relative w-full">
            <img
              src={preview}
              alt="Preview"
              className="mx-auto max-h-40 w-auto rounded-lg object-contain"
            />
            {!uploading && (
              <p className="mt-2 text-center p-small text-slate-600">
                <span className="sm:hidden">Kies afbeelding om te vervangen</span>
                <span className="hidden sm:inline">Klik of sleep een nieuwe afbeelding hierheen om te vervangen</span>
              </p>
            )}
          </div>
        ) : (
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-slate-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="mt-2 p-regular text-[#1F2D58]">
              <span className="font-medium underline sm:hidden">Kies afbeelding</span>
              <span className="hidden sm:inline"><span className="font-medium underline">Klik om te uploaden</span> of sleep hierheen</span>
            </p>
            <p className="mt-1 p-small text-slate-500">
              {logoOnly ? `PNG, SVG tot ${maxSizeMB}MB` : `PNG, JPG, WebP, AVIF, SVG tot ${maxSizeMB}MB`}
            </p>
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80">
            <div className="text-center">
              <Spinner className="mx-auto size-8 text-[#193DAB]" />
              <p className="mt-2 p-small text-slate-600">Uploaden...</p>
            </div>
          </div>
        )}
      </div>
      {error && <p className="p-small text-red-500">{error}</p>}
    </div>
  );
}

