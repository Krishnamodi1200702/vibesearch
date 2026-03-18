"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Search, Heart, Sparkles } from "lucide-react";
import AuthButton from "@/components/auth/AuthButton";

const appLinks = [
  { href: "/search", label: "Search", icon: Search },
  { href: "/favorites", label: "Saved", icon: Heart },
];

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 px-4 py-3"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between
                      glass rounded-2xl px-5 py-3">
        {/* Logo */}
        <Link href={session ? "/search" : "/"} className="flex items-center gap-2.5 group">
          <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-accent-violet to-accent-coral
                          flex items-center justify-center group-hover:shadow-lg
                          group-hover:shadow-accent-violet/30 transition-shadow">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight">
            <span className="text-white">Vibe</span>
            <span className="gradient-text">Search</span>
          </span>
        </Link>

        {/* App nav links (only when authenticated) */}
        {session && (
          <div className="hidden sm:flex items-center gap-1">
            {appLinks.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                    isActive
                      ? "bg-accent-violet/15 text-accent-violet"
                      : "text-white/50 hover:text-white/80 hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </div>
        )}

        {/* Auth */}
        <AuthButton />
      </div>
    </motion.nav>
  );
}
