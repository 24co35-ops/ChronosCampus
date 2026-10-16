"use client";
import React from "react";
import { ErrorBoundary } from "@/src/components/common/ErrorBoundary";
import { InputStudio } from "@/src/components/workspace/InputStudio";
import { EditableGrid } from "@/src/components/workspace/EditableGrid";
import { GanttTimeline } from "@/src/components/workspace/GanttTimeline";
import { ClashMatrix } from "@/src/components/workspace/ClashMatrix";
import { B2BSandbox } from "@/src/components/workspace/B2BSandbox";
import { Calendar, Shield, Sparkles, Cpu } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-6 py-3.5">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-slate-900">ChronosCampus</h1>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  PS-02 Solution
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Deterministic Notice Parser & Mathematical Clash Resolution Engine
              </p>
            </div>
          </div>

          {/* Quick Badges */}
          <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5 font-medium">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <span>Crash Firewall Active</span>
            </span>
            <span className="text-slate-300">·</span>
            <span className="flex items-center gap-1.5 font-medium">
              <Cpu className="w-3.5 h-3.5 text-indigo-500" />
              <span>Deterministic Time Math</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 flex flex-col gap-8">
        {/* Hero Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-xs font-semibold text-indigo-200 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
              <span>Notice Decoder · Indian Campus Context (DD/MM/YYYY)</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
              Transform Chaos into Structured, Conflict-Free Schedules
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Extract tests, lecture sessions, and deadlines with source-span traceability. Perform mathematical half-open interval collision audits and export sanitized RFC-5545 calendars in seconds.
            </p>
          </div>
        </div>

        {/* Protected Workspace guarded by ErrorBoundary */}
        <ErrorBoundary>
          {/* 1. Input Studio */}
          <InputStudio />

          {/* 2. Editable Grid with Undo/Redo & ICS Export */}
          <EditableGrid />

          {/* 3. Visual SVG Gantt Timeline */}
          <GanttTimeline />

          {/* 4. Pairwise Clash Matrix & Recommendations */}
          <ClashMatrix />

          {/* 5. Faculty Pre-Publish Sandbox */}
          <B2BSandbox />
        </ErrorBoundary>

        {/* Footer */}
        <footer className="mt-8 pt-6 border-t border-slate-200 text-center text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>ChronosCampus · PS-02 Notice Decoder & Schedule Resolver</span>
          <span>Next.js 16 App Router · TypeScript Strict · Tailwind CSS · Vitest</span>
        </footer>
      </div>
    </main>
  );
}
