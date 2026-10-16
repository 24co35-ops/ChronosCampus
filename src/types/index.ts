// ─── Domain contracts for NoticeDecoder (PS-02) ───────────────────────────

export type EventType = "Test" | "Deadline" | "Lecture" | "Other";

export type FieldStatus =
  | "matched"
  | "inferred"
  | "needs-review"
  | "missing"
  | "user-confirmed";

export interface SourceSpan {
  start: number;
  end: number;
}

export interface FieldStatuses {
  title: FieldStatus;
  type: FieldStatus;
  date: FieldStatus;
  startTime: FieldStatus;
  endTime: FieldStatus;
  venue: FieldStatus;
  audience: FieldStatus;
}

/** Mutable draft before user review */
export interface DraftEvent {
  id: string;
  title: string;
  type: EventType;
  dateISO: string; // YYYY-MM-DD or "" when missing
  startTime: string; // HH:mm or ""
  endTime: string; // HH:mm or ""
  venue: string | null;
  audience: string | null;
  timeZone: string;
  rawSource: string;
  sourceSpans: SourceSpan[];
  fieldStatus: FieldStatuses;
  confirmed: boolean;
}

/** After user has reviewed; structurally identical but semantically distinct */
export type ReviewedEvent = DraftEvent;

// ─── Clash engine types ────────────────────────────────────────────────────

export type ClashKind =
  | "overlap"         // Two ranged events share a time window
  | "containment"     // Deadline point falls inside a ranged event
  | "deadline-collision" // Two deadlines at the same instant
  | "none";

export interface ClashResult {
  eventA: string; // id
  eventB: string; // id
  kind: ClashKind;
  overlapStart: string | null; // HH:mm
  overlapEnd: string | null;   // HH:mm
  overlapMins: number;
  explanation: string;
}

export interface BusyWindow {
  start: string; // HH:mm
  end: string;   // HH:mm
  eventIds: string[];
}

export interface DeadlineFeasibility {
  deadlineId: string;
  busyWindow: BusyWindow | null;
  isAtRisk: boolean;
  recommendation: string;
}

export interface Recommendation {
  priority: "high" | "medium" | "low";
  title: string;
  detail: string;
  draftMessage: string | null;
  relatedEventIds: string[];
}

// ─── Parser types ──────────────────────────────────────────────────────────

export interface ParseContext {
  referenceYear: number;
  timeZone: string;
  locale: "IN"; // DD/MM/YYYY for Indian locale
}

export interface ValidationIssue {
  field: keyof FieldStatuses;
  message: string;
  severity: "error" | "warning";
}

// ─── ICS export types ──────────────────────────────────────────────────────

export interface IcsOptions {
  reminderMinsTest: number;    // default 30
  reminderHrsDeadline: number; // default 12
}
