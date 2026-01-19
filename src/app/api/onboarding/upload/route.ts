import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getUserByEmail,
  getEmployerById,
  createMediaAsset,
  deleteMediaAsset,
  updateEmployer,
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
const MAX_LOGO_SIZE = 5 * 1024 * 1024; // 5MB for logos
const MAX_HEADER_SIZE = 10 * 1024 * 1024; // 10MB for headers

export async function POST(request: NextRequest) {
  let session;
  let employerId: string | null = null;
  let userId: string | null = null;
  const clientIP = getClientIP(request);
  
  try {
    session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized - No session" }, { status: 401 });
    }

    userId = session.user.id || null;
    
    // Get employerId from session or fetch from database
    employerId = session.user.employerId || null;
    
    // If no employerId in session, try to get it from the user record
    if ((!employerId || !userId) && session.user.email) {
      const user = await getUserByEmail(session.user.email);
      employerId = employerId || user?.employer_id || null;
      userId = userId || user?.id || null;
    }

    if (!employerId) {
      return NextResponse.json({ 
        error: "Geen werkgeversaccount gevonden. Voltooi eerst stap 1 van de onboarding." 
      }, { status: 400 });
    }

    // Check Cloudinary configuration
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return NextResponse.json(
        { error: "Cloudinary not configured" },
        { status: 500 }
      );
    }
  } catch (authError: any) {
    console.error("Auth error in upload:", authError);
    return NextResponse.json(
      { error: "Authentication error" },
      { status: 401 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as "logo" | "header";
    const companyData = JSON.parse(
      (formData.get("companyData") as string) || "{}"
    );

    if (!file || !type) {
      return NextResponse.json(
        { error: "File and type are required" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/avif", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Alleen JPEG, PNG, WebP, AVIF of SVG afbeeldingen zijn toegestaan" },
        { status: 400 }
      );
    }

    // Validate file size based on type
    const maxSize = type === "logo" ? MAX_LOGO_SIZE : MAX_HEADER_SIZE;
    const maxSizeMB = type === "logo" ? "5MB" : "10MB";
    
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `Afbeelding mag maximaal ${maxSizeMB} zijn` },
        { status: 400 }
      );
    }

    // Convert file to buffer and then to base64 for Cloudinary upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString("base64");
    const dataUri = `data:${file.type};base64,${base64Data}`;

    // Upload to Cloudinary with automatic optimization
    // For SVG files, skip transformations to preserve vector quality
    const isSvg = file.type === "image/svg+xml";
    const uploadResult = await cloudinary.uploader.upload(dataUri, {
      folder: `colourful-jobs/employers/${employerId}`,
      public_id: type, // 'logo' or 'header'
      overwrite: true,
      resource_type: "image",
      // SVG files don't need transformations
      ...(!isSvg && {
        transformation: [
          {
            quality: "auto:good", // Automatic quality optimization
            fetch_format: "auto", // Serve AVIF/WebP based on browser support
          },
          // Resize based on type
          type === "logo" 
            ? { width: 400, height: 400, crop: "limit" } // Logo max 400x400
            : { width: 1920, height: 600, crop: "limit" }, // Header max 1920x600
        ],
      }),
    });

    // Get the optimized URL (with automatic format)
    // For SVG, use the original URL without transformations
    const optimizedUrl = isSvg 
      ? uploadResult.secure_url
      : cloudinary.url(uploadResult.public_id, {
          fetch_format: "auto",
          quality: "auto:good",
          secure: true,
        });

    // Get employer to check for existing media and get company data for alt text
    const employer = await getEmployerById(employerId!);

    // Generate alt text using shared function for consistency
    const altText = generateAltText(type === "header" ? "header" : "logo", {
      display_name: employer?.display_name || companyData.display_name,
      company_name: employer?.company_name || companyData.company_name,
      sector: employer?.sector || companyData.sector,
    });

    // If replacing existing media, soft delete the old one
    const existingMediaId = type === "logo" 
      ? employer?.logo?.[0] 
      : employer?.header_image?.[0];
    
    if (existingMediaId) {
      try {
        await deleteMediaAsset(existingMediaId);
      } catch (deleteError) {
        console.error("Error deleting old media asset:", deleteError);
        // Continue even if deletion fails
      }
    }

    // Create Media Asset record in Airtable
    // Note: header images use type "sfeerbeeld" in Media Assets table
    const mediaAsset = await createMediaAsset({
      employer_id: employerId!,
      type: type === "logo" ? "logo" : "sfeerbeeld",
      file: [{ url: uploadResult.secure_url }],
      alt_text: altText,
      file_size: Math.round(uploadResult.bytes / 1024), // Convert to KB
      show_on_company_page: false,
    });

    // Update Employer with linked record to Media Asset
    if (type === "logo") {
      await updateEmployer(employerId!, { logo: [mediaAsset.id] });
    } else {
      // Header: add to gallery AND set as header_image
      // This ensures the image appears in the media library gallery
      const currentGallery = employer?.gallery || [];
      await updateEmployer(employerId!, { 
        gallery: [...currentGallery, mediaAsset.id],
        header_image: [mediaAsset.id] 
      });
    }

    // Log media_uploaded event
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

    return NextResponse.json({
      success: true,
      url: uploadResult.secure_url, // Return Cloudinary URL for preview
      optimizedUrl, // URL with automatic format optimization
      altText,
      publicId: uploadResult.public_id,
      mediaAssetId: mediaAsset.id,
    });
  } catch (error: unknown) {
    console.error("Error uploading image:", getErrorMessage(error));
    
    const errorMessage = getErrorMessage(error) || "Fout bij uploaden van afbeelding. Controleer of het bestand een geldige afbeelding is.";
    
    return NextResponse.json(
      { error: errorMessage },
      { 
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}

