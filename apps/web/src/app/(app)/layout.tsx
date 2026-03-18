"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import OnboardingModal from "@/components/onboarding/OnboardingModal";
import { getMe, completeOnboarding } from "@/lib/api";
import type { AuthResponse } from "@/types";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [userData, setUserData] = useState<AuthResponse | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  // Redirect unauthenticated users
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/");
    }
  }, [status, router]);

  // Fetch user data from backend once session is ready
  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.email) return;

    let cancelled = false;
    setLoading(true);

    getMe(session.user.email)
      .then((data) => {
        if (cancelled) return;
        setUserData(data);
        if (!data.onboarding.completed) {
          setShowOnboarding(true);
        }
      })
      .catch(() => {
        // Backend might not be reachable — continue without crashing
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [status, session?.user?.email]);

  const handleOnboardingComplete = useCallback(async () => {
    setShowOnboarding(false);
    if (userData?.user?.id) {
      try {
        await completeOnboarding(userData.user.id);
      } catch {
        // Non-critical — swallow
      }
    }
  }, [userData?.user?.id]);

  // Full-page loading spinner while checking auth
  if (status === "loading" || (status === "authenticated" && loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="w-8 h-8 text-accent-violet animate-spin" />
          <p className="text-sm text-white/25 font-body">Loading VibeSearch…</p>
        </motion.div>
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  return (
    <>
      <Navbar />

      {/* Onboarding overlay */}
      <AnimatePresence>
        {showOnboarding && <OnboardingModal onComplete={handleOnboardingComplete} />}
      </AnimatePresence>

      {/* Page content */}
      <main className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          {/* Inject userId into children via data attribute accessible from the page */}
          <AppContext.Provider value={{ userId: userData?.user?.id || null }}>
            {children}
          </AppContext.Provider>
        </div>
      </main>
    </>
  );
}

// Simple context for sharing userId with app pages
import { createContext, useContext } from "react";

interface AppContextValue {
  userId: string | null;
}

const AppContext = createContext<AppContextValue>({ userId: null });

export function useAppContext() {
  return useContext(AppContext);
}
