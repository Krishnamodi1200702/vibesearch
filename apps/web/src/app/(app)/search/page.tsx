"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Film, X } from "lucide-react";
import Link from "next/link";
import SearchBar from "@/components/search/SearchBar";
import ResultGrid from "@/components/search/ResultGrid";
import { useSearch } from "@/hooks/useSearch";
import { useAppContext } from "../layout";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const videoIdParam = searchParams.get("videoId") || undefined;
  const { userId } = useAppContext();

  const {
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
  } = useSearch({ userId: userId || undefined, initialQuery, videoId: videoIdParam });

  // Update URL when search happens
  useEffect(() => {
    if (hasSearched && query) {
      const url = new URL(window.location.href);
      url.searchParams.set("q", query);
      if (videoId) url.searchParams.set("videoId", videoId);
      window.history.replaceState({}, "", url.toString());
    }
  }, [hasSearched, query, videoId]);

  return (
    <div>
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center mb-10"
      >
        <h1 className="font-display font-bold text-3xl sm:text-4xl mb-2">
          <span className="text-white">Find </span>
          <span className="gradient-text">any moment</span>
        </h1>
        <p className="text-sm text-white/30">
          Describe what you&apos;re looking for — we&apos;ll find the exact scene
        </p>
      </motion.div>

      {/* Video filter banner */}
      {videoId && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto mb-6"
        >
          <div className="glass rounded-xl px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-white/50">
              <Film className="w-4 h-4 text-accent-violet" />
              <span>Searching within a specific video</span>
            </div>
            <Link
              href="/search"
              className="flex items-center gap-1 text-xs text-accent-violet hover:text-accent-violet/80
                         transition-colors"
            >
              <X className="w-3 h-3" />
              Clear filter
            </Link>
          </div>
        </motion.div>
      )}

      {/* Search bar */}
      <SearchBar
        query={query}
        onQueryChange={setQuery}
        onSearch={executeSearch}
        suggestions={suggestions}
        isLoading={isLoading}
      />

      {/* Results */}
      <ResultGrid
        results={results}
        isLoading={isLoading}
        hasSearched={hasSearched}
        error={error}
        total={total}
        tookMs={tookMs}
        query={query}
        userId={userId || undefined}
        onFavoriteToggle={toggleFavorite}
      />
    </div>
  );
}
