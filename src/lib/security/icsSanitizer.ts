/**
 * icsSanitizer.ts — Calendar Line/Directive & Formula Injection Prevention
 *
 * Implements:
 * 1. Calendar Line & Directive Injection Prevention (RFC-5545 §3.3.11):
 *    - Neutralizes raw \r\nBEGIN:VALARM, \r\nATTACH, \r\nORGANIZER, \r\nSUMMARY breakouts
 *    - Strips all ASCII control characters (\x00-\x1F, \x7F) except safe spaces
 *    - Escapes \, ;, ,, and \n strictly per RFC-5545 specification
 * 2. CSV / Spreadsheet Formula Injection Prevention (CWE-1236):
 *    - Neutralizes leading =, +, -, @, \t, or \r so exported schedules can never
 *      execute Dynamic Data Exchange (DDE) macros when opened in Excel/Google Sheets
 */

export interface SecuritySanitizeResult {
  sanitized: string;
  hasInjections: boolean;
  detectedThreats: string[];
}

/**
 * Characters that trigger formula execution in spreadsheet software (Excel, Sheets, Calc).
 */
const FORMULA_START_REGEX = /^[=+\-@\t\r]/;

/**
 * Dangerous iCalendar directive injection patterns.
 */
const DANGEROUS_ICS_DIRECTIVES = [
  /BEGIN:VALARM/i,
  /BEGIN:VEVENT/i,
  /BEGIN:VCALENDAR/i,
  /ATTACH\b/i,
  /ORGANIZER\b/i,
  /ATTENDEE\b/i,
  /ACTION:PROCEDURE/i,
  /X-[\w-]+:/i,
];

/**
 * 1. Sanitizes a single calendar text field value (Title, Venue, Description).
 *
 * Enforces RFC-5545 Section 3.3.11:
 * - Backslash (\) -> \\
 * - Semicolon (;) -> \;
 * - Comma (,) -> \,
 * - Line breaks (\r\n, \r, \n) -> literal \n (escaped newline)
 * - Strips all non-printable ASCII control characters (\x00-\x1F, \x7F)
 */
export function sanitizeIcsFieldValue(value: string | null | undefined): SecuritySanitizeResult {
  if (!value) {
    return { sanitized: "", hasInjections: false, detectedThreats: [] };
  }

  let text = String(value);
  const detectedThreats: string[] = [];

  // Check for calendar directive injection attempts before transformation
  for (const pattern of DANGEROUS_ICS_DIRECTIVES) {
    if (pattern.test(text)) {
      detectedThreats.push(`ICS_DIRECTIVE_INJECTION: ${pattern.source}`);
    }
  }

  // Check for raw CRLF injection before escaping
  if (/\r\n|\r|\n/.test(text) && detectedThreats.length > 0) {
    detectedThreats.push("CRLF_LINE_BREAKOUT_ATTEMPT");
  }

  // 1. Strip non-printable control characters (\x00-\x08, \x0B-\x0C, \x0E-\x1F, \x7F)
  // Preserves standard tabs (\x09) and newlines (\x0A) temporarily for normalization
  const cleanedControls = text.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "");
  if (cleanedControls !== text) {
    detectedThreats.push("ASCII_CONTROL_CHARS_STRIPPED");
    text = cleanedControls;
  }

  // 2. Strict RFC 5545 §3.3.11 Escaping:
  // Order is critical: backslashes MUST be escaped first!
  text = text.replace(/\\/g, "\\\\");

  // Escape semicolons and commas
  text = text.replace(/;/g, "\\;");
  text = text.replace(/,/g, "\\,");

  // Normalize all newline variants (\r\n, \r, \n) into literal escaped \n
  text = text.replace(/\r\n|\r|\n/g, "\\n");

  return {
    sanitized: text,
    hasInjections: detectedThreats.length > 0,
    detectedThreats,
  };
}

/**
 * 2. Prevents CSV / Spreadsheet Formula Injection (CWE-1236).
 *
 * If any cell value starts with `=`, `+`, `-`, `@`, `\t`, or `\r`,
 * prepends an apostrophe (`'`) so spreadsheet engines (Excel, LibreOffice, Google Sheets)
 * treat the content strictly as text rather than evaluating formulas or DDE commands.
 */
export function sanitizeFormulaInjection(value: string | null | undefined): {
  sanitized: string;
  wasFormula: boolean;
  threatDetails?: string;
} {
  if (!value) {
    return { sanitized: "", wasFormula: false };
  }

  const str = String(value);

  // Check if string begins with dangerous formula trigger character
  if (FORMULA_START_REGEX.test(str)) {
    const triggerChar = str.charAt(0);
    const triggerLabel =
      triggerChar === "\t"
        ? "\\t (Tab)"
        : triggerChar === "\r"
        ? "\\r (Carriage Return)"
        : triggerChar;

    return {
      sanitized: `'${str}`,
      wasFormula: true,
      threatDetails: `Formula trigger character "${triggerLabel}" neutralized with leading apostrophe.`,
    };
  }

  return { sanitized: str, wasFormula: false };
}

/**
 * Comprehensive event field defense: sanitizes both iCalendar and formula injection.
 */
export function secureCalendarText(text: string | null | undefined): string {
  if (!text) return "";

  // 1. Defend against formula injection
  const formulaGuarded = sanitizeFormulaInjection(text).sanitized;

  // 2. Defend against ICS CRLF directive breakouts
  const icsGuarded = sanitizeIcsFieldValue(formulaGuarded).sanitized;

  return icsGuarded;
}
