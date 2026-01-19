import { authOptions } from "@/lib/auth";
import {
  getUserByEmail,
  getEmployerById,
  getMediaAssetsByIds,
  getFAQByEmployerId,
  updateUser,
  updateEmployer,
  createFAQ,
  updateFAQ,
  deleteFAQ,
} from "@/lib/airtable";
import { logEvent, getClientIP } from "@/lib/events";
import { getErrorMessage } from "@/lib/utils";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

/**
 * GET /api/account
 * Fetches all account data for the logged-in user:
 * - Personal data (from Users table)
 * - Company data (from Employers table)
 * - Media assets (from Media Assets table)
 * - FAQ items (from FAQ table)
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user data
    const user = await getUserByEmail(session.user.email);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Build response with user data
    const response: Record<string, any> = {
      personal: {
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        email: user.email,
        role: user.role || "",
      },
    };

    // Get employer data if user has an employer
    if (user.employer_id) {
      const employer = await getEmployerById(user.employer_id);

      if (employer) {
        response.company = {
          company_name: employer.company_name || "",
          phone: employer.phone || "",
          kvk: employer.kvk || "",
          website_url: employer.website_url || "",
        };

        response.billing = {
          "reference-nr": employer["reference-nr"] || "",
          invoice_contact_name: employer.invoice_contact_name || "",
          invoice_email: employer.invoice_email || "",
          invoice_street: employer.invoice_street || "",
          "invoice_house-nr": employer["invoice_house-nr"] || "",
          "invoice_house-nr-add": employer["invoice_house-nr-add"] || "",
          "invoice_postal-code": employer["invoice_postal-code"] || "",
          invoice_city: employer.invoice_city || "",
          invoice_country: employer.invoice_country || "",
        };

        response.website = {
          display_name: employer.display_name || "",
          sector: employer.sector || "",
          short_description: employer.short_description || "",
          video_url: employer.video_url || "",
        };

        // Get media assets via linked records in employer
        // Logo (linked record - array with 1 ID)
        if (employer.logo && employer.logo.length > 0) {
          const logoAssets = await getMediaAssetsByIds(employer.logo);
          const logo = logoAssets[0];
          response.website.logo = logo?.file?.[0]?.url || null;
          response.website.logo_id = logo?.id || null;
        } else {
          response.website.logo = null;
          response.website.logo_id = null;
        }

        // Header image (linked record - array with 1 ID)
        if (employer.header_image && employer.header_image.length > 0) {
          const headerAssets = await getMediaAssetsByIds(employer.header_image);
          const headerImage = headerAssets[0];
          response.website.header_image = headerImage?.file?.[0]?.url || null;
          response.website.header_image_id = headerImage?.id || null;
        } else {
          response.website.header_image = null;
          response.website.header_image_id = null;
        }

        // Gallery images (linked records - array with multiple IDs)
        if (employer.gallery && employer.gallery.length > 0) {
          const galleryAssets = await getMediaAssetsByIds(employer.gallery);
          response.website.gallery_images = galleryAssets.map((asset) => ({
            id: asset.id,
            url: asset.file?.[0]?.url || "",
          }));
        } else {
          response.website.gallery_images = [];
        }

        // Get FAQ items
        const faqItems = await getFAQByEmployerId(user.employer_id);
        response.website.faq = faqItems.map((item) => ({
          id: item.id,
          question: item.question,
          answer: item.answer,
          order: item.order,
        }));
      }
    }

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error("[Account GET] error:", getErrorMessage(error));
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to fetch account data" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/account
 * Updates account data for the logged-in user.
 * Accepts a body with section and data:
 * - section: "personal" | "company" | "billing" | "website"
 * - data: the fields to update
 * 
 * For FAQ updates:
 * - section: "faq"
 * - action: "create" | "update" | "delete"
 * - data: { id?, question?, answer?, order? }
 */
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { section, data, action } = body;
    const clientIP = getClientIP(request);

    if (!section) {
      return NextResponse.json({ error: "Section is required" }, { status: 400 });
    }

    // Get user from database
    const user = await getUserByEmail(session.user.email);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Handle personal data updates (Users table)
    if (section === "personal") {
      const updatedUser = await updateUser(user.id, {
        first_name: data.first_name,
        last_name: data.last_name,
        role: data.role,
      });

      // Log event
      await logEvent({
        event_type: "user_updated",
        actor_user_id: user.id,
        employer_id: user.employer_id || undefined,
        source: "web",
        ip_address: clientIP,
        payload: {
          section: "personal",
          updated_fields: Object.keys(data).filter((key) => data[key] !== undefined),
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          first_name: updatedUser.first_name || "",
          last_name: updatedUser.last_name || "",
          email: updatedUser.email,
          role: updatedUser.role || "",
        },
      });
    }

    // All other sections require an employer
    if (!user.employer_id) {
      return NextResponse.json(
        { error: "No employer linked to this account" },
        { status: 400 }
      );
    }

    // Handle company data updates (Employers table)
    if (section === "company") {
      const updatedEmployer = await updateEmployer(user.employer_id, {
        company_name: data.company_name,
        phone: data.phone,
        kvk: data.kvk,
        website_url: data.website_url,
      });

      // Log event
      await logEvent({
        event_type: "employer_updated",
        actor_user_id: user.id,
        employer_id: user.employer_id,
        source: "web",
        ip_address: clientIP,
        payload: {
          section: "company",
          updated_fields: Object.keys(data).filter((key) => data[key] !== undefined),
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          company_name: updatedEmployer.company_name || "",
          phone: updatedEmployer.phone || "",
          kvk: updatedEmployer.kvk || "",
          website_url: updatedEmployer.website_url || "",
        },
      });
    }

    // Handle billing data updates (Employers table)
    if (section === "billing") {
      const updatedEmployer = await updateEmployer(user.employer_id, {
        "reference-nr": data["reference-nr"],
        invoice_contact_name: data.invoice_contact_name,
        invoice_email: data.invoice_email,
        invoice_street: data.invoice_street,
        "invoice_house-nr": data["invoice_house-nr"],
        "invoice_house-nr-add": data["invoice_house-nr-add"],
        "invoice_postal-code": data["invoice_postal-code"],
        invoice_city: data.invoice_city,
        invoice_country: data.invoice_country,
      });

      // Log event
      await logEvent({
        event_type: "employer_updated",
        actor_user_id: user.id,
        employer_id: user.employer_id,
        source: "web",
        ip_address: clientIP,
        payload: {
          section: "billing",
          updated_fields: Object.keys(data).filter((key) => data[key] !== undefined),
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          "reference-nr": updatedEmployer["reference-nr"] || "",
          invoice_contact_name: updatedEmployer.invoice_contact_name || "",
          invoice_email: updatedEmployer.invoice_email || "",
          invoice_street: updatedEmployer.invoice_street || "",
          "invoice_house-nr": updatedEmployer["invoice_house-nr"] || "",
          "invoice_house-nr-add": updatedEmployer["invoice_house-nr-add"] || "",
          "invoice_postal-code": updatedEmployer["invoice_postal-code"] || "",
          invoice_city: updatedEmployer.invoice_city || "",
          invoice_country: updatedEmployer.invoice_country || "",
        },
      });
    }

    // Handle website/profile data updates (Employers table)
    if (section === "website") {
      const updatedEmployer = await updateEmployer(user.employer_id, {
        display_name: data.display_name,
        sector: data.sector,
        short_description: data.short_description,
        video_url: data.video_url,
      });

      // Log event
      await logEvent({
        event_type: "employer_updated",
        actor_user_id: user.id,
        employer_id: user.employer_id,
        source: "web",
        ip_address: clientIP,
        payload: {
          section: "website",
          updated_fields: Object.keys(data).filter((key) => data[key] !== undefined),
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          display_name: updatedEmployer.display_name || "",
          sector: updatedEmployer.sector || "",
          short_description: updatedEmployer.short_description || "",
          video_url: updatedEmployer.video_url || "",
        },
      });
    }

    // Handle FAQ updates
    if (section === "faq") {
      if (!action) {
        return NextResponse.json({ error: "Action is required for FAQ updates" }, { status: 400 });
      }

      if (action === "create") {
        const newFaq = await createFAQ({
          employer_id: user.employer_id,
          question: data.question,
          answer: data.answer,
          order: data.order,
        });

        await logEvent({
          event_type: "employer_updated",
          actor_user_id: user.id,
          employer_id: user.employer_id,
          source: "web",
          ip_address: clientIP,
          payload: { section: "faq", action: "create", faq_id: newFaq.id },
        });

        return NextResponse.json({
          success: true,
          data: {
            id: newFaq.id,
            question: newFaq.question,
            answer: newFaq.answer,
            order: newFaq.order,
          },
        });
      }

      if (action === "update") {
        if (!data.id) {
          return NextResponse.json({ error: "FAQ id is required for update" }, { status: 400 });
        }

        const updatedFaq = await updateFAQ(data.id, {
          question: data.question,
          answer: data.answer,
          order: data.order,
        });

        await logEvent({
          event_type: "employer_updated",
          actor_user_id: user.id,
          employer_id: user.employer_id,
          source: "web",
          ip_address: clientIP,
          payload: { section: "faq", action: "update", faq_id: data.id },
        });

        return NextResponse.json({
          success: true,
          data: {
            id: updatedFaq.id,
            question: updatedFaq.question,
            answer: updatedFaq.answer,
            order: updatedFaq.order,
          },
        });
      }

      if (action === "delete") {
        if (!data.id) {
          return NextResponse.json({ error: "FAQ id is required for delete" }, { status: 400 });
        }

        await deleteFAQ(data.id);

        await logEvent({
          event_type: "employer_updated",
          actor_user_id: user.id,
          employer_id: user.employer_id,
          source: "web",
          ip_address: clientIP,
          payload: { section: "faq", action: "delete", faq_id: data.id },
        });

        return NextResponse.json({ success: true });
      }

      return NextResponse.json({ error: "Invalid FAQ action" }, { status: 400 });
    }

    return NextResponse.json({ error: "Invalid section" }, { status: 400 });
  } catch (error: unknown) {
    console.error("[Account PATCH] error:", getErrorMessage(error));
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to update account data" },
      { status: 500 }
    );
  }
}
