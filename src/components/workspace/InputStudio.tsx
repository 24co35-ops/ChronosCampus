"use client";
import React, { useState } from "react";
import { useStore } from "@/src/store";
import { extractDraftEvents } from "@/src/lib/parser";
import { sanitizeNoticeInput } from "@/src/lib/security";
import { SAMPLE_NOTICE_PRESETS } from "@/src/lib/fixtures/sampleNotices";
import { startExecutionTimer, formatTelemetryBadge } from "@/src/lib/telemetry/diagnostics";
import {
  refineWithAi,
  shouldSuggestAiRefinement,
  getHybridBadgeInfo,
  type HybridParseResult,
} from "@/src/lib/parser/hybridCoordinator";
import type { ParseContext } from "@/src/types";
import {
  FileText,
  ShieldCheck,
  Sparkles,
  RotateCcw,
  AlertTriangle,
  ArrowRight,
  Info,
  Zap,
  Wand2,
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
    events,
    setIsParsing,
    setParseError,
    parseError,
    reset,
    isParsing,
  } = useStore();

  const [firewallWarning, setFirewallWarning] = useState<string | null>(null);
  const [parseLatencyMs, setParseLatencyMs] = useState<number | null>(null);
  const [isAiRefining, setIsAiRefining] = useState(false);
  const [hybridResult, setHybridResult] = useState<HybridParseResult | null>(null);

  function handleDecode() {
    if (!noticeText.trim()) return;

    const stopTimer = startExecutionTimer();
    const { text, warning } = sanitizeNoticeInput(noticeText);
    if (warning) {
      setFirewallWarning(warning);
    } else {
      setFirewallWarning(null);
    }

    setIsParsing(true);
    try {
      const parsedEvents = extractDraftEvents(text, CTX);
      setEvents(parsedEvents as any);

      const elapsed = stopTimer();
      setParseLatencyMs(elapsed);
      setHybridResult({
        events: parsedEvents as any,
        source: "DETERMINISTIC_INSTANT",
        latencyMs: elapsed,
        circuitBreakerTriggered: false,
        statusMessage: `⚡ Parsed in ${elapsed.toFixed(1)}ms • 100% Deterministic Engine`,
        deterministicEvents: parsedEvents as any,
      });

      if (parsedEvents.length === 0) {
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

  async function handleAiRefine() {
    if (!noticeText.trim()) return;
    setIsAiRefining(true);

    try {
      const currentEvents = events.length > 0 ? (events as any) : extractDraftEvents(noticeText, CTX);
      const result = await refineWithAi(noticeText, currentEvents);
      setHybridResult(result);

      if (result.events && result.events.length > 0) {
        setEvents(result.events as any);
        setParseLatencyMs(result.latencyMs);
      }
    } catch (err: any) {
      // Never crash the UI; fallback preserved
      console.warn("AI refinement error:", err);
    } finally {
      setIsAiRefining(false);
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleDecode();
    }
  };

  const badgeInfo = hybridResult ? getHybridBadgeInfo(hybridResult) : null;
  const showAiSuggestion = events.length > 0 && shouldSuggestAiRefinement(events as any);

  return (
    <section className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col gap-4">
      {/* Header, Security Badge & Live Performance Timer Badge */}
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

        {/* Live Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Live Engine Latency Badge */}
          <div
            id="telemetry-latency-badge"
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-tight transition ${
              badgeInfo
                ? badgeInfo.badgeClass
                : parseLatencyMs !== null
                ? "bg-amber-50 text-amber-900 border border-amber-300/80 shadow-2xs"
                : "bg-slate-100 text-slate-600 border border-slate-200"
            }`}
          >
            {badgeInfo?.badgeIcon === "sparkles" ? (
              <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            ) : (
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
            )}
            <span>{badgeInfo ? badgeInfo.badgeLabel : formatTelemetryBadge(parseLatencyMs)}</span>
          </div>

          {/* Security Firewall Badge */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-[11px] font-medium text-emerald-800">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Firewall Active</span>
          </div>
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
                setParseLatencyMs(null);
                setHybridResult(null);
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

      {/* Hybrid Status Banner */}
      {hybridResult && (
        <div
          className={`flex items-center justify-between p-3 rounded-xl text-xs border ${
            hybridResult.source === "AI_REFINED"
              ? "bg-purple-50 text-purple-800 border-purple-200"
              : hybridResult.circuitBreakerTriggered
              ? "bg-amber-50 text-amber-800 border-amber-200"
              : "bg-indigo-50 text-indigo-800 border-indigo-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {hybridResult.source === "AI_REFINED" ? (
              <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
            ) : (
              <Zap className="w-4 h-4 text-indigo-600 shrink-0" />
            )}
            <span className="font-medium">{hybridResult.statusMessage}</span>
          </div>
          <span className="text-[11px] font-mono opacity-75">{hybridResult.latencyMs.toFixed(1)}ms</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2.5 pt-1">
        {/* Deterministic Primary Pass Button */}
        <button
          id="decode-btn"
          onClick={handleDecode}
          disabled={!noticeText.trim() || isParsing}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition cursor-pointer"
        >
          {isParsing ? (
            <span>Processing...</span>
          ) : (
            <>
              <Zap className="w-4 h-4 text-indigo-200" />
              <span>Instant Decode (0ms)</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </>
          )}
        </button>

        {/* Optional AI Refinement Pass Button */}
        <button
          id="ai-refine-btn"
          onClick={handleAiRefine}
          disabled={!noticeText.trim() || isAiRefining}
          title="Optional AI semantic refinement via Gemini 2.5 Flash with 4-second circuit breaker and deterministic timestamp firewall"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-semibold hover:from-purple-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition cursor-pointer"
        >
          <Wand2 className="w-4 h-4 text-purple-200" />
          <span>{isAiRefining ? "Refining with AI..." : "✨ Deep AI Refine"}</span>
        </button>

        {/* Reset */}
        <button
          id="reset-btn"
          onClick={() => {
            reset();
            setFirewallWarning(null);
            setParseLatencyMs(null);
            setHybridResult(null);
          }}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition cursor-pointer ml-auto"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          <span>Clear Studio</span>
        </button>
      </div>
    </section>
  );
}