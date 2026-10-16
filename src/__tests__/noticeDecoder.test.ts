import { describe, it, expect } from "vitest";
import {
  decodeNotice,
  extractGlobalCohort,
  extractVenue,
  extractTitleAndCategory,
} from "../lib/parser/noticeDecoder";
import {
  OFFICIAL_PS02_NOTICE,
  MULTI_FORMAT_NOTICE,
  HINGLISH_WHATSAPP_NOTICE,
} from "../lib/fixtures/sampleNotices";
import { decodedEventSchema } from "../lib/validation/schemas";

describe("NoticeDecoder - Official PS-02 Notice Benchmark", () => {
  it("decodes exactly 3 events from OFFICIAL_PS02_NOTICE", () => {
    const events = decodeNotice(OFFICIAL_PS02_NOTICE);
    expect(events.length).toBe(3);
  });

  it("extracts global cohort as 'III-year CSE'", () => {
    const cohort = extractGlobalCohort(OFFICIAL_PS02_NOTICE);
    expect(cohort).toBe("III-year CSE");
  });

  it("decodes Event 1: Internal Test 2 with correct times, venue and cohort", () => {
    const events = decodeNotice(OFFICIAL_PS02_NOTICE);
    const testEvent = events.find((e) => e.type === "Test");
    expect(testEvent).toBeDefined();
    expect(testEvent?.title).toBe("Internal Test 2");
    expect(testEvent?.dateISO).toBe("2026-11-13");
    expect(testEvent?.startTime).toBe("10:00");
    expect(testEvent?.endTime).toBe("11:30");
    expect(testEvent?.venue).toBe("Room 204");
    expect(testEvent?.cohort).toBe("III-year CSE");
    expect(testEvent?.confidence).toBeGreaterThanOrEqual(90);
    expect(testEvent?.needsReview).toBe(false);
  });

  it("decodes Event 2: Lab record submission deadline (startTime === endTime = 12:00)", () => {
    const events = decodeNotice(OFFICIAL_PS02_NOTICE);
    const deadlineEvent = events.find((e) => e.type === "Deadline");
    expect(deadlineEvent).toBeDefined();
    expect(deadlineEvent?.title).toContain("Lab record");
    expect(deadlineEvent?.dateISO).toBe("2026-11-13");
    expect(deadlineEvent?.startTime).toBe("12:00");
    expect(deadlineEvent?.endTime).toBe("12:00");
    expect(deadlineEvent?.venue).toBe("department office");
    expect(deadlineEvent?.cohort).toBe("III-year CSE");
    expect(deadlineEvent?.needsReview).toBe(false);
  });

  it("decodes Event 3: Guest lecture on AI in Healthcare (11:00 to 12:30 in Seminar Hall)", () => {
    const events = decodeNotice(OFFICIAL_PS02_NOTICE);
    const lectureEvent = events.find((e) => e.type === "Lecture");
    expect(lectureEvent).toBeDefined();
    expect(lectureEvent?.title).toBe("Guest lecture: AI in Healthcare");
    expect(lectureEvent?.dateISO).toBe("2026-11-13");
    expect(lectureEvent?.startTime).toBe("11:00");
    expect(lectureEvent?.endTime).toBe("12:30");
    expect(lectureEvent?.venue).toBe("Seminar Hall");
    expect(lectureEvent?.cohort).toBe("III-year CSE");
    expect(lectureEvent?.needsReview).toBe(false);
  });

  it("ensures all decoded events satisfy strict Zod schema validation", () => {
    const events = decodeNotice(OFFICIAL_PS02_NOTICE);
    for (const e of events) {
      const parsed = decodedEventSchema.safeParse(e);
      expect(parsed.success).toBe(true);
    }
  });
});

describe("NoticeDecoder - Multi-Format & Indian Campus Presets", () => {
  it("decodes MULTI_FORMAT_NOTICE successfully", () => {
    const events = decodeNotice(MULTI_FORMAT_NOTICE);
    expect(events.length).toBeGreaterThanOrEqual(2);
    for (const e of events) {
      expect(decodedEventSchema.safeParse(e).success).toBe(true);
    }
  });

  it("decodes HINGLISH_WHATSAPP_NOTICE with normalized times and dates", () => {
    const events = decodeNotice(HINGLISH_WHATSAPP_NOTICE);
    expect(events.length).toBeGreaterThanOrEqual(2);
    // subah 10 baje should parse to 10:00
    const test = events.find((e) => e.type === "Test");
    expect(test?.startTime).toBe("10:00");
  });

  it("infers end-time (+60m) when only start time is provided and flags needsReview", () => {
    const raw = "Special coding lecture will be held on 15 Nov 2026 at 2 PM in Room 101.";
    const events = decodeNotice(raw);
    expect(events.length).toBe(1);
    const ev = events[0]!;
    expect(ev.startTime).toBe("14:00");
    expect(ev.endTime).toBe("15:00");
    expect(ev.needsReview).toBe(true);
    expect(ev.confidence).toBeLessThan(90);
  });
});