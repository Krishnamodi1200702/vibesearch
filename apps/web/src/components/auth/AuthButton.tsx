"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { LogIn, LogOut, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";

export default function AuthButton({ variant = "default" }: { variant?: "default" | "hero" }) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-full glass">
        <Loader2 className="w-4 h-4 animate-spin text-accent-violet" />
        <span className="text-sm text-white/60">Loading…</span>
      </div>
    );
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-3">
        {session.user.image && (
          <Image
            src={session.user.image}
            alt={session.user.name || "User"}
            width={32}
            height={32}
            className="rounded-full ring-2 ring-accent-violet/40"
          />
        )}
        <span className="text-sm font-medium text-white/80 hidden sm:block">
          {session.user.name?.split(" ")[0]}
        </span>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full
                     bg-white/5 hover:bg-white/10 border border-white/10
                     transition-all duration-200 text-white/60 hover:text-white"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    );
  }

  if (variant === "hero") {
    return (
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => signIn("google", { callbackUrl: "/search" })}
        className="group relative inline-flex items-center gap-3 px-8 py-4 text-lg font-display font-semibold
                   rounded-2xl text-white overflow-hidden transition-all duration-300"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-accent-violet via-accent-coral to-accent-pink
                        opacity-90 group-hover:opacity-100 transition-opacity" />
        <div className="absolute inset-0 bg-gradient-to-r from-accent-violet via-accent-coral to-accent-pink
                        opacity-0 group-hover:opacity-100 blur-xl transition-opacity" />
        <span className="relative z-10 flex items-center gap-3">
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" opacity="0.8"/>
            <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" opacity="0.6"/>
            <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" opacity="0.8"/>
          </svg>
          Sign in with Google
        </span>
      </motion.button>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => signIn("google", { callbackUrl: "/search" })}
      className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl
                 bg-gradient-to-r from-accent-violet to-accent-coral text-white
                 hover:shadow-lg hover:shadow-accent-violet/25 transition-all duration-200"
    >
      <LogIn className="w-4 h-4" />
      Sign in
    </motion.button>
  );
}
