import { describe, it, expect } from "vitest";
import {
  dateISOSchema,
  timeSchema,
  decodedEventSchema,
  pairwiseClashResultSchema,
  compoundBusyBlockSchema,
  isValidCalendarDate,
  isValidTime24,
} from "../lib/validation/schemas";
import type { DecodedEvent, PairwiseClashResult, CompoundBusyBlock } from "../types/notice";

describe("Calendar Date Validation (dateISOSchema & isValidCalendarDate)", () => {
  it("rejects non-existent 2026-02-30", () => {
    expect(isValidCalendarDate("2026-02-30")).toBe(false);
    const result = dateISOSchema.safeParse("2026-02-30");
    expect(result.success).toBe(false);
  });

  it("rejects non-leap year 2026-02-29", () => {
    expect(isValidCalendarDate("2026-02-29")).toBe(false);
    const result = dateISOSchema.safeParse("2026-02-29");
    expect(result.success).toBe(false);
  });

  it("accepts leap year 2024-02-29", () => {
    expect(isValidCalendarDate("2024-02-29")).toBe(true);
    const result = dateISOSchema.safeParse("2024-02-29");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("2024-02-29");
  });

  it("accepts 400-year leap year 2000-02-29", () => {
    expect(isValidCalendarDate("2000-02-29")).toBe(true);
  });

  it("rejects century non-leap year 1900-02-29", () => {
    expect(isValidCalendarDate("1900-02-29")).toBe(false);
  });

  it("rejects 2026-04-31 (April has only 30 days)", () => {
    expect(isValidCalendarDate("2026-04-31")).toBe(false);
    expect(dateISOSchema.safeParse("2026-04-31").success).toBe(false);
  });

  it("rejects invalid months 2026-13-01 and 2026-00-10", () => {
    expect(dateISOSchema.safeParse("2026-13-01").success).toBe(false);
    expect(dateISOSchema.safeParse("2026-00-10").success).toBe(false);
  });

  it("accepts real calendar date 2026-11-13", () => {
    expect(dateISOSchema.safeParse("2026-11-13").success).toBe(true);
  });

  it("rejects malformed string 'not-a-date'", () => {
    expect(dateISOSchema.safeParse("not-a-date").success).toBe(false);
  });
});

describe("24-Hour Time Validation (timeSchema & isValidTime24)", () => {
  it("rejects 25:99 cleanly", () => {
    expect(isValidTime24("25:99")).toBe(false);
    const result = timeSchema.safeParse("25:99");
    expect(result.success).toBe(false);
  });

  it("rejects 24:00 (must be 00:00 to 23:59)", () => {
    expect(isValidTime24("24:00")).toBe(false);
    expect(timeSchema.safeParse("24:00").success).toBe(false);
  });

  it("rejects 12:60 (invalid minutes)", () => {
    expect(isValidTime24("12:60")).toBe(false);
    expect(timeSchema.safeParse("12:60").success).toBe(false);
  });

  it("rejects 9:30 (missing leading zero)", () => {
    expect(isValidTime24("9:30")).toBe(false);
    expect(timeSchema.safeParse("9:30").success).toBe(false);
  });

  it("accepts valid boundary times 00:00, 12:00, 23:59", () => {
    expect(timeSchema.safeParse("00:00").success).toBe(true);
    expect(timeSchema.safeParse("12:00").success).toBe(true);
    expect(timeSchema.safeParse("23:59").success).toBe(true);
  });
});

describe("DecodedEvent Schema", () => {
  const baseValidEvent = {
    id: "test-event-1",
    title: "Internal Test 2",
    type: "Test",
    dateISO: "2026-11-13",
    displayDate: "13 Nov 2026",
    startTime: "10:00",
    endTime: "11:30",
    venue: "Room 204",
    cohort: "III-year CSE",
    confidence: 95,
    needsReview: false,
    sourceSpan: {
      start: 0,
      end: 104,
      rawSentence: "Internal Test 2 is scheduled for 13 Nov 2026 from 10:00 AM to 11:30 AM in Room 204 for III-year CSE students.",
    },
  };

  it("accepts a fully valid Test event", () => {
    const result = decodedEventSchema.safeParse(baseValidEvent);
    expect(result.success).toBe(true);
  });

  it("applies defaults for venue ('TBD') and cohort ('All Students')", () => {
    const { venue, cohort, ...withoutDefaults } = baseValidEvent;
    const result = decodedEventSchema.safeParse(withoutDefaults);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.venue).toBe("TBD");
      expect(result.data.cohort).toBe("All Students");
    }
  });

  it("enforces endTime === startTime for Deadline events", () => {
    const validDeadline = {
      ...baseValidEvent,
      id: "deadline-1",
      title: "Lab Record Submission",
      type: "Deadline",
      startTime: "12:00",
      endTime: "12:00",
    };
    expect(decodedEventSchema.safeParse(validDeadline).success).toBe(true);

    const invalidDeadline = {
      ...validDeadline,
      endTime: "13:00", // Not equal to startTime
    };
    const result = decodedEventSchema.safeParse(invalidDeadline);
    expect(result.success).toBe(false);
  });

  it("enforces needsReview: true when confidence < 80", () => {
    const lowConfidenceNeedsReview = {
      ...baseValidEvent,
      confidence: 65,
      needsReview: true,
    };
    expect(decodedEventSchema.safeParse(lowConfidenceNeedsReview).success).toBe(true);

    const lowConfidenceWithoutNeedsReview = {
      ...baseValidEvent,
      confidence: 65,
      needsReview: false, // Must be true!
    };
    const result = decodedEventSchema.safeParse(lowConfidenceWithoutNeedsReview);
    expect(result.success).toBe(false);
  });

  it("rejects empty title and title exceeding 200 characters", () => {
    expect(decodedEventSchema.safeParse({ ...baseValidEvent, title: "" }).success).toBe(false);
    expect(
      decodedEventSchema.safeParse({
        ...baseValidEvent,
        title: "A".repeat(201),
      }).success
    ).toBe(false);
  });

  it("rejects invalid dateISO (2026-02-30) inside DecodedEvent", () => {
    const result = decodedEventSchema.safeParse({
      ...baseValidEvent,
      dateISO: "2026-02-30",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid startTime (25:99) inside DecodedEvent", () => {
    const result = decodedEventSchema.safeParse({
      ...baseValidEvent,
      startTime: "25:99",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid sourceSpan when end < start", () => {
    const result = decodedEventSchema.safeParse({
      ...baseValidEvent,
      sourceSpan: {
        start: 50,
        end: 20, // end < start
        rawSentence: "test",
      },
    });
    expect(result.success).toBe(false);
  });
});

describe("PairwiseClashResult Schema", () => {
  it("validates a HARD_OVERLAP clash result", () => {
    const clash: PairwiseClashResult = {
      id: "clash-1-2",
      eventA: "event-1",
      eventB: "event-2",
      hasClash: true,
      clashType: "HARD_OVERLAP",
      overlapMinutes: 30,
      overlapWindow: { start: "11:00", end: "11:30" },
      explanation: "30-minute interval overlap between Internal Test 2 and Guest Lecture",
      severity: "CRITICAL",
    };
    const result = pairwiseClashResultSchema.safeParse(clash);
    expect(result.success).toBe(true);
  });

  it("validates a NO_CLASH result with null overlapWindow", () => {
    const noClash = {
      id: "clash-1-3",
      eventA: "event-1",
      eventB: "event-3",
      hasClash: false,
      clashType: "NO_CLASH",
      overlapMinutes: 0,
      overlapWindow: null,
      explanation: "Events occur at different times",
      severity: "SAFE",
    };
    const result = pairwiseClashResultSchema.safeParse(noClash);
    expect(result.success).toBe(true);
  });

  it("rejects invalid clashType and severity", () => {
    const invalid = {
      id: "clash-x",
      eventA: "a",
      eventB: "b",
      hasClash: true,
      clashType: "RANDOM_TYPE",
      overlapMinutes: 10,
      overlapWindow: null,
      explanation: "invalid",
      severity: "EXTREME",
    };
    expect(pairwiseClashResultSchema.safeParse(invalid).success).toBe(false);
  });
});

describe("CompoundBusyBlock Schema", () => {
  const event1: DecodedEvent = {
    id: "e1",
    title: "Session 1",
    type: "Lecture",
    dateISO: "2026-11-13",
    displayDate: "13 Nov 2026",
    startTime: "10:00",
    endTime: "11:30",
    venue: "Hall 1",
    cohort: "All Students",
    confidence: 90,
    needsReview: false,
    sourceSpan: { start: 0, end: 50, rawSentence: "Session 1" },
  };

  const deadline1: DecodedEvent = {
    id: "d1",
    title: "Submission 1",
    type: "Deadline",
    dateISO: "2026-11-13",
    displayDate: "13 Nov 2026",
    startTime: "11:00",
    endTime: "11:00",
    venue: "Office",
    cohort: "All Students",
    confidence: 85,
    needsReview: false,
    sourceSpan: { start: 51, end: 100, rawSentence: "Submission 1" },
  };

  it("validates a valid CompoundBusyBlock with trapped deadlines", () => {
    const block: CompoundBusyBlock = {
      dateISO: "2026-11-13",
      mergedStart: "10:00",
      mergedEnd: "12:30",
      events: [event1],
      trappedDeadlines: [deadline1],
    };
    const result = compoundBusyBlockSchema.safeParse(block);
    expect(result.success).toBe(true);
  });

  it("rejects a CompoundBusyBlock with invalid date or mergedEnd < mergedStart", () => {
    expect(
      compoundBusyBlockSchema.safeParse({
        dateISO: "2026-02-30", // Invalid calendar date
        mergedStart: "10:00",
        mergedEnd: "12:00",
        events: [],
        trappedDeadlines: [],
      }).success
    ).toBe(false);

    expect(
      compoundBusyBlockSchema.safeParse({
        dateISO: "2026-11-13",
        mergedStart: "14:00",
        mergedEnd: "10:00", // mergedEnd < mergedStart
        events: [],
        trappedDeadlines: [],
      }).success
    ).toBe(false);
  });
});
