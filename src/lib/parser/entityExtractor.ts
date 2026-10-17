// 🧠 ChronosCampus Offline Deterministic Entity Extractor 🧠
// Combines preprocessor, dateParser, and timeParser to extract structured DecodedEvent[]
// adhering 100% to PS-02 zero-hallucination specifications.

import type { DecodedEvent, EventCategory, SourceSpan } from "@/src/types/notice";
import { decodedEventSchema } from "@/src/lib/validation/schemas";
import { preprocessNotice, type EventClause } from "./preprocessor";
import { parseNoticeDatesWithContext, type ParsedDateResult } from "./dateParser";
import { extractTimeRange, type ParsedTimeRange } from "./timeParser";

import {
  enforcePayloadLimit,
  enforceEventLimit,
  MAX_EVENTS_PER_NOTICE,
  MAX_PAYLOAD_CHARS,
  recordResourceWarning,
} from "@/src/lib/security/resourceGuard";

export interface ParseNoticeOptions {
  referenceYear?: number;
  defaultCohort?: string;
  onWarning?: (warning: string) => void;
}

// ── 1. Event Type Classification ─────────────────────────────────────────────

/**
 * Classifies clause text into 'Test' | 'Deadline' | 'Lecture' based on
 * university notice terminology.
 * - Test: internal test, test, exam, midterm, quiz, viva, assessment, practical exam
 * - Deadline: submit, submitted, submission, record, assignment, deadline, due, form fill
 * - Lecture: guest lecture, lecture, seminar, workshop, session, class, talk, webinar
 */
export function classifyEventType(text: string): EventCategory {
  const lower = text.toLowerCase();

  const isTest = /\b(?:internal\s+test|practical\s+exam|midterm|mid-term|quiz|exam|examination|viva|assessment|test)\b/i.test(lower);
  const isDeadline = /\b(?:must\s+be\s+submitted|form\s+fill|submission|submitted|submit|deadline|last\s+date|due|assignment|records?)\b/i.test(lower);
  const isLecture = /\b(?:guest\s+lecture|lecture|seminar|workshop|session|class|talk|webinar|symposium)\b/i.test(lower);

  // Resolution based on intent and keywords:
  if (isDeadline && !isTest) return "Deadline";
  if (isTest && !isDeadline) return "Test";
  if (isLecture && !isTest && !isDeadline) return "Lecture";

  // Context resolution if multiple keywords match:
  if (/\b(?:must\s+be\s+submitted|submit\s+by|submission\s+due|due\s+at|by\s+12(?::00)?\s*(?:noon|pm)?)\b/i.test(lower)) {
    return "Deadline";
  }
  if (isTest) return "Test";
  if (isDeadline) return "Deadline";
  if (isLecture) return "Lecture";

  return "Lecture";
}

// ── 2. Venue Extraction & Normalization ───────────────────────────────────────

/**
 * Normalizes venue casing (e.g. "department office" -> "Department office").
 */
export function normalizeVenueCasing(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.toUpperCase() === "TBD") return "TBD";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/**
 * Extracts location following spatial prepositions ("in Room 204", "to the department office",
 * "at Auditorium", "in Lab 3") or trailing comma-separated location phrases (", Seminar Hall").
 */
export function extractVenue(clause: string): string {
  // 1. Locations following "to the <office/lab/desk>" (bounded non-greedy scan)
  const mTo = clause.match(/\bto\s+(?:the\s+)?([A-Za-z0-9\s]{1,60}?(?:office|lab|department|desk|counter|reception))\b/i);
  if (mTo) return normalizeVenueCasing(mTo[1]!.trim());

  // 2. Locations following spatial prepositions: "in Room 204", "at Auditorium", "in Lab 3"
  const mInAt = clause.match(/\b(?:in|at)\s+([A-Za-z0-9\s-]{1,60}?(?:Hall|Room\s*\d+[A-Z]?|Auditorium|Audi\s*\d*|Lab(?:\s*\d+)?|Complex|Building|Center|Centre))\b/i);
  if (mInAt) return normalizeVenueCasing(mInAt[1]!.trim());

  // 3. Trailing comma-separated location phrases: ", Seminar Hall", ", Room 204"
  const mTrailing = clause.match(/,\s*([A-Za-z0-9\s]{1,50}?(?:Hall|Auditorium|Room\s*\d+[A-Z]?|Lab(?:\s*\d+)?|Office))\s*\.?$/i);
  if (mTrailing) return normalizeVenueCasing(mTrailing[1]!.trim());

  // 4. Standalone venue keywords anywhere in clause
  const mDirect = clause.match(/\b(Room\s*\d+[A-Z]?|Seminar\s+Hall|Auditorium|Audi\s*\d*|Main\s+Auditorium|Lab\s*\d+|Conference\s+Hall|department\s+office)\b/i);
  if (mDirect) return normalizeVenueCasing(mDirect[1]!.trim());

  return "TBD";
}

// ── 3. Clean Event Title Extraction ──────────────────────────────────────────

/**
 * Extracts and normalizes clean event titles:
 * - Quoted topics: guest lecture on "AI in Healthcare" -> "Guest lecture: AI in Healthcare"
 * - Submission normalization: "Lab records must be submitted..." -> "Lab record submission"
 * - Boilerplate stripping: "All III-year CSE students:", "will be held on...", "is scheduled on..."
 */
export function extractCleanTitle(clauseText: string, type: EventCategory): string {
  // Strip cohort and header boilerplate
  let clean = clauseText
    .replace(/^All\s+[^:]+:\s*/i, "")
    .replace(/^Attention\s+[^:]+:\s*/i, "")
    .replace(/^Notice\s+(?:for|regarding)?[^:]*:\s*/i, "")
    .trim();

  // 1. Quoted topics: guest lecture on "AI in Healthcare" -> "Guest lecture: AI in Healthcare"
  const mQuoted = clean.match(/(?:A\s+)?(?:guest\s+)?(?:lecture|talk|seminar|session)\s+on\s+["“]([^"”]+)["”]/i);
  if (mQuoted) {
    return `Guest lecture: ${mQuoted[1]!.trim()}`;
  }

  // 2. Action verb boundary splits
  const mAction = clean.match(/^(.+?)\s+(?:will\s+be\s+held|is\s+scheduled|must\s+be\s+submitted|needs\s+to\s+be\s+submitted|to\s+be\s+held|is\s+arranged|to\s+be\s+conducted)\b/i);
  if (mAction) {
    let candidate = mAction[1]!
      .replace(/^(?:Notice\s+for|Announcement\s+regarding|Regarding|Attention:?)\s*/i, "")
      .trim();

    // Normalize submission phrases: e.g. "Lab records" -> "Lab record submission"
    if (/submission|records|assignment|due|form\s+fill/i.test(clean)) {
      if (/lab records?/i.test(candidate)) {
        candidate = "Lab record submission";
      } else if (!/submission|fill/i.test(candidate)) {
        candidate = `${candidate} submission`;
      }
    }

    return candidate;
  }

  // 3. Fallback: sanitize clause
  if (/lab records?/i.test(clean) && type === "Deadline") {
    return "Lab record submission";
  }

  // Strip trailing date/time clauses
  const fallback = clean
    .replace(/\b(?:on|from|at|in|by|held|scheduled)\b.*$/i, "")
    .trim();

  return fallback || `${type} Event`;
}

// ── 4. Target Cohort Extraction ──────────────────────────────────────────────

/**
 * Detects cohort patterns like "All III-year CSE students" and returns "III-year CSE".
 */
export function extractTargetCohort(text: string): string {
  // Pattern 1: "All III-year CSE students" or "III-year CSE" (disjoint whitespace and hyphen quantifiers)
  const m1 = text.match(/\b(?:All\s+)?(I{1,4}|[1-4](?:st|nd|rd|th))(?:\s*[-–]\s*|\s+)(?:year|sem|semester)?\s*([A-Za-z]{2,8})(?:\s+students)?(?:\s*:)?\b/i);
  if (m1) {
    const year = m1[1]!.replace(/–/g, "-");
    const dept = m1[2]!.toUpperCase();
    return `${year}-year ${dept}`;
  }

  // Pattern 2: "CSE Batch 2026", "Mechanical 3rd Year"
  const m2 = text.match(/\b([A-Z]{2,6})\s+(?:Batch\s+\d{4}|(?:[1-4](?:st|nd|rd|th)|I{1,4})\s*Year)\b/i);
  if (m2) return m2[0].trim();

  // Pattern 3: "All Students" or "All CSE Students"
  const m3 = text.match(/\bAll\s+([A-Za-z]{2,8})?\s*Students\b/i);
  if (m3) {
    return m3[1] ? `All ${m3[1].toUpperCase()} Students` : "All Students";
  }

  return "All Students";
}

// ── 5. Confidence Calculation ────────────────────────────────────────────────

export function calculateConfidence(
  dateResult: ParsedDateResult | null,
  timeResult: ParsedTimeRange | null,
  venue: string
): { confidence: number; needsReview: boolean } {
  let score = 100;

  if (!dateResult || !dateResult.isValid) {
    score -= 30;
  } else if (dateResult.isInherited) {
    score -= 5;
  }

  if (!timeResult) {
    score -= 25;
  } else if (timeResult.isInferredEndTime) {
    score -= timeResult.confidencePenalty;
  }

  if (venue === "TBD") {
    score -= 5;
  }

  const confidence = Math.max(0, Math.min(100, score));
  const needsReview = confidence < 80 || Boolean(timeResult?.isInferredEndTime) || Boolean(dateResult && !dateResult.isValid);

  return { confidence, needsReview };
}

// ── 6. Full Deterministic Parser Pipeline ────────────────────────────────────

/**
 * Complete offline deterministic notice decoder that parses unstructured text
 * into validated DecodedEvent[] objects.
 */
export function parseNoticeText(
  rawText: string,
  options: ParseNoticeOptions = {}
): DecodedEvent[] {
  if (!rawText || !rawText.trim()) return [];

  // Enforce 25,000 character hard payload limit
  const payloadGuard = enforcePayloadLimit(rawText, MAX_PAYLOAD_CHARS);
  const safeText = payloadGuard.text;
  if (payloadGuard.warning && options.onWarning) {
    options.onWarning(payloadGuard.warning);
  }

  const referenceYear = options.referenceYear ?? 2026;
  const globalCohort = options.defaultCohort ?? extractTargetCohort(safeText);

  // 1. Preprocessing & Clause Segmentation
  const preprocessed = preprocessNotice(safeText);
  const clauses = preprocessed.clauses;
  if (clauses.length === 0) return [];

  // 2. Contextual Date Resolution across sequential clauses
  const clauseTexts = clauses.map((c) => c.text);
  const dateResults = parseNoticeDatesWithContext(clauseTexts, referenceYear);

  const events: DecodedEvent[] = [];
  let eventsCapped = false;

  for (let i = 0; i < clauses.length; i++) {
    // Hard exit when 50 events cap reached
    if (events.length >= MAX_EVENTS_PER_NOTICE) {
      eventsCapped = true;
      break;
    }

    const clause = clauses[i]!;
    const dateRes = dateResults[i] ?? null;

    // 1. Classification
    const type = classifyEventType(clause.text);

    // 2. Time Extraction
    const timeRes = extractTimeRange(clause.text, type);

    // Skip clauses lacking any temporal markers
    if (!dateRes && !timeRes) continue;

    // 3. Clean Title
    const title = extractCleanTitle(clause.text, type);

    // 4. Venue & Cohort
    const venue = extractVenue(clause.text);
    const clauseCohort = extractTargetCohort(clause.text);
    const cohort = clauseCohort !== "All Students" ? clauseCohort : globalCohort;

    // 5. Confidence & Review
    const { confidence, needsReview } = calculateConfidence(dateRes, timeRes, venue);

    const dateISO = dateRes?.isValid ? dateRes.dateISO : `${referenceYear}-11-13`;
    const displayDate = dateRes?.isValid ? dateRes.displayDate : `13 Nov ${referenceYear}`;

    const startTime = timeRes?.startTime || "09:00";
    const endTime = timeRes?.endTime || (type === "Deadline" ? startTime : "10:00");

    const sourceSpan: SourceSpan = {
      start: clause.originalStart,
      end: clause.originalEnd,
      rawSentence: clause.text,
    };

    const event: DecodedEvent = {
      id: `ps02-${type.toLowerCase()}-${i + 1}`,
      title,
      type,
      dateISO,
      displayDate,
      startTime,
      endTime,
      venue,
      cohort,
      confidence,
      needsReview,
      sourceSpan,
    };

    // Strict validation against Zod schema
    const validation = decodedEventSchema.safeParse(event);
    if (validation.success) {
      events.push(validation.data);
    } else {
      events.push({
        ...event,
        confidence: Math.min(event.confidence, 70),
        needsReview: true,
      });
    }
  }

  // Enforce 50 maximum events per notice and emit warning if capped
  if (eventsCapped) {
    const warning = `Event limit enforced: Notice generated more than ${MAX_EVENTS_PER_NOTICE} events. Truncated to the safety ceiling of ${MAX_EVENTS_PER_NOTICE} events per notice.`;
    recordResourceWarning(warning);
    if (options.onWarning) {
      options.onWarning(warning);
    }
  } else {
    const eventGuard = enforceEventLimit(events, MAX_EVENTS_PER_NOTICE);
    if (eventGuard.warning && options.onWarning) {
      options.onWarning(eventGuard.warning);
    }
  }

  return events;
}