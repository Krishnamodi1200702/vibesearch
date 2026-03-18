import type { Metadata } from "next";
import Providers from "@/components/auth/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "VibeSearch — AI Video Moment Search",
  description:
    "Find specific moments inside videos using natural language. AI-powered semantic search for short-form video content.",
  openGraph: {
    title: "VibeSearch",
    description: "AI-powered video moment search engine",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-surface text-white font-body antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
