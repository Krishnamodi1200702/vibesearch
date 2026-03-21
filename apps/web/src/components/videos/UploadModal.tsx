"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Film, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { uploadVideo } from "@/lib/api";

interface UploadModalProps {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

type UploadState = "idle" | "uploading" | "success" | "error";

export default function UploadModal({ userId, onClose, onSuccess }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith("video/")) {
      setErrorMsg("Please select a video file (MP4, MOV, WebM)");
      return;
    }
    if (f.size > 100 * 1024 * 1024) {
      setErrorMsg("File too large — maximum 100MB");
      return;
    }
    setFile(f);
    setErrorMsg("");
    if (!title) {
      setTitle(f.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " "));
    }
  }, [title]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleSubmit = async () => {
    if (!file || !title.trim() || !userId) return;

    setUploadState("uploading");
    setProgress(0);
    setErrorMsg("");

    try {
      await uploadVideo(file, title.trim(), userId, description.trim(), (pct) => {
        setProgress(pct);
      });
      setUploadState("success");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err) {
      setUploadState("error");
      setErrorMsg(err instanceof Error ? err.message : "Upload failed");
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="relative w-full max-w-lg glass rounded-3xl p-8 overflow-hidden"
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/5 text-white/30
                       hover:text-white/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-violet to-accent-blue
                            flex items-center justify-center">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-display font-bold text-xl text-white">Upload Video</h3>
              <p className="text-xs text-white/30">MP4, MOV, or WebM — max 100MB</p>
            </div>
          </div>

          {/* Drop zone */}
          {!file && uploadState === "idle" && (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer
                         transition-all duration-200 ${
                           isDragging
                             ? "border-accent-violet bg-accent-violet/5"
                             : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]"
                         }`}
            >
              <Film className="w-10 h-10 text-white/15 mx-auto mb-3" />
              <p className="text-sm text-white/40 mb-1">
                Drag & drop a video here, or <span className="text-accent-violet">browse</span>
              </p>
              <p className="text-[10px] text-white/20">MP4, MOV, WebM up to 100MB</p>
              <input
                ref={inputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/webm,video/x-msvideo"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>
          )}

          {/* File selected */}
          {file && uploadState === "idle" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <Film className="w-5 h-5 text-accent-violet shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/70 truncate">{file.name}</p>
                  <p className="text-[10px] text-white/25">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
                <button
                  onClick={() => { setFile(null); setTitle(""); }}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-white/20 hover:text-white/50"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/40 mb-1.5">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Give your video a name"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]
                             text-white text-sm placeholder:text-white/20 outline-none
                             focus:border-accent-violet/30 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/40 mb-1.5">
                  Description <span className="text-white/15">(optional)</span>
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What's in this video?"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]
                             text-white text-sm placeholder:text-white/20 outline-none
                             focus:border-accent-violet/30 transition-colors"
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={handleSubmit}
                disabled={!title.trim()}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl
                           bg-gradient-to-r from-accent-violet to-accent-coral text-white
                           font-medium text-sm disabled:opacity-30 disabled:cursor-not-allowed
                           transition-opacity"
              >
                <Upload className="w-4 h-4" />
                Upload & Process
              </motion.button>
            </div>
          )}

          {/* Uploading */}
          {uploadState === "uploading" && (
            <div className="py-6 text-center space-y-4">
              <Loader2 className="w-8 h-8 text-accent-violet animate-spin mx-auto" />
              <p className="text-sm text-white/50">Uploading… {progress}%</p>
              <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-accent-violet to-accent-coral rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: "easeOut" }}
                />
              </div>
              <p className="text-[10px] text-white/20">
                After upload, video will be automatically processed and indexed
              </p>
            </div>
          )}

          {/* Success */}
          {uploadState === "success" && (
            <div className="py-8 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-accent-cyan mx-auto" />
              <p className="text-sm text-white/60">Upload complete — processing started</p>
            </div>
          )}

          {/* Error */}
          {uploadState === "error" && (
            <div className="py-6 text-center space-y-4">
              <AlertCircle className="w-8 h-8 text-accent-coral mx-auto" />
              <p className="text-sm text-accent-coral/70">{errorMsg}</p>
              <button
                onClick={() => { setUploadState("idle"); setProgress(0); }}
                className="text-xs text-accent-violet hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {/* Error display for validation */}
          {errorMsg && uploadState === "idle" && (
            <p className="text-xs text-accent-coral/70 mt-3 text-center">{errorMsg}</p>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
