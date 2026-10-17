// ⚖️ ChronosCampus Deterministic Pairwise Conflict Engine ⚖️
// Mathematical collision audit implementing exact rules from the PS-02 Challenge:
// 1. Convert startTime and endTime to minutes from midnight (0 <= t <= 1440).
// 2. Overnight / Invalid time guard (endTime < startTime).
// 3. Rule A: Ranged vs Ranged overlap max(A.start, B.start) < min(A.end, B.end).
//    "Clash. They overlap from 11:00 AM to 11:30 AM (30 minutes)."
// 4. Rule B: Deadline vs Ranged containment (Se <= Td <= Ee).
//    "Clash. The 12:00 PM deadline falls during the lecture."
//    "No clash. The test ends at 11:30 AM, before the deadline."
// 5. Rule C: Simultaneous physical deadlines in distinct venues.

import type { DecodedEvent, PairwiseClashResult, OverlapWindow } from "@/src/types/notice";

/**
 * 1. Converts 24-hour HH:mm time string to minutes from midnight (0 <= t <= 1440).
 */
export function toMinutes(hhmm: string): number {
  if (!hhmm) return 0;
  const parts = hhmm.split(":");
  const h = parseInt(parts[0] || "0", 10);
  const m = parseInt(parts[1] || "0", 10);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

/**
 * Converts minutes from midnight to HH:mm string.
 */
export function fromMinutes(mins: number): string {
  const norm = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Formats a 24-hour HH:mm time string to a clean 12-hour AM/PM display string.
 * e.g. "10:00" -> "10:00 AM", "12:00" -> "12:00 PM", "13:00" -> "1:00 PM"
 */
export function format12Hour(hhmm: string): string {
  if (!hhmm) return "";
  const [hStr, mStr] = hhmm.split(":");
  let h = parseInt(hStr || "0", 10);
  const m = parseInt(mStr || "0", 10);
  const med = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${String(m).padStart(2, "0")} ${med}`;
}

/**
 * 2. Overnight / Invalid Time Guard.
 * If a user edits endTime < startTime, flags validation error.
 */
export function validateEventTimes(event: {
  startTime: string;
  endTime: string;
  type?: string;
}): { isValid: boolean; error: string | null } {
  if (!event.startTime) {
    return { isValid: false, error: "Start time is required" };
  }

  // Deadlines have single point-in-time
  if (event.type === "Deadline") {
    return { isValid: true, error: null };
  }

  const startMins = toMinutes(event.startTime);
  const endMins = toMinutes(event.endTime || event.startTime);

  if (endMins < startMins) {
    return {
      isValid: false,
      error: "End time cannot be earlier than start time",
    };
  }

  return { isValid: true, error: null };
}

/**
 * 3. Evaluates collision between any pair of academic events (A, B).
 */
export function evaluatePairwiseClash(
  a: DecodedEvent,
  b: DecodedEvent
): PairwiseClashResult {
  // Calendar date check
  if (a.dateISO !== b.dateISO) {
    return {
      id: `clash-${a.id}-${b.id}`,
      eventA: a.id,
      eventB: b.id,
      hasClash: false,
      clashType: "NO_CLASH",
      overlapMinutes: 0,
      overlapWindow: null,
      explanation: `No clash. "${a.title}" and "${b.title}" occur on different calendar dates (${a.dateISO} vs ${b.dateISO}).`,
      severity: "SAFE",
    };
  }

  // Time guard validation
  const validA = validateEventTimes(a);
  const validB = validateEventTimes(b);

  if (!validA.isValid || !validB.isValid) {
    return {
      id: `clash-${a.id}-${b.id}`,
      eventA: a.id,
      eventB: b.id,
      hasClash: false,
      clashType: "NO_CLASH",
      overlapMinutes: 0,
      overlapWindow: null,
      explanation: validA.error || validB.error || "End time cannot be earlier than start time",
      severity: "WARNING",
    };
  }

  // ── Rule A: Ranged Event vs. Ranged Event ──────────────────────────────────
  if (a.type !== "Deadline" && b.type !== "Deadline") {
    const aStart = toMinutes(a.startTime);
    const aEnd = toMinutes(a.endTime || a.startTime);
    const bStart = toMinutes(b.startTime);
    const bEnd = toMinutes(b.endTime || b.startTime);

    const overlapStart = Math.max(aStart, bStart);
    const overlapEnd = Math.min(aEnd, bEnd);
    const duration = overlapEnd - overlapStart;

    if (overlapStart < overlapEnd) {
      const startStr = fromMinutes(overlapStart);
      const endStr = fromMinutes(overlapEnd);
      return {
        id: `clash-${a.id}-${b.id}`,
        eventA: a.id,
        eventB: b.id,
        hasClash: true,
        clashType: "HARD_OVERLAP",
        overlapMinutes: duration,
        overlapWindow: { start: startStr, end: endStr },
        explanation: `Clash. They overlap from ${format12Hour(startStr)} to ${format12Hour(endStr)} (${duration} minutes).`,
        severity: "CRITICAL",
      };
    }

    // Zero-minute boundary with distinct physical venues (Transit Risk)
    if (
      (aEnd === bStart || bEnd === aStart) &&
      a.venue &&
      b.venue &&
      a.venue !== b.venue &&
      a.venue !== "TBD" &&
      b.venue !== "TBD"
    ) {
      const transitTime = aEnd === bStart ? a.endTime : b.endTime;
      return {
        id: `clash-${a.id}-${b.id}`,
        eventA: a.id,
        eventB: b.id,
        hasClash: true,
        clashType: "TRANSIT_RISK",
        overlapMinutes: 0,
        overlapWindow: { start: transitTime, end: transitTime },
        explanation: `Warning. Zero-minute transit gap at ${format12Hour(transitTime)} between "${a.title}" (${a.venue}) and "${b.title}" (${b.venue}).`,
        severity: "WARNING",
      };
    }

    // No overlap
    const earlier = aEnd <= bStart ? a : b;
    const later = earlier.id === a.id ? b : a;
    return {
      id: `clash-${a.id}-${b.id}`,
      eventA: a.id,
      eventB: b.id,
      hasClash: false,
      clashType: "NO_CLASH",
      overlapMinutes: 0,
      overlapWindow: null,
      explanation: `No clash. "${earlier.title}" ends at ${format12Hour(earlier.endTime)}, before "${later.title}" starts at ${format12Hour(later.startTime)}.`,
      severity: "SAFE",
    };
  }

  // ── Rule B: Deadline vs. Ranged Event ──────────────────────────────────────
  if (
    (a.type === "Deadline" && b.type !== "Deadline") ||
    (b.type === "Deadline" && a.type !== "Deadline")
  ) {
    const deadline = a.type === "Deadline" ? a : b;
    const ranged = a.type === "Deadline" ? b : a;

    const td = toMinutes(deadline.startTime);
    const se = toMinutes(ranged.startTime);
    const ee = toMinutes(ranged.endTime || ranged.startTime);
    const rangedNoun = ranged.type.toLowerCase();

    // Se <= Td <= Ee
    if (se <= td && td <= ee) {
      return {
        id: `clash-${a.id}-${b.id}`,
        eventA: a.id,
        eventB: b.id,
        hasClash: true,
        clashType: "DEADLINE_CONTAINMENT",
        overlapMinutes: 0,
        overlapWindow: { start: deadline.startTime, end: deadline.startTime },
        explanation: `Clash. The ${format12Hour(deadline.startTime)} deadline falls during the ${rangedNoun}.`,
        severity: "CRITICAL",
      };
    }

    // Outside the event
    let explanation = "";
    if (ee <= td) {
      explanation = `No clash. The ${rangedNoun} ends at ${format12Hour(ranged.endTime)}, before the deadline.`;
    } else {
      explanation = `No clash. The deadline is at ${format12Hour(deadline.startTime)}, before the ${rangedNoun} starts.`;
    }

    return {
      id: `clash-${a.id}-${b.id}`,
      eventA: a.id,
      eventB: b.id,
      hasClash: false,
      clashType: "NO_CLASH",
      overlapMinutes: 0,
      overlapWindow: null,
      explanation,
      severity: "SAFE",
    };
  }

  // ── Rule C: Deadline vs. Deadline at Identical Timestamp ───────────────────
  const ta = toMinutes(a.startTime);
  const tb = toMinutes(b.startTime);

  if (ta === tb) {
    if (
      a.venue &&
      b.venue &&
      a.venue !== b.venue &&
      a.venue !== "TBD" &&
      b.venue !== "TBD"
    ) {
      return {
        id: `clash-${a.id}-${b.id}`,
        eventA: a.id,
        eventB: b.id,
        hasClash: true,
        clashType: "HARD_OVERLAP",
        overlapMinutes: 0,
        overlapWindow: { start: a.startTime, end: a.startTime },
        explanation: `Clash. Two simultaneous physical submission deadlines at ${format12Hour(a.startTime)} in different venues ("${a.venue}" vs "${b.venue}").`,
        severity: "CRITICAL",
      };
    }

    return {
      id: `clash-${a.id}-${b.id}`,
      eventA: a.id,
      eventB: b.id,
      hasClash: false,
      clashType: "NO_CLASH",
      overlapMinutes: 0,
      overlapWindow: null,
      explanation: `No clash. Both deadlines occur at ${format12Hour(a.startTime)} at the same submission location.`,
      severity: "SAFE",
    };
  }

  return {
    id: `clash-${a.id}-${b.id}`,
    eventA: a.id,
    eventB: b.id,
    hasClash: false,
    clashType: "NO_CLASH",
    overlapMinutes: 0,
    overlapWindow: null,
    explanation: `No clash. Deadlines are scheduled at different times (${format12Hour(a.startTime)} vs ${format12Hour(b.startTime)}).`,
    severity: "SAFE",
  };
}

/**
 * 4. Runs pairwise comparison across all unique pairs (n * (n - 1) / 2)
 */
export function evaluateAllPairs(events: DecodedEvent[]): PairwiseClashResult[] {
  const results: PairwiseClashResult[] = [];
  const validDated = events.filter((e) => e.dateISO && e.startTime);

  for (let i = 0; i < validDated.length; i++) {
    for (let j = i + 1; j < validDated.length; j++) {
      results.push(evaluatePairwiseClash(validDated[i]!, validDated[j]!));
    }
  }

  return results;
}