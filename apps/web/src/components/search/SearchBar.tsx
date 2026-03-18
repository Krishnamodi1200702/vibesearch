"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ArrowRight, Loader2, Sparkles } from "lucide-react";

interface SearchBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  onSearch: (q?: string) => void;
  suggestions: string[];
  isLoading: boolean;
}

export default function SearchBar({
  query,
  onQueryChange,
  onSearch,
  suggestions,
  isLoading,
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length >= 2) {
      onSearch();
      inputRef.current?.blur();
    }
  };

  const handleSuggestionClick = (s: string) => {
    onQueryChange(s);
    onSearch(s);
  };

  // Focus input on / key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Search input */}
      <form onSubmit={handleSubmit}>
        <motion.div
          animate={isFocused ? { scale: 1.01 } : { scale: 1 }}
          transition={{ duration: 0.2 }}
          className={`relative rounded-2xl transition-all duration-300 ${
            isFocused ? "glow-md" : ""
          }`}
        >
          <div className="relative flex items-center glass rounded-2xl overflow-hidden">
            <div className="flex items-center justify-center w-14 h-14 shrink-0">
              {isLoading ? (
                <Loader2 className="w-5 h-5 text-accent-violet animate-spin" />
              ) : (
                <Search className="w-5 h-5 text-white/30" />
              )}
            </div>

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Describe a moment… e.g. &quot;sunset over the ocean&quot;"
              className="flex-1 bg-transparent text-white placeholder:text-white/25
                         text-base font-body py-4 pr-4 outline-none"
              autoComplete="off"
              spellCheck={false}
            />

            {/* Clear button */}
            <AnimatePresence>
              {query.length > 0 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  type="button"
                  onClick={() => onQueryChange("")}
                  className="p-2 mr-1 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/60
                             transition-colors"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Submit button */}
            <motion.button
              type="submit"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={query.trim().length < 2 || isLoading}
              className="flex items-center justify-center w-10 h-10 mr-2 rounded-xl
                         bg-gradient-to-r from-accent-violet to-accent-coral
                         text-white disabled:opacity-30 disabled:cursor-not-allowed
                         transition-opacity"
            >
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </div>

          {/* Keyboard shortcut hint */}
          {!isFocused && query.length === 0 && (
            <div className="absolute right-16 top-1/2 -translate-y-1/2 pointer-events-none">
              <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono
                             text-white/15 border border-white/10 rounded-md">
                /
              </kbd>
            </div>
          )}
        </motion.div>
      </form>

      {/* Suggestion chips */}
      {suggestions.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-white/15 mr-1" />
          {suggestions.slice(0, 6).map((s, i) => (
            <motion.button
              key={s}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i, duration: 0.3 }}
              onClick={() => handleSuggestionClick(s)}
              className="px-3.5 py-1.5 text-xs font-medium rounded-full
                         bg-white/[0.04] border border-white/[0.06] text-white/35
                         hover:bg-accent-violet/10 hover:text-accent-violet hover:border-accent-violet/20
                         transition-all duration-200 cursor-pointer"
            >
              {s.length > 35 ? s.slice(0, 35) + "…" : s}
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
