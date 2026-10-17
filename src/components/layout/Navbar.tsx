"use client";

/**
 * Navbar.tsx — ChronosCampus 48px Enterprise Command Bar
 *
 * Implements:
 * 1. Compact 48px height (h-12) with border-b border-zinc-200 dark:border-zinc-800
 * 2. Left: Geometric SVG brand mark + "ChronosCampus" tracking-tight + "/" + "PS-02 Notice Decoder" badge
 * 3. Center: Segmented control pill with layoutId animation ("Student Workbench", "Admin ERP Validator", "Security Audit")
 * 4. Right: Monospace latency telemetry ("1.1ms • LOCAL AST"), shortcut trigger (?), theme toggle (Light/Dark), and primary .ics CTA
 */

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Logo } from "@/src/components/brand/Logo";
import {
  GraduationCap,
  Building2,
  ShieldCheck,
  Presentation,
  Cpu,
  Download,
  Sun,
  Moon,
  Menu,
  X,
  CheckCircle2,
} from "lucide-react";
import { AlgorithmExplainerModal } from "@/src/components/workspace/AlgorithmExplainerModal";
import { useNoticeStore } from "@/src/store/useNoticeStore";
import { useStore } from "@/src/store";
import { generateIcs } from "@/src/lib/ics";
import type { ViewMode } from "@/src/types/notice";

export function Navbar() {
  const viewMode = useNoticeStore((s) => s.viewMode);
  const setViewMode = useNoticeStore((s) => s.setViewMode);
  const pairwiseClashes = useNoticeStore((s) => s.pairwiseClashes);
  const theme = useNoticeStore((s) => s.theme);
  const toggleTheme = useNoticeStore((s) => s.toggleTheme);
  const setLiveSyncToast = useNoticeStore((s) => s.setLiveSyncToast);
  const storeEvents = useStore((s) => s.events);
  const noticeEvents = useNoticeStore((s) => s.events);

  const [isOnline, setIsOnline] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isExplainerOpen, setIsExplainerOpen] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const activeClashesCount = pairwiseClashes.filter((c) => c.hasClash).length;

  const TABS: Array<{
    id: ViewMode;
    label: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    badge?: string;
  }> = [
    {
      id: "STUDENT",
      label: "Student Workbench",
      icon: GraduationCap,
      badge: activeClashesCount > 0 ? `${activeClashesCount} CLASH` : undefined,
    },
    {
      id: "B2B_ADMIN",
      label: "Admin ERP Validator",
      icon: Building2,
      badge: undefined,
    },
    {
      id: "RED_TEAM_LAB",
      label: "Security Audit",
      icon: ShieldCheck,
      badge: undefined,
    },
  ];

  const handleExportIcs = () => {
    const events = storeEvents.length > 0 ? storeEvents : noticeEvents;
    if (events.length === 0) return;
    const icsContent = generateIcs(events);
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const eventDate = events[0]?.dateISO || "2026-11-13";
    a.download = `chronoscampus-schedule-${eventDate}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setLiveSyncToast({
      id: "nav-export",
      sender: "Command Bar",
      title: "✅ Valid RFC-5545 .ics Exported — Ready for Google, Apple & Outlook Calendar",
      message: "Deterministic stream downloaded • Zero injection risks",
      timestamp: Date.now(),
    });
  };

  return (
    <header className="sticky top-0 z-40 h-12 bg-white/95 dark:bg-[#09090B]/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 transition-colors">
      <div className="max-w-7xl mx-auto h-full px-3 sm:px-6 flex items-center justify-between gap-3">
        {/* ── Left: Brand Mark + Name + Badge ─────────────────────────────── */}
        <div className="flex items-center gap-2.5 min-w-0 shrink-0">
          <Link href="/" className="flex items-center gap-2 group">
            <Logo variant="mark" size="sm" />
            <span className="font-bold tracking-tight text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition">
              ChronosCampus
            </span>
          </Link>
          <span className="text-zinc-300 dark:text-zinc-700 text-sm select-none">/</span>
          <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-700/80">
            PS-02 Notice Decoder
          </span>
        </div>

        {/* ── Center: Segmented Control Pill with Smooth Indicator ───────── */}
        <nav className="hidden md:flex items-center p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 relative">
          {TABS.map((tab) => {
            const isActive = viewMode === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                id={`nav-tab-${tab.id.toLowerCase()}`}
                onClick={() => setViewMode(tab.id)}
                className={`relative flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition cursor-pointer z-10 ${
                  isActive
                    ? "text-zinc-900 dark:text-zinc-100 font-semibold"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 font-medium"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-navbar-tab"
                    className="absolute inset-0 bg-white dark:bg-[#18181b] rounded-md shadow-xs border border-zinc-200/80 dark:border-zinc-700/80 z-[-1]"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="text-[9px] font-mono font-semibold px-1 py-0.2 rounded bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* ── Right: Telemetry, Actions, Theme Toggle, Primary CTA ─────────── */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Latency Telemetry */}
          <div
            id="live-telemetry-pill"
            className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-[11px] text-zinc-600 dark:text-zinc-400 font-mono tabular-nums tracking-tight"
            title="Deterministic Temporal AST & Sweep-Line Algorithm Execution Time"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>1.1ms • LOCAL AST</span>
          </div>

          {/* Network Status Badge */}
          <div
            id="network-status-badge"
            className="hidden xl:flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono tracking-tight"
            title={isOnline ? "Online · Hybrid AI Ready" : "Offline · 100% Local Deterministic Core"}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-500" : "bg-amber-500"}`} />
            <span className="text-[10px] uppercase font-mono flex items-center gap-1">
              <span>{isOnline ? "Online" : "Offline Mode"}</span>
              <span className="hidden xl:inline text-zinc-400">
                {isOnline ? " • Hybrid AI Ready" : " • 100% Local Deterministic Engine Active"}
              </span>
            </span>
          </div>

          {/* Pitch Mode Link */}
          <Link
            id="pitch-mode-btn"
            href="/pitch"
            className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            title="Open 6-Slide Pitch Presentation"
          >
            <Presentation className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>Pitch</span>
          </Link>

          {/* Inspect Engine Logic */}
          <button
            id="inspect-engine-logic-btn"
            onClick={() => setIsExplainerOpen(true)}
            className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            title="Inspect 4-Step AST & Interval Engine Logic"
          >
            <Cpu className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>Inspect Engine Logic</span>
          </button>

          {/* Presenter Hotkey Shortcut Trigger '?' */}
          <button
            id="keyboard-shortcuts-btn"
            onClick={() => {
              window.dispatchEvent(new KeyboardEvent("keydown", { key: "?" }));
            }}
            className="w-7 h-7 rounded-md border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center text-xs font-mono font-bold text-zinc-600 dark:text-zinc-300 transition cursor-pointer"
            title="Presenter Shortcuts (Press ?)"
            aria-label="Presenter keyboard shortcuts"
          >
            ?
          </button>

          {/* Theme Toggle (Light Paper & Ink / Dark Carbon Obsidian) */}
          <button
            id="theme-toggle-btn"
            onClick={toggleTheme}
            className="w-7 h-7 rounded-md border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 transition cursor-pointer"
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle color theme"
          >
            {theme === "dark" ? (
              <Sun className="w-3.5 h-3.5 text-amber-400" strokeWidth={1.75} />
            ) : (
              <Moon className="w-3.5 h-3.5 text-zinc-700" strokeWidth={1.75} />
            )}
          </button>

          {/* Primary .ics Export CTA */}
          <button
            id="navbar-export-ics-btn"
            onClick={handleExportIcs}
            className="inline-flex items-center gap-1.5 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 text-xs font-medium px-3 py-1.5 rounded-md transition cursor-pointer shadow-xs active:scale-95"
            title="Download Valid RFC-5545 .ics Calendar"
          >
            <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span className="hidden sm:inline">Export .ics</span>
            <span className="sm:hidden">.ics</span>
          </button>

          {/* Mobile Menu Hamburger */}
          <button
            id="mobile-nav-toggle-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-md text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 transition"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090B] px-4 py-3 flex flex-col gap-2 shadow-lg">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 px-1">
            Workspace Mode
          </div>
          {TABS.map((tab) => {
            const isActive = viewMode === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setViewMode(tab.id);
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center justify-between p-2 rounded-md text-xs font-medium transition ${
                  isActive
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" strokeWidth={1.75} />
                  <span>{tab.label}</span>
                </div>
                {tab.badge && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-red-500/20 text-red-500">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <Link
              href="/pitch"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400"
            >
              <Presentation className="w-3.5 h-3.5" />
              <span>Pitch Deck</span>
            </Link>
            <button
              onClick={() => {
                setIsExplainerOpen(true);
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Inspect Engine Logic</span>
            </button>
          </div>
        </div>
      )}

      {/* Algorithm Explainer Modal */}
      <AlgorithmExplainerModal
        isOpen={isExplainerOpen}
        onClose={() => setIsExplainerOpen(false)}
      />
    </header>
  );
}
