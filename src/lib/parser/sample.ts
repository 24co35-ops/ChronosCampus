// ─── Official PS-02 sample notice and expected fixture ─────────────────────
// This is the regression source of truth. Never derive expected values at runtime.

export const PS02_NOTICE = `Internal Test 2 is scheduled for 13 Nov 2026 from 10:00 AM to 11:30 AM in Room 204 for III-year CSE students.
Lab record submission is due on 13 Nov 2026 at 12:00 noon at the Department Office.
A guest lecture on AI in Healthcare will be held on 13 Nov 2026 from 11:00 AM to 12:30 PM in the Seminar Hall.`;

import type { ReviewedEvent, ClashResult } from "@/src/types";

/** Deterministic expected events — used by acceptance tests */
export const PS02_EXPECTED_EVENTS: Omit<ReviewedEvent, "id" | "confirmed" | "sourceSpans" | "rawSource" | "fieldStatus">[] = [
  {
    title: "Internal Test 2",
    type: "Test",
    dateISO: "2026-11-13",
    startTime: "10:00",
    endTime: "11:30",
    venue: "Room 204",
    audience: "III-year CSE",
    timeZone: "Asia/Kolkata",
  },
  {
    title: "Lab record submission",
    type: "Deadline",
    dateISO: "2026-11-13",
    startTime: "12:00",
    endTime: "12:00",
    venue: "Department Office",
    audience: null,
    timeZone: "Asia/Kolkata",
  },
  {
    title: "Guest lecture on AI in Healthcare",
    type: "Lecture",
    dateISO: "2026-11-13",
    startTime: "11:00",
    endTime: "12:30",
    venue: "Seminar Hall",
    audience: null,
    timeZone: "Asia/Kolkata",
  },
];

/** Expected pairwise clash kinds (order-independent) */
export const PS02_EXPECTED_CLASHES = {
  testVsLecture: { kind: "overlap", overlapMins: 30, overlapStart: "11:00", overlapEnd: "11:30" },
  deadlineVsLecture: { kind: "containment" },
  testVsDeadline: { kind: "none" },
} as const;
