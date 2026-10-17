import { describe, it, expect } from "vitest";
import {
  generateEscalationDraft,
  formatEventCitation,
  resolveCohort,
  formatOverlapDuration,
} from "../lib/clash/escalationDrafter";
import type { DecodedEvent, PairwiseClashResult } from "../types/notice";
import type { RescheduleSuggestion } from "../lib/clash/actionRecommender";

describe("escalationDrafter — PS-02 Coordinator Escalation Engine", () => {
  const sampleTest: DecodedEvent = {
    id: "event-test-2",
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
    sourceSpan: { start: 0, end: 50, rawSentence: "Internal Test 2 in Room 204" },
  };

  const sampleLecture: DecodedEvent = {
    id: "event-lecture-1",
    title: "Guest lecture: AI in Healthcare",
    type: "Lecture",
    dateISO: "2026-11-13",
    displayDate: "13 Nov 2026",
    startTime: "11:00",
    endTime: "12:30",
    venue: "Seminar Hall",
    cohort: "III-year CSE",
    confidence: 92,
    needsReview: false,
    sourceSpan: { start: 51, end: 120, rawSentence: "Guest lecture in Seminar Hall" },
  };

  const sampleClash: PairwiseClashResult = {
    id: "clash-1-2",
    eventA: "event-test-2",
    eventB: "event-lecture-1",
    hasClash: true,
    clashType: "HARD_OVERLAP",
    overlapMinutes: 30,
    overlapWindow: { start: "11:00", end: "11:30" },
    explanation: "Clash. They overlap from 11:00 AM to 11:30 AM (30 minutes).",
    severity: "CRITICAL",
  };

  const sampleReschedule: RescheduleSuggestion = {
    eventId: "event-lecture-1",
    eventTitle: "Guest lecture: AI in Healthcare",
    originalStart: "11:00",
    originalEnd: "12:30",
    proposedStart: "12:15",
    proposedEnd: "13:45",
    freedWindowStart: "11:30",
    freedWindowEnd: "12:15",
    freedWindowMinutes: 45,
    transitMinutesToDeadlineVenue: 15,
    narrative: "Shift lecture to 12:15 PM – 1:45 PM",
    isDeadlineFeasible: true,
  };

  it("formats academic event citations accurately with title, 12h times, and venue", () => {
    const citationA = formatEventCitation(sampleTest);
    expect(citationA).toBe('"Internal Test 2" [10:00 AM – 11:30 AM, Room 204]');

    const citationB = formatEventCitation(sampleLecture);
    expect(citationB).toBe('"Guest lecture: AI in Healthcare" [11:00 AM – 12:30 PM, Seminar Hall]');
  });

  it("formats overlap duration properly", () => {
    const overlapStr = formatOverlapDuration(sampleClash);
    expect(overlapStr).toBe("30 minutes (from 11:00 AM to 11:30 AM)");
  });

  it("resolves student cohort with fallback support", () => {
    expect(resolveCohort(sampleTest, sampleLecture)).toBe("III-year CSE");
    expect(resolveCohort(undefined, undefined)).toBe("III-year CSE");
    expect(resolveCohort(undefined, undefined, "IV-year ECE")).toBe("IV-year ECE");
  });

  it("generates a complete Class Representative escalation draft citing all PS-02 requirements", () => {
    const draft = generateEscalationDraft({
      clash: sampleClash,
      eventA: sampleTest,
      eventB: sampleLecture,
      rescheduleSuggestion: sampleReschedule,
      role: "CLASS_REPRESENTATIVE",
      senderName: "Ashwith",
      cohort: "III-year CSE",
    });

    expect(draft.role).toBe("CLASS_REPRESENTATIVE");
    expect(draft.cohort).toBe("III-year CSE");
    expect(draft.subject).toContain("[CR Urgent] [III-year CSE]");
    expect(draft.subject).toContain("Internal Test 2");
    expect(draft.subject).toContain("Guest lecture: AI in Healthcare");

    // Email Body checks
    const body = draft.emailBody;
    expect(body).toContain("on behalf of the students of III-year CSE");
    expect(body).toContain('"Internal Test 2" [10:00 AM – 11:30 AM, Room 204]');
    expect(body).toContain('"Guest lecture: AI in Healthcare" [11:00 AM – 12:30 PM, Seminar Hall]');
    expect(body).toContain("30 minutes (from 11:00 AM to 11:30 AM)");
    expect(body).toContain("12:15 PM – 1:45 PM"); // Proposed conflict-free alternative slot
    expect(body).toContain("Ashwith");
    expect(body).toContain("Class Representative, III-year CSE");

    // WhatsApp Text checks
    expect(draft.whatsAppText).toContain("*⚠️ ACADEMIC TIMETABLE CLASH NOTICE — III-year CSE*");
    expect(draft.whatsAppText).toContain("10:00 AM – 11:30 AM (Room 204)");
    expect(draft.whatsAppText).toContain("11:00 AM – 12:30 PM (Seminar Hall)");
    expect(draft.whatsAppText).toContain("12:15 PM – 1:45 PM");

    // URLs
    expect(draft.mailtoUrl).toContain("mailto:coordinator%40university.edu");
    expect(draft.mailtoUrl).toContain("subject=");
    expect(draft.mailtoUrl).toContain("body=");
    expect(draft.whatsAppUrl).toContain("https://api.whatsapp.com/send?text=");
  });

  it("generates student individual draft properly", () => {
    const draft = generateEscalationDraft({
      clash: sampleClash,
      eventA: sampleTest,
      eventB: sampleLecture,
      role: "STUDENT",
      senderName: "Priya",
    });

    expect(draft.role).toBe("STUDENT");
    expect(draft.subject).toContain("[Student Query]");
    expect(draft.emailBody).toContain("I am a student of III-year CSE");
    expect(draft.emailBody).toContain("Priya");
    expect(draft.emailBody).toContain("Student, III-year CSE");
  });

  it("handles deadline containment clash escalation cleanly", () => {
    const sampleDeadline: DecodedEvent = {
      id: "deadline-1",
      title: "Lab record submission",
      type: "Deadline",
      dateISO: "2026-11-13",
      displayDate: "13 Nov 2026",
      startTime: "12:00",
      endTime: "12:00",
      venue: "Department office",
      cohort: "III-year CSE",
      confidence: 90,
      needsReview: false,
      sourceSpan: { start: 121, end: 180, rawSentence: "Lab record due at 12:00 PM" },
    };

    const containmentClash: PairwiseClashResult = {
      id: "clash-containment",
      eventA: "event-lecture-1",
      eventB: "deadline-1",
      hasClash: true,
      clashType: "DEADLINE_CONTAINMENT",
      overlapMinutes: 0,
      overlapWindow: null,
      explanation: "Clash. The 12:00 PM deadline falls during Guest lecture (11:00 AM - 12:30 PM).",
      severity: "CRITICAL",
    };

    const draft = generateEscalationDraft({
      clash: containmentClash,
      eventA: sampleLecture,
      eventB: sampleDeadline,
      role: "CLASS_REPRESENTATIVE",
    });

    expect(draft.emailBody).toContain("Lab record submission");
    expect(draft.emailBody).toContain("due at 12:00 PM");
    expect(draft.emailBody).toContain("Department office");
    expect(draft.emailBody).toContain("Deadline falls directly during scheduled session");
  });
});