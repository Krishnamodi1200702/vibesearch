"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Play, Trash2, RefreshCw, Clock, Film, Eye } from "lucide-react";
import Link from "next/link";
import type { Video } from "@/types";
import Image from "next/image";
import { resolveMediaUrl } from "@/lib/api";
import { formatTimestamp } from "@/lib/utils";
import ProcessingBadge from "./ProcessingBadge";

interface VideoCardProps {
  video: Video;
  index: number;
  onDelete?: (id: string) => void;
  onReindex?: (id: string) => void;
}

export default function VideoCard({ video, index, onDelete, onReindex }: VideoCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [imgError, setImgError] = useState(false);

  const isReady = video.status === "processed";
  const isFailed = video.status === "failed";
  const isProcessing = video.status === "processing" || video.status === "uploaded";
  const thumbnailUrl = video.thumbnail_url ? resolveMediaUrl(video.thumbnail_url) : "";

  const handleDelete = () => {
    if (confirmDelete) {
      onDelete?.(video.id);
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35 }}
      className="group glass rounded-2xl overflow-hidden card-hover"
    >
      {/* Thumbnail / placeholder area */}
        <div className="relative h-36 bg-surface-overlay overflow-hidden">
          {isReady && thumbnailUrl && !imgError ? (
            <Image
              src={thumbnailUrl}
              alt={video.title}
              fill
              sizes="(max-width: 768px) 100vw, 400px"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              {isProcessing ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-accent-peach/10 flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 text-accent-peach animate-spin" />
                  </div>
                  <span className="text-[10px] font-mono text-white/20">Processing…</span>
                </div>
              ) : (
                <Film className="w-10 h-10 text-white/10" />
              )}
            </div>
          )}

          <div className="absolute top-3 left-3 z-10">
            <ProcessingBadge status={video.status} />
          </div>

          {isReady && (
            <Link
              href={`/videos/${video.id}`}
              className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                <Eye className="h-5 w-5 text-white" />
              </div>
            </Link>
          )}
        </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <h3 className="font-display font-semibold text-sm text-white leading-tight line-clamp-2">
          {video.title}
        </h3>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-white/25">
          {video.duration_seconds > 0 && (
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTimestamp(video.duration_seconds)}
            </span>
          )}
          {video.scene_count > 0 && (
            <span>{video.scene_count} scenes</span>
          )}
          <span>{new Date(video.created_at).toLocaleDateString()}</span>
        </div>

        {/* Error message */}
        {isFailed && video.processing_error && (
          <p className="text-[10px] text-accent-coral/60 line-clamp-2 border-l-2 border-accent-coral/20 pl-2">
            {video.processing_error}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          {isReady && (
            <Link
              href={`/videos/${video.id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-lg
                         bg-accent-violet/10 text-accent-violet hover:bg-accent-violet/20 transition-colors"
            >
              <Eye className="w-3 h-3" />
              View
            </Link>
          )}

          {(isFailed || isReady) && (
            <button
              onClick={() => onReindex?.(video.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-lg
                         bg-white/[0.04] text-white/40 hover:text-white/70 hover:bg-white/[0.08] transition-all"
            >
              <RefreshCw className="w-3 h-3" />
              Reindex
            </button>
          )}

          <button
            onClick={handleDelete}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-lg
                       transition-all ml-auto ${
                         confirmDelete
                           ? "bg-accent-coral/20 text-accent-coral"
                           : "bg-white/[0.04] text-white/25 hover:text-accent-coral hover:bg-accent-coral/10"
                       }`}
          >
            <Trash2 className="w-3 h-3" />
            {confirmDelete ? "Confirm" : "Delete"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
