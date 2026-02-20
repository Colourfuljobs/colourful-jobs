import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getUserByEmail,
  getEmployerById,
  getMediaAssetsByEmployerId,
  getMediaAssetsByIds,
  createMediaAsset,
  updateMediaAsset,
  deleteMediaAsset,
  updateEmployer,
  MediaAssetRecord,
} from "@/lib/airtable";
import { logEvent, getClientIP } from "@/lib/events";
import { triggerEmployerWebflowSync } from "@/lib/webflow-sync";
import { getErrorMessage } from "@/lib/utils";
import { generateAltText } from "@/lib/image-processing";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// File size limits
const MAX_LOGO_SIZE = 5 * 1024 * 1024; // 5MB for logos
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB for gallery images
const MAX_GALLERY_IMAGES = 10;

// Allowed file types for gallery images
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/svg+xml",
];

// Allowed file types for logos
const ALLOWED_LOGO_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/svg+xml",
];

interface SessionData {
  userId: string;
  employerId: string;
}

/**
 * Helper to get session and employer data
 */
async function getSessionData(request: NextRequest): Promise<SessionData | NextResponse> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let userId = session.user.id || null;
  let employerId = session.user.employerId || null;

  // Get user record to access employer_id or active_employer
  let user = null;
  if ((!employerId || !userId) && session.user.email) {
    user = await getUserByEmail(session.user.email);
    userId = userId || user?.id || null;
    
    // For intermediaries, use active_employer instead of employer_id
    if (user?.role_id === "intermediary") {
      employerId = user.active_employer || null;
    } else {
      employerId = employerId || user?.employer_id || null;
    }
  }

  if (!userId) {
    return NextResponse.json(
      { error: "Gebruiker niet gevonden" },
      { status: 401 }
    );
  }

  if (!employerId) {
    return NextResponse.json(
      { error: user?.role_id === "intermediary" 
          ? "Selecteer eerst een werkgever" 
          : "Geen werkgeversaccount gevonden" },
      { status: 400 }
    );
  }

  return { userId, employerId };
}

/**
 * GET /api/media
 * Get all media assets for the logged-in employer
 */
export async function GET(request: NextRequest) {
  try {
    const sessionData = await getSessionData(request);
    if (sessionData instanceof NextResponse) return sessionData;

    const { employerId } = sessionData;

    // Get employer to find linked media asset IDs
    const employer = await getEmployerById(employerId);
    if (!employer) {
      return NextResponse.json(
        { error: "Werkgever niet gevonden" },
        { status: 404 }
      );
    }

    // Get logo (single)
    let logo: MediaAssetRecord | null = null;
    if (employer.logo && employer.logo.length > 0) {
      const logos = await getMediaAssetsByIds(employer.logo);
      logo = logos[0] || null;
    }

    // Get header image ID (the one currently selected for the profile)
    const headerImageId = employer.header_image?.[0] || null;

    // Get ALL sfeerbeelden for this employer (not just those selected for profile)
    // This is the full media library / beeldbank
    const allSfeerbeelden = await getMediaAssetsByEmployerId(employerId, { type: "sfeerbeeld" });

    // Transform to frontend format
    const transformAsset = (asset: MediaAssetRecord) => {
      const file = asset.file?.[0];
      // Get file type, convert "svg+xml" to just "SVG"
      let fileType = file?.type?.split("/")[1]?.toUpperCase() || "UNKNOWN";
      if (fileType === "SVG+XML") fileType = "SVG";
      return {
        id: asset.id,
        url: file?.url || "",
        fileType,
        fileSize: formatFileSize(asset.file_size || file?.size || 0),
        isHeader: asset.id === headerImageId,
        altText: typeof asset.alt_text === "string" ? asset.alt_text : "",
      };
    };

    return NextResponse.json({
      logo: logo ? transformAsset(logo) : null,
      images: allSfeerbeelden.map(transformAsset),
      headerImageId,
      maxImages: MAX_GALLERY_IMAGES,
    });
  } catch (error) {
    console.error("Error fetching media:", getErrorMessage(error));
    return NextResponse.json(
      { error: "Fout bij ophalen van media" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/media
 * Register a new image after direct Cloudinary upload
 * Accepts JSON body with Cloudinary upload result data
 */
export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);

  try {
    const sessionData = await getSessionData(request);
    if (sessionData instanceof NextResponse) return sessionData;

    const { userId, employerId } = sessionData;

    // Parse JSON body (Cloudinary upload result from frontend)
    const body = await request.json();
    const { 
      type,
      cloudinaryResult,
      fileType: originalFileType,
    } = body as {
      type: "logo" | "sfeerbeeld";
      cloudinaryResult: {
        secure_url: string;
        public_id: string;
        bytes: number;
        format: string;
      };
      fileType: string;
    };

    // Validate required fields
    if (!type || !cloudinaryResult?.secure_url) {
      return NextResponse.json(
        { error: "Type en Cloudinary upload result zijn verplicht" },
        { status: 400 }
      );
    }

    // Validate type
    if (!["logo", "sfeerbeeld"].includes(type)) {
      return NextResponse.json(
        { error: "Ongeldig type. Gebruik 'logo' of 'sfeerbeeld'" },
        { status: 400 }
      );
    }

    // For gallery images, check max limit (double-check, signature endpoint also checks)
    if (type === "sfeerbeeld") {
      const allSfeerbeelden = await getMediaAssetsByEmployerId(employerId, { type: "sfeerbeeld" });
      if (allSfeerbeelden.length >= MAX_GALLERY_IMAGES) {
        return NextResponse.json(
          { error: `Je kunt maximaal ${MAX_GALLERY_IMAGES} afbeeldingen uploaden` },
          { status: 400 }
        );
      }
    }

    // Get employer for alt text generation
    let employer;
    try {
      employer = await getEmployerById(employerId);
    } catch (error) {
      console.error("Error fetching employer:", getErrorMessage(error));
      return NextResponse.json(
        { error: "Kon werkgeversgegevens niet ophalen. Probeer de pagina te verversen." },
        { status: 500 }
      );
    }

    if (!employer) {
      return NextResponse.json(
        { error: "Werkgever niet gevonden. Log opnieuw in en probeer het nogmaals." },
        { status: 404 }
      );
    }

    // Generate alt text
    const altText = generateAltText(
      type as "logo" | "header" | "sfeerbeeld",
      {
        display_name: employer?.display_name,
        company_name: employer?.company_name,
        sector: employer?.sector?.[0],
        location: employer?.location ?? undefined,
      }
    );

    // If uploading a new logo, soft delete the old one
    if (type === "logo" && employer?.logo?.[0]) {
      try {
        await deleteMediaAsset(employer.logo[0]);
      } catch (error) {
        // Log but don't fail - old logo cleanup is not critical
        console.error("Error deleting old logo:", getErrorMessage(error));
      }
    }

    // Create Media Asset record in Airtable
    let mediaAsset;
    try {
      mediaAsset = await createMediaAsset({
        employer_id: employerId,
        type: type,
        file: [{ url: cloudinaryResult.secure_url }],
        alt_text: altText,
        file_size: Math.round(cloudinaryResult.bytes / 1024), // Convert to KB
      });
    } catch (error) {
      console.error("Error creating media asset in Airtable:", getErrorMessage(error));
      return NextResponse.json(
        { error: "Kon afbeelding niet opslaan in database. Dit kan komen door een tijdelijk probleem met onze database. Probeer het over enkele seconden opnieuw." },
        { status: 500 }
      );
    }

    // Update Employer record (only for logo - gallery images are selected via werkgeversprofiel)
    if (type === "logo") {
      try {
        await updateEmployer(employerId, { logo: [mediaAsset.id], needs_webflow_sync: true });
        triggerEmployerWebflowSync(employerId);
      } catch (error) {
        console.error("Error updating employer with new logo:", getErrorMessage(error));
        return NextResponse.json(
          { error: "Logo is geüpload maar kon niet worden gekoppeld aan je profiel. Ververs de pagina en probeer het opnieuw." },
          { status: 500 }
        );
      }
    }

    // Log event (don't fail on logging errors)
    try {
      await logEvent({
        event_type: "media_uploaded",
        actor_user_id: userId,
        employer_id: employerId,
        source: "web",
        ip_address: clientIP,
        payload: {
          type,
          media_asset_id: mediaAsset.id,
          public_id: cloudinaryResult.public_id,
          url: cloudinaryResult.secure_url,
        },
      });
    } catch (error) {
      console.error("Error logging media upload event:", getErrorMessage(error));
      // Don't fail the request for logging errors
    }

    // Determine file type for display
    const isLogo = type === "logo";
    const isSvg = cloudinaryResult.format === "svg" || originalFileType === "image/svg+xml";
    
    const getFileTypeDisplay = () => {
      if (isSvg) return "SVG";
      if (isLogo) {
        // Return original format for logos
        const formatMap: Record<string, string> = {
          "png": "PNG",
          "jpg": "JPEG",
          "jpeg": "JPEG",
          "webp": "WEBP",
          "avif": "AVIF",
        };
        return formatMap[cloudinaryResult.format] || "IMG";
      }
      // Gallery images are auto-optimized to AVIF/WebP
      return cloudinaryResult.format?.toUpperCase() || "AVIF";
    };

    return NextResponse.json({
      success: true,
      asset: {
        id: mediaAsset.id,
        url: cloudinaryResult.secure_url,
        fileType: getFileTypeDisplay(),
        fileSize: formatFileSize(cloudinaryResult.bytes),
        isHeader: false,
        altText,
      },
    });
  } catch (error) {
    console.error("Error registering media:", getErrorMessage(error));
    const errorMessage = getErrorMessage(error);
    
    // Check for common error patterns
    if (errorMessage.includes("ETIMEDOUT") || errorMessage.includes("timeout")) {
      return NextResponse.json(
        { error: "Verbinding met database is verlopen. Controleer je internetverbinding en probeer het opnieuw." },
        { status: 500 }
      );
    }
    if (errorMessage.includes("rate limit") || errorMessage.includes("429")) {
      return NextResponse.json(
        { error: "Te veel verzoeken. Wacht even en probeer het opnieuw." },
        { status: 429 }
      );
    }
    if (errorMessage.includes("ENOTFOUND") || errorMessage.includes("network")) {
      return NextResponse.json(
        { error: "Netwerkfout. Controleer je internetverbinding en probeer het opnieuw." },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: "Onverwachte fout bij registreren van afbeelding. Probeer het opnieuw of neem contact op met support." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/media
 * Update media asset (e.g., set as header)
 */
export async function PATCH(request: NextRequest) {
  const clientIP = getClientIP(request);

  try {
    const sessionData = await getSessionData(request);
    if (sessionData instanceof NextResponse) return sessionData;

    const { userId, employerId } = sessionData;

    const body = await request.json();
    const { assetId, action } = body;

    if (!assetId || !action) {
      return NextResponse.json(
        { error: "Asset ID en actie zijn verplicht" },
        { status: 400 }
      );
    }

    // Verify asset belongs to this employer
    const employer = await getEmployerById(employerId);
    
    if (!employer) {
      return NextResponse.json(
        { error: "Werkgever niet gevonden" },
        { status: 404 }
      );
    }
    
    const allAssets = await getMediaAssetsByEmployerId(employerId, { type: "sfeerbeeld" });
    const assetBelongsToEmployer = allAssets.some((asset) => asset.id === assetId);
    
    if (!assetBelongsToEmployer) {
      return NextResponse.json(
        { error: "Afbeelding niet gevonden" },
        { status: 404 }
      );
    }

    if (action === "set_header") {
      // Update employer's header_image
      await updateEmployer(employerId, { header_image: [assetId], needs_webflow_sync: true });

      // Log event
      await logEvent({
        event_type: "media_uploaded", // Using existing event type
        actor_user_id: userId,
        employer_id: employerId,
        source: "web",
        ip_address: clientIP,
        payload: {
          action: "set_header",
          media_asset_id: assetId,
        },
      });

      triggerEmployerWebflowSync(employerId);

      return NextResponse.json({
        success: true,
        headerImageId: assetId,
      });
    }

    if (action === "remove_header") {
      // Only remove if this is the current header
      if (employer.header_image?.[0] === assetId) {
        await updateEmployer(employerId, { header_image: [], needs_webflow_sync: true });
        triggerEmployerWebflowSync(employerId);
      }

      return NextResponse.json({
        success: true,
        headerImageId: null,
      });
    }

    return NextResponse.json(
      { error: "Ongeldige actie" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error updating media:", getErrorMessage(error));
    return NextResponse.json(
      { error: "Fout bij bijwerken van afbeelding" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/media
 * Delete a media asset (soft delete)
 */
export async function DELETE(request: NextRequest) {
  const clientIP = getClientIP(request);

  try {
    const sessionData = await getSessionData(request);
    if (sessionData instanceof NextResponse) return sessionData;

    const { userId, employerId } = sessionData;

    const { searchParams } = new URL(request.url);
    const assetId = searchParams.get("id");
    const type = searchParams.get("type") as "logo" | "sfeerbeeld";

    if (!assetId || !type) {
      return NextResponse.json(
        { error: "Asset ID en type zijn verplicht" },
        { status: 400 }
      );
    }

    // Logo's kunnen niet verwijderd worden, alleen vervangen
    if (type === "logo") {
      return NextResponse.json(
        { error: "Een logo kan niet verwijderd worden, alleen vervangen door een nieuw logo te uploaden" },
        { status: 400 }
      );
    }

    const employer = await getEmployerById(employerId);
    if (!employer) {
      return NextResponse.json(
        { error: "Werkgever niet gevonden" },
        { status: 404 }
      );
    }

    // Verify asset belongs to this employer by checking all sfeerbeelden
    if (type === "sfeerbeeld") {
      const allAssets = await getMediaAssetsByEmployerId(employerId, { type: "sfeerbeeld" });
      const assetBelongsToEmployer = allAssets.some((asset) => asset.id === assetId);
      
      if (!assetBelongsToEmployer) {
        return NextResponse.json(
          { error: "Afbeelding niet gevonden" },
          { status: 404 }
        );
      }

      // Remove from gallery if it was selected for the profile
      const wasInGallery = employer.gallery?.includes(assetId);
      if (wasInGallery) {
        const newGallery = employer.gallery!.filter((id) => id !== assetId);
        await updateEmployer(employerId, { gallery: newGallery, needs_webflow_sync: true });
      }

      // If this was the header image, also clear that
      const wasHeader = employer.header_image?.[0] === assetId;
      if (wasHeader) {
        await updateEmployer(employerId, { header_image: [], needs_webflow_sync: true });
      }

      if (wasInGallery || wasHeader) {
        triggerEmployerWebflowSync(employerId);
      }
    }

    // Soft delete the media asset
    await deleteMediaAsset(assetId);

    // Log event
    await logEvent({
      event_type: "media_deleted",
      actor_user_id: userId,
      employer_id: employerId,
      source: "web",
      ip_address: clientIP,
      payload: {
        type,
        media_asset_id: assetId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting media:", getErrorMessage(error));
    return NextResponse.json(
      { error: "Fout bij verwijderen van afbeelding" },
      { status: 500 }
    );
  }
}

/**
 * Format file size to human readable string (minimum KB)
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 KB";
  const k = 1024;
  // Start at KB (index 1), skip bytes
  const sizes = ["KB", "MB", "GB"];
  const kb = bytes / k;
  if (kb < 1) return "< 1 KB";
  const i = Math.floor(Math.log(kb) / Math.log(k));
  const index = Math.min(i, sizes.length - 1);
  return parseFloat((kb / Math.pow(k, index)).toFixed(0)) + " " + sizes[index];
}
