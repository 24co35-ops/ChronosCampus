"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  ArrowRight,
  Sparkles,
  Zap,
  RotateCcw,
} from "lucide-react";

interface LandingInteractivePreviewProps {
  onLaunchWithSample: () => void;
}

export function LandingInteractivePreview({ onLaunchWithSample }: LandingInteractivePreviewProps) {
  const [isResolved, setIsResolved] = useState(false);

  return (
    <div className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] shadow-xl overflow-hidden transition-all">
      {/* Top Bar with window controls & status */}
      <div className="px-4 py-3 border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          </div>
          <span className="text-xs font-mono font-medium text-zinc-500 dark:text-zinc-400 pl-2">
            engine-preview • PS-02 Circular AST
          </span>
        </div>

        {/* Live status badge & interactive toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsResolved(!isResolved)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition cursor-pointer border border-zinc-200/60 dark:border-zinc-700/60"
            title="Toggle between detected clash state and 1-click resolved state"
          >
            {isResolved ? (
              <>
                <RotateCcw className="w-3 h-3 text-zinc-500" />
                <span>Show Clash</span>
              </>
            ) : (
              <>
                <Zap className="w-3 h-3 text-amber-500" />
                <span>Simulate 1-Click Fix</span>
              </>
            )}
          </button>

          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold ${
              isResolved
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                : "bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20"
            }`}
          >
            {isResolved ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>100% Conflict-Free</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                <span>2 Schedule Clashes Detected</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Main Preview Grid */}
      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Input Snippet */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
              Raw Circular Text
            </span>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-medium">
              1.1ms deterministic parse
            </span>
          </div>

          <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 text-xs font-mono text-zinc-700 dark:text-zinc-300 leading-relaxed space-y-2">
            <p className="border-l-2 border-blue-500/80 pl-2">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">Internal Test 2</span> will be held on{" "}
              <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1 rounded">13 Nov 2026</span> from{" "}
              <span className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-1 rounded">10:00 AM to 11:30 AM</span> in{" "}
              <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1 rounded">Room 204</span>.
            </p>
            <p className="border-l-2 border-rose-500/80 pl-2">
              Submit lab records by{" "}
              <span className="bg-rose-500/10 text-rose-600 dark:text-rose-400 px-1 rounded">12:00 noon</span>.
            </p>
            <p className="border-l-2 border-purple-500/80 pl-2">
              Guest lecture on AI in Healthcare scheduled at{" "}
              <span className="bg-purple-500/10 text-purple-600 dark:text-purple-400 px-1 rounded">11:00 AM to 12:30 PM</span>.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={onLaunchWithSample}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-semibold transition cursor-pointer shadow-xs"
            >
              <span>Open in Full Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Parsed Events & Collision Resolution */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
              Live Interval Timeline (13 Nov 2026)
            </span>
            <span className="text-[10px] font-mono text-zinc-500">
              {isResolved ? "Gaps Verified (No Clashes)" : "Interval Overlap [11:00 - 11:30)"}
            </span>
          </div>

          <div className="space-y-2.5">
            {/* Event 1 */}
            <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <span className="w-2 h-8 rounded-full bg-blue-500 shrink-0" />
                <div>
                  <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    Internal Test 2
                  </h4>
                  <div className="flex items-center gap-3 text-[11px] text-zinc-500 mt-0.5 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      10:00 AM – 11:30 AM
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      Room 204
                    </span>
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 font-medium">
                EXAMINATION
              </span>
            </div>

            {/* Event 2 (Conflicted or Resolved) */}
            <div
              className={`p-3 rounded-xl border transition-all ${
                isResolved
                  ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/10"
                  : "border-red-500/40 bg-red-500/5 dark:bg-red-950/15"
              } flex items-center justify-between gap-3 shadow-2xs`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-2 h-8 rounded-full shrink-0 ${
                    isResolved ? "bg-emerald-500" : "bg-purple-500"
                  }`}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      Guest lecture: AI in Healthcare
                    </h4>
                    {isResolved ? (
                      <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                        AUTO-RESCHEDULED
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-red-500/20 text-red-600 dark:text-red-400">
                        OVERLAP (30m)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-zinc-500 mt-0.5 font-mono">
                    <span
                      className={`flex items-center gap-1 ${
                        isResolved ? "text-emerald-700 dark:text-emerald-300 font-bold" : "line-through text-red-600 dark:text-red-400"
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      {isResolved ? "12:30 PM – 2:00 PM" : "11:00 AM – 12:30 PM"}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      Seminar Hall
                    </span>
                  </div>
                </div>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-medium ${
                  isResolved
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "bg-red-500/10 text-red-600 dark:text-red-400"
                }`}
              >
                {isResolved ? "VERIFIED GAP" : "CLASH DETECTED"}
              </span>
            </div>

            {/* Event 3: Deadline */}
            <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <span className="w-2 h-8 rounded-full bg-rose-500 shrink-0" />
                <div>
                  <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    Lab record submission
                  </h4>
                  <div className="flex items-center gap-3 text-[11px] text-zinc-500 mt-0.5 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      12:00 PM (Sharp)
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      Department Office
                    </span>
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-300 font-medium">
                DEADLINE
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
