"use client";
import React, { useState } from "react";
import { useStore } from "@/src/store";
import type { ClashResult, Recommendation, DeadlineFeasibility } from "@/src/types";
import { ActionRecommenderPanel } from "./ActionRecommenderPanel";
import { EscalationModal } from "./EscalationModal";
import { useNoticeStore } from "@/src/store/useNoticeStore";
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
  const openEscalation = useNoticeStore((s) => s.openEscalation);
  const pairwiseClashes = useNoticeStore((s) => s.pairwiseClashes);
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

                {c.kind !== "none" && (
                  <div className="mt-3 pt-2.5 border-t border-black/5 flex items-center justify-between">
                    <button
                      id={`draft-escalation-btn-${i}`}
                      onClick={() => {
                        const match = pairwiseClashes.find(
                          (pc) =>
                            (pc.eventA === c.eventA && pc.eventB === c.eventB) ||
                            (pc.eventA === c.eventB && pc.eventB === c.eventA)
                        );
                        openEscalation(match?.id ?? `clash-${c.eventA}-${c.eventB}`);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-2xs transition cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5 text-indigo-200" />
                      <span>✉ Draft Coordinator Message</span>
                    </button>
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

      <ActionRecommenderPanel />
      <EscalationModal />
    </section>
  );
}
