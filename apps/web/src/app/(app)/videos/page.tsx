"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Film, Upload, Loader2, RefreshCw, Inbox } from "lucide-react";
import { listVideos, deleteVideo, reindexVideo } from "@/lib/api";
import type { Video } from "@/types";
import { useAppContext } from "../layout";
import VideoCard from "@/components/videos/VideoCard";
import UploadModal from "@/components/videos/UploadModal";

export default function VideosPage() {
  const { userId } = useAppContext();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  const fetchVideos = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await listVideos(userId);
      setVideos(data);
    } catch {
      // Silently handle
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // Auto-refresh while any video is processing
  useEffect(() => {
    const hasProcessing = videos.some(
      (v) => v.status === "processing" || v.status === "uploaded"
    );
    if (!hasProcessing) return;

    const interval = setInterval(fetchVideos, 5000);
    return () => clearInterval(interval);
  }, [videos, fetchVideos]);

  const handleDelete = useCallback(async (id: string) => {
    if (!userId) return;
    setVideos((prev) => prev.filter((v) => v.id !== id));
    try {
      await deleteVideo(id, userId);
    } catch {
      fetchVideos(); // Refetch on error
    }
  }, [userId, fetchVideos]);

  const handleReindex = useCallback(async (id: string) => {
    if (!userId) return;
    setVideos((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status: "uploaded", processing_error: null } : v))
    );
    try {
      await reindexVideo(id, userId);
    } catch {
      fetchVideos();
    }
  }, [userId, fetchVideos]);

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start sm:items-center justify-between gap-4 mb-10 flex-col sm:flex-row"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-blue to-accent-cyan
                          flex items-center justify-center">
            <Film className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-3xl text-white">My Videos</h1>
            <p className="text-sm text-white/30">
              {videos.length} video{videos.length !== 1 ? "s" : ""} in your library
            </p>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                     bg-gradient-to-r from-accent-violet to-accent-coral text-white
                     font-medium text-sm hover:shadow-lg hover:shadow-accent-violet/20 transition-all"
        >
          <Upload className="w-4 h-4" />
          Upload Video
        </motion.button>
      </motion.div>

      {/* Loading */}
      {loading && videos.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-accent-violet animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && videos.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl
                          bg-white/[0.02] border border-white/[0.04] mb-6">
            <Inbox className="w-8 h-8 text-white/10" />
          </div>
          <h3 className="font-display font-semibold text-xl text-white/40 mb-3">
            No videos yet
          </h3>
          <p className="text-sm text-white/20 max-w-sm mx-auto mb-8">
            Upload your first video and we&apos;ll automatically split it into scenes,
            extract frames, and make it searchable with AI.
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl
                       bg-gradient-to-r from-accent-violet to-accent-coral text-white
                       font-medium text-sm"
          >
            <Upload className="w-4 h-4" />
            Upload Your First Video
          </motion.button>
        </motion.div>
      )}

      {/* Video grid */}
      {videos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {videos.map((video, i) => (
            <VideoCard
              key={video.id}
              video={video}
              index={i}
              onDelete={handleDelete}
              onReindex={handleReindex}
            />
          ))}
        </div>
      )}

      {/* Refresh hint */}
      {videos.some((v) => v.status === "processing" || v.status === "uploaded") && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center mt-6"
        >
          <p className="text-xs text-white/15 inline-flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Auto-refreshing while videos are processing…
          </p>
        </motion.div>
      )}

      {/* Upload modal */}
      <AnimatePresence>
        {showUpload && userId && (
          <UploadModal
            userId={userId}
            onClose={() => setShowUpload(false)}
            onSuccess={fetchVideos}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
