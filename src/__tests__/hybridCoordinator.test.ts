import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  runDeterministicPass,
  shouldSuggestAiRefinement,
  refineWithAi,
  parseNoticeHybrid,
  getHybridBadgeInfo,
} from "../lib/parser/hybridCoordinator";
import { OFFICIAL_PS02_NOTICE } from "../lib/fixtures/sampleNotices";
import type { DecodedEvent } from "../types/notice";

describe("HybridCoordinator - Instant Deterministic Pass", () => {
  it("runs synchronous deterministic extraction instantly on OFFICIAL_PS02_NOTICE", () => {
    const events = runDeterministicPass(OFFICIAL_PS02_NOTICE);
    expect(events.length).toBe(3);
    expect(events.map((e) => e.type)).toEqual(["Test", "Deadline", "Lecture"]);
  });
});

describe("HybridCoordinator - AI Suggestion Heuristics", () => {
  it("returns false when all events have high confidence and clean extractions", () => {
    const cleanEvents: DecodedEvent[] = [
      {
        id: "1",
        title: "Test",
        type: "Test",
        dateISO: "2026-11-13",
        displayDate: "13 Nov 2026",
        startTime: "10:00",
        endTime: "11:30",
        venue: "Room 204",
        cohort: "CSE",
        confidence: 95,
        needsReview: false,
        sourceSpan: { start: 0, end: 10, rawSentence: "" },
      },
    ];
    expect(shouldSuggestAiRefinement(cleanEvents)).toBe(false);
  });

  it("returns true when any event has low confidence (< 75) or needsReview", () => {
    const ambiguousEvents: DecodedEvent[] = [
      {
        id: "1",
        title: "Inferred Event",
        type: "Lecture",
        dateISO: "2026-11-13",
        displayDate: "13 Nov 2026",
        startTime: "14:00",
        endTime: "15:00",
        venue: "TBD",
        cohort: "All Students",
        confidence: 70,
        needsReview: true,
        sourceSpan: { start: 0, end: 10, rawSentence: "" },
      },
    ];
    expect(shouldSuggestAiRefinement(ambiguousEvents)).toBe(true);
  });

  it("returns true when zero events were extracted", () => {
    expect(shouldSuggestAiRefinement([])).toBe(true);
  });
});

describe("HybridCoordinator - Circuit Breaker & Fallback Safety", () => {
  const fallbackEvents = runDeterministicPass(OFFICIAL_PS02_NOTICE);

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("gracefully falls back to deterministic events if network fetch throws", async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error("Failed to fetch"));

    const result = await refineWithAi(OFFICIAL_PS02_NOTICE, fallbackEvents);

    expect(result.events.length).toBe(3);
    expect(result.source).toBe("AI_FALLBACK_DETERMINISTIC");
    expect(result.statusMessage).toContain("Network offline or unreachable");
  });

  it("gracefully handles circuit-breaker timeout (AbortError)", async () => {
    const abortErr = new Error("The operation was aborted");
    abortErr.name = "AbortError";
    (global.fetch as any).mockRejectedValueOnce(abortErr);

    const result = await refineWithAi(OFFICIAL_PS02_NOTICE, fallbackEvents);

    expect(result.events.length).toBe(3);
    expect(result.source).toBe("AI_FALLBACK_DETERMINISTIC");
    expect(result.circuitBreakerTriggered).toBe(true);
    expect(result.statusMessage).toContain("circuit breaker");
  });

  it("handles non-200 HTTP responses without throwing", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({ error: "Service unavailable" }),
    });

    const result = await refineWithAi(OFFICIAL_PS02_NOTICE, fallbackEvents);

    expect(result.events.length).toBe(3);
    expect(result.source).toBe("AI_FALLBACK_DETERMINISTIC");
    expect(result.statusMessage).toContain("503");
  });

  it("returns AI_REFINED when backend refinement succeeds", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        source: "AI_REFINED",
        circuitBreakerTriggered: false,
        events: fallbackEvents,
        message: "Refined",
      }),
    });

    const result = await refineWithAi(OFFICIAL_PS02_NOTICE, fallbackEvents);

    expect(result.events.length).toBe(3);
    expect(result.source).toBe("AI_REFINED");
  });
});

describe("HybridCoordinator - High-Level parseNoticeHybrid", () => {
  it("executes DETERMINISTIC_ONLY mode in 0ms without calling fetch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await parseNoticeHybrid(OFFICIAL_PS02_NOTICE, {
      mode: "DETERMINISTIC_ONLY",
    });

    expect(result.source).toBe("DETERMINISTIC_INSTANT");
    expect(result.events.length).toBe(3);
    expect(fetchSpy).not.toHaveBeenCalled();

    vi.restoreAllMocks();
  });
});

describe("HybridCoordinator - UI Badge Formatter", () => {
  it("formats deterministic, AI refined, and fallback badges appropriately", () => {
    const b1 = getHybridBadgeInfo({
      events: [],
      source: "DETERMINISTIC_INSTANT",
      latencyMs: 1.2,
      circuitBreakerTriggered: false,
      statusMessage: "",
      deterministicEvents: [],
    });
    expect(b1.badgeIcon).toBe("zap");
    expect(b1.badgeLabel).toContain("Deterministic");

    const b2 = getHybridBadgeInfo({
      events: [],
      source: "AI_REFINED",
      latencyMs: 340,
      circuitBreakerTriggered: false,
      statusMessage: "",
      deterministicEvents: [],
    });
    expect(b2.badgeIcon).toBe("sparkles");
    expect(b2.badgeLabel).toContain("AI Refined");

    const b3 = getHybridBadgeInfo({
      events: [],
      source: "AI_FALLBACK_DETERMINISTIC",
      latencyMs: 4010,
      circuitBreakerTriggered: true,
      statusMessage: "",
      deterministicEvents: [],
    });
    expect(b3.badgeIcon).toBe("shield");
    expect(b3.badgeLabel).toContain("Fallback");
  });
});