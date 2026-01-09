// TODO: Replace mock implementation with real KVK API when API key is available
// KVK API: https://api.kvk.nl/api/v1
// Environment variable: KVK_API_KEY

export interface KVKSearchResult {
  kvkNumber: string;
  name: string;
  address: string;
  city: string;
  postalCode: string;
}

export interface KVKDetails {
  kvkNumber: string;
  companyName: string;
  tradeNames: string[];
  address: {
    street: string;
    houseNumber: string;
    houseNumberAddition?: string;
    postalCode: string;
    city: string;
    country: string;
  };
  email?: string;
  phone?: string;
  website?: string;
  vatNumber?: string;
}

// Mock data for testing
const MOCK_COMPANIES: KVKDetails[] = [
  {
    kvkNumber: "12345678",
    companyName: "Tech Solutions B.V.",
    tradeNames: ["Tech Solutions"],
    address: {
      street: "Hoofdstraat",
      houseNumber: "123",
      houseNumberAddition: "A",
      postalCode: "1000 AA",
      city: "Amsterdam",
      country: "Nederland",
    },
    email: "info@techsolutions.nl",
    phone: "+31 20 1234567",
    website: "https://www.techsolutions.nl",
    vatNumber: "NL123456789B01",
  },
  {
    kvkNumber: "87654321",
    companyName: "Design Studio Amsterdam B.V.",
    tradeNames: ["Design Studio"],
    address: {
      street: "Keizersgracht",
      houseNumber: "456",
      postalCode: "1016 GD",
      city: "Amsterdam",
      country: "Nederland",
    },
    email: "hello@designstudio.nl",
    phone: "+31 20 7654321",
    website: "https://www.designstudio.nl",
  },
  {
    kvkNumber: "11223344",
    companyName: "Marketing Experts B.V.",
    tradeNames: ["Marketing Experts", "ME"],
    address: {
      street: "Kalverstraat",
      houseNumber: "789",
      postalCode: "1012 NX",
      city: "Amsterdam",
      country: "Nederland",
    },
    email: "contact@marketingexperts.nl",
    phone: "+31 20 1122334",
  },
];

/**
 * Search for companies by name or KVK number (MOCK IMPLEMENTATION)
 * TODO: Replace with real KVK API call when API key is available
 */
export async function searchKVK(
  query: string,
  type: "name" | "number" = "name"
): Promise<KVKSearchResult[]> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  if (!query || query.trim().length === 0) {
    return [];
  }

  const searchTerm = query.toLowerCase().trim();

  if (type === "number") {
    // Search by KVK number
    const company = MOCK_COMPANIES.find(
      (c) => c.kvkNumber === searchTerm.replace(/\D/g, "")
    );
    if (company) {
      return [
        {
          kvkNumber: company.kvkNumber,
          name: company.companyName,
          address: `${company.address.street} ${company.address.houseNumber}${company.address.houseNumberAddition || ""}`,
          city: company.address.city,
          postalCode: company.address.postalCode,
        },
      ];
    }
    return [];
  }

  // Search by name
  const results = MOCK_COMPANIES
    .filter((company) => {
      const nameMatch = company.companyName.toLowerCase().includes(searchTerm);
      const tradeNameMatch = company.tradeNames.some((tn) =>
        tn.toLowerCase().includes(searchTerm)
      );
      return nameMatch || tradeNameMatch;
    })
    .map((company) => ({
      kvkNumber: company.kvkNumber,
      name: company.companyName,
      address: `${company.address.street} ${company.address.houseNumber}${company.address.houseNumberAddition || ""}`,
      city: company.address.city,
      postalCode: company.address.postalCode,
    }));

  return results;
}

/**
 * Get full company details by KVK number (MOCK IMPLEMENTATION)
 * TODO: Replace with real KVK API call when API key is available
 */
export async function getKVKDetails(kvkNumber: string): Promise<KVKDetails | null> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 200));

  const cleanKvk = kvkNumber.replace(/\D/g, "");
  const company = MOCK_COMPANIES.find((c) => c.kvkNumber === cleanKvk);

  return company || null;
}

/**
 * Real KVK API implementation (to be used when API key is available)
 * 
 * Example implementation:
 * 
 * export async function searchKVK(
 *   query: string,
 *   type: "name" | "number" = "name"
 * ): Promise<KVKSearchResult[]> {
 *   const apiKey = process.env.KVK_API_KEY;
 *   if (!apiKey) {
 *     throw new Error("KVK API key not configured");
 *   }
 * 
 *   const baseUrl = process.env.KVK_API_URL || "https://api.kvk.nl/api/v1";
 *   const url = type === "number"
 *     ? `${baseUrl}/zoeken?kvkNummer=${encodeURIComponent(query)}`
 *     : `${baseUrl}/zoeken?naam=${encodeURIComponent(query)}`;
 * 
 *   const response = await fetch(url, {
 *     headers: {
 *       "apikey": apiKey,
 *     },
 *   });
 * 
 *   if (!response.ok) {
 *     throw new Error(`KVK API error: ${response.statusText}`);
 *   }
 * 
 *   const data = await response.json();
 *   // Transform API response to KVKSearchResult[]
 *   return data.resultaten?.map((item: any) => ({
 *     kvkNumber: item.kvkNummer,
 *     name: item.handelsnaam || item.naam,
 *     address: item.adres?.straat || "",
 *     city: item.adres?.plaats || "",
 *     postalCode: item.adres?.postcode || "",
 *   })) || [];
 * }
 */

