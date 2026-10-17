import { describe, it, expect } from "vitest";
import {
  toMinutes,
  fromMinutes,
  format12Hour,
  validateEventTimes,
  evaluatePairwiseClash,
  evaluateAllPairs,
} from "../lib/clash/pairwiseEngine";
import { parseNoticeText } from "../lib/parser/entityExtractor";
import { OFFICIAL_PS02_NOTICE } from "../lib/fixtures/sampleNotices";
import type { DecodedEvent } from "../types/notice";

describe("PairwiseEngine - 1. Time Arithmetic & 12-Hour Conversion", () => {
  it("converts HH:mm to minutes from midnight (0 <= t <= 1440)", () => {
    expect(toMinutes("00:00")).toBe(0);
    expect(toMinutes("10:00")).toBe(600);
    expect(toMinutes("11:30")).toBe(690);
    expect(toMinutes("12:00")).toBe(720);
    expect(toMinutes("12:30")).toBe(750);
    expect(toMinutes("23:59")).toBe(1439);
    expect(toMinutes("24:00")).toBe(1440);
  });

  it("converts minutes back to 24h format and 12-hour AM/PM string", () => {
    expect(fromMinutes(600)).toBe("10:00");
    expect(format12Hour("10:00")).toBe("10:00 AM");
    expect(format12Hour("11:30")).toBe("11:30 AM");
    expect(format12Hour("12:00")).toBe("12:00 PM");
    expect(format12Hour("12:30")).toBe("12:30 PM");
    expect(format12Hour("13:00")).toBe("1:00 PM");
    expect(format12Hour("14:30")).toBe("2:30 PM");
  });
});

describe("PairwiseEngine - 2. Overnight / Invalid Time Guard", () => {
  it("flags validation error when endTime < startTime", () => {
    const invalid = validateEventTimes({
      startTime: "14:00",
      endTime: "11:00",
      type: "Test",
    });
    expect(invalid.isValid).toBe(false);
    expect(invalid.error).toBe("End time cannot be earlier than start time");
  });

  it("accepts valid intervals where startTime <= endTime", () => {
    expect(validateEventTimes({ startTime: "10:00", endTime: "11:30" }).isValid).toBe(true);
    expect(validateEventTimes({ startTime: "12:00", endTime: "12:00" }).isValid).toBe(true);
  });

  it("exempts Deadlines from overnight check since startTime === endTime", () => {
    expect(validateEventTimes({ startTime: "12:00", endTime: "12:00", type: "Deadline" }).isValid).toBe(true);
  });
});

describe("PairwiseEngine - 3. Word-for-Word PS-02 Document Output Benchmark", () => {
  const events = parseNoticeText(OFFICIAL_PS02_NOTICE);

  const testEvent = events.find((e) => e.type === "Test")!;
  const deadlineEvent = events.find((e) => e.type === "Deadline")!;
  const lectureEvent = events.find((e) => e.type === "Lecture")!;

  it("Comparison 1 (Test vs Lecture): matches word-for-word 'Clash. They overlap from 11:00 AM to 11:30 AM (30 minutes).'", () => {
    const clash = evaluatePairwiseClash(testEvent, lectureEvent);

    expect(clash.hasClash).toBe(true);
    expect(clash.clashType).toBe("HARD_OVERLAP");
    expect(clash.overlapMinutes).toBe(30);
    expect(clash.overlapWindow).toEqual({ start: "11:00", end: "11:30" });
    expect(clash.explanation).toBe("Clash. They overlap from 11:00 AM to 11:30 AM (30 minutes).");
  });

  it("Comparison 2 (Deadline vs Lecture): matches word-for-word 'Clash. The 12:00 PM deadline falls during the lecture.'", () => {
    const clash = evaluatePairwiseClash(deadlineEvent, lectureEvent);

    expect(clash.hasClash).toBe(true);
    expect(clash.clashType).toBe("DEADLINE_CONTAINMENT");
    expect(clash.overlapMinutes).toBe(0);
    expect(clash.overlapWindow).toEqual({ start: "12:00", end: "12:00" });
    expect(clash.explanation).toBe("Clash. The 12:00 PM deadline falls during the lecture.");
  });

  it("Comparison 3 (Test vs Deadline): matches word-for-word 'No clash. The test ends at 11:30 AM, before the deadline.'", () => {
    const clash = evaluatePairwiseClash(testEvent, deadlineEvent);

    expect(clash.hasClash).toBe(false);
    expect(clash.clashType).toBe("NO_CLASH");
    expect(clash.overlapMinutes).toBe(0);
    expect(clash.overlapWindow).toBeNull();
    expect(clash.explanation).toBe("No clash. The test ends at 11:30 AM, before the deadline.");
  });

  it("evaluates all pairs for the official notice producing exactly 3 pairwise outcomes", () => {
    const allPairs = evaluateAllPairs(events);
    expect(allPairs.length).toBe(3);

    const hasOverlap = allPairs.some((c) => c.clashType === "HARD_OVERLAP");
    const hasContainment = allPairs.some((c) => c.clashType === "DEADLINE_CONTAINMENT");
    const hasNoClash = allPairs.some((c) => c.clashType === "NO_CLASH");

    expect(hasOverlap).toBe(true);
    expect(hasContainment).toBe(true);
    expect(hasNoClash).toBe(true);
  });
});

describe("PairwiseEngine - 4. Rule C (Deadline vs Deadline Collision)", () => {
  it("flags simultaneous physical deadlines at different venues as a critical clash", () => {
    const d1: DecodedEvent = {
      id: "d1",
      title: "Hardcopy Record",
      type: "Deadline",
      dateISO: "2026-11-13",
      displayDate: "13 Nov 2026",
      startTime: "12:00",
      endTime: "12:00",
      venue: "Department office",
      cohort: "III-year CSE",
      confidence: 95,
      needsReview: false,
      sourceSpan: { start: 0, end: 10, rawSentence: "" },
    };

    const d2: DecodedEvent = {
      id: "d2",
      title: "Library Book Return",
      type: "Deadline",
      dateISO: "2026-11-13",
      displayDate: "13 Nov 2026",
      startTime: "12:00",
      endTime: "12:00",
      venue: "Central Library",
      cohort: "III-year CSE",
      confidence: 95,
      needsReview: false,
      sourceSpan: { start: 0, end: 10, rawSentence: "" },
    };

    const clash = evaluatePairwiseClash(d1, d2);
    expect(clash.hasClash).toBe(true);
    expect(clash.clashType).toBe("HARD_OVERLAP");
    expect(clash.severity).toBe("CRITICAL");
    expect(clash.explanation).toContain("Two simultaneous physical submission deadlines");
    expect(clash.explanation).toContain("Department office");
    expect(clash.explanation).toContain("Central Library");
  });

  it("does not clash when deadlines occur at the same venue", () => {
    const d1: DecodedEvent = {
      id: "d1",
      title: "Record A",
      type: "Deadline",
      dateISO: "2026-11-13",
      displayDate: "13 Nov 2026",
      startTime: "12:00",
      endTime: "12:00",
      venue: "Department office",
      cohort: "CSE",
      confidence: 95,
      needsReview: false,
      sourceSpan: { start: 0, end: 10, rawSentence: "" },
    };

    const d2: DecodedEvent = {
      ...d1,
      id: "d2",
      title: "Record B",
    };

    const clash = evaluatePairwiseClash(d1, d2);
    expect(clash.hasClash).toBe(false);
    expect(clash.clashType).toBe("NO_CLASH");
    expect(clash.explanation).toContain("same submission location");
  });
});