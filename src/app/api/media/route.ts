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
const MAX_LOGO_SIZE = 1 * 1024 * 1024; // 1MB for logos
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

// Allowed file types for logos (PNG/SVG only for quality and transparency)
const ALLOWED_LOGO_TYPES = [
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

  // If no employerId in session, try to get it from the user record
  if ((!employerId || !userId) && session.user.email) {
    const user = await getUserByEmail(session.user.email);
    employerId = employerId || user?.employer_id || null;
    userId = userId || user?.id || null;
  }

  if (!employerId || !userId) {
    return NextResponse.json(
      { error: "Geen werkgeversaccount gevonden" },
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
 * Upload a new image (logo or gallery image)
 */
export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);

  try {
    const sessionData = await getSessionData(request);
    if (sessionData instanceof NextResponse) return sessionData;

    const { userId, employerId } = sessionData;

    // Check Cloudinary configuration
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      return NextResponse.json(
        { error: "Cloudinary niet geconfigureerd" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as "logo" | "sfeerbeeld";

    if (!file || !type) {
      return NextResponse.json(
        { error: "Bestand en type zijn verplicht" },
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

    // Validate file type (logos: PNG/SVG only, gallery: all formats)
    if (type === "logo") {
      if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: "Upload je logo als PNG of SVG bestand. Deze formaten behouden de kwaliteit en ondersteunen transparante achtergronden." },
          { status: 400 }
        );
      }
    } else {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: "Alleen JPEG, PNG, WebP, AVIF of SVG afbeeldingen zijn toegestaan" },
          { status: 400 }
        );
      }
    }

    // Validate file size
    const maxSize = type === "logo" ? MAX_LOGO_SIZE : MAX_IMAGE_SIZE;
    const maxSizeMB = type === "logo" ? "1MB" : "10MB";
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `Afbeelding mag maximaal ${maxSizeMB} zijn` },
        { status: 400 }
      );
    }

    // For gallery images, check max limit
    if (type === "sfeerbeeld") {
      const employer = await getEmployerById(employerId);
      const currentGalleryCount = employer?.gallery?.length || 0;
      if (currentGalleryCount >= MAX_GALLERY_IMAGES) {
        return NextResponse.json(
          { error: `Je kunt maximaal ${MAX_GALLERY_IMAGES} afbeeldingen uploaden` },
          { status: 400 }
        );
      }
    }

    // Get employer for alt text generation
    const employer = await getEmployerById(employerId);

    // Convert file to base64 for Cloudinary
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString("base64");
    const dataUri = `data:${file.type};base64,${base64Data}`;

    // Generate unique public_id
    const timestamp = Date.now();
    const publicId = type === "logo" ? "logo" : `gallery_${timestamp}`;

    // Upload to Cloudinary
    // Logo: keep original format (SVG/PNG) for quality and transparency
    // Gallery images: optimize to AVIF/WebP for performance
    const isSvg = file.type === "image/svg+xml";
    const isLogo = type === "logo";
    
    const uploadResult = await cloudinary.uploader.upload(dataUri, {
      folder: `colourful-jobs/employers/${employerId}`,
      public_id: publicId,
      overwrite: isLogo, // Only overwrite for logo
      resource_type: "image",
      // For logos: only resize, keep original format (SVG/PNG)
      // For gallery: optimize format to AVIF/WebP
      ...(!isSvg && isLogo && {
        transformation: [
          { width: 400, height: 400, crop: "limit" },
        ],
      }),
      ...(!isSvg && !isLogo && {
        transformation: [
          { quality: "auto:good", fetch_format: "auto" },
          { width: 1920, height: 1080, crop: "limit" },
        ],
      }),
    });

    // Generate alt text
    const altText = generateAltText(
      type === "logo" ? "logo" : "header",
      {
        display_name: employer?.display_name,
        company_name: employer?.company_name,
        sector: employer?.sector,
        location: employer?.location,
      }
    );

    // If uploading a new logo, soft delete the old one
    if (type === "logo" && employer?.logo?.[0]) {
      await deleteMediaAsset(employer.logo[0]);
    }

    // Create Media Asset record in Airtable
    const mediaAsset = await createMediaAsset({
      employer_id: employerId,
      type: type,
      file: [{ url: uploadResult.secure_url }],
      alt_text: altText,
      file_size: Math.round(uploadResult.bytes / 1024), // Convert to KB
      show_on_company_page: false,
    });

    // Update Employer record (only for logo - gallery images are selected via werkgeversprofiel)
    if (type === "logo") {
      await updateEmployer(employerId, { logo: [mediaAsset.id] });
    }
    // Note: sfeerbeelden are NOT automatically added to employer.gallery
    // Users select which images appear on their profile via the werkgeversprofiel page

    // Log event
    await logEvent({
      event_type: "media_uploaded",
      actor_user_id: userId,
      employer_id: employerId,
      source: "web",
      ip_address: clientIP,
      payload: {
        type,
        media_asset_id: mediaAsset.id,
        public_id: uploadResult.public_id,
        url: uploadResult.secure_url,
      },
    });

    // Determine file type for display
    // Logo: keep original format name, Gallery: show as AVIF (auto-optimized)
    const getFileTypeDisplay = () => {
      if (isSvg) return "SVG";
      if (isLogo) {
        // Return original format for logos
        const mimeToFormat: Record<string, string> = {
          "image/png": "PNG",
          "image/jpeg": "JPEG",
          "image/jpg": "JPEG",
          "image/webp": "WEBP",
          "image/avif": "AVIF",
        };
        return mimeToFormat[file.type] || "IMG";
      }
      // Gallery images are auto-optimized to AVIF/WebP
      return "AVIF";
    };

    return NextResponse.json({
      success: true,
      asset: {
        id: mediaAsset.id,
        url: uploadResult.secure_url,
        fileType: getFileTypeDisplay(),
        fileSize: formatFileSize(uploadResult.bytes),
        isHeader: false,
        altText,
      },
    });
  } catch (error) {
    console.error("Error uploading media:", getErrorMessage(error));
    return NextResponse.json(
      { error: "Fout bij uploaden van afbeelding" },
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
      await updateEmployer(employerId, { header_image: [assetId] });

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

      return NextResponse.json({
        success: true,
        headerImageId: assetId,
      });
    }

    if (action === "remove_header") {
      // Only remove if this is the current header
      if (employer.header_image?.[0] === assetId) {
        await updateEmployer(employerId, { header_image: [] });
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
      if (employer.gallery?.includes(assetId)) {
        const newGallery = employer.gallery.filter((id) => id !== assetId);
        await updateEmployer(employerId, { gallery: newGallery });
      }

      // If this was the header image, also clear that
      if (employer.header_image?.[0] === assetId) {
        await updateEmployer(employerId, { header_image: [] });
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
