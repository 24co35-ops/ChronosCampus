import { describe, it, expect } from "vitest";
import {
  generateIcs,
  foldIcsLine,
  formatIcsDateTime,
  generateDeterministicHash,
  validateIcsSyntax,
} from "../lib/ics/icsGenerator";
import type { DecodedEvent, PairwiseClashResult, ActionRecommendation } from "../types/notice";

describe("RFC-5545 icsGenerator", () => {
  const sampleEvents: DecodedEvent[] = [
    {
      id: "test-01",
      title: "Internal Test 2",
      type: "Test",
      dateISO: "2026-11-13",
      displayDate: "13 Nov 2026",
      startTime: "10:00",
      endTime: "11:30",
      venue: "Room 204",
      cohort: "III-year CSE",
      confidence: 98,
      needsReview: false,
      sourceSpan: {
        start: 0,
        end: 65,
        rawSentence: "The III-year CSE Internal Test 2 will be held on 13/11/2026 from 10:00 AM to 11:30 AM in Room 204.",
      },
    },
    {
      id: "lecture-01",
      title: "Guest lecture: AI in Healthcare",
      type: "Lecture",
      dateISO: "2026-11-13",
      displayDate: "13 Nov 2026",
      startTime: "11:00",
      endTime: "12:30",
      venue: "Seminar Hall",
      cohort: "III-year CSE",
      confidence: 95,
      needsReview: false,
      sourceSpan: {
        start: 66,
        end: 140,
        rawSentence: "Guest lecture on AI in Healthcare scheduled from 11:00 AM to 12:30 PM in Seminar Hall.",
      },
    },
    {
      id: "deadline-01",
      title: "Record submission deadline",
      type: "Deadline",
      dateISO: "2026-11-13",
      displayDate: "13 Nov 2026",
      startTime: "12:00",
      endTime: "12:00",
      venue: "Faculty Cabin",
      cohort: "III-year CSE",
      confidence: 90,
      needsReview: false,
      sourceSpan: {
        start: 141,
        end: 200,
        rawSentence: "All students must submit their lab records by 12:00 PM.",
      },
    },
  ];

  const sampleClashes: PairwiseClashResult[] = [
    {
      id: "clash-1",
      eventA: "test-01",
      eventB: "lecture-01",
      hasClash: true,
      clashType: "HARD_OVERLAP",
      overlapMinutes: 30,
      overlapWindow: { start: "11:00", end: "11:30" },
      explanation: "30-minute interval overlap from 11:00 to 11:30 AM between Internal Test 2 and Guest lecture.",
      severity: "CRITICAL",
    },
    {
      id: "clash-2",
      eventA: "deadline-01",
      eventB: "lecture-01",
      hasClash: true,
      clashType: "DEADLINE_CONTAINMENT",
      overlapMinutes: 1,
      overlapWindow: "12:00",
      explanation: "The 12:00 PM record deadline falls squarely inside the Guest Lecture block.",
      severity: "CRITICAL",
    },
  ];

  const sampleRecommendations: ActionRecommendation[] = [
    {
      id: "rec-1",
      priority: "CRITICAL",
      title: "Auto-Reschedule Guest Lecture",
      description: "Shift Guest Lecture to free slot 12:15 PM – 1:45 PM to eliminate all overlaps.",
      actionType: "RESCHEDULE_EVENT",
      relatedEventIds: ["lecture-01", "test-01"],
    },
  ];

  it("enforces strict CRLF (\\r\\n) line endings across the entire output", () => {
    const ics = generateIcs(sampleEvents, { dtstamp: "20261017T050000Z" });
    expect(ics).toContain("\r\n");

    // Must not have single \n that is not preceded by \r
    const linesWithoutCr = ics.split("\r\n").join("").indexOf("\n");
    expect(linesWithoutCr).toBe(-1);
  });

  it("includes all RFC-5545 required calendar headers", () => {
    const ics = generateIcs(sampleEvents, { dtstamp: "20261017T050000Z" });
    expect(ics).toContain("BEGIN:VCALENDAR\r\n");
    expect(ics).toContain("VERSION:2.0\r\n");
    expect(ics).toContain("PRODID:-//ChronosCampus//Notice Decoder PS-02//EN\r\n");
    expect(ics).toContain("CALSCALE:GREGORIAN\r\n");
    expect(ics).toContain("METHOD:PUBLISH\r\n");
    expect(ics).toContain("END:VCALENDAR\r\n");
  });

  it("folds lines at or below 75 octets with space continuation", () => {
    const longSummary = "A".repeat(100);
    const folded = foldIcsLine(`SUMMARY:${longSummary}`);
    const foldedLines = folded.split("\r\n");

    expect(foldedLines.length).toBeGreaterThan(1);
    for (let i = 0; i < foldedLines.length; i++) {
      const line = foldedLines[i]!;
      expect(Buffer.byteLength(line, "utf8")).toBeLessThanOrEqual(75);
      if (i > 0) {
        expect(line.startsWith(" ")).toBe(true);
      }
    }
  });

  it("generates deterministic UID with @chronoscampus.edu domain", () => {
    const ics1 = generateIcs([sampleEvents[0]!], { dtstamp: "20261017T050000Z" });
    const ics2 = generateIcs([sampleEvents[0]!], { dtstamp: "20261017T050000Z" });

    const uidMatch1 = ics1.match(/UID:([^\r\n]+)/);
    const uidMatch2 = ics2.match(/UID:([^\r\n]+)/);

    expect(uidMatch1).toBeTruthy();
    expect(uidMatch1![1]).toContain("@chronoscampus.edu");
    // Deterministic hash matches for same input
    expect(uidMatch1![1]).toBe(uidMatch2![1]);
  });

  it("sets Deadline DTSTART to 12:00 PM and DTEND to 12:15 PM with [DEADLINE] summary prefix", () => {
    const deadlineEvent = sampleEvents.find((e) => e.type === "Deadline")!;
    const ics = generateIcs([deadlineEvent], { dtstamp: "20261017T050000Z" });

    expect(ics).toContain("DTSTART;TZID=Asia/Kolkata:20261113T120000");
    expect(ics).toContain("DTEND;TZID=Asia/Kolkata:20261113T121500");
    expect(ics).toContain("SUMMARY:[DEADLINE] Record submission deadline");
  });

  it("sets Test DTSTART to 10:00 and DTEND to 11:30 without modification", () => {
    const testEvent = sampleEvents.find((e) => e.type === "Test")!;
    const ics = generateIcs([testEvent], { dtstamp: "20261017T050000Z" });

    expect(ics).toContain("DTSTART;TZID=Asia/Kolkata:20261113T100000");
    expect(ics).toContain("DTEND;TZID=Asia/Kolkata:20261113T113000");
    expect(ics).toContain("SUMMARY:Internal Test 2");
  });

  it("includes CATEGORIES and STATUS:CONFIRMED for all events", () => {
    const ics = generateIcs(sampleEvents, { dtstamp: "20261017T050000Z" });
    expect(ics).toContain("CATEGORIES:ACADEMIC,TEST");
    expect(ics).toContain("CATEGORIES:ACADEMIC,LECTURE");
    expect(ics).toContain("CATEGORIES:ACADEMIC,DEADLINE");
    expect(ics.match(/STATUS:CONFIRMED/g)?.length).toBe(3);
  });

  it("embeds original notice sentence, active clash warnings, and recommendations in DESCRIPTION", () => {
    const ics = generateIcs(sampleEvents, {
      dtstamp: "20261017T050000Z",
      clashes: sampleClashes,
      recommendations: sampleRecommendations,
    });

    // Check notice source sentence is embedded
    expect(ics).toContain("The III-year CSE Internal Test 2");

    // Check active conflict warning is embedded for lecture and test
    expect(ics).toContain("ACTIVE CONFLICT DETECTED");

    // Check recommended action is embedded
    expect(ics).toContain("Auto-Reschedule Guest Lecture");
  });

  it("configures VALARM: -PT30M for Test/Lecture and -PT2H for Deadline", () => {
    const testEvent = sampleEvents.find((e) => e.type === "Test")!;
    const testIcs = generateIcs([testEvent], { dtstamp: "20261017T050000Z" });
    expect(testIcs).toContain("BEGIN:VALARM");
    expect(testIcs).toContain("TRIGGER:-PT30M");
    expect(testIcs).toContain("ACTION:DISPLAY");

    const dlEvent = sampleEvents.find((e) => e.type === "Deadline")!;
    const dlIcs = generateIcs([dlEvent], { dtstamp: "20261017T050000Z" });
    expect(dlIcs).toContain("BEGIN:VALARM");
    expect(dlIcs).toContain("TRIGGER:-PT2H");
    expect(dlIcs).toContain("ACTION:DISPLAY");
  });

  it("passes syntax validation with 100% compliance", () => {
    const ics = generateIcs(sampleEvents, {
      dtstamp: "20261017T050000Z",
      clashes: sampleClashes,
      recommendations: sampleRecommendations,
    });

    const validation = validateIcsSyntax(ics);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
    expect(validation.stats.eventCount).toBe(3);
    expect(validation.stats.hasCrlf).toBe(true);
    expect(validation.stats.maxOctets).toBeLessThanOrEqual(75);
  });
});
