"use client";

/**
 * ActionRecommenderPanel.tsx
 *
 * Renders PS-02 prioritized action cards for every detected clash,
 * plus the 1-click "✨ Preview Conflict-Free Reschedule" / "Revert" button
 * backed by the actionRecommender's Auto-Reschedule Gap Finder.
 */

import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Info,
  Mail,
  RotateCcw,
  Sparkles,
  Zap,
} from "lucide-react";
import { useNoticeStore } from "@/src/store/useNoticeStore";
import type { ActionRecommendation } from "@/src/types/notice";

// ── Priority badge config ──────────────────────────────────────────────────

const PRIORITY_CONFIG = {
  CRITICAL: {
    badge: "bg-rose-100 text-rose-700 border-rose-200",
    ring: "border-rose-200 bg-rose-50/40",
    icon: <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />,
    label: "Critical",
  },
  HIGH: {
    badge: "bg-orange-100 text-orange-700 border-orange-200",
    ring: "border-orange-200 bg-orange-50/40",
    icon: <Zap className="w-4 h-4 text-orange-500 flex-shrink-0" />,
    label: "High",
  },
  MEDIUM: {
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    ring: "border-amber-200 bg-amber-50/40",
    icon: <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />,
    label: "Medium",
  },
  LOW: {
    badge: "bg-slate-100 text-slate-600 border-slate-200",
    ring: "border-slate-200 bg-slate-50/40",
    icon: <Info className="w-4 h-4 text-slate-500 flex-shrink-0" />,
    label: "Low",
  },
} as const;

const ACTION_TYPE_LABEL: Record<ActionRecommendation["actionType"], string> = {
  RESCHEDULE_EVENT: "Reschedule",
  SHIFT_DEADLINE: "Shift Deadline",
  TRANSIT_BUFFER: "Transit Buffer",
  NOTIFY_FACULTY: "Notify Faculty",
  SPLIT_COHORT: "Split Cohort",
};

// ── Sub-component: Email Draft ─────────────────────────────────────────────

function EmailDraftBlock({
  draft,
  cardIdx,
  relatedEventIds,
}: {
  draft: NonNullable<ActionRecommendation["draftEmail"]>;
  cardIdx: number;
  relatedEventIds?: string[];
}) {
  const [copied, setCopied] = useState(false);
  const openEscalation = useNoticeStore((s) => s.openEscalation);
  const pairwiseClashes = useNoticeStore((s) => s.pairwiseClashes);

  const handleCopy = () => {
    const full = `To: ${draft.recipient}\nSubject: ${draft.subject}\n\n${draft.body}`;
    navigator.clipboard.writeText(full);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
          <Mail className="w-3 h-3 text-slate-400" />
          Suggested Email Draft
          <span className="font-normal text-slate-400">→ {draft.recipient}</span>
        </span>
        <div className="flex items-center gap-1.5">
          <button
            id={`open-escalation-draft-${cardIdx}`}
            onClick={() => {
              const match = pairwiseClashes.find((c) =>
                c.hasClash &&
                relatedEventIds &&
                relatedEventIds.includes(c.eventA) &&
                relatedEventIds.includes(c.eventB)
              ) || pairwiseClashes.find((c) => c.hasClash);
              if (match) openEscalation(match.id);
            }}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs transition cursor-pointer"
          >
            <Mail className="w-3 h-3 text-indigo-200" />
            <span>✉ Draft Coordinator Message</span>
          </button>
          <button
            id={`copy-draft-${cardIdx}`}
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-600" />
                <span className="text-emerald-700">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                Copy Email
              </>
            )}
          </button>
        </div>
      </div>
      <div className="text-[11px] font-semibold text-slate-500">
        Subject: <span className="text-slate-700">{draft.subject}</span>
      </div>
      <pre className="text-[11px] font-mono text-slate-600 bg-slate-50 p-3 rounded-lg whitespace-pre-wrap leading-relaxed border border-slate-100 overflow-x-auto">
        {draft.body}
      </pre>
    </div>
  );
}

// ── Sub-component: Reschedule Preview Card ─────────────────────────────────

function ReschedulePreviewCard({
  eventId,
  recId,
}: {
  eventId: string;
  recId: string;
}) {
  const rescheduleMap = useNoticeStore((s) => s.rescheduleMap);
  const previewId = useNoticeStore((s) => s.previewRescheduleId);
  const previewReschedule = useNoticeStore((s) => s.previewReschedule);
  const revertReschedule = useNoticeStore((s) => s.revertReschedule);

  const suggestion = rescheduleMap?.get(eventId);
  if (!suggestion) return null;

  const isPreviewing = previewId === eventId;

  const fmt = (t: string) => {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    const med = h! >= 12 ? "PM" : "AM";
    const h12 = h === 0 ? 12 : h! > 12 ? h! - 12 : h!;
    return `${h12}:${String(m ?? 0).padStart(2, "0")} ${med}`;
  };

  return (
    <div
      className={`mt-2 rounded-xl border p-3 flex flex-col gap-2 transition-all ${
        isPreviewing
          ? "border-emerald-300 bg-emerald-50/60"
          : "border-indigo-200 bg-indigo-50/50"
      }`}
    >
      {/* Before → After header */}
      <div className="flex items-center gap-2 flex-wrap text-xs font-semibold">
        <span className={isPreviewing ? "text-emerald-700" : "text-indigo-700"}>
          <CalendarCheck className="w-3.5 h-3.5 inline mr-1" />
          {isPreviewing ? "Preview Active — Schedule Updated" : "Proposed Reschedule"}
        </span>
      </div>

      <div className="flex items-center gap-2 text-xs font-mono">
        <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 line-through">
          {fmt(suggestion.originalStart)} – {fmt(suggestion.originalEnd)}
        </span>
        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
        <span
          className={`px-2 py-0.5 rounded border font-semibold ${
            isPreviewing
              ? "bg-emerald-100 border-emerald-300 text-emerald-800"
              : "bg-indigo-100 border-indigo-300 text-indigo-800"
          }`}
        >
          {fmt(suggestion.proposedStart)} – {fmt(suggestion.proposedEnd)}
        </span>
      </div>

      {suggestion.freedWindowMinutes > 0 && (
        <p className="text-[11px] text-slate-600 leading-relaxed">
          Opens a{" "}
          <span className="font-semibold text-emerald-700">
            {suggestion.freedWindowMinutes}-minute free window
          </span>{" "}
          ({fmt(suggestion.freedWindowStart)} – {fmt(suggestion.freedWindowEnd)}) for
          submissions and transit.{" "}
          {suggestion.isDeadlineFeasible && (
            <span className="text-emerald-600 font-medium">
              ✓ Deadline is now feasible!
            </span>
          )}
        </p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {!isPreviewing ? (
          <button
            id={`preview-reschedule-${recId}`}
            onClick={() => previewReschedule(eventId)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            ✨ Preview Conflict-Free Reschedule
          </button>
        ) : (
          <button
            id={`revert-reschedule-${recId}`}
            onClick={() => revertReschedule(eventId)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Revert to Original
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────

export function ActionRecommenderPanel() {
  const recommendations = useNoticeStore((s) => s.recommendations);
  const rescheduleMap = useNoticeStore((s) => s.rescheduleMap);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0);

  if (!recommendations || recommendations.length === 0) return null;

  const criticalCount = recommendations.filter((r) => r.priority === "CRITICAL").length;

  return (
    <section
      id="action-recommender-panel"
      className="bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-col gap-0 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Recommended Resolution Actions
            </h2>
            <p className="text-xs text-slate-500">
              PS-02 context-aware actions with auto-reschedule gap finder
            </p>
          </div>
        </div>
        {criticalCount > 0 && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            {criticalCount} Critical
          </span>
        )}
      </div>

      {/* Cards */}
      <div className="flex flex-col divide-y divide-slate-100">
        {recommendations.map((rec, idx) => {
          const cfg = PRIORITY_CONFIG[rec.priority];
          const isExpanded = expandedIdx === idx;
          const hasReschedule =
            rec.actionType === "RESCHEDULE_EVENT" &&
            rec.suggestedPatch?.eventId &&
            rescheduleMap?.has(rec.suggestedPatch.eventId);

          return (
            <div
              key={rec.id}
              id={`action-card-${idx}`}
              className={`transition-all ${cfg.ring} ${isExpanded ? "border-l-4" : ""}`}
            >
              {/* Collapsed / expanded header row */}
              <button
                className="w-full flex items-start gap-3 px-5 py-4 text-left hover:bg-slate-50/70 transition"
                onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                aria-expanded={isExpanded}
              >
                {cfg.icon}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-800 leading-snug">
                      {rec.title}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${cfg.badge}`}
                    >
                      {cfg.label}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">
                      {ACTION_TYPE_LABEL[rec.actionType]}
                    </span>
                    {hasReschedule && (
                      <span className="text-[10px] font-semibold text-indigo-600 flex items-center gap-0.5">
                        <Sparkles className="w-3 h-3" />
                        Gap Finder
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {rec.description}
                  </p>
                </div>
                <div className="flex-shrink-0 text-slate-400 mt-0.5">
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </button>

              {/* Expanded body */}
              {isExpanded && (
                <div className="px-5 pb-4 flex flex-col gap-2">
                  {/* Reschedule preview widget */}
                  {hasReschedule && rec.suggestedPatch?.eventId && (
                    <ReschedulePreviewCard
                      eventId={rec.suggestedPatch.eventId}
                      recId={String(idx)}
                    />
                  )}

                  {/* Email draft */}
                  {rec.draftEmail && (
                    <EmailDraftBlock draft={rec.draftEmail} cardIdx={idx} relatedEventIds={rec.relatedEventIds} />
                  )}

                  {/* No extras: show "no further action" hint */}
                  {!hasReschedule && !rec.draftEmail && (
                    <p className="text-[11px] text-slate-400 italic">
                      No email draft required for this action type.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}