"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { resolveMediaUrl } from "@/lib/api";
import { Play, Pause, X, Volume2, VolumeX, AlertCircle } from "lucide-react";

interface VideoPreviewProps {
  videoUrl: string;
  startTime: number;
  endTime: number;
  onClose: () => void;
}

export default function VideoPreview({ videoUrl, startTime, endTime, onClose }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = startTime;

    const onTimeUpdate = () => {
      if (video.currentTime >= endTime) {
        video.pause();
        video.currentTime = startTime;
        setIsPlaying(false);
      }
      const elapsed = video.currentTime - startTime;
      const duration = endTime - startTime;
      setProgress(duration > 0 ? Math.min(elapsed / duration, 1) : 0);
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    return () => video.removeEventListener("timeupdate", onTimeUpdate);
  }, [startTime, endTime]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      if (video.currentTime >= endTime || video.currentTime < startTime) {
        video.currentTime = startTime;
      }
      video.play().catch(() => setHasError(true));
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  if (hasError) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative rounded-xl bg-surface-overlay border border-surface-border
                   overflow-hidden aspect-video flex flex-col items-center justify-center gap-3"
      >
        <AlertCircle className="w-8 h-8 text-white/20" />
        <p className="text-sm text-white/30">Preview unavailable for this video</p>
        <button
          onClick={onClose}
          className="text-xs text-accent-violet hover:text-accent-violet/80 transition-colors"
        >
          Dismiss
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="relative rounded-xl overflow-hidden bg-black"
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 z-20 p-1.5 rounded-full bg-black/60 backdrop-blur-sm
                   text-white/70 hover:text-white transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Video element */}
      <video
        ref={videoRef}
        src={resolveMediaUrl(videoUrl)}
        muted={isMuted}
        playsInline
        preload="metadata"
        onError={() => setHasError(true)}
        className="w-full aspect-video object-cover"
        crossOrigin="anonymous"
      />

      {/* Controls overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-3
                      bg-gradient-to-t from-black/80 via-black/40 to-transparent">
        {/* Progress bar */}
        <div className="w-full h-1 bg-white/10 rounded-full mb-3 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-accent-violet to-accent-coral rounded-full"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20
                         text-white transition-colors"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={toggleMute}
              className="p-1.5 rounded-full hover:bg-white/10 text-white/50
                         hover:text-white transition-colors"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          </div>

          <span className="text-[10px] font-mono text-white/40">
            Scene preview
          </span>
        </div>
      </div>
    </motion.div>
  );
}
