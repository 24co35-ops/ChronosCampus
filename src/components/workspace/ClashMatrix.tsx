"use client";
import React, { useState } from "react";
import { useStore } from "@/src/store";
import type { ClashResult, Recommendation, DeadlineFeasibility } from "@/src/types";
import {
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Clock,
  Mail,
  Copy,
  Check,
  ShieldAlert,
  Sparkles,
  Info,
} from "lucide-react";

const KIND_CONFIG: Record<
  ClashResult["kind"],
  { label: string; icon: React.ReactNode; bg: string; border: string; text: string }
> = {
  overlap: {
    label: "Direct Overlap",
    icon: <AlertOctagon className="w-4 h-4 text-rose-600" />,
    bg: "bg-rose-50/80",
    border: "border-rose-200",
    text: "text-rose-900",
  },
  containment: {
    label: "Deadline Containment",
    icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
    bg: "bg-amber-50/80",
    border: "border-amber-200",
    text: "text-amber-900",
  },
  "deadline-collision": {
    label: "Deadline Collision",
    icon: <AlertTriangle className="w-4 h-4 text-orange-600" />,
    bg: "bg-orange-50/80",
    border: "border-orange-200",
    text: "text-orange-900",
  },
  none: {
    label: "No Conflict",
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
    bg: "bg-emerald-50/70",
    border: "border-emerald-200",
    text: "text-emerald-900",
  },
};

export function ClashMatrix() {
  const { clashes, events, recommendations, feasibility } = useStore();
  const [copiedDraftIdx, setCopiedDraftIdx] = useState<number | null>(null);

  if (clashes.length === 0 && recommendations.length === 0) return null;

  const byId = Object.fromEntries(events.map((e) => [e.id, e.title]));

  const handleCopyDraft = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedDraftIdx(idx);
    setTimeout(() => setCopiedDraftIdx(null), 2500);
  };

  const hasClashes = clashes.some((c) => c.kind !== "none");

  return (
    <section className="flex flex-col gap-5">
      {/* Pairwise Clash Audit */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${hasClashes ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Pairwise Interval Clash Engine</h2>
              <p className="text-xs text-slate-500">
                Mathematical half-open interval audit [start, end) across all extracted events
              </p>
            </div>
          </div>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
              hasClashes
                ? "bg-rose-50 text-rose-700 border-rose-200"
                : "bg-emerald-50 text-emerald-700 border-emerald-200"
            }`}
          >
            {hasClashes ? "Clashes Detected" : "Zero Clashes"}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {clashes.map((c, i) => {
            const cfg = KIND_CONFIG[c.kind];
            const titleA = byId[c.eventA] ?? c.eventA;
            const titleB = byId[c.eventB] ?? c.eventB;

            return (
              <div
                key={i}
                id={`clash-item-${i}`}
                className={`rounded-xl border p-4 transition ${cfg.bg} ${cfg.border} ${cfg.text}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {cfg.icon}
                    <span className="font-semibold text-sm">
                      &ldquo;{titleA}&rdquo; <span className="text-slate-400 font-normal">vs</span> &ldquo;{titleB}&rdquo;
                    </span>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white/80 border border-slate-200 shadow-2xs">
                    {cfg.label}
                  </span>
                </div>

                <p className="text-xs mt-2 leading-relaxed opacity-90">{c.explanation}</p>

                {c.overlapMins > 0 && (
                  <div className="mt-2.5 flex items-center gap-2 text-xs font-mono font-medium">
                    <Clock className="w-3.5 h-3.5 opacity-70" />
                    <span>
                      Conflict interval: {c.overlapStart} – {c.overlapEnd} ({c.overlapMins} minutes overlap)
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Deadline Feasibility & Busy Window Warnings */}
      {feasibility.some((f) => f.isAtRisk) && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 shadow-xs flex flex-col gap-3">
          <div className="flex items-center gap-2 text-amber-900 font-semibold text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h3>Deadline Feasibility Risk Warning</h3>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            The following submission deadlines fall directly inside or immediately adjacent to scheduled sessions:
          </p>
          <div className="flex flex-col gap-2">
            {feasibility
              .filter((f) => f.isAtRisk)
              .map((f, idx) => (
                <div key={idx} className="bg-white/90 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-950">
                  <span className="font-semibold text-amber-900">&ldquo;{byId[f.deadlineId] ?? f.deadlineId}&rdquo;: </span>
                  {f.recommendation}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Actionable Recommendations & Email Draft Generator */}
      {recommendations.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Recommended Resolution Actions</h2>
              <p className="text-xs text-slate-500">
                Automated recommendations and pre-composed email drafts for administration/professors
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {recommendations.map((rec, idx) => (
              <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-indigo-500" />
                    {rec.title}
                  </span>
                  <span
                    className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                      rec.priority === "high"
                        ? "bg-rose-100 text-rose-700"
                        : rec.priority === "medium"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {rec.priority} Priority
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{rec.detail}</p>

                {/* Pre-drafted resolution email */}
                {rec.draftMessage && (
                  <div className="mt-2 bg-white rounded-xl border border-slate-200 p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-500" />
                        Suggested Email Draft to Faculty / Admin
                      </span>
                      <button
                        id={`copy-draft-btn-${idx}`}
                        onClick={() => handleCopyDraft(rec.draftMessage!, idx)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
                      >
                        {copiedDraftIdx === idx ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700 font-semibold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Email</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="text-[11px] font-mono text-slate-600 bg-slate-50 p-3 rounded-lg whitespace-pre-wrap leading-relaxed border border-slate-100 overflow-x-auto">
                      {rec.draftMessage}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
