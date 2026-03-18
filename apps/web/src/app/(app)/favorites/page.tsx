"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Search, Loader2, Trash2, Clock, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { listFavorites, removeFavorite } from "@/lib/api";
import { formatTimestamp } from "@/lib/utils";
import type { Favorite } from "@/types";
import { useAppContext } from "../layout";

export default function FavoritesPage() {
  const { userId } = useAppContext();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    setLoading(true);
    listFavorites(userId)
      .then((data) => {
        if (!cancelled) setFavorites(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Failed to load favorites");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [userId]);

  const handleRemove = useCallback(
    async (favoriteId: string) => {
      if (!userId) return;
      // Optimistic removal
      setFavorites((prev) => prev.filter((f) => f.id !== favoriteId));
      try {
        await removeFavorite(favoriteId, userId);
      } catch {
        // Refetch if delete failed
        listFavorites(userId).then(setFavorites).catch(() => {});
      }
    },
    [userId]
  );

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-accent-coral/10 flex items-center justify-center">
            <Heart className="w-5 h-5 text-accent-coral" />
          </div>
          <h1 className="font-display font-bold text-3xl text-white">Saved Moments</h1>
        </div>
        <p className="text-sm text-white/30 ml-[52px]">
          Your favorite scenes from past searches
        </p>
      </motion.div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-accent-violet animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
          <p className="text-sm text-accent-coral/60 mb-2">Couldn&apos;t load favorites</p>
          <p className="text-xs text-white/20">{error}</p>
        </motion.div>
      )}

      {/* Empty state */}
      {!loading && !error && favorites.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl
                          bg-white/[0.02] border border-white/[0.04] mb-6">
            <Heart className="w-8 h-8 text-white/10" />
          </div>
          <h3 className="font-display font-semibold text-xl text-white/40 mb-3">
            No saved moments yet
          </h3>
          <p className="text-sm text-white/20 max-w-sm mx-auto mb-8">
            When you find a scene you love, hit the heart icon to save it here for quick access.
          </p>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl
                       bg-gradient-to-r from-accent-violet to-accent-coral text-white
                       text-sm font-medium hover:shadow-lg hover:shadow-accent-violet/20
                       transition-all duration-200"
          >
            <Search className="w-4 h-4" />
            Start searching
          </Link>
        </motion.div>
      )}

      {/* Favorites grid */}
      {!loading && !error && favorites.length > 0 && (
        <>
          <p className="text-xs text-white/20 mb-6">
            {favorites.length} saved {favorites.length === 1 ? "moment" : "moments"}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            <AnimatePresence>
              {favorites.map((fav, i) => (
                <FavoriteCard
                  key={fav.id}
                  favorite={fav}
                  index={i}
                  onRemove={handleRemove}
                />
              ))}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Favorite Card ──────────────────────────────────────── */

function FavoriteCard({
  favorite,
  index,
  onRemove,
}: {
  favorite: Favorite;
  index: number;
  onRemove: (id: string) => void;
}) {
  const scene = favorite.scene;
  const video = favorite.video;
  const [imgError, setImgError] = useState(false);

  const thumbUrl = scene?.frames?.[0]?.frame_url;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.04, duration: 0.35 }}
      className="group glass rounded-2xl overflow-hidden card-hover"
    >
      {/* Thumbnail */}
      <div className="relative h-36 bg-surface-overlay overflow-hidden">
        {thumbUrl && !imgError ? (
          <Image
            src={thumbUrl}
            alt={video?.title || "Scene thumbnail"}
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Play className="w-8 h-8 text-white/10" />
          </div>
        )}

        {/* Remove button */}
        <button
          onClick={() => onRemove(favorite.id)}
          className="absolute top-3 right-3 p-2 rounded-xl bg-black/50 backdrop-blur-sm
                     text-white/40 hover:text-accent-coral hover:bg-black/70
                     opacity-0 group-hover:opacity-100 transition-all duration-200"
          title="Remove from favorites"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Info */}
      <div className="p-4 space-y-2.5">
        <h3 className="font-display font-semibold text-sm text-white leading-tight line-clamp-1">
          {video?.title || "Untitled video"}
        </h3>

        {scene && (
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md
                            bg-white/[0.04] border border-white/[0.06]">
              <Clock className="w-3 h-3 text-white/25" />
              <span className="text-[11px] font-mono text-white/40">
                {formatTimestamp(scene.start_time_sec)} – {formatTimestamp(scene.end_time_sec)}
              </span>
            </div>
            <span className="text-[10px] font-mono text-white/15">
              Scene {scene.scene_index + 1}
            </span>
          </div>
        )}

        {scene?.transcript_text && (
          <p className="text-xs text-white/20 italic line-clamp-2 border-l-2 border-white/5 pl-2.5">
            {scene.transcript_text}
          </p>
        )}

        <p className="text-[10px] text-white/10 font-mono">
          Saved {new Date(favorite.created_at).toLocaleDateString()}
        </p>
      </div>
    </motion.div>
  );
}
