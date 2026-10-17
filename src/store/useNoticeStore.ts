import { evaluateAllPairs, toMinutes as timeToMinutes, fromMinutes as timeFromMinutes } from "@/src/lib/clash/pairwiseEngine";
import { create } from "zustand";
import type {
  DecodedEvent,
  PairwiseClashResult,
  CompoundBusyBlock,
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

  // 2. Compound Busy Blocks via Sweep-Line solver
  const busyBlocks: CompoundBusyBlock[] = [];
  const dates = Array.from(new Set(validDated.map((e) => e.dateISO)));

  for (const date of dates) {
    const dayRanged = validDated.filter(
      (e) => e.dateISO === date && e.type !== "Deadline" && e.endTime
    );
    const dayDeadlines = validDated.filter(
      (e) => e.dateISO === date && e.type === "Deadline"
    );

    if (dayRanged.length === 0) continue;

    // Sort intervals by startTime ascending
    const sorted = [...dayRanged].sort(
      (x, y) => toMinutes(x.startTime) - toMinutes(y.startTime)
    );

    let currentBlock: CompoundBusyBlock = {
      dateISO: date,
      mergedStart: sorted[0]!.startTime,
      mergedEnd: sorted[0]!.endTime,
      events: [sorted[0]!],
      trappedDeadlines: [],
    };

    const mergedForDate: CompoundBusyBlock[] = [currentBlock];

    for (let k = 1; k < sorted.length; k++) {
      const ev = sorted[k]!;
      const evStart = toMinutes(ev.startTime);
      const evEnd = toMinutes(ev.endTime);
      const currEnd = toMinutes(currentBlock.mergedEnd);

      if (evStart <= currEnd) {
        // Extend existing block
        if (evEnd > currEnd) {
          currentBlock.mergedEnd = ev.endTime;
        }
        currentBlock.events.push(ev);
      } else {
        // Disjoint window: start new block
        currentBlock = {
          dateISO: date,
          mergedStart: ev.startTime,
          mergedEnd: ev.endTime,
          events: [ev],
          trappedDeadlines: [],
        };
        mergedForDate.push(currentBlock);
      }
    }

    // Attach trapped deadlines to merged blocks
    for (const block of mergedForDate) {
      const bStart = toMinutes(block.mergedStart);
      const bEnd = toMinutes(block.mergedEnd);

      block.trappedDeadlines = dayDeadlines.filter((dl) => {
        const dlTime = toMinutes(dl.startTime);
        return bStart <= dlTime && dlTime <= bEnd;
      });

      busyBlocks.push(block);
    }
  }

  // 3. Automated Resolution Recommendations
  const recommendations: ActionRecommendation[] = [];

  for (const clash of pairwiseClashes) {
    if (!clash.hasClash) continue;
    const a = byId.get(clash.eventA);
    const b = byId.get(clash.eventB);
    if (!a || !b) continue;

    if (clash.clashType === "HARD_OVERLAP") {
      const first = toMinutes(a.startTime) <= toMinutes(b.startTime) ? a : b;
      const second = first.id === a.id ? b : a;

      const secondDuration =
        toMinutes(second.endTime || second.startTime) - toMinutes(second.startTime);
      
      // Calculate transit buffer if venues differ
      const hasDistinctVenues =
        first.venue &&
        second.venue &&
        first.venue !== second.venue &&
        first.venue !== "TBD" &&
        second.venue !== "TBD";
      const transitBuffer = hasDistinctVenues ? 15 : 0;

      const suggestedStartMins = toMinutes(first.endTime) + transitBuffer;
      const suggestedStart = fromMinutes(suggestedStartMins);
      const suggestedEnd = fromMinutes(suggestedStartMins + secondDuration);

      recommendations.push({
        id: `rec-reschedule-${second.id}`,
        priority: "CRITICAL",
        title: `Reschedule "${second.title}"`,
        description: `Direct ${clash.overlapMinutes}-min overlap with "${first.title}". Shift "${second.title}" to ${suggestedStart}–${suggestedEnd} after "${first.title}" concludes${hasDistinctVenues ? " (includes 15-min transit buffer)" : ""}.`,
        actionType: "RESCHEDULE_EVENT",
        relatedEventIds: [first.id, second.id],
        suggestedPatch: {
          eventId: second.id,
          patch: { startTime: suggestedStart, endTime: suggestedEnd },
        },
        draftEmail: {
          recipient: "cse-hod@university.edu",
          subject: `Schedule Conflict Resolution Request: ${first.title} and ${second.title}`,
          body: `Dear Faculty / Administration,\n\nI noticed an active schedule clash on ${first.dateISO} between "${first.title}" (${first.startTime}–${first.endTime}) and "${second.title}" (${second.startTime}–${second.endTime}) overlapping for ${clash.overlapMinutes} minutes.\n\nCould we reschedule "${second.title}" to start at ${suggestedStart}?\n\nSincerely,\nStudent Representative`,
        },
      });
    } else if (clash.clashType === "DEADLINE_CONTAINMENT") {
      const deadline = a.type === "Deadline" ? a : b;
      const ranged = a.type === "Deadline" ? b : a;
      const suggestedPostpone = ranged.endTime;

      recommendations.push({
        id: `rec-deadline-${deadline.id}`,
        priority: "CRITICAL",
        title: `Extend Deadline "${deadline.title}"`,
        description: `Submission time (${deadline.startTime}) falls during "${ranged.title}" (${ranged.startTime}–${ranged.endTime}). Postpone deadline to ${suggestedPostpone} after session dismisses.`,
        actionType: "SHIFT_DEADLINE",
        relatedEventIds: [deadline.id, ranged.id],
        suggestedPatch: {
          eventId: deadline.id,
          patch: { startTime: suggestedPostpone, endTime: suggestedPostpone },
        },
        draftEmail: {
          recipient: "course-instructor@university.edu",
          subject: `Deadline Extension Request: ${deadline.title}`,
          body: `Dear Professor,\n\nThe deadline for "${deadline.title}" is currently set at ${deadline.startTime}, which directly coincides with "${ranged.title}".\n\nCould the submission deadline be extended to ${suggestedPostpone} to allow in-person hand-in after class?\n\nThank you for your consideration.`,
        },
      });
    } else if (clash.clashType === "TRANSIT_RISK") {
      recommendations.push({
        id: `rec-transit-${a.id}-${b.id}`,
        priority: "HIGH",
        title: `Buffer Transit between ${a.venue} & ${b.venue}`,
        description: `Zero-minute passing window between different buildings. Recommend a 15-minute inter-campus buffer.`,
        actionType: "TRANSIT_BUFFER",
        relatedEventIds: [a.id, b.id],
      });
    }
  }

  return { pairwiseClashes, busyBlocks, recommendations };
}

// ── Zustand Store Contract ─────────────────────────────────────────────────

export interface NoticeStoreState {
  rawNoticeText: string;
  events: DecodedEvent[];
  history: {
    past: DecodedEvent[][];
    future: DecodedEvent[][];
  };
  pairwiseClashes: PairwiseClashResult[];
  busyBlocks: CompoundBusyBlock[];
  recommendations: ActionRecommendation[];
  selectedCohort: string;
  viewMode: ViewMode;
  activeHighlightedEventId: string | null;

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
  undo: () => void;
  redo: () => void;
  setSelectedCohort: (cohort: string) => void;
  setViewMode: (mode: ViewMode) => void;
  setActiveHighlightedEventId: (id: string | null) => void;
  recomputeEngine: () => void;
  reset: () => void;
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
  recommendations: [],
  selectedCohort: "All",
  viewMode: "STUDENT",
  activeHighlightedEventId: null,

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

    // Check if we have a direct recommendation with a suggested patch
    const rec = recommendations.find((r) =>
      r.relatedEventIds.includes(clash.eventA) && r.relatedEventIds.includes(clash.eventB)
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
    }),
}));
