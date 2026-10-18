"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Logo } from "@/src/components/brand/Logo";
import {
  Sun,
  Moon,
  ArrowRight,
  Menu,
  X,
  Presentation,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useNoticeStore } from "@/src/store/useNoticeStore";

interface LandingNavbarProps {
  onOpenApp: () => void;
}

export function LandingNavbar({ onOpenApp }: LandingNavbarProps) {
  const theme = useNoticeStore((s) => s.theme);
  const toggleTheme = useNoticeStore((s) => s.toggleTheme);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 h-14 bg-white/85 dark:bg-[#09090B]/85 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80 transition-colors">
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* Left: Brand */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Logo variant="mark" size="sm" />
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition">
                ChronosCampus
              </span>
            </div>
          </Link>
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-700/80">
            PS-02 Forge Realm
          </span>
        </div>

        {/* Center: Clean Nav Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          <a
            href="#features"
            className="hover:text-zinc-900 dark:hover:text-zinc-100 transition"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="hover:text-zinc-900 dark:hover:text-zinc-100 transition"
          >
            How It Works
          </a>
          <a
            href="#comparison"
            className="hover:text-zinc-900 dark:hover:text-zinc-100 transition"
          >
            Why Chronos
          </a>
          <a
            href="#pricing"
            className="hover:text-zinc-900 dark:hover:text-zinc-100 transition"
          >
            Pricing
          </a>
          <Link
            href="/pitch"
            className="inline-flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-100 transition"
          >
            <Presentation className="w-3.5 h-3.5 text-zinc-400" />
            <span>Pitch Deck</span>
          </Link>
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-lg border border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 flex items-center justify-center text-zinc-600 dark:text-zinc-300 transition cursor-pointer"
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle color theme"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-amber-400" strokeWidth={1.75} />
            ) : (
              <Moon className="w-4 h-4 text-zinc-700" strokeWidth={1.75} />
            )}
          </button>

          {/* Primary CTA */}
          <button
            id="landing-open-studio-btn"
            onClick={onOpenApp}
            className="inline-flex items-center gap-1.5 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 text-xs font-semibold px-3.5 py-1.5 rounded-lg transition cursor-pointer shadow-xs active:scale-95"
          >
            <span>Launch Studio</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 transition"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090B] px-4 py-4 flex flex-col gap-3 shadow-xl">
          <a
            href="#features"
            onClick={() => setMobileMenuOpen(false)}
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            How It Works
          </a>
          <a
            href="#comparison"
            onClick={() => setMobileMenuOpen(false)}
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            Why Chronos
          </a>
          <a
            href="#pricing"
            onClick={() => setMobileMenuOpen(false)}
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            Pricing
          </a>
          <Link
            href="/pitch"
            onClick={() => setMobileMenuOpen(false)}
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1.5"
          >
            <Presentation className="w-4 h-4 text-zinc-400" />
            <span>Pitch Deck</span>
          </Link>
          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenApp();
              }}
              className="w-full justify-center inline-flex items-center gap-1.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-semibold px-4 py-2.5 rounded-lg shadow-xs"
            >
              <span>Launch Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
