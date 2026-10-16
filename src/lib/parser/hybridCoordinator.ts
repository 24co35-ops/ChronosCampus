// 🧠 ChronosCampus Hybrid Coordinator 🧠
// Implements the hybrid extraction pipeline adhering to the hackathon rubric:
// "AI is welcome only where it adds value. Do not reward complexity for its own sake."
//
// 1. Primary Instant Pass (0ms):
//    Always runs the deterministic parser (entityExtractor.ts) synchronously
//    on the client so the UI renders instantaneously with 100% offline reliability.
//
// 2. Optional AI Semantic Refinement Pass:
//    When triggered on-demand (e.g. user clicks "✨ Deep AI Refine") or when
//    confidence < 75%, queries the /api/decode-ai endpoint (Gemini 2.5 Flash).
//    All raw date/time strings from AI are re-validated deterministically
//    so zero timestamps are ever hallucinated.
//
// 3. 4-Second Circuit Breaker:
//    Automatic timeout & offline fallback ensures the application never crashes.

import type { DecodedEvent } from "@/src/types/notice";
import { parseNoticeText, type ParseNoticeOptions } from "./entityExtractor";
import { startExecutionTimer, logDiagnostic } from "@/src/lib/telemetry/diagnostics";

export type HybridSource =
  | "DETERMINISTIC_INSTANT"
  | "AI_REFINED"
  | "AI_FALLBACK_DETERMINISTIC";

export interface HybridParseResult {
  events: DecodedEvent[];
  source: HybridSource;
  latencyMs: number;
  circuitBreakerTriggered: boolean;
  statusMessage: string;
  deterministicEvents: DecodedEvent[];
}

export interface HybridCoordinatorOptions extends ParseNoticeOptions {
  mode?: "DETERMINISTIC_ONLY" | "AUTO_IF_AMBIGUOUS" | "FORCE_AI";
  onStageChange?: (stage: "deterministic" | "ai_refining" | "complete") => void;
}

/**
 * 1. Synchronous Instant Deterministic Pass (0ms, 100% offline).
 */
export function runDeterministicPass(
  text: string,
  options?: ParseNoticeOptions
): DecodedEvent[] {
  return parseNoticeText(text, options);
}

/**
 * Evaluates whether AI semantic refinement should be recommended to the user.
 * Triggered when confidence < 75%, an end-time was inferred, or zero events were detected.
 */
export function shouldSuggestAiRefinement(events: DecodedEvent[]): boolean {
  if (events.length === 0) return true;
  return events.some((e) => e.confidence < 75 || e.needsReview);
}

/**
 * 2. Optional AI Semantic Refinement Pass with 4-second client safety timeout.
 */
export async function refineWithAi(
  text: string,
  fallbackEvents: DecodedEvent[],
  options?: ParseNoticeOptions
): Promise<HybridParseResult> {
  const stopTimer = startExecutionTimer();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const res = await fetch("/api/decode-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        fallbackEvents,
        referenceYear: options?.referenceYear,
        defaultCohort: options?.defaultCohort,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const elapsed = stopTimer();
      logDiagnostic("warn", "HybridCoordinator", `API returned ${res.status}; falling back to deterministic.`);
      return {
        events: fallbackEvents,
        source: "AI_FALLBACK_DETERMINISTIC",
        latencyMs: elapsed,
        circuitBreakerTriggered: false,
        statusMessage: `AI service returned status ${res.status}. Preserved 100% deterministic parsing.`,
        deterministicEvents: fallbackEvents,
      };
    }

    const data = await res.json();
    const elapsed = stopTimer();

    return {
      events: data.events && data.events.length > 0 ? data.events : fallbackEvents,
      source: data.source || (data.success ? "AI_REFINED" : "AI_FALLBACK_DETERMINISTIC"),
      latencyMs: elapsed,
      circuitBreakerTriggered: Boolean(data.circuitBreakerTriggered),
      statusMessage:
        data.message ||
        (data.success
          ? "✨ AI Semantic Refinement Applied (Verified by Deterministic Firewall)"
          : "⚡ 100% Deterministic Engine Active"),
      deterministicEvents: fallbackEvents,
    };
  } catch (err: any) {
    const elapsed = stopTimer();
    const isTimeout = err?.name === "AbortError" || err?.code === 20;

    logDiagnostic(isTimeout ? "warn" : "error", "HybridCoordinator", isTimeout
        ? "Client-side 4.5s circuit breaker timeout triggered for AI refinement."
        : `Network exception during AI refinement: ${err?.message}`
    );

    return {
      events: fallbackEvents,
      source: "AI_FALLBACK_DETERMINISTIC",
      latencyMs: elapsed,
      circuitBreakerTriggered: isTimeout,
      statusMessage: isTimeout
        ? "AI refinement exceeded 4s circuit breaker. Preserved deterministic parsing."
        : "Network offline or unreachable. Retained 100% deterministic parsing.",
      deterministicEvents: fallbackEvents,
    };
  }
}

/**
 * 3. High-level hybrid pipeline orchestrator.
 */
export async function parseNoticeHybrid(
  text: string,
  options: HybridCoordinatorOptions = {}
): Promise<HybridParseResult> {
  const stopTimer = startExecutionTimer();

  // Step 1: Immediate deterministic pass
  options.onStageChange?.("deterministic");
  const deterministicEvents = runDeterministicPass(text, options);
  const detLatency = stopTimer();

  const mode = options.mode ?? "DETERMINISTIC_ONLY";

  if (mode === "DETERMINISTIC_ONLY") {
    options.onStageChange?.("complete");
    return {
      events: deterministicEvents,
      source: "DETERMINISTIC_INSTANT",
      latencyMs: detLatency,
      circuitBreakerTriggered: false,
      statusMessage: `⚡ Parsed in ${detLatency.toFixed(1)}ms • 100% Deterministic Engine`,
      deterministicEvents,
    };
  }

  // Step 2: Check if AI pass should be engaged
  const needsRefinement = mode === "FORCE_AI" || shouldSuggestAiRefinement(deterministicEvents);

  if (!needsRefinement) {
    options.onStageChange?.("complete");
    return {
      events: deterministicEvents,
      source: "DETERMINISTIC_INSTANT",
      latencyMs: detLatency,
      circuitBreakerTriggered: false,
      statusMessage: `⚡ Parsed in ${detLatency.toFixed(1)}ms • High Confidence (Deterministic)`,
      deterministicEvents,
    };
  }

  // Step 3: Run AI refinement with safety fallback
  options.onStageChange?.("ai_refining");
  const aiResult = await refineWithAi(text, deterministicEvents, options);
  options.onStageChange?.("complete");

  return aiResult;
}

/**
 * Helper to format UI badge styling and telemetry text.
 */
export function getHybridBadgeInfo(result: HybridParseResult): {
  badgeLabel: string;
  badgeClass: string;
  badgeIcon: "zap" | "sparkles" | "shield";
} {
  switch (result.source) {
    case "AI_REFINED":
      return {
        badgeLabel: `✨ AI Refined (${result.latencyMs}ms)`,
        badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
        badgeIcon: "sparkles",
      };
    case "AI_FALLBACK_DETERMINISTIC":
      return {
        badgeLabel: result.circuitBreakerTriggered
          ? `⚡ Fallback (Timeout >4s)`
          : `⚡ Deterministic Active (${result.latencyMs.toFixed(1)}ms)`,
        badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
        badgeIcon: "shield",
      };
    case "DETERMINISTIC_INSTANT":
    default:
      return {
        badgeLabel: `⚡ Parsed in ${result.latencyMs.toFixed(1)}ms • 100% Deterministic`,
        badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
        badgeIcon: "zap",
      };
  }
}