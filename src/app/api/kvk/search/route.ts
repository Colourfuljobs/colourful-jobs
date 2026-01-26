import { NextResponse } from "next/server";
import { searchKVK } from "@/lib/kvk";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const type = (searchParams.get("type") as "name" | "number") || "name";

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ results: [] });
    }

    const results = await searchKVK(query, type);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("[KVK Search] Error:", error);
    
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
        error: "Er ging iets mis bij het zoeken",
        code: "UNKNOWN_ERROR"
      },
      { status: 500 }
    );
  }
}
