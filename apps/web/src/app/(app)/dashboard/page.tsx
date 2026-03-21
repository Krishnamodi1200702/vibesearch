"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Film, Layers, Search, Heart, Loader2, Upload, ArrowRight,
  TrendingUp, Sparkles, RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { getDashboardStats } from "@/lib/api";
import type { DashboardStats } from "@/types";
import { useAppContext } from "../layout";
import ProcessingBadge from "@/components/videos/ProcessingBadge";
import SearchHistoryList from "@/components/history/SearchHistoryList";

const statCards = [
  { key: "total_videos" as const, label: "Videos", icon: Film, gradient: "from-accent-violet to-accent-blue" },
  { key: "total_scenes" as const, label: "Scenes", icon: Layers, gradient: "from-accent-coral to-accent-pink" },
  { key: "total_searches" as const, label: "Searches", icon: Search, gradient: "from-accent-blue to-accent-cyan" },
  { key: "total_favorites" as const, label: "Favorites", icon: Heart, gradient: "from-accent-peach to-accent-coral" },
];

export default function DashboardPage() {
  const { userId } = useAppContext();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    getDashboardStats(userId)
      .then((data) => { if (!cancelled) setStats(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 text-accent-violet animate-spin" />
      </div>
    );
  }

  const isEmpty = !stats || (stats.total_videos === 0 && stats.total_searches === 0);

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-violet to-accent-coral
                          flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-3xl text-white">Dashboard</h1>
            <p className="text-sm text-white/30">Your VibeSearch overview</p>
          </div>
        </div>
      </motion.div>

      {/* Empty state */}
      {isEmpty && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl
                          bg-accent-violet/5 border border-accent-violet/10 mb-6">
            <Sparkles className="w-8 h-8 text-accent-violet/30" />
          </div>
          <h3 className="font-display font-semibold text-xl text-white/50 mb-3">
            Welcome to VibeSearch
          </h3>
          <p className="text-sm text-white/25 max-w-md mx-auto mb-8">
            Upload your first video to get started. We&apos;ll automatically index it
            so you can search for any moment using natural language.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/videos"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl
                         bg-gradient-to-r from-accent-violet to-accent-coral text-white
                         font-medium text-sm hover:shadow-lg hover:shadow-accent-violet/20 transition-all"
            >
              <Upload className="w-4 h-4" />
              Upload a Video
            </Link>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl
                         glass text-white/60 hover:text-white font-medium text-sm transition-all"
            >
              <Search className="w-4 h-4" />
              Try Search
            </Link>
          </div>
        </motion.div>
      )}

      {/* Stats grid */}
      {stats && !isEmpty && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {statCards.map((card, i) => {
              const Icon = card.icon;
              const value = stats[card.key];
              return (
                <motion.div
                  key={card.key}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.4 }}
                  className="glass rounded-2xl p-5"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient}
                                  flex items-center justify-center mb-3 shadow-lg`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="font-display font-bold text-3xl text-white">{value}</p>
                  <p className="text-xs text-white/30 mt-0.5">{card.label}</p>
                </motion.div>
              );
            })}
          </div>

          {/* Processing alert */}
          {stats.videos_processing > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass rounded-xl p-4 mb-8 flex items-center gap-3"
            >
              <RefreshCw className="w-4 h-4 text-accent-peach animate-spin shrink-0" />
              <p className="text-sm text-white/50">
                <span className="text-accent-peach font-medium">{stats.videos_processing}</span>{" "}
                video{stats.videos_processing > 1 ? "s" : ""} currently processing
              </p>
            </motion.div>
          )}

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent videos */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass rounded-2xl p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-semibold text-base text-white/70">Recent Videos</h3>
                <Link href="/videos" className="text-xs text-accent-violet hover:text-accent-violet/80
                                                flex items-center gap-1 transition-colors">
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              {stats.recent_videos.length === 0 ? (
                <p className="text-xs text-white/20 py-4 text-center">No videos yet</p>
              ) : (
                <div className="space-y-2">
                  {stats.recent_videos.map((v) => (
                    <Link
                      key={v.id}
                      href={v.status === "processed" ? `/videos/${v.id}` : "/videos"}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.03] transition-colors"
                    >
                      <Film className="w-4 h-4 text-white/15 shrink-0" />
                      <span className="text-sm text-white/50 truncate flex-1">{v.title}</span>
                      <ProcessingBadge status={v.status} size="sm" />
                    </Link>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Recent searches */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="glass rounded-2xl p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-semibold text-base text-white/70">Recent Searches</h3>
                <Link href="/history" className="text-xs text-accent-violet hover:text-accent-violet/80
                                                 flex items-center gap-1 transition-colors">
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              {stats.recent_searches.length === 0 ? (
                <p className="text-xs text-white/20 py-4 text-center">No searches yet</p>
              ) : (
                <SearchHistoryList items={stats.recent_searches} compact />
              )}
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}
