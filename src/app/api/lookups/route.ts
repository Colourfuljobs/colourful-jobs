import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getAllLookups,
  getEducationLevels,
  getFields,
  getFunctionTypes,
  getRegions,
  getSectors,
} from "@/lib/airtable";
import { getErrorMessage } from "@/lib/utils";

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

    // If "all", fetch everything at once
    if (type === "all") {
      const lookups = await getAllLookups();
      return NextResponse.json(lookups);
    }

    // Otherwise, parse comma-separated types and fetch only requested
    const types = type.split(",").map((t) => t.trim());
    const result: Record<string, unknown> = {};

    const fetchPromises: Promise<void>[] = [];

    if (types.includes("education_levels")) {
      fetchPromises.push(
        getEducationLevels().then((data) => {
          result.educationLevels = data;
        })
      );
    }
    if (types.includes("fields")) {
      fetchPromises.push(
        getFields().then((data) => {
          result.fields = data;
        })
      );
    }
    if (types.includes("function_types")) {
      fetchPromises.push(
        getFunctionTypes().then((data) => {
          result.functionTypes = data;
        })
      );
    }
    if (types.includes("regions")) {
      fetchPromises.push(
        getRegions().then((data) => {
          result.regions = data;
        })
      );
    }
    if (types.includes("sectors")) {
      fetchPromises.push(
        getSectors().then((data) => {
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
