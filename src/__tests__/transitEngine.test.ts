import { describe, it, expect } from "vitest";
import {
  getCampusZone,
  isPhysicalVenue,
  normalizeVenueName,
  estimateTransitMinutes,
  evaluateTransitRisk,
  analyzeScheduleTransit,
  formatTransitRiskAsPairwiseClash,
  getClashBadgeConfig,
  CLASH_BADGE_CONFIG,
} from "../lib/clash/transitEngine";
import { parseNoticeText } from "../lib/parser/entityExtractor";
import { OFFICIAL_PS02_NOTICE, BACK_TO_BACK_TRANSIT_NOTICE } from "../lib/fixtures/sampleNotices";
import type { DecodedEvent } from "../types/notice";

// ── Helper ────────────────────────────────────────────────────────────────
function makeEvent(overrides: Partial<DecodedEvent> & { id: string; venue: string }): DecodedEvent {
  return {
    title: "Event",
    type: "Lecture",
    dateISO: "2026-11-13",
    displayDate: "13 Nov 2026",
    startTime: "10:00",
    endTime: "11:00",
    cohort: "All Students",
    confidence: 95,
    needsReview: false,
    sourceSpan: { start: 0, end: 10, rawSentence: "" },
    ...overrides,
  };
}

// ── Zone Resolver ─────────────────────────────────────────────────────────
describe("TransitEngine - 1. Campus Zone Resolver", () => {
  it("classifies Room 204 as CS_ACADEMIC_BLOCK", () => {
    expect(getCampusZone("Room 204")).toBe("CS_ACADEMIC_BLOCK");
  });

  it("classifies 'Seminar Hall' as SEMINAR_COMPLEX", () => {
    expect(getCampusZone("Seminar Hall")).toBe("SEMINAR_COMPLEX");
  });

  it("classifies 'department office' as CS_ACADEMIC_BLOCK", () => {
    expect(getCampusZone("department office")).toBe("CS_ACADEMIC_BLOCK");
  });

  it("classifies 'Main Building Auditorium' as CENTRAL_AUDITORIUM", () => {
    expect(getCampusZone("Main Building Auditorium")).toBe("CENTRAL_AUDITORIUM");
  });

  it("classifies 'South Campus Hostel Workshop' as CAMPUS_WORKSHOPS", () => {
    expect(getCampusZone("South Campus Hostel Workshop")).toBe("CAMPUS_WORKSHOPS");
  });

  it("classifies 'online portal' as DIGITAL_PORTAL", () => {
    expect(getCampusZone("online portal")).toBe("DIGITAL_PORTAL");
  });

  it("classifies 'TBD' as not physical", () => {
    expect(isPhysicalVenue("TBD")).toBe(false);
    expect(isPhysicalVenue("")).toBe(false);
  });

  it("classifies physical campus rooms as physical venues", () => {
    expect(isPhysicalVenue("Room 204")).toBe(true);
    expect(isPhysicalVenue("Seminar Hall")).toBe(true);
    expect(isPhysicalVenue("department office")).toBe(true);
  });
});

// ── Transit Estimation ────────────────────────────────────────────────────
describe("TransitEngine - 2. Transit Time Estimation", () => {
  it("estimates 0 mins for same normalized venue name", () => {
    expect(estimateTransitMinutes("Seminar Hall", "Seminar Hall")).toBe(0);
  });

  it("estimates intra-block walking (Room 204 to department office in CS Block = 4 mins)", () => {
    expect(estimateTransitMinutes("Room 204", "department office")).toBe(4);
  });

  it("estimates 8 mins from CS_ACADEMIC_BLOCK to SEMINAR_COMPLEX (Seminar Hall)", () => {
    expect(estimateTransitMinutes("Room 204", "Seminar Hall")).toBe(8);
  });

  it("estimates 15 mins for cross-campus to workshop (e.g. Auditorium to Workshop)", () => {
    expect(estimateTransitMinutes("Main Building Auditorium", "South Campus Hostel Workshop")).toBe(15);
  });
});

// ── Transit Risk Evaluation ───────────────────────────────────────────────
describe("TransitEngine - 3. evaluateTransitRisk — Core Rule", () => {
  it("flags TRANSIT_RISK when gap = 0 min and venues differ (Room 204 → Seminar Hall)", () => {
    const a = makeEvent({ id: "a", startTime: "10:00", endTime: "11:00", venue: "Room 204" });
    const b = makeEvent({ id: "b", startTime: "11:00", endTime: "12:00", venue: "Seminar Hall" });
    const risk = evaluateTransitRisk(a, b);
    expect(risk).not.toBeNull();
    expect(risk?.hasRisk).toBe(true);
    expect(risk?.clashType).toBe("TRANSIT_RISK");
    expect(risk?.severity).toBe("WARNING");
    expect(risk?.gapMinutes).toBe(0);
    expect(risk?.explanation).toContain("Soft Clash: Only 0 mins to walk from Room 204 to Seminar Hall");
  });

  it("flags TRANSIT_RISK for a 5-min gap between Room 204 and Seminar Hall", () => {
    const a = makeEvent({ id: "a", startTime: "10:00", endTime: "11:00", venue: "Room 204" });
    const b = makeEvent({ id: "b", startTime: "11:05", endTime: "12:00", venue: "Seminar Hall" });
    const risk = evaluateTransitRisk(a, b);
    expect(risk).not.toBeNull();
    expect(risk?.gapMinutes).toBe(5);
    expect(risk?.explanation).toContain("Soft Clash: Only 5 mins to walk from Room 204 to Seminar Hall");
  });

  it("does NOT flag TRANSIT_RISK when gap > 10 minutes (safe buffer)", () => {
    const a = makeEvent({ id: "a", startTime: "10:00", endTime: "11:00", venue: "Room 204" });
    const b = makeEvent({ id: "b", startTime: "11:15", endTime: "12:00", venue: "Seminar Hall" });
    const risk = evaluateTransitRisk(a, b);
    expect(risk).toBeNull();
  });

  it("does NOT flag TRANSIT_RISK when same venue (same building)", () => {
    const a = makeEvent({ id: "a", startTime: "10:00", endTime: "11:00", venue: "Room 204" });
    const b = makeEvent({ id: "b", startTime: "11:00", endTime: "12:00", venue: "Room 204" });
    const risk = evaluateTransitRisk(a, b);
    expect(risk).toBeNull();
  });

  it("does NOT flag TRANSIT_RISK when events overlap (hard clash takes precedence)", () => {
    const a = makeEvent({ id: "a", startTime: "10:00", endTime: "11:30", venue: "Room 204" });
    const b = makeEvent({ id: "b", startTime: "11:00", endTime: "12:30", venue: "Seminar Hall" });
    const risk = evaluateTransitRisk(a, b);
    expect(risk).toBeNull(); // Overlap is a hard clash, not a transit risk
  });

  it("does NOT flag TRANSIT_RISK for digital/portal venues", () => {
    const a = makeEvent({ id: "a", startTime: "10:00", endTime: "11:00", venue: "online portal" });
    const b = makeEvent({ id: "b", startTime: "11:00", endTime: "12:00", venue: "Room 204" });
    const risk = evaluateTransitRisk(a, b);
    expect(risk).toBeNull();
  });
});

// ── PS-02 Benchmark (Room 204 vs Seminar Hall) ────────────────────────────
describe("TransitEngine - 4. PS-02 Sample Transit Analysis", () => {
  it("detects transit risk: Internal Test 2 ends at 11:30 AM (Room 204), Guest Lecture starts at 11:00 AM — test is overlapping, not transit", () => {
    // In PS-02, the test ends at 11:30 and lecture starts at 11:00 = overlap, NOT transit risk
    const events = parseNoticeText(OFFICIAL_PS02_NOTICE);
    const report = analyzeScheduleTransit(events);
    // No transit risk because the test and lecture OVERLAP (hard clash), not consecutive
    // The record submission is at department office, but it's a Deadline (point-in-time) — no transit check needed
    expect(report.hasTransitRisks).toBe(false);
  });

  it("generates correct Amber badge config for TRANSIT_RISK (distinct from Red hard clash)", () => {
    const transitBadge = getClashBadgeConfig("TRANSIT_RISK");
    const hardBadge = getClashBadgeConfig("HARD_OVERLAP");
    const deadlineBadge = getClashBadgeConfig("DEADLINE_CONTAINMENT");

    expect(transitBadge.color).toBe("amber");
    expect(transitBadge.bgClass).toContain("amber");
    expect(transitBadge.borderClass).toContain("amber");

    expect(hardBadge.color).toBe("red");
    expect(hardBadge.bgClass).toContain("rose");

    expect(deadlineBadge.color).toBe("red");
    expect(deadlineBadge.bgClass).toContain("rose");

    // Amber vs Red badges are visually distinct
    expect(transitBadge.color).not.toBe(hardBadge.color);
    expect(transitBadge.bgClass).not.toBe(hardBadge.bgClass);
  });
});

// ── Back-to-Back Transit Scenario ─────────────────────────────────────────
describe("TransitEngine - 5. Back-to-Back Transit Schedule", () => {
  it("flags TRANSIT_RISK for Auditorium → Workshop with 0-min gap (1.2 km campus distance)", () => {
    const a = makeEvent({
      id: "crypto",
      title: "Advanced Cryptography Lecture",
      startTime: "10:00",
      endTime: "11:00",
      venue: "Main Building Auditorium",
    });
    const b = makeEvent({
      id: "robotics",
      title: "Robotics Hardware Session",
      startTime: "11:00",
      endTime: "12:30",
      venue: "South Campus Hostel Workshop",
    });

    const risk = evaluateTransitRisk(a, b);
    expect(risk).not.toBeNull();
    expect(risk?.gapMinutes).toBe(0);
    expect(risk?.estimatedWalkingMinutes).toBe(15);
    expect(risk?.explanation).toContain("Only 0 mins to walk from Main Building Auditorium to South Campus Hostel Workshop");

    // Convert to PairwiseClashResult
    const pairwiseResult = formatTransitRiskAsPairwiseClash(risk!, "clash-crypto-robotics");
    expect(pairwiseResult.clashType).toBe("TRANSIT_RISK");
    expect(pairwiseResult.severity).toBe("WARNING");
    expect(pairwiseResult.id).toBe("clash-crypto-robotics");
    expect(pairwiseResult.hasClash).toBe(true);
  });

  it("analyzeScheduleTransit correctly identifies multi-event transit schedule risks", () => {
    const events: DecodedEvent[] = [
      makeEvent({
        id: "lec-a",
        title: "Morning Theory",
        startTime: "09:00",
        endTime: "10:00",
        venue: "Room 204",
      }),
      makeEvent({
        id: "lec-b",
        title: "Seminar",
        startTime: "10:05",
        endTime: "11:00",
        venue: "Seminar Hall",
      }),
      makeEvent({
        id: "lec-c",
        title: "Afternoon Workshop",
        startTime: "14:00",
        endTime: "16:00",
        venue: "South Campus Hostel Workshop",
      }),
    ];

    const report = analyzeScheduleTransit(events);
    expect(report.hasTransitRisks).toBe(true);
    expect(report.totalRisks).toBe(1); // Only morning pair (09:00–10:00 to 10:05) is within 10 mins
    expect(report.risks[0]!.gapMinutes).toBe(5);
    expect(report.summary).toContain("1 physical campus transit risk(s)");
  });

  it("provides summary string when all sessions have sufficient buffer", () => {
    const events: DecodedEvent[] = [
      makeEvent({ id: "a", startTime: "09:00", endTime: "10:00", venue: "Room 204" }),
      makeEvent({ id: "b", startTime: "10:30", endTime: "11:30", venue: "Seminar Hall" }),
    ];
    const report = analyzeScheduleTransit(events);
    expect(report.hasTransitRisks).toBe(false);
    expect(report.summary).toContain("sufficient walking transit buffer");
  });
});