import sharp from "sharp";
import { getErrorMessage } from "./utils";

export interface CompanyData {
  display_name?: string;
  company_name?: string;
  sector?: string;
  location?: string;
}

export interface ContactData {
  name?: string;
  role?: string;
}

/**
 * Generate alt text for images following WCAG best practices
 */
export function generateAltText(
  type: "logo" | "header" | "sfeerbeeld" | "contact",
  companyData: CompanyData,
  contactData?: ContactData
): string {
  const companyName = companyData.display_name || companyData.company_name || "";
  const sector = companyData.sector;
  const location = companyData.location;

  switch (type) {
    case "logo":
      return `Logo van ${companyName}`;

    case "header": {
      const parts = [`Headerafbeelding van ${companyName}`];
      if (sector) parts.push(sector);
      if (location) parts.push(location);
      return parts.join(" — ");
    }

    case "sfeerbeeld": {
      if (sector && location) return `Werksfeer bij ${companyName} — ${sector} in ${location}`;
      if (sector) return `Werksfeer bij ${companyName} — ${sector}`;
      if (location) return `Werksfeer bij ${companyName} in ${location}`;
      return `Werksfeer bij ${companyName}`;
    }

    case "contact": {
      const name = contactData?.name || "";
      const role = contactData?.role || "";
      if (name && role) return `${name}, ${role} bij ${companyName}`;
      if (name) return `${name} bij ${companyName}`;
      return `Contactpersoon bij ${companyName}`;
    }

    default:
      return companyName;
  }
}

/**
 * Process and compress image to AVIF format
 */
export async function processImage(
  buffer: Buffer,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  quality: number = 80
): Promise<Buffer> {
  try {
    // Validate buffer
    if (!buffer || buffer.length === 0) {
      throw new Error("Empty image buffer");
    }

    const image = sharp(buffer);
    
    // Get metadata with error handling
    let metadata;
    try {
      metadata = await image.metadata();
    } catch (metaError) {
      console.error("Error reading image metadata:", metaError);
      throw new Error("Ongeldig afbeeldingsbestand");
    }

    // Validate image format (SVG is handled separately, not processed by sharp)
    if (!metadata.format || !["jpeg", "jpg", "png", "webp", "avif"].includes(metadata.format)) {
      throw new Error("Ongeldig afbeeldingsformaat");
    }

    // Resize if needed
    let processed = image;
    if (metadata.width && metadata.height) {
      if (metadata.width > maxWidth || metadata.height > maxHeight) {
        processed = image.resize(maxWidth, maxHeight, {
          fit: "inside",
          withoutEnlargement: true,
        });
      }
    }

    // Convert to AVIF with error handling
    try {
      const avifBuffer = await processed
        .avif({
          quality,
          effort: 4, // Balance between compression time and file size
        })
        .toBuffer();

      return avifBuffer;
    } catch (avifError) {
      // If AVIF conversion fails, try WebP as fallback
      console.warn("AVIF conversion failed, trying WebP:", avifError);
      const webpBuffer = await processed
        .webp({
          quality,
        })
        .toBuffer();
      return webpBuffer;
    }
  } catch (error: unknown) {
    console.error("Error processing image:", getErrorMessage(error));
    throw new Error(getErrorMessage(error) || "Fout bij verwerken van afbeelding");
  }
}

/**
 * Validate image file for gallery/sfeerbeelden uploads
 */
export function validateImage(file: File): { valid: boolean; error?: string } {
  const maxSize = 10 * 1024 * 1024; // 10MB for gallery images
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/avif", "image/svg+xml"];

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: "Alleen JPEG, PNG, WebP, AVIF of SVG afbeeldingen zijn toegestaan",
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: "Afbeelding mag maximaal 10MB zijn",
    };
  }

  return { valid: true };
}

/**
 * Validate logo file (PNG/SVG only for quality and transparency)
 */
export function validateLogo(file: File): { valid: boolean; error?: string } {
  const maxSize = 5 * 1024 * 1024; // 5MB for logos
  const allowedTypes = ["image/png", "image/svg+xml"];

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: "Upload je logo als PNG of SVG bestand. Deze formaten behouden de kwaliteit en ondersteunen transparante achtergronden.",
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: "Logo mag maximaal 5MB zijn",
    };
  }

  return { valid: true };
}

