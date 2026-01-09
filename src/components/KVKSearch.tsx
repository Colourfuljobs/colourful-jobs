"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { searchKVK, type KVKSearchResult } from "@/lib/kvk";

interface KVKSearchProps {
  onSelect: (result: KVKSearchResult) => void;
  onSkip: () => void;
}

export function KVKSearch({ onSelect, onSkip }: KVKSearchProps) {
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState<"name" | "number">("name");
  const [results, setResults] = useState<KVKSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const performSearch = useCallback(async (searchQuery: string, type: "name" | "number") => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const searchResults = await searchKVK(searchQuery, type);
      setResults(searchResults);
    } catch (error) {
      console.error("Error searching KVK:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Clear previous timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      performSearch(query, searchType);
    }, 300);

    setDebounceTimer(timer);

    // Cleanup
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [query, searchType, performSearch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    // Auto-detect search type: if it's all digits, search by number
    if (/^\d+$/.test(value.replace(/\s/g, ""))) {
      setSearchType("number");
    } else {
      setSearchType("name");
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <label htmlFor="kvk-search" className="p-regular block mb-1">
          Zoek op bedrijfsnaam of KVK-nummer
        </label>
        <div className="flex gap-2">
          <Input
            id="kvk-search"
            type="text"
            placeholder={searchType === "number" ? "KVK-nummer (bijv. 12345678)" : "Bedrijfsnaam"}
            value={query}
            onChange={handleInputChange}
            className="flex-1"
          />
        </div>
        {loading && (
          <p className="p-small text-slate-500">Zoeken...</p>
        )}
      </div>

      {results.length > 0 && (
        <div className="space-y-2">
          <p className="p-small font-medium">Zoekresultaten:</p>
          <div className="space-y-2 max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2">
            {results.map((result) => (
              <button
                key={result.kvkNumber}
                onClick={() => onSelect(result)}
                className="w-full text-left p-3 rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-[#193DAB] transition-colors cursor-pointer"
              >
                <div className="font-medium p-regular">{result.name}</div>
                <div className="p-small text-slate-600">
                  KVK: {result.kvkNumber} • {result.address}, {result.postalCode} {result.city}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {query && results.length === 0 && !loading && (
        <p className="p-small text-slate-500">Geen resultaten gevonden</p>
      )}

      <div className="flex justify-between items-center pt-4">
        <button
          onClick={onSkip}
          className="p-regular text-[#1F2D58] underline hover:no-underline cursor-pointer"
        >
          Overslaan en handmatig invullen
        </button>
      </div>
    </div>
  );
}

