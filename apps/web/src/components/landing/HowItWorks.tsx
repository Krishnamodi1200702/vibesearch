"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Upload, Scissors, Brain, Search, Target } from "lucide-react";

const steps = [
  {
    icon: Upload,
    title: "Upload Video",
    description: "Feed short-form videos into the pipeline — we handle MP4, MOV, and more.",
    color: "from-accent-coral to-accent-peach",
    glow: "shadow-accent-coral/20",
  },
  {
    icon: Scissors,
    title: "Scene Extraction",
    description: "Automatically split into temporal scenes and extract representative keyframes.",
    color: "from-accent-pink to-accent-violet",
    glow: "shadow-accent-pink/20",
  },
  {
    icon: Brain,
    title: "CLIP Embedding",
    description: "Each scene is encoded into a 512-dim vector using OpenAI CLIP — capturing visual meaning.",
    color: "from-accent-violet to-accent-blue",
    glow: "shadow-accent-violet/20",
  },
  {
    icon: Search,
    title: "Semantic Search",
    description: "Your natural language query is encoded the same way, then matched via FAISS vector search.",
    color: "from-accent-blue to-accent-cyan",
    glow: "shadow-accent-blue/20",
  },
  {
    icon: Target,
    title: "Precise Results",
    description: "A local reranker refines the top matches — returning exact timestamps, thumbnails, and scores.",
    color: "from-accent-cyan to-accent-coral",
    glow: "shadow-accent-cyan/20",
  },
];

export default function HowItWorks() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="how-it-works" className="relative py-32 px-6" ref={ref}>
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <span className="text-sm font-mono text-accent-violet uppercase tracking-widest">
            The Pipeline
          </span>
          <h2 className="font-display font-bold text-4xl sm:text-5xl mt-4 mb-5">
            How <span className="gradient-text">VibeSearch</span> works
          </h2>
          <p className="text-white/40 text-lg max-w-xl mx-auto">
            From raw video to precise scene retrieval in five steps — all running
            locally with zero paid API dependencies.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {/* Connecting line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b
                          from-accent-violet/30 via-accent-blue/20 to-transparent
                          hidden lg:block" />

          <div className="space-y-16 lg:space-y-0 lg:grid lg:grid-cols-1 lg:gap-0">
            {steps.map((step, i) => {
              const Icon = step.icon;
              const isLeft = i % 2 === 0;

              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, x: isLeft ? -40 : 40 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.15 * i, duration: 0.6 }}
                  className={`relative lg:flex items-center ${
                    isLeft ? "lg:flex-row" : "lg:flex-row-reverse"
                  } gap-12 py-8`}
                >
                  {/* Content card */}
                  <div className={`flex-1 ${isLeft ? "lg:text-right" : "lg:text-left"}`}>
                    <div className={`inline-block glass rounded-2xl p-6 card-hover max-w-md
                                    ${isLeft ? "lg:ml-auto" : "lg:mr-auto"}`}>
                      <div className={`inline-flex items-center justify-center w-12 h-12
                                      rounded-xl bg-gradient-to-br ${step.color} mb-4
                                      shadow-lg ${step.glow}`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-display font-semibold text-xl text-white mb-2">
                        {step.title}
                      </h3>
                      <p className="text-white/40 text-sm leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  {/* Center dot */}
                  <div className="hidden lg:flex items-center justify-center w-12 shrink-0">
                    <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${step.color}
                                    ring-4 ring-surface shadow-lg ${step.glow}`} />
                  </div>

                  {/* Step number */}
                  <div className={`flex-1 hidden lg:block ${isLeft ? "lg:text-left" : "lg:text-right"}`}>
                    <span className="font-display font-bold text-7xl text-white/[0.03]">
                      0{i + 1}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
