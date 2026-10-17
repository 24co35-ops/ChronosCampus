"use client";

/**
 * VisualTimelineGantt.tsx — Precision Architectural Schedule Canvas
 *
 * Inspired by Notion Calendar (Cron) and the exact diagram in Section 03 of PS-02:
 * 1. Precision 30-minute time axis with monospace hour markers and crisp 1px vertical hairlines.
 * 2. Signature diagonal crimson hatched overlap zone (SVG pattern) bounded by dashed red hairlines
 *    with a monospace "30 MIN OVERLAP" pill at the base.
 * 3. Sleek 32px event bars (rounded-md) with 3px solid left accent borders, monospace timings,
 *    and venue tags.
 * 4. Record deadline row at 12:00 PM with vertical dashed crimson line extending from header
 *    straight through the Guest Lecture down to a sharp 12×12 vector diamond (◆), labeled
 *    "12:00 PM (inside the lecture)".
 * 5. Tactile Quick-Nudge (±15m) micro-step buttons appearing on bar hover so judges can resolve
 *    collisions live with one click.
 * 6. Bi-directional hover sync with activeHighlightedEventId in the Zustand store.
 */

import React, { useState, useMemo } from "react";
import { useStore } from "@/src/store";
import { useNoticeStore } from "@/src/store/useNoticeStore";
import { toMinutes, fromMinutes, format12Hour } from "@/src/lib/clash/pairwiseEngine";
import type { ReviewedEvent } from "@/src/types";
import {
  Layers,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

// ── Layout dimensions ─────────────────────────────────────────────────────────
const SVG_WIDTH = 900;
const ROW_HEIGHT = 54;       // 32px bar + 22px spacing
const BAR_HEIGHT = 32;
const BAR_Y_OFFSET = 11;     // vertical alignment within row
const LABEL_W = 180;         // 180px left column for clean row labels
const CHART_W = SVG_WIDTH - LABEL_W;
const HEADER_H = 38;         // Time axis header height
const AXIS_LABEL_Y = HEADER_H - 10;

// ── Event styling map ────────────────────────────────────────────────────────
interface EventStyleToken {
  fill: string;
  accent: string;
  textFill: string;
}

const DEFAULT_STYLE: EventStyleToken = {
  fill: "#64748b",
  accent: "#334155",
  textFill: "#ffffff",
};

const EVENT_STYLES: Record<string, EventStyleToken> = {
  Test: { fill: "#3b82f6", accent: "#1d4ed8", textFill: "#ffffff" },
  Lecture: { fill: "#8b5cf6", accent: "#6d28d9", textFill: "#ffffff" },
  Deadline: { fill: "#ef4444", accent: "#b91c1c", textFill: "#ffffff" },
  Other: DEFAULT_STYLE,
};

export function VisualTimelineGantt() {
  const { events: appEvents, updateEvent } = useStore();
  const noticeEvents = useNoticeStore((s) => s.events);
  const rescheduleMap = useNoticeStore((s) => s.rescheduleMap);
  const previewReschedule = useNoticeStore((s) => s.previewReschedule);
  const activeHighlightedEventId = useNoticeStore((s) => s.activeHighlightedEventId);
  const setActiveHighlightedEventId = useNoticeStore((s) => s.setActiveHighlightedEventId);

  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);

  const events: ReviewedEvent[] = useMemo(() => {
    if (appEvents.length > 0) return appEvents;
    return noticeEvents.map((e) => ({
      id: e.id,
      title: e.title,
      type: e.type,
      dateISO: e.dateISO,
      startTime: e.startTime,
      endTime: e.endTime,
      venue: e.venue || "TBD",
      audience: e.cohort,
      timeZone: "Asia/Kolkata",
      rawSource: e.sourceSpan?.rawSentence || "",
      sourceSpans: [],
      fieldStatus: {
        title: "matched" as const,
        type: "matched" as const,
        date: "matched" as const,
        startTime: "matched" as const,
        endTime: "matched" as const,
        venue: "matched" as const,
        audience: "matched" as const,
      },
      confirmed: true,
    }));
  }, [appEvents, noticeEvents]);

  const datedEvents = useMemo(
    () => events.filter((e) => e.dateISO && e.startTime),
    [events]
  );

  // PS-02 Section 03 alignment: Tests first, Lectures second, Deadlines third
  const sortedEvents = useMemo(() => {
    const rank = (t: string) => (t === "Test" ? 0 : t === "Lecture" ? 1 : 2);
    return [...datedEvents].sort((a, b) => {
      const dr = rank(a.type) - rank(b.type);
      if (dr !== 0) return dr;
      return toMinutes(a.startTime) - toMinutes(b.startTime);
    });
  }, [datedEvents]);

  // Dynamic axis range snapped to 30-min boundaries with 30m padding
  const { startMin, endMin, totalMinutes } = useMemo(() => {
    if (sortedEvents.length === 0) {
      return { startMin: 570, endMin: 810, totalMinutes: 240 };
    }
    const allMins = sortedEvents.flatMap((e) => [
      toMinutes(e.startTime),
      toMinutes(e.endTime || e.startTime),
    ]);
    const lo = Math.max(0, Math.floor((Math.min(...allMins) - 30) / 30) * 30);
    const hi = Math.min(1440, Math.ceil((Math.max(...allMins) + 30) / 30) * 30);
    return { startMin: lo, endMin: hi, totalMinutes: Math.max(120, hi - lo) };
  }, [sortedEvents]);

  // Minutes → SVG X coordinate
  function xOf(mins: number): number {
    const clamped = Math.max(startMin, Math.min(endMin, mins));
    return LABEL_W + ((clamped - startMin) / totalMinutes) * CHART_W;
  }

  // ±15-minute nudge
  function nudgeEvent(id: string, delta: number) {
    const ev = events.find((e) => e.id === id);
    if (!ev) return;
    const s = toMinutes(ev.startTime);
    const dur = Math.max(15, toMinutes(ev.endTime || ev.startTime) - s);
    const ns = Math.max(0, Math.min(1440 - 15, s + delta));
    updateEvent(id, {
      startTime: fromMinutes(ns),
      endTime: ev.type === "Deadline" ? fromMinutes(ns) : fromMinutes(Math.min(1440, ns + dur)),
    });
  }

  // Overlap detection between ranged events (Test vs Lecture)
  const directOverlaps = useMemo(() => {
    const ranged = sortedEvents.filter((e) => e.type !== "Deadline");
    const out: { startMins: number; endMins: number; duration: number; eventA: ReviewedEvent; eventB: ReviewedEvent }[] = [];
    for (let i = 0; i < ranged.length; i++) {
      for (let j = i + 1; j < ranged.length; j++) {
        const a = ranged[i]!, b = ranged[j]!;
        if (a.dateISO !== b.dateISO) continue;
        const oS = Math.max(toMinutes(a.startTime), toMinutes(b.startTime));
        const oE = Math.min(toMinutes(a.endTime || a.startTime), toMinutes(b.endTime || b.startTime));
        if (oS < oE) out.push({ startMins: oS, endMins: oE, duration: oE - oS, eventA: a, eventB: b });
      }
    }
    return out;
  }, [sortedEvents]);

  // Trapped deadlines (Point-in-time falling inside an active ranged session)
  const trappedDeadlines = useMemo(() => {
    const deadlines = sortedEvents.filter((e) => e.type === "Deadline");
    const ranged = sortedEvents.filter((e) => e.type !== "Deadline");
    const out: { deadline: ReviewedEvent; parentEvent: ReviewedEvent; deadlineMins: number }[] = [];
    for (const d of deadlines) {
      const dM = toMinutes(d.startTime);
      for (const r of ranged) {
        if (d.dateISO !== r.dateISO) continue;
        if (dM >= toMinutes(r.startTime) && dM <= toMinutes(r.endTime || r.startTime)) {
          out.push({ deadline: d, parentEvent: r, deadlineMins: dM });
        }
      }
    }
    return out;
  }, [sortedEvents]);

  if (datedEvents.length === 0) return null;

  const numRows = sortedEvents.length;
  const svgHeight = HEADER_H + numRows * ROW_HEIGHT + 6;
  const chartAreaHeight = svgHeight - HEADER_H;
  const numSteps = Math.round(totalMinutes / 30);

  return (
    <section
      id="visual-timeline-gantt-section"
      className={`rounded-xl border transition-colors bg-white dark:bg-[#121215] overflow-hidden ${
        directOverlaps.length > 0
          ? "border-red-500/30 dark:border-red-500/20"
          : "border-zinc-200 dark:border-zinc-800"
      }`}
    >
      {/* ── Panel Header ─────────────────────────────────────────────────── */}
      <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-200/80 dark:bg-zinc-800 flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4 text-zinc-700 dark:text-zinc-300" strokeWidth={1.75} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                Visual Schedule Timeline & Collision Gantt
              </h2>
              <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                PS-02 §03
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              Diagonal hatch = overlap zone · Dashed crimson = trapped deadline · ±15m nudge on bar hover
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          {directOverlaps.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold text-rose-700 dark:text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/25">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
              {directOverlaps[0]!.duration} MIN OVERLAP
            </span>
          ) : (
            <span
              id="gantt-zero-clash-badge"
              className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/25"
            >
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
              All Clear: 100% Clash-Free Schedule
            </span>
          )}
        </div>
      </div>

      {/* ── Precision SVG Canvas ─────────────────────────────────────────── */}
      <div className="overflow-x-auto bg-white dark:bg-[#0f0f11]">
        <svg
          id="visual-gantt-svg"
          viewBox={`0 0 ${SVG_WIDTH} ${svgHeight}`}
          className="w-full min-w-[700px] font-sans select-none"
          role="img"
          aria-label="PS-02 Interactive Visual Timeline — Precision Schedule Gantt"
        >
          <defs>
            {/* Signature diagonal hatched pattern from Section 03 of PS-02 */}
            <pattern
              id="clash-hatch"
              width="8"
              height="8"
              patternTransform="rotate(45 0 0)"
              patternUnits="userSpaceOnUse"
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="8"
                stroke="rgba(239, 68, 68, 0.14)"
                strokeWidth="1.5"
              />
            </pattern>
          </defs>

          {/* ── Time Axis Header Bar ──────────────────────────────────── */}
          <rect
            x={0}
            y={0}
            width={SVG_WIDTH}
            height={HEADER_H}
            className="fill-zinc-50 dark:fill-zinc-900/60"
          />
          <line
            x1={0}
            y1={HEADER_H}
            x2={SVG_WIDTH}
            y2={HEADER_H}
            className="stroke-zinc-200 dark:stroke-zinc-800"
            strokeWidth={1}
          />

          {/* ── Left Column Divider ───────────────────────────────────── */}
          <line
            x1={LABEL_W}
            y1={0}
            x2={LABEL_W}
            y2={svgHeight}
            className="stroke-zinc-200 dark:stroke-zinc-800"
            strokeWidth={1}
          />

          {/* ── 30-Minute Hairlines & Monospace Header Markers ────────── */}
          {Array.from({ length: numSteps + 1 }, (_, i) => {
            const mins = startMin + i * 30;
            const x = xOf(mins);
            const isHour = mins % 60 === 0;
            const label = format12Hour(fromMinutes(mins));

            return (
              <g key={`axis-step-${i}`}>
                {/* Full-height vertical grid hairline */}
                <line
                  x1={x}
                  y1={HEADER_H}
                  x2={x}
                  y2={svgHeight}
                  className={isHour ? "stroke-zinc-200 dark:stroke-zinc-800" : "stroke-zinc-100 dark:stroke-zinc-900"}
                  strokeWidth={1}
                  strokeDasharray={isHour ? undefined : "3 3"}
                />
                {/* Header tick */}
                <line
                  x1={x}
                  y1={HEADER_H - 6}
                  x2={x}
                  y2={HEADER_H}
                  className={isHour ? "stroke-zinc-400 dark:stroke-zinc-600" : "stroke-zinc-300 dark:stroke-zinc-700"}
                  strokeWidth={isHour ? 1.5 : 1}
                />
                {/* Monospace time markers */}
                {isHour ? (
                  <text
                    x={x}
                    y={AXIS_LABEL_Y}
                    textAnchor="middle"
                    className="fill-zinc-700 dark:fill-zinc-300 font-mono text-[11px] font-semibold tracking-tight"
                  >
                    {label}
                  </text>
                ) : (
                  <text
                    x={x}
                    y={AXIS_LABEL_Y}
                    textAnchor="middle"
                    className="fill-zinc-400 dark:fill-zinc-600 font-mono text-[9px] font-medium"
                  >
                    {label}
                  </text>
                )}
              </g>
            );
          })}

          {/* ── Horizontal Row Dividing Lines ─────────────────────────── */}
          {sortedEvents.map((_, rowIdx) => {
            const y = HEADER_H + (rowIdx + 1) * ROW_HEIGHT;
            return (
              <line
                key={`h-sep-${rowIdx}`}
                x1={0}
                y1={y}
                x2={SVG_WIDTH}
                y2={y}
                className="stroke-zinc-100 dark:stroke-zinc-900"
                strokeWidth={1}
              />
            );
          })}

          {/* ── 2. Diagonal Hatched Overlap Zone (Signature Detail) ───── */}
          {directOverlaps.map((ov, idx) => {
            const x1 = xOf(ov.startMins);
            const x2 = xOf(ov.endMins);
            const w = Math.max(4, x2 - x1);
            const overlapText = `${ov.duration} MIN OVERLAP`;
            const pillW = overlapText.length * 7 + 16;
            const pillX = x1 + w / 2 - pillW / 2;
            const pillY = svgHeight - 16;

            return (
              <g key={`overlap-${idx}`} id="shaded-overlap-zone">
                {/* Full-height hatched column */}
                <rect
                  x={x1}
                  y={HEADER_H}
                  width={w}
                  height={chartAreaHeight}
                  fill="url(#clash-hatch)"
                />
                {/* 1px dashed red vertical left hairline */}
                <line
                  x1={x1}
                  y1={HEADER_H}
                  x2={x1}
                  y2={svgHeight}
                  stroke="#ef4444"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
                {/* 1px dashed red vertical right hairline */}
                <line
                  x1={x2}
                  y1={HEADER_H}
                  x2={x2}
                  y2={svgHeight}
                  stroke="#ef4444"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
                {/* Crisp monospace pill at bottom */}
                <rect
                  x={pillX}
                  y={pillY - 14}
                  width={pillW}
                  height={18}
                  rx={4}
                  className="fill-red-50 dark:fill-red-950/80 stroke-red-300 dark:stroke-red-800"
                  strokeWidth={1}
                />
                <text
                  x={x1 + w / 2}
                  y={pillY}
                  textAnchor="middle"
                  className="text-[11px] font-mono font-semibold fill-red-600 dark:fill-red-400"
                >
                  {overlapText}
                </text>
              </g>
            );
          })}

          {/* ── 3. Vertical Dashed Crimson Line for Trapped Deadlines ──── */}
          {trappedDeadlines.map((td, idx) => {
            const dX = xOf(td.deadlineMins);
            // Connect straight from HEADER down to the deadline row
            const deadlineRowIdx = sortedEvents.findIndex((e) => e.id === td.deadline.id);
            const lineBottom = deadlineRowIdx >= 0
              ? HEADER_H + deadlineRowIdx * ROW_HEIGHT + BAR_Y_OFFSET + BAR_HEIGHT / 2
              : svgHeight;

            return (
              <g key={`trapped-line-${idx}`} id="deadline-trapped-vertical-line">
                {/* Vertical dashed crimson line extending from header through Guest Lecture */}
                <line
                  x1={dX}
                  y1={HEADER_H}
                  x2={dX}
                  y2={lineBottom}
                  stroke="#dc2626"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                />
              </g>
            );
          })}

          {/* ── Event Rows (Test, Lecture, Deadline) ───────────────────── */}
          {sortedEvents.map((ev, rowIdx) => {
            const rowY = HEADER_H + rowIdx * ROW_HEIGHT;
            const isDeadline = ev.type === "Deadline";
            const startM = toMinutes(ev.startTime);
            const endM = toMinutes(ev.endTime || ev.startTime);
            const barX = xOf(startM);
            const barW = Math.max(8, xOf(isDeadline ? startM : endM) - barX);
            const barY = rowY + BAR_Y_OFFSET;
            const isHovered = hoveredEventId === ev.id;
            const isHighlighted = activeHighlightedEventId === ev.id;
            const style = EVENT_STYLES[ev.type] ?? DEFAULT_STYLE;
            const isDimmed = hoveredEventId !== null && !isHovered && !isHighlighted;

            // Check if this deadline is trapped
            const isTrapped = trappedDeadlines.some((td) => td.deadline.id === ev.id);

            return (
              <g
                key={ev.id}
                id={`timeline-row-${ev.id}`}
                onMouseEnter={() => {
                  setHoveredEventId(ev.id);
                  setActiveHighlightedEventId(ev.id);
                }}
                onMouseLeave={() => {
                  setHoveredEventId(null);
                  setActiveHighlightedEventId(null);
                }}
                onClick={() =>
                  setActiveHighlightedEventId(isHighlighted ? null : ev.id)
                }
                className="cursor-pointer"
                opacity={isDimmed ? 0.6 : 1}
                style={{ transition: "opacity 0.15s ease-out" }}
              >
                {/* Row Hover Background */}
                {(isHovered || isHighlighted) && (
                  <rect
                    x={0}
                    y={rowY}
                    width={SVG_WIDTH}
                    height={ROW_HEIGHT}
                    className={
                      isHighlighted
                        ? "fill-blue-500/10"
                        : "fill-zinc-100/60 dark:fill-zinc-800/40"
                    }
                  />
                )}

                {/* Left Column Row Labels (180px) */}
                <text
                  x={LABEL_W - 14}
                  y={rowY + BAR_Y_OFFSET + 14}
                  textAnchor="end"
                  className={`text-xs font-medium ${
                    isHighlighted
                      ? "fill-blue-600 dark:fill-blue-400 font-bold"
                      : "fill-zinc-700 dark:fill-zinc-300"
                  }`}
                >
                  {ev.title.length > 21 ? ev.title.slice(0, 20) + "…" : ev.title}
                </text>
                <text
                  x={LABEL_W - 14}
                  y={rowY + BAR_Y_OFFSET + 27}
                  textAnchor="end"
                  className="fill-zinc-400 dark:fill-zinc-500 font-mono text-[10px] tabular-nums"
                >
                  {isDeadline
                    ? `by ${format12Hour(ev.startTime)}`
                    : `${format12Hour(ev.startTime)} – ${format12Hour(ev.endTime)}`}
                </text>

                {/* ── 3. Precision Event Bars (Test & Lecture) ────────── */}
                {!isDeadline && (
                  <g>
                    {/* Sleek 32px-tall bar (rounded-md) */}
                    <rect
                      x={barX}
                      y={barY}
                      width={barW}
                      height={BAR_HEIGHT}
                      rx={6}
                      fill={style.fill}
                      fillOpacity={isHighlighted ? 1 : 0.9}
                      className="transition-all"
                    />
                    {/* 3px solid left accent border */}
                    <rect
                      x={barX}
                      y={barY}
                      width={3}
                      height={BAR_HEIGHT}
                      rx={1.5}
                      fill={style.accent}
                    />

                    {/* Monospace time range inside the bar */}
                    {barW > 60 && (
                      <text
                        x={barX + 10}
                        y={barY + 14}
                        fill={style.textFill}
                        className="font-mono text-xs font-semibold"
                      >
                        {format12Hour(ev.startTime)} – {format12Hour(ev.endTime)}
                      </text>
                    )}

                    {/* Venue tag inside the bar */}
                    {barW > 120 && ev.venue && ev.venue !== "TBD" && (
                      <text
                        x={barX + 10}
                        y={barY + 26}
                        fill="rgba(255,255,255,0.85)"
                        className="font-mono text-[10px]"
                      >
                        {ev.venue}
                      </text>
                    )}

                    {/* ── 4. Tactile Quick-Nudge Controls on Bar Hover ──── */}
                    {isHovered && (
                      <>
                        {/* -15m button (left edge) */}
                        <g
                          onClick={(e) => {
                            e.stopPropagation();
                            nudgeEvent(ev.id, -15);
                          }}
                          className="cursor-pointer"
                          role="button"
                          aria-label={`Nudge ${ev.title} earlier by 15 minutes`}
                        >
                          <rect
                            x={barX - 26}
                            y={barY + (BAR_HEIGHT - 22) / 2}
                            width={22}
                            height={22}
                            rx={4}
                            className="fill-zinc-900 dark:fill-zinc-100 stroke-zinc-700 dark:stroke-zinc-300"
                            strokeWidth={1}
                          />
                          <text
                            x={barX - 15}
                            y={barY + (BAR_HEIGHT - 22) / 2 + 15}
                            textAnchor="middle"
                            className="fill-zinc-100 dark:fill-zinc-900 font-mono text-[10px] font-bold"
                          >
                            -15
                          </text>
                        </g>

                        {/* +15m button (right edge) */}
                        <g
                          onClick={(e) => {
                            e.stopPropagation();
                            nudgeEvent(ev.id, 15);
                          }}
                          className="cursor-pointer"
                          role="button"
                          aria-label={`Nudge ${ev.title} later by 15 minutes`}
                        >
                          <rect
                            x={barX + barW + 4}
                            y={barY + (BAR_HEIGHT - 22) / 2}
                            width={22}
                            height={22}
                            rx={4}
                            className="fill-zinc-900 dark:fill-zinc-100 stroke-zinc-700 dark:stroke-zinc-300"
                            strokeWidth={1}
                          />
                          <text
                            x={barX + barW + 15}
                            y={barY + (BAR_HEIGHT - 22) / 2 + 15}
                            textAnchor="middle"
                            className="fill-zinc-100 dark:fill-zinc-900 font-mono text-[10px] font-bold"
                          >
                            +15
                          </text>
                        </g>
                      </>
                    )}
                  </g>
                )}

                {/* ── 3. Deadline Row: Sharp 12×12 Vector Diamond (◆) ── */}
                {isDeadline && (
                  <g id={`deadline-diamond-${ev.id}`}>
                    {/* Centered 12×12 rotated square diamond */}
                    <rect
                      x={barX - 6}
                      y={barY + BAR_HEIGHT / 2 - 6}
                      width={12}
                      height={12}
                      rx={1}
                      fill="#ef4444"
                      stroke="#ffffff"
                      strokeWidth={1.5}
                      transform={`rotate(45 ${barX} ${barY + BAR_HEIGHT / 2})`}
                      className="drop-shadow-xs"
                    />

                    {/* Label: right-aligned font-mono text-xs font-medium text-red-600 dark:text-red-400 */}
                    <text
                      x={barX + 14}
                      y={barY + BAR_HEIGHT / 2 + 4}
                      className="font-mono text-xs font-medium fill-red-600 dark:fill-red-400"
                    >
                      {isTrapped
                        ? `${format12Hour(ev.startTime)} (inside the lecture)`
                        : `${format12Hour(ev.startTime)} Deadline`}
                    </text>

                    {/* Quick-nudge controls on deadline hover as well */}
                    {isHovered && (
                      <>
                        <g
                          onClick={(e) => {
                            e.stopPropagation();
                            nudgeEvent(ev.id, -15);
                          }}
                          className="cursor-pointer"
                        >
                          <rect
                            x={barX - 32}
                            y={barY + (BAR_HEIGHT - 22) / 2}
                            width={22}
                            height={22}
                            rx={4}
                            className="fill-zinc-900 dark:fill-zinc-100 stroke-zinc-700 dark:stroke-zinc-300"
                            strokeWidth={1}
                          />
                          <text
                            x={barX - 21}
                            y={barY + (BAR_HEIGHT - 22) / 2 + 15}
                            textAnchor="middle"
                            className="fill-zinc-100 dark:fill-zinc-900 font-mono text-[10px] font-bold"
                          >
                            -15
                          </text>
                        </g>
                        <g
                          onClick={(e) => {
                            e.stopPropagation();
                            nudgeEvent(ev.id, 15);
                          }}
                          className="cursor-pointer"
                        >
                          <rect
                            x={barX + (isTrapped ? 210 : 120)}
                            y={barY + (BAR_HEIGHT - 22) / 2}
                            width={22}
                            height={22}
                            rx={4}
                            className="fill-zinc-900 dark:fill-zinc-100 stroke-zinc-700 dark:stroke-zinc-300"
                            strokeWidth={1}
                          />
                          <text
                            x={barX + (isTrapped ? 221 : 131)}
                            y={barY + (BAR_HEIGHT - 22) / 2 + 15}
                            textAnchor="middle"
                            className="fill-zinc-100 dark:fill-zinc-900 font-mono text-[10px] font-bold"
                          >
                            +15
                          </text>
                        </g>
                      </>
                    )}
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* ── Accessible Bottom Nudge Tray ─────────────────────────────────── */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 px-5 py-3.5 flex flex-col gap-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" strokeWidth={1.75} />
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400">
              Interactive Time Scrubbing (15-Minute Nudge Controls)
            </span>
          </div>

          {rescheduleMap.size > 0 && directOverlaps.length > 0 && (
            <button
              id="timeline-auto-reschedule-btn"
              onClick={() => {
                const id = Array.from(rescheduleMap.keys())[0];
                if (id) previewReschedule(id);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-xs transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Auto-Shift to Conflict-Free Slot</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {sortedEvents.map((ev) => {
            const isDeadline = ev.type === "Deadline";
            const style = EVENT_STYLES[ev.type] ?? DEFAULT_STYLE;

            return (
              <div
                key={`nudge-tray-${ev.id}`}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: style.fill }}
                  />
                  <div className="min-w-0">
                    <span className="block text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {ev.title}
                    </span>
                    <span className="block font-mono text-[10px] tabular-nums text-zinc-500 dark:text-zinc-400">
                      {isDeadline
                        ? `by ${format12Hour(ev.startTime)}`
                        : `${format12Hour(ev.startTime)} – ${format12Hour(ev.endTime)}`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    id={`nudge-back-${ev.id}`}
                    onClick={() => nudgeEvent(ev.id, -15)}
                    aria-label={`Nudge ${ev.title} earlier by 15 minutes`}
                    className="flex items-center gap-0.5 px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[10px] font-mono font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer"
                    title="-15m"
                  >
                    <ChevronLeft className="w-3 h-3" strokeWidth={2} />
                    <span>15m</span>
                  </button>
                  <button
                    id={`nudge-forward-${ev.id}`}
                    onClick={() => nudgeEvent(ev.id, 15)}
                    aria-label={`Nudge ${ev.title} later by 15 minutes`}
                    className="flex items-center gap-0.5 px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[10px] font-mono font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer"
                    title="+15m"
                  >
                    <span>15m</span>
                    <ChevronRight className="w-3 h-3" strokeWidth={2} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dynamic Collision Status Bar */}
        <div className="flex items-center gap-2 pt-0.5">
          {directOverlaps.length > 0 ? (
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-rose-700 dark:text-rose-400">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
              <span>
                Active collision: <span className="font-mono font-bold">{directOverlaps[0]!.duration} min</span> overlap between
                &ldquo;{directOverlaps[0]!.eventA.title}&rdquo; and &ldquo;{directOverlaps[0]!.eventB.title}&rdquo;.
                Nudge either event to resolve live.
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
              <span>All session intervals are conflict-free. Zero temporal overlap.</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
