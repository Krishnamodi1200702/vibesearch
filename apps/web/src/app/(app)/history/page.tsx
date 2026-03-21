"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { History, Loader2, Inbox, Search } from "lucide-react";
import Link from "next/link";
import { getSearchHistory } from "@/lib/api";
import type { SearchHistoryItem } from "@/types";
import { useAppContext } from "../layout";
import SearchHistoryList from "@/components/history/SearchHistoryList";

export default function HistoryPage() {
  const { userId } = useAppContext();
  const [items, setItems] = useState<SearchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    getSearchHistory(userId, 50)
      .then((data) => { if (!cancelled) setItems(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId]);

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-peach to-accent-coral
                          flex items-center justify-center">
            <History className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-3xl text-white">Search History</h1>
            <p className="text-sm text-white/30">
              {items.length > 0 ? `${items.length} past searches` : "Your recent queries"}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-accent-violet animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && items.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl
                          bg-white/[0.02] border border-white/[0.04] mb-6">
            <Inbox className="w-8 h-8 text-white/10" />
          </div>
          <h3 className="font-display font-semibold text-xl text-white/40 mb-3">
            No search history
          </h3>
          <p className="text-sm text-white/20 max-w-sm mx-auto mb-8">
            Your searches will appear here so you can easily revisit past queries.
          </p>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl
                       bg-gradient-to-r from-accent-violet to-accent-coral text-white
                       font-medium text-sm"
          >
            <Search className="w-4 h-4" />
            Start searching
          </Link>
        </motion.div>
      )}

      {/* History list */}
      {!loading && items.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-2xl"
        >
          <SearchHistoryList items={items} />
        </motion.div>
      )}
    </div>
  );
}
