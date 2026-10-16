import { describe, it, expect } from "vitest";
import {
  extractDateFromText,
  parseNoticeDatesWithContext,
  isLeapYear,
  getDaysInMonth,
  validateCalendarDate,
} from "../lib/parser/dateParser";

describe("Calendar Date Correctness (validateCalendarDate)", () => {
  it("rejects 31/11/2026 because November has only 30 days", () => {
    const res = validateCalendarDate(2026, 11, 31);
    expect(res.isValid).toBe(false);
    expect(res.warning).toContain("November has only 30 days");
  });

  it("rejects 29/02/2026 because 2026 is not a leap year", () => {
    expect(isLeapYear(2026)).toBe(false);
    const res = validateCalendarDate(2026, 2, 29);
    expect(res.isValid).toBe(false);
    expect(res.warning).toContain("not a leap year");
  });

  it("accepts 29/02/2024 because 2024 is a leap year", () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(getDaysInMonth(2024, 2)).toBe(29);
    const res = validateCalendarDate(2024, 2, 29);
    expect(res.isValid).toBe(true);
    expect(res.warning).toBeNull();
  });

  it("rejects impossible days (> 31) and impossible months (> 12)", () => {
    expect(validateCalendarDate(2026, 1, 32).isValid).toBe(false);
    expect(validateCalendarDate(2026, 13, 10).isValid).toBe(false);
  });
});

describe("Day + Month Name + Optional Year Formats", () => {
  it("parses '13 Nov 2026'", () => {
    const res = extractDateFromText("Test scheduled for 13 Nov 2026 from 10 AM");
    expect(res?.isValid).toBe(true);
    expect(res?.dateISO).toBe("2026-11-13");
    expect(res?.displayDate).toBe("13 Nov 2026");
    expect(res?.isInherited).toBe(false);
  });

  it("parses '13th November, 2026' with ordinal and comma", () => {
    const res = extractDateFromText("Deadline on 13th November, 2026");
    expect(res?.isValid).toBe(true);
    expect(res?.dateISO).toBe("2026-11-13");
    expect(res?.displayDate).toBe("13 Nov 2026");
  });

  it("parses 'Nov 13, 2026' (month first)", () => {
    const res = extractDateFromText("Guest lecture on Nov 13, 2026 in Seminar Hall");
    expect(res?.isValid).toBe(true);
    expect(res?.dateISO).toBe("2026-11-13");
  });

  it("parses '13 Nov' without year, using default reference year", () => {
    const res = extractDateFromText("Meeting on 13 Nov", { referenceYear: 2026 });
    expect(res?.isValid).toBe(true);
    expect(res?.dateISO).toBe("2026-11-13");
    expect(res?.isInherited).toBe(true);
  });
});

describe("Numeric Slash/Dash/Dot Formats (DD/MM/YYYY & YYYY-MM-DD)", () => {
  it("parses slash date '13/11/2026'", () => {
    const res = extractDateFromText("Test date: 13/11/2026");
    expect(res?.isValid).toBe(true);
    expect(res?.dateISO).toBe("2026-11-13");
  });

  it("parses dash date '13-11-2026'", () => {
    const res = extractDateFromText("Test date: 13-11-2026");
    expect(res?.isValid).toBe(true);
    expect(res?.dateISO).toBe("2026-11-13");
  });

  it("parses two-digit year dot date '13.11.26'", () => {
    const res = extractDateFromText("Test date: 13.11.26");
    expect(res?.isValid).toBe(true);
    expect(res?.dateISO).toBe("2026-11-13");
  });

  it("parses standard ISO date '2026-11-13'", () => {
    const res = extractDateFromText("Release: 2026-11-13");
    expect(res?.isValid).toBe(true);
    expect(res?.dateISO).toBe("2026-11-13");
  });
});

describe("Contextual Year & Date Inheritance", () => {
  it("inherits year from prior sentence when year is omitted", () => {
    const sentence1 = "Internal Test 2 will be held on 13 Nov 2026.";
    const sentence2 = "Lab records must be submitted by 12:00 noon on 13 Nov.";

    const dates = parseNoticeDatesWithContext([sentence1, sentence2], 2026);
    expect(dates[0]?.dateISO).toBe("2026-11-13");
    expect(dates[1]?.dateISO).toBe("2026-11-13");
    expect(dates[1]?.isInherited).toBe(true);
  });

  it("inherits full date when phrase says 'on the same day'", () => {
    const sentence1 = "Internal Test 2 on 13 Nov 2026 from 10:00 AM to 11:30 AM.";
    const sentence2 = "Guest lecture scheduled on the same day from 11:00 AM to 12:30 PM.";

    const dates = parseNoticeDatesWithContext([sentence1, sentence2], 2026);
    expect(dates[0]?.dateISO).toBe("2026-11-13");
    expect(dates[1]?.dateISO).toBe("2026-11-13");
    expect(dates[1]?.isInherited).toBe(true);
    expect(dates[1]?.matchedText).toBe("on the same day");
  });
});

describe("Calendar Correctness Rejections & Warning Flags", () => {
  it("rejects 31/11/2026 and sets needsReview: true with explicit warning", () => {
    const res = extractDateFromText("Deadline on 31/11/2026");
    expect(res?.isValid).toBe(false);
    expect(res?.needsReview).toBe(true);
    expect(res?.dateISO).toBe("");
    expect(res?.warning).toContain("November has only 30 days");
  });

  it("rejects 29/02/2026 and sets needsReview: true with non-leap-year warning", () => {
    const res = extractDateFromText("Special class on 29/02/2026");
    expect(res?.isValid).toBe(false);
    expect(res?.needsReview).toBe(true);
    expect(res?.dateISO).toBe("");
    expect(res?.warning).toContain("not a leap year");
  });

  it("rejects 32/01/2026 with invalid day warning", () => {
    const res = extractDateFromText("Event on 32/01/2026");
    expect(res?.isValid).toBe(false);
    expect(res?.needsReview).toBe(true);
    expect(res?.warning).toContain("Invalid day: 32");
  });
});
