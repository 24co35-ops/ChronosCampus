"use client";

import React from "react";
import Link from "next/link";
import { LandingNavbar } from "./LandingNavbar";
import { LandingInteractivePreview } from "./LandingInteractivePreview";
import { Logo } from "@/src/components/brand/Logo";
import {
  Calendar,
  Clock,
  Sparkles,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Layers,
  Smartphone,
  Building2,
  Download,
  Presentation,
  Check,
  X as XIcon,
  HelpCircle,
  FileText,
  Lock,
} from "lucide-react";

interface LandingPageProps {
  onOpenApp: () => void;
  onLoadSample: () => void;
}

export function LandingPage({ onOpenApp, onLoadSample }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-white dark:bg-[#09090B] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans selection:bg-zinc-200 dark:selection:bg-zinc-800 transition-colors">
      {/* ── Sticky Minimal Navbar ────────────────────────────────────────── */}
      <LandingNavbar onOpenApp={onOpenApp} />

      {/* ── Hero Section ──────────────────────────────────────────────────── */}
      <section className="relative pt-12 pb-16 sm:pt-20 sm:pb-24 border-b border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
          {/* Category Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700/80 mb-6 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>SETU 2026 FORGE REALM (PS-02) • ZERO-HALLUCINATION SCHEDULING</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 max-w-4xl leading-[1.12]">
            Turn chaotic college notices into{" "}
            <span className="underline decoration-zinc-300 dark:decoration-zinc-700 underline-offset-8">
              conflict-free calendars
            </span>{" "}
            in milliseconds.
          </h1>

          {/* Subheadline */}
          <p className="mt-5 text-sm sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
            Paste raw circulars, WhatsApp broadcasts, or exam PDFs. ChronosCampus deterministically extracts dates and timings, detects interval collisions via half-open algebra, and exports synchronized calendars to all your devices.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              id="hero-launch-studio-btn"
              onClick={onOpenApp}
              className="inline-flex items-center gap-2 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 text-sm font-semibold px-5 py-3 rounded-xl transition cursor-pointer shadow-sm active:scale-95"
            >
              <span>Launch Interactive Studio</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              id="hero-try-sample-btn"
              onClick={onLoadSample}
              className="inline-flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-sm font-medium px-4 py-3 rounded-xl transition cursor-pointer border border-zinc-200/80 dark:border-zinc-700/80"
            >
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Load PS-02 Sample Notice</span>
            </button>
          </div>

          {/* Live Mini-Preview Component */}
          <div className="mt-12 sm:mt-16 w-full max-w-5xl">
            <LandingInteractivePreview onLaunchWithSample={onLoadSample} />
          </div>
        </div>
      </section>

      {/* ── Trust & Proof Bar ──────────────────────────────────────────────── */}
      <section className="py-6 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-[#0c0c0e]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="flex flex-col items-center justify-center p-3">
              <span className="font-mono text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                1.1 ms
              </span>
              <span className="text-xs font-mono text-zinc-500 mt-0.5">
                Local AST Parse Latency
              </span>
            </div>
            <div className="flex flex-col items-center justify-center p-3">
              <span className="font-mono text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                100% Offline
              </span>
              <span className="text-xs font-mono text-zinc-500 mt-0.5">
                Zero Cloud AST Dependency
              </span>
            </div>
            <div className="flex flex-col items-center justify-center p-3">
              <span className="font-mono text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                RFC-5545
              </span>
              <span className="text-xs font-mono text-zinc-500 mt-0.5">
                Apple & Google Cal Stream
              </span>
            </div>
            <div className="flex flex-col items-center justify-center p-3">
              <span className="font-mono text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                0% LLM Drift
              </span>
              <span className="text-xs font-mono text-zinc-500 mt-0.5">
                Mathematical Verification
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-16 sm:py-24 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-semibold mb-2">
              Architecture & Workflow
            </h2>
            <h3 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Three-step deterministic pipeline.
            </h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              From raw unstructured text to verified cross-device calendar events in sub-millisecond compute.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="p-6 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#121215] shadow-2xs flex flex-col justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-zinc-400">01</span>
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center my-4 text-zinc-800 dark:text-zinc-200">
                  <FileText className="w-5 h-5" />
                </div>
                <h4 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                  Multi-Modal Ingestion
                </h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Accepts pasted circular text, WhatsApp broadcasts, camera photos via Tesseract OCR, or official university PDFs with magic-byte validation.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-[11px] font-mono text-zinc-500">
                Magic byte safety · 5MB file cap
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#121215] shadow-2xs flex flex-col justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-zinc-400">02</span>
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center my-4 text-zinc-800 dark:text-zinc-200">
                  <Cpu className="w-5 h-5" />
                </div>
                <h4 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                  Deterministic AST & Collision Audit
                </h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Extracts dates, times, and venues with verbatim source spans. Mathematically checks half-open intervals <code className="font-mono text-[10px] bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">[S_i, E_i)</code> for overlaps and trapped deadlines.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-[11px] font-mono text-zinc-500">
                Sweepline algorithm · 0% hallucination
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#121215] shadow-2xs flex flex-col justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-zinc-400">03</span>
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center my-4 text-zinc-800 dark:text-zinc-200">
                  <Download className="w-5 h-5" />
                </div>
                <h4 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                  1-Click Gap Fix & Calendar Sync
                </h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Auto-reschedules collisions to the next verified open slot. Generates RFC-5545 compliant <code className="font-mono text-[10px] bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">.ics</code> files or live <code className="font-mono text-[10px] bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">webcal://</code> subscription feeds for Apple & Google Calendar.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-[11px] font-mono text-zinc-500">
                RFC-5545 75-octet fold · Live Webcal
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature Bento Grid ────────────────────────────────────────────── */}
      <section id="features" className="py-16 sm:py-24 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/40 dark:bg-[#0b0b0d]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-semibold mb-2">
              Capabilities
            </h2>
            <h3 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Engineered for real university complexity.
            </h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Not a toy prototype — an enterprise-grade schedule defense engine handling Indian academic formats, transit limits, and faculty timetables.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Feature 1 */}
            <div className="p-5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#121215]">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                <Calendar className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                Indian Academic Date Parser
              </h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Handles <code className="font-mono text-[10px]">13 Nov 2026</code>, slash notation <code className="font-mono text-[10px]">13/11/2026</code>, colloquial timings <code className="font-mono text-[10px]">12:00 noon</code>, and Hinglish WhatsApp circulars without hallucinating.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#121215]">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                <Zap className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                1-Click Gap-Finder Rescheduler
              </h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Computes the complement of the union of all busy intervals to identify the earliest valid free block, resolving collisions with a single click.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#121215]">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
                <Building2 className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                Faculty B2B Pre-Publish Blocker
              </h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Simulates department timetables before circulars are published, blocking faculty conflicts and accidental exam overlaps at the source.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#121215]">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                Campus Transit Risk Engine
              </h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Calculates pedestrian transit delays between campus zones (e.g. Mechanical Workshop to CS Academic Block) to prevent impossible back-to-back transitions.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#121215]">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                OWASP & ReDoS Defense Layer
              </h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Hardened against calendar injection (CRLF), formula macros (CWE-1236), prompt injection jailbreaks, and catastrophic backtracking ReDoS regex attacks.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#121215]">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
                <Smartphone className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                WhatsApp Bot & Live Webcal Feed
              </h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Share verified schedule cards directly to class WhatsApp groups or subscribe via <code className="font-mono text-[10px]">webcal://</code> for automatic timetable updates on mobile devices.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Comparison Section ────────────────────────────────────────────── */}
      <section id="comparison" className="py-16 sm:py-24 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-semibold mb-2">
              Comparison
            </h2>
            <h3 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Why ChronosCampus beats manual calendar entry.
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              <thead className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                <tr>
                  <th className="p-3.5 font-semibold">Capability</th>
                  <th className="p-3.5 font-semibold">Manual Timetable Entry</th>
                  <th className="p-3.5 font-semibold">Generic AI Assistants</th>
                  <th className="p-3.5 font-semibold text-zinc-900 dark:text-zinc-100 bg-zinc-100/60 dark:bg-zinc-800/40">ChronosCampus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                <tr>
                  <td className="p-3.5 font-medium text-zinc-800 dark:text-zinc-200">Unstructured Circular Parsing</td>
                  <td className="p-3.5 text-zinc-500">Slow, error-prone manual typing</td>
                  <td className="p-3.5 text-zinc-500">Hallucinates dates & misses deadlines</td>
                  <td className="p-3.5 font-medium text-emerald-600 dark:text-emerald-400 bg-zinc-50/50 dark:bg-zinc-900/20">Deterministic 1.1ms regex AST</td>
                </tr>
                <tr>
                  <td className="p-3.5 font-medium text-zinc-800 dark:text-zinc-200">Mathematical Collision Detection</td>
                  <td className="p-3.5 text-zinc-500">Relies on student memory</td>
                  <td className="p-3.5 text-zinc-500">No interval verification</td>
                  <td className="p-3.5 font-medium text-emerald-600 dark:text-emerald-400 bg-zinc-50/50 dark:bg-zinc-900/20">Half-open [S_i, E_i) sweepline algebra</td>
                </tr>
                <tr>
                  <td className="p-3.5 font-medium text-zinc-800 dark:text-zinc-200">Trapped Deadline Warning</td>
                  <td className="p-3.5 text-zinc-500">Discovered too late on exam day</td>
                  <td className="p-3.5 text-zinc-500">Not supported</td>
                  <td className="p-3.5 font-medium text-emerald-600 dark:text-emerald-400 bg-zinc-50/50 dark:bg-zinc-900/20">Flags submission inside busy blocks</td>
                </tr>
                <tr>
                  <td className="p-3.5 font-medium text-zinc-800 dark:text-zinc-200">1-Click Auto-Reschedule</td>
                  <td className="p-3.5 text-zinc-500">Lengthy faculty email threads</td>
                  <td className="p-3.5 text-zinc-500">Hallucinated time proposals</td>
                  <td className="p-3.5 font-medium text-emerald-600 dark:text-emerald-400 bg-zinc-50/50 dark:bg-zinc-900/20">Finds true earliest verified open gap</td>
                </tr>
                <tr>
                  <td className="p-3.5 font-medium text-zinc-800 dark:text-zinc-200">Data Privacy & Security</td>
                  <td className="p-3.5 text-zinc-500">Spreadsheet leaks</td>
                  <td className="p-3.5 text-zinc-500">Transmits circulars to third-party LLMs</td>
                  <td className="p-3.5 font-medium text-emerald-600 dark:text-emerald-400 bg-zinc-50/50 dark:bg-zinc-900/20">100% Client-Side offline compute</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Pricing & Monetization Section ─────────────────────────────────── */}
      <section id="pricing" className="py-16 sm:py-24 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-[#0c0c0e]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400 font-semibold mb-2">
              B2B2C Monetization & Unit Economics
            </h2>
            <h3 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Predictable pricing for students and institutions.
            </h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Free forever for individual students via client-side AST. Enterprise SaaS licenses for universities and departmental coordinators.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Tier 01: Student Web Decoder */}
            <div className="p-6 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#121215] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-zinc-500">STUDENT EDITION</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">FREE FOREVER</span>
                </div>
                <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Student Web Decoder</h4>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">₹0</span>
                  <span className="text-xs text-zinc-500">/ forever</span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2 mb-6 leading-relaxed">
                  Viral bottom-up adoption across class WhatsApp groups; ₹0.00 server compute cost via client-side deterministic AST parsing.
                </p>
                <ul className="space-y-2.5 text-xs text-zinc-700 dark:text-zinc-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Unlimited circular decoding</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>100% Offline deterministic AST (₹0.00 compute)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>RFC-5545 .ics calendar export</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>WhatsApp schedule card generator</span>
                  </li>
                </ul>
              </div>
              <button
                id="open-student-decoder-btn"
                onClick={onOpenApp}
                className="mt-6 w-full py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-900 dark:text-zinc-100 transition cursor-pointer"
              >
                Open Free Student Decoder
              </button>
            </div>

            {/* Tier 02: Student Pro Pass */}
            <div className="p-6 rounded-2xl border-2 border-zinc-900 dark:border-zinc-100 bg-white dark:bg-[#121215] flex flex-col justify-between relative shadow-lg">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-mono font-bold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
                MOST POPULAR
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-zinc-500">STUDENT PRO PASS</span>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">B2C SUBSCRIPTION</span>
                </div>
                <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Student Pro Pass</h4>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">₹49</span>
                  <span className="text-xs text-zinc-500">/ semester</span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2 mb-6 leading-relaxed">
                  Automated WhatsApp Forward Bot (@ChronosCampusBot) + morning exam wake-up call alerts + personal timetable memory.
                </p>
                <ul className="space-y-2.5 text-xs text-zinc-700 dark:text-zinc-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Everything in Student Web Decoder</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>WhatsApp Forward Bot (@ChronosCampusBot)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Morning exam wake-up alerts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Personal timetable memory & Webcal sync</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={onOpenApp}
                className="mt-6 w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-xs font-semibold text-white dark:text-zinc-900 transition cursor-pointer shadow-xs"
              >
                Upgrade to Pro Pass
              </button>
            </div>

            {/* Tier 03: Campus ERP Governance License */}
            <div className="p-6 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#121215] flex flex-col justify-between relative">
              <div className="absolute -top-3 right-6 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20">
                ENTERPRISE B2B
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-zinc-500">CAMPUS ENTERPRISE</span>
                  <span className="text-[10px] font-mono text-zinc-400">ANNUAL B2B</span>
                </div>
                <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Campus ERP Governance License</h4>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">₹45,000</span>
                  <span className="text-xs text-zinc-500">/ year per college</span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2 mb-6 leading-relaxed">
                  Pre-publish clash validation API & dashboard for Exam Cells and Training & Placement (T&P) officers before notices broadcast.
                </p>
                <ul className="space-y-2.5 text-xs text-zinc-700 dark:text-zinc-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Everything in Pro campus-wide</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Pre-publish clash validation API (POST /api/v1/erp)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Exam Cell & T&P Governance Dashboard</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>University ERP Webhooks (SAP / Canvas / Moodle)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Dedicated SLA & on-premise deployments</span>
                  </li>
                </ul>
              </div>
              <button
                id="launch-b2b-sandbox-btn"
                onClick={onOpenApp}
                className="mt-6 w-full py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-900 dark:text-zinc-100 transition cursor-pointer"
              >
                Launch Live B2B Sandbox
              </button>
            </div>
          </div>

          {/* Unit Economics Callout */}
          <div className="mt-10 p-5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-[#121215] max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                UNIT ECONOMICS
              </span>
              <p className="text-zinc-600 dark:text-zinc-400">
                <strong className="text-zinc-900 dark:text-zinc-100">Free Tier:</strong> ₹0.00 server cost (client-side AST) •{" "}
                <strong className="text-zinc-900 dark:text-zinc-100">Pro Pass:</strong> ₹49/sem covers WhatsApp API + ~60% margin •{" "}
                <strong className="text-zinc-900 dark:text-zinc-100">Campus License:</strong> ₹45,000/yr ÷ 3,000 students = ~₹15/student/year
              </p>
            </div>
            <button
              onClick={onOpenApp}
              className="shrink-0 text-xs font-mono font-semibold text-zinc-900 dark:text-zinc-100 hover:underline cursor-pointer"
            >
              View Financial Model →
            </button>
          </div>
        </div>
      </section>

      {/* ── Final Call-to-Action ──────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            Never miss an exam or lecture overlap again.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto">
            Experience the precision of deterministic scheduling. Test your college notice in the live studio in under 5 seconds.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <button
              onClick={onOpenApp}
              className="inline-flex items-center gap-2 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 text-sm font-semibold px-6 py-3 rounded-xl transition cursor-pointer shadow-sm active:scale-95"
            >
              <span>Launch ChronosCampus Studio</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Minimalist Clean Footer ──────────────────────────────────────── */}
      <footer className="py-8 bg-zinc-50 dark:bg-[#070709] border-t border-zinc-200/80 dark:border-zinc-800 text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo variant="full" size="sm" showBadge={false} />
            <span>·</span>
            <span className="font-mono text-[11px]">SETU 2026 Forge Realm · PS-02</span>
          </div>

          <div className="flex items-center gap-6 font-medium">
            <Link href="/pitch" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition">
              Pitch Deck
            </Link>
            <a
              href="https://github.com/24co35-ops/ChronosCampus"
              target="_blank"
              rel="noreferrer"
              className="hover:text-zinc-900 dark:hover:text-zinc-100 transition"
            >
              GitHub
            </a>
            <button
              onClick={onOpenApp}
              className="hover:text-zinc-900 dark:hover:text-zinc-100 transition cursor-pointer"
            >
              Open Studio
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
