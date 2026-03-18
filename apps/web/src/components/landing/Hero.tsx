"use client";

import { motion } from "framer-motion";
import { Play, Zap, Search } from "lucide-react";
import AuthButton from "@/components/auth/AuthButton";

const floatingTags = [
  { text: '"sunset on a beach"', x: "10%", y: "20%", delay: 0 },
  { text: '"cooking close-up"', x: "75%", y: "15%", delay: 0.3 },
  { text: '"city lights at night"', x: "5%", y: "70%", delay: 0.6 },
  { text: '"dog playing fetch"', x: "80%", y: "65%", delay: 0.9 },
];

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden noise-bg">
      {/* Background glow layers */}
      <div className="absolute inset-0 bg-hero-glow" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px]
                      bg-gradient-radial from-accent-violet/10 via-transparent to-transparent blur-3xl" />
      <div className="absolute bottom-0 left-0 right-0 h-48
                      bg-gradient-to-t from-surface to-transparent" />

      {/* Floating query tags */}
      {floatingTags.map((tag, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8 + tag.delay, duration: 0.6 }}
          className="absolute hidden lg:block"
          style={{ left: tag.x, top: tag.y }}
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: "easeInOut" }}
            className="glass px-4 py-2 rounded-full text-sm font-mono text-white/50
                       border border-white/5"
          >
            {tag.text}
          </motion.div>
        </motion.div>
      ))}

      {/* Main content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center pt-32 pb-20">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm
                     font-medium text-accent-cyan mb-8"
        >
          <Zap className="w-3.5 h-3.5" />
          AI-powered semantic video search
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6 }}
          className="font-display font-extrabold text-5xl sm:text-6xl md:text-7xl lg:text-8xl
                     leading-[0.95] tracking-tight mb-6"
        >
          <span className="text-white">Search</span>
          <br />
          <span className="gradient-text">inside videos</span>
        </motion.h1>

        {/* Sub */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-lg sm:text-xl text-white/50 max-w-2xl mx-auto mb-10 text-balance font-body"
        >
          Describe a moment in plain English and find the exact scene across your
          video library. Powered by CLIP embeddings and vector search — no paid APIs, no keywords, pure semantic understanding.
        </motion.p>

        {/* CTA row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <AuthButton variant="hero" />

          <motion.a
            href="#how-it-works"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-2 px-6 py-4 text-base font-medium
                       rounded-2xl glass text-white/70 hover:text-white transition-colors"
          >
            <Play className="w-4 h-4" />
            See how it works
          </motion.a>
        </motion.div>

        {/* Fake search bar visual */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.7, duration: 0.7, ease: "easeOut" }}
          className="mt-16 max-w-2xl mx-auto"
        >
          <div className="relative glass rounded-2xl p-1.5 glow-md">
            <div className="flex items-center gap-3 bg-surface-raised rounded-xl px-5 py-4">
              <Search className="w-5 h-5 text-accent-violet" />
              <span className="text-white/30 text-base font-body">
                &quot;a person walking their dog at sunset near the ocean…&quot;
              </span>
            </div>
          </div>
          <p className="text-xs text-white/20 mt-3">
            Try natural language — describe what you see, not keywords
          </p>
        </motion.div>
      </div>
    </section>
  );
}
