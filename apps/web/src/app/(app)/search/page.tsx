"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import SearchBar from "@/components/search/SearchBar";
import ResultGrid from "@/components/search/ResultGrid";
import { useSearch } from "@/hooks/useSearch";
import { useAppContext } from "../layout";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
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
  } = useSearch({ userId: userId || undefined, initialQuery });

  // Update URL when search happens (without full navigation)
  useEffect(() => {
    if (hasSearched && query) {
      const url = new URL(window.location.href);
      url.searchParams.set("q", query);
      window.history.replaceState({}, "", url.toString());
    }
  }, [hasSearched, query]);

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
