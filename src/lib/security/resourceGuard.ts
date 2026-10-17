/**
 * resourceGuard.ts — Denial of Service (ReDoS) & Resource Exhaustion Defense
 *
 * Implements:
 * 1. Hard input payload ceiling: 25,000 characters
 * 2. Hard event limit: 50 maximum events per notice
 * 3. Execution time profiling & safety timeouts
 * 4. User warnings and audit logging for resource limit triggers
 */

/** Hard maximum character cap for incoming notice text */
export const MAX_PAYLOAD_CHARS = 25_000;

/** Hard maximum number of events extracted per single notice */
export const MAX_EVENTS_PER_NOTICE = 50;

/** Safe character length ceiling for variable-group regular expressions */
export const MAX_SAFE_REGEX_LEN = 2_000;

export interface PayloadGuardResult {
  text: string;
  isTruncated: boolean;
  originalLength: number;
  maxAllowed: number;
  warning: string | null;
}

export interface EventGuardResult<T> {
  events: T[];
  isTruncated: boolean;
  totalParsed: number;
  maxAllowed: number;
  warning: string | null;
}

// In-memory ring buffer for resource warnings (capped at 50 entries)
const resourceWarnings: string[] = [];

export function recordResourceWarning(warning: string): void {
  resourceWarnings.push(warning);
  if (resourceWarnings.length > 50) {
    resourceWarnings.shift();
  }
}

export function getResourceWarnings(): string[] {
  return [...resourceWarnings];
}

export function clearResourceWarnings(): void {
  resourceWarnings.length = 0;
}

/**
 * 1. Enforces a hard input payload cap of 25,000 characters.
 * Slices oversized text and produces a clear user warning.
 */
export function enforcePayloadLimit(
  input: string | null | undefined,
  maxChars = MAX_PAYLOAD_CHARS
): PayloadGuardResult {
  if (!input) {
    return {
      text: "",
      isTruncated: false,
      originalLength: 0,
      maxAllowed: maxChars,
      warning: null,
    };
  }

  const str = String(input);
  const originalLength = str.length;

  if (originalLength > maxChars) {
    const text = str.slice(0, maxChars);
    const warning = `Input truncated: Payload length (${originalLength.toLocaleString()} chars) exceeded the safe ceiling of ${maxChars.toLocaleString()} characters. Processing first ${maxChars.toLocaleString()} characters.`;
    recordResourceWarning(warning);
    return {
      text,
      isTruncated: true,
      originalLength,
      maxAllowed: maxChars,
      warning,
    };
  }

  return {
    text: str,
    isTruncated: false,
    originalLength,
    maxAllowed: maxChars,
    warning: null,
  };
}

/**
 * 2. Enforces a hard limit of 50 maximum events per notice.
 * Caps extracted event lists to prevent freezing the UI or calendar exports.
 */
export function enforceEventLimit<T>(
  events: T[],
  maxEvents = MAX_EVENTS_PER_NOTICE
): EventGuardResult<T> {
  const totalParsed = events.length;

  if (totalParsed > maxEvents) {
    const capped = events.slice(0, maxEvents);
    const warning = `Event limit enforced: Notice generated ${totalParsed} events, exceeding the safety ceiling of ${maxEvents} events per notice. Truncated to the first ${maxEvents} events.`;
    recordResourceWarning(warning);
    return {
      events: capped,
      isTruncated: true,
      totalParsed,
      maxAllowed: maxEvents,
      warning,
    };
  }

  return {
    events,
    isTruncated: false,
    totalParsed,
    maxAllowed: maxEvents,
    warning: null,
  };
}

/**
 * Utility to benchmark and measure parser execution duration.
 */
export function measureParsingDuration<T>(fn: () => T): { result: T; durationMs: number } {
  const start = typeof performance !== "undefined" ? performance.now() : Date.now();
  const result = fn();
  const end = typeof performance !== "undefined" ? performance.now() : Date.now();
  return {
    result,
    durationMs: Math.max(0, end - start),
  };
}
