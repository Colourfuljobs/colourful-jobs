import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserByEmail, getEmployerById, getMediaAssetsByEmployerId } from "@/lib/airtable";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_GALLERY_IMAGES = 10;

/**
 * POST /api/media/signature
 * Generate a signed upload signature for direct browser-to-Cloudinary uploads
 * This bypasses the Vercel 4.5MB limit by not routing the file through our server
 */
export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json();
    const { type } = body as { type: "logo" | "sfeerbeeld" };

    if (!type || !["logo", "sfeerbeeld"].includes(type)) {
      return NextResponse.json(
        { error: "Ongeldig type. Gebruik 'logo' of 'sfeerbeeld'" },
        { status: 400 }
      );
    }

    // For gallery images, check max limit before allowing upload
    if (type === "sfeerbeeld") {
      const allSfeerbeelden = await getMediaAssetsByEmployerId(employerId, { type: "sfeerbeeld" });
      if (allSfeerbeelden.length >= MAX_GALLERY_IMAGES) {
        return NextResponse.json(
          { error: `Je kunt maximaal ${MAX_GALLERY_IMAGES} afbeeldingen uploaden` },
          { status: 400 }
        );
      }
    }

    // Generate timestamp and unique public_id
    const timestamp = Math.round(Date.now() / 1000);
    const publicId = type === "logo" ? "logo" : `gallery_${Date.now()}`;
    const folder = `colourful-jobs/employers/${employerId}`;

    // Build transformation string based on type
    // Logo: resize to max 400x400, keep original format
    // Gallery: auto quality, auto format, max 1920x1080
    const isLogo = type === "logo";
    
    // Cloudinary transformation for eager processing
    const transformation = isLogo
      ? "c_limit,w_400,h_400"
      : "c_limit,w_1920,h_1080,q_auto:good,f_auto";

    // Parameters to sign (must match exactly what frontend sends)
    const paramsToSign = {
      timestamp,
      folder,
      public_id: publicId,
      overwrite: isLogo ? "true" : "false",
      transformation,
    };

    // Generate signature
    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET!
    );

    return NextResponse.json({
      signature,
      timestamp,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      folder,
      publicId,
      transformation,
      overwrite: isLogo,
      employerId,
      userId,
    });
  } catch (error) {
    console.error("Error generating signature:", error);
    return NextResponse.json(
      { error: "Fout bij genereren van upload signature" },
      { status: 500 }
    );
  }
}
