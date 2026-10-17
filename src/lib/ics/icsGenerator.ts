/**
 * icsGenerator.ts — Rock-Solid, Standards-Compliant RFC-5545 .ics Calendar Generator
 *
 * Implements strict compliance with RFC 5545 (iCalendar standard):
 * 1. Strict CRLF (\r\n) line endings on every line.
 * 2. 75-octet line folding with single whitespace continuation (RFC-5545 §3.1).
 * 3. Calendar header: BEGIN:VCALENDAR, VERSION:2.0, PRODID:-//ChronosCampus//Notice Decoder PS-02//EN,
 *    CALSCALE:GREGORIAN, METHOD:PUBLISH.
 * 4. Deterministic UID hashing (deterministic hash + @chronoscampus.edu).
 * 5. UTC DTSTAMP.
 * 6. DTSTART & DTEND handling:
 *    - For Deadlines at 12:00 PM: DTSTART = 12:00 PM, DTEND = 12:15 PM with "[DEADLINE]" summary prefix
 *      so Google Calendar, Apple Calendar, and Outlook render visible 15-minute slot blocks.
 *    - For Tests & Lectures: exact start and end times.
 * 7. Escaped SUMMARY, LOCATION, CATEGORIES, STATUS:CONFIRMED.
 * 8. Rich DESCRIPTION embedding:
 *    - Original notice provenance / extracted sentence
 *    - Active conflict warnings (pairwise overlap / deadline containment)
 *    - Actionable resolution suggestions (auto-reschedule slots)
 *    - Target cohort and deterministic verification telemetry
 * 9. VALARM alarms:
 *    - 30 minutes prior (-PT30M) for Tests and Lectures
 *    - 2 hours prior (-PT2H) for Deadlines
 */

import type { DecodedEvent, PairwiseClashResult, ActionRecommendation } from "@/src/types/notice";
import type { ReviewedEvent } from "@/src/types";
import { escapeIcsText } from "@/src/lib/security";

/** Options for customizing ICS generation */
export interface IcsGeneratorOptions {
  /** Target timezone (default: "Asia/Kolkata") */
  timeZone?: string;
  /** Custom organization PRODID */
  prodId?: string;
  /** Domain suffix for UIDs (default: "chronoscampus.edu") */
  domain?: string;
  /** Explicit DTSTAMP for deterministic unit tests (UTC format) */
  dtstamp?: string;
  /** Active pairwise clashes to embed as clash warnings in event descriptions */
  clashes?: PairwiseClashResult[];
  /** Action recommendations to embed inside calendar event notes */
  recommendations?: ActionRecommendation[];
  /** Default reminder for Tests/Lectures in minutes (default: 30 -> -PT30M) */
  testReminderMins?: number;
  /** Default reminder for Deadlines in hours (default: 2 -> -PT2H) */
  deadlineReminderHours?: number;
  /** Whether to use simple UID for backward test compatibility */
  useSimpleIdUid?: boolean;
}

/** Unified event type accepted by generator */
export type AnyCalendarEvent = DecodedEvent | ReviewedEvent;

/**
 * Fast, deterministic 32-bit hash algorithm (Murmur-inspired) that produces
 * a stable 12-character hex hash across any JavaScript environment.
 */
export function generateDeterministicHash(input: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const val = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return val.toString(16).padStart(12, "0");
}

/**
 * RFC 5545 §3.1 Content Lines Folding at 75 octets.
 * Slices long lines on UTF-8 byte boundaries so continuation lines start with a space.
 */
export function foldIcsLine(line: string): string {
  const getByteLength = (str: string): number => {
    if (typeof Buffer !== "undefined") {
      return Buffer.byteLength(str, "utf8");
    }
    return new TextEncoder().encode(str).length;
  };

  if (getByteLength(line) <= 75) {
    return line;
  }

  const chunks: string[] = [];
  let current = "";
  let currentBytes = 0;
  const maxBytesFirst = 75;
  const maxBytesContinuation = 74; // 1 byte reserved for leading space
  let isFirst = true;

  // Use code point iterator to never split surrogate pairs or multi-byte characters
  for (const char of line) {
    const charBytes = getByteLength(char);
    const limit = isFirst ? maxBytesFirst : maxBytesContinuation;

    if (currentBytes + charBytes > limit) {
      chunks.push(isFirst ? current : " " + current);
      isFirst = false;
      current = char;
      currentBytes = charBytes;
    } else {
      current += char;
      currentBytes += charBytes;
    }
  }

  if (current.length > 0) {
    chunks.push(isFirst ? current : " " + current);
  }

  return chunks.join("\r\n");
}

/**
 * Format a calendar date & time into local format YYYYMMDDTHHMMSS
 */
export function formatIcsDateTime(dateISO: string, timeHHmm: string): string {
  const [y, m, d] = dateISO.split("-");
  const [h, min] = timeHHmm.split(":");
  const year = y ?? "2026";
  const month = (m ?? "01").padStart(2, "0");
  const day = (d ?? "01").padStart(2, "0");
  const hour = (h ?? "00").padStart(2, "0");
  const minute = (min ?? "00").padStart(2, "0");
  return `${year}${month}${day}T${hour}${minute}00`;
}

/**
 * Adds minutes to an HH:mm string with modulo-1440 wraparound
 */
export function addMinutesToHHmm(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = ((h ?? 0) * 60 + (m ?? 0) + minutes) % 1440;
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

/**
 * Generates an RFC-5545 compliant .ics calendar file.
 */
export function generateIcs(
  events: AnyCalendarEvent[],
  options: IcsGeneratorOptions = {}
): string {
  const prodId = options.prodId || "-//ChronosCampus//Notice Decoder PS-02//EN";
  const domain = options.domain || "chronoscampus.edu";
  const timeZone = options.timeZone || "Asia/Kolkata";
  const testReminderMins = options.testReminderMins ?? 30;
  const deadlineReminderHours = options.deadlineReminderHours ?? 2;

  // Compute or use provided DTSTAMP (UTC format YYYYMMDDTHHMMSSZ)
  const dtstamp =
    options.dtstamp ||
    new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  // Build VEVENT for each event that has a date and start time
  const vevents = events
    .filter((e) => Boolean(e.dateISO && e.startTime))
    .map((e) =>
      buildVevent(e, {
        domain,
        timeZone,
        dtstamp,
        testReminderMins,
        deadlineReminderHours,
        clashes: options.clashes,
        recommendations: options.recommendations,
        useSimpleIdUid: options.useSimpleIdUid,
      })
    );

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${prodId}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...vevents,
    "END:VCALENDAR",
  ];

  // Return strictly CRLF separated lines
  return lines.join("\r\n") + "\r\n";
}

/**
 * Constructs a single VEVENT block with strict RFC-5545 compliance.
 */
function buildVevent(
  event: AnyCalendarEvent,
  opts: {
    domain: string;
    timeZone: string;
    dtstamp: string;
    testReminderMins: number;
    deadlineReminderHours: number;
    clashes?: PairwiseClashResult[];
    recommendations?: ActionRecommendation[];
    useSimpleIdUid?: boolean;
  }
): string {
  const isDeadline = event.type === "Deadline";

  // 1. Deterministic UID
  let uid: string;
  if (opts.useSimpleIdUid) {
    uid = `${event.id}@${opts.domain}`;
  } else {
    const rawSeed = `${event.id}_${event.title}_${event.dateISO}_${event.startTime}_${event.type}`;
    const hash = generateDeterministicHash(rawSeed);
    uid = `${hash}@${opts.domain}`;
  }

  // 2. DTSTART & DTEND calculation
  let dtstartStr: string;
  let dtendStr: string;

  if (isDeadline) {
    // For a Deadline at 12:00 PM:
    // DTSTART = 12:00 PM
    // DTEND = 12:15 PM (15-minute slot ensures visibility in Google/Apple/Outlook)
    dtstartStr = formatIcsDateTime(event.dateISO, event.startTime);
    const endTime15 = addMinutesToHHmm(event.startTime, 15);
    dtendStr = formatIcsDateTime(event.dateISO, endTime15);
  } else {
    dtstartStr = formatIcsDateTime(event.dateISO, event.startTime);
    const endHhmm = event.endTime || event.startTime;
    dtendStr = formatIcsDateTime(event.dateISO, endHhmm);
  }

  // 3. SUMMARY: Prefix [DEADLINE] if applicable
  const rawTitle = event.title || "Academic Event";
  const displaySummary = isDeadline
    ? rawTitle.startsWith("[DEADLINE]")
      ? rawTitle
      : `[DEADLINE] ${rawTitle}`
    : rawTitle;
  const escapedSummary = escapeIcsText(displaySummary);

  // 4. LOCATION
  const venue =
    "venue" in event && event.venue && event.venue !== "TBD" ? event.venue : "";
  const escapedLocation = venue ? escapeIcsText(venue) : "";

  // 5. CATEGORIES
  const categoryType = event.type.toUpperCase();
  const categories = `ACADEMIC,${categoryType}`;

  // 6. DESCRIPTION with rich notice provenance, clash warnings, and recommendations
  const description = buildRichDescription(event, opts.clashes, opts.recommendations);
  const escapedDescription = escapeIcsText(description);

  // 7. VALARM configuration
  // - 30 minutes prior for Tests and Lectures (-PT30M)
  // - 2 hours prior for Deadlines (-PT2H)
  const alarmTrigger = isDeadline
    ? `-PT${opts.deadlineReminderHours}H`
    : `-PT${opts.testReminderMins}M`;

  const alarmSummary = isDeadline
    ? `Deadline approaching: ${event.title}`
    : `Upcoming session: ${event.title}`;

  // Build event lines
  const eventLines: string[] = [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${opts.dtstamp}`,
    `DTSTART;TZID=${opts.timeZone}:${dtstartStr}`,
    `DTEND;TZID=${opts.timeZone}:${dtendStr}`,
    foldIcsLine(`SUMMARY:${escapedSummary}`),
  ];

  if (escapedLocation) {
    eventLines.push(foldIcsLine(`LOCATION:${escapedLocation}`));
  }

  eventLines.push(
    `CATEGORIES:${categories}`,
    "STATUS:CONFIRMED",
    foldIcsLine(`DESCRIPTION:${escapedDescription}`),
    "BEGIN:VALARM",
    `ACTION:DISPLAY`,
    foldIcsLine(`DESCRIPTION:${escapeIcsText(alarmSummary)}`),
    `TRIGGER:${alarmTrigger}`,
    "END:VALARM",
    "END:VEVENT"
  );

  return eventLines.join("\r\n");
}

/**
 * Builds rich description notes including:
 * - Notice sentence source
 * - Target student cohort
 * - Active conflict warnings (if any)
 * - Recommended resolution actions
 * - System verification provenance
 */
export function buildRichDescription(
  event: AnyCalendarEvent,
  clashes?: PairwiseClashResult[],
  recommendations?: ActionRecommendation[]
): string {
  const parts: string[] = [];

  // Title header
  parts.push(`=== ${event.title} ===`);

  // Target cohort
  const cohort =
    ("cohort" in event && event.cohort) ||
    ("audience" in event && event.audience) ||
    "All Students";
  parts.push(`Target Cohort: ${cohort}`);

  // Provenance / source sentence
  let sourceSentence = "";
  if ("sourceSpan" in event && event.sourceSpan && "rawSentence" in event.sourceSpan) {
    sourceSentence = event.sourceSpan.rawSentence;
  } else if ("rawSource" in event && event.rawSource) {
    sourceSentence = event.rawSource;
  }

  if (sourceSentence) {
    parts.push(`Notice Source: "${sourceSentence.trim()}"`);
  }

  // Active pairwise clash warnings
  if (clashes && clashes.length > 0) {
    const relevantClashes = clashes.filter(
      (c) => c.hasClash && (c.eventA === event.id || c.eventB === event.id)
    );

    if (relevantClashes.length > 0) {
      parts.push("");
      parts.push("⚠️ ACTIVE CONFLICT DETECTED:");
      for (const clash of relevantClashes) {
        parts.push(`• [${clash.clashType}] ${clash.explanation}`);
      }
    }
  }

  // Action recommendations
  if (recommendations && recommendations.length > 0) {
    const relevantRecs = recommendations.filter(
      (r) => r.relatedEventIds && r.relatedEventIds.includes(event.id)
    );

    if (relevantRecs.length > 0) {
      parts.push("");
      parts.push("Recommended Action:");
      for (const rec of relevantRecs) {
        parts.push(`• [${rec.priority}] ${rec.title}: ${rec.description}`);
      }
    }
  }

  parts.push("");
  parts.push("Generated by ChronosCampus • Notice Decoder PS-02 (Deterministic Offline Engine)");

  return parts.join("\n");
}

/**
 * Diagnostic & syntax validator for RFC-5545 iCalendar files.
 * Checks for CRLF line endings, 75-octet folding limits, required headers,
 * and valid VEVENT structure.
 */
export function validateIcsSyntax(icsText: string): {
  valid: boolean;
  errors: string[];
  stats: {
    eventCount: number;
    foldedLines: number;
    hasCrlf: boolean;
    maxOctets: number;
  };
} {
  const errors: string[] = [];

  // Check CRLF
  const hasCrlf = icsText.includes("\r\n");
  if (!hasCrlf) {
    errors.push("Missing CRLF (\\r\\n) line endings; standard Unix newlines detected.");
  }

  // Split on CRLF
  const lines = icsText.split("\r\n");
  if (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop(); // Trailing empty line from terminating CRLF
  }

  // Verify VCALENDAR envelope
  if (lines[0] !== "BEGIN:VCALENDAR") {
    errors.push(`First line must be BEGIN:VCALENDAR, found: "${lines[0]}"`);
  }

  const lastLine = lines[lines.length - 1];
  if (lastLine !== "END:VCALENDAR") {
    errors.push(`Last line must be END:VCALENDAR, found: "${lastLine}"`);
  }

  if (!lines.some((l) => l.startsWith("VERSION:2.0"))) {
    errors.push("Missing required VERSION:2.0 line");
  }

  if (!lines.some((l) => l.startsWith("PRODID:"))) {
    errors.push("Missing required PRODID line");
  }

  let eventCount = 0;
  let foldedLines = 0;
  let maxOctets = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const byteLen = typeof Buffer !== "undefined"
      ? Buffer.byteLength(line, "utf8")
      : new TextEncoder().encode(line).length;

    if (byteLen > maxOctets) {
      maxOctets = byteLen;
    }

    if (byteLen > 75) {
      errors.push(`Line ${i + 1} exceeds 75 octets (${byteLen} bytes): "${line.slice(0, 40)}..."`);
    }

    if (line.startsWith(" ")) {
      foldedLines++;
    }

    if (line === "BEGIN:VEVENT") {
      eventCount++;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    stats: {
      eventCount,
      foldedLines,
      hasCrlf,
      maxOctets,
    },
  };
}
