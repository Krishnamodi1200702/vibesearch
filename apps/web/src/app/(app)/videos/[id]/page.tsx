"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Film, Loader2, ArrowLeft, Clock, Layers, Search,
  Play, ChevronRight, AlertCircle,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { getVideoDetail, API_BASE } from "@/lib/api";
import { formatTimestamp } from "@/lib/utils";
import type { VideoDetail, Scene } from "@/types";
import ProcessingBadge from "@/components/videos/ProcessingBadge";

export default function VideoDetailPage() {
  const params = useParams();
  const videoId = params.id as string;
  const [video, setVideo] = useState<VideoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeScene, setActiveScene] = useState<Scene | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoId) return;
    let cancelled = false;
    setLoading(true);
    getVideoDetail(videoId)
      .then((data) => { if (!cancelled) setVideo(data); })
      .catch((err) => { if (!cancelled) setError(err.message || "Failed to load video"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [videoId]);

  const jumpToScene = (scene: Scene) => {
    setActiveScene(scene);
    if (videoRef.current) {
      videoRef.current.currentTime = scene.start_time_sec;
      videoRef.current.play().catch(() => {});
    }
  };

  // Resolve video URL — if it starts with /static, prepend the API base
  const resolveUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith("/static")) {
      const apiBase = API_BASE.replace("/api", "");
      return `${apiBase}${url}`;
    }
    return url;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 text-accent-violet animate-spin" />
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-8 h-8 text-accent-coral/40 mx-auto mb-3" />
        <p className="text-sm text-white/40">{error || "Video not found"}</p>
        <Link href="/videos" className="text-xs text-accent-violet mt-3 inline-block hover:underline">
          Back to videos
        </Link>
      </div>
    );
  }

  const videoUrl = resolveUrl(video.file_url);
  const scenes = video.scenes || [];

  return (
    <div>
      {/* Back + header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <Link
          href="/videos"
          className="inline-flex items-center gap-1.5 text-xs text-white/30 hover:text-white/50
                     transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to videos
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-white mb-1">
              {video.title}
            </h1>
            {video.description && (
              <p className="text-sm text-white/35 mb-3">{video.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-white/25">
              <ProcessingBadge status={video.status} size="md" />
              {video.duration_seconds > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTimestamp(video.duration_seconds)}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Layers className="w-3 h-3" />
                {scenes.length} scenes
              </span>
            </div>
          </div>

          {video.status === "processed" && (
            <Link
              href={`/search?videoId=${video.id}`}
              className="flex items-center gap-2 px-4 py-2 rounded-xl
                         bg-accent-violet/10 text-accent-violet text-sm font-medium
                         hover:bg-accent-violet/20 transition-colors shrink-0"
            >
              <Search className="w-4 h-4" />
              Search in this video
            </Link>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video player */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2"
        >
          {videoUrl ? (
            <div className="glass rounded-2xl overflow-hidden">
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                playsInline
                className="w-full aspect-video bg-black"
                crossOrigin="anonymous"
              />
            </div>
          ) : (
            <div className="glass rounded-2xl aspect-video flex items-center justify-center">
              <Film className="w-12 h-12 text-white/10" />
            </div>
          )}

          {/* Active scene info */}
          {activeScene && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-3 glass rounded-xl p-3 flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-accent-violet/10 flex items-center justify-center">
                <Play className="w-3.5 h-3.5 text-accent-violet" />
              </div>
              <div>
                <p className="text-xs text-white/50">
                  Scene {activeScene.scene_index + 1}
                  <span className="text-white/20 mx-2">·</span>
                  {formatTimestamp(activeScene.start_time_sec)} – {formatTimestamp(activeScene.end_time_sec)}
                </p>
                {activeScene.transcript_text && (
                  <p className="text-[10px] text-white/25 mt-0.5 line-clamp-1">
                    {activeScene.transcript_text}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Scene list sidebar */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-4 max-h-[70vh] overflow-y-auto"
        >
          <h3 className="font-display font-semibold text-sm text-white/60 mb-4">
            Scenes ({scenes.length})
          </h3>

          {scenes.length === 0 ? (
            <p className="text-xs text-white/20 text-center py-8">
              {video.status === "processed" ? "No scenes extracted" : "Processing…"}
            </p>
          ) : (
            <div className="space-y-2">
              {scenes.map((scene) => {
                const isActive = activeScene?.id === scene.id;
                const thumb = scene.frames?.[0];
                const thumbUrl = thumb ? resolveUrl(thumb.frame_url) : null;

                return (
                  <button
                    key={scene.id}
                    onClick={() => jumpToScene(scene)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left
                               transition-all duration-200 ${
                                 isActive
                                   ? "bg-accent-violet/10 border border-accent-violet/20"
                                   : "hover:bg-white/[0.03] border border-transparent"
                               }`}
                  >
                    {/* Thumbnail */}
                    <div className="w-16 h-10 rounded-lg overflow-hidden bg-surface-overlay shrink-0 relative">
                      {thumbUrl ? (
                        <Image
                          src={thumbUrl}
                          alt={`Scene ${scene.scene_index + 1}`}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Film className="w-4 h-4 text-white/10" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white/50">
                        Scene {scene.scene_index + 1}
                      </p>
                      <p className="text-[10px] font-mono text-white/20 mt-0.5">
                        {formatTimestamp(scene.start_time_sec)} – {formatTimestamp(scene.end_time_sec)}
                      </p>
                    </div>

                    <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                      isActive ? "text-accent-violet" : "text-white/10"
                    }`} />
                  </button>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
