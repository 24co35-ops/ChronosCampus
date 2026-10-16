import { describe, it, expect, beforeEach } from "vitest";
import {
  startExecutionTimer,
  measureExecution,
  formatTelemetryBadge,
  logDiagnostic,
  getDiagnosticLogs,
  clearDiagnosticLogs,
} from "../lib/telemetry/diagnostics";

describe("ChronosCampus Diagnostics & Telemetry Utilities", () => {
  beforeEach(() => {
    clearDiagnosticLogs();
  });

  it("measures synchronous execution latency with startExecutionTimer", () => {
    const stopTimer = startExecutionTimer();
    // Simulate slight work
    let acc = 0;
    for (let i = 0; i < 10000; i++) acc += i;
    const elapsed = stopTimer();

    expect(typeof elapsed).toBe("number");
    expect(elapsed).toBeGreaterThanOrEqual(0.1);
  });

  it("measures execution via measureExecution wrapper and returns result", () => {
    const { result, durationMs } = measureExecution(() => {
      return 42 * 2;
    }, "MathCalculation");

    expect(result).toBe(84);
    expect(durationMs).toBeGreaterThanOrEqual(0.1);
  });

  it("formats telemetry badge for judge presentation", () => {
    expect(formatTelemetryBadge(1.4)).toBe("⚡ Parsed in 1.4ms • 100% Deterministic Engine");
    expect(formatTelemetryBadge(0.4)).toBe("⚡ Parsed in < 1.0ms • 100% Deterministic Engine");
    expect(formatTelemetryBadge(null)).toContain("Deterministic Engine");
  });

  it("records and caps diagnostic logs in ring buffer", () => {
    logDiagnostic("info", "TestModule", "System initialized successfully");
    logDiagnostic("warn", "ClashEngine", "Transit buffer warning", { gap: 0 });

    const logs = getDiagnosticLogs();
    expect(logs.length).toBe(2);
    expect(logs[0]?.level).toBe("info");
    expect(logs[1]?.level).toBe("warn");
    expect(logs[1]?.message).toBe("Transit buffer warning");

    clearDiagnosticLogs();
    expect(getDiagnosticLogs().length).toBe(0);
  });
});
