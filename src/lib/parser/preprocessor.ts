// ─── Deterministic Text Pre-processor ──────────────────────────────────────
// Normalizes Unicode, fixes college notice OCR artifacts, transforms campus Hinglish,
// and segments text into event clauses without breaking on abbreviations.

export interface EventClause {
  id: string;
  text: string;
  originalStart: number;
  originalEnd: number;
}

export interface PreprocessResult {
  rawText: string;
  normalizedText: string;
  clauses: EventClause[];
  appliedFixes: {
    unicodeNormalized: boolean;
    ocrFixesCount: number;
    hinglishFixesCount: number;
  };
}

// ── 1. Unicode Normalization ───────────────────────────────────────────────

export function normalizeUnicode(text: string): string {
  return (
    text
      // Fancy double quotes to standard ASCII double quote
      .replace(/[\u201C\u201D\u201E\u201F\u00AB\u00BB]/g, '"')
      // Fancy single quotes and backticks to standard single quote
      .replace(/[\u2018\u2019\u201A\u201B\u2039\u203A`]/g, "'")
      // Em-dashes, en-dashes, figure dashes to standard hyphen
      .replace(/[\u2013\u2014\u2012\u2015\u2212]/g, "-")
      // Non-breaking spaces and formatting spaces to regular space
      .replace(/[\u00A0\u2007\u202F]/g, " ")
      // Zero-width characters
      .replace(/[\u200B\u200C\u200D\uFEFF]/g, "")
  );
}

// ── 2. OCR Glitch Correction ───────────────────────────────────────────────

interface OcrPattern {
  regex: RegExp;
  replacement: string;
}

const OCR_FIXES: OcrPattern[] = [
  // Year typos: "Il-year", "I11-year", "lll-year", "111-year" -> "III-year"
  { regex: /\b(?:Il|I11|lll|111)-year\b/gi, replacement: "III-year" },
  { regex: /\b(?:Il|I11|lll|111)\s+year\b/gi, replacement: "III-year" },
  // Time glitches: "T:00" -> "11:00", "I1:00" / "1I:00" / "ll:00" / "Il:00" -> "11:00"
  { regex: /\bT:00\b/g, replacement: "11:00" },
  { regex: /\b(?:I1|1I|ll|Il):(\d{2})\b/g, replacement: "11:$1" },
  // Domain terms: "Al in Healthcare" (lowercase l instead of capital I) -> "AI in Healthcare"
  { regex: /\bAl\s+in\s+Healthcare\b/gi, replacement: "AI in Healthcare" },
  { regex: /\bAl\s+(?:workshop|lecture|seminar|session)\b/gi, replacement: "AI $1" },
  // Common venue scan typos: "Serminar Hall" -> "Seminar Hall"
  { regex: /\bSermin[a|i]r\s+Hall\b/gi, replacement: "Seminar Hall" },
  { regex: /\bDepart(?:rn|in)ent\b/gi, replacement: "Department" },
  { regex: /\bRoorn\s+(\d+)\b/gi, replacement: "Room $1" },
];

export function fixOcrArtifacts(text: string): { text: string; count: number } {
  let count = 0;
  let result = text;

  for (const { regex, replacement } of OCR_FIXES) {
    const matches = result.match(regex);
    if (matches) {
      count += matches.length;
      result = result.replace(regex, replacement);
    }
  }

  return { text: result, count };
}

// ── 3. Indian Campus Hinglish & Vernacular Normalization ────────────────────

export function normalizeCampusHinglish(text: string): { text: string; count: number } {
  let count = 0;
  let result = text;

  // "12:00 noon" or "12 noon" -> "12:00 PM"
  const noonMatches = result.match(/\b12(?::00)?\s*noon\b/gi);
  if (noonMatches) {
    count += noonMatches.length;
    result = result.replace(/\b12(?::00)?\s*noon\b/gi, "12:00 PM");
  }

  // "12 midnight" -> "00:00"
  const midnightMatches = result.match(/\b12(?::00)?\s*midnight\b/gi);
  if (midnightMatches) {
    count += midnightMatches.length;
    result = result.replace(/\b12(?::00)?\s*midnight\b/gi, "00:00");
  }

  // "subah (\d+)" -> "$1 AM"
  const subahMatches = result.match(/\bsubah\s+(\d{1,2}(?::\d{2})?)\b/gi);
  if (subahMatches) {
    count += subahMatches.length;
    result = result.replace(/\bsubah\s+(\d{1,2}(?::\d{2})?)\b/gi, "$1 AM");
  }

  // "dopahar 12" -> "12:00 PM"
  const dopahar12 = result.match(/\bdopahar\s+12(?::00)?\b/gi);
  if (dopahar12) {
    count += dopahar12.length;
    result = result.replace(/\bdopahar\s+12(?::00)?\b/gi, "12:00 PM");
  }

  // "dopahar (\d)" (1 to 5) -> "$1 PM"
  const dopaharOther = result.match(/\bdopahar\s+([1-5](?::\d{2})?)\b/gi);
  if (dopaharOther) {
    count += dopaharOther.length;
    result = result.replace(/\bdopahar\s+([1-5](?::\d{2})?)\b/gi, "$1 PM");
  }

  // "shaam (\d+)" or "sham (\d+)" -> "$1 PM"
  const shaamMatches = result.match(/\bsha?am\s+(\d{1,2}(?::\d{2})?)\b/gi);
  if (shaamMatches) {
    count += shaamMatches.length;
    result = result.replace(/\bsha?am\s+(\d{1,2}(?::\d{2})?)\b/gi, "$1 PM");
  }

  // "(\d+) baje" -> "$1"
  const bajeMatches = result.match(/\b(\d{1,2}(?::\d{2})?(?:\s*[ap]m)?)\s*baje\b/gi);
  if (bajeMatches) {
    count += bajeMatches.length;
    result = result.replace(/\b(\d{1,2}(?::\d{2})?(?:\s*[ap]m)?)\s*baje\b/gi, "$1");
  }

  // "se" between times -> "to" (e.g., "10:00 AM se 11:30 AM" -> "10:00 AM to 11:30 AM")
  const seMatches = result.match(
    /(\d{1,2}(?::\d{2})?(?:\s*[ap]m)?)\s+se\s+(\d{1,2}(?::\d{2})?(?:\s*[ap]m)?)/gi
  );
  if (seMatches) {
    count += seMatches.length;
    result = result.replace(
      /(\d{1,2}(?::\d{2})?(?:\s*[ap]m)?)\s+se\s+(\d{1,2}(?::\d{2})?(?:\s*[ap]m)?)/gi,
      "$1 to $2"
    );
  }

  // "tak" after time -> "" (e.g. "11:30 AM tak" -> "11:30 AM")
  const takMatches = result.match(/(\d{1,2}(?::\d{2})?(?:\s*(?:[ap]m|noon|pm))?)\s+tak\b/gi);
  if (takMatches) {
    count += takMatches.length;
    result = result.replace(/(\d{1,2}(?::\d{2})?(?:\s*(?:[ap]m|noon|pm))?)\s+tak\b/gi, "$1");
  }

  return { text: result, count };
}

// ── 4. Clause Segmentation Without Splitting Abbreviations ─────────────────

const PROTECTED_ABBREVIATIONS = [
  "Dr\\.",
  "Prof\\.",
  "Mr\\.",
  "Mrs\\.",
  "Ms\\.",
  "Dept\\.",
  "Room\\s+No\\.",
  "Rm\\.",
  "B\\.Tech\\.",
  "M\\.Tech\\.",
  "Ph\\.D\\.",
  "No\\.",
  "Ref\\.",
  "Vol\\.",
  "i\\.e\\.",
  "e\\.g\\.",
  "etc\\.",
  "vs\\.",
];

const MASK_CHAR = "\uE000";

/**
 * Segments paragraphs into discrete event clauses while guarding against
 * false splits on abbreviations (e.g. "Dr.", "Prof.", "Dept.", "Room No.", "B.Tech.").
 */
export function segmentEventClauses(rawText: string): EventClause[] {
  if (!rawText.trim()) return [];

  let protectedText = rawText;

  // 1. Mask periods in decimal numbers (e.g. "1.5", "10.30")
  protectedText = protectedText.replace(/(\d)\.(\d)/g, `$1${MASK_CHAR}$2`);

  // 2. Mask periods in protected academic abbreviations
  for (const abbrPattern of PROTECTED_ABBREVIATIONS) {
    const regex = new RegExp(`\\b${abbrPattern}`, "gi");
    protectedText = protectedText.replace(regex, (match) =>
      match.replace(/\./g, MASK_CHAR)
    );
  }

  // 3. Match sentence boundaries:
  // - Period followed by whitespace or end
  // - Semicolon or newlines
  // - Bullet numbered lists (e.g. "1. ", "2) ")
  const splitRegex = /(?:\.|\;|\n+)(?:\s+|$)|(?:\n\s*\d+[\.\)]\s*)/g;

  const clauses: EventClause[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = splitRegex.exec(protectedText)) !== null) {
    const rawClause = protectedText.slice(lastIndex, match.index);
    const unmasked = rawClause.replace(new RegExp(MASK_CHAR, "g"), ".").trim();

    if (unmasked.length > 5) {
      // Find actual span in rawText
      const originalStart = rawText.indexOf(unmasked, lastIndex >= 0 ? Math.max(0, lastIndex - 10) : 0);
      clauses.push({
        id: `clause-${clauses.length + 1}`,
        text: unmasked,
        originalStart: originalStart >= 0 ? originalStart : lastIndex,
        originalEnd: originalStart >= 0 ? originalStart + unmasked.length : match.index,
      });
    }

    lastIndex = splitRegex.lastIndex;
  }

  // Tail clause
  if (lastIndex < protectedText.length) {
    const tailRaw = protectedText.slice(lastIndex);
    const unmasked = tailRaw.replace(new RegExp(MASK_CHAR, "g"), ".").trim();
    if (unmasked.length > 5) {
      const originalStart = rawText.indexOf(unmasked, Math.max(0, lastIndex - 10));
      clauses.push({
        id: `clause-${clauses.length + 1}`,
        text: unmasked,
        originalStart: originalStart >= 0 ? originalStart : lastIndex,
        originalEnd: originalStart >= 0 ? originalStart + unmasked.length : rawText.length,
      });
    }
  }

  return clauses;
}

// ── 5. Full Pipeline Pre-Processor ─────────────────────────────────────────

export function preprocessNotice(rawText: string): PreprocessResult {
  const unicodeNorm = normalizeUnicode(rawText);
  const unicodeChanged = unicodeNorm !== rawText;

  const ocrResult = fixOcrArtifacts(unicodeNorm);
  const hinglishResult = normalizeCampusHinglish(ocrResult.text);

  const clauses = segmentEventClauses(hinglishResult.text);

  return {
    rawText,
    normalizedText: hinglishResult.text,
    clauses,
    appliedFixes: {
      unicodeNormalized: unicodeChanged,
      ocrFixesCount: ocrResult.count,
      hinglishFixesCount: hinglishResult.count,
    },
  };
}
