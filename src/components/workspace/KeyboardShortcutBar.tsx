"use client";

/**
 * KeyboardShortcutBar.tsx — Accessible Keyboard Navigation & Shortcut Helper
 *
 * Implements:
 * 1. Global keyboard event listeners:
 *    - Ctrl/Cmd + Z: Undo last edit
 *    - Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z: Redo edit
 *    - Ctrl/Cmd + E: Instant export clean RFC-5545 .ics file
 * 2. Visual accessible keyboard shortcut strip with kbd tags and ARIA hints
 * 3. Colorblind-safe legend with shapes + icons:
 *    - AlertTriangle (⚠️ Clash)
 *    - CheckCircle2 (✓ Safe)
 *    - Diamond (◆ Deadline)
 */

import React, { useEffect, useState } from "react";
import { useStore } from "@/src/store";
import { useNoticeStore } from "@/src/store/useNoticeStore";
import { generateIcs } from "@/src/lib/ics";
import {
  Keyboard,
  Undo2,
  Redo2,
  Download,
  AlertTriangle,
  CheckCircle2,
  Diamond,
  Eye,
  Check,
  Command,
  Code2,
  Rss,
} from "lucide-react";
import { RawIcsPreviewDrawer } from "./RawIcsPreviewDrawer";
import { WebcalModal } from "./WebcalModal";

export function KeyboardShortcutBar() {
  const storeEvents = useStore((s) => s.events);
  const noticeEvents = useNoticeStore((s) => s.events);
  const noticeUndo = useNoticeStore((s) => s.undo);
  const noticeRedo = useNoticeStore((s) => s.redo);
  const noticeClashes = useNoticeStore((s) => s.pairwiseClashes);
  const noticeRecommendations = useNoticeStore((s) => s.recommendations);

  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isWebcalOpen, setIsWebcalOpen] = useState(false);

  const events = storeEvents.length > 0 ? storeEvents : noticeEvents.map((e) => ({
    id: e.id,
    title: e.title,
    type: e.type,
    dateISO: e.dateISO,
    startTime: e.startTime,
    endTime: e.endTime,
    venue: e.venue || "TBD",
    audience: e.cohort,
    timeZone: "Asia/Kolkata",
    rawSource: "",
    sourceSpans: [],
    fieldStatus: {
      title: "matched" as const,
      type: "matched" as const,
      date: "matched" as const,
      startTime: "matched" as const,
      endTime: "matched" as const,
      venue: "matched" as const,
      audience: "matched" as const,
    },
    confirmed: true,
  }));

  const [activeShortcutNotice, setActiveShortcutNotice] = useState<string | null>(null);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsMac(/(Mac|iPhone|iPod|iPad)/i.test(navigator.platform || ""));
    }
  }, []);

  const triggerExport = () => {
    if (events.length === 0) return;
    const icsContent = generateIcs(events);
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const eventDate = events[0]?.dateISO || new Date().toISOString().slice(0, 10);
    a.download = `chronoscampus-schedule-${eventDate}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setActiveShortcutNotice("Exported .ics calendar!");
    setTimeout(() => setActiveShortcutNotice(null), 3000);
  };

  const triggerUndo = () => {
    const temporal = (useStore as any).temporal?.getState();
    if (temporal?.undo) {
      temporal.undo();
    } else {
      noticeUndo();
    }
    setActiveShortcutNotice("Undo edit");
    setTimeout(() => setActiveShortcutNotice(null), 2500);
  };

  const triggerRedo = () => {
    const temporal = (useStore as any).temporal?.getState();
    if (temporal?.redo) {
      temporal.redo();
    } else {
      noticeRedo();
    }
    setActiveShortcutNotice("Redo edit");
    setTimeout(() => setActiveShortcutNotice(null), 2500);
  };

  // Global keydown listeners for Ctrl/Cmd+Z, Ctrl/Cmd+Y, Ctrl/Cmd+E
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isModifier = e.ctrlKey || e.metaKey;
      if (!isModifier) return;

      const key = e.key.toLowerCase();

      // Undo: Ctrl/Cmd + Z (without Shift)
      if (key === "z" && !e.shiftKey) {
        // Only intercept if not inside a standard editable input that handles native text undo
        const target = e.target as HTMLElement | null;
        const isTextInput =
          target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");

        if (!isTextInput) {
          e.preventDefault();
          triggerUndo();
        }
      }

      // Redo: Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z
      if (key === "y" || (key === "z" && e.shiftKey)) {
        const target = e.target as HTMLElement | null;
        const isTextInput =
          target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");

        if (!isTextInput) {
          e.preventDefault();
          triggerRedo();
        }
      }

      // Export: Ctrl/Cmd + E
      if (key === "e") {
        e.preventDefault();
        triggerExport();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [events]);

  const modKey = isMac ? "⌘" : "Ctrl";

  return (
    <>
    <aside
      aria-label="Keyboard shortcuts and accessibility status guide"
      className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs"
    >
      {/* ── Left: Quick Keyboard Shortcuts Strip ───────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 font-bold shrink-0">
          <Keyboard className="w-4 h-4 text-indigo-600" />
          <span>Quick Shortcuts:</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Undo Shortcut */}
          <button
            onClick={triggerUndo}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-900 hover:bg-slate-100 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium transition cursor-pointer"
            title={`Press ${modKey}+Z to undo`}
            aria-label={`Undo edits (${modKey}+Z)`}
          >
            <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-300 font-mono text-[10px] font-bold text-slate-800 shadow-2xs">
              {modKey}+Z
            </kbd>
            <span className="text-[11px]">Undo</span>
          </button>

          {/* Redo Shortcut */}
          <button
            onClick={triggerRedo}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-900 hover:bg-slate-100 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium transition cursor-pointer"
            title={`Press ${modKey}+Y to redo`}
            aria-label={`Redo edits (${modKey}+Y)`}
          >
            <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-300 font-mono text-[10px] font-bold text-slate-800 shadow-2xs">
              {modKey}+Y
            </kbd>
            <span className="text-[11px]">Redo</span>
          </button>

          {/* Export ICS Shortcut */}
          <button
            onClick={triggerExport}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-medium transition cursor-pointer"
            title={`Press ${modKey}+E to export ICS`}
            aria-label={`Export .ics calendar (${modKey}+E)`}
          >
            <kbd className="px-1.5 py-0.5 rounded bg-white border border-emerald-300 font-mono text-[10px] font-bold text-emerald-900 shadow-2xs">
              {modKey}+E
            </kbd>
            <span className="text-[11px] font-semibold">Export .ics</span>
          </button>

          {/* Inspect Raw ICS Shortcut */}
          <button
            onClick={() => setIsInspectorOpen(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-900 hover:bg-slate-100 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium transition cursor-pointer"
            title="Inspect raw RFC-5545 calendar syntax and folding"
            aria-label="Inspect raw RFC-5545 calendar syntax"
          >
            <Code2 className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-[11px] font-semibold">Inspect .ics</span>
          </button>

          {/* Live Webcal Feed Shortcut */}
          <button
            onClick={() => setIsWebcalOpen(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-medium transition cursor-pointer"
            title="Live webcal:// auto-syncing calendar feed for Class Representatives"
            aria-label="Live webcal batch subscription feed"
          >
            <Rss className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-[11px] font-semibold">webcal:// Feed</span>
          </button>

          {/* Cell Tab Navigation Hint */}
          <span className="hidden lg:inline-flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400 pl-1">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-zinc-200 dark:border-zinc-800 font-mono text-[10px] text-slate-600">
              Tab
            </kbd>
            <span>Traverse cells</span>
          </span>
        </div>
      </div>

      {/* ── Active shortcut toast indicator ───────────────────────────────── */}
      {activeShortcutNotice && (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-200 text-[11px] font-bold animate-in fade-in duration-150">
          <Check className="w-3 h-3 text-indigo-600" />
          <span>{activeShortcutNotice}</span>
        </span>
      )}

      {/* ── Right: Colorblind-Safe Status Standards Legend ─────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400 text-[11px]">
          <Eye className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
          <span className="font-semibold">Colorblind-Safe:</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Clash Icon */}
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-semibold text-[10px]"
            title="Clash status is always paired with the AlertTriangle icon"
          >
            <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
            <span>Clash</span>
          </span>

          {/* Deadline Diamond */}
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-[10px]"
            title="Deadlines are always marked with a Diamond shape"
          >
            <Diamond className="w-3 h-3 text-rose-600 fill-rose-500/20 shrink-0" />
            <span>Deadline</span>
          </span>

          {/* Safe Icon */}
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold text-[10px]"
            title="Safe status is always paired with the CheckCircle2 icon"
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
            <span>Safe</span>
          </span>
        </div>
      </div>
    </aside>

    {/* ── RFC-5545 Raw .ics Inspector Drawer ────────────────────────────── */}
    <RawIcsPreviewDrawer
      isOpen={isInspectorOpen}
      onClose={() => setIsInspectorOpen(false)}
      events={events}
      clashes={noticeClashes}
      recommendations={noticeRecommendations}
    />
    {/* ── Live webcal:// Batch Subscription Modal ──────────────────────── */}
    <WebcalModal
      isOpen={isWebcalOpen}
      onClose={() => setIsWebcalOpen(false)}
      cohort={events[0]?.audience || "III-year CSE"}
    />
    </>
  );
}
