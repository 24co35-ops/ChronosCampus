// ─── Zustand reactive store with undo/redo ───────────────────────────────
// ponytail: one store file, temporal middleware only for event edits.

import { create } from "zustand";
import { registerAppStoreSync } from "./useNoticeStore";
import { temporal } from "zundo";
import type { ReviewedEvent, ClashResult, BusyWindow, DeadlineFeasibility, Recommendation } from "@/src/types";
import { analyzePairwiseClashes, mergeBusyWindows, assessDeadlineFeasibility, recommendActions } from "@/src/lib/clash";
import type { DecodedEvent } from "@/src/types/notice";

export interface AppState {
  noticeText: string;
  events: ReviewedEvent[];
  clashes: ClashResult[];
  busyWindows: BusyWindow[];
  feasibility: DeadlineFeasibility[];
  recommendations: Recommendation[];
  isParsing: boolean;
  parseError: string | null;
  // actions
  setNoticeText: (text: string) => void;
  setEvents: (events: ReviewedEvent[]) => void;
  updateEvent: (id: string, patch: Partial<ReviewedEvent>) => void;
  deleteEvent: (id: string) => void;
  addEvent: (event: ReviewedEvent) => void;
  setIsParsing: (v: boolean) => void;
  setParseError: (msg: string | null) => void;
  recompute: () => void;
  reset: () => void;
}

function syncToNoticeStore(events: ReviewedEvent[]) {
  if (typeof window === "undefined") return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("./useNoticeStore");
    const useNoticeStore = mod?.useNoticeStore;
    if (!useNoticeStore) return;
    const currentNoticeEvents = useNoticeStore.getState().events;
    const isSame =
      currentNoticeEvents.length === events.length &&
      events.every((e, i) => {
        const cur = currentNoticeEvents[i];
        return (
          cur &&
          cur.id === e.id &&
          cur.startTime === e.startTime &&
          cur.endTime === e.endTime &&
          cur.title === e.title &&
          cur.venue === (e.venue || "TBD")
        );
      });

    if (!isSame) {
      const decoded: DecodedEvent[] = events.map((e) => ({
        id: e.id,
        title: e.title,
        type: (e.type === "Other" ? "Lecture" : e.type) as "Test" | "Deadline" | "Lecture",
        dateISO: e.dateISO,
        displayDate: e.dateISO,
        startTime: e.startTime,
        endTime: e.endTime,
        venue: e.venue || "TBD",
        cohort: e.audience || "All Students",
        confidence: 90,
        needsReview: false,
        sourceSpan: {
          start: e.sourceSpans?.[0]?.start ?? 0,
          end: e.sourceSpans?.[0]?.end ?? 0,
          rawSentence: e.rawSource || "",
        },
      }));
      useNoticeStore.getState().setEvents(decoded);
    }
  } catch {
    // Ignore in isolated environments
  }
}

function derive(events: ReviewedEvent[]) {
  const clashes = analyzePairwiseClashes(events);
  const busyWindows = mergeBusyWindows(events);
  const feasibility = assessDeadlineFeasibility(events, busyWindows);
  const recommendations = recommendActions(events, clashes, feasibility);
  syncToNoticeStore(events);
  return { clashes, busyWindows, feasibility, recommendations };
}

export const useStore = create<AppState>()(
  temporal(
    (set, get) => ({
      noticeText: "",
      events: [],
      clashes: [],
      busyWindows: [],
      feasibility: [],
      recommendations: [],
      isParsing: false,
      parseError: null,

      setNoticeText: (text) => set({ noticeText: text }),

      setEvents: (events) => set({ events, ...derive(events) }),

      updateEvent: (id, patch) => {
        const events = get().events.map((e) =>
          e.id === id ? { ...e, ...patch } : e
        );
        set({ events, ...derive(events) });
      },

      deleteEvent: (id) => {
        const events = get().events.filter((e) => e.id !== id);
        set({ events, ...derive(events) });
      },

      addEvent: (event) => {
        const events = [...get().events, event];
        set({ events, ...derive(events) });
      },

      setIsParsing: (v) => set({ isParsing: v }),
      setParseError: (msg) => set({ parseError: msg }),

      recompute: () => {
        const { events } = get();
        set(derive(events));
      },

      reset: () => {
        if (typeof window !== "undefined") {
          try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const mod = require("./useNoticeStore");
            mod?.useNoticeStore?.getState().reset();
          } catch {}
        }
        set({
          noticeText: "",
          events: [],
          clashes: [],
          busyWindows: [],
          feasibility: [],
          recommendations: [],
          parseError: null,
        });
      },
    }),
    {
      // Only track event edits in undo history
      partialize: (state) => ({ events: state.events }),
    }
  )
);
// Register dual-store sync so useNoticeStore updates useStore in lockstep
registerAppStoreSync((events) => {
  const current = useStore.getState().events;
  const isSame =
    current.length === events.length &&
    events.every((e: DecodedEvent, i: number) => {
      const cur = current[i];
      return (
        cur &&
        cur.id === e.id &&
        cur.startTime === e.startTime &&
        cur.endTime === e.endTime
      );
    });

  if (!isSame) {
    const reviewed = events.map((e: DecodedEvent) => ({
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
      sourceSpans: e.sourceSpan ? [{ start: e.sourceSpan.start, end: e.sourceSpan.end }] : [],
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
    useStore.getState().setEvents(reviewed);
  }
});
