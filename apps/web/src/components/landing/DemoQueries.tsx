"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { signIn } from "next-auth/react";
import { ArrowRight, Sparkles } from "lucide-react";

const queries = [
  { text: "person walking on the beach at sunset", category: "Nature" },
  { text: "close-up of hands cooking food", category: "Cooking" },
  { text: "city skyline at night with lights", category: "Urban" },
  { text: "dog playing fetch in a park", category: "Animals" },
  { text: "rain falling on a window", category: "Mood" },
  { text: "aerial drone shot of mountains", category: "Adventure" },
];

export default function DemoQueries() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="relative py-32 px-6" ref={ref}>
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent-violet/[0.03] to-transparent" />

      <div className="relative max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-sm font-mono text-accent-cyan uppercase tracking-widest">
            Try It
          </span>
          <h2 className="font-display font-bold text-4xl sm:text-5xl mt-4 mb-5">
            Search for <span className="gradient-text-warm">any moment</span>
          </h2>
          <p className="text-white/40 text-lg max-w-lg mx-auto">
            Describe what you're looking for in plain English. No keywords, no tags — just meaning.
          </p>
        </motion.div>

        {/* Query grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {queries.map((q, i) => (
            <motion.button
              key={q.text}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.08 * i, duration: 0.5 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => signIn("google", { callbackUrl: `/search?q=${encodeURIComponent(q.text)}` })}
              className="group text-left glass rounded-2xl p-5 card-hover cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-[10px] font-mono uppercase tracking-wider
                               text-accent-violet/70 bg-accent-violet/10 px-2 py-0.5 rounded-full">
                  {q.category}
                </span>
                <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-accent-violet
                                      group-hover:translate-x-1 transition-all duration-200" />
              </div>
              <p className="text-white/70 text-sm font-medium leading-relaxed group-hover:text-white transition-colors">
                &ldquo;{q.text}&rdquo;
              </p>
            </motion.button>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="text-center mt-12"
        >
          <button
            onClick={() => signIn("google", { callbackUrl: "/search" })}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl
                       bg-white/5 hover:bg-white/10 border border-white/10
                       text-white/60 hover:text-white text-sm font-medium transition-all duration-200"
          >
            <Sparkles className="w-4 h-4" />
            Sign in to try these searches
          </button>
        </motion.div>
      </div>
    </section>
  );
}
