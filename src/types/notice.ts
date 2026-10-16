// ─── Domain contracts for Notice Decoder (PS-02) ───────────────────────────

/** 1. Categorization for decoded events */
export type EventCategory = "Test" | "Deadline" | "Lecture";

/** Source text character offset and sentence evidence */
export interface SourceSpan {
  start: number;
  end: number;
  rawSentence: string;
}

/**
 * 2. Decoded academic event contract.
 * Represents an event extracted from university notices with full provenance.
 */
export interface DecodedEvent {
  /** UUID or deterministic slug (e.g., "test-2026-11-13-1000") */
  id: string;
  /** Sanitized title, 1-200 characters */
  title: string;
  /** Categorized event type */
  type: EventCategory;
  /** Real calendar date in YYYY-MM-DD format (leap-year validated) */
  dateISO: string;
  /** Human-formatted display date (e.g. "13 Nov 2026") */
  displayDate: string;
  /** 24-hour format HH:mm (00:00 to 23:59) */
  startTime: string;
  /** 24-hour format HH:mm; for Deadline, endTime === startTime */
  endTime: string;
  /** Venue/location (default: "TBD") */
  venue: string;
  /** Target audience/cohort (e.g. "III-year CSE", default: "All Students") */
  cohort: string;
  /** Confidence score between 0 and 100 */
  confidence: number;
  /** Flagged if confidence < 80 or fields are inferred/ambiguous */
  needsReview: boolean;
  /** Traceable character offsets in original raw document */
  sourceSpan: SourceSpan;
}

/** 3. Clash taxonomy */
export type ClashType =
  | "HARD_OVERLAP"
  | "DEADLINE_CONTAINMENT"
  | "TRANSIT_RISK"
  | "NO_CLASH";

export type ClashSeverity = "CRITICAL" | "WARNING" | "SAFE";

export interface OverlapWindow {
  start: string;
  end: string;
}

/**
 * Pairwise interval collision audit result.
 */
export interface PairwiseClashResult {
  id: string;
  eventA: string;
  eventB: string;
  hasClash: boolean;
  clashType: ClashType;
  overlapMinutes: number;
  overlapWindow: OverlapWindow | string | null;
  explanation: string;
  severity: ClashSeverity;
}

/**
 * 4. Compound contiguous busy block merged via sweep-line solver.
 */
export interface CompoundBusyBlock {
  dateISO: string;
  mergedStart: string;
  mergedEnd: string;
  events: DecodedEvent[];
  trappedDeadlines: DecodedEvent[];
}

/**
 * 5. Application view modes for multi-role workflows.
 */
export type ViewMode = "STUDENT" | "B2B_ADMIN" | "RED_TEAM_LAB";

/**
 * 6. Actionable recommendations generated from conflict analysis.
 */
export interface ActionRecommendation {
  id: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  title: string;
  description: string;
  actionType: "RESCHEDULE_EVENT" | "SHIFT_DEADLINE" | "TRANSIT_BUFFER" | "NOTIFY_FACULTY" | "SPLIT_COHORT";
  relatedEventIds: string[];
  suggestedPatch?: {
    eventId: string;
    patch: Partial<DecodedEvent>;
  };
  draftEmail?: {
    recipient: string;
    subject: string;
    body: string;
  };
}
