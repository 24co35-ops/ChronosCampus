"use client";
import React, { useState } from "react";
import { useStore } from "@/src/store";
import type { ReviewedEvent, FieldStatus, EventType } from "@/src/types";
import { generateIcs } from "@/src/lib/ics";
import {
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  XCircle,
  Download,
  Undo2,
  Redo2,
  Trash2,
  Plus,
  Calendar,
  Clock,
  MapPin,
  Users,
  Sparkles,
} from "lucide-react";

const STATUS_CONFIG: Record<
  FieldStatus,
  { icon: React.ReactNode; label: string; badgeClass: string }
> = {
  matched: {
    icon: <CheckCircle2 className="w-3 h-3 text-emerald-500" />,
    label: "Exact Match",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  "user-confirmed": {
    icon: <CheckCircle2 className="w-3 h-3 text-blue-500" />,
    label: "User Confirmed",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
  inferred: {
    icon: <HelpCircle className="w-3 h-3 text-amber-500" />,
    label: "Inferred",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
  },
  "needs-review": {
    icon: <AlertCircle className="w-3 h-3 text-orange-500" />,
    label: "Needs Review",
    badgeClass: "bg-orange-50 text-orange-700 border-orange-200",
  },
  missing: {
    icon: <XCircle className="w-3 h-3 text-rose-500" />,
    label: "Missing",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
  },
};

const TYPE_STYLES: Record<EventType, { bg: string; text: string; border: string }> = {
  Test: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  Deadline: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  Lecture: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  Other: { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" },
};

export function EditableGrid() {
  const { events, updateEvent, deleteEvent, addEvent } = useStore();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Temporal undo/redo subscriptions
  const temporal = (useStore as any).temporal?.getState();
  const pastCount = temporal?.pastStates?.length ?? 0;
  const futureCount = temporal?.futureStates?.length ?? 0;

  if (events.length === 0) return null;

  const handleExportIcs = () => {
    const icsContent = generateIcs(events);
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ChronosCampus_Schedule_${new Date().toISOString().slice(0, 10)}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleAddManual = () => {
    const newId = `manual-${Date.now()}`;
    const newEvent: ReviewedEvent = {
      id: newId,
      title: "New Scheduled Event",
      type: "Lecture",
      dateISO: "2026-11-13",
      startTime: "13:00",
      endTime: "14:00",
      venue: "Hall A",
      audience: null,
      timeZone: "Asia/Kolkata",
      rawSource: "Manual addition",
      sourceSpans: [],
      fieldStatus: {
        title: "user-confirmed",
        type: "user-confirmed",
        date: "user-confirmed",
        startTime: "user-confirmed",
        endTime: "user-confirmed",
        venue: "user-confirmed",
        audience: "missing",
      },
      confirmed: true,
    };
    addEvent(newEvent);
  };

  return (
    <section className="flex flex-col gap-4">
      {/* Header toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Extracted Schedule Events</h2>
            <p className="text-xs text-slate-500">
              {events.length} event{events.length === 1 ? "" : "s"} extracted · Review and edit inline
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Undo / Redo */}
          <button
            id="undo-btn"
            onClick={() => temporal?.undo()}
            disabled={pastCount === 0}
            title={`Undo edit (${pastCount} available)`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo</span>
            {pastCount > 0 && <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded-full">{pastCount}</span>}
          </button>

          <button
            id="redo-btn"
            onClick={() => temporal?.redo()}
            disabled={futureCount === 0}
            title={`Redo edit (${futureCount} available)`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <Redo2 className="w-3.5 h-3.5" />
            <span>Redo</span>
            {futureCount > 0 && <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded-full">{futureCount}</span>}
          </button>

          {/* Add Manual Event */}
          <button
            id="add-event-btn"
            onClick={handleAddManual}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Event</span>
          </button>

          {/* Export to ICS */}
          <button
            id="export-ics-btn"
            onClick={handleExportIcs}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export .ics</span>
          </button>
        </div>
      </div>

      {/* Events List */}
      <div className="flex flex-col gap-3">
        {events.map((e) => (
          <EventCard
            key={e.id}
            event={e}
            onUpdate={updateEvent}
            onDelete={deleteEvent}
          />
        ))}
      </div>
    </section>
  );
}

function EventCard({
  event: e,
  onUpdate,
  onDelete,
}: {
  event: ReviewedEvent;
  onUpdate: (id: string, patch: Partial<ReviewedEvent>) => void;
  onDelete: (id: string) => void;
}) {
  const typeStyle = TYPE_STYLES[e.type] || TYPE_STYLES["Other"];

  function renderField(
    label: string,
    key: keyof ReviewedEvent,
    statusKey: keyof typeof e.fieldStatus,
    type: "text" | "time" | "date" = "text",
    placeholder = ""
  ) {
    const val = String(e[key] ?? "");
    const status = e.fieldStatus[statusKey] ?? "matched";
    const statusCfg = STATUS_CONFIG[status];

    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
            {label}
          </label>
          <span
            className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md border ${statusCfg.badgeClass}`}
            title={`Status: ${statusCfg.label}`}
          >
            {statusCfg.icon}
            {statusCfg.label}
          </span>
        </div>
        <input
          id={`event-${e.id}-${key}`}
          type={type}
          placeholder={placeholder}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-2xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition"
          value={val}
          onChange={(ev) =>
            onUpdate(e.id, {
              [key]: ev.target.value,
              fieldStatus: { ...e.fieldStatus, [statusKey]: "user-confirmed" },
            })
          }
        />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:shadow-sm">
      {/* Top row */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border}`}>
            {e.type}
          </span>
          <select
            id={`event-${e.id}-type-select`}
            value={e.type}
            onChange={(ev) =>
              onUpdate(e.id, {
                type: ev.target.value as EventType,
                fieldStatus: { ...e.fieldStatus, type: "user-confirmed" },
              })
            }
            className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-2 py-0.5 focus:outline-none"
          >
            <option value="Test">Test</option>
            <option value="Deadline">Deadline</option>
            <option value="Lecture">Lecture</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <button
          id={`delete-event-${e.id}`}
          onClick={() => onDelete(e.id)}
          className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-md transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Remove</span>
        </button>
      </div>

      {/* Grid of Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderField("Event Title", "title", "title", "text", "e.g. Midterm Test")}
        {renderField("Date (YYYY-MM-DD)", "dateISO", "date", "text", "YYYY-MM-DD")}
        {renderField("Start Time (HH:mm)", "startTime", "startTime", "text", "10:00")}
        {renderField("End Time (HH:mm)", "endTime", "endTime", "text", "11:30")}
        {renderField("Venue", "venue", "venue", "text", "e.g. Room 204 / Online")}
        {renderField("Target Audience", "audience", "audience", "text", "e.g. III-year CSE")}
      </div>

      {/* Evidence snippet */}
      {e.rawSource && (
        <details className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
          <summary className="cursor-pointer font-medium hover:text-indigo-600 transition inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span>View Source Evidence Span</span>
          </summary>
          <div className="mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-600 leading-relaxed">
            &ldquo;{e.rawSource}&rdquo;
          </div>
        </details>
      )}
    </div>
  );
}
