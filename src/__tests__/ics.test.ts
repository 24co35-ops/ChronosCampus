import { describe, it, expect } from "vitest";
import { generateIcs } from "../lib/ics";
import type { ReviewedEvent } from "../types";

function makeEvent(overrides: Partial<ReviewedEvent> & { id: string }): ReviewedEvent {
  return {
    title: "Test Event",
    type: "Lecture",
    dateISO: "2026-11-13",
    startTime: "10:00",
    endTime: "11:30",
    venue: "Room 1",
    audience: null,
    timeZone: "Asia/Kolkata",
    rawSource: "some notice",
    sourceSpans: [],
    fieldStatus: { title:"matched",type:"matched",date:"matched",startTime:"matched",endTime:"matched",venue:"matched",audience:"missing" },
    confirmed: true,
    ...overrides,
  };
}

describe("generateIcs", () => {
  it("produces valid VCALENDAR wrapper", () => {
    const ics = generateIcs([makeEvent({ id: "e1" })]);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).toContain("VERSION:2.0");
  });

  it("contains VEVENT for each event", () => {
    const ics = generateIcs([makeEvent({ id: "e1" }), makeEvent({ id: "e2" })]);
    expect(ics.match(/BEGIN:VEVENT/g)?.length).toBe(2);
  });

  it("uses stable UID derived from event id", () => {
    const ics = generateIcs([makeEvent({ id: "abc-123" })]);
    expect(ics).toContain("UID:abc-123@noticedecoder.local");
  });

  it("deadline exported as [DEADLINE] summary with non-zero duration", () => {
    const dl = makeEvent({ id: "dl", type: "Deadline", startTime: "12:00", endTime: "12:00" });
    const ics = generateIcs([dl]);
    expect(ics).toContain("[DEADLINE]");
    // DTSTART must differ from DTEND (15-min block)
    const dtstart = ics.match(/DTSTART[^:]*:(\w+)/)?.[1];
    const dtend = ics.match(/DTEND[^:]*:(\w+)/)?.[1];
    expect(dtstart).not.toBe(dtend);
  });

  it("escapes commas in title", () => {
    const e = makeEvent({ id: "e1", title: "Room, Hall" });
    const ics = generateIcs([e]);
    expect(ics).toContain("Room\\, Hall");
  });

  it("escapes semicolons in venue", () => {
    const e = makeEvent({ id: "e1", venue: "Block A; Floor 2" });
    const ics = generateIcs([e]);
    expect(ics).toContain("Block A\\; Floor 2");
  });
});
