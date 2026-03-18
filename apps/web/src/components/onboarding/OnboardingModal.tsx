"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Star, Clock, Sparkles, ChevronRight } from "lucide-react";

const slides = [
  {
    icon: Search,
    title: "Search with natural language",
    description:
      "Describe the moment you're looking for in plain English. VibeSearch understands visual meaning, not just keywords.",
    examples: ['"sunset over the ocean"', '"someone cooking pasta"', '"rain on a window"'],
    color: "from-accent-violet to-accent-blue",
  },
  {
    icon: Star,
    title: "Understand your results",
    description:
      "Each result card shows the matching scene with thumbnails, a timestamp range, similarity score, and an explanation of why it matched.",
    examples: ["Thumbnail strip → visual preview", "Score badge → match confidence", "Timestamp → exact position"],
    color: "from-accent-coral to-accent-pink",
  },
  {
    icon: Clock,
    title: "Preview & save moments",
    description:
      "Click any result to preview the video at the exact timestamp. Hit the heart icon to save your favorite moments for later.",
    examples: ["Click thumbnail → instant preview", "♥ button → save to favorites", "History → past searches"],
    color: "from-accent-cyan to-accent-blue",
  },
];

interface Props {
  onComplete: () => void;
}

export default function OnboardingModal({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const isLast = step === slides.length - 1;
  const slide = slides[step];
  const Icon = slide.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onComplete} />

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="relative w-full max-w-lg glass rounded-3xl p-8 overflow-hidden"
        >
          {/* Close */}
          <button
            onClick={onComplete}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/5 text-white/30
                       hover:text-white/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Welcome badge */}
          <div className="flex items-center gap-2 mb-6">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-violet/10
                            text-accent-violet text-xs font-mono">
              <Sparkles className="w-3 h-3" />
              Welcome to VibeSearch
            </div>
            <span className="text-xs text-white/20">
              {step + 1}/{slides.length}
            </span>
          </div>

          {/* Slide content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl
                              bg-gradient-to-br ${slide.color} mb-5 shadow-lg`}>
                <Icon className="w-7 h-7 text-white" />
              </div>

              <h3 className="font-display font-bold text-2xl text-white mb-3">
                {slide.title}
              </h3>
              <p className="text-white/45 text-sm leading-relaxed mb-6">
                {slide.description}
              </p>

              <div className="space-y-2">
                {slide.examples.map((ex, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03]
                               border border-white/5 text-sm text-white/50 font-mono"
                  >
                    <span className="text-accent-violet/60">→</span>
                    {ex}
                  </div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/5">
            {/* Progress dots */}
            <div className="flex gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={`w-2 h-2 rounded-full transition-all duration-200 ${
                    i === step ? "bg-accent-violet w-6" : "bg-white/15 hover:bg-white/25"
                  }`}
                />
              ))}
            </div>

            {/* Next / Get Started */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => (isLast ? onComplete() : setStep(step + 1))}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium
                         transition-all duration-200 ${
                           isLast
                             ? "bg-gradient-to-r from-accent-violet to-accent-coral text-white"
                             : "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white"
                         }`}
            >
              {isLast ? "Start searching" : "Next"}
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
