// ⏱️ Deterministic Time Range & Deadline Parser ⏱️
// Zero-hallucination time extraction supporting explicit ranges, meridiem inheritance,
// point-in-time deadlines, and missing end-time heuristics.

import type { EventCategory } from "@/src/types/notice";

export interface ParsedTimeRange {
  startTime: string; // HH:mm 24-hour format
  endTime: string;   // HH:mm 24-hour format
  durationMinutes: number;
  isDeadline: boolean;
  isInferredEndTime: boolean;
  confidencePenalty: number;
  needsReview: boolean;
  reviewReason: string | null;
  matchedText: string;
}

// ── Time Arithmetic Helpers ──────────────────────────────────────────────────

export function toMinutes(hhmm: string): number {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function fromMinutes(mins: number): string {
  const norm = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function parseSingleTime(
  rawHour: string,
  rawMinute?: string,
  meridiem?: string
): string | null {
  const h = parseInt(rawHour, 10);
  const m = rawMinute !== undefined ? parseInt(rawMinute, 10) : 0;
  if (isNaN(h) || isNaN(m) || m < 0 || m > 59) return null;

  const med = meridiem?.trim().toLowerCase();

  if (med === "noon" || med === "12:00 noon" || med === "12 noon") {
    return "12:00";
  }
  if (med === "midnight" || med === "12 midnight") {
    return "00:00";
  }

  if (med === "pm") {
    if (h < 1 || h > 12) return null;
    const h24 = h === 12 ? 12 : h + 12;
    return `${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  if (med === "am") {
    if (h < 1 || h > 12) return null;
    const h24 = h === 12 ? 0 : h;
    return `${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  // 24-hour format without meridiem (e.g. 14:00)
  if (h >= 0 && h <= 23) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  return null;
}

// ── Regular Expressions ──────────────────────────────────────────────────────

// Deadline keyword patterns
const RE_DEADLINE =
  /\b(?:must\s+be\s+submitted\s+(?:to\s+[^,\.\n]+?\s+)?by|latest\s+by|due\s+(?:at|by|on)|submit\s+(?:by|before)|submission\s+(?:due\s+at|by|on)|before|by|up\s+to)\s+(12(?::00)?\s*(?:noon|midnight)|(?:\d{1,2}(?::\d{2})?\s*(?:am|pm)?|\d{2}:\d{2}))\b/i;

// Explicit range: "from 10:00 AM to 11:30 AM", "10:00 - 11:30 AM", "14:00 to 15:30"
const RE_RANGE =
  /(?:from\s+)?(\d{1,2}(?::\d{2})?)\s*(am|pm)?\s*(?:[--]|to)\s*(\d{1,2}(?::\d{2})?)\s*(am|pm)?\b/i;

// Single time point: "at 10:00 AM", "at 2 PM", "at 14:00"
const RE_SINGLE_TIME =
  /\b(?:at|from|starting\s+at)?\s*(\d{1,2}(?::\d{2})?)\s*(am|pm|noon|midnight)\b|\b([01]\d|2[0-3]):([0-5]\d)\b/i;

// ── Core Time Range & Deadline Extractor ─────────────────────────────────────

export function extractTimeRange(
  text: string,
  eventType?: EventCategory
): ParsedTimeRange | null {
  // 1. Point-in-time Deadlines
  const deadlineMatch = text.match(RE_DEADLINE);
  if (deadlineMatch) {
    const rawTime = deadlineMatch[1]!.trim();
    const parsed = parseSpecialOrStandardTime(rawTime);
    if (parsed) {
      return {
        startTime: parsed,
        endTime: parsed,
        durationMinutes: 0,
        isDeadline: true,
        isInferredEndTime: false,
        confidencePenalty: 0,
        needsReview: false,
        reviewReason: null,
        matchedText: deadlineMatch[0],
      };
    }
  }

  // 2. Explicit Time Ranges with Meridiem Inheritance
  const rangeMatch = text.match(RE_RANGE);
  if (rangeMatch) {
    const rawStart = rangeMatch[1]!;
    const rawStartMed = rangeMatch[2]?.toLowerCase();
    const rawEnd = rangeMatch[3]!;
    const rawEndMed = rangeMatch[4]?.toLowerCase();

    const [startHStr, startMStr] = rawStart.split(":");
    const [endHStr, endMStr] = rawEnd.split(":");

    const startH = parseInt(startHStr!, 10);
    const startM = startMStr ? parseInt(startMStr, 10) : 0;
    const endH = parseInt(endHStr!, 10);
    const endM = endMStr ? parseInt(endMStr, 10) : 0;

    // Meridiem Inheritance Logic
    let resolvedStartMed = rawStartMed;
    let resolvedEndMed = rawEndMed;

    if (!resolvedStartMed && resolvedEndMed) {
      if (resolvedEndMed === "am") {
        resolvedStartMed = "am";
      } else if (resolvedEndMed === "pm") {
        // e.g. "11:00 to 1:00 PM" -> spans noon: 11:00 AM to 13:00 PM
        if (startH >= 8 && startH <= 11 && endH >= 1 && endH <= 6) {
          resolvedStartMed = "am";
        } else if (startH < endH || startH === 12) {
          // e.g. "2 to 4 PM" -> 2 PM to 4 PM
          resolvedStartMed = "pm";
        } else {
          // e.g. "9 to 1 PM" -> 9 AM to 1 PM
          resolvedStartMed = "am";
        }
      }
    } else if (resolvedStartMed && !resolvedEndMed) {
      // e.g. "2 PM to 4" -> inherit PM
      resolvedEndMed = resolvedStartMed;
    }

    const start24 = parseSingleTime(String(startH), String(startM), resolvedStartMed);
    const end24 = parseSingleTime(String(endH), String(endM), resolvedEndMed);

    if (start24 && end24) {
      const startMins = toMinutes(start24);
      let endMins = toMinutes(end24);

      // Handle overnight wrap if end < start
      if (endMins < startMins) {
        endMins += 1440;
      }

      const duration = endMins - startMins;

      return {
        startTime: start24,
        endTime: end24,
        durationMinutes: duration,
        isDeadline: false,
        isInferredEndTime: false,
        confidencePenalty: 0,
        needsReview: false,
        reviewReason: null,
        matchedText: rangeMatch[0],
      };
    }
  }

  // 3. Fallback: Single time with Inferred End Time (+60 min) for Test / Lecture
  const singleMatch = text.match(RE_SINGLE_TIME);
  if (singleMatch) {
    const rawTime = singleMatch[0];
    const parsedStart = parseSpecialOrStandardTime(rawTime);

    if (parsedStart) {
      // If the event is explicitly a Deadline or text implies deadline
      if (
        eventType === "Deadline" ||
        /\b(?:deadline|due|submit|submission)\b/i.test(text)
      ) {
        return {
          startTime: parsedStart,
          endTime: parsedStart,
          durationMinutes: 0,
          isDeadline: true,
          isInferredEndTime: false,
          confidencePenalty: 0,
          needsReview: false,
          reviewReason: null,
          matchedText: rawTime,
        };
      }

      // Ranged event (Test or Lecture) missing explicit end time: +60 mins
      const startMins = toMinutes(parsedStart);
      const endMins = (startMins + 60) % 1440;
      const inferredEnd = fromMinutes(endMins);

      return {
        startTime: parsedStart,
        endTime: inferredEnd,
        durationMinutes: 60,
        isDeadline: false,
        isInferredEndTime: true,
        confidencePenalty: 15,
        needsReview: true,
        reviewReason: "End time inferred (+1 hr)",
        matchedText: rawTime,
      };
    }
  }

  return null;
}

// ── Special String Normalization ─────────────────────────────────────────────

function parseSpecialOrStandardTime(raw: string): string | null {
  const s = raw.trim().toLowerCase();
  if (s.includes("noon")) return "12:00";
  if (s.includes("midnight")) return "00:00";

  // Check 12-hour with explicit meridiem first: "10:00 AM", "2 PM", "5:00 PM"
  const m12 = s.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  if (m12) {
    return parseSingleTime(m12[1]!, m12[2] ?? "0", m12[3]);
  }

  // Check 24-hour format: "14:00"
  const m24 = s.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (m24) {
    const h = parseInt(m24[1]!, 10);
    const m = parseInt(m24[2]!, 10);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  return null;
}