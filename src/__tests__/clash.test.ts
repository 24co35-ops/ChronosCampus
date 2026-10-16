import { describe, it, expect } from "vitest";
import { analyzePairwiseClashes, mergeBusyWindows, toMins, fromMins } from "../lib/clash";
import type { ReviewedEvent } from "../types";

function makeEvent(overrides: Partial<ReviewedEvent> & { id: string }): ReviewedEvent {
  return {
    title: "Event",
    type: "Lecture",
    dateISO: "2026-11-13",
    startTime: "10:00",
    endTime: "11:00",
    venue: null,
    audience: null,
    timeZone: "Asia/Kolkata",
    rawSource: "",
    sourceSpans: [],
    fieldStatus: { title:"matched",type:"matched",date:"matched",startTime:"matched",endTime:"matched",venue:"missing",audience:"missing" },
    confirmed: false,
    ...overrides,
  };
}

describe("toMins / fromMins", () => {
  it("10:00 → 600", () => expect(toMins("10:00")).toBe(600));
  it("fromMins(600) → 10:00", () => expect(fromMins(600)).toBe("10:00"));
});

describe("half-open interval boundary", () => {
  it("event ending at 11:00 and next starting at 11:00 → no overlap", () => {
    const a = makeEvent({ id: "a", startTime: "10:00", endTime: "11:00" });
    const b = makeEvent({ id: "b", startTime: "11:00", endTime: "12:00" });
    const [res] = analyzePairwiseClashes([a, b]);
    expect(res?.kind).toBe("none");
  });

  it("10:00–11:30 vs 11:00–12:30 → overlap 30 min", () => {
    const a = makeEvent({ id: "a", startTime: "10:00", endTime: "11:30", type: "Test" });
    const b = makeEvent({ id: "b", startTime: "11:00", endTime: "12:30" });
    const [res] = analyzePairwiseClashes([a, b]);
    expect(res?.kind).toBe("overlap");
    expect(res?.overlapMins).toBe(30);
    expect(res?.overlapStart).toBe("11:00");
    expect(res?.overlapEnd).toBe("11:30");
  });
});

describe("PS-02 pairwise outcomes", () => {
  const test = makeEvent({ id: "test", title: "Internal Test 2", type: "Test", startTime: "10:00", endTime: "11:30" });
  const deadline = makeEvent({ id: "dl", title: "Lab record", type: "Deadline", startTime: "12:00", endTime: "12:00" });
  const lecture = makeEvent({ id: "lec", title: "Guest Lecture", type: "Lecture", startTime: "11:00", endTime: "12:30" });
  const events = [test, deadline, lecture];
  const clashes = analyzePairwiseClashes(events);

  it("test vs lecture: overlap 30 min at 11:00–11:30", () => {
    const c = clashes.find((c) => new Set([c.eventA,c.eventB]).has("test") && new Set([c.eventA,c.eventB]).has("lec"));
    expect(c?.kind).toBe("overlap");
    expect(c?.overlapMins).toBe(30);
    expect(c?.overlapStart).toBe("11:00");
    expect(c?.overlapEnd).toBe("11:30");
  });

  it("deadline vs lecture: containment (12:00 inside 11:00–12:30)", () => {
    const c = clashes.find((c) => new Set([c.eventA,c.eventB]).has("dl") && new Set([c.eventA,c.eventB]).has("lec"));
    expect(c?.kind).toBe("containment");
  });

  it("test vs deadline: no direct clash (test ends 11:30, deadline at 12:00)", () => {
    const c = clashes.find((c) => new Set([c.eventA,c.eventB]).has("test") && new Set([c.eventA,c.eventB]).has("dl"));
    expect(c?.kind).toBe("none");
  });
});

describe("deadline at event end time: no containment under half-open rule", () => {
  it("deadline at 12:30, event ends at 12:30 → none", () => {
    const lec = makeEvent({ id: "l", startTime: "11:00", endTime: "12:30" });
    const dl = makeEvent({ id: "d", type: "Deadline", startTime: "12:30", endTime: "12:30" });
    const [r] = analyzePairwiseClashes([lec, dl]);
    expect(r?.kind).toBe("none");
  });
});

describe("mergeBusyWindows", () => {
  it("merges overlapping intervals into one window", () => {
    const a = makeEvent({ id: "a", startTime: "10:00", endTime: "11:30" });
    const b = makeEvent({ id: "b", startTime: "11:00", endTime: "12:30" });
    const windows = mergeBusyWindows([a, b]);
    expect(windows).toHaveLength(1);
    expect(windows[0]?.start).toBe("10:00");
    expect(windows[0]?.end).toBe("12:30");
  });

  it("non-overlapping events produce two windows", () => {
    const a = makeEvent({ id: "a", startTime: "09:00", endTime: "10:00" });
    const b = makeEvent({ id: "b", startTime: "11:00", endTime: "12:00" });
    const windows = mergeBusyWindows([a, b]);
    expect(windows).toHaveLength(2);
  });
});
