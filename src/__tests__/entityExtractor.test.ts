import { describe, it, expect } from "vitest";
import {
  parseNoticeText,
  classifyEventType,
  extractVenue,
  normalizeVenueCasing,
  extractCleanTitle,
  extractTargetCohort,
} from "../lib/parser/entityExtractor";
import { OFFICIAL_PS02_NOTICE } from "../lib/fixtures/sampleNotices";
import { decodedEventSchema } from "../lib/validation/schemas";

describe("EntityExtractor - 1. Event Type Classification", () => {
  it("classifies Test keywords correctly", () => {
    expect(classifyEventType("Internal Test 2 will be held tomorrow")).toBe("Test");
    expect(classifyEventType("Final practical exam scheduled")).toBe("Test");
    expect(classifyEventType("Semester midterm schedule announced")).toBe("Test");
    expect(classifyEventType("Pop quiz in Room 101")).toBe("Test");
    expect(classifyEventType("Project viva voce in conference hall")).toBe("Test");
    expect(classifyEventType("Annual assessment test")).toBe("Test");
  });

  it("classifies Deadline keywords correctly", () => {
    expect(classifyEventType("Lab records must be submitted by noon")).toBe("Deadline");
    expect(classifyEventType("Assignment 3 submission due on Friday")).toBe("Deadline");
    expect(classifyEventType("Scholarship form fill deadline is 5 PM")).toBe("Deadline");
    expect(classifyEventType("Submit hard copy to department office")).toBe("Deadline");
  });

  it("classifies Lecture keywords correctly", () => {
    expect(classifyEventType('Guest lecture on "AI in Healthcare" scheduled')).toBe("Lecture");
    expect(classifyEventType("Cybersecurity seminar in Auditorium")).toBe("Lecture");
    expect(classifyEventType("Hands-on robotics workshop")).toBe("Lecture");
    expect(classifyEventType("Special orientation session")).toBe("Lecture");
    expect(classifyEventType("Cloud computing webinar at 3 PM")).toBe("Lecture");
  });
});

describe("EntityExtractor - 2. Venue Extraction & Normalization", () => {
  it("extracts locations with spatial prepositions ('in Room 204', 'to the department office', 'at Auditorium', 'in Lab 3')", () => {
    expect(extractVenue("Held in Room 204 starting at 10 AM")).toBe("Room 204");
    expect(extractVenue("Must be submitted to the department office by noon")).toBe("Department office");
    expect(extractVenue("Keynote talk at Auditorium at 2 PM")).toBe("Auditorium");
    expect(extractVenue("Practical session in Lab 3 from 2 PM")).toBe("Lab 3");
  });

  it("extracts trailing comma-separated location phrases (', Seminar Hall')", () => {
    expect(extractVenue("Guest lecture scheduled on 13 Nov, 11:00 AM to 12:30 PM, Seminar Hall.")).toBe("Seminar Hall");
  });

  it("normalizes venue casing ('department office' -> 'Department office')", () => {
    expect(normalizeVenueCasing("department office")).toBe("Department office");
    expect(normalizeVenueCasing("seminar hall")).toBe("Seminar hall");
    expect(normalizeVenueCasing("Room 204")).toBe("Room 204");
  });
});

describe("EntityExtractor - 3. Clean Event Title Extraction & Boilerplate Stripping", () => {
  it("extracts quoted topics: guest lecture on 'AI in Healthcare' -> 'Guest lecture: AI in Healthcare'", () => {
    const raw = 'A guest lecture on "AI in Healthcare" is scheduled on 13 Nov';
    expect(extractCleanTitle(raw, "Lecture")).toBe("Guest lecture: AI in Healthcare");
  });

  it("normalizes submission phrases: 'Lab records must be submitted...' -> 'Lab record submission'", () => {
    const raw = "Lab records must be submitted to the department office by 12:00 noon";
    expect(extractCleanTitle(raw, "Deadline")).toBe("Lab record submission");
  });

  it("strips boilerplate headers like 'All III-year CSE students:' and action predicates", () => {
    const raw = "All III-year CSE students: Internal Test 2 will be held on 13 Nov 2026 from 10:00 AM to 11:30 AM in Room 204.";
    expect(extractCleanTitle(raw, "Test")).toBe("Internal Test 2");
  });
});

describe("EntityExtractor - 4. Target Cohort Extraction", () => {
  it("detects 'All III-year CSE students' and returns 'III-year CSE'", () => {
    expect(extractTargetCohort("All III-year CSE students: Notice regarding exam")).toBe("III-year CSE");
  });

  it("detects other university cohorts and defaults to 'All Students'", () => {
    expect(extractTargetCohort("For II-year ECE students only")).toBe("II-year ECE");
    expect(extractTargetCohort("Circular for all college faculty")).toBe("All Students");
  });
});

describe("EntityExtractor - 5. Official PS-02 Notice 100% Benchmark Verification", () => {
  it("produces the exact 3 events matching the PS-02 problem specification table 100%", () => {
    const events = parseNoticeText(OFFICIAL_PS02_NOTICE);

    expect(events.length).toBe(3);

    // Event 1: Internal Test 2
    const testEvent = events.find((e) => e.type === "Test");
    expect(testEvent).toBeDefined();
    expect(testEvent?.title).toBe("Internal Test 2");
    expect(testEvent?.type).toBe("Test");
    expect(testEvent?.dateISO).toBe("2026-11-13");
    expect(testEvent?.displayDate).toBe("13 Nov 2026");
    expect(testEvent?.startTime).toBe("10:00");
    expect(testEvent?.endTime).toBe("11:30");
    expect(testEvent?.venue).toBe("Room 204");
    expect(testEvent?.cohort).toBe("III-year CSE");
    expect(testEvent?.needsReview).toBe(false);

    // Event 2: Lab record submission deadline
    const deadlineEvent = events.find((e) => e.type === "Deadline");
    expect(deadlineEvent).toBeDefined();
    expect(deadlineEvent?.title).toBe("Lab record submission");
    expect(deadlineEvent?.type).toBe("Deadline");
    expect(deadlineEvent?.dateISO).toBe("2026-11-13");
    expect(deadlineEvent?.displayDate).toBe("13 Nov 2026");
    expect(deadlineEvent?.startTime).toBe("12:00");
    expect(deadlineEvent?.endTime).toBe("12:00");
    expect(deadlineEvent?.venue).toBe("Department office");
    expect(deadlineEvent?.cohort).toBe("III-year CSE");
    expect(deadlineEvent?.needsReview).toBe(false);

    // Event 3: Guest lecture
    const lectureEvent = events.find((e) => e.type === "Lecture");
    expect(lectureEvent).toBeDefined();
    expect(lectureEvent?.title).toBe("Guest lecture: AI in Healthcare");
    expect(lectureEvent?.type).toBe("Lecture");
    expect(lectureEvent?.dateISO).toBe("2026-11-13");
    expect(lectureEvent?.displayDate).toBe("13 Nov 2026");
    expect(lectureEvent?.startTime).toBe("11:00");
    expect(lectureEvent?.endTime).toBe("12:30");
    expect(lectureEvent?.venue).toBe("Seminar Hall");
    expect(lectureEvent?.cohort).toBe("III-year CSE");
    expect(lectureEvent?.needsReview).toBe(false);

    // Schema conformance for all 3 events
    for (const ev of events) {
      const parsed = decodedEventSchema.safeParse(ev);
      expect(parsed.success).toBe(true);
    }
  });
});