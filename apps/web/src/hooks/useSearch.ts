"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { SearchResponse, SearchResultItem } from "@/types";
import { search as apiSearch, getSuggestions } from "@/lib/api";

interface UseSearchOptions {
  userId?: string;
  initialQuery?: string;
  videoId?: string;
}

interface UseSearchReturn {
  query: string;
  setQuery: (q: string) => void;
  results: SearchResultItem[];
  total: number;
  tookMs: number;
  isLoading: boolean;
  error: string | null;
  suggestions: string[];
  hasSearched: boolean;
  executeSearch: (q?: string) => Promise<void>;
  toggleFavorite: (sceneId: string, favorited: boolean) => void;
  videoId?: string;
}

export function useSearch({ userId, initialQuery = "", videoId }: UseSearchOptions = {}): UseSearchReturn {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [total, setTotal] = useState(0);
  const [tookMs, setTookMs] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Load suggestions on mount
  useEffect(() => {
    let cancelled = false;
    getSuggestions()
      .then((data) => {
        if (!cancelled) setSuggestions(data.suggestions);
      })
      .catch(() => {
        if (!cancelled) {
          setSuggestions([
            "person walking on the beach at sunset",
            "close-up of hands cooking food",
            "city skyline at night with lights",
            "dog playing in a park",
            "rain falling on a window",
            "aerial drone shot of mountains",
          ]);
        }
      });
    return () => { cancelled = true; };
  }, []);

  // Auto-search if initialQuery is provided
  useEffect(() => {
    if (initialQuery) {
      executeSearch(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const executeSearch = useCallback(
    async (overrideQuery?: string) => {
      const q = (overrideQuery ?? query).trim();
      if (!q || q.length < 2) return;

      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      setIsLoading(true);
      setError(null);
      setQuery(q);

      try {
        const data: SearchResponse = await apiSearch(q, userId, 10, videoId);
        setResults(data.results);
        setTotal(data.total);
        setTookMs(data.took_ms);
        setHasSearched(true);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const message = err instanceof Error ? err.message : "Search failed";
        setError(message);
        setResults([]);
        setTotal(0);
      } finally {
        setIsLoading(false);
      }
    },
    [query, userId, videoId]
  );

  const toggleFavorite = useCallback((sceneId: string, favorited: boolean) => {
    setResults((prev) =>
      prev.map((r) =>
        r.scene_id === sceneId ? { ...r, is_favorited: favorited } : r
      )
    );
  }, []);

  return {
    query,
    setQuery,
    results,
    total,
    tookMs,
    isLoading,
    error,
    suggestions,
    hasSearched,
    executeSearch,
    toggleFavorite,
    videoId,
  };
}
