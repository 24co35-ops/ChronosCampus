"use client";

/**
 * EditableEventGrid.tsx — Linear/Airtable-grade Interactive Data Grid
 *
 * Implements PS-02 Human-in-the-Loop event validation and tactile spreadsheet editing:
 * 1. Flush, borderless interactive data cells with subtle hover highlights and 1px focus rings.
 * 2. Pencil micro-icon that emerges on cell hover.
 * 3. Human-readable PS-02 timing formats with instantaneous inline validation (endTime >= startTime).
 * 4. Bi-directional hover synchronization (raw text, Gantt timeline, and clash matrix).
 * 5. Edited row tracking with 1-click Reset Row and global Undo/Redo (⌘Z / ⌘⇧Z).
 * 6. Responsive mobile card transformation (<768px) with 3-column monospace metadata strip.
 */

import React, { useState, useEffect, useRef } from "react";
import { useStore } from "@/src/store";
import { useNoticeStore } from "@/src/store/useNoticeStore";
import type { ReviewedEvent, EventType } from "@/src/types";
import { generateIcs } from "@/src/lib/ics";
import { format12Hour } from "@/src/lib/clash/pairwiseEngine";
import { KeyboardShortcutBar } from "./KeyboardShortcutBar";
import {
  CheckCircle2,
  AlertTriangle,
  Diamond,
  Plus,
  Trash2,
  Undo2,
  Redo2,
  Download,
  Calendar,
  Clock,
  MapPin,
  FileText,
  Users,
  Code2,
  Rss,
  ExternalLink,
  Camera,
  Pencil,
  RotateCcw,
} from "lucide-react";
import { RawIcsPreviewDrawer } from "./RawIcsPreviewDrawer";
import { WebcalModal } from "./WebcalModal";
import { ShareableScheduleCard } from "./ShareableScheduleCard";
import { buildGoogleCalendarUrl, buildOutlookWebUrl } from "@/src/lib/ics/calendarLinks";

const TYPE_CONFIG: Record<
  EventType,
  { label: string; badge: string; border: string; bg: string }
> = {
  Test: {
    label: "Test",
    badge: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/25",
    border: "border-blue-500/25",
    bg: "bg-blue-500/5",
  },
  Deadline: {
    label: "Deadline",
    badge: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30",
    border: "border-rose-500/30",
    bg: "bg-rose-500/5",
  },
  Lecture: {
    label: "Lecture",
    badge: "bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-500/25",
    border: "border-violet-500/25",
    bg: "bg-violet-500/5",
  },
  Other: {
    label: "Other",
    badge: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border border-zinc-500/25",
    border: "border-zinc-500/25",
    bg: "bg-zinc-500/5",
  },
};

function formatDisplayDate(dateISO: string): string {
  if (!dateISO) return "No Date";
  const parts = dateISO.split("-");
  if (parts.length < 3) return dateISO;
  const [y, m, d] = parts;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const mIdx = parseInt(m ?? "1", 10) - 1;
  const monthName = months[mIdx] || "Nov";
  return `${d} ${monthName} ${y}`;
}

export function EditableEventGrid() {
  const storeEvents = useStore((s) => s.events);
  const noticeEvents = useNoticeStore((s) => s.events);
  const noticeClashes = useNoticeStore((s) => s.pairwiseClashes);
  const noticeRecommendations = useNoticeStore((s) => s.recommendations);
  const { updateEvent, deleteEvent, addEvent } = useStore();
  const activeHighlightedEventId = useNoticeStore((s) => s.activeHighlightedEventId);
  const setActiveHighlightedEventId = useNoticeStore((s) => s.setActiveHighlightedEventId);

  const [isIcsInspectorOpen, setIsIcsInspectorOpen] = useState(false);
  const [isWebcalModalOpen, setIsWebcalModalOpen] = useState(false);
  const [isShareCardOpen, setIsShareCardOpen] = useState(false);
  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);

  // Snapshot map of initial detected events to track which rows have been modified
  const initialEventsMapRef = useRef<Map<string, ReviewedEvent>>(new Map());

  const events: ReviewedEvent[] = storeEvents.length > 0 ? storeEvents : noticeEvents.map((e) => ({
    id: e.id,
    title: e.title,
    type: e.type as EventType,
    dateISO: e.dateISO,
    startTime: e.startTime,
    endTime: e.endTime,
    venue: e.venue || "TBD",
    audience: e.cohort,
    timeZone: "Asia/Kolkata",
    rawSource: "",
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

  // Seed snapshot of initial events
  useEffect(() => {
    events.forEach((ev) => {
      if (!initialEventsMapRef.current.has(ev.id)) {
        initialEventsMapRef.current.set(ev.id, { ...ev });
      }
    });
  }, [events]);

  // Check if a specific row has been edited
  const isRowEdited = (e: ReviewedEvent) => {
    const initial = initialEventsMapRef.current.get(e.id);
    if (!initial) return false;
    return (
      e.title !== initial.title ||
      e.type !== initial.type ||
      e.dateISO !== initial.dateISO ||
      e.startTime !== initial.startTime ||
      e.endTime !== initial.endTime ||
      e.venue !== initial.venue
    );
  };

  const hasAnyEditedRow = events.some(isRowEdited);

  const handleResetRow = (id: string) => {
    const initial = initialEventsMapRef.current.get(id);
    if (initial) {
      updateEvent(id, {
        title: initial.title,
        type: initial.type,
        dateISO: initial.dateISO,
        startTime: initial.startTime,
        endTime: initial.endTime,
        venue: initial.venue,
      });
    }
  };

  const handleResetAll = () => {
    events.forEach((e) => {
      const initial = initialEventsMapRef.current.get(e.id);
      if (initial) {
        updateEvent(e.id, {
          title: initial.title,
          type: initial.type,
          dateISO: initial.dateISO,
          startTime: initial.startTime,
          endTime: initial.endTime,
          venue: initial.venue,
        });
      }
    });
  };

  // Temporal undo/redo subscriptions from useStore zundo temporal middleware
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const temporal = (useStore as any).temporal?.getState();
  const pastCount = temporal?.pastStates?.length ?? 0;
  const futureCount = temporal?.futureStates?.length ?? 0;

  // Global ⌘Z / Ctrl+Z keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        const activeEl = document.activeElement;
        const isTextInput = activeEl?.tagName === "INPUT" && (activeEl as HTMLInputElement).type === "text";
        if (!isTextInput) {
          e.preventDefault();
          if (e.shiftKey) {
            temporal?.redo ? temporal.redo() : useNoticeStore.getState().redo();
          } else {
            temporal?.undo ? temporal.undo() : useNoticeStore.getState().undo();
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [temporal]);

  if (events.length === 0) return null;

  const handleExportIcs = () => {
    const icsContent = generateIcs(events);
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const eventDate = events[0]?.dateISO || new Date().toISOString().slice(0, 10);
    a.download = `chronoscampus-schedule-${eventDate}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleAddEvent = () => {
    const newId = `manual-${Date.now()}`;
    const newEvent: ReviewedEvent = {
      id: newId,
      title: "New Academic Session",
      type: "Lecture",
      dateISO: "2026-11-13",
      startTime: "13:00",
      endTime: "14:00",
      venue: "Room 101",
      audience: "All Students",
      timeZone: "Asia/Kolkata",
      rawSource: "Manual addition by user",
      sourceSpans: [],
      fieldStatus: {
        title: "user-confirmed",
        type: "user-confirmed",
        date: "user-confirmed",
        startTime: "user-confirmed",
        endTime: "user-confirmed",
        venue: "user-confirmed",
        audience: "user-confirmed",
      },
      confirmed: true,
    };
    addEvent(newEvent);
  };

  const handleTypeChange = (id: string, currentStartTime: string, newType: EventType) => {
    const ev = events.find((item) => item.id === id);
    if (newType === "Deadline") {
      updateEvent(id, {
        type: newType,
        endTime: currentStartTime,
      });
    } else {
      let newEndTime = ev?.endTime || currentStartTime;
      if (newEndTime === currentStartTime) {
        const parts = currentStartTime.split(":");
        const h = parseInt(parts[0] || "12", 10);
        const m = parseInt(parts[1] || "00", 10);
        const total = Math.min(1439, h * 60 + m + 60);
        const nh = String(Math.floor(total / 60)).padStart(2, "0");
        const nm = String(total % 60).padStart(2, "0");
        newEndTime = `${nh}:${nm}`;
      }
      updateEvent(id, { type: newType, endTime: newEndTime });
    }
  };

  const handleSwapTimes = (id: string, start: string, end: string) => {
    updateEvent(id, { startTime: end, endTime: start });
  };

  const handleStartTimeChange = (event: ReviewedEvent, newStart: string) => {
    if (event.type === "Deadline") {
      updateEvent(event.id, {
        startTime: newStart,
        endTime: newStart,
      });
    } else {
      updateEvent(event.id, { startTime: newStart });
    }
  };

  return (
    <section
      aria-label="Interactive Event Review & Correction Grid"
      className="flex flex-col gap-3"
    >
      {/* Quick Keyboard Shortcut & Accessibility Bar */}
      <KeyboardShortcutBar />

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] overflow-hidden flex flex-col shadow-xs">
        {/* Top Header & Linear/Airtable Grid Toolbar */}
        <div className="p-4 sm:px-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
              02
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                  Review & Fix Detected Events
                </h2>
                <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                  {events.length} Events
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Automatic detection can be wrong — click any field to edit before export
              </p>
            </div>
          </div>

          {/* Grid Toolbar Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Undo Button */}
            <button
              id="undo-btn"
              onClick={() => (temporal?.undo ? temporal.undo() : useNoticeStore.getState().undo())}
              disabled={pastCount === 0}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition cursor-pointer"
              title="Undo previous edit (⌘Z)"
            >
              <Undo2 className="w-3.5 h-3.5 text-zinc-500" strokeWidth={1.75} />
              <span>Undo</span>
              {pastCount > 0 && <span className="font-mono text-[10px] text-zinc-400">({pastCount})</span>}
            </button>

            {/* Redo Button */}
            <button
              id="redo-btn"
              onClick={() => (temporal?.redo ? temporal.redo() : useNoticeStore.getState().redo())}
              disabled={futureCount === 0}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition cursor-pointer"
              title="Redo edit (⌘⇧Z)"
            >
              <Redo2 className="w-3.5 h-3.5 text-zinc-500" strokeWidth={1.75} />
              <span>Redo</span>
              {futureCount > 0 && <span className="font-mono text-[10px] text-zinc-400">({futureCount})</span>}
            </button>

            {/* Reset All Changes */}
            {hasAnyEditedRow && (
              <button
                onClick={handleResetAll}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 shadow-2xs transition cursor-pointer"
                title="Reset all rows to detected state"
              >
                <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span>Reset All</span>
              </button>
            )}

            {/* + Add Missing Event Button */}
            <button
              id="add-event-btn"
              onClick={handleAddEvent}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 shadow-2xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>+ Add Event</span>
            </button>

            {/* Live webcal:// Batch Feed Button */}
            <button
              id="webcal-feed-btn"
              onClick={() => setIsWebcalModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-blue-500/20 bg-blue-500/10 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:bg-blue-500/20 shadow-2xs transition cursor-pointer"
              title="Live webcal:// auto-syncing calendar feed for Class Representatives"
              aria-label="Open live webcal batch subscription modal"
            >
              <Rss className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" strokeWidth={1.75} />
              <span>webcal:// Feed</span>
            </button>

            {/* Inspect Raw .ics Button */}
            <button
              id="inspect-raw-ics-btn"
              onClick={() => setIsIcsInspectorOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 shadow-2xs transition cursor-pointer"
              title="Inspect raw RFC-5545 .ics syntax and line folding before downloading"
              aria-label="Inspect raw RFC-5545 .ics syntax"
            >
              <Code2 className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" strokeWidth={1.75} />
              <span>Inspect Raw .ics File</span>
            </button>

            {/* Export Clean Schedule Card Button */}
            <button
              id="export-schedule-card-btn"
              onClick={() => setIsShareCardOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-2xs transition cursor-pointer"
              title="Generate high-contrast schedule card & WhatsApp summary for Class Representatives"
            >
              <Camera className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Export Clean Schedule Card</span>
            </button>

            {/* Export RFC-5545 (.ics) Button */}
            <button
              id="export-ics-btn"
              onClick={handleExportIcs}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 shadow-2xs transition cursor-pointer"
              title="Download clean RFC-5545 compliant calendar for Google Calendar / Apple Calendar"
            >
              <Download className="w-3.5 h-3.5 text-emerald-100" strokeWidth={1.75} />
              <span>Export Clean ICS</span>
            </button>
          </div>
        </div>

        {/* Desktop Linear/Airtable Spreadsheet View (>= 768px) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-100/70 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold tracking-wide text-[11px] uppercase tracking-[0.08em]">
                <th className="py-3 px-3 w-12 text-center">#</th>
                <th className="py-3 px-4 min-w-[210px]">Detected event</th>
                <th className="py-3 px-3 w-32">Type</th>
                <th className="py-3 px-3 w-40">Date</th>
                <th className="py-3 px-4 w-60">Time</th>
                <th className="py-3 px-4 min-w-[160px]">Venue</th>
                <th className="py-3 px-3 w-32">Confidence</th>
                <th className="py-3 px-3 w-28 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {events.map((e, idx) => {
                const isDeadline = e.type === "Deadline";
                const typeCfg = TYPE_CONFIG[e.type] || TYPE_CONFIG.Other;
                const isHighlighted = activeHighlightedEventId === e.id;
                const isEdited = isRowEdited(e);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const confidence = (e as any).confidence ?? (e as any).confidenceScore ?? 95;
                const isHighConfidence = confidence >= 80;
                const hasTimeInversion = !isDeadline && Boolean(e.startTime && e.endTime && e.endTime < e.startTime);

                return (
                  <tr
                    key={e.id}
                    id={`event-row-${idx}`}
                    onMouseEnter={() => setActiveHighlightedEventId(e.id)}
                    onMouseLeave={() => setActiveHighlightedEventId(null)}
                    className={`transition-colors ${
                      isHighlighted
                        ? "bg-blue-50/80 dark:bg-blue-950/30"
                        : isEdited
                        ? "bg-blue-50/20 dark:bg-blue-950/10 hover:bg-zinc-50/90 dark:hover:bg-zinc-800/40"
                        : "hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40"
                    }`}
                  >
                    {/* Column 1: Row index + Edited dot indicator */}
                    <td className="py-2.5 px-3 text-center font-mono text-[11px] text-zinc-400 select-none">
                      <div className="flex items-center justify-center gap-1">
                        {isEdited ? (
                          <span
                            className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"
                            title="Modified by user"
                          />
                        ) : (
                          <span>{idx + 1}</span>
                        )}
                      </div>
                    </td>

                    {/* Column 2: Detected Event Title (Tactile Flush Cell) */}
                    <td className="py-2 px-3">
                      <div className="group/cell relative px-2.5 py-1.5 rounded-md transition-colors hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50 focus-within:ring-1 focus-within:ring-blue-600 focus-within:bg-white dark:focus-within:bg-zinc-900 flex items-center justify-between gap-1.5">
                        <input
                          id={`title-input-${idx}`}
                          type="text"
                          value={e.title}
                          aria-label={`Event ${idx + 1} title`}
                          tabIndex={0}
                          onChange={(ev) => updateEvent(e.id, { title: ev.target.value })}
                          className="w-full bg-transparent border-0 outline-none focus:ring-0 p-0 text-xs font-semibold text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 truncate"
                          placeholder="e.g. Internal Test 2"
                        />
                        <Pencil
                          className="w-3 h-3 text-zinc-400 opacity-0 group-hover/cell:opacity-100 transition-opacity pointer-events-none shrink-0"
                          strokeWidth={1.75}
                        />
                      </div>
                    </td>

                    {/* Column 3: Type Dropdown (Tactile Flush Cell) */}
                    <td className="py-2 px-3">
                      <div className="group/cell relative px-2 py-1.5 rounded-md transition-colors hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50 focus-within:ring-1 focus-within:ring-blue-600 focus-within:bg-white dark:focus-within:bg-zinc-900 flex items-center gap-1.5">
                        {e.type === "Deadline" ? (
                          <Diamond
                            className="w-3.5 h-3.5 text-rose-600 fill-rose-500/20 shrink-0"
                            aria-label="Deadline point"
                          />
                        ) : e.type === "Test" ? (
                          <FileText
                            className="w-3.5 h-3.5 text-blue-600 shrink-0"
                            aria-label="Exam assessment"
                          />
                        ) : (
                          <Users
                            className="w-3.5 h-3.5 text-violet-600 shrink-0"
                            aria-label="Lecture session"
                          />
                        )}
                        <select
                          id={`type-select-${idx}`}
                          value={e.type}
                          aria-label={`Event ${idx + 1} category type`}
                          tabIndex={0}
                          onChange={(ev) =>
                            handleTypeChange(e.id, e.startTime, ev.target.value as EventType)
                          }
                          className={`w-full bg-transparent border-0 outline-none focus:ring-0 p-0 text-xs font-bold cursor-pointer rounded ${typeCfg.badge}`}
                        >
                          <option value="Test">Test</option>
                          <option value="Deadline">Deadline</option>
                          <option value="Lecture">Lecture</option>
                        </select>
                        <Pencil
                          className="w-3 h-3 text-zinc-400 opacity-0 group-hover/cell:opacity-100 transition-opacity pointer-events-none shrink-0"
                          strokeWidth={1.75}
                        />
                      </div>
                    </td>

                    {/* Column 4: Date Picker + Formatted Chip (Tactile Flush Cell) */}
                    <td className="py-2 px-3">
                      <div className="group/cell relative px-2.5 py-1.5 rounded-md transition-colors hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50 focus-within:ring-1 focus-within:ring-blue-600 focus-within:bg-white dark:focus-within:bg-zinc-900 flex flex-col gap-0.5">
                        <div className="flex items-center justify-between gap-1">
                          <input
                            id={`date-input-${idx}`}
                            type="date"
                            value={e.dateISO}
                            aria-label={`Event ${idx + 1} date`}
                            tabIndex={0}
                            onChange={(ev) => updateEvent(e.id, { dateISO: ev.target.value })}
                            className="w-full bg-transparent border-0 outline-none focus:ring-0 p-0 font-mono text-xs text-zinc-900 dark:text-zinc-100 cursor-pointer"
                          />
                          <Pencil
                            className="w-3 h-3 text-zinc-400 opacity-0 group-hover/cell:opacity-100 transition-opacity pointer-events-none shrink-0"
                            strokeWidth={1.75}
                          />
                        </div>
                        <span className="font-mono text-[10px] font-medium text-zinc-500 dark:text-zinc-400 pl-0.5">
                          {formatDisplayDate(e.dateISO)}
                        </span>
                      </div>
                    </td>

                    {/* Column 5: Timing (Tactile Flush Cell + Formatted PS-02 string in font-mono tabular-nums) */}
                    <td className="py-2 px-3">
                      <div className="group/cell relative px-2.5 py-1.5 rounded-md transition-colors hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50 focus-within:ring-1 focus-within:ring-blue-600 focus-within:bg-white dark:focus-within:bg-zinc-900 flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <input
                            id={`start-time-input-${idx}`}
                            type="time"
                            value={e.startTime}
                            aria-label={`Event ${idx + 1} start time`}
                            tabIndex={0}
                            onChange={(ev) => handleStartTimeChange(e, ev.target.value)}
                            className="w-16 bg-transparent border-0 outline-none focus:ring-0 p-0 font-mono text-xs text-zinc-900 dark:text-zinc-100"
                          />
                          <span className="text-zinc-400 font-bold select-none" aria-hidden="true">
                            –
                          </span>
                          {isDeadline ? (
                            <div
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/25"
                              title="Deadlines represent points in time; End Time is automatically locked to Start Time"
                              role="status"
                              aria-label={`Deadline locked point: by ${format12Hour(e.startTime)}`}
                            >
                              <Diamond className="w-2.5 h-2.5 text-rose-600 shrink-0" />
                              <span>Point</span>
                            </div>
                          ) : (
                            <input
                              id={`end-time-input-${idx}`}
                              type="time"
                              value={e.endTime}
                              aria-label={`Event ${idx + 1} end time`}
                              tabIndex={0}
                              onChange={(ev) => updateEvent(e.id, { endTime: ev.target.value })}
                              className="w-16 bg-transparent border-0 outline-none focus:ring-0 p-0 font-mono text-xs text-zinc-900 dark:text-zinc-100"
                            />
                          )}
                          <Pencil
                            className="w-3 h-3 text-zinc-400 opacity-0 group-hover/cell:opacity-100 transition-opacity pointer-events-none shrink-0 ml-auto"
                            strokeWidth={1.75}
                          />
                        </div>

                        {/* Human-readable formatted string matching PS-02 */}
                        <div className="flex items-center gap-1 font-mono text-[10px] tabular-nums text-zinc-500 dark:text-zinc-400">
                          <Clock className="w-3 h-3 text-zinc-400 shrink-0" />
                          <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                            {isDeadline
                              ? `by ${format12Hour(e.startTime)}`
                              : `${format12Hour(e.startTime)} – ${format12Hour(e.endTime)}`}
                          </span>
                        </div>

                        {/* Instant Validation Warning & 1-Click Swap */}
                        {hasTimeInversion && (
                          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span>End time before start</span>
                            <button
                              type="button"
                              onClick={() => handleSwapTimes(e.id, e.startTime, e.endTime)}
                              className="px-1.5 py-0.2 rounded bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 border border-rose-500/30 transition cursor-pointer text-[9px] font-mono"
                              title="Swap start and end times"
                            >
                              Swap Start/End
                            </button>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Column 6: Venue (Tactile Flush Cell) */}
                    <td className="py-2 px-3">
                      <div className="group/cell relative px-2.5 py-1.5 rounded-md transition-colors hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50 focus-within:ring-1 focus-within:ring-blue-600 focus-within:bg-white dark:focus-within:bg-zinc-900 flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 w-full">
                          <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" aria-hidden="true" />
                          <input
                            id={`venue-input-${idx}`}
                            type="text"
                            value={e.venue ?? ""}
                            aria-label={`Event ${idx + 1} venue location`}
                            tabIndex={0}
                            onChange={(ev) => updateEvent(e.id, { venue: ev.target.value })}
                            placeholder="e.g. Room 204"
                            className="w-full bg-transparent border-0 outline-none focus:ring-0 p-0 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 truncate"
                          />
                        </div>
                        <Pencil
                          className="w-3 h-3 text-zinc-400 opacity-0 group-hover/cell:opacity-100 transition-opacity pointer-events-none shrink-0"
                          strokeWidth={1.75}
                        />
                      </div>
                    </td>

                    {/* Column 7: Confidence Badge */}
                    <td className="py-2 px-3 relative">
                      <div
                        onMouseEnter={() => setActiveTooltipId(e.id)}
                        onMouseLeave={() => setActiveTooltipId(null)}
                        className="cursor-help inline-block"
                        tabIndex={0}
                        aria-label={`Verification confidence: ${confidence} percent ${
                          isHighConfidence ? "verified" : "review needed"
                        }`}
                      >
                        {isHighConfidence ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 font-mono text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span>{confidence}% Verified</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25 font-mono text-[10px] font-bold">
                            <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            <span>{confidence}% Review</span>
                          </span>
                        )}
                      </div>

                      {/* Tooltip */}
                      {activeTooltipId === e.id && (
                        <div
                          className="absolute z-30 bottom-full left-3 mb-1 w-52 p-2.5 rounded-lg bg-zinc-900 text-white text-[11px] shadow-xl border border-zinc-800 leading-snug animate-in fade-in duration-100 pointer-events-none"
                          role="tooltip"
                        >
                          {isHighConfidence ? (
                            <span>High confidence match. Explicit times, dates, and venue detected deterministically.</span>
                          ) : (
                            <span>Inferred fields or ambiguous clause phrasing. Please double check venue & timings.</span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Column 8: Actions (Reset Row, Calendar Links, Delete) */}
                    <td className="py-2 px-3 text-center">
                      <div className="inline-flex items-center justify-center gap-1">
                        {/* 1-Click Reset Row if modified */}
                        {isEdited && (
                          <button
                            onClick={() => handleResetRow(e.id)}
                            className="p-1 rounded text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition cursor-pointer"
                            title="Reset this row to detected state"
                            aria-label={`Reset event ${idx + 1}`}
                          >
                            <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />
                          </button>
                        )}

                        {/* 1-Click Add to Google Calendar */}
                        <a
                          href={buildGoogleCalendarUrl(e, {
                            clashes: noticeClashes,
                            recommendations: noticeRecommendations,
                          })}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition"
                          title="1-Click Add to Google Calendar"
                          aria-label={`Add ${e.title} to Google Calendar`}
                        >
                          <Calendar className="w-3.5 h-3.5" strokeWidth={1.75} />
                        </a>

                        {/* 1-Click Add to Outlook Web */}
                        <a
                          href={buildOutlookWebUrl(e, {
                            clashes: noticeClashes,
                            recommendations: noticeRecommendations,
                          })}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded text-zinc-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition"
                          title="1-Click Add to Outlook Web"
                          aria-label={`Add ${e.title} to Outlook Web`}
                        >
                          <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.75} />
                        </a>

                        {/* Delete Event Button */}
                        <button
                          id={`delete-btn-${idx}`}
                          onClick={() => deleteEvent(e.id)}
                          aria-label={`Delete event ${idx + 1}: ${e.title}`}
                          tabIndex={0}
                          className="p-1 rounded text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          title="Delete this event (Undo available)"
                        >
                          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile-First Card Transformation (< 768px): Tight, zero-horizontal-scroll card stack */}
        <div className="md:hidden flex flex-col gap-2.5 p-3">
          {events.map((e, idx) => {
            const isDeadline = e.type === "Deadline";
            const typeCfg = TYPE_CONFIG[e.type] || TYPE_CONFIG.Other;
            const isHighlighted = activeHighlightedEventId === e.id;
            const isEdited = isRowEdited(e);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const confidence = (e as any).confidence ?? (e as any).confidenceScore ?? 95;
            const isHighConfidence = confidence >= 80;

            return (
              <div
                key={e.id}
                id={`mobile-card-${idx}`}
                onMouseEnter={() => setActiveHighlightedEventId(e.id)}
                onMouseLeave={() => setActiveHighlightedEventId(null)}
                className={`p-3.5 rounded-xl border transition-all ${
                  isHighlighted
                    ? "border-blue-500 bg-blue-50/40 dark:bg-blue-950/30 shadow-xs"
                    : isEdited
                    ? "border-blue-300 dark:border-blue-800 bg-blue-50/10 dark:bg-[#121215]"
                    : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215]"
                }`}
              >
                {/* Mobile Card Header: Title & Type & Actions */}
                <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-zinc-100 dark:border-zinc-800/80">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className="font-mono text-[10px] text-zinc-400 select-none">#{idx + 1}</span>
                      <select
                        aria-label={`Mobile card event ${idx + 1} type`}
                        value={e.type}
                        onChange={(ev) =>
                          handleTypeChange(e.id, e.startTime, ev.target.value as EventType)
                        }
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded cursor-pointer ${typeCfg.badge}`}
                      >
                        <option value="Test">Test</option>
                        <option value="Deadline">Deadline</option>
                        <option value="Lecture">Lecture</option>
                      </select>
                      {isEdited && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 dark:text-blue-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          Edited
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={e.title}
                      aria-label={`Mobile card event ${idx + 1} title`}
                      onChange={(ev) => updateEvent(e.id, { title: ev.target.value })}
                      className="w-full bg-transparent border-0 outline-none p-0 text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate focus:ring-0"
                      placeholder="Event title"
                    />
                  </div>

                  <div className="flex items-center gap-1 shrink-0 pt-0.5">
                    {isEdited && (
                      <button
                        onClick={() => handleResetRow(e.id)}
                        className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline px-1 py-0.5"
                      >
                        Reset
                      </button>
                    )}
                    <button
                      onClick={() => deleteEvent(e.id)}
                      aria-label={`Delete event ${idx + 1}: ${e.title}`}
                      className="p-1 rounded text-zinc-400 hover:text-rose-600 transition"
                      title="Delete event"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </button>
                  </div>
                </div>

                {/* 3-Column Monospace Metadata Strip (Date, Time, Venue) */}
                <div className="grid grid-cols-3 gap-2 pt-2.5 font-mono text-[11px] tabular-nums">
                  {/* Column 1: Date */}
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[9px] font-semibold uppercase text-zinc-400 flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5 shrink-0" /> Date
                    </span>
                    <input
                      type="date"
                      value={e.dateISO}
                      aria-label={`Mobile card event ${idx + 1} date`}
                      onChange={(ev) => updateEvent(e.id, { dateISO: ev.target.value })}
                      className="w-full bg-transparent border-0 outline-none p-0 text-[10px] text-zinc-800 dark:text-zinc-200 cursor-pointer font-mono"
                    />
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                      {formatDisplayDate(e.dateISO)}
                    </span>
                  </div>

                  {/* Column 2: Time */}
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[9px] font-semibold uppercase text-zinc-400 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5 shrink-0" /> Timing
                    </span>
                    <div className="flex items-center gap-1">
                      <input
                        type="time"
                        value={e.startTime}
                        aria-label={`Mobile card event ${idx + 1} start time`}
                        onChange={(ev) => handleStartTimeChange(e, ev.target.value)}
                        className="w-12 bg-transparent border-0 outline-none p-0 text-[10px] text-zinc-800 dark:text-zinc-200 font-mono"
                      />
                      {!isDeadline && (
                        <>
                          <span className="text-zinc-400 text-[10px]">–</span>
                          <input
                            type="time"
                            value={e.endTime}
                            aria-label={`Mobile card event ${idx + 1} end time`}
                            onChange={(ev) => updateEvent(e.id, { endTime: ev.target.value })}
                            className="w-12 bg-transparent border-0 outline-none p-0 text-[10px] text-zinc-800 dark:text-zinc-200 font-mono"
                          />
                        </>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate font-semibold">
                      {isDeadline
                        ? `by ${format12Hour(e.startTime)}`
                        : `${format12Hour(e.startTime)} – ${format12Hour(e.endTime)}`}
                    </span>
                  </div>

                  {/* Column 3: Venue */}
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[9px] font-semibold uppercase text-zinc-400 flex items-center gap-1">
                      <MapPin className="w-2.5 h-2.5 shrink-0" /> Venue
                    </span>
                    <input
                      type="text"
                      value={e.venue ?? ""}
                      aria-label={`Mobile card event ${idx + 1} venue`}
                      onChange={(ev) => updateEvent(e.id, { venue: ev.target.value })}
                      placeholder="Venue"
                      className="w-full bg-transparent border-0 outline-none p-0 text-[10px] text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 truncate"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RFC-5545 Raw .ics Inspector Drawer */}
      <RawIcsPreviewDrawer
        isOpen={isIcsInspectorOpen}
        onClose={() => setIsIcsInspectorOpen(false)}
        events={events}
        clashes={noticeClashes}
        recommendations={noticeRecommendations}
      />

      {/* Live webcal:// Batch Subscription Modal */}
      <WebcalModal
        isOpen={isWebcalModalOpen}
        onClose={() => setIsWebcalModalOpen(false)}
        cohort={events[0]?.audience || "III-year CSE"}
      />

      {/* Shareable High-Contrast Schedule Card & WhatsApp Summary */}
      <ShareableScheduleCard
        isOpen={isShareCardOpen}
        onClose={() => setIsShareCardOpen(false)}
        events={events}
        clashes={noticeClashes}
        cohort={events[0]?.audience || "III-Year CSE"}
      />
    </section>
  );
}
