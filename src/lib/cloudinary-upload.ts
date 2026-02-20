/**
 * Direct browser-to-Cloudinary upload utilities
 * Bypasses the Vercel 4.5MB serverless function limit
 */

// File size limits (same as server-side)
export const MAX_LOGO_SIZE = 5 * 1024 * 1024; // 5MB for logos
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB for gallery images

// Allowed file types
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/svg+xml",
];

export const ALLOWED_LOGO_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/svg+xml",
];

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  bytes: number;
  format: string;
  width: number;
  height: number;
}

export interface UploadSignature {
  signature: string;
  timestamp: number;
  cloudName: string;
  apiKey: string;
  folder: string;
  publicId: string;
  transformation: string;
  overwrite: boolean;
  employerId: string;
  userId: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate file before upload
 */
export function validateFile(
  file: File,
  type: "logo" | "sfeerbeeld"
): ValidationResult {
  const isLogo = type === "logo";
  const allowedTypes = isLogo ? ALLOWED_LOGO_TYPES : ALLOWED_IMAGE_TYPES;
  const maxSize = isLogo ? MAX_LOGO_SIZE : MAX_IMAGE_SIZE;
  const maxSizeMB = isLogo ? "5MB" : "10MB";

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    if (isLogo) {
      return {
        valid: false,
        error: "Upload je logo als PNG of SVG bestand. Deze formaten behouden de kwaliteit en ondersteunen transparante achtergronden.",
      };
    }
    return {
      valid: false,
      error: "Alleen JPEG, PNG, WebP, AVIF of SVG afbeeldingen zijn toegestaan",
    };
  }

  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `Afbeelding mag maximaal ${maxSizeMB} zijn`,
    };
  }

  return { valid: true };
}

/**
 * Get upload signature from our API
 */
export async function getUploadSignature(
  type: "logo" | "sfeerbeeld"
): Promise<UploadSignature> {
  const response = await fetch("/api/media/signature", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Kon upload signature niet ophalen");
  }

  return response.json();
}

/**
 * Upload file directly to Cloudinary
 */
export async function uploadToCloudinary(
  file: File,
  signature: UploadSignature
): Promise<CloudinaryUploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", signature.apiKey);
  formData.append("timestamp", signature.timestamp.toString());
  formData.append("signature", signature.signature);
  formData.append("folder", signature.folder);
  formData.append("public_id", signature.publicId);
  formData.append("transformation", signature.transformation);
  formData.append("overwrite", signature.overwrite.toString());

  const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`;

  const response = await fetch(cloudinaryUrl, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("Cloudinary upload error:", error);
    throw new Error(error.error?.message || "Upload naar Cloudinary mislukt");
  }

  return response.json();
}

/**
 * Register uploaded file in our database
 */
export async function registerUploadedMedia(
  type: "logo" | "sfeerbeeld",
  cloudinaryResult: CloudinaryUploadResult,
  fileType: string
): Promise<{ asset: { id: string; url: string; fileType: string; fileSize: string; isHeader: boolean; altText: string } }> {
  const response = await fetch("/api/media", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type,
      cloudinaryResult,
      fileType,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Kon media niet registreren");
  }

  return response.json();
}

/**
 * Complete upload flow: validate -> get signature -> upload to Cloudinary -> register in database
 */
export async function uploadMedia(
  file: File,
  type: "logo" | "sfeerbeeld",
  onProgress?: (stage: "validating" | "signing" | "uploading" | "registering") => void
): Promise<{ asset: { id: string; url: string; fileType: string; fileSize: string; isHeader: boolean; altText: string } }> {
  // Step 1: Validate file
  onProgress?.("validating");
  const validation = validateFile(file, type);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Step 2: Get upload signature
  onProgress?.("signing");
  const signature = await getUploadSignature(type);

  // Step 3: Upload directly to Cloudinary
  onProgress?.("uploading");
  const cloudinaryResult = await uploadToCloudinary(file, signature);

  // Step 4: Register in our database
  onProgress?.("registering");
  const result = await registerUploadedMedia(type, cloudinaryResult, file.type);

  return result;
}
