"use client";

import { Sparkles } from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative py-16 px-6 border-t border-surface-border">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-accent-violet to-accent-coral
                          flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-white" />
          </div>
          <span className="font-display font-bold text-sm">
            <span className="text-white/60">Vibe</span>
            <span className="text-white/40">Search</span>
          </span>
        </div>

        {/* Tech stack */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-white/20">
          <span>Next.js</span>
          <span className="text-white/10">·</span>
          <span>FastAPI</span>
          <span className="text-white/10">·</span>
          <span>CLIP</span>
          <span className="text-white/10">·</span>
          <span>FAISS</span>
          <span className="text-white/10">·</span>
          <span>Postgres</span>
        </div>

        {/* Copyright */}
        <p className="text-xs text-white/15">
          Built as a portfolio project · {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}
