"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Clock, Play, BarChart3, ChevronDown, ChevronUp } from "lucide-react";
import Image from "next/image";
import type { SearchResultItem } from "@/types";
import { formatTimestamp, formatScore } from "@/lib/utils";
import { addFavorite, removeFavoriteByScene, resolveMediaUrl } from "@/lib/api";
import VideoPreview from "./VideoPreview";

interface ResultCardProps {
  result: SearchResultItem;
  index: number;
  userId?: string;
  onFavoriteToggle?: (sceneId: string, favorited: boolean) => void;
}

export default function ResultCard({ result, index, userId, onFavoriteToggle }: ResultCardProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [isFavorited, setIsFavorited] = useState(result.is_favorited);
  const [favLoading, setFavLoading] = useState(false);
  const [imgErrors, setImgErrors] = useState<Set<number>>(new Set());

  const scoreColor =
    result.similarity_score > 0.85
      ? "from-accent-cyan to-accent-blue"
      : result.similarity_score > 0.7
        ? "from-accent-violet to-accent-blue"
        : "from-accent-peach to-accent-coral";

  const handleFavorite = useCallback(async () => {
    if (!userId || favLoading) return;
    setFavLoading(true);
    try {
      if (isFavorited) {
        await removeFavoriteByScene(result.scene_id, userId);
        setIsFavorited(false);
        onFavoriteToggle?.(result.scene_id, false);
      } else {
        await addFavorite(userId, result.scene_id);
        setIsFavorited(true);
        onFavoriteToggle?.(result.scene_id, true);
      }
    } catch {
      // Silently fail — UI already shows optimistic state
    } finally {
      setFavLoading(false);
    }
  }, [userId, isFavorited, result.scene_id, favLoading, onFavoriteToggle]);

  const handleImgError = (idx: number) => {
    setImgErrors((prev) => new Set(prev).add(idx));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: "easeOut" }}
      className="group glass rounded-2xl overflow-hidden card-hover"
    >
      {/* Thumbnail strip */}
      <div className="relative">
        <div className="flex gap-0.5 h-32 sm:h-36 overflow-hidden">
          {(result.thumbnails.length > 0 ? result.thumbnails.slice(0, 3) : [null, null, null]).map(
            (thumb, i) => (
              <div key={i} className="relative flex-1 bg-surface-overlay overflow-hidden">
                {thumb && !imgErrors.has(i) ? (
                  <Image
                    src={resolveMediaUrl(thumb)}
                    alt={`Scene ${result.scene_index + 1} frame ${i + 1}`}
                    fill
                    sizes="(max-width: 768px) 33vw, 200px"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={() => handleImgError(i)}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-surface-overlay">
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                      <Play className="w-3 h-3 text-white/20" />
                    </div>
                  </div>
                )}
              </div>
            )
          )}
        </div>

        {/* Rank badge */}
        <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/60
                        backdrop-blur-sm text-[10px] font-mono text-white/50">
          #{index + 1}
        </div>

        {/* Play preview overlay */}
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="absolute inset-0 flex items-center justify-center opacity-0
                     group-hover:opacity-100 transition-opacity duration-300 bg-black/30"
        >
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm
                          flex items-center justify-center">
            <Play className="w-5 h-5 text-white ml-0.5" />
          </div>
        </button>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-5 space-y-3">
        {/* Title + favorite */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display font-semibold text-base text-white leading-tight line-clamp-2">
            {result.video_title}
          </h3>
          <button
            onClick={handleFavorite}
            disabled={!userId || favLoading}
            className={`shrink-0 p-2 rounded-xl transition-all duration-200 ${
              isFavorited
                ? "bg-accent-coral/15 text-accent-coral"
                : "bg-white/[0.03] text-white/20 hover:text-accent-coral hover:bg-accent-coral/10"
            } ${!userId ? "opacity-30 cursor-not-allowed" : ""}`}
            title={isFavorited ? "Remove from favorites" : "Save to favorites"}
          >
            <Heart className={`w-4 h-4 ${isFavorited ? "fill-current" : ""}`} />
          </button>
        </div>

        {/* Meta badges */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Timestamp */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg
                          bg-white/[0.04] border border-white/[0.06]">
            <Clock className="w-3 h-3 text-white/30" />
            <span className="text-xs font-mono text-white/50">
              {formatTimestamp(result.start_time_sec)} – {formatTimestamp(result.end_time_sec)}
            </span>
          </div>

          {/* Score */}
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg
                          bg-gradient-to-r ${scoreColor} bg-opacity-10`}
               style={{ background: `linear-gradient(135deg, rgba(139,92,246,0.1), rgba(76,201,240,0.1))` }}>
            <BarChart3 className="w-3 h-3 text-accent-violet" />
            <span className="text-xs font-mono font-medium text-accent-violet">
              {formatScore(result.similarity_score)}
            </span>
          </div>

          {/* Scene index */}
          <span className="text-[10px] font-mono text-white/20 px-2 py-1">
            Scene {result.scene_index + 1}
          </span>
        </div>

        {/* Explanation */}
        <p className="text-sm text-white/35 leading-relaxed line-clamp-2">
          {result.match_explanation}
        </p>

        {/* Transcript snippet */}
        {result.transcript_text && (
          <p className="text-xs text-white/20 italic line-clamp-1 border-l-2 border-white/5 pl-3">
            {result.transcript_text}
          </p>
        )}

        {/* Preview toggle */}
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="flex items-center gap-1.5 text-xs font-medium text-accent-violet/70
                     hover:text-accent-violet transition-colors"
        >
          {showPreview ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              Hide preview
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              Show preview
            </>
          )}
        </button>
      </div>

      {/* Video preview (expandable) */}
      <AnimatePresence>
        {showPreview && (
          <div className="px-4 pb-4 sm:px-5 sm:pb-5">
            <VideoPreview
              videoUrl={result.video_url}
              startTime={result.start_time_sec}
              endTime={result.end_time_sec}
              onClose={() => setShowPreview(false)}
            />
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
