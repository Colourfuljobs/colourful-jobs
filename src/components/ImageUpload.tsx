"use client";

import { useRef, useState, DragEvent } from "react";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface ImageUploadProps {
  id: string;
  label: string;
  required?: boolean;
  preview?: string | null;
  uploading?: boolean;
  onFileSelect: (file: File) => void;
  error?: string;
}

export function ImageUpload({
  id,
  label,
  required = false,
  preview,
  uploading = false,
  onFileSelect,
  error,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (file: File) => {
    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/avif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Ongeldig bestandstype", {
        description: "Alleen JPEG, PNG, WebP of AVIF afbeeldingen zijn toegestaan",
      });
      return;
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("Bestand te groot", {
        description: "Afbeelding mag maximaal 5MB zijn",
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
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label} {required && "*"}
      </Label>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`
          relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors
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
          accept="image/jpeg,image/jpg,image/png,image/webp,image/avif"
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
                Klik of sleep een nieuwe afbeelding hierheen om te vervangen
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
            <p className="mt-2 p-regular text-slate-700">
              <span className="font-medium text-[#193DAB]">Klik om te uploaden</span> of sleep hierheen
            </p>
            <p className="mt-1 p-small text-slate-500">
              PNG, JPG, WebP, AVIF tot 5MB
            </p>
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[#193DAB] border-t-transparent"></div>
              <p className="mt-2 p-small text-slate-600">Uploaden...</p>
            </div>
          </div>
        )}
      </div>
      {error && <p className="p-small text-red-500">{error}</p>}
    </div>
  );
}

