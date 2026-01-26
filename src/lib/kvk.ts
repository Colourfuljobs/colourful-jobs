// KVK API Integration
// Zoeken API v2: https://api.kvk.nl/api/v2/zoeken
// Basisprofiel API v1: https://api.kvk.nl/api/v1/basisprofielen
// Documentation: https://developers.kvk.nl/nl/documentation/zoeken-api

export interface KVKSearchResult {
  kvkNumber: string;
  name: string;
  address: string;
  city: string;
  postalCode: string;
  type: "hoofdvestiging" | "nevenvestiging" | "rechtspersoon" | string;
  typeLabel: string;
}

export interface KVKDetails {
  kvkNumber: string;
  companyName: string;
  tradeNames: string[];
  address: {
    street: string; // Combined street + house number + addition
    postalCode: string;
    city: string;
  };
  email?: string;
  phone?: string;
  website?: string;
  vatNumber?: string;
}

// KVK API Response types
interface KVKZoekenResponse {
  resultaten: Array<{
    kvkNummer: string;
    naam: string;
    adres?: {
      binnenlandsAdres?: {
        straatnaam?: string;
        huisnummer?: number;
        huisletter?: string;
        huisnummerToevoeging?: string;
        postcode?: string;
        plaats?: string;
      };
      buitenlandsAdres?: {
        straatHuisnummer?: string;
        postcodeWoonplaats?: string;
        land?: string;
      };
    };
    type?: string;
    actief?: string;
  }>;
  pagina: number;
  resultatenPerPagina: number;
  totaal: number;
}

interface KVKBasisprofielResponse {
  kvkNummer: string;
  naam: string;
  handelsnamen?: Array<{ naam: string; volgorde?: number }>;
  _embedded?: {
    hoofdvestiging?: {
      vestigingsnummer: string;
      eersteHandelsnaam?: string;
      handelsnamen?: Array<{ naam: string; volgorde?: number }>;
      adressen?: Array<{
        type: string;
        straatnaam?: string;
        huisnummer?: number;
        huisnummerToevoeging?: string;
        huisletter?: string;
        postcode?: string;
        plaats?: string;
        land?: string;
      }>;
      websites?: string[];
    };
    eigenaar?: {
      rechtsvorm?: string;
      adressen?: Array<{
        type: string;
        straatnaam?: string;
        huisnummer?: number;
        huisnummerToevoeging?: string;
        huisletter?: string;
        postcode?: string;
        plaats?: string;
        land?: string;
      }>;
      websites?: string[];
    };
  };
}

/**
 * Get the KVK API key from environment
 */
function getApiKey(): string {
  const apiKey = process.env.KVK_API_KEY;
  if (!apiKey) {
    throw new Error("KVK_API_KEY is not configured");
  }
  return apiKey;
}

/**
 * Search for companies by name or KVK number using KVK Zoeken API v2
 * @see https://developers.kvk.nl/nl/documentation/zoeken-api
 */
export async function searchKVK(
  query: string,
  type: "name" | "number" = "name"
): Promise<KVKSearchResult[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const apiKey = getApiKey();
  const cleanQuery = query.trim();

  // Build URL based on search type
  const baseUrl = "https://api.kvk.nl/api/v2/zoeken";
  const params = new URLSearchParams();
  
  if (type === "number") {
    // Search by KVK number (only digits)
    const kvkNumber = cleanQuery.replace(/\D/g, "");
    if (kvkNumber.length !== 8) {
      return [];
    }
    params.set("kvkNummer", kvkNumber);
  } else {
    // Search by name
    params.set("naam", cleanQuery);
  }

  // Only search active registrations
  params.set("resultatenPerPagina", "10");

  const url = `${baseUrl}?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        "apikey": apiKey,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      console.error(`KVK API error: ${response.status} ${response.statusText}`);
      throw new Error(`KVK API error: ${response.statusText}`);
    }

    const data: KVKZoekenResponse = await response.json();

    if (!data.resultaten || data.resultaten.length === 0) {
      return [];
    }

    // Transform API response to KVKSearchResult[]
    return data.resultaten.map((item) => {
      const binnenlands = item.adres?.binnenlandsAdres;
      const buitenlands = item.adres?.buitenlandsAdres;

      let address = "";
      let city = "";
      let postalCode = "";

      if (binnenlands) {
        // Build address string from binnenlands adres
        const huisnummerStr = binnenlands.huisnummer?.toString() || "";
        const toevoeging = binnenlands.huisnummerToevoeging || binnenlands.huisletter || "";
        address = binnenlands.straatnaam
          ? `${binnenlands.straatnaam} ${huisnummerStr}${toevoeging}`.trim()
          : "";
        city = binnenlands.plaats || "";
        postalCode = binnenlands.postcode || "";
      } else if (buitenlands) {
        // Handle foreign addresses
        address = buitenlands.straatHuisnummer || "";
        city = buitenlands.postcodeWoonplaats || "";
        postalCode = "";
      }

      // Map type to Dutch label
      const typeLabels: Record<string, string> = {
        hoofdvestiging: "Hoofdvestiging",
        nevenvestiging: "Nevenvestiging",
        rechtspersoon: "Rechtspersoon",
      };
      const itemType = item.type || "onbekend";
      const typeLabel = typeLabels[itemType] || itemType;

      return {
        kvkNumber: item.kvkNummer,
        name: item.naam,
        address,
        city,
        postalCode,
        type: itemType,
        typeLabel,
      };
    });
  } catch (error) {
    console.error("Error searching KVK:", error);
    throw error;
  }
}

/**
 * Get full company details by KVK number using KVK Basisprofiel API v1
 * @see https://developers.kvk.nl/nl/documentation/basisprofiel-api
 */
export async function getKVKDetails(kvkNumber: string): Promise<KVKDetails | null> {
  const cleanKvk = kvkNumber.replace(/\D/g, "");
  
  if (cleanKvk.length !== 8) {
    return null;
  }

  const apiKey = getApiKey();
  const url = `https://api.kvk.nl/api/v1/basisprofielen/${cleanKvk}`;

  try {
    const response = await fetch(url, {
      headers: {
        "apikey": apiKey,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      console.error(`KVK API error: ${response.status} ${response.statusText}`);
      throw new Error(`KVK API error: ${response.statusText}`);
    }

    const data: KVKBasisprofielResponse = await response.json();
    
    // Get address from hoofdvestiging or eigenaar
    const hoofdvestiging = data._embedded?.hoofdvestiging;
    const eigenaar = data._embedded?.eigenaar;
    
    // Prefer bezoekadres, fallback to first address
    const adressen = hoofdvestiging?.adressen || eigenaar?.adressen || [];
    const adres = adressen.find((a) => a.type === "bezoekadres") || adressen[0];

    // Get trade names
    const handelsnamen = hoofdvestiging?.handelsnamen || data.handelsnamen || [];
    const tradeNames = handelsnamen.map((h) => h.naam);

    // Get website
    const websites = hoofdvestiging?.websites || eigenaar?.websites || [];
    const website = websites.length > 0 ? websites[0] : undefined;

    // Get company name
    const companyName = hoofdvestiging?.eersteHandelsnaam || data.naam;

    // Build combined street address (street + house number + addition)
    const streetParts = [
      adres?.straatnaam,
      adres?.huisnummer?.toString(),
      adres?.huisnummerToevoeging || adres?.huisletter,
    ].filter(Boolean);
    const combinedStreet = streetParts.join(" ");

    return {
      kvkNumber: data.kvkNummer,
      companyName,
      tradeNames,
      address: {
        street: combinedStreet,
        postalCode: adres?.postcode || "",
        city: adres?.plaats || "",
      },
      website,
      // Note: email and phone are not available in the Basisprofiel API
    };
  } catch (error) {
    console.error("Error getting KVK details:", error);
    throw error;
  }
}
