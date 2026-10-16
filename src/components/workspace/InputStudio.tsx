"use client";
import React, { useState } from "react";
import { useStore } from "@/src/store";
import { extractDraftEvents } from "@/src/lib/parser";
import { sanitizeNoticeInput } from "@/src/lib/security";
import { SAMPLE_NOTICE_PRESETS, OFFICIAL_PS02_NOTICE } from "@/src/lib/fixtures/sampleNotices";
import type { ParseContext } from "@/src/types";
import {
  FileText,
  ShieldCheck,
  Sparkles,
  RotateCcw,
  AlertTriangle,
  ArrowRight,
  Info,
} from "lucide-react";

const CTX: ParseContext = {
  referenceYear: 2026,
  timeZone: "Asia/Kolkata",
  locale: "IN",
};

export function InputStudio() {
  const {
    noticeText,
    setNoticeText,
    setEvents,
    setIsParsing,
    setParseError,
    parseError,
    reset,
    isParsing,
  } = useStore();

  const [firewallWarning, setFirewallWarning] = useState<string | null>(null);

  function handleDecode() {
    if (!noticeText.trim()) return;

    const { text, warning } = sanitizeNoticeInput(noticeText);
    if (warning) {
      setFirewallWarning(warning);
    } else {
      setFirewallWarning(null);
    }

    setIsParsing(true);
    try {
      const events = extractDraftEvents(text, CTX);
      setEvents(events as any);

      if (events.length === 0) {
        setParseError(
          "No scheduled events or deadlines detected in this notice. Ensure times (e.g. '10:00 AM') and dates (e.g. '13 Nov 2026' or '13/11/2026') are present."
        );
      } else {
        setParseError(null);
      }
    } catch (err: any) {
      setParseError(err?.message || "An unexpected parser error occurred.");
    } finally {
      setIsParsing(false);
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleDecode();
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col gap-4">
      {/* Header and presets */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Notice Input Studio</h2>
            <p className="text-xs text-slate-500">
              Paste university circulars, exam schedules, or select a problem benchmark preset
            </p>
          </div>
        </div>

        {/* Security badge */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-[11px] font-medium text-emerald-800">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Security Firewall Active</span>
        </div>
      </div>

      {/* Preset buttons */}
      <div className="flex flex-col gap-1.5 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-600">Test Presets & Benchmarks:</span>
          <span className="text-[11px] text-slate-400">Click any preset to populate studio</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_NOTICE_PRESETS.map((preset, idx) => (
            <button
              key={preset.id}
              id={`preset-btn-${idx}`}
              onClick={() => {
                reset();
                setFirewallWarning(null);
                setNoticeText(preset.text);
              }}
              title={preset.description}
              className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition ${
                preset.id === "ps02-official"
                  ? "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                  : preset.id === "adversarial-security"
                  ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              {preset.title}
            </button>
          ))}
        </div>
      </div>

      {/* Textarea */}
      <div className="relative">
        <textarea
          id="notice-input"
          value={noticeText}
          onChange={(e) => {
            setNoticeText(e.target.value);
            if (parseError) setParseError(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Paste or type circular text here (e.g. 'All III-year CSE students: Internal Test 2 will be held on 13 Nov 2026 from 10:00 AM to 11:30 AM in Room 204...')"
          rows={6}
          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-sm font-mono text-slate-800 leading-relaxed placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition resize-y"
        />
        <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400 px-1">
          <span>Tip: Press Ctrl + Enter to decode notice immediately</span>
          <span>{noticeText.length} characters</span>
        </div>
      </div>

      {/* Warnings & Errors */}
      {firewallWarning && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{firewallWarning}</span>
        </div>
      )}

      {parseError && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
          <Info className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{parseError}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2.5 pt-1">
        <button
          id="decode-btn"
          onClick={handleDecode}
          disabled={!noticeText.trim() || isParsing}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition"
        >
          {isParsing ? (
            <span>Processing...</span>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Decode Notice</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </>
          )}
        </button>

        <button
          id="reset-btn"
          onClick={() => {
            reset();
            setFirewallWarning(null);
          }}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          <span>Clear Studio</span>
        </button>
      </div>
    </section>
  );
}
