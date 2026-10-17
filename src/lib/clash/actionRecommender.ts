/**
 * actionRecommender.ts — PS-02 Action Recommendation Engine
 *
 * Generates prioritized, context-aware action cards for every detected clash
 * and implements the mathematical Auto-Reschedule Gap Finder.
 *
 * Rule source: PS-02 Specification
 * "The app should also suggest an action, for example: submit records before
 *  the test, or ask the coordinator about the lecture."
 */

import type { DecodedEvent, ActionRecommendation, PairwiseClashResult, CompoundBusyInsight } from "../../types/notice";
import { toMinutes, fromMinutes, format12Hour } from "./pairwiseEngine";

// ── Types ───────────────────────────────────────────────────────────────────

export interface RescheduleSuggestion {
  /** The event being rescheduled */
  eventId: string;
  eventTitle: string;
  /** Original window */
  originalStart: string;
  originalEnd: string;
  /** Proposed conflict-free window */
  proposedStart: string;
  proposedEnd: string;
  /** Gap that opens up for the student between the freed slot and next obligation */
  freedWindowStart: string;
  freedWindowEnd: string;
  freedWindowMinutes: number;
  /** Estimated walking minutes to reach the deadline venue */
  transitMinutesToDeadlineVenue: number;
  /** Human-readable narrative for the preview dialog */
  narrative: string;
  /** Can the student now make the deadline comfortably? */
  isDeadlineFeasible: boolean;
}

export interface RecommenderOutput {
  recommendations: ActionRecommendation[];
  rescheduleMap: Map<string, RescheduleSuggestion>;
}

// ── Internal helpers ────────────────────────────────────────────────────────

/**
 * Finds the earliest gap in a sorted list of busy intervals that is at least
 * `durationMinutes` wide, starting from `earliestStartMins`.
 */
function findFirstFreeSlot(
  busySlots: Array<{ start: number; end: number }>,
  durationMinutes: number,
  earliestStartMins: number = 0,
  dayEndMins: number = 23 * 60
): { start: number; end: number } | null {
  const sorted = [...busySlots].sort((a, b) => a.start - b.start);

  // Before first busy slot
  const first = sorted[0];
  if (!first || earliestStartMins + durationMinutes <= first.start) {
    return { start: earliestStartMins, end: earliestStartMins + durationMinutes };
  }

  // Walk gaps between consecutive busy slots
  for (let i = 0; i < sorted.length - 1; i++) {
    const gapStart = sorted[i]!.end;
    const gapEnd = sorted[i + 1]!.start;
    const effectiveStart = Math.max(gapStart, earliestStartMins);
    if (effectiveStart + durationMinutes <= gapEnd) {
      return { start: effectiveStart, end: effectiveStart + durationMinutes };
    }
  }

  // After last busy slot
  const afterLast = Math.max(sorted[sorted.length - 1]?.end ?? earliestStartMins, earliestStartMins);
  if (afterLast + durationMinutes <= dayEndMins) {
    return { start: afterLast, end: afterLast + durationMinutes };
  }

  return null;
}

function priorityScore(priority: ActionRecommendation["priority"]): number {
  return { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }[priority];
}

// ── Core recommender ────────────────────────────────────────────────────────

export function generateRecommendations(
  events: DecodedEvent[],
  clashes: PairwiseClashResult[],
  compoundInsights: CompoundBusyInsight[]
): RecommenderOutput {
  const recommendations: ActionRecommendation[] = [];
  const rescheduleMap = new Map<string, RescheduleSuggestion>();
  const eventById = new Map(events.map((e) => [e.id, e]));
  const activeClashes = clashes.filter((c) => c.hasClash);

  // ── Pass 1: Trapped Deadline actions (CRITICAL) ──────────────────────────
  for (const insight of compoundInsights) {
    for (const td of insight.trappedDeadlines) {
      const deadline = td.deadline;
      const blockStart12h = td.trueLastFreeWindowEnd12h;
      const busyBlockEnd12h = td.busyBlockEnd12h;
      const venue = deadline.venue && deadline.venue !== "TBD" ? deadline.venue : "submission venue";

      recommendations.push({
        id: `rec-trapped-${deadline.id}`,
        priority: "CRITICAL",
        title: `Submit "${deadline.title}" BEFORE ${blockStart12h}`,
        description:
          `Submit "${deadline.title}" at ${venue} BEFORE ${blockStart12h}` +
          ` (prior to ${td.eventsInBlock[0]?.title ?? "your first session"}),` +
          ` as your schedule is continuously blocked from ${blockStart12h} to ${busyBlockEnd12h}.`,
        actionType: "SHIFT_DEADLINE",
        relatedEventIds: [deadline.id, ...td.eventsInBlock.map((e) => e.id)],
        suggestedPatch: {
          eventId: deadline.id,
          patch: { startTime: td.trueLastFreeWindowEnd, endTime: td.trueLastFreeWindowEnd },
        },
        draftEmail: {
          recipient: "Subject Coordinator",
          subject: `Submission Query: "${deadline.title}" — ${deadline.displayDate}`,
          body:
            `Dear Coordinator,\n\nI would like to confirm whether I may submit "${deadline.title}"` +
            ` at ${venue} before ${blockStart12h} on ${deadline.displayDate},` +
            ` as I have continuous academic commitments from ${blockStart12h} to ${busyBlockEnd12h}` +
            ` (${td.eventsInBlock.map((e) => `"${e.title}"`).join(", ")}).\n\n` +
            `Please advise on the earliest acceptable submission window.\n\nThank you.`,
        },
      });
    }
  }

  // ── Pass 2: Hard overlap actions (CRITICAL) ──────────────────────────────
  for (const clash of activeClashes) {
    if (clash.clashType !== "HARD_OVERLAP") continue;

    const a = eventById.get(clash.eventA);
    const b = eventById.get(clash.eventB);
    if (!a || !b) continue;

    // Academic priority: Test > Lecture > Deadline
    const typeRank = (t: string) => (t === "Test" ? 0 : t === "Lecture" ? 1 : 2);
    const priority = typeRank(a.type) <= typeRank(b.type) ? a : b;
    const secondary = priority.id === a.id ? b : a;

    const overlapWindow =
      typeof clash.overlapWindow === "object" && clash.overlapWindow !== null
        ? clash.overlapWindow
        : null;
    const overlapMins = clash.overlapMinutes;
    const overlapStr = overlapWindow
      ? `${format12Hour(overlapWindow.start)} – ${format12Hour(overlapWindow.end)}`
      : "";

    const priorityStart12h = format12Hour(priority.startTime);
    const priorityEnd12h = format12Hour(priority.endTime);
    const secondaryStart12h = format12Hour(secondary.startTime);
    const secondaryEnd12h = format12Hour(secondary.endTime);
    const venueStr = priority.venue && priority.venue !== "TBD" ? ` in ${priority.venue}` : "";

    // Academic Priority rule card
    recommendations.push({
      id: `rec-overlap-${clash.id}`,
      priority: "CRITICAL",
      title: `Academic Priority Rule: Attend "${priority.title}" (${priorityStart12h} – ${priorityEnd12h})`,
      description:
        `Attend "${priority.title}" (${priorityStart12h} – ${priorityEnd12h})${venueStr}. ` +
        (overlapMins > 0
          ? `Notify the "${secondary.title}" coordinator about the ${overlapMins}-minute overlap (${overlapStr}) or request late entry at ${priorityEnd12h}.`
          : `Notify the "${secondary.title}" coordinator (${secondaryStart12h} – ${secondaryEnd12h}) about the scheduling conflict.`),
      actionType: "NOTIFY_FACULTY",
      relatedEventIds: [a.id, b.id],
      draftEmail: {
        recipient: `${secondary.title} Coordinator`,
        subject: `Schedule Conflict Notification — ${secondary.title} (${secondary.displayDate})`,
        body:
          `Dear ${secondary.title} Coordinator,\n\n` +
          `I have a scheduling conflict on ${priority.displayDate}.\n` +
          `I am required to attend "${priority.title}" from ${priorityStart12h} to ${priorityEnd12h}${venueStr},` +
          ` which overlaps with "${secondary.title}" (${secondaryStart12h} – ${secondaryEnd12h}) by ${overlapMins} minutes.\n\n` +
          `Could I please be granted late entry to "${secondary.title}" at ${priorityEnd12h},` +
          ` or could you advise on an alternative arrangement?\n\nThank you for your understanding.`,
      },
    });

    // ── Auto-Reschedule: shift the secondary event out of conflict ─────────
    const secondaryDuration =
      toMinutes(secondary.endTime) - toMinutes(secondary.startTime);
    if (secondaryDuration > 0) {
      const siblings = events.filter(
        (e) => e.dateISO === a.dateISO && e.id !== secondary.id
      );
      const busySlots = siblings.map((e) => ({
        start: toMinutes(e.startTime),
        end: toMinutes(e.endTime || e.startTime),
      }));
      const searchFrom = toMinutes(priority.endTime) + 5;
      const freeSlot = findFirstFreeSlot(busySlots, secondaryDuration, searchFrom);

      if (freeSlot) {
        const proposedStart = fromMinutes(freeSlot.start);
        const proposedEnd = fromMinutes(freeSlot.end);
        const freedStart = priority.endTime;
        const freedEnd = proposedStart;
        const freedMins = freeSlot.start - toMinutes(priority.endTime);

        const suggestion: RescheduleSuggestion = {
          eventId: secondary.id,
          eventTitle: secondary.title,
          originalStart: secondary.startTime,
          originalEnd: secondary.endTime,
          proposedStart,
          proposedEnd,
          freedWindowStart: freedStart,
          freedWindowEnd: freedEnd,
          freedWindowMinutes: Math.max(0, freedMins),
          transitMinutesToDeadlineVenue: 15,
          narrative:
            `Shifting "${secondary.title}" from ${secondaryStart12h} – ${secondaryEnd12h}` +
            ` → ${format12Hour(proposedStart)} – ${format12Hour(proposedEnd)}.` +
            (freedMins > 0
              ? ` This opens a ${freedMins}-minute free window (${format12Hour(freedStart)} – ${format12Hour(freedEnd)})` +
                ` — enough time to handle pending submissions and transit.`
              : ""),
          isDeadlineFeasible: freedMins >= 15,
        };

        rescheduleMap.set(secondary.id, suggestion);

        recommendations.push({
          id: `rec-reschedule-${secondary.id}`,
          priority: "HIGH",
          title: `✨ Conflict-Free Reschedule: Move "${secondary.title}" to ${format12Hour(proposedStart)} – ${format12Hour(proposedEnd)}`,
          description: suggestion.narrative,
          actionType: "RESCHEDULE_EVENT",
          relatedEventIds: [a.id, b.id],
          suggestedPatch: {
            eventId: secondary.id,
            patch: { startTime: proposedStart, endTime: proposedEnd },
          },
        });
      }
    }
  }

  // ── Pass 3: Deadline containment (HIGH) ──────────────────────────────────
  for (const clash of activeClashes) {
    if (clash.clashType !== "DEADLINE_CONTAINMENT") continue;

    const a = eventById.get(clash.eventA);
    const b = eventById.get(clash.eventB);
    if (!a || !b) continue;

    const deadline = a.type === "Deadline" ? a : b;
    const ranged = a.type === "Deadline" ? b : a;
    const deadlineVenue =
      deadline.venue && deadline.venue !== "TBD" ? deadline.venue : "submission office";
    const deadline12h = format12Hour(deadline.startTime);
    const rangedEnd12h = format12Hour(ranged.endTime);
    const rangedStart12h = format12Hour(ranged.startTime);

    const alreadyCovered = recommendations.some(
      (r) => r.relatedEventIds.includes(deadline.id) && r.actionType === "SHIFT_DEADLINE"
    );
    if (alreadyCovered) continue;

    recommendations.push({
      id: `rec-dc-${clash.id}`,
      priority: "HIGH",
      title: `Submit "${deadline.title}" before ${rangedStart12h}`,
      description:
        `The ${deadline12h} deadline for "${deadline.title}" falls during "${ranged.title}". ` +
        `Submit at ${deadlineVenue} before ${rangedStart12h} or ask the coordinator to accept a late submission after ${rangedEnd12h}.`,
      actionType: "SHIFT_DEADLINE",
      relatedEventIds: [deadline.id, ranged.id],
      suggestedPatch: {
        eventId: deadline.id,
        patch: { startTime: ranged.startTime, endTime: ranged.startTime },
      },
      draftEmail: {
        recipient: "Subject Coordinator",
        subject: `Submission Conflict: "${deadline.title}" — ${deadline.displayDate}`,
        body:
          `Dear Coordinator,\n\nThe submission deadline for "${deadline.title}" is at ${deadline12h},` +
          ` which falls during "${ranged.title}" (${rangedStart12h} – ${rangedEnd12h}).\n\n` +
          `Could I please submit before ${rangedStart12h}, or would a late submission after ${rangedEnd12h} be acceptable?\n\nThank you.`,
      },
    });
  }

  // ── Pass 4: Transit risk (MEDIUM) ────────────────────────────────────────
  for (const clash of activeClashes) {
    if (clash.clashType !== "TRANSIT_RISK") continue;

    const a = eventById.get(clash.eventA);
    const b = eventById.get(clash.eventB);
    if (!a || !b) continue;

    const earlier = toMinutes(a.startTime) <= toMinutes(b.startTime) ? a : b;
    const later = earlier.id === a.id ? b : a;

    recommendations.push({
      id: `rec-transit-${clash.id}`,
      priority: "MEDIUM",
      title: `Plan transit: "${earlier.title}" → "${later.title}"`,
      description:
        `"${earlier.title}" ends at ${format12Hour(earlier.endTime)} in ${earlier.venue}, ` +
        `and "${later.title}" starts at ${format12Hour(later.startTime)} in ${later.venue}. ` +
        `Allow at least 10 minutes for campus transit. Consider leaving "${earlier.venue}" 5 minutes early.`,
      actionType: "TRANSIT_BUFFER",
      relatedEventIds: [earlier.id, later.id],
    });
  }

  // ── Sort by priority ─────────────────────────────────────────────────────
  recommendations.sort((a, b) => priorityScore(a.priority) - priorityScore(b.priority));

  return { recommendations, rescheduleMap };
}

// ── findNextAvailableSlot (exported) ─────────────────────────────────────────

/**
 * Mathematical Auto-Reschedule Gap Finder.
 *
 * Given an event and the rest of the day's schedule, returns the earliest
 * conflict-free window that fits the event's original duration, starting
 * AFTER the last conflicting session ends.
 *
 * PS-02 sample result:
 *   Lecture 11:00 AM – 12:30 PM → 12:15 PM – 1:45 PM
 *   Opens 11:30 AM – 12:15 PM (45 min) for lab submission + transit.
 */
export function findNextAvailableSlot(
  targetEvent: DecodedEvent,
  allDayEvents: DecodedEvent[],
  options?: { transitBuffer?: number; dayEndMins?: number }
): RescheduleSuggestion | null {
  const transitBuffer = options?.transitBuffer ?? 5;
  const dayEndMins = options?.dayEndMins ?? 23 * 60;

  const duration = toMinutes(targetEvent.endTime) - toMinutes(targetEvent.startTime);
  if (duration <= 0) return null;

  const siblings = allDayEvents.filter(
    (e) => e.id !== targetEvent.id && e.dateISO === targetEvent.dateISO && e.type !== "Deadline"
  );

  const busySlots = siblings.map((e) => ({
    start: toMinutes(e.startTime),
    end: toMinutes(e.endTime || e.startTime),
  }));

  const targetStart = toMinutes(targetEvent.startTime);
  const targetEnd = toMinutes(targetEvent.endTime);

  const conflicting = busySlots.filter((s) => s.start < targetEnd && s.end > targetStart);
  const searchFrom =
    conflicting.length > 0
      ? Math.max(...conflicting.map((s) => s.end)) + transitBuffer
      : targetEnd + transitBuffer;

  const freeSlot = findFirstFreeSlot(busySlots, duration, searchFrom, dayEndMins);
  if (!freeSlot) return null;

  const proposedStart = fromMinutes(freeSlot.start);
  const proposedEnd = fromMinutes(freeSlot.end);
  // The freed window is the gap between the last CONFLICTING sibling's end and the proposed start.
  // (Not the target's own original end — that slot was already consumed by the overlap.)
  const lastConflictEnd =
    conflicting.length > 0 ? Math.max(...conflicting.map((s) => s.end)) : toMinutes(targetEvent.endTime);
  const freedStart = fromMinutes(lastConflictEnd);
  const freedEnd = proposedStart;
  const freedMins = freeSlot.start - lastConflictEnd;

  const narrative =
    `Shifting "${targetEvent.title}" from ${format12Hour(targetEvent.startTime)} – ${format12Hour(targetEvent.endTime)}` +
    ` to ${format12Hour(proposedStart)} – ${format12Hour(proposedEnd)}` +
    (freedMins > 0
      ? `, giving you ${freedMins} minutes (${format12Hour(freedStart)} – ${format12Hour(freedEnd)}) to handle pending submissions and transit.`
      : ".");

  return {
    eventId: targetEvent.id,
    eventTitle: targetEvent.title,
    originalStart: targetEvent.startTime,
    originalEnd: targetEvent.endTime,
    proposedStart,
    proposedEnd,
    freedWindowStart: freedStart,
    freedWindowEnd: freedEnd,
    freedWindowMinutes: Math.max(0, freedMins),
    transitMinutesToDeadlineVenue: 15,
    narrative,
    isDeadlineFeasible: freedMins >= 15,
  };
}