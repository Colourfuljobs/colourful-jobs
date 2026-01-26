"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { KVKSearchResult } from "@/lib/kvk";

interface KVKSearchProps {
  onSelect: (result: KVKSearchResult) => void;
  onSkip: () => void;
  onSearchStart?: () => void;
}

export function KVKSearch({ onSelect, onSkip, onSearchStart }: KVKSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KVKSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const performSearch = async () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return;
    }

    // Notify parent that search is starting (to clear any previous duplicate warnings)
    onSearchStart?.();

    // Auto-detect search type: if it's all digits, search by number
    const searchType = /^\d+$/.test(trimmedQuery.replace(/\s/g, "")) ? "number" : "name";

    setLoading(true);
    setApiError(null);
    setHasSearched(true);
    
    try {
      const response = await fetch(
        `/api/kvk/search?q=${encodeURIComponent(trimmedQuery)}&type=${searchType}`
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        // API returned an error
        if (data.code === "CONNECTION_ERROR") {
          setApiError("De KVK API is momenteel niet bereikbaar. Je kunt je bedrijfsgegevens handmatig invullen.");
        } else {
          setApiError("Er ging iets mis bij het zoeken. Probeer het later opnieuw of vul je gegevens handmatig in.");
        }
        setResults([]);
        return;
      }
      
      setResults(data.results || []);
    } catch (error) {
      console.error("Error searching KVK:", error);
      setApiError("Er ging iets mis bij het zoeken. Controleer je internetverbinding of vul je gegevens handmatig in.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && query.trim()) {
      e.preventDefault();
      performSearch();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    // Clear previous results when user starts typing again
    if (hasSearched) {
      setResults([]);
      setHasSearched(false);
      setApiError(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <label htmlFor="kvk-search" className="p-regular block mb-1 font-semibold">
          Zoek op bedrijfsnaam of KVK-nummer
        </label>
        <div className="flex gap-2">
          <Input
            id="kvk-search"
            type="text"
            placeholder="Bedrijfsnaam of KVK-nummer (bijv. 12345678)"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="flex-1"
          />
          <Button 
            onClick={performSearch} 
            disabled={!query.trim() || loading}
          >
            {loading ? (
              <Spinner className="size-4" />
            ) : (
              "Zoeken"
            )}
          </Button>
        </div>
        {loading && (
          <p className="p-small text-slate-500">Zoeken in KVK register...</p>
        )}
      </div>

      {/* API Error Alert */}
      {apiError && !loading && (
        <Alert className="bg-[#193DAB]/[0.12] border-none">
          <AlertDescription className="text-[#1F2D58]">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 9V13M12 17H12.01M12 3L2 21H22L12 3Z" stroke="#1F2D58" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="flex-1 text-left">
                <strong className="block mb-1">KVK API niet beschikbaar</strong>
                <p className="mb-3 text-sm">{apiError}</p>
                <Button onClick={onSkip} size="sm">
                  Handmatig invullen
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          <p className="p-small font-medium">Zoekresultaten:</p>
          <div className="space-y-2 max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2">
            {results.map((result, index) => (
              <button
                key={`${result.kvkNumber}-${result.type}-${index}`}
                onClick={() => onSelect(result)}
                className="w-full text-left p-3 rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-[#193DAB] transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium p-regular">{result.name}</div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 flex-shrink-0">
                    {result.typeLabel}
                  </span>
                </div>
                <div className="p-small text-slate-600">
                  KVK: {result.kvkNumber}
                  {(result.address || result.city) && (
                    <> • {result.address}{result.address && result.city ? ", " : ""}{result.postalCode} {result.city}</>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {hasSearched && results.length === 0 && !loading && !apiError && (
        <p className="p-small text-slate-500">Geen resultaten gevonden voor &quot;{query}&quot;</p>
      )}
    </div>
  );
}
