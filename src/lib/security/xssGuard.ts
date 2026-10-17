/**
 * xssGuard.ts — Deterministic DOM XSS & Malicious HTML Neutralizer
 *
 * Implements:
 * 1. Strict stripping of <script>, <iframe>, <object>, <embed>, <svg>
 * 2. Neutralization of inline event handlers (onerror=, onload=, onclick=, onmouseover=)
 * 3. Neutralization of dangerous URI schemes (javascript:, vbscript:, data:text/html)
 * 4. Stripping of raw unescaped HTML tags
 * 5. Security audit logging with badges for telemetry display
 */

export interface XssSanitizeResult {
  sanitized: string;
  hasXss: boolean;
  threats: string[];
  badge: string | null;
}

export interface SecurityThreatLog {
  id: string;
  timestamp: string;
  threatCategory: "XSS_DOM" | "ICS_INJECTION" | "FORMULA_INJECTION" | "PROMPT_INJECTION";
  details: string;
  originalSnippet: string;
}

// In-memory security audit event ring buffer (capped at 50 events)
const securityAuditBuffer: SecurityThreatLog[] = [];

/**
 * Strips all malicious XSS vectors and raw HTML tags from input text.
 */
export function stripXssAndHtml(input: string | null | undefined): XssSanitizeResult {
  if (!input) {
    return { sanitized: "", hasXss: false, threats: [], badge: null };
  }

  let text = String(input);
  const threats: string[] = [];

  // 1. Detect & strip <script> blocks
  if (/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(text)) {
    threats.push("XSS_SCRIPT_TAG");
    text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  }

  // 2. Detect & strip <iframe> blocks
  if (/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi.test(text)) {
    threats.push("XSS_IFRAME_TAG");
    text = text.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "");
  }

  // 3. Detect & strip <object>, <embed>, <applet>
  if (/<(?:object|embed|applet)\b[^<]*(?:(?!<\/(?:object|embed|applet)>)<[^<]*)*<\/(?:object|embed|applet)>/gi.test(text)) {
    threats.push("XSS_EMBED_TAG");
    text = text.replace(/<(?:object|embed|applet)\b[^<]*(?:(?!<\/(?:object|embed|applet)>)<[^<]*)*<\/(?:object|embed|applet)>/gi, "");
  }

  // 4. Detect & strip inline HTML event handlers (onerror=, onload=, onclick=, etc.)
  if (/\bon[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi.test(text)) {
    threats.push("XSS_EVENT_HANDLER");
    text = text.replace(/\bon[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, "");
  }

  // 5. Detect & strip javascript:, vbscript:, and data:text/html pseudo-protocols
  if (/(?:javascript|vbscript|data\s*:\s*text\/html)\s*:/gi.test(text)) {
    threats.push("XSS_JAVASCRIPT_URI");
    text = text.replace(/(?:javascript|vbscript|data\s*:\s*text\/html)\s*:[^'"\s>]*/gi, "[BLOCKED_URI]");
  }

  // 6. Strip remaining raw HTML tags (e.g. <b>, <img>, <svg>, <div>)
  if (/<[^>]+>/g.test(text)) {
    threats.push("RAW_HTML_STRIPPED");
    text = text.replace(/<[^>]+>/g, "");
  }

  const hasXss = threats.length > 0;
  const badge = hasXss ? `🛡️ Neutralized: ${threats.join(", ")}` : null;

  if (hasXss) {
    recordSecurityThreat({
      threatCategory: "XSS_DOM",
      details: threats.join("; "),
      originalSnippet: input.slice(0, 100),
    });
  }

  return {
    sanitized: text.trim(),
    hasXss,
    threats,
    badge,
  };
}

/**
 * Encodes special characters (&, <, >, ", ') into safe HTML entities.
 */
export function escapeHtml(text: string | null | undefined): string {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Records a security threat into the ring buffer for UI telemetry and audit display.
 */
export function recordSecurityThreat(threat: {
  threatCategory: "XSS_DOM" | "ICS_INJECTION" | "FORMULA_INJECTION" | "PROMPT_INJECTION";
  details: string;
  originalSnippet: string;
}): void {
  const log: SecurityThreatLog = {
    id: `threat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    ...threat,
  };

  securityAuditBuffer.unshift(log);
  if (securityAuditBuffer.length > 50) {
    securityAuditBuffer.pop();
  }
}

/**
 * Retrieves the security threat logs.
 */
export function getSecurityThreatLogs(): SecurityThreatLog[] {
  return [...securityAuditBuffer];
}

/**
 * Clears the security threat log buffer (primarily for unit tests).
 */
export function clearSecurityThreatLogs(): void {
  securityAuditBuffer.length = 0;
}
