import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { 
  getActiveProductsByType,
  getActiveProductsByTypeAndRole,
  getUserByEmail,
  getAllActiveFeatures,
  ProductRecord,
  FeatureRecord 
} from "@/lib/airtable";
import { getErrorMessage } from "@/lib/utils";

// Extended product with populated features
export interface ProductWithFeatures extends ProductRecord {
  populatedFeatures: FeatureRecord[];
}

/**
 * GET /api/products
 * Fetches active products by type with role-based filtering
 * Query params:
 * - type: "credit_bundle" | "vacancy_package" | "upsell"
 * - includeFeatures: "true" to include populated feature data
 */
export async function GET(request: Request) {
  try {
    // Verify user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    // Get user to determine role
    const user = await getUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 });
    }

    const roleId = user.role_id || "employer"; // Default to employer for existing users

    // Get type from query params
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as ProductRecord["type"] | null;
    const includeFeatures = searchParams.get("includeFeatures") === "true";
    const availability = searchParams.get("availability") as "add-vacancy" | "boost-option" | null;

    if (!type || !["credit_bundle", "vacancy_package", "upsell"].includes(type)) {
      return NextResponse.json(
        { error: "Ongeldig product type" },
        { status: 400 }
      );
    }

    // Fetch products with role filtering
    let products = await getActiveProductsByTypeAndRole(type, roleId);

    // Filter by availability if specified
    if (availability) {
      products = products.filter(
        (p) => p.availability?.includes(availability)
      );
    }

    // If features are requested, fetch and populate them
    if (includeFeatures && (type === "vacancy_package" || type === "upsell")) {
      // Get all features at once (more efficient than per-product)
      const allFeatures = await getAllActiveFeatures();
      
      // Create a map of feature ID to feature
      const featureMap = new Map<string, FeatureRecord>();
      allFeatures.forEach((f) => featureMap.set(f.id, f));

      // Populate features for each product
      const productsWithFeatures: ProductWithFeatures[] = products.map((product) => {
        const populatedFeatures = (product.features || [])
          .map((featureId) => featureMap.get(featureId))
          .filter((f): f is FeatureRecord => f !== undefined)
          // Sort by category order then sort_order
          .sort((a, b) => {
            // Use Dutch category names as returned by Airtable
            const categoryOrder: Record<string, number> = { 
              "Altijd inbegrepen": 0, 
              "Extra boost": 1, 
              "Snel en in de spotlight": 2,
              "Upsell": 3
            };
            const catA = a.package_category ? (categoryOrder[a.package_category] ?? 99) : 99;
            const catB = b.package_category ? (categoryOrder[b.package_category] ?? 99) : 99;
            if (catA !== catB) return catA - catB;
            return (a.sort_order || 0) - (b.sort_order || 0);
          });

        return {
          ...product,
          populatedFeatures,
        };
      });

      return NextResponse.json({ products: productsWithFeatures });
    }

    return NextResponse.json({ products });
  } catch (error: unknown) {
    console.error("Error fetching products:", getErrorMessage(error));
    return NextResponse.json(
      { error: "Er ging iets mis bij het ophalen van producten" },
      { status: 500 }
    );
  }
}
