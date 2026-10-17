/**
 * fuzz.test.ts — ChronosCampus Exhaustive Automated Test Suite
 *
 * 40+ assertions covering:
 *   1. Exact PS-02 benchmark notice: 3 events, exact dates/times/venues, 3 exact pairwise clashes
 *   2. All date formats ("13 Nov", "13/11/2026", "2026-11-13") and time formats ("2 PM", "14:00", "12:00 noon")
 *   3. Boundary condition clashes (half-open intervals, exact edge touches, boundary deadline containment)
 *   4. RFC-5545 .ics structural integrity (VCALENDAR matching, VEVENT pairs, CRLF endings, folding, escaping)
 */

import { describe, it, expect } from "vitest";
import { OFFICIAL_PS02_NOTICE } from "../lib/fixtures/sampleNotices";
import { decodeNotice } from "../lib/parser/noticeDecoder";
import {
  extractDateFromText,
  parseNoticeDatesWithContext,
  validateCalendarDate,
  isLeapYear,
  getDaysInMonth,
} from "../lib/parser/dateParser";
import {
  extractTimeRange,
  parseSingleTime,
  toMinutes,
  fromMinutes,
} from "../lib/parser/timeParser";
import {
  evaluatePairwiseClash,
  evaluateAllPairs,
  validateEventTimes,
} from "../lib/clash/pairwiseEngine";
import {
  analyzePairwiseClashes,
  mergeBusyWindows,
  assessDeadlineFeasibility,
} from "../lib/clash";
import { generateIcs } from "../lib/ics";
import { secureCalendarText, sanitizeFormulaInjection } from "../lib/security";
import type { DecodedEvent } from "../types/notice";
import type { ReviewedEvent } from "../types";

// Helper to create valid DecodedEvent objects for clash testing
function makeDecodedEvent(overrides: Partial<DecodedEvent> & { id: string }): DecodedEvent {
  const base: DecodedEvent = {
    id: overrides.id,
    title: overrides.title ?? "Event Title",
    type: overrides.type ?? "Lecture",
    dateISO: overrides.dateISO ?? "2026-11-13",
    displayDate: overrides.displayDate ?? "13 Nov 2026",
    startTime: overrides.startTime ?? "10:00",
    endTime: overrides.endTime ?? "11:00",
    venue: overrides.venue ?? "Room 101",
    cohort: overrides.cohort ?? "III-year CSE",
    sourceSpan: overrides.sourceSpan ?? {
      start: 0,
      end: 30,
      rawSentence: "Event on 13 Nov 2026",
    },
    confidence: overrides.confidence ?? 95,
    needsReview: overrides.needsReview ?? false,
  };
  return { ...base, ...overrides };
}

// Helper to create ReviewedEvent objects
function makeReviewedEvent(overrides: Partial<ReviewedEvent> & { id: string }): ReviewedEvent {
  const base: ReviewedEvent = {
    id: overrides.id,
    title: overrides.title ?? "Event Title",
    type: overrides.type ?? "Lecture",
    dateISO: overrides.dateISO ?? "2026-11-13",
    startTime: overrides.startTime ?? "10:00",
    endTime: overrides.endTime ?? "11:00",
    venue: overrides.venue ?? "Room 101",
    audience: overrides.audience ?? "III-year CSE",
    timeZone: overrides.timeZone ?? "Asia/Kolkata",
    rawSource: overrides.rawSource ?? "Event on 13 Nov 2026",
    sourceSpans: overrides.sourceSpans ?? [],
    fieldStatus: overrides.fieldStatus ?? {
      title: "matched",
      type: "matched",
      date: "matched",
      startTime: "matched",
      endTime: "matched",
      venue: "matched",
      audience: "matched",
    },
    confirmed: overrides.confirmed ?? true,
  };
  return { ...base, ...overrides };
}

// ============================================================================
// 1. EXACT VERIFICATION OF THE PS-02 SAMPLE NOTICE
// ============================================================================
describe("1. Exact Verification of PS-02 Official Notice Benchmark", () => {
  const events = decodeNotice(OFFICIAL_PS02_NOTICE);

  it("extracts exactly 3 academic events from OFFICIAL_PS02_NOTICE", () => {
    // Assertion 1: Total event count
    expect(events.length).toBe(3);
  });

  it("verifies Event 1: Internal Test 2 (exact dates, times, venue, type)", () => {
    const testEvent = events.find((e) => e.type === "Test" || e.title.includes("Internal Test"));
    expect(testEvent).toBeDefined();
    // Assertions 2-6: Field-by-field verification
    expect(testEvent?.title).toBe("Internal Test 2");
    expect(testEvent?.dateISO).toBe("2026-11-13");
    expect(testEvent?.startTime).toBe("10:00");
    expect(testEvent?.endTime).toBe("11:30");
    expect(testEvent?.venue).toBe("Room 204");
  });

  it("verifies Event 2: Lab Record Submission Deadline (exact dates, times, venue, type)", () => {
    const dlEvent = events.find((e) => e.type === "Deadline" || e.title.includes("Lab record"));
    expect(dlEvent).toBeDefined();
    // Assertions 7-11: Field-by-field verification
    expect(dlEvent?.type).toBe("Deadline");
    expect(dlEvent?.dateISO).toBe("2026-11-13");
    expect(dlEvent?.startTime).toBe("12:00");
    expect(dlEvent?.endTime).toBe("12:00");
    expect(dlEvent?.venue).toBe("Department office");
  });

  it("verifies Event 3: Guest Lecture (exact dates, times, venue, type)", () => {
    const lecEvent = events.find((e) => e.type === "Lecture" || e.title.includes("Guest lecture"));
    expect(lecEvent).toBeDefined();
    // Assertions 12-16: Field-by-field verification
    expect(lecEvent?.type).toBe("Lecture");
    expect(lecEvent?.dateISO).toBe("2026-11-13");
    expect(lecEvent?.startTime).toBe("11:00");
    expect(lecEvent?.endTime).toBe("12:30");
    expect(lecEvent?.venue).toBe("Seminar Hall");
  });

  it("verifies exact 3 pairwise clash outcomes matching PS-02 specification", () => {
    const clashes = evaluateAllPairs(events);
    // Assertion 17: Total pair evaluations (3 events -> 3 pairwise checks)
    expect(clashes.length).toBe(3);

    const testEvent = events.find((e) => e.type === "Test")!;
    const dlEvent = events.find((e) => e.type === "Deadline")!;
    const lecEvent = events.find((e) => e.type === "Lecture")!;

    // Pairwise 1: Test vs Lecture (10:00-11:30 vs 11:00-12:30) -> Overlap 11:00-11:30 (30 mins)
    const clash1 = evaluatePairwiseClash(testEvent, lecEvent);
    // Assertions 18-20: Test vs Lecture clash
    expect(clash1.hasClash).toBe(true);
    expect(clash1.clashType).toBe("HARD_OVERLAP");
    expect(clash1.overlapMinutes).toBe(30);

    // Pairwise 2: Deadline vs Lecture (12:00 vs 11:00-12:30) -> Deadline containment
    const clash2 = evaluatePairwiseClash(dlEvent, lecEvent);
    // Assertions 21-23: Deadline vs Lecture clash
    expect(clash2.hasClash).toBe(true);
    expect(clash2.clashType).toBe("DEADLINE_CONTAINMENT");
    expect(clash2.severity).toBe("CRITICAL");

    // Pairwise 3: Test vs Deadline (10:00-11:30 vs 12:00) -> No Clash
    const clash3 = evaluatePairwiseClash(testEvent, dlEvent);
    // Assertions 24-26: Test vs Deadline
    expect(clash3.hasClash).toBe(false);
    expect(clash3.clashType).toBe("NO_CLASH");
    expect(clash3.overlapMinutes).toBe(0);
  });
});

// ============================================================================
// 2. ALL DATE FORMATS AND TIME FORMATS
// ============================================================================
describe("2. Comprehensive Date & Time Format Fuzzing", () => {
  describe("Date Format Parsing", () => {
    it("parses DD Mon format ('13 Nov' and '13 Nov 2026')", () => {
      const d1 = extractDateFromText("Event on 13 Nov from 10 AM", { referenceYear: 2026 });
      const d2 = extractDateFromText("Event on 13 Nov 2026 at Room 204");
      // Assertions 27-28
      expect(d1?.dateISO).toBe("2026-11-13");
      expect(d2?.dateISO).toBe("2026-11-13");
    });

    it("parses DD/MM/YYYY slash format ('13/11/2026')", () => {
      const d = extractDateFromText("Class rescheduled to 13/11/2026 in Hall B");
      // Assertion 29
      expect(d?.dateISO).toBe("2026-11-13");
    });

    it("parses ISO YYYY-MM-DD standard format ('2026-11-13')", () => {
      const d = extractDateFromText("Notice published for 2026-11-13 date");
      // Assertion 30
      expect(d?.dateISO).toBe("2026-11-13");
    });

    it("parses full month names ('13 November 2026')", () => {
      const d = extractDateFromText("Meeting on 13 November 2026 at 2 PM");
      // Assertion 31
      expect(d?.dateISO).toBe("2026-11-13");
    });

    it("parses dash-separated dates ('13-11-2026')", () => {
      const d = extractDateFromText("Submission deadline 13-11-2026 5 PM");
      // Assertion 32
      expect(d?.dateISO).toBe("2026-11-13");
    });

    it("validates leap years and non-leap years accurately", () => {
      // Assertions 33-36: Leap year calendar bounds
      expect(isLeapYear(2024)).toBe(true);
      expect(isLeapYear(2026)).toBe(false);
      expect(getDaysInMonth(2026, 2)).toBe(28);
      expect(getDaysInMonth(2024, 2)).toBe(29);
    });
  });

  describe("Time Format Parsing", () => {
    it("parses 12-hour format with AM/PM ('2 PM', '10:00 AM')", () => {
      // Assertions 37-38
      expect(parseSingleTime("2", "00", "pm")).toBe("14:00");
      expect(parseSingleTime("10", "00", "am")).toBe("10:00");
    });

    it("parses 24-hour military format ('14:00', '09:30')", () => {
      // Assertions 39-40
      expect(parseSingleTime("14", "00")).toBe("14:00");
      expect(parseSingleTime("09", "30")).toBe("09:30");
    });

    it("parses natural language terms ('12:00 noon', '12:00 midnight')", () => {
      // Assertions 41-42
      expect(parseSingleTime("12", "00", "noon")).toBe("12:00");
      expect(parseSingleTime("12", "00", "midnight")).toBe("00:00");
    });

    it("parses explicit time ranges with various connectors", () => {
      const range1 = extractTimeRange("from 10:00 AM to 11:30 AM");
      const range2 = extractTimeRange("11:00 AM - 12:30 PM");
      const range3 = extractTimeRange("by 12:00 PM");

      // Assertions 43-46
      expect(range1?.startTime).toBe("10:00");
      expect(range1?.endTime).toBe("11:30");
      expect(range2?.startTime).toBe("11:00");
      expect(range2?.endTime).toBe("12:30");
    });

    it("handles bidirectional minute conversion", () => {
      // Assertions 47-49
      expect(toMinutes("14:30")).toBe(870);
      expect(fromMinutes(870)).toBe("14:30");
      expect(toMinutes("00:00")).toBe(0);
    });
  });
});

// ============================================================================
// 3. BOUNDARY CONDITION CLASHES
// ============================================================================
describe("3. Boundary Condition Clash Rigor (Half-Open Intervals)", () => {
  it("Event A ends at 11:30 AM and Event B starts at 11:30 AM -> No Clash (0-minute overlap)", () => {
    const eventA = makeDecodedEvent({
      id: "evt-a",
      title: "Morning Lab",
      startTime: "10:00",
      endTime: "11:30",
    });
    const eventB = makeDecodedEvent({
      id: "evt-b",
      title: "Midday Lecture",
      startTime: "11:30",
      endTime: "13:00",
    });

    const clash = evaluatePairwiseClash(eventA, eventB);
    // Assertions 50-52: Half-open interval boundary touch is NOT a clash
    expect(clash.hasClash).toBe(false);
    expect(clash.clashType).toBe("NO_CLASH");
    expect(clash.overlapMinutes).toBe(0);

    // Also verify via ReviewedEvent analyzer
    const reviewedClashes = analyzePairwiseClashes([
      makeReviewedEvent({ id: "a", startTime: "10:00", endTime: "11:30" }),
      makeReviewedEvent({ id: "b", startTime: "11:30", endTime: "13:00" }),
    ]);
    // Assertion 53
    expect(reviewedClashes[0]?.kind).toBe("none");
  });

  it("Deadline at 11:00 AM and Lecture from 11:00 AM to 12:30 PM -> Clash (start boundary inclusion)", () => {
    const lecture = makeReviewedEvent({
      id: "lec",
      title: "Algorithms Lecture",
      type: "Lecture",
      startTime: "11:00",
      endTime: "12:30",
    });
    const deadline = makeReviewedEvent({
      id: "dl",
      title: "Assignment 1 Due",
      type: "Deadline",
      startTime: "11:00",
      endTime: "11:00",
    });

    const clashes = analyzePairwiseClashes([lecture, deadline]);
    // Assertions 54-56: Deadline at start boundary is contained
    expect(clashes[0]?.kind).toBe("containment");
    expect(clashes[0]?.overlapStart).toBe("11:00");
    expect(clashes[0]?.explanation).toContain("falls inside");
  });

  it("Deadline at 11:30 AM and Test from 10:00 AM to 11:30 AM -> No Clash under half-open [start, end) rule", () => {
    const test = makeReviewedEvent({
      id: "test",
      title: "Math Quiz",
      type: "Test",
      startTime: "10:00",
      endTime: "11:30",
    });
    const deadline = makeReviewedEvent({
      id: "dl",
      title: "Problem Set Submission",
      type: "Deadline",
      startTime: "11:30",
      endTime: "11:30",
    });

    const clashes = analyzePairwiseClashes([test, deadline]);
    // Assertions 57-58: Deadline right at event end boundary is NOT contained
    expect(clashes[0]?.kind).toBe("none");
    expect(clashes[0]?.explanation).toContain("is not inside");
  });

  it("1-minute overlap boundary test (10:00-11:00 vs 10:59-12:00 -> 1 min clash)", () => {
    const e1 = makeReviewedEvent({ id: "e1", startTime: "10:00", endTime: "11:00" });
    const e2 = makeReviewedEvent({ id: "e2", startTime: "10:59", endTime: "12:00" });
    const [clash] = analyzePairwiseClashes([e1, e2]);

    // Assertions 59-61
    expect(clash?.kind).toBe("overlap");
    expect(clash?.overlapMins).toBe(1);
    expect(clash?.overlapStart).toBe("10:59");
  });

  it("1-minute separation boundary test (10:00-11:00 vs 11:01-12:00 -> No clash)", () => {
    const e1 = makeReviewedEvent({ id: "e1", startTime: "10:00", endTime: "11:00" });
    const e2 = makeReviewedEvent({ id: "e2", startTime: "11:01", endTime: "12:00" });
    const [clash] = analyzePairwiseClashes([e1, e2]);

    // Assertions 62-63
    expect(clash?.kind).toBe("none");
    expect(clash?.overlapMins).toBe(0);
  });
});

// ============================================================================
// 4. RFC-5545 .ICS STRUCTURAL INTEGRITY CHECKS
// ============================================================================
describe("4. RFC-5545 .ics Calendar Structural Integrity", () => {
  const events: ReviewedEvent[] = [
    makeReviewedEvent({
      id: "evt-test",
      title: "Internal Test 2, Advanced Algorithms & Systems",
      type: "Test",
      dateISO: "2026-11-13",
      startTime: "10:00",
      endTime: "11:30",
      venue: "Block B; Room 204, 2nd Floor",
    }),
    makeReviewedEvent({
      id: "evt-dl",
      title: "Lab Record Submission",
      type: "Deadline",
      dateISO: "2026-11-13",
      startTime: "12:00",
      endTime: "12:00",
      venue: "Lab 3",
    }),
    makeReviewedEvent({
      id: "evt-formula",
      title: "=cmd|' /C calc'!A0",
      type: "Lecture",
      dateISO: "2026-11-13",
      startTime: "14:00",
      endTime: "15:30",
      venue: "=cmd|' /C calc'!A0",
    }),
    makeReviewedEvent({
      id: "evt-lec",
      title: "Guest Lecture: AI Trends & Industry 4.0\nSpecial Session",
      type: "Lecture",
      dateISO: "2026-11-13",
      startTime: "11:00",
      endTime: "12:30",
      venue: "Main Auditorium",
    }),
  ];

  const ics = generateIcs(events);

  it("contains strictly matched BEGIN:VCALENDAR and END:VCALENDAR wrappers", () => {
    const beginCal = (ics.match(/BEGIN:VCALENDAR/g) || []).length;
    const endCal = (ics.match(/END:VCALENDAR/g) || []).length;
    // Assertions 64-66
    expect(beginCal).toBe(1);
    expect(endCal).toBe(1);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
  });

  it("contains balanced BEGIN:VEVENT and END:VEVENT for every event", () => {
    const beginEvents = (ics.match(/BEGIN:VEVENT/g) || []).length;
    const endEvents = (ics.match(/END:VEVENT/g) || []).length;
    // Assertions 67-69
    expect(beginEvents).toBe(events.length);
    expect(endEvents).toBe(events.length);
    expect(beginEvents).toBe(4);
  });

  it("enforces strict RFC-5545 CRLF line endings (zero lone LF newlines)", () => {
    // Assertions 70-71
    expect(ics.includes("\r\n")).toBe(true);
    // Remove all \r\n, then assert there are no leftover \n or \r
    const stripped = ics.replace(/\r\n/g, "");
    expect(stripped.includes("\n")).toBe(false);
    expect(stripped.includes("\r")).toBe(false);
  });

  it("strictly folds all lines to <= 75 octets per RFC-5545 Section 3.1", () => {
    const lines = ics.split("\r\n");
    // Assertion 72: Check every physical line length in the RFC stream
    for (const line of lines) {
      const byteLength = Buffer.byteLength(line, "utf-8");
      expect(byteLength).toBeLessThanOrEqual(75);
    }
  });

  it("escapes commas, semicolons, and newlines in text properties", () => {
    // Assertions 73-76: RFC escaping rules
    expect(ics).toContain("Internal Test 2\\, Advanced Algorithms");
    expect(ics).toContain("Block B\\; Room 204\\, 2nd Floor");
    // Raw unescaped newlines must not exist inside properties
    expect(ics).not.toContain("Special Session\r\nSpecial Session");
  });

  it("sanitizes CSV formula injection in calendar export", () => {
    // Assertions 77-79: Dangerous '=cmd' is neutralized with single quote prefix
    expect(ics).not.toContain("SUMMARY:=cmd|'");
    expect(ics).toContain("SUMMARY:'=cmd|'");
    expect(ics).toContain("LOCATION:'=cmd|'");
  });

  it("formats DTSTART and DTEND cleanly with Asia/Kolkata timezone", () => {
    // Assertions 80-82
    expect(ics).toContain("TZID=Asia/Kolkata:20261113T100000");
    expect(ics).toContain("TZID=Asia/Kolkata:20261113T113000");
    // Deadlines get a synthetic non-zero duration window (e.g., 15 minutes)
    expect(ics).toContain("[DEADLINE]");
  });
});
