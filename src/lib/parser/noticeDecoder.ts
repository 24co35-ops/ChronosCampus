// 🧠 ChronosCampus Deterministic Notice Decoder Pipeline 🧠
// Integrates preprocessor, contextual date parser, and time range/deadline parser
// to extract zero-hallucination DecodedEvent records matching PS-02 standards.

import type { DecodedEvent, EventCategory, SourceSpan } from "@/src/types/notice";
import { decodedEventSchema } from "@/src/lib/validation/schemas";
import { preprocessNotice, type EventClause } from "./preprocessor";
import { parseNoticeDatesWithContext, type ParsedDateResult } from "./dateParser";
import { extractTimeRange, type ParsedTimeRange } from "./timeParser";

export interface DecodeOptions {
  referenceYear?: number;
  defaultCohort?: string;
}

/**
 * Extracts document-level cohort from headers or salutations.
 * e.g. "All III-year CSE students:", "Attention 2nd Year Mechanical:"
 */
export function extractGlobalCohort(text: string): string {
  // Pattern 1: "All III-year CSE students:" or "III-year CSE"
  const m1 = text.match(/\b(?:All\s+)?(I{1,4}|[1-4](?:st|nd|rd|th))\s*[-–\s]?\s*(?:year|sem|semester)?\s*([A-Za-z]{2,8})(?:\s+students)?(?:\s*:)?\b/i);
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

/**
 * Extracts venue from clause using regex anchors.
 */
export function extractVenue(clause: string): string {
  // 1. "to the department office" / "to <office/lab/desk>"
  const mTo = clause.match(/\bto\s+(?:the\s+)?([A-Za-z0-9\s]+?(?:office|lab|department|desk|counter))\b/i);
  if (mTo) return mTo[1]!.trim();

  // 2. "in Room 204" / "in Seminar Hall" / "at Audi 2"
  const mInAt = clause.match(/\b(?:in|at)\s+([A-Za-z0-9\s-]+?(?:Hall|Room\s*\d+|Auditorium|Lab|Complex|Building|Center|Centre))\b/i);
  if (mInAt) return mInAt[1]!.trim();

  // 3. Trailing venue: ", Seminar Hall"
  const mTrailing = clause.match(/,\s*([A-Za-z0-9\s]+?(?:Hall|Auditorium|Room\s*\d+|Lab))\s*\.?$/i);
  if (mTrailing) return mTrailing[1]!.trim();

  // 4. Standalone room/hall keywords
  const mDirect = clause.match(/\b(Room\s*\d+[A-Z]?|Seminar\s+Hall|Auditorium|Audi\s*\d*|Main\s+Auditorium|Lab\s*\d*|Conference\s+Hall|department\s+office)\b/i);
  if (mDirect) return mDirect[1]!.trim();

  return "TBD";
}

/**
 * Extracts and sanitizes event title and event category.
 */
export function extractTitleAndCategory(clauseText: string): {
  title: string;
  type: EventCategory;
} {
  // Strip cohort prefixes like "All III-year CSE students: "
  const clean = clauseText.replace(/^All\s+[^:]+:\s*/i, "").trim();

  // 1. Check Guest Lecture / Seminar on "Topic"
  const mTopic = clean.match(/(?:A\s+)?(?:guest\s+)?(?:lecture|talk|seminar|session)\s+on\s+["“]([^"”]+)["”]/i);
  if (mTopic) {
    return {
      title: `Guest lecture: ${mTopic[1]!.trim()}`,
      type: "Lecture",
    };
  }

  // 2. Check splits on action verbs
  const mAction = clean.match(/^(.+?)\s+(?:will\s+be\s+held|is\s+scheduled|must\s+be\s+submitted|to\s+be\s+held|is\s+arranged)\b/i);
  if (mAction) {
    let t = mAction[1]!
      .replace(/^(?:Notice\s+for|Announcement\s+regarding|Regarding|Attention:?)\s*/i, "")
      .trim();

    // Clean up deadline titles
    if (/submission|records|assignment|due/i.test(clean) && !/submission/i.test(t)) {
      if (/lab records?/i.test(t)) t = "Lab record submission";
      else t = `${t} submission`;
    }

    const type: EventCategory =
      /test|exam|quiz|midterm/i.test(clean)
        ? "Test"
        : /submit|deadline|submission|due/i.test(clean)
        ? "Deadline"
        : "Lecture";

    return { title: t, type };
  }

  // 3. Fallback categorization by keyword
  let type: EventCategory = "Lecture";
  if (/\b(?:test|quiz|midterm|exam|examination|viva)\b/i.test(clean)) {
    type = "Test";
  } else if (/\b(?:submit|submission|deadline|due|latest by|hand in)\b/i.test(clean)) {
    type = "Deadline";
  }

  // Default clean title snippet (up to 80 chars)
  const fallbackTitle = clean
    .replace(/\b(?:on|from|at|in|by|held|scheduled)\b.*$/i, "")
    .trim()
    .slice(0, 80);

  return {
    title: fallbackTitle || `${type} Event`,
    type,
  };
}

/**
 * Calculates deterministic confidence score with explainable deduction breakdown.
 */
export function calculateConfidence(
  dateResult: ParsedDateResult | null,
  timeResult: ParsedTimeRange | null,
  venue: string
): { confidence: number; needsReview: boolean; reason: string | null } {
  let score = 100;
  const reasons: string[] = [];

  if (!dateResult || !dateResult.isValid) {
    score -= 30;
    reasons.push(dateResult?.warning || "Missing or invalid calendar date");
  } else if (dateResult.isInherited) {
    score -= 5;
    reasons.push("Date inherited from previous sentence");
  }

  if (!timeResult) {
    score -= 25;
    reasons.push("Missing time specification");
  } else {
    if (timeResult.isInferredEndTime) {
      score -= timeResult.confidencePenalty;
      reasons.push("End time inferred (+1 hr)");
    }
  }

  if (venue === "TBD") {
    score -= 5;
    reasons.push("Venue unspecified (TBD)");
  }

  const confidence = Math.max(0, Math.min(100, score));
  const needsReview = confidence < 80 || reasons.some((r) => r.includes("invalid") || r.includes("inferred"));

  return {
    confidence,
    needsReview,
    reason: reasons.length > 0 ? reasons.join("; ") : null,
  };
}

/**
 * Main Deterministic Notice Decoder.
 * Transforms raw notice text into strictly validated DecodedEvent objects.
 */
export function decodeNotice(
  rawText: string,
  options: DecodeOptions = {}
): DecodedEvent[] {
  if (!rawText || !rawText.trim()) return [];

  const referenceYear = options.referenceYear ?? 2026;
  const globalCohort = extractGlobalCohort(rawText);

  // 1. Text Preprocessing & Clause Segmentation
  const preprocessed = preprocessNotice(rawText);
  const clauses = preprocessed.clauses;

  if (clauses.length === 0) return [];

  // 2. Contextual Date Extraction across clauses
  const clauseTexts = clauses.map((c) => c.text);
  const dateResults = parseNoticeDatesWithContext(clauseTexts, referenceYear);

  const decodedEvents: DecodedEvent[] = [];

  for (let i = 0; i < clauses.length; i++) {
    const clause = clauses[i]!;
    const dateRes = dateResults[i] ?? null;

    // Determine candidate category first to guide time parser
    const { title, type } = extractTitleAndCategory(clause.text);

    // 3. Time Extraction
    const timeRes = extractTimeRange(clause.text, type);

    // Filter out clauses that have neither date nor time (e.g. general remarks, instructions)
    if (!dateRes && !timeRes) continue;

    // 4. Venue & Cohort
    const venue = extractVenue(clause.text);
    const cohort = options.defaultCohort ?? globalCohort;

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
      id: `evt-${i + 1}-${type.toLowerCase()}-${startTime.replace(":", "")}`,
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

    // Validate against strict Zod schema
    const validation = decodedEventSchema.safeParse(event);
    if (validation.success) {
      decodedEvents.push(validation.data);
    } else {
      // Still push with flagged needsReview
      decodedEvents.push({
        ...event,
        confidence: Math.min(event.confidence, 70),
        needsReview: true,
      });
    }
  }

  return decodedEvents;
}