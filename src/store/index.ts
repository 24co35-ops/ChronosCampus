// ─── Zustand reactive store with undo/redo ───────────────────────────────
// ponytail: one store file, temporal middleware only for event edits.

import { create } from "zustand";
import { temporal } from "zundo";
import type { ReviewedEvent, ClashResult, BusyWindow, DeadlineFeasibility, Recommendation } from "@/src/types";
import { analyzePairwiseClashes, mergeBusyWindows, assessDeadlineFeasibility, recommendActions } from "@/src/lib/clash";

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

function derive(events: ReviewedEvent[]) {
  const clashes = analyzePairwiseClashes(events);
  const busyWindows = mergeBusyWindows(events);
  const feasibility = assessDeadlineFeasibility(events, busyWindows);
  const recommendations = recommendActions(events, clashes, feasibility);
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

      reset: () =>
        set({
          noticeText: "",
          events: [],
          clashes: [],
          busyWindows: [],
          feasibility: [],
          recommendations: [],
          parseError: null,
        }),
    }),
    {
      // Only track event edits in undo history
      partialize: (state) => ({ events: state.events }),
    }
  )
);
