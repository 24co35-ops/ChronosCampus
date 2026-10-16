"use client";
import React, { useState } from "react";
import { useStore } from "@/src/store";
import { toMins, fromMins } from "@/src/lib/clash";
import { Clock, Layers, Calendar, Info } from "lucide-react";

const W = 720;
const H_ROW = 42;
const LABEL_W = 180;
const CHART_W = W - LABEL_W;

const EVENT_STYLES: Record<
  string,
  { fill: string; stroke: string; text: string; bg: string }
> = {
  Test: { fill: "#6366f1", stroke: "#4f46e5", text: "#4338ca", bg: "#e0e7ff" },
  Deadline: { fill: "#f59e0b", stroke: "#d97706", text: "#b45309", bg: "#fef3c7" },
  Lecture: { fill: "#10b981", stroke: "#059669", text: "#047857", bg: "#d1fae5" },
  Other: { fill: "#64748b", stroke: "#475569", text: "#334155", bg: "#f1f5f9" },
};

export function GanttTimeline() {
  const { events, clashes } = useStore();
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);

  const dated = events.filter((e) => e.dateISO && e.startTime);
  if (dated.length === 0) return null;

  // Compute adaptive hour boundaries
  const allMins = dated.flatMap((e) => [
    toMins(e.startTime),
    e.endTime ? toMins(e.endTime) : toMins(e.startTime) + 60,
  ]);
  const minHour = Math.max(6, Math.min(8, Math.floor(Math.min(...allMins) / 60)));
  const maxHour = Math.min(24, Math.max(14, Math.ceil(Math.max(...allMins) / 60) + 1));

  const totalMins = (maxHour - minHour) * 60;
  function xOf(hhmm: string) {
    const clamped = Math.max(minHour * 60, Math.min(maxHour * 60, toMins(hhmm)));
    return ((clamped - minHour * 60) / totalMins) * CHART_W;
  }

  const svgH = dated.length * H_ROW + 46;
  const numHours = maxHour - minHour;

  return (
    <section className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Visual Gantt Schedule Timeline</h2>
            <p className="text-xs text-slate-500">
              Deterministic horizontal timeline mapping scheduled intervals and due instants
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 font-medium text-slate-600">
            <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 inline-block" /> Test
          </span>
          <span className="flex items-center gap-1.5 font-medium text-slate-600">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Lecture
          </span>
          <span className="flex items-center gap-1.5 font-medium text-slate-600">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" /> Deadline (◆)
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50/40 p-3">
        <svg
          id="gantt-svg"
          viewBox={`0 0 ${W} ${svgH}`}
          className="w-full font-sans select-none"
          role="img"
          aria-label="ChronosCampus Schedule Timeline"
        >
          <defs>
            <linearGradient id="grid-fade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f1f5f9" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.2" />
            </linearGradient>
            <pattern id="clash-stripe" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="4" height="8" fill="#fee2e2" />
              <rect x="4" width="4" height="8" fill="#fecaca" />
            </pattern>
          </defs>

          {/* Time axis background */}
          <rect x={LABEL_W} y={0} width={CHART_W} height={svgH - 24} fill="url(#grid-fade)" rx={4} />

          {/* Vertical hour grid lines */}
          {Array.from({ length: numHours + 1 }, (_, i) => {
            const h = minHour + i;
            const x = LABEL_W + (i / numHours) * CHART_W;
            const label = `${String(h).padStart(2, "0")}:00`;

            return (
              <g key={i}>
                <line
                  x1={x}
                  y1={0}
                  x2={x}
                  y2={svgH - 24}
                  stroke="#e2e8f0"
                  strokeWidth={1}
                  strokeDasharray={i === 0 || i === numHours ? "" : "2 2"}
                />
                <text
                  x={x}
                  y={svgH - 8}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize={10}
                  fontWeight={500}
                >
                  {label}
                </text>
              </g>
            );
          })}

          {/* Event rows and bars */}
          {dated.map((e, i) => {
            const y = i * H_ROW + 8;
            const x1 = LABEL_W + xOf(e.startTime);
            const x2 = e.endTime ? LABEL_W + xOf(e.endTime) : x1 + 10;
            const style = EVENT_STYLES[e.type] ?? EVENT_STYLES["Other"]!;
            const isDeadline = e.type === "Deadline";
            const barW = Math.max(8, x2 - x1);
            const isHovered = hoveredEventId === e.id;

            return (
              <g
                key={e.id}
                onMouseEnter={() => setHoveredEventId(e.id)}
                onMouseLeave={() => setHoveredEventId(null)}
                className="cursor-pointer transition-opacity"
                opacity={hoveredEventId && !isHovered ? 0.6 : 1}
              >
                {/* Row divider */}
                <line
                  x1={0}
                  y1={y + H_ROW - 4}
                  x2={W}
                  y2={y + H_ROW - 4}
                  stroke="#f1f5f9"
                  strokeWidth={1}
                />

                {/* Left Label */}
                <text
                  x={LABEL_W - 12}
                  y={y + 18}
                  textAnchor="end"
                  fill="#1e293b"
                  fontSize={12}
                  fontWeight={600}
                >
                  {e.title.length > 22 ? `${e.title.slice(0, 20)}…` : e.title}
                </text>
                <text
                  x={LABEL_W - 12}
                  y={y + 30}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize={10}
                >
                  {isDeadline ? `Due at ${e.startTime}` : `${e.startTime} – ${e.endTime || e.startTime}`}
                </text>

                {/* Bar or Point Diamond */}
                {isDeadline ? (
                  <g>
                    {/* Diamond for deadline instant */}
                    <polygon
                      points={`${x1},${y + 4} ${x1 + 10},${y + 16} ${x1},${y + 28} ${x1 - 10},${y + 16}`}
                      fill={style.fill}
                      stroke={style.stroke}
                      strokeWidth={2}
                    />
                    <line
                      x1={x1}
                      y1={0}
                      x2={x1}
                      y2={svgH - 24}
                      stroke={style.fill}
                      strokeWidth={1.5}
                      strokeDasharray="3 3"
                      opacity={0.4}
                    />
                  </g>
                ) : (
                  <g>
                    {/* Event interval bar */}
                    <rect
                      x={x1}
                      y={y + 4}
                      width={barW}
                      height={24}
                      rx={6}
                      fill={style.fill}
                      stroke={style.stroke}
                      strokeWidth={isHovered ? 2 : 1}
                      opacity={isHovered ? 1 : 0.9}
                    />
                    {barW > 40 && (
                      <text
                        x={x1 + 8}
                        y={y + 20}
                        fill="#ffffff"
                        fontSize={11}
                        fontWeight={500}
                      >
                        {e.venue ? `${e.startTime} · ${e.venue}` : e.startTime}
                      </text>
                    )}
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span>
          Horizontal scale is mathematically mapped to Indian standard day hours. Overlapping bars denote simultaneous time intervals.
        </span>
      </div>
    </section>
  );
}
