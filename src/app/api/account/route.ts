import { authOptions } from "@/lib/auth";
import {
  getUserByEmail,
  getEmployerById,
  getMediaAssetsByIds,
  getFAQByEmployerId,
  getWalletByEmployerId,
  getWalletForUser,
  getManagedEmployers,
  updateUser,
  updateEmployer,
  createFAQ,
  updateFAQ,
  deleteFAQ,
  getSectorById,
  getExpiringCredits,
  getCreditExpiryWarningDays,
} from "@/lib/airtable";
import { logEvent, getClientIP } from "@/lib/events";
import { triggerEmployerWebflowSync } from "@/lib/webflow-sync";
import { getErrorMessage, isProfileComplete } from "@/lib/utils";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

/**
 * GET /api/account
 * Fetches all account data for the logged-in user:
 * - Personal data (from Users table)
 * - Company data (from Employers table)
 * - Media assets (from Media Assets table)
 * - FAQ items (from FAQ table)
 * 
 * Performance optimized: runs independent Airtable calls in parallel
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user data (must be first - we need employer_id)
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
      },
      role_id: user.role_id || "employer", // Default to employer for existing users
      // Default profile status (will be overwritten if employer exists)
      profile_complete: false,
      profile_missing_fields: ["Weergavenaam", "Sector", "Logo"],
    };

    // Get wallet - handles both employer and intermediary users
    const wallet = await getWalletForUser(user);

    // For intermediaries, add managed employers and active employer
    if (user.role_id === "intermediary") {
      const managedEmployers = await getManagedEmployers(user.id);
      
      response.managed_employers = managedEmployers.map((employer) => ({
        id: employer.id,
        company_name: employer.company_name || "",
        display_name: employer.display_name || "",
        logo_url: employer.logo && employer.logo.length > 0 
          ? null // Will be fetched separately if needed
          : null,
      }));

      // Get active employer data if set
      if (user.active_employer) {
        const activeEmployer = await getEmployerById(user.active_employer);
        if (activeEmployer) {
          response.active_employer = {
            id: activeEmployer.id,
            company_name: activeEmployer.company_name || "",
            display_name: activeEmployer.display_name || "",
          };
        }
      } else {
        response.active_employer = null;
      }

      // Process wallet/credits for intermediary
      if (wallet) {
        // Intermediaries don't have credit expiry on their user wallet
        response.credits = {
          available: wallet.balance,
          total_purchased: wallet.total_purchased,
          total_spent: wallet.total_spent,
          expiring_soon: null,
        };
      } else {
        response.credits = {
          available: 0,
          total_purchased: 0,
          total_spent: 0,
          expiring_soon: null,
        };
      }

      // Intermediaries don't have profile completion requirements
      response.profile_complete = true;
      response.profile_missing_fields = [];

      // Intermediaries always have onboarding dismissed (no onboarding for intermediaries)
      response.onboarding_dismissed = true;

      // Don't return early - fall through to load employer data for active_employer
    }

    // After intermediary-specific setup, determine effective employer ID for data fetching
    const effectiveEmployerId = user.role_id === "intermediary" 
      ? user.active_employer 
      : user.employer_id;

    // Get employer data if user has an employer (or intermediary has active employer)
    if (effectiveEmployerId) {
      const employer = await getEmployerById(effectiveEmployerId);

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
          "invoice_postal-code": employer["invoice_postal-code"] || "",
          invoice_city: employer.invoice_city || "",
        };

        // Run all independent data fetches in parallel for better performance
        // This reduces ~6 sequential calls to 1 parallel batch
        const [
          sectorResult,
          logoAssets,
          headerAssets,
          galleryAssets,
          faqItems,
        ] = await Promise.all([
          // Sector lookup
          employer.sector && employer.sector.length > 0
            ? getSectorById(employer.sector[0])
            : Promise.resolve(null),
          // Logo media assets
          employer.logo && employer.logo.length > 0
            ? getMediaAssetsByIds(employer.logo)
            : Promise.resolve([]),
          // Header image media assets
          employer.header_image && employer.header_image.length > 0
            ? getMediaAssetsByIds(employer.header_image)
            : Promise.resolve([]),
          // Gallery media assets
          employer.gallery && employer.gallery.length > 0
            ? getMediaAssetsByIds(employer.gallery)
            : Promise.resolve([]),
          // FAQ items
          getFAQByEmployerId(effectiveEmployerId),
        ]);

        // Process sector
        const sectorName = sectorResult?.name || "";
        const sectorId = sectorResult?.id || null;

        // Process logo
        const logo = logoAssets[0];
        const logoUrl = logo?.file?.[0]?.url || null;
        const logoId = logo?.id || null;

        // Process header image
        const headerImage = headerAssets[0];
        const headerImageUrl = headerImage?.file?.[0]?.url || null;
        const headerImageId = headerImage?.id || null;

        // Build website response
        response.website = {
          display_name: employer.display_name || "",
          sector: sectorName,
          sector_id: sectorId,
          website_url: employer.website_url || "",
          short_description: employer.short_description || "",
          video_url: employer.video_url || "",
          logo: logoUrl,
          logo_id: logoId,
          header_image: headerImageUrl,
          header_image_id: headerImageId,
          gallery_images: galleryAssets.map((asset) => ({
            id: asset.id,
            url: asset.file?.[0]?.url || "",
          })),
          faq: faqItems.map((item) => ({
            id: item.id,
            question: item.question,
            answer: item.answer,
            order: item.order,
          })),
        };

        // Process wallet/credits
        // Only fetch employer-level wallet for regular users (intermediaries already have their wallet set)
        if (user.role_id !== "intermediary") {
          if (wallet) {
            // Get expiry warning days from product settings
            const warningDays = await getCreditExpiryWarningDays();
            
            // Check for credits expiring soon
            const expiringCredits = await getExpiringCredits(effectiveEmployerId, warningDays);
            
            response.credits = {
              available: wallet.balance,
              total_purchased: wallet.total_purchased,
              total_spent: wallet.total_spent,
              expiring_soon: expiringCredits.total > 0 ? {
                total: expiringCredits.total,
                days_until: expiringCredits.days_until,
                earliest_date: expiringCredits.earliest_date,
              } : null,
            };
          } else {
            response.credits = {
              available: 0,
              total_purchased: 0,
              total_spent: 0,
              expiring_soon: null,
            };
          }
        }

        // Check if employer profile is complete (only requires display_name, sector, logo)
        const profileStatus = isProfileComplete({
          display_name: employer.display_name,
          sector: sectorName || null,
          logo: logoUrl,
        });
        
        // Only override profile status for non-intermediaries
        if (user.role_id !== "intermediary") {
          response.profile_complete = profileStatus.complete;
          response.profile_missing_fields = profileStatus.missingFields;
        }
        
        // Onboarding checklist dismissed state (per employer)
        // For intermediaries, always true (set above), for regular users, check employer record
        if (user.role_id !== "intermediary") {
          response.onboarding_dismissed = employer.onboarding_dismissed || false;
        }
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
        },
      });
    }

    // All other sections require an employer
    // Determine effective employer ID
    const effectiveEmployerId = user.role_id === "intermediary" 
      ? user.active_employer 
      : user.employer_id;

    if (!effectiveEmployerId) {
      return NextResponse.json(
        { error: user.role_id === "intermediary" 
            ? "Selecteer eerst een werkgever" 
            : "No employer linked to this account" },
        { status: 400 }
      );
    }

    // Handle company data updates (Employers table)
    if (section === "company") {
      const updatedEmployer = await updateEmployer(effectiveEmployerId, {
        company_name: data.company_name,
        phone: data.phone,
        kvk: data.kvk,
      });

      // Log event
      await logEvent({
        event_type: "employer_updated",
        actor_user_id: user.id,
        employer_id: effectiveEmployerId,
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
        },
      });
    }

    // Handle billing data updates (Employers table)
    if (section === "billing") {
      const updatedEmployer = await updateEmployer(effectiveEmployerId, {
        "reference-nr": data["reference-nr"],
        invoice_contact_name: data.invoice_contact_name,
        invoice_email: data.invoice_email,
        invoice_street: data.invoice_street,
        "invoice_postal-code": data["invoice_postal-code"],
        invoice_city: data.invoice_city,
      });

      // Log event
      await logEvent({
        event_type: "employer_updated",
        actor_user_id: user.id,
        employer_id: effectiveEmployerId,
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
          "invoice_postal-code": updatedEmployer["invoice_postal-code"] || "",
          invoice_city: updatedEmployer.invoice_city || "",
        },
      });
    }

    // Handle website/profile data updates (Employers table)
    if (section === "website") {
      // Build update object with only provided fields
      const updateData: Record<string, any> = {};
      
      // Text fields
      if (data.display_name !== undefined) updateData.display_name = data.display_name;
      if (data.website_url !== undefined) updateData.website_url = data.website_url;
      if (data.short_description !== undefined) updateData.short_description = data.short_description;
      if (data.video_url !== undefined) updateData.video_url = data.video_url;
      
      // Linked record fields (arrays of IDs)
      // sector expects an array with 1 record ID, e.g., ["recABC123"]
      if (data.sector !== undefined) updateData.sector = data.sector;
      if (data.logo !== undefined) updateData.logo = data.logo;
      if (data.header_image !== undefined) updateData.header_image = data.header_image;
      if (data.gallery !== undefined) updateData.gallery = data.gallery;

      updateData.needs_webflow_sync = true;
      const updatedEmployer = await updateEmployer(effectiveEmployerId, updateData);

      // Log event
      await logEvent({
        event_type: "employer_updated",
        actor_user_id: user.id,
        employer_id: effectiveEmployerId,
        source: "web",
        ip_address: clientIP,
        payload: {
          section: "website",
          updated_fields: Object.keys(data).filter((key) => data[key] !== undefined),
        },
      });

      triggerEmployerWebflowSync(effectiveEmployerId);

      return NextResponse.json({
        success: true,
        data: {
          display_name: updatedEmployer.display_name || "",
          sector: updatedEmployer.sector || "",
          short_description: updatedEmployer.short_description || "",
          video_url: updatedEmployer.video_url || "",
          logo: updatedEmployer.logo || [],
          header_image: updatedEmployer.header_image || [],
          gallery: updatedEmployer.gallery || [],
        },
      });
    }

    // Handle onboarding settings updates (Employers table)
    if (section === "onboarding") {
      const updatedEmployer = await updateEmployer(effectiveEmployerId, {
        onboarding_dismissed: data.onboarding_dismissed,
      });

      // Log event
      await logEvent({
        event_type: "employer_updated",
        actor_user_id: user.id,
        employer_id: effectiveEmployerId,
        source: "web",
        ip_address: clientIP,
        payload: {
          section: "onboarding",
          onboarding_dismissed: data.onboarding_dismissed,
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          onboarding_dismissed: updatedEmployer.onboarding_dismissed || false,
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
          employer_id: effectiveEmployerId,
          question: data.question,
          answer: data.answer,
          order: data.order,
        });

        await updateEmployer(effectiveEmployerId, { needs_webflow_sync: true });

        await logEvent({
          event_type: "employer_updated",
          actor_user_id: user.id,
          employer_id: effectiveEmployerId,
          source: "web",
          ip_address: clientIP,
          payload: { section: "faq", action: "create", faq_id: newFaq.id },
        });

        triggerEmployerWebflowSync(effectiveEmployerId);

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

        await updateEmployer(effectiveEmployerId, { needs_webflow_sync: true });

        await logEvent({
          event_type: "employer_updated",
          actor_user_id: user.id,
          employer_id: effectiveEmployerId,
          source: "web",
          ip_address: clientIP,
          payload: { section: "faq", action: "update", faq_id: data.id },
        });

        triggerEmployerWebflowSync(effectiveEmployerId);

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

        await updateEmployer(effectiveEmployerId, { needs_webflow_sync: true });

        await logEvent({
          event_type: "employer_updated",
          actor_user_id: user.id,
          employer_id: effectiveEmployerId,
          source: "web",
          ip_address: clientIP,
          payload: { section: "faq", action: "delete", faq_id: data.id },
        });

        triggerEmployerWebflowSync(effectiveEmployerId);

        return NextResponse.json({ success: true });
      }

      // Reorder FAQ items by updating the linked field order on Employer
      if (action === "reorder") {
        if (!data.faqIds || !Array.isArray(data.faqIds)) {
          return NextResponse.json({ error: "faqIds array is required for reorder" }, { status: 400 });
        }

        // Update the employer's faq linked field with the new order
        await updateEmployer(effectiveEmployerId, {
          faq: data.faqIds,
          needs_webflow_sync: true,
        });

        await logEvent({
          event_type: "employer_updated",
          actor_user_id: user.id,
          employer_id: effectiveEmployerId,
          source: "web",
          ip_address: clientIP,
          payload: { section: "faq", action: "reorder", faq_order: data.faqIds },
        });

        triggerEmployerWebflowSync(effectiveEmployerId);

        return NextResponse.json({ success: true });
      }

      // Sync FAQ items - full sync that handles creates, updates, deletes, and reorder
      if (action === "sync") {
        if (!data.items || !Array.isArray(data.items)) {
          return NextResponse.json({ error: "items array is required for sync" }, { status: 400 });
        }

        // Get current FAQs from database
        const currentFaqs = await getFAQByEmployerId(effectiveEmployerId);
        const currentIds = new Set(currentFaqs.map(f => f.id));
        const incomingIds = new Set(
          data.items
            .filter((item: any) => item.id && !item.id.startsWith("temp-"))
            .map((item: any) => item.id)
        );

        const results: any[] = [];

        // Process each item
        for (let i = 0; i < data.items.length; i++) {
          const item = data.items[i];
          
          if (item.id && !item.id.startsWith("temp-")) {
            // Existing item - update if changed
            const current = currentFaqs.find(f => f.id === item.id);
            if (current && (current.question !== item.question || current.answer !== item.answer)) {
              const updated = await updateFAQ(item.id, { 
                question: item.question, 
                answer: item.answer 
              });
              results.push({ 
                id: updated.id, 
                question: updated.question, 
                answer: updated.answer, 
                order: i 
              });
            } else {
              // No changes, keep as is
              results.push({ 
                id: item.id, 
                question: item.question, 
                answer: item.answer, 
                order: i 
              });
            }
          } else {
            // New item - create
            const created = await createFAQ({
              employer_id: effectiveEmployerId,
              question: item.question,
              answer: item.answer,
              order: i,
            });
            results.push({ 
              id: created.id, 
              question: created.question, 
              answer: created.answer, 
              order: i 
            });
          }
        }

        // Delete items that are no longer in the list
        for (const currentId of currentIds) {
          if (!incomingIds.has(currentId)) {
            await deleteFAQ(currentId);
          }
        }

        // Update order on employer record
        await updateEmployer(effectiveEmployerId, {
          faq: results.map(r => r.id),
          needs_webflow_sync: true,
        });

        await logEvent({
          event_type: "employer_updated",
          actor_user_id: user.id,
          employer_id: effectiveEmployerId,
          source: "web",
          ip_address: clientIP,
          payload: { section: "faq", action: "sync", count: results.length },
        });

        triggerEmployerWebflowSync(effectiveEmployerId);

        return NextResponse.json({ success: true, data: results });
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
