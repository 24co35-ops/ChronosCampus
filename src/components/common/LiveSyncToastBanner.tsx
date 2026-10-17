"use client";

import React, { useEffect } from "react";
import { useNoticeStore } from "@/src/store/useNoticeStore";
import { BellRing, CheckCircle2, AlertTriangle, ArrowRight, X } from "lucide-react";

export function LiveSyncToastBanner() {
  const liveSyncToast = useNoticeStore((s) => s.liveSyncToast);
  const dismissLiveSyncToast = useNoticeStore((s) => s.dismissLiveSyncToast);

  // Auto-dismiss after 9 seconds so it doesn't linger forever
  useEffect(() => {
    if (!liveSyncToast) return;
    const timer = setTimeout(() => {
      dismissLiveSyncToast();
    }, 9000);
    return () => clearTimeout(timer);
  }, [liveSyncToast, dismissLiveSyncToast]);

  if (!liveSyncToast) return null;

  const isResolved = liveSyncToast.title.includes("Clash Resolved") || liveSyncToast.title.includes("Live Department Update");

  const handleScrollToGantt = () => {
    const el = document.getElementById("visual-timeline-gantt-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div
      id="live-sync-broadcast-toast"
      role="alert"
      aria-live="assertive"
      className="fixed top-5 right-5 z-50 max-w-md w-[calc(100vw-2.5rem)] sm:w-full bg-slate-950/95 backdrop-blur-md text-white border-2 border-emerald-400 p-4 rounded-2xl shadow-2xl shadow-emerald-950/60 animate-in slide-in-from-top-6 duration-300 flex items-start gap-3.5"
    >
      <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0 border border-emerald-500/30">
        <BellRing className="w-5 h-5 animate-bounce" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-extrabold text-xs sm:text-sm text-emerald-300 flex items-center gap-1.5">
            <span>{liveSyncToast.title}</span>
          </h4>
          <button
            onClick={dismissLiveSyncToast}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-200 mt-1 leading-snug">
          {liveSyncToast.message}
        </p>

        <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-800 text-[10px]">
          <div className="flex items-center gap-1.5 text-slate-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Cross-Window Native Sync</span>
          </div>

          <button
            onClick={handleScrollToGantt}
            className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-bold transition cursor-pointer"
          >
            <span>View in Gantt</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
