// ─── Bulletproof Deterministic Date Parser ────────────────────────────────
// Zero-hallucination date extraction with full Indian locale (DD/MM/YYYY) support,
// leap-year calendar validation, and contextual inheritance.

export interface ParsedDateResult {
  dateISO: string; // YYYY-MM-DD or "" when invalid/unparseable
  displayDate: string; // e.g. "13 Nov 2026"
  year: number | null;
  month: number | null;
  day: number | null;
  isValid: boolean;
  isInherited: boolean;
  needsReview: boolean;
  warning: string | null;
  matchedText: string;
  span?: { start: number; end: number };
}

export interface DateParserContext {
  referenceYear?: number;
  previousDateISO?: string;
  previousDisplayDate?: string;
}

const MONTH_NAMES: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

const FULL_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// ── Calendar Validation Helpers ───────────────────────────────────────────

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function getDaysInMonth(year: number, month: number): number {
  if (month < 1 || month > 12) return 0;
  const days = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return days[month - 1]!;
}

export function validateCalendarDate(
  year: number,
  month: number,
  day: number
): { isValid: boolean; warning: string | null } {
  if (month < 1 || month > 12) {
    return { isValid: false, warning: `Invalid month: ${month} must be between 1 and 12.` };
  }

  const maxDays = getDaysInMonth(year, month);
  const monthName = FULL_MONTH_NAMES[month - 1]!;

  if (day < 1 || day > 31) {
    return { isValid: false, warning: `Invalid day: ${day} must be between 1 and 31.` };
  }

  if (day > maxDays) {
    if (month === 2) {
      const leapText = isLeapYear(year)
        ? `leap year ${year} has 29 days`
        : `${year} is not a leap year; February has only 28 days`;
      return {
        isValid: false,
        warning: `Invalid calendar date: ${leapText}, but day was ${day}.`,
      };
    }
    return {
      isValid: false,
      warning: `Invalid calendar date: ${monthName} has only ${maxDays} days, but day was ${day}.`,
    };
  }

  return { isValid: true, warning: null };
}

// ── Regex Extractors ───────────────────────────────────────────────────────

// 1. Contextual same day phrases
const RE_SAME_DAY = /\b(?:on\s+the\s+same\s+day|same\s+day|same\s+date)\b/i;

// 2. ISO Date: 2026-11-13
const RE_ISO = /\b(\d{4})-(0[1-9]|1[0-2])-([0-2]\d|3[01])\b/;

// 3. Day + Month Name + Optional Year:
// "13 Nov 2026", "13th November, 2026", "13 Nov", "13th Nov"
const RE_DAY_MONTH =
  /\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?(?:,?\s*(\d{4}|\d{2})(?!:))?\b/i;

// 4. Month Name + Day + Optional Year:
// "Nov 13, 2026", "November 13 2026", "Nov 13"
const RE_MONTH_DAY =
  /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}|\d{2})(?!:))?\b/i;

// 5. Slash / Dash / Dot formatted dates:
// "13/11/2026", "13-11-2026", "13.11.26" (interpreted as DD/MM/YYYY in Indian locale)
const RE_NUMERIC = /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4}|\d{2})\b/;

// ── Core Date Parser ───────────────────────────────────────────────────────

/**
 * Parses and validates dates from a string, resolving relative references
 * against prior sentence context.
 */
export function extractDateFromText(
  text: string,
  context: DateParserContext = {}
): ParsedDateResult | null {
  const refYear = context.referenceYear ?? 2026;

  // 1. Check for "on the same day" / "same date" contextual inheritance
  const sameDayMatch = text.match(RE_SAME_DAY);
  if (sameDayMatch && context.previousDateISO) {
    const [y, m, d] = context.previousDateISO.split("-").map(Number);
    return {
      dateISO: context.previousDateISO,
      displayDate: context.previousDisplayDate || formatDisplayDate(y!, m!, d!),
      year: y ?? refYear,
      month: m ?? 1,
      day: d ?? 1,
      isValid: true,
      isInherited: true,
      needsReview: false,
      warning: null,
      matchedText: sameDayMatch[0],
      span: {
        start: sameDayMatch.index ?? 0,
        end: (sameDayMatch.index ?? 0) + sameDayMatch[0].length,
      },
    };
  }

  // 2. Check standard ISO: YYYY-MM-DD
  const isoMatch = text.match(RE_ISO);
  if (isoMatch) {
    const y = parseInt(isoMatch[1]!, 10);
    const m = parseInt(isoMatch[2]!, 10);
    const d = parseInt(isoMatch[3]!, 10);
    const validation = validateCalendarDate(y, m, d);

    return {
      dateISO: validation.isValid ? formatIso(y, m, d) : "",
      displayDate: formatDisplayDate(y, m, d),
      year: y,
      month: m,
      day: d,
      isValid: validation.isValid,
      isInherited: false,
      needsReview: !validation.isValid,
      warning: validation.warning,
      matchedText: isoMatch[0],
      span: {
        start: isoMatch.index ?? 0,
        end: (isoMatch.index ?? 0) + isoMatch[0].length,
      },
    };
  }

  // 3. Check Day + Month Name: "13 Nov 2026", "13th November, 2026", "13 Nov"
  const dayMonthMatch = text.match(RE_DAY_MONTH);
  if (dayMonthMatch) {
    const d = parseInt(dayMonthMatch[1]!, 10);
    const monthKey = dayMonthMatch[2]!.toLowerCase().slice(0, 3);
    const m = MONTH_NAMES[monthKey];

    let y: number = refYear;
    let isInheritedYear = false;

    if (dayMonthMatch[3]) {
      const rawYear = parseInt(dayMonthMatch[3], 10);
      y = rawYear < 100 ? 2000 + rawYear : rawYear;
    } else if (context.previousDateISO) {
      // Inherit year from sentence 1
      const prevYear = parseInt(context.previousDateISO.split("-")[0]!, 10);
      y = isNaN(prevYear) ? refYear : prevYear;
      isInheritedYear = true;
    } else {
      isInheritedYear = true;
    }

    if (m) {
      const validation = validateCalendarDate(y, m, d);
      return {
        dateISO: validation.isValid ? formatIso(y, m, d) : "",
        displayDate: formatDisplayDate(y, m, d),
        year: y,
        month: m,
        day: d,
        isValid: validation.isValid,
        isInherited: isInheritedYear,
        needsReview: !validation.isValid,
        warning: validation.warning,
        matchedText: dayMonthMatch[0],
        span: {
          start: dayMonthMatch.index ?? 0,
          end: (dayMonthMatch.index ?? 0) + dayMonthMatch[0].length,
        },
      };
    }
  }

  // 4. Check Month Name + Day: "Nov 13, 2026", "November 13"
  const monthDayMatch = text.match(RE_MONTH_DAY);
  if (monthDayMatch) {
    const monthKey = monthDayMatch[1]!.toLowerCase().slice(0, 3);
    const m = MONTH_NAMES[monthKey];
    const d = parseInt(monthDayMatch[2]!, 10);

    let y: number = refYear;
    let isInheritedYear = false;

    if (monthDayMatch[3]) {
      const rawYear = parseInt(monthDayMatch[3], 10);
      y = rawYear < 100 ? 2000 + rawYear : rawYear;
    } else if (context.previousDateISO) {
      const prevYear = parseInt(context.previousDateISO.split("-")[0]!, 10);
      y = isNaN(prevYear) ? refYear : prevYear;
      isInheritedYear = true;
    } else {
      isInheritedYear = true;
    }

    if (m) {
      const validation = validateCalendarDate(y, m, d);
      return {
        dateISO: validation.isValid ? formatIso(y, m, d) : "",
        displayDate: formatDisplayDate(y, m, d),
        year: y,
        month: m,
        day: d,
        isValid: validation.isValid,
        isInherited: isInheritedYear,
        needsReview: !validation.isValid,
        warning: validation.warning,
        matchedText: monthDayMatch[0],
        span: {
          start: monthDayMatch.index ?? 0,
          end: (monthDayMatch.index ?? 0) + monthDayMatch[0].length,
        },
      };
    }
  }

  // 5. Check Numeric Slash/Dash/Dot: "13/11/2026", "13-11-2026", "13.11.26"
  const numericMatch = text.match(RE_NUMERIC);
  if (numericMatch) {
    const d = parseInt(numericMatch[1]!, 10);
    const m = parseInt(numericMatch[2]!, 10);
    const rawYear = parseInt(numericMatch[3]!, 10);
    const y = rawYear < 100 ? 2000 + rawYear : rawYear;

    const validation = validateCalendarDate(y, m, d);

    return {
      dateISO: validation.isValid ? formatIso(y, m, d) : "",
      displayDate: formatDisplayDate(y, m, d),
      year: y,
      month: m,
      day: d,
      isValid: validation.isValid,
      isInherited: false,
      needsReview: !validation.isValid,
      warning: validation.warning,
      matchedText: numericMatch[0],
      span: {
        start: numericMatch.index ?? 0,
        end: (numericMatch.index ?? 0) + numericMatch[0].length,
      },
    };
  }

  return null;
}

/**
 * Helper to process sequential clauses in a notice, carrying date context
 * forward across sentence boundaries.
 */
export function parseNoticeDatesWithContext(
  sentences: string[],
  referenceYear = 2026
): (ParsedDateResult | null)[] {
  const results: (ParsedDateResult | null)[] = [];
  const context: DateParserContext = { referenceYear };

  for (const sentence of sentences) {
    const parsed = extractDateFromText(sentence, context);
    results.push(parsed);

    // If a valid date was established, carry it forward
    if (parsed && parsed.isValid && parsed.dateISO) {
      context.previousDateISO = parsed.dateISO;
      context.previousDisplayDate = parsed.displayDate;
    }
  }

  return results;
}

// ── Formatting Helpers ─────────────────────────────────────────────────────

function formatIso(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatDisplayDate(year: number, month: number, day: number): string {
  const monthLabel = MONTH_LABELS[month - 1] || "Jan";
  return `${day} ${monthLabel} ${year}`;
}

