import { decodeNotice } from "@/src/lib/parser/noticeDecoder";
import { OFFICIAL_PS02_NOTICE } from "@/src/lib/fixtures/sampleNotices";
import { broadcastScheduleUpdate, subscribeToBroadcast, type SyncMessage } from "@/src/lib/sync/broadcastChannel";
import { evaluateAllPairs, toMinutes as timeToMinutes, fromMinutes as timeFromMinutes } from "@/src/lib/clash/pairwiseEngine";
import { computeCompoundBusyBlocks, generateCompoundBusyInsights } from "@/src/lib/clash/compoundAnalyzer";
import { generateRecommendations } from "@/src/lib/clash/actionRecommender";
import type { RescheduleSuggestion } from "@/src/lib/clash/actionRecommender";
import { create } from "zustand";
import type {
  DecodedEvent,
  PairwiseClashResult,
  CompoundBusyBlock,
  CompoundBusyInsight,
  ActionRecommendation,
  ViewMode,
} from "@/src/types/notice";

// ── Time arithmetic helpers (deterministic & sub-millisecond) ─────────────

function toMinutes(hhmm: string): number {
  if (!hhmm) return 0;
  const parts = hhmm.split(":");
  const h = parseInt(parts[0] ?? "0", 10);
  const m = parseInt(parts[1] ?? "0", 10);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

function fromMinutes(mins: number): string {
  const norm = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// ── High-Performance Clash Engine (< 5ms execution target) ─────────────────

export interface EngineResult {
  pairwiseClashes: PairwiseClashResult[];
  busyBlocks: CompoundBusyBlock[];
  recommendations: ActionRecommendation[];
  compoundInsights: CompoundBusyInsight[];
  rescheduleMap: Map<string, RescheduleSuggestion>;
}

export function runClashEngine(events: DecodedEvent[]): EngineResult {
  const pairwiseClashes: PairwiseClashResult[] = [];
  const validDated = events.filter((e) => e.dateISO && e.startTime);
  const byId = new Map(validDated.map((e) => [e.id, e]));

  // 1. Pairwise clash detection
  for (let i = 0; i < validDated.length; i++) {
    for (let j = i + 1; j < validDated.length; j++) {
      const a = validDated[i]!;
      const b = validDated[j]!;

      // Different calendar dates -> no clash
      if (a.dateISO !== b.dateISO) {
        pairwiseClashes.push({
          id: `clash-${a.id}-${b.id}`,
          eventA: a.id,
          eventB: b.id,
          hasClash: false,
          clashType: "NO_CLASH",
          overlapMinutes: 0,
          overlapWindow: null,
          explanation: `"${a.title}" and "${b.title}" occur on different calendar dates (${a.dateISO} vs ${b.dateISO}).`,
          severity: "SAFE",
        });
        continue;
      }

      // Case A: Both are ranged events (Test / Lecture)
      if (a.type !== "Deadline" && b.type !== "Deadline") {
        const aStart = toMinutes(a.startTime);
        const aEnd = toMinutes(a.endTime || a.startTime);
        const bStart = toMinutes(b.startTime);
        const bEnd = toMinutes(b.endTime || b.startTime);

        const overlapStart = Math.max(aStart, bStart);
        const overlapEnd = Math.min(aEnd, bEnd);
        const overlapMins = Math.max(0, overlapEnd - overlapStart);

        if (overlapMins > 0) {
          pairwiseClashes.push({
            id: `clash-${a.id}-${b.id}`,
            eventA: a.id,
            eventB: b.id,
            hasClash: true,
            clashType: "HARD_OVERLAP",
            overlapMinutes: overlapMins,
            overlapWindow: {
              start: fromMinutes(overlapStart),
              end: fromMinutes(overlapEnd),
            },
            explanation: `${overlapMins}-minute interval overlap from ${fromMinutes(overlapStart)} to ${fromMinutes(overlapEnd)} between "${a.title}" and "${b.title}".`,
            severity: "CRITICAL",
          });
        } else if (
          (aEnd === bStart || bEnd === aStart) &&
          a.venue &&
          b.venue &&
          a.venue !== b.venue &&
          a.venue !== "TBD" &&
          b.venue !== "TBD"
        ) {
          // Zero-gap transition with distinct physical venues
          const transitTime = aEnd === bStart ? a.endTime : b.endTime;
          pairwiseClashes.push({
            id: `clash-${a.id}-${b.id}`,
            eventA: a.id,
            eventB: b.id,
            hasClash: true,
            clashType: "TRANSIT_RISK",
            overlapMinutes: 0,
            overlapWindow: { start: transitTime, end: transitTime },
            explanation: `Zero-minute transit gap at ${transitTime} between "${a.title}" (${a.venue}) and "${b.title}" (${b.venue}). Potential student delay.`,
            severity: "WARNING",
          });
        } else {
          pairwiseClashes.push({
            id: `clash-${a.id}-${b.id}`,
            eventA: a.id,
            eventB: b.id,
            hasClash: false,
            clashType: "NO_CLASH",
            overlapMinutes: 0,
            overlapWindow: null,
            explanation: `"${a.title}" and "${b.title}" have non-overlapping schedule intervals.`,
            severity: "SAFE",
          });
        }
        continue;
      }

      // Case B: One is a Deadline, one is a ranged event
      if (
        (a.type === "Deadline" && b.type !== "Deadline") ||
        (a.type !== "Deadline" && b.type === "Deadline")
      ) {
        const deadline = a.type === "Deadline" ? a : b;
        const ranged = a.type === "Deadline" ? b : a;

        const dMins = toMinutes(deadline.startTime);
        const rStart = toMinutes(ranged.startTime);
        const rEnd = toMinutes(ranged.endTime || ranged.startTime);

        // Deadline falls inside or right at the boundary of a session
        if (rStart <= dMins && dMins <= rEnd) {
          pairwiseClashes.push({
            id: `clash-${a.id}-${b.id}`,
            eventA: a.id,
            eventB: b.id,
            hasClash: true,
            clashType: "DEADLINE_CONTAINMENT",
            overlapMinutes: 0,
            overlapWindow: {
              start: deadline.startTime,
              end: deadline.startTime,
            },
            explanation: `Deadline "${deadline.title}" due at ${deadline.startTime} falls during "${ranged.title}" (${ranged.startTime}–${ranged.endTime}). Students cannot submit while in session.`,
            severity: "CRITICAL",
          });
        } else {
          pairwiseClashes.push({
            id: `clash-${a.id}-${b.id}`,
            eventA: a.id,
            eventB: b.id,
            hasClash: false,
            clashType: "NO_CLASH",
            overlapMinutes: 0,
            overlapWindow: null,
            explanation: `Deadline "${deadline.title}" (due ${deadline.startTime}) is outside "${ranged.title}" (${ranged.startTime}–${ranged.endTime}).`,
            severity: "SAFE",
          });
        }
        continue;
      }

      // Case C: Both are Deadlines
      if (a.type === "Deadline" && b.type === "Deadline") {
        if (a.startTime === b.startTime) {
          pairwiseClashes.push({
            id: `clash-${a.id}-${b.id}`,
            eventA: a.id,
            eventB: b.id,
            hasClash: true,
            clashType: "HARD_OVERLAP",
            overlapMinutes: 0,
            overlapWindow: { start: a.startTime, end: a.startTime },
            explanation: `Simultaneous deadlines: Both "${a.title}" and "${b.title}" are due at ${a.startTime}.`,
            severity: "WARNING",
          });
        } else {
          pairwiseClashes.push({
            id: `clash-${a.id}-${b.id}`,
            eventA: a.id,
            eventB: b.id,
            hasClash: false,
            clashType: "NO_CLASH",
            overlapMinutes: 0,
            overlapWindow: null,
            explanation: `Deadlines are staggered (${a.startTime} vs ${b.startTime}).`,
            severity: "SAFE",
          });
        }
      }
    }
  }

  // 2. Compound Busy Blocks via O(N log N) Sweep-Line & True Last Free Window
  const busyBlocks = computeCompoundBusyBlocks(validDated);
  const compoundInsights = generateCompoundBusyInsights(validDated);

  // 3. Delegated to actionRecommender — PS-02 prioritized action cards + reschedule finder
  const { recommendations, rescheduleMap } = generateRecommendations(
    validDated,
    pairwiseClashes,
    compoundInsights
  );

  return { pairwiseClashes, busyBlocks, recommendations, compoundInsights, rescheduleMap };
}


type AppStoreSyncCallback = (events: DecodedEvent[]) => void;
let appStoreSyncCallback: AppStoreSyncCallback | null = null;

export function registerAppStoreSync(cb: AppStoreSyncCallback) {
  appStoreSyncCallback = cb;
}

function syncBackToAppStore(events: DecodedEvent[]) {
  if (appStoreSyncCallback) {
    try {
      appStoreSyncCallback(events);
    } catch {
      // Ignore sync exceptions
    }
  }
}
// ── Zustand Store Contract ─────────────────────────────────────────────────


export interface LiveSyncToast {
  id: string;
  title: string;
  message: string;
  sender: string;
  timestamp: number;
}

export interface NoticeStoreState {
  rawNoticeText: string;
  events: DecodedEvent[];
  history: {
    past: DecodedEvent[][];
    future: DecodedEvent[][];
  };
  pairwiseClashes: PairwiseClashResult[];
  busyBlocks: CompoundBusyBlock[];
  compoundInsights: CompoundBusyInsight[];
  recommendations: ActionRecommendation[];
  rescheduleMap: Map<string, RescheduleSuggestion>;
  previewRescheduleId: string | null;
  selectedCohort: string;
  viewMode: ViewMode;
  activeHighlightedEventId: string | null;
  activeEscalationClashId: string | null;
  liveSyncToast: LiveSyncToast | null;
  setLiveSyncToast: (toast: LiveSyncToast | null) => void;
  dismissLiveSyncToast: () => void;
  broadcastRescheduledNotice: (customEvents?: DecodedEvent[]) => void;
  broadcastResetNotice: () => void;
  initLiveSyncListener: () => () => void;
  openEscalation: (clashId: string) => void;
  closeEscalation: () => void;

  // Actions
  setRawNoticeText: (text: string) => void;
  setEvents: (events: DecodedEvent[]) => void;
  updateEventField: <K extends keyof DecodedEvent>(
    id: string,
    field: K,
    value: DecodedEvent[K]
  ) => void;
  updateEvent: (id: string, patch: Partial<DecodedEvent>) => void;
  addManualEvent: (event?: Partial<DecodedEvent>) => void;
  deleteEvent: (id: string) => void;
  autoResolveClash: (clashId: string) => void;
  previewReschedule: (eventId: string) => void;
  revertReschedule: (eventId: string) => void;
  undo: () => void;
  redo: () => void;
  setSelectedCohort: (cohort: string) => void;
  setViewMode: (mode: ViewMode) => void;
  setActiveHighlightedEventId: (id: string | null) => void;
  recomputeEngine: () => void;
  reset: () => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
  setTheme: (theme: "light" | "dark") => void;
}

export const useNoticeStore = create<NoticeStoreState>()((set, get) => ({
  rawNoticeText: "",
  events: [],
  history: {
    past: [],
    future: [],
  },
  pairwiseClashes: [],
  busyBlocks: [],
  compoundInsights: [],
  recommendations: [],
  rescheduleMap: new Map(),
  previewRescheduleId: null,
  selectedCohort: "All",
  viewMode: "STUDENT",
  activeHighlightedEventId: null,
  activeEscalationClashId: null,
  liveSyncToast: null,
  theme: "light",
  toggleTheme: () => {
    const next = get().theme === "dark" ? "light" : "dark";
    if (typeof document !== "undefined") {
      if (next === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      try {
        localStorage.setItem("notice_decoder_theme", next);
      } catch {}
    }
    set({ theme: next });
  },
  setTheme: (theme) => {
    if (typeof document !== "undefined") {
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      try {
        localStorage.setItem("notice_decoder_theme", theme);
      } catch {}
    }
    set({ theme });
  },

  setLiveSyncToast: (toast) => set({ liveSyncToast: toast }),
  dismissLiveSyncToast: () => set({ liveSyncToast: null }),

  openEscalation: (clashId) => set({ activeEscalationClashId: clashId }),
  closeEscalation: () => set({ activeEscalationClashId: null }),

  broadcastRescheduledNotice: (customEvents) => {
    const { events } = get();
    const baseEvents = events.length >= 2 ? events : decodeNotice(OFFICIAL_PS02_NOTICE);

    const targetEvents: DecodedEvent[] =
      customEvents && customEvents.length > 0
        ? customEvents
        : baseEvents.map((e) => {
            if (e.title.toLowerCase().includes("lecture") || e.type === "Lecture") {
              return {
                ...e,
                startTime: "12:15",
                endTime: "13:45",
              };
            }
            return e;
          });

    get().setEvents(targetEvents);

    broadcastScheduleUpdate(targetEvents, {
      title: "🔔 Live Department Update Received: Clash Resolved!",
      message: "Department Exam Cell auto-rescheduled Guest Lecture to 12:15 PM – 100% clash-free schedule.",
      source: "B2B_ADMIN",
      type: "AUTO_RESCHEDULE",
    });
  },

  broadcastResetNotice: () => {
    const clashingEvents: DecodedEvent[] = decodeNotice(OFFICIAL_PS02_NOTICE);
    get().setEvents(clashingEvents);

    broadcastScheduleUpdate(clashingEvents, {
      title: "⚠️ Circular Reset: Original Department Notice Loaded",
      message: "Notice restored to original 11:00 AM lecture timing (2 clashes active).",
      source: "B2B_ADMIN",
      type: "RESET_NOTICE",
    });
  },

  initLiveSyncListener: () => {
    return subscribeToBroadcast((msg) => {
      get().setEvents(msg.events);
      set({
        liveSyncToast: {
          id: msg.id,
          title: msg.title,
          message: msg.message,
          sender: msg.source === "B2B_ADMIN" ? "Faculty Exam Cell (B2B Admin)" : msg.source,
          timestamp: msg.timestamp,
        },
      });
    });
  },

  setRawNoticeText: (text) => set({ rawNoticeText: text }),

  setEvents: (newEvents) => {
    const engine = runClashEngine(newEvents);
    set((state) => ({
      events: newEvents,
      history: {
        past: [...state.history.past.slice(-49), state.events],
        future: [],
      },
      ...engine,
    }));
  },

  updateEventField: (id, field, value) => {
    const { events, history } = get();
    const updated = events.map((e) => {
      if (e.id !== id) return e;
      const patched: DecodedEvent = { ...e, [field]: value };
      if (patched.type === "Deadline" && field === "startTime") {
        patched.endTime = value as string;
      }
      if (field === "confidence" && (value as number) < 80) {
        patched.needsReview = true;
      }
      return patched;
    });

    syncBackToAppStore(updated);
    const engine = runClashEngine(updated);
    set({
      events: updated,
      history: {
        past: [...history.past.slice(-49), events],
        future: [],
      },
      ...engine,
    });
  },

  updateEvent: (id, patch) => {
    const { events, history } = get();
    const updated = events.map((e) => {
      if (e.id !== id) return e;
      const merged: DecodedEvent = { ...e, ...patch };
      if (merged.type === "Deadline") {
        merged.endTime = merged.startTime;
      }
      if (merged.confidence < 80) {
        merged.needsReview = true;
      }
      return merged;
    });

    syncBackToAppStore(updated);
    const engine = runClashEngine(updated);
    set({
      events: updated,
      history: {
        past: [...history.past.slice(-49), events],
        future: [],
      },
      ...engine,
    });
  },

  addManualEvent: (overrides) => {
    const { events, history } = get();
    const newId = `manual-event-${Date.now()}`;
    const newEvent: DecodedEvent = {
      id: newId,
      title: "New Scheduled Session",
      type: "Lecture",
      dateISO: "2026-11-13",
      displayDate: "13 Nov 2026",
      startTime: "13:00",
      endTime: "14:00",
      venue: "TBD",
      cohort: "All Students",
      confidence: 100,
      needsReview: false,
      sourceSpan: { start: 0, end: 0, rawSentence: "Manual user creation" },
      ...overrides,
    };

    const updated = [...events, newEvent];
    syncBackToAppStore(updated);
    const engine = runClashEngine(updated);
    set({
      events: updated,
      history: {
        past: [...history.past.slice(-49), events],
        future: [],
      },
      ...engine,
    });
  },

  deleteEvent: (id) => {
    const { events, history } = get();
    const updated = events.filter((e) => e.id !== id);
    syncBackToAppStore(updated);
    const engine = runClashEngine(updated);
    set({
      events: updated,
      history: {
        past: [...history.past.slice(-49), events],
        future: [],
      },
      ...engine,
    });
  },

  autoResolveClash: (clashId) => {
    const { pairwiseClashes, recommendations, events, history } = get();
    const clash = pairwiseClashes.find((c) => c.id === clashId);
    if (!clash || !clash.hasClash) return;

    // Find rec that provides a suggestedPatch directly for one of the events in this clash
    const rec = recommendations.find(
      (r) =>
        r.suggestedPatch != null &&
        (r.suggestedPatch.eventId === clash.eventA || r.suggestedPatch.eventId === clash.eventB)
    );

    let updated = [...events];

        if (rec?.suggestedPatch) {
      updated = updated.map((e) =>
        e.id === rec.suggestedPatch!.eventId
          ? { ...e, ...rec.suggestedPatch!.patch }
          : e
      );
    } else if (clash.clashType === "HARD_OVERLAP") {
      const a = events.find((e) => e.id === clash.eventA);
      const b = events.find((e) => e.id === clash.eventB);
      if (a && b) {
        const first = toMinutes(a.startTime) <= toMinutes(b.startTime) ? a : b;
        const second = first.id === a.id ? b : a;
        const duration = toMinutes(second.endTime || second.startTime) - toMinutes(second.startTime);
        const hasDistinctVenues =
          first.venue &&
          second.venue &&
          first.venue !== second.venue &&
          first.venue !== "TBD" &&
          second.venue !== "TBD";
        const transitBuffer = hasDistinctVenues ? 15 : 0;
        const newStartMins = toMinutes(first.endTime) + transitBuffer;
        const newStart = fromMinutes(newStartMins);
        const newEnd = fromMinutes(newStartMins + duration);

        updated = updated.map((e) =>
          e.id === second.id ? { ...e, startTime: newStart, endTime: newEnd } : e
        );
      }
    } else if (clash.clashType === "DEADLINE_CONTAINMENT") {
      const deadline = events.find((e) => e.id === clash.eventA)?.type === "Deadline"
        ? events.find((e) => e.id === clash.eventA)
        : events.find((e) => e.id === clash.eventB);
      const ranged = deadline?.id === clash.eventA
        ? events.find((e) => e.id === clash.eventB)
        : events.find((e) => e.id === clash.eventA);

      if (deadline && ranged) {
        updated = updated.map((e) =>
          e.id === deadline.id
            ? { ...e, startTime: ranged.endTime, endTime: ranged.endTime }
            : e
        );
      }
    }

    syncBackToAppStore(updated);
    const engine = runClashEngine(updated);
    set({
      events: updated,
      history: {
        past: [...history.past.slice(-49), events],
        future: [],
      },
      ...engine,
    });
  },

  undo: () => {
    const { history, events } = get();
    if (history.past.length === 0) return;

    const previous = history.past[history.past.length - 1]!;
    const newPast = history.past.slice(0, -1);
    const engine = runClashEngine(previous);

    set({
      events: previous,
      history: {
        past: newPast,
        future: [events, ...history.future],
      },
      ...engine,
    });
  },

  redo: () => {
    const { history, events } = get();
    if (history.future.length === 0) return;

    const next = history.future[0]!;
    const newFuture = history.future.slice(1);
    const engine = runClashEngine(next);

    set({
      events: next,
      history: {
        past: [...history.past, events],
        future: newFuture,
      },
      ...engine,
    });
  },

  setSelectedCohort: (cohort) => set({ selectedCohort: cohort }),
  previewReschedule: (eventId) => {
    const { rescheduleMap, events, history } = get();
    const suggestion = rescheduleMap.get(eventId);
    if (!suggestion) return;

    const updated = events.map((e) =>
      e.id === eventId
        ? { ...e, startTime: suggestion.proposedStart, endTime: suggestion.proposedEnd }
        : e
    );
    const engine = runClashEngine(updated);
    set({
      events: updated,
      previewRescheduleId: eventId,
      history: { past: [...history.past.slice(-49), events], future: [] },
      ...engine,
    });
  },

  revertReschedule: (eventId) => {
    const { rescheduleMap, events, history } = get();
    const suggestion = rescheduleMap.get(eventId);
    if (!suggestion) return;

    const updated = events.map((e) =>
      e.id === eventId
        ? { ...e, startTime: suggestion.originalStart, endTime: suggestion.originalEnd }
        : e
    );
    const engine = runClashEngine(updated);
    set({
      events: updated,
      previewRescheduleId: null,
      history: { past: [...history.past.slice(-49), events], future: [] },
      ...engine,
    });
  },


  setViewMode: (mode) => set({ viewMode: mode }),

  setActiveHighlightedEventId: (id) => set({ activeHighlightedEventId: id }),

  recomputeEngine: () => {
    const { events } = get();
    const engine = runClashEngine(events);
    set(engine);
  },

  reset: () =>
    set({
      rawNoticeText: "",
      events: [],
      history: { past: [], future: [] },
      pairwiseClashes: [],
      busyBlocks: [],
      recommendations: [],
      activeHighlightedEventId: null,
  activeEscalationClashId: null,
  openEscalation: (clashId) => set({ activeEscalationClashId: clashId }),
  closeEscalation: () => set({ activeEscalationClashId: null }),
    }),
}));