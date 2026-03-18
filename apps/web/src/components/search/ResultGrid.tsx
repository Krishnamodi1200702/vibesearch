"use client";

import { motion } from "framer-motion";
import { SearchX, Inbox, Zap } from "lucide-react";
import type { SearchResultItem } from "@/types";
import ResultCard from "./ResultCard";
import { ResultCardSkeleton } from "@/components/ui/Skeleton";

interface ResultGridProps {
  results: SearchResultItem[];
  isLoading: boolean;
  hasSearched: boolean;
  error: string | null;
  total: number;
  tookMs: number;
  query: string;
  userId?: string;
  onFavoriteToggle?: (sceneId: string, favorited: boolean) => void;
}

export default function ResultGrid({
  results,
  isLoading,
  hasSearched,
  error,
  total,
  tookMs,
  query,
  userId,
  onFavoriteToggle,
}: ResultGridProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="mt-10">
        <div className="flex items-center gap-2 mb-6">
          <div className="shimmer-bg h-5 w-48 rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <ResultCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-16 text-center"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl
                        bg-accent-coral/10 mb-5">
          <SearchX className="w-7 h-7 text-accent-coral/60" />
        </div>
        <h3 className="font-display font-semibold text-lg text-white/60 mb-2">
          Something went wrong
        </h3>
        <p className="text-sm text-white/30 max-w-md mx-auto">
          {error.includes("fetch") || error.includes("network")
            ? "Couldn't reach the search server. Make sure the backend is running."
            : error}
        </p>
      </motion.div>
    );
  }

  // Pre-search empty state (no query yet)
  if (!hasSearched) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-20 text-center"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl
                        bg-accent-violet/5 mb-5">
          <Zap className="w-7 h-7 text-accent-violet/30" />
        </div>
        <h3 className="font-display font-semibold text-lg text-white/30 mb-2">
          Search for any moment
        </h3>
        <p className="text-sm text-white/15 max-w-md mx-auto">
          Describe what you&apos;re looking for in plain English — try one of the suggestions above
        </p>
      </motion.div>
    );
  }

  // No results
  if (hasSearched && results.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-16 text-center"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl
                        bg-white/[0.03] mb-5">
          <Inbox className="w-7 h-7 text-white/15" />
        </div>
        <h3 className="font-display font-semibold text-lg text-white/50 mb-2">
          No scenes matched
        </h3>
        <p className="text-sm text-white/25 max-w-md mx-auto">
          No results for &ldquo;{query}&rdquo;. Try a broader description or different wording.
        </p>
      </motion.div>
    );
  }

  // Results
  return (
    <div className="mt-8">
      {/* Meta bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-between mb-6"
      >
        <p className="text-sm text-white/30">
          <span className="text-white/50 font-medium">{total}</span>{" "}
          {total === 1 ? "scene" : "scenes"} found for{" "}
          <span className="text-accent-violet/70">&ldquo;{query}&rdquo;</span>
        </p>
        <span className="text-xs font-mono text-white/15">
          {tookMs.toFixed(0)}ms
        </span>
      </motion.div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {results.map((result, i) => (
          <ResultCard
            key={result.scene_id}
            result={result}
            index={i}
            userId={userId}
            onFavoriteToggle={onFavoriteToggle}
          />
        ))}
      </div>
    </div>
  );
}
