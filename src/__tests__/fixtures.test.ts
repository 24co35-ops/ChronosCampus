import { describe, it, expect } from "vitest";
import {
  OFFICIAL_PS02_NOTICE,
  EXPECTED_PS02_OUTPUT,
  MULTI_FORMAT_NOTICE,
  HINGLISH_WHATSAPP_NOTICE,
  MULTI_COHORT_NOTICE,
  BACK_TO_BACK_TRANSIT_NOTICE,
  ADVERSARIAL_SECURITY_NOTICE,
  SAMPLE_NOTICE_PRESETS,
} from "../lib/fixtures/sampleNotices";
import { decodedEventSchema, pairwiseClashResultSchema } from "../lib/validation/schemas";
import { sanitizeNoticeInput, escapeIcsText } from "../lib/security";

describe("PS-02 Fixture Benchmark Standards", () => {
  it("OFFICIAL_PS02_NOTICE contains the exact verbatim problem statement text", () => {
    expect(OFFICIAL_PS02_NOTICE).toContain("All III-year CSE students:");
    expect(OFFICIAL_PS02_NOTICE).toContain("Internal Test 2 will be held on 13 Nov 2026 from 10:00 AM to 11:30 AM in Room 204.");
    expect(OFFICIAL_PS02_NOTICE).toContain("Lab records must be submitted to the department office by 12:00 noon on 13 Nov.");
    expect(OFFICIAL_PS02_NOTICE).toContain('A guest lecture on "AI in Healthcare" is scheduled on 13 Nov, 11:00 AM to 12:30 PM, Seminar Hall.');
  });

  it("EXPECTED_PS02_OUTPUT contains exactly 3 valid DecodedEvents conforming to Zod schema", () => {
    expect(EXPECTED_PS02_OUTPUT.events.length).toBe(3);

    const [testEvent, deadlineEvent, lectureEvent] = EXPECTED_PS02_OUTPUT.events;

    // 1. Internal Test 2
    expect(testEvent!.title).toBe("Internal Test 2");
    expect(testEvent!.type).toBe("Test");
    expect(testEvent!.startTime).toBe("10:00");
    expect(testEvent!.endTime).toBe("11:30");
    expect(testEvent!.venue).toBe("Room 204");
    expect(testEvent!.cohort).toBe("III-year CSE");
    expect(decodedEventSchema.safeParse(testEvent).success).toBe(true);

    // 2. Lab record submission
    expect(deadlineEvent!.title).toBe("Lab record submission");
    expect(deadlineEvent!.type).toBe("Deadline");
    expect(deadlineEvent!.startTime).toBe("12:00");
    expect(deadlineEvent!.endTime).toBe("12:00");
    expect(decodedEventSchema.safeParse(deadlineEvent).success).toBe(true);

    // 3. Guest lecture
    expect(lectureEvent!.title).toBe("Guest lecture: AI in Healthcare");
    expect(lectureEvent!.type).toBe("Lecture");
    expect(lectureEvent!.startTime).toBe("11:00");
    expect(lectureEvent!.endTime).toBe("12:30");
    expect(lectureEvent!.venue).toBe("Seminar Hall");
    expect(decodedEventSchema.safeParse(lectureEvent).success).toBe(true);
  });

  it("EXPECTED_PS02_OUTPUT contains the exact 3 pairwise clash outcomes conforming to Zod schema", () => {
    expect(EXPECTED_PS02_OUTPUT.pairwiseClashes.length).toBe(3);

    const [overlapClash, containmentClash, noClash] = EXPECTED_PS02_OUTPUT.pairwiseClashes;

    // Test vs Lecture: 30-min overlap
    expect(overlapClash!.hasClash).toBe(true);
    expect(overlapClash!.clashType).toBe("HARD_OVERLAP");
    expect(overlapClash!.overlapMinutes).toBe(30);
    expect(overlapClash!.overlapWindow).toEqual({ start: "11:00", end: "11:30" });
    expect(pairwiseClashResultSchema.safeParse(overlapClash).success).toBe(true);

    // Deadline vs Lecture: Deadline containment
    expect(containmentClash!.hasClash).toBe(true);
    expect(containmentClash!.clashType).toBe("DEADLINE_CONTAINMENT");
    expect(containmentClash!.overlapMinutes).toBe(0);
    expect(containmentClash!.overlapWindow).toEqual({ start: "12:00", end: "12:00" });
    expect(pairwiseClashResultSchema.safeParse(containmentClash).success).toBe(true);

    // Test vs Deadline: No clash
    expect(noClash!.hasClash).toBe(false);
    expect(noClash!.clashType).toBe("NO_CLASH");
    expect(noClash!.overlapMinutes).toBe(0);
    expect(noClash!.overlapWindow).toBeNull();
    expect(pairwiseClashResultSchema.safeParse(noClash).success).toBe(true);
  });
});

describe("Stress-Test Presets Verification", () => {
  it("MULTI_FORMAT_NOTICE contains 13/11/2026, 14:00, 2 PM, and 13 Nov", () => {
    expect(MULTI_FORMAT_NOTICE).toContain("13/11/2026");
    expect(MULTI_FORMAT_NOTICE).toContain("14:00");
    expect(MULTI_FORMAT_NOTICE).toContain("2 PM");
    expect(MULTI_FORMAT_NOTICE).toContain("13 Nov");
  });

  it("HINGLISH_WHATSAPP_NOTICE contains campus vernacular keywords", () => {
    expect(HINGLISH_WHATSAPP_NOTICE).toContain("subah 10 baje");
    expect(HINGLISH_WHATSAPP_NOTICE).toContain("sharp by 12 noon");
    expect(HINGLISH_WHATSAPP_NOTICE).toContain("mandatory hai");
  });

  it("MULTI_COHORT_NOTICE contains both III-year CSE and II-year ECE", () => {
    expect(MULTI_COHORT_NOTICE).toContain("III-year CSE");
    expect(MULTI_COHORT_NOTICE).toContain("II-year ECE");
  });

  it("BACK_TO_BACK_TRANSIT_NOTICE specifies location transition and zero-gap", () => {
    expect(BACK_TO_BACK_TRANSIT_NOTICE).toContain("Main Building");
    expect(BACK_TO_BACK_TRANSIT_NOTICE).toContain("Hostel Workshop");
    expect(BACK_TO_BACK_TRANSIT_NOTICE).toContain("0-minute transition gap");
  });

  it("ADVERSARIAL_SECURITY_NOTICE contains security injection vectors neutralized by firewall", () => {
    expect(ADVERSARIAL_SECURITY_NOTICE).toContain("<script>alert('xss')</script>");
    expect(ADVERSARIAL_SECURITY_NOTICE).toContain("SYSTEM OVERRIDE");
    expect(ADVERSARIAL_SECURITY_NOTICE).toContain("\r\nATTENDEE;ROLE=REQ-PARTICIPANT");

    // Verify sanitizer intercepts or strips dangerous injection
    const sanitized = sanitizeNoticeInput(ADVERSARIAL_SECURITY_NOTICE);
    expect(sanitized.text).not.toContain("<script>");
    expect(sanitized.warning).toBeTruthy();

    const icsSafe = escapeIcsText(ADVERSARIAL_SECURITY_NOTICE);
    expect(icsSafe).not.toContain("\r\n");
  });

  it("SAMPLE_NOTICE_PRESETS exports all 6 presets with metadata", () => {
    expect(SAMPLE_NOTICE_PRESETS.length).toBe(6);
    const ids = SAMPLE_NOTICE_PRESETS.map((p) => p.id);
    expect(ids).toContain("ps02-official");
    expect(ids).toContain("multi-format");
    expect(ids).toContain("hinglish-whatsapp");
    expect(ids).toContain("multi-cohort");
    expect(ids).toContain("back-to-back-transit");
    expect(ids).toContain("adversarial-security");
  });
});
