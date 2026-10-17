"use client";

/**
 * PresenterCheatSheetModal.tsx — PS-02 Single-Key Live Pitch Cheat Sheet
 *
 * Renders:
 * 1. A tiny, toggleable '?' shortcut cheat-sheet pill in the bottom footer.
 * 2. An architectural, high-contrast modal dialog showcasing single-key shortcuts.
 */

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Keyboard,
  X,
  Sparkles,
  RefreshCw,
  Mail,
  Building2,
  ShieldCheck,
  Download,
  CheckCircle2,
} from "lucide-react";

export interface PresenterCheatSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
  onTriggerAction?: (key: string) => void;
}

export function PresenterCheatSheetModal({
  isOpen,
  onClose,
  onToggle,
  onTriggerAction,
}: PresenterCheatSheetModalProps) {
  const shortcuts = [
    {
      key: "1",
      label: "Load PS-02 Benchmark",
      desc: "Loads official notice, smoothly scrolls to Grid & Timeline, highlights 30m overlap",
      badge: "PS-02 Preset",
      badgeColor: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/25",
      icon: Sparkles,
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      key: "2",
      label: "1-Click Auto-Rescheduler",
      desc: "Shifts Guest Lecture to 12:30 PM free slot, flips all red clash badges to NO CLASH",
      badge: "Zero Clash",
      badgeColor: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25",
      icon: RefreshCw,
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      key: "3",
      label: "Escalation Drafter Modal",
      desc: "Opens 1-click coordinator outreach modal for WhatsApp & Email resolution",
      badge: "Outreach",
      badgeColor: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25",
      icon: Mail,
      iconColor: "text-amber-600 dark:text-amber-400",
    },
    {
      key: "4",
      label: "B2B Admin Validator",
      desc: "Switches to campus pre-publish validator, ERP license & unit economics view",
      badge: "Monetization",
      badgeColor: "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/25",
      icon: Building2,
      iconColor: "text-violet-600 dark:text-violet-400",
    },
    {
      key: "5",
      label: "Security & Red-Team Lab",
      desc: "Switches to adversarial prompt injection, ReDoS denial-of-service & RFC-5545 fuzzing lab",
      badge: "Security Core",
      badgeColor: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25",
      icon: ShieldCheck,
      iconColor: "text-rose-600 dark:text-rose-400",
    },
    {
      key: "E",
      label: "Export .ics Calendar",
      desc: "Downloads RFC-5545 calendar stream and triggers celebratory toast for judges",
      badge: "RFC-5545",
      badgeColor: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25",
      icon: Download,
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
  ];

  return (
    <>
      {/* ── Tiny Toggleable '?' Shortcut Cheat-Sheet Pill in Footer ────────── */}
      <div className="fixed bottom-4 left-4 z-40 print:hidden">
        <button
          id="presenter-shortcuts-toggle-pill"
          onClick={onToggle}
          title="Presenter Hotkeys (Press '?' anytime to toggle)"
          aria-label="Toggle presenter keyboard shortcuts cheat sheet"
          className="group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium shadow-sm hover:bg-zinc-800 dark:hover:bg-zinc-200 border border-zinc-800 dark:border-zinc-200 transition cursor-pointer active:scale-95"
        >
          <div className="w-4 h-4 rounded bg-white/20 dark:bg-zinc-900/20 flex items-center justify-center font-mono text-[10px] font-bold">
            ?
          </div>
          <span className="text-[11px] font-semibold">
            Pitch Hotkeys
          </span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.2 rounded bg-white/10 dark:bg-zinc-900/10 text-[9px] font-mono border border-white/20 dark:border-zinc-900/20">
            ?
          </kbd>
        </button>
      </div>

      {/* ── Modal Dialog ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <div
            id="presenter-shortcuts-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="presenter-hotkeys-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
            onClick={onClose}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="bg-white dark:bg-[#121215] rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-800 max-w-lg w-full overflow-hidden text-zinc-900 dark:text-zinc-100"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-zinc-50 dark:bg-zinc-900/60 p-4 sm:px-5 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-zinc-200/70 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300">
                    <Keyboard className="w-4 h-4" strokeWidth={1.75} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 id="presenter-hotkeys-title" className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        Live Pitch Presenter Hotkeys
                      </h3>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-medium bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                        3-Min Demo
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Single-key hotkeys for seamless judge evaluation
                    </p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  aria-label="Close shortcuts modal"
                  className="w-7 h-7 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-center transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Hotkey List */}
              <div className="p-3 sm:p-4 space-y-1.5 max-h-[60vh] overflow-y-auto">
                {shortcuts.map((sc) => {
                  const Icon = sc.icon;
                  return (
                    <div
                      key={sc.key}
                      onClick={() => {
                        if (onTriggerAction) onTriggerAction(sc.key);
                      }}
                      className="group flex items-start gap-3 p-2.5 rounded-lg border border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition cursor-pointer"
                    >
                      <kbd className="w-7 h-7 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center font-mono font-bold text-xs shrink-0 shadow-2xs group-hover:bg-zinc-900 group-hover:text-white dark:group-hover:bg-zinc-100 dark:group-hover:text-zinc-900 transition">
                        {sc.key}
                      </kbd>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                            <Icon className={`w-3.5 h-3.5 ${sc.iconColor}`} strokeWidth={1.75} />
                            {sc.label}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-medium border ${sc.badgeColor}`}
                          >
                            {sc.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">
                          {sc.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pro-Tip Footer */}
              <div className="bg-zinc-50 dark:bg-zinc-900/40 p-3 sm:px-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" strokeWidth={1.75} />
                  <span className="text-[11px]">
                    Disabled inside text inputs · <kbd className="font-mono bg-white dark:bg-zinc-800 px-1 rounded border border-zinc-300 dark:border-zinc-700 text-[10px]">Esc</kbd> to close
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className="px-2.5 py-1 rounded-md bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-[11px] font-medium transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
