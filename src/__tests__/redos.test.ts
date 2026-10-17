import { describe, it, expect, beforeEach } from "vitest";
import { parseNoticeText } from "../lib/parser/entityExtractor";
import { extractDateFromText } from "../lib/parser/dateParser";
import { extractTimeRange } from "../lib/parser/timeParser";
import {
  enforcePayloadLimit,
  enforceEventLimit,
  MAX_PAYLOAD_CHARS,
  MAX_EVENTS_PER_NOTICE,
  clearResourceWarnings,
  getResourceWarnings,
  measureParsingDuration,
} from "../lib/security/resourceGuard";

describe("Resource Guard & ReDoS Prevention Layer", () => {
  beforeEach(() => {
    clearResourceWarnings();
  });

  describe("1. ReDoS Defense & Sub-50ms Pathological Benchmarks", () => {
    it("parses 10,000-character pathological date string ('13 Nov ' x 1,500) in under 50 milliseconds", () => {
      // 10,500 characters of repetitive date tokens
      const pathologicalDate = "13 Nov ".repeat(1500);
      expect(pathologicalDate.length).toBeGreaterThanOrEqual(10000);

      const { result: events, durationMs } = measureParsingDuration(() => {
        return parseNoticeText(pathologicalDate);
      });

      // Assert parsing completes in under 50ms
      expect(durationMs).toBeLessThan(50);
      expect(Array.isArray(events)).toBe(true);
    });

    it("parses 10,000-character pathological time string ('10:00 AM ' x 1,500) in under 50 milliseconds", () => {
      // 13,500 characters of repetitive time tokens
      const pathologicalTime = "10:00 AM ".repeat(1500);
      expect(pathologicalTime.length).toBeGreaterThanOrEqual(10000);

      const { result: events, durationMs } = measureParsingDuration(() => {
        return parseNoticeText(pathologicalTime);
      });

      // Assert parsing completes in under 50ms
      expect(durationMs).toBeLessThan(50);
      expect(Array.isArray(events)).toBe(true);
    });

    it("parses 10,000-character combined pathological string in under 50 milliseconds", () => {
      // Alternating date and time tokens without punctuation
      const combined = "13 Nov 10:00 AM ".repeat(800); // ~12,800 chars
      expect(combined.length).toBeGreaterThan(10000);

      const { result: events, durationMs } = measureParsingDuration(() => {
        return parseNoticeText(combined);
      });

      expect(durationMs).toBeLessThan(50);
      expect(events.length).toBeGreaterThan(0);
      expect(events.length).toBeLessThanOrEqual(MAX_EVENTS_PER_NOTICE);
    });

    it("resists backtracking on malformed deadline and preposition chains", () => {
      // Pathological string with nested keywords designed to trick unanchored regexes
      const maliciousPrepositions = "must be submitted to ".repeat(500) + "by 12:00 PM";
      const { durationMs } = measureParsingDuration(() => {
        return extractTimeRange(maliciousPrepositions);
      });

      // Must fail or match almost instantaneously
      expect(durationMs).toBeLessThan(25);
    });

    it("resists catastrophic backtracking on date parser regexes", () => {
      const pathological = "13 ".repeat(1000) + "November 2026";
      const { durationMs } = measureParsingDuration(() => {
        return extractDateFromText(pathological);
      });

      expect(durationMs).toBeLessThan(25);
    });
  });

  describe("2. Hard Input Payload Cap (25,000 characters)", () => {
    it("permits payloads under 25,000 characters without truncation", () => {
      const normalPayload = "Internal Test 2 on 13 Nov from 10:00 AM to 11:30 AM in Room 204.";
      const result = enforcePayloadLimit(normalPayload);

      expect(result.isTruncated).toBe(false);
      expect(result.text).toBe(normalPayload);
      expect(result.warning).toBeNull();
      expect(result.originalLength).toBe(normalPayload.length);
    });

    it("truncates payloads exceeding 25,000 characters and generates a user warning", () => {
      const oversizedPayload = "A".repeat(30000);
      const result = enforcePayloadLimit(oversizedPayload);

      expect(result.isTruncated).toBe(true);
      expect(result.text.length).toBe(MAX_PAYLOAD_CHARS);
      expect(result.originalLength).toBe(30000);
      expect(result.warning).toContain("Input truncated");
      expect(result.warning).toContain("25,000");

      // Verify warning was logged to buffer
      const warnings = getResourceWarnings();
      expect(warnings.length).toBeGreaterThanOrEqual(1);
      expect(warnings[0]).toContain("Input truncated");
    });

    it("emits payload truncation warning via parseNoticeText options", () => {
      const oversizedNotice = "Internal Test on 13 Nov at 10 AM. ".repeat(1000); // ~35,000 chars
      expect(oversizedNotice.length).toBeGreaterThan(MAX_PAYLOAD_CHARS);

      const capturedWarnings: string[] = [];
      const events = parseNoticeText(oversizedNotice, {
        onWarning: (w) => capturedWarnings.push(w),
      });

      expect(capturedWarnings.length).toBeGreaterThan(0);
      expect(capturedWarnings[0]).toContain("Input truncated");
      expect(Array.isArray(events)).toBe(true);
    });
  });

  describe("3. Hard Event Limit Cap (50 maximum events per notice)", () => {
    it("caps extracted events to 50 when notice contains 80 clauses", () => {
      // 80 distinct notice sentences
      const massiveNotice = Array.from(
        { length: 80 },
        (_, i) => `Assessment ${i + 1} on 13 Nov 2026 from 10:00 to 11:00 AM in Room ${100 + i}.`
      ).join("\n");

      const capturedWarnings: string[] = [];
      const events = parseNoticeText(massiveNotice, {
        onWarning: (w) => capturedWarnings.push(w),
      });

      // Must be capped strictly at 50 events
      expect(events.length).toBe(MAX_EVENTS_PER_NOTICE);
      expect(capturedWarnings.some((w) => w.includes("Event limit enforced"))).toBe(true);
    });

    it("enforceEventLimit directly caps arbitrary event arrays and warns", () => {
      const mockEvents = Array.from({ length: 75 }, (_, i) => ({ id: `event-${i}` }));
      const result = enforceEventLimit(mockEvents, 50);

      expect(result.isTruncated).toBe(true);
      expect(result.events.length).toBe(50);
      expect(result.totalParsed).toBe(75);
      expect(result.warning).toContain("Event limit enforced");
      expect(result.warning).toContain("50");
    });
  });
});
