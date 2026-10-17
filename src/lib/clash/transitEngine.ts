// 🚶‍♂️ ChronosCampus Smart Rule-Based Physical Transit Analyzer 🚶‍♂️
// Evaluates real-world campus transit feasibility between consecutive sessions:
// 1. Lightweight campus zone distance heuristic based on building clusters.
// 2. Flags TRANSIT_RISK when Event A ends at T1 (Venue A) and Event B starts at T2 (Venue B)
//    where Venue A !== Venue B and 0 <= (T2 - T1) <= 10 minutes.
//    "Soft Clash: Only X mins to walk from Venue A to Venue B."
// 3. Provides visually distinct Amber badge styling for soft transit clashes
//    vs Red badge styling for hard temporal overlaps.

import type {
  DecodedEvent,
  PairwiseClashResult,
  ClashType,
  ClashSeverity,
} from "@/src/types/notice";
import {
  toMinutes,
  format12Hour,
} from "./pairwiseEngine";

/**
 * Campus zones representing physical campus buildings and facility clusters.
 */
export type CampusZone =
  | "CS_ACADEMIC_BLOCK"
  | "CENTRAL_AUDITORIUM"
  | "SEMINAR_COMPLEX"
  | "CAMPUS_WORKSHOPS"
  | "CENTRAL_LIBRARY"
  | "ADMIN_OFFICE"
  | "DIGITAL_PORTAL"
  | "GENERAL_CAMPUS";

/**
 * Metadata for a campus zone.
 */
export interface CampusZoneInfo {
  zone: CampusZone;
  name: string;
  typicalWalkingBufferMinutes: number;
}

export const CAMPUS_ZONE_METADATA: Record<CampusZone, CampusZoneInfo> = {
  CS_ACADEMIC_BLOCK: {
    zone: "CS_ACADEMIC_BLOCK",
    name: "CS & Academic Block",
    typicalWalkingBufferMinutes: 5,
  },
  CENTRAL_AUDITORIUM: {
    zone: "CENTRAL_AUDITORIUM",
    name: "Main Auditorium Complex",
    typicalWalkingBufferMinutes: 10,
  },
  SEMINAR_COMPLEX: {
    zone: "SEMINAR_COMPLEX",
    name: "Seminar & Conference Wing",
    typicalWalkingBufferMinutes: 8,
  },
  CAMPUS_WORKSHOPS: {
    zone: "CAMPUS_WORKSHOPS",
    name: "Workshops & Practical Labs",
    typicalWalkingBufferMinutes: 15,
  },
  CENTRAL_LIBRARY: {
    zone: "CENTRAL_LIBRARY",
    name: "Central Library & Media Center",
    typicalWalkingBufferMinutes: 7,
  },
  ADMIN_OFFICE: {
    zone: "ADMIN_OFFICE",
    name: "Administrative Headquarters",
    typicalWalkingBufferMinutes: 6,
  },
  DIGITAL_PORTAL: {
    zone: "DIGITAL_PORTAL",
    name: "Digital / Virtual Submissions",
    typicalWalkingBufferMinutes: 0,
  },
  GENERAL_CAMPUS: {
    zone: "GENERAL_CAMPUS",
    name: "General Campus Location",
    typicalWalkingBufferMinutes: 10,
  },
};

/**
 * Visual badge styling configuration for UI rendering.
 * Keeps TRANSIT_RISK (Amber) visually distinct from HARD_OVERLAP / DEADLINE_CONTAINMENT (Red).
 */
export interface ClashBadgeConfig {
  clashType: ClashType;
  severity: ClashSeverity;
  color: "amber" | "red" | "green" | "slate";
  bgClass: string;
  borderClass: string;
  textClass: string;
  badgeLabel: string;
  shortLabel: string;
  description: string;
}

export const CLASH_BADGE_CONFIG: Record<ClashType, ClashBadgeConfig> = {
  TRANSIT_RISK: {
    clashType: "TRANSIT_RISK",
    severity: "WARNING",
    color: "amber",
    bgClass: "bg-amber-50/90",
    borderClass: "border-amber-200",
    textClass: "text-amber-800",
    badgeLabel: "TRANSIT RISK",
    shortLabel: "Soft Clash (Transit)",
    description: "Physical transit window between venues is 10 minutes or less.",
  },
  HARD_OVERLAP: {
    clashType: "HARD_OVERLAP",
    severity: "CRITICAL",
    color: "red",
    bgClass: "bg-rose-50/90",
    borderClass: "border-rose-200",
    textClass: "text-rose-800",
    badgeLabel: "HARD OVERLAP",
    shortLabel: "Direct Conflict",
    description: "Two ranged academic sessions overlap in the schedule.",
  },
  DEADLINE_CONTAINMENT: {
    clashType: "DEADLINE_CONTAINMENT",
    severity: "CRITICAL",
    color: "red",
    bgClass: "bg-rose-50/90",
    borderClass: "border-rose-200",
    textClass: "text-rose-800",
    badgeLabel: "DEADLINE CONTAINMENT",
    shortLabel: "Trapped Deadline",
    description: "Submission deadline falls during a scheduled lecture or test.",
  },
  NO_CLASH: {
    clashType: "NO_CLASH",
    severity: "SAFE",
    color: "green",
    bgClass: "bg-emerald-50/90",
    borderClass: "border-emerald-200",
    textClass: "text-emerald-800",
    badgeLabel: "CLEAR",
    shortLabel: "No Conflict",
    description: "Independent times with adequate transition buffer.",
  },
};

/**
 * Returns badge styling metadata for a given clash type.
 */
export function getClashBadgeConfig(clashType: ClashType): ClashBadgeConfig {
  return CLASH_BADGE_CONFIG[clashType] ?? CLASH_BADGE_CONFIG.NO_CLASH;
}

/**
 * 1. Resolves a venue name to its physical campus zone cluster.
 */
export function getCampusZone(venue: string): CampusZone {
  if (!venue) return "GENERAL_CAMPUS";
  const clean = venue.trim().toLowerCase();

  // Digital / virtual submissions or unassigned
  if (
    clean === "tbd" ||
    clean === "n/a" ||
    clean.includes("online") ||
    clean.includes("portal") ||
    clean.includes("meet") ||
    clean.includes("zoom") ||
    clean.includes("virtual")
  ) {
    return "DIGITAL_PORTAL";
  }

  // CS / Academic Department & Classrooms & Labs
  if (
    clean.includes("room 204") ||
    clean.includes("room 101") ||
    clean.includes("room 102") ||
    clean.includes("room 201") ||
    clean.includes("room") ||
    clean.includes("classroom") ||
    clean.includes("lab 3") ||
    clean.includes("computing lab") ||
    clean.includes("dsp lab") ||
    clean.includes("lab") ||
    clean.includes("department office") ||
    clean.includes("dept office") ||
    clean.includes("cse dept") ||
    clean.includes("faculty cabin")
  ) {
    return "CS_ACADEMIC_BLOCK";
  }

  // Central Auditorium
  if (clean.includes("auditorium")) {
    return "CENTRAL_AUDITORIUM";
  }

  // Seminar Halls
  if (clean.includes("seminar hall") || clean.includes("seminar") || clean.includes("conference")) {
    return "SEMINAR_COMPLEX";
  }

  // Workshops & Outer Campus Practical Centers
  if (
    clean.includes("workshop") ||
    clean.includes("hostel workshop") ||
    clean.includes("robotics") ||
    clean.includes("mechanical")
  ) {
    return "CAMPUS_WORKSHOPS";
  }

  // Central Library
  if (clean.includes("library") || clean.includes("reading room")) {
    return "CENTRAL_LIBRARY";
  }

  // Administrative Offices
  if (clean.includes("admin") || clean.includes("registrar") || clean.includes("dean")) {
    return "ADMIN_OFFICE";
  }

  return "GENERAL_CAMPUS";
}

/**
 * Checks if a venue represents a physical, in-person campus location.
 */
export function isPhysicalVenue(venue: string): boolean {
  if (!venue) return false;
  const clean = venue.trim().toLowerCase();
  if (clean === "tbd" || clean === "n/a" || clean === "") return false;
  const zone = getCampusZone(venue);
  return zone !== "DIGITAL_PORTAL";
}

/**
 * Normalizes venue name for identity comparison.
 */
export function normalizeVenueName(venue: string): string {
  if (!venue) return "";
  return venue
    .toLowerCase()
    .replace(/^(in|at|to the|the)\s+/i, "")
    .replace(/[.,\s]+/g, " ")
    .trim();
}

/**
 * Estimates minimum transit time in minutes between two campus venues.
 */
export function estimateTransitMinutes(venueA: string, venueB: string): number {
  if (!isPhysicalVenue(venueA) || !isPhysicalVenue(venueB)) {
    return 0;
  }

  const normA = normalizeVenueName(venueA);
  const normB = normalizeVenueName(venueB);
  if (normA === normB) {
    return 0; // Same physical room
  }

  const zoneA = getCampusZone(venueA);
  const zoneB = getCampusZone(venueB);

  // Same campus zone (e.g. Room 204 to Department office in CS Block)
  if (zoneA === zoneB) {
    return 4; // Intra-building walking time
  }

  // Cross-campus to outer workshops (e.g. Main Auditorium to South Campus Hostel Workshop)
  if (
    (zoneA === "CAMPUS_WORKSHOPS" && zoneB !== "CAMPUS_WORKSHOPS") ||
    (zoneB === "CAMPUS_WORKSHOPS" && zoneA !== "CAMPUS_WORKSHOPS")
  ) {
    return 15; // Inter-campus transit distance (e.g. 1.2 km)
  }

  // Adjacent academic facilities (e.g. CS Block to Seminar Hall)
  if (
    (zoneA === "CS_ACADEMIC_BLOCK" && zoneB === "SEMINAR_COMPLEX") ||
    (zoneB === "CS_ACADEMIC_BLOCK" && zoneA === "SEMINAR_COMPLEX")
  ) {
    return 8;
  }

  // General inter-building transit
  return 10;
}

/**
 * Detailed transit risk result between two events.
 */
export interface TransitRiskResult {
  id: string;
  eventA: string;
  eventB: string;
  earlierEvent: DecodedEvent;
  laterEvent: DecodedEvent;
  venueA: string;
  venueB: string;
  zoneA: CampusZone;
  zoneB: CampusZone;
  endTimeA: string;
  startTimeB: string;
  gapMinutes: number;
  estimatedWalkingMinutes: number;
  hasRisk: boolean;
  clashType: "TRANSIT_RISK";
  severity: "WARNING";
  badge: ClashBadgeConfig;
  explanation: string;
  recommendation: string;
}

/**
 * 2. Rule-Based Physical Transit Evaluator.
 * If Event A ends at T1 in Venue A and Event B starts at T2 in Venue B
 * where Venue A !== Venue B and 0 <= (T2 - T1) <= 10 minutes:
 * Flags a TRANSIT_RISK with "Soft Clash: Only X mins to walk from Venue A to Venue B."
 */
export function evaluateTransitRisk(
  a: DecodedEvent,
  b: DecodedEvent
): TransitRiskResult | null {
  // Calendar dates must match
  if (a.dateISO !== b.dateISO) {
    return null;
  }

  // Both venues must be physical
  if (!isPhysicalVenue(a.venue) || !isPhysicalVenue(b.venue)) {
    return null;
  }

  // Venues must be distinct
  const normA = normalizeVenueName(a.venue);
  const normB = normalizeVenueName(b.venue);
  if (normA === normB) {
    return null; // Same room, zero transit needed
  }

  // Determine chronological ordering
  const aStart = toMinutes(a.startTime);
  const aEnd = toMinutes(a.endTime || a.startTime);
  const bStart = toMinutes(b.startTime);
  const bEnd = toMinutes(b.endTime || b.startTime);

  // If there is temporal overlap (max(start) < min(end)), that is a hard clash, not transit risk
  const overlapStart = Math.max(aStart, bStart);
  const overlapEnd = Math.min(aEnd, bEnd);
  if (overlapStart < overlapEnd) {
    return null;
  }

  // Identify earlier vs later event
  let earlier: DecodedEvent;
  let later: DecodedEvent;
  let t1: number;
  let t2: number;

  if (aEnd <= bStart) {
    earlier = a;
    later = b;
    t1 = aEnd;
    t2 = bStart;
  } else if (bEnd <= aStart) {
    earlier = b;
    later = a;
    t1 = bEnd;
    t2 = aStart;
  } else {
    return null;
  }

  const gap = t2 - t1;

  // Condition: 0 <= (T2 - T1) <= 10 minutes
  if (gap < 0 || gap > 10) {
    return null;
  }

  const zoneA = getCampusZone(earlier.venue);
  const zoneB = getCampusZone(later.venue);
  const estimatedWalking = estimateTransitMinutes(earlier.venue, later.venue);
  const badge = getClashBadgeConfig("TRANSIT_RISK");

  const explanation = `Soft Clash: Only ${gap} mins to walk from ${earlier.venue} to ${later.venue}.`;
  const recommendation = `Recommend adding a ${estimatedWalking}-minute transit buffer between "${earlier.title}" (${earlier.venue}) and "${later.title}" (${later.venue}).`;

  return {
    id: `transit-${earlier.id}-${later.id}`,
    eventA: earlier.id,
    eventB: later.id,
    earlierEvent: earlier,
    laterEvent: later,
    venueA: earlier.venue,
    venueB: later.venue,
    zoneA,
    zoneB,
    endTimeA: earlier.endTime || earlier.startTime,
    startTimeB: later.startTime,
    gapMinutes: gap,
    estimatedWalkingMinutes: estimatedWalking,
    hasRisk: true,
    clashType: "TRANSIT_RISK",
    severity: "WARNING",
    badge,
    explanation,
    recommendation,
  };
}

/**
 * Report containing all transit risks across a schedule.
 */
export interface TransitScheduleReport {
  risks: TransitRiskResult[];
  hasTransitRisks: boolean;
  totalRisks: number;
  summary: string;
}

/**
 * Scans all unique pairs in a schedule for transit risks.
 */
export function analyzeScheduleTransit(
  events: DecodedEvent[]
): TransitScheduleReport {
  const risks: TransitRiskResult[] = [];
  const validDated = events.filter((e) => e.dateISO && e.startTime && isPhysicalVenue(e.venue));

  for (let i = 0; i < validDated.length; i++) {
    for (let j = i + 1; j < validDated.length; j++) {
      const risk = evaluateTransitRisk(validDated[i]!, validDated[j]!);
      if (risk) {
        risks.push(risk);
      }
    }
  }

  let summary = "";
  if (risks.length > 0) {
    summary = `Identified ${risks.length} physical campus transit risk(s) with <= 10 min passing window.`;
  } else {
    summary = "All consecutive sessions have sufficient walking transit buffer (> 10 mins).";
  }

  return {
    risks,
    hasTransitRisks: risks.length > 0,
    totalRisks: risks.length,
    summary,
  };
}

/**
 * Converts a TransitRiskResult into a PairwiseClashResult for seamless matrix integration.
 * An optional idOverride allows the caller to supply a stable clash-prefixed id.
 */
export function formatTransitRiskAsPairwiseClash(
  risk: TransitRiskResult,
  idOverride?: string
): PairwiseClashResult {
  return {
    id: idOverride ?? risk.id,
    eventA: risk.eventA,
    eventB: risk.eventB,
    hasClash: true,
    clashType: "TRANSIT_RISK",
    overlapMinutes: 0,
    overlapWindow: {
      start: risk.endTimeA,
      end: risk.startTimeB,
    },
    explanation: risk.explanation,
    severity: "WARNING",
  };
}