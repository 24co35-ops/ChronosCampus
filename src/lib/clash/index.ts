// ─── Deterministic Clash Engine (interval algebra) ───────────────────────
// Half-open intervals [start, end). Pure functions — no React, no LLM.

import type {
  ReviewedEvent,
  ClashResult,
  ClashKind,
  BusyWindow,
  DeadlineFeasibility,
  Recommendation,
} from "@/src/types";

// ── Helpers ───────────────────────────────────────────────────────────────

/** Convert "HH:mm" to minutes since midnight */
export function toMins(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function fromMins(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function isRanged(e: ReviewedEvent): boolean {
  return e.type !== "Deadline" && !!e.startTime && !!e.endTime && e.startTime !== e.endTime;
}

// ── Pairwise clash analysis ───────────────────────────────────────────────

/**
 * O(n²) pairwise check — sufficient for notice-sized event lists.
 * Returns one ClashResult per ordered pair (i < j).
 */
export function analyzePairwiseClashes(events: ReviewedEvent[]): ClashResult[] {
  const results: ClashResult[] = [];
  const dated = events.filter((e) => !!e.dateISO && !!e.startTime);

  for (let i = 0; i < dated.length; i++) {
    for (let j = i + 1; j < dated.length; j++) {
      const a = dated[i]!;
      const b = dated[j]!;
      if (a.dateISO !== b.dateISO) continue; // different days — no clash
      results.push(checkPair(a, b));
    }
  }
  return results;
}

function checkPair(a: ReviewedEvent, b: ReviewedEvent): ClashResult {
  const base: Omit<ClashResult, "kind" | "overlapStart" | "overlapEnd" | "overlapMins" | "explanation"> = {
    eventA: a.id,
    eventB: b.id,
  };

  // Case C: deadline vs deadline
  if (a.type === "Deadline" && b.type === "Deadline") {
    if (a.startTime === b.startTime) {
      return {
        ...base,
        kind: "deadline-collision",
        overlapStart: a.startTime,
        overlapEnd: a.startTime,
        overlapMins: 0,
        explanation: `Both deadlines are due at ${a.startTime}. Prioritise one task.`,
      };
    }
    return noneResult(base, `"${a.title}" and "${b.title}" have different due times — no direct clash.`);
  }

  // Case B: one is a deadline
  const [ranged, deadline] =
    a.type === "Deadline" ? [b, a] : b.type === "Deadline" ? [a, b] : [null, null];

  if (ranged && deadline) {
    const dMins = toMins(deadline.startTime);
    const rStart = toMins(ranged.startTime);
    const rEnd = toMins(ranged.endTime || ranged.startTime);
    const inside = rStart <= dMins && dMins < rEnd; // half-open upper bound
    if (inside) {
      return {
        ...base,
        kind: "containment",
        overlapStart: deadline.startTime,
        overlapEnd: deadline.startTime,
        overlapMins: 0,
        explanation: `The ${deadline.startTime} deadline ("${deadline.title}") falls inside "${ranged.title}" (${ranged.startTime}–${ranged.endTime}).`,
      };
    }
    return noneResult(
      base,
      `"${deadline.title}" (due ${deadline.startTime}) is not inside "${ranged.title}" (${ranged.startTime}–${ranged.endTime}) under the half-open rule.`
    );
  }

  // Case A: two ranged events
  if (isRanged(a) && isRanged(b)) {
    const aStart = toMins(a.startTime);
    const aEnd = toMins(a.endTime);
    const bStart = toMins(b.startTime);
    const bEnd = toMins(b.endTime);
    const overlapStart = Math.max(aStart, bStart);
    const overlapEnd = Math.min(aEnd, bEnd);
    const overlapMins = Math.max(0, overlapEnd - overlapStart);
    if (overlapMins > 0) {
      return {
        ...base,
        kind: "overlap",
        overlapStart: fromMins(overlapStart),
        overlapEnd: fromMins(overlapEnd),
        overlapMins,
        explanation: `"${a.title}" and "${b.title}" overlap from ${fromMins(overlapStart)} to ${fromMins(overlapEnd)} (${overlapMins} min).`,
      };
    }
    return noneResult(base, `"${a.title}" ends at ${a.endTime}; "${b.title}" starts at ${b.startTime} — no overlap under half-open rule.`);
  }

  return noneResult(base, `"${a.title}" and "${b.title}" do not clash.`);
}

function noneResult(
  base: { eventA: string; eventB: string },
  explanation: string
): ClashResult {
  return { ...base, kind: "none", overlapStart: null, overlapEnd: null, overlapMins: 0, explanation };
}

// ── Busy-window merger (sweep-line) ───────────────────────────────────────

/** Merge overlapping ranged intervals; O(n log n). */
export function mergeBusyWindows(events: ReviewedEvent[]): BusyWindow[] {
  const ranged = events
    .filter((e) => e.type !== "Deadline" && !!e.startTime && !!e.endTime)
    .sort((a, b) => toMins(a.startTime) - toMins(b.startTime));

  if (ranged.length === 0) return [];

  const windows: BusyWindow[] = [];
  let current: BusyWindow = {
    start: ranged[0]!.startTime,
    end: ranged[0]!.endTime,
    eventIds: [ranged[0]!.id],
  };

  for (let i = 1; i < ranged.length; i++) {
    const e = ranged[i]!;
    if (toMins(e.startTime) <= toMins(current.end)) {
      // Extend
      if (toMins(e.endTime) > toMins(current.end)) current.end = e.endTime;
      current.eventIds.push(e.id);
    } else {
      windows.push(current);
      current = { start: e.startTime, end: e.endTime, eventIds: [e.id] };
    }
  }
  windows.push(current);
  return windows;
}

// ── Deadline feasibility ──────────────────────────────────────────────────

export function assessDeadlineFeasibility(
  events: ReviewedEvent[],
  windows: BusyWindow[]
): DeadlineFeasibility[] {
  return events
    .filter((e) => e.type === "Deadline" && !!e.startTime)
    .map((dl) => {
      const dMins = toMins(dl.startTime);
      const conflict = windows.find(
        (w) => toMins(w.start) <= dMins && dMins < toMins(w.end)
      ) ?? null;
      return {
        deadlineId: dl.id,
        busyWindow: conflict,
        isAtRisk: conflict !== null,
        recommendation: conflict
          ? `The ${dl.startTime} deadline falls inside a busy block (${conflict.start}–${conflict.end}). Safest option: submit before ${conflict.start}, or confirm an alternate handoff with the department.`
          : `No busy-window conflict for this deadline.`,
      };
    });
}

// ── Recommendation engine ─────────────────────────────────────────────────

export function recommendActions(
  events: ReviewedEvent[],
  clashes: ClashResult[],
  feasibility: DeadlineFeasibility[]
): Recommendation[] {
  const recs: Recommendation[] = [];
  const byId = Object.fromEntries(events.map((e) => [e.id, e]));

  for (const clash of clashes) {
    if (clash.kind === "none") continue;
    const a = byId[clash.eventA];
    const b = byId[clash.eventB];
    if (!a || !b) continue;

    if (clash.kind === "overlap") {
      recs.push({
        priority: "high",
        title: `Schedule conflict: ${a.title} ↔ ${b.title}`,
        detail: clash.explanation,
        draftMessage: buildDraftMessage(a, b, clash),
        relatedEventIds: [a.id, b.id],
      });
    } else if (clash.kind === "containment") {
      recs.push({
        priority: "high",
        title: `Deadline risk: submission during "${b.type === "Deadline" ? a.title : b.title}"`,
        detail: clash.explanation,
        draftMessage: null,
        relatedEventIds: [a.id, b.id],
      });
    } else if (clash.kind === "deadline-collision") {
      recs.push({
        priority: "medium",
        title: `Two deadlines at the same time`,
        detail: clash.explanation,
        draftMessage: null,
        relatedEventIds: [a.id, b.id],
      });
    }
  }

  for (const f of feasibility) {
    if (!f.isAtRisk) continue;
    const dl = byId[f.deadlineId];
    if (!dl) continue;
    recs.push({
      priority: "medium",
      title: `Deadline feasibility risk: "${dl.title}"`,
      detail: f.recommendation,
      draftMessage: null,
      relatedEventIds: [dl.id, ...(f.busyWindow?.eventIds ?? [])],
    });
  }

  return recs;
}

function buildDraftMessage(a: ReviewedEvent, b: ReviewedEvent, clash: ClashResult): string {
  return `Subject: Schedule conflict on ${a.dateISO}\n\nHello,\n\nI noticed that "${a.title}" (${a.startTime}–${a.endTime}${a.venue ? ` in ${a.venue}` : ""}) overlaps with "${b.title}" (${b.startTime}–${b.endTime}${b.venue ? ` in ${b.venue}` : ""}) from ${clash.overlapStart} to ${clash.overlapEnd} (${clash.overlapMins} min).\n\nCould you please clarify the expected attendance arrangement or whether an alternative is available?\n\nThank you.`;
}

