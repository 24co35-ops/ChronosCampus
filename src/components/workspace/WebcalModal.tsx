"use client";

/**
 * WebcalModal.tsx — Live webcal:// Batch Subscription Modal
 *
 * Provides Class Representatives (CRs) and students with a 1-click
 * live calendar subscription feed URL that syncs directly with Apple Calendar,
 * Google Calendar, and Microsoft Outlook.
 */

import React, { useState, useEffect } from "react";
import {
  Rss,
  Copy,
  Check,
  X,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Sparkles,
} from "lucide-react";
import { buildWebcalSubscriptionUrl } from "@/src/lib/ics/calendarLinks";

interface WebcalModalProps {
  isOpen: boolean;
  onClose: () => void;
  cohort?: string;
}

export function WebcalModal({ isOpen, onClose, cohort = "III-year CSE" }: WebcalModalProps) {
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("http://localhost:3000");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const webcalUrl = buildWebcalSubscriptionUrl(origin, cohort);
  const httpUrl = webcalUrl.replace(/^webcal:\/\//i, "https://");

  const handleCopy = async (textToCopy: string) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = textToCopy;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="webcal-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10">
        {/* ── Modal Header ──────────────────────────────────────────────── */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
              <Rss className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="webcal-modal-title" className="text-base font-bold text-slate-900">
                  Live webcal:// Batch Calendar Feed
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                  CR Broadcast Ready
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Auto-syncing calendar subscription feed for cohort: <strong>{cohort}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
            aria-label="Close subscription modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Body ──────────────────────────────────────────────────────── */}
        <div className="p-5 sm:p-6 space-y-5 text-xs text-slate-600">
          {/* Explanation Box */}
          <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed text-indigo-950">
              Class Representatives can share this single <strong>webcal://</strong> feed link in class WhatsApp groups.
              When coordinators update dates or resolve clashes, students' phones update automatically!
            </div>
          </div>

          {/* Webcal URL Display Box */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Live Subscription URL (webcal://)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={webcalUrl}
                aria-label="Live webcal subscription URL"
                className="w-full bg-slate-50 border border-slate-300 font-mono text-[11px] text-slate-800 px-3 py-2 rounded-lg select-all focus:outline-hidden"
              />
              <button
                onClick={() => handleCopy(webcalUrl)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-2xs transition cursor-pointer shrink-0"
                aria-label="Copy webcal URL"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Direct Subscription Action */}
          <div className="pt-1">
            <a
              href={webcalUrl}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition shadow-sm"
            >
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span>Subscribe Now in Default Calendar App</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
          </div>

          {/* Platform Setup Instructions */}
          <div className="border-t border-slate-200/80 pt-4 space-y-2">
            <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
              Setup in Popular Calendar Apps:
            </div>
            <ul className="space-y-1.5 text-[11px] text-slate-600 list-disc pl-4">
              <li>
                <strong>Apple Calendar (iOS / macOS):</strong> Tap the link above or choose <em>File &gt; New Calendar Subscription</em> and paste.
              </li>
              <li>
                <strong>Google Calendar (Web / Android):</strong> Click <em>Other calendars &gt; + &gt; From URL</em> and paste the link.
              </li>
              <li>
                <strong>Microsoft Outlook (Office 365):</strong> Click <em>Add calendar &gt; Subscribe from web</em> and paste the link.
              </li>
            </ul>
          </div>
        </div>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5 text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>RFC-5545 Live Stream • Offline Ready</span>
          </div>

          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-100 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
