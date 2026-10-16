// ─── Input security layer ─────────────────────────────────────────────────
// Ponytail: no framework, plain string guards are enough for this use case.

/** Max notice length accepted — prevents ReDoS on long inputs */
const MAX_INPUT_BYTES = 20_000;

/** Reject or truncate untrusted notice text before parsing */
export function sanitizeNoticeInput(raw: string): { text: string; warning: string | null } {
  // Strip null bytes
  const stripped = raw.replace(/\0/g, "");

  if (stripped.length > MAX_INPUT_BYTES) {
    return {
      text: stripped.slice(0, MAX_INPUT_BYTES),
      warning: `Input truncated to ${MAX_INPUT_BYTES} characters for safety.`,
    };
  }
  return { text: stripped, warning: null };
}

/**
 * Render notice text as plain text — never as HTML.
 * Use this before inserting any extracted string into the DOM via dangerouslySetInnerHTML.
 * (Prefer React text nodes; call only when you must produce a string.)
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Sanitize a string destined for an iCalendar text property.
 * RFC 5545 §3.3.11: escape backslash, semicolon, comma, newline.
 */
export function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
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
 * Strips common injection patterns; not a cryptographic guarantee.
 */
export function sanitizeForLlm(text: string): string {
  // Remove instruction-override patterns
  return text
    .replace(/ignore\s+(all\s+)?previous\s+instructions?/gi, "[REDACTED]")
    .replace(/system\s*:/gi, "[REDACTED]")
    .replace(/\[INST\]/gi, "[REDACTED]")
    .replace(/###\s*instruction/gi, "[REDACTED]");
}
