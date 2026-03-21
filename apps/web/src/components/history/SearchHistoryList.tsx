"use client";

import { motion } from "framer-motion";
import { Search, Clock, ArrowRight, Hash } from "lucide-react";
import Link from "next/link";
import type { SearchHistoryItem } from "@/types";

interface Props {
  items: SearchHistoryItem[];
  compact?: boolean;
}

export default function SearchHistoryList({ items, compact = false }: Props) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04, duration: 0.3 }}
        >
          <Link
            href={`/search?q=${encodeURIComponent(item.query_text)}`}
            className="group flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]
                       hover:bg-white/[0.04] hover:border-accent-violet/15 transition-all duration-200"
          >
            <div className="w-8 h-8 rounded-lg bg-accent-violet/8 flex items-center justify-center shrink-0
                            group-hover:bg-accent-violet/15 transition-colors">
              <Search className="w-3.5 h-3.5 text-accent-violet/60" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm text-white/60 truncate group-hover:text-white/80 transition-colors">
                {item.query_text}
              </p>
              {!compact && (
                <div className="flex items-center gap-3 mt-0.5 text-[10px] font-mono text-white/20">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {new Date(item.created_at).toLocaleDateString(undefined, {
                      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Hash className="w-2.5 h-2.5" />
                    {item.result_count} results
                  </span>
                </div>
              )}
            </div>

            <ArrowRight className="w-3.5 h-3.5 text-white/10 group-hover:text-accent-violet/50
                                   group-hover:translate-x-0.5 transition-all shrink-0" />
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
