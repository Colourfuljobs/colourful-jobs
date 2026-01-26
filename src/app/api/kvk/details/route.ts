import { NextResponse } from "next/server";
import { getKVKDetails } from "@/lib/kvk";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const kvkNumber = searchParams.get("kvk");

    if (!kvkNumber || kvkNumber.trim().length === 0) {
      return NextResponse.json(
        { error: "KVK nummer is verplicht" },
        { status: 400 }
      );
    }

    const details = await getKVKDetails(kvkNumber);
    
    if (!details) {
      return NextResponse.json(
        { error: "Bedrijf niet gevonden" },
        { status: 404 }
      );
    }

    return NextResponse.json({ details });
  } catch (error) {
    console.error("[KVK Details] Error:", error);
    
    // Check if it's a connection/timeout error
    const isConnectionError = 
      error instanceof Error && 
      (error.message.includes("fetch failed") || 
       error.message.includes("timeout") ||
       error.cause?.toString().includes("ConnectTimeoutError"));
    
    if (isConnectionError) {
      return NextResponse.json(
        { 
          error: "KVK API niet bereikbaar",
          code: "CONNECTION_ERROR"
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { 
        error: "Er ging iets mis bij het ophalen van de gegevens",
        code: "UNKNOWN_ERROR"
      },
      { status: 500 }
    );
  }
}
