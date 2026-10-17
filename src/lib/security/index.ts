// ─── Input Security & Neutralization Layer ─────────────────────────────────
// Ponytail: 100% deterministic, zero external vulnerability risk.

export * from "./icsSanitizer";
export * from "./xssGuard";
export * from "./resourceGuard";
export * from "./promptFirewall";
export * from "./rateLimiter";

import { sanitizeIcsFieldValue, secureCalendarText } from "./icsSanitizer";
import { stripXssAndHtml } from "./xssGuard";
import { enforcePayloadLimit, MAX_PAYLOAD_CHARS, MAX_SAFE_REGEX_LEN } from "./resourceGuard";

/** Max notice length accepted — hard payload safety ceiling (25,000 characters) */
const MAX_INPUT_BYTES = MAX_PAYLOAD_CHARS;

/** Reject or sanitize untrusted notice text before parsing */
export function sanitizeNoticeInput(raw: string): { text: string; warning: string | null } {
  if (!raw) return { text: "", warning: null };

  // 1. Enforce payload cap (25,000 chars)
  const payloadGuard = enforcePayloadLimit(raw, MAX_PAYLOAD_CHARS);
  let stripped = payloadGuard.text.replace(/\0/g, "");
  let warning: string | null = payloadGuard.warning;

  // 2. Strict XSS and HTML stripping
  const xssResult = stripXssAndHtml(stripped);
  if (xssResult.hasXss) {
    stripped = xssResult.sanitized;
    warning = warning
      ? `${warning} ${xssResult.badge || "Malicious HTML or script tokens were neutralized."}`
      : (xssResult.badge || "Malicious HTML or script tokens were neutralized.");
  }

  // 3. Detect and neutralize CRLF injection attempts
  if (/\r\nATTENDEE|\r\nORGANIZER|\r\nSUMMARY|\r\nBEGIN:VALARM|\r\nATTACH/i.test(stripped)) {
    stripped = stripped.replace(/\r\n/g, "\n");
    warning = warning
      ? `${warning} Calendar CRLF directives were neutralized.`
      : "Calendar CRLF headers were neutralized.";
  }

  return { text: stripped, warning };
}

/**
 * Render notice text as plain text — never as HTML.
 * Use this before inserting any extracted string into the DOM via dangerouslySetInnerHTML.
 */
export function escapeHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Sanitize a string destined for an iCalendar text property.
 * Strictly adheres to RFC 5545 §3.3.11, disarms line breakouts,
 * strips control characters, and neutralizes spreadsheet formula injection.
 */
export function escapeIcsText(text: string): string {
  return secureCalendarText(text);
}

/**
 * Guard: ensure a regex does not run on strings longer than safeLen.
 * Use around any regex that has quantifiers on variable-length groups.
 */
export function safeRegexTest(re: RegExp, input: string, safeLen = 2000): boolean {
  if (input.length > safeLen) return false;
  return re.test(input);
}

/**
 * Strip prompt-injection candidates from text before sending to an LLM.
 * Strips common instruction-override patterns deterministically.
 */
export function sanitizeForLlm(text: string): string {
  if (!text) return "";
  return text
    .replace(/ignore\s+(all\s+)?prior\s+instructions?/gi, "[REDACTED]")
    .replace(/ignore\s+(all\s+)?previous\s+instructions?/gi, "[REDACTED]")
    .replace(/system\s*(override|:)/gi, "[REDACTED]")
    .replace(/\[INST\]/gi, "[REDACTED]")
    .replace(/###\s*instruction/gi, "[REDACTED]");
}
