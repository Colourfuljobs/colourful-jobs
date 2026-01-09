import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateEmployer, getUserByEmail } from "@/lib/airtable";
import { logEvent, getClientIP } from "@/lib/events";
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
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/avif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Alleen JPEG, PNG, WebP of AVIF afbeeldingen zijn toegestaan" },
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

    // Generate alt text
    const altText = generateAltText(type, companyData);

    // Upload to Cloudinary with automatic optimization
    const uploadResult = await cloudinary.uploader.upload(dataUri, {
      folder: `colourful-jobs/employers/${employerId}`,
      public_id: type, // 'logo' or 'header'
      overwrite: true,
      resource_type: "image",
      // Transformation for optimization - Cloudinary will serve AVIF/WebP automatically with f_auto
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
    });

    // Get the optimized URL (with automatic format)
    const optimizedUrl = cloudinary.url(uploadResult.public_id, {
      fetch_format: "auto",
      quality: "auto:good",
      secure: true,
    });

    // Store in Airtable - both the URL (as attachment) and alt text
    // Note: In Airtable, header field is called "header_image"
    try {
      const airtableFieldName = type === "header" ? "header_image" : type;
      const updateFields: Record<string, any> = {
        [`${airtableFieldName}_alt-text`]: altText,
        // Airtable attachment format requires an array of objects with url
        [airtableFieldName]: [{ url: uploadResult.secure_url }],
      };

      await updateEmployer(employerId!, updateFields);
    } catch (airtableError: any) {
      console.error("Error updating Airtable:", airtableError);
      // Still return success - the image is uploaded to Cloudinary
      // We can retry Airtable update later if needed
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
    });
  } catch (error: any) {
    console.error("Error uploading image:", error);
    
    const errorMessage = error?.message || "Fout bij uploaden van afbeelding. Controleer of het bestand een geldige afbeelding is.";
    
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

// Generate alt text based on image type and company data
function generateAltText(type: "logo" | "header", companyData: any): string {
  const companyName = companyData.display_name || companyData.company_name || "Bedrijf";
  
  if (type === "logo") {
    return `Logo van ${companyName}`;
  } else {
    const sector = companyData.sector ? ` in de ${companyData.sector} sector` : "";
    return `Header afbeelding van ${companyName}${sector}`;
  }
}
