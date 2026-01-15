import sharp from "sharp";
import { getErrorMessage } from "./utils";

export interface CompanyData {
  display_name?: string;
  company_name?: string;
  sector?: string;
  location?: string;
}

/**
 * Generate alt text for images following WCAG best practices
 */
export function generateAltText(
  type: "logo" | "header",
  companyData: CompanyData
): string {
  const companyName = companyData.display_name || companyData.company_name || "";

  if (type === "logo") {
    // Best practice: logo alt text is just the company name
    return companyName;
  }

  // Header: contextuele beschrijving
  let description = "Werkplek";
  if (companyData.sector) {
    description = `${companyData.sector} werkplek`;
  }

  let altText = `${description} bij ${companyName}`;
  
  if (companyData.location) {
    altText += ` in ${companyData.location}`;
  }

  return altText;
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

    // Validate image format
    if (!metadata.format || !["jpeg", "jpg", "png", "webp"].includes(metadata.format)) {
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
 * Validate image file
 */
export function validateImage(file: File): { valid: boolean; error?: string } {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/svg+xml"];

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: "Alleen JPEG, PNG, WebP of SVG afbeeldingen zijn toegestaan",
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: "Afbeelding mag maximaal 5MB zijn",
    };
  }

  return { valid: true };
}

