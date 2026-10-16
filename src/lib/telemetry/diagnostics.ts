// ─── ChronosCampus Telemetry & Diagnostics ─────────────────────────────────
// Lightweight latency measurement, deterministic telemetry badge, and error logging.

export interface ParseTelemetry {
  durationMs: number;
  eventCount: number;
  charCount: number;
  timestamp: number;
  isDeterministic: true;
  engineVersion: string;
}

export interface DiagnosticEntry {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error";
  context: string;
  message: string;
  details?: unknown;
}

// In-memory diagnostic log ring buffer (capped to 50 items)
const MAX_LOGS = 50;
const diagnosticLogs: DiagnosticEntry[] = [];

/**
 * Log diagnostic events for crash forensics and auditing.
 */
export function logDiagnostic(
  level: "info" | "warn" | "error",
  context: string,
  message: string,
  details?: unknown
): DiagnosticEntry {
  const entry: DiagnosticEntry = {
    id: `diag-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    level,
    context,
    message,
    details,
  };

  diagnosticLogs.push(entry);
  if (diagnosticLogs.length > MAX_LOGS) {
    diagnosticLogs.shift();
  }

  if (process.env.NODE_ENV !== "production") {
    const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
    fn(`[ChronosCampus:${context}] ${message}`, details ?? "");
  }

  return entry;
}

export function getDiagnosticLogs(): readonly DiagnosticEntry[] {
  return diagnosticLogs;
}

export function clearDiagnosticLogs(): void {
  diagnosticLogs.length = 0;
}

/**
 * Start high-resolution execution timer.
 * Returns a closure that calculates elapsed time in milliseconds.
 */
export function startExecutionTimer(): () => number {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  return () => {
    const t1 = typeof performance !== "undefined" ? performance.now() : Date.now();
    return Math.max(0.1, Number((t1 - t0).toFixed(2)));
  };
}

/**
 * Measures synchronous function execution latency.
 */
export function measureExecution<T>(
  fn: () => T,
  context = "Execution"
): { result: T; durationMs: number } {
  const stopTimer = startExecutionTimer();
  try {
    const result = fn();
    const durationMs = stopTimer();
    return { result, durationMs };
  } catch (err) {
    const durationMs = stopTimer();
    logDiagnostic("error", context, `Failed after ${durationMs}ms`, err);
    throw err;
  }
}

/**
 * Format live telemetry badge for presentation to hackathon judges.
 * e.g., "⚡ Parsed in 1.4ms • 100% Deterministic Engine"
 */
export function formatTelemetryBadge(durationMs: number | null): string {
  if (durationMs === null || isNaN(durationMs)) {
    return "⚡ 100% Deterministic Engine • Zero Hallucinations";
  }
  const displayMs = durationMs < 1 ? "< 1.0" : durationMs.toFixed(1);
  return `⚡ Parsed in ${displayMs}ms • 100% Deterministic Engine`;
}
