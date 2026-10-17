// ─── Deterministic Notice Parser ─────────────────────────────────────────
// Supports PS-02 date/time formats; no LLM involvement in time math.

import { preprocessNotice } from './preprocessor';
import { extractCleanTitle, extractVenue } from './entityExtractor';
import type { DraftEvent, EventType, FieldStatus, ParseContext } from "@/src/types";

// ── Hinglish / domain lexicon ─────────────────────────────────────────────

const EVENT_TYPE_KEYWORDS: Record<EventType, string[]> = {
  Test: ["test", "exam", "quiz", "assessment", "internal", "mid-term", "midterm", "ut"],
  Deadline: ["submission", "due", "submit", "deadline", "last date", "hand in", "hand-in"],
  Lecture: ["lecture", "guest", "talk", "seminar", "session", "class", "workshop"],
  Other: [],
};

// ── Date patterns (Indian locale DD/MM/YYYY) ──────────────────────────────

/** Named month: `13 Nov 2026` or `13 Nov` */
const RE_DATE_NAMED =
  /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*(\d{4})?\b/gi;

/** Slash date: `13/11/2026` — interpreted as DD/MM/YYYY */
const RE_DATE_SLASH = /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g;

/** Time: `2 PM`, `14:00`, `12:00 noon`, `12 noon`, `12 midnight` */
const RE_TIME =
  /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|noon|midnight)\b|\b(\d{2}):(\d{2})\b/gi;

/** Time range: `10:00-11:30` or `10:00 to 11:30` or `10 AM to 11:30 AM` */
const RE_TIME_RANGE =
  /\b(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:[-–]|to)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/gi;

const MONTH_MAP: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04",
  may: "05", jun: "06", jul: "07", aug: "08",
  sep: "09", oct: "10", nov: "11", dec: "12",
};

// ── Normalization helpers ─────────────────────────────────────────────────

export function normalizeTime(raw: string): string | null {
  const s = raw.trim().toLowerCase();
  if (s === "12:00 noon" || s === "12 noon" || s === "noon") return "12:00";
  if (s === "12 midnight" || s === "midnight" || s === "00:00") return "00:00";

  // HH:MM 24h
  const hhmm = s.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmm) {
    const h = parseInt(hhmm[1]!, 10);
    const m = parseInt(hhmm[2]!, 10);
    if (h > 23 || m > 59) return null;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  // 2 PM / 2:30 PM
  const ampm = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (ampm) {
    let h = parseInt(ampm[1]!, 10);
    const m = parseInt(ampm[2] ?? "0", 10);
    const period = ampm[3]!;
    if (period === "pm" && h !== 12) h += 12;
    if (period === "am" && h === 12) h = 0;
    if (h > 23 || m > 59) return null;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  return null;
}

export function normalizeNamedDate(
  day: string,
  month: string,
  year: string | undefined,
  ctx: ParseContext
): { dateISO: string; yearStatus: FieldStatus } {
  const mm = MONTH_MAP[month.toLowerCase().slice(0, 3)];
  if (!mm) return { dateISO: "", yearStatus: "missing" };
  const dd = String(parseInt(day, 10)).padStart(2, "0");
  if (year) {
    return { dateISO: `${year}-${mm}-${dd}`, yearStatus: "matched" };
  }
  // ponytail: use referenceYear when year absent; flag for user review
  return {
    dateISO: `${ctx.referenceYear}-${mm}-${dd}`,
    yearStatus: "needs-review",
  };
}

export function normalizeSlashDate(
  d: string,
  m: string,
  y: string
): string | null {
  const dd = parseInt(d, 10);
  const mm = parseInt(m, 10);
  const yyyy = parseInt(y, 10);
  if (dd < 1 || dd > 31 || mm < 1 || mm > 12) return null;
  return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

// ── Event type classifier ─────────────────────────────────────────────────

export function classifyEventType(text: string): EventType {
  const lower = text.toLowerCase();
  for (const [type, keywords] of Object.entries(EVENT_TYPE_KEYWORDS) as [EventType, string[]][]) {
    if (type === "Other") continue;
    if (keywords.some((kw) => lower.includes(kw))) return type;
  }
  return "Other";
}

// ── Main extractor ────────────────────────────────────────────────────────

let _idCounter = 0;
function nextId(): string {
  // ponytail: deterministic IDs for tests; crypto.randomUUID in browser at runtime
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `evt-${++_idCounter}`;
}

/**
 * Segment notice into candidate event blocks and extract DraftEvent records.
 * Deterministic: given the same text + context, returns the same result.
 */
export function extractDraftEvents(text: string, ctx: ParseContext): DraftEvent[] {
  const preprocessed = preprocessNotice(text);
  const lines = preprocessed.clauses.length > 0 ? preprocessed.clauses.map((c) => c.text) : preprocessed.normalizedText.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const events: DraftEvent[] = [];

  for (const line of lines) {
    // Skip clearly non-event lines (headers, salutations, etc.)
    if (/^(dear|to:|from:|re:|subject:|regards|sincerely)/i.test(line)) continue;

    const hasDate =
      RE_DATE_NAMED.test(line) ||
      RE_DATE_SLASH.test(line);
    const hasTime = RE_TIME.test(line) || RE_TIME_RANGE.test(line);

    // Reset regex lastIndex (stateful global regexes)
    RE_DATE_NAMED.lastIndex = 0;
    RE_DATE_SLASH.lastIndex = 0;
    RE_TIME.lastIndex = 0;
    RE_TIME_RANGE.lastIndex = 0;

    if (!hasDate && !hasTime) continue;

    const event = parseEventFromLine(line, ctx);
    if (event) events.push(event);
  }

  return events;
}

function parseEventFromLine(line: string, ctx: ParseContext): DraftEvent | null {
  // ── Date ──
  let dateISO = "";
  let dateStatus: FieldStatus = "missing";

  const namedMatch = [...line.matchAll(RE_DATE_NAMED)][0];
  RE_DATE_NAMED.lastIndex = 0;

  if (namedMatch) {
    const { dateISO: d, yearStatus } = normalizeNamedDate(
      namedMatch[1]!,
      namedMatch[2]!,
      namedMatch[3],
      ctx
    );
    dateISO = d;
    dateStatus = yearStatus;
  } else {
    const slashMatch = [...line.matchAll(RE_DATE_SLASH)][0];
    RE_DATE_SLASH.lastIndex = 0;
    if (slashMatch) {
      const d = normalizeSlashDate(slashMatch[1]!, slashMatch[2]!, slashMatch[3]!);
      if (d) { dateISO = d; dateStatus = "matched"; }
    }
  }

  // ── Times ──
  let startTime = "";
  let endTime = "";
  let startStatus: FieldStatus = "missing";
  let endStatus: FieldStatus = "missing";

  const rangeMatch = [...line.matchAll(RE_TIME_RANGE)][0];
  RE_TIME_RANGE.lastIndex = 0;

  if (rangeMatch) {
    const s = normalizeTime(rangeMatch[1]!);
    const e = normalizeTime(rangeMatch[2]!);
    if (s) { startTime = s; startStatus = "matched"; }
    if (e) { endTime = e; endStatus = "matched"; }
  } else {
    const times = [...line.matchAll(RE_TIME)];
    RE_TIME.lastIndex = 0;
    const first = times[0];
    if (first) {
      const t = normalizeTime(first[0]!);
      if (t) { startTime = t; startStatus = "matched"; }
    }
  }

  // ── Type & title ──
  const type = classifyEventType(line);
  const title = extractTitle(line, type);

  // ── Venue ──
  let venue: string | null = null;
  try {
    const v = extractVenue(line);
    if (v && v !== "TBD") venue = v;
  } catch {}
  if (!venue) {
    const venueMatch = line.match(/\b(?:in|at)\s+([A-Z][^,.]+?)(?:\.|,|$)/);
    venue = venueMatch?.[1]?.trim() ?? null;
  }
  const venueStatus: FieldStatus = venue ? "matched" : "missing";

  if (!dateISO && !startTime) return null;

  return {
    id: nextId(),
    title,
    type,
    dateISO,
    startTime,
    endTime,
    venue,
    audience: extractAudience(line),
    timeZone: ctx.timeZone,
    rawSource: line,
    sourceSpans: [],
    fieldStatus: {
      title: title ? "matched" : "missing",
      type: type !== "Other" ? "matched" : "needs-review",
      date: dateStatus,
      startTime: startStatus,
      endTime: endStatus,
      venue: venueStatus,
      audience: "inferred",
    },
    confirmed: false,
  };
}

function extractTitle(line: string, type: EventType): string {
  try {
    const clean = extractCleanTitle(line, (type === "Other" ? "Lecture" : type) as any);
    if (clean && clean !== `${type} Event`) return clean;
  } catch {}

  // Remove date/time tokens and trim to get a short title candidate
  const cleaned = line
    .replace(RE_DATE_NAMED, "")
    .replace(RE_DATE_SLASH, "")
    .replace(RE_TIME_RANGE, "")
    .replace(RE_TIME, "")
    .replace(/[.:,;]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  RE_DATE_NAMED.lastIndex = 0;
  RE_DATE_SLASH.lastIndex = 0;
  RE_TIME_RANGE.lastIndex = 0;
  RE_TIME.lastIndex = 0;

  return cleaned.slice(0, 120) || type;
}

function extractAudience(line: string): string | null {
  const m = line.match(/\b(I{1,3}[\s-]?year|[1-9](?:st|nd|rd|th)[\s-]?year|[A-Z]{2,5}\s*\d?\s*(?:students|batch)?)\b/i);
  return m?.[0]?.trim() ?? null;
}


// Re-export full modular parser subcomponents
export * from "./preprocessor";
export * from "./dateParser";
export * from "./timeParser";
export * from "./noticeDecoder";
export * from "./entityExtractor";
