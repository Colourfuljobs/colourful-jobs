import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { unstable_cache } from "next/cache";
import {
  getAllLookups,
  getEducationLevels,
  getFields,
  getFunctionTypes,
  getRegions,
  getSectors,
} from "@/lib/airtable";
import { getErrorMessage, sortLookupWithOverigeLast } from "@/lib/utils";

const getCachedAllLookups = unstable_cache(
  async () => getAllLookups(),
  ["all-lookups"],
  { revalidate: 600 }
);

const getCachedEducationLevels = unstable_cache(
  async () => sortLookupWithOverigeLast(await getEducationLevels()),
  ["lookups-education-levels"],
  { revalidate: 600 }
);

const getCachedFields = unstable_cache(
  async () => sortLookupWithOverigeLast(await getFields()),
  ["lookups-fields"],
  { revalidate: 600 }
);

const getCachedFunctionTypes = unstable_cache(
  async () => sortLookupWithOverigeLast(await getFunctionTypes()),
  ["lookups-function-types"],
  { revalidate: 600 }
);

const getCachedRegions = unstable_cache(
  async () => sortLookupWithOverigeLast(await getRegions()),
  ["lookups-regions"],
  { revalidate: 600 }
);

const getCachedSectors = unstable_cache(
  async () => sortLookupWithOverigeLast(await getSectors()),
  ["lookups-sectors"],
  { revalidate: 600 }
);

/**
 * GET /api/lookups
 * Fetches lookup table values for vacancy forms
 * Query params:
 * - type: "all" | "education_levels" | "fields" | "function_types" | "regions" | "sectors"
 *   (comma-separated for multiple, e.g., "regions,sectors")
 */
export async function GET(request: Request) {
  try {
    // Verify user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    // Get type from query params
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all";

    // If "all", fetch everything at once (cached for 10 min)
    if (type === "all") {
      const lookups = await getCachedAllLookups();
      return NextResponse.json(lookups);
    }

    // Otherwise, parse comma-separated types and fetch only requested (all cached)
    const types = type.split(",").map((t) => t.trim());
    const result: Record<string, unknown> = {};

    const fetchPromises: Promise<void>[] = [];

    if (types.includes("education_levels")) {
      fetchPromises.push(
        getCachedEducationLevels().then((data) => {
          result.educationLevels = data;
        })
      );
    }
    if (types.includes("fields")) {
      fetchPromises.push(
        getCachedFields().then((data) => {
          result.fields = data;
        })
      );
    }
    if (types.includes("function_types")) {
      fetchPromises.push(
        getCachedFunctionTypes().then((data) => {
          result.functionTypes = data;
        })
      );
    }
    if (types.includes("regions")) {
      fetchPromises.push(
        getCachedRegions().then((data) => {
          result.regions = data;
        })
      );
    }
    if (types.includes("sectors")) {
      fetchPromises.push(
        getCachedSectors().then((data) => {
          result.sectors = data;
        })
      );
    }

    await Promise.all(fetchPromises);

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Error fetching lookups:", getErrorMessage(error));
    return NextResponse.json(
      { error: "Er ging iets mis bij het ophalen van lookup waarden" },
      { status: 500 }
    );
  }
}
