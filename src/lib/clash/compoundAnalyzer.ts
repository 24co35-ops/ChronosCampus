// 🔬 ChronosCampus Compound Busy Block & Continuous Schedule Analyzer 🔬
// Implements O(N log N) sweep-line interval merge algorithm U = ⋃ [Si, Ei]
// Goes beyond naive pairwise clash checks to identify compound commitments:
// 1. Merges overlapping and contiguous ranged sessions into unified continuous busy blocks.
// 2. Evaluates trapped deadlines within compound blocks.
// 3. Detects "False Sense of Security" where a prior event ends before a deadline,
//    but an overlapping session extends across the deadline window.
// 4. Computes the student's "True Last Free Window" before submission deadlines.

import type {
  DecodedEvent,
  CompoundBusyBlock,
  TrappedDeadlineDetail,
  CompoundBusyInsight,
} from "@/src/types/notice";
import {
  toMinutes,
  fromMinutes,
  format12Hour,
  validateEventTimes,
} from "./pairwiseEngine";

export type { TrappedDeadlineDetail, CompoundBusyInsight };

/**
 * Result contract for complete compound schedule analysis.
 */
export interface CompoundScheduleAnalysis {
  busyBlocks: CompoundBusyBlock[];
  insights: CompoundBusyInsight[];
  trappedDeadlines: TrappedDeadlineDetail[];
  summary: string;
}

/**
 * 1. O(N log N) Sweep-Line Interval Merge Algorithm.
 * Merges all overlapping and contiguous ranged academic events (Test & Lecture)
 * into continuous busy commitments U = ⋃ [Si, Ei] on each calendar date.
 */
export function computeCompoundBusyBlocks(
  events: DecodedEvent[]
): CompoundBusyBlock[] {
  const validDated = events.filter((e) => e.dateISO && e.startTime);
  const dates = Array.from(new Set(validDated.map((e) => e.dateISO))).sort();
  const allBlocks: CompoundBusyBlock[] = [];

  for (const date of dates) {
    const dayRanged = validDated.filter((e) => {
      if (e.dateISO !== date || e.type === "Deadline" || !e.endTime) return false;
      const valid = validateEventTimes(e);
      return valid.isValid;
    });

    const dayDeadlines = validDated.filter(
      (e) => e.dateISO === date && e.type === "Deadline"
    );

    if (dayRanged.length === 0) continue;

    // O(N log N) sort by startTime ascending, breaking ties with longer interval first
    const sorted = [...dayRanged].sort((a, b) => {
      const aStart = toMinutes(a.startTime);
      const bStart = toMinutes(b.startTime);
      if (aStart !== bStart) return aStart - bStart;
      return toMinutes(b.endTime) - toMinutes(a.endTime);
    });

    let currentBlock: CompoundBusyBlock = {
      dateISO: date,
      mergedStart: sorted[0]!.startTime,
      mergedEnd: sorted[0]!.endTime,
      events: [sorted[0]!],
      trappedDeadlines: [],
    };

    const dateMerged: CompoundBusyBlock[] = [];

    for (let i = 1; i < sorted.length; i++) {
      const ev = sorted[i]!;
      const evStart = toMinutes(ev.startTime);
      const evEnd = toMinutes(ev.endTime);
      const currEnd = toMinutes(currentBlock.mergedEnd);

      // Overlap or contiguous back-to-back transition (evStart <= currEnd)
      if (evStart <= currEnd) {
        if (evEnd > currEnd) {
          currentBlock.mergedEnd = fromMinutes(evEnd);
        }
        currentBlock.events.push(ev);
      } else {
        // Disjoint window: finalize current block and begin a new interval
        finalizeBlockMetadata(currentBlock);
        dateMerged.push(currentBlock);

        currentBlock = {
          dateISO: date,
          mergedStart: ev.startTime,
          mergedEnd: ev.endTime,
          events: [ev],
          trappedDeadlines: [],
        };
      }
    }

    finalizeBlockMetadata(currentBlock);
    dateMerged.push(currentBlock);

    // Identify trapped deadlines inside each continuous busy window
    for (const block of dateMerged) {
      const bStart = toMinutes(block.mergedStart);
      const bEnd = toMinutes(block.mergedEnd);

      block.trappedDeadlines = dayDeadlines.filter((dl) => {
        const dlTime = toMinutes(dl.startTime);
        return bStart <= dlTime && dlTime <= bEnd;
      });

      allBlocks.push(block);
    }
  }

  return allBlocks;
}

/**
 * Attaches calculated duration and display window metadata to a compound block.
 */
function finalizeBlockMetadata(block: CompoundBusyBlock): void {
  const duration =
    toMinutes(block.mergedEnd) - toMinutes(block.mergedStart);
  block.durationMinutes = Math.max(0, duration);
  block.displayWindow = `${format12Hour(block.mergedStart)} – ${format12Hour(
    block.mergedEnd
  )}`;
}

/**
 * 2. Trapped Deadline & "True Last Free Window" Analyzer.
 * Detects deadlines falling within compound busy blocks. Identifies when naive
 * pairwise comparisons provide a false sense of security (e.g. prior test ending
 * before the deadline while an overlapping lecture blocks the entire window).
 */
export function findTrappedDeadlines(
  events: DecodedEvent[],
  existingBlocks?: CompoundBusyBlock[]
): TrappedDeadlineDetail[] {
  const blocks = existingBlocks ?? computeCompoundBusyBlocks(events);
  const details: TrappedDeadlineDetail[] = [];

  for (const block of blocks) {
    if (!block.trappedDeadlines || block.trappedDeadlines.length === 0) continue;

    const bStartMins = toMinutes(block.mergedStart);
    const bEndMins = toMinutes(block.mergedEnd);
    const blockDuration =
      block.durationMinutes ?? bEndMins - bStartMins;
    const blockStart12h = format12Hour(block.mergedStart);
    const blockEnd12h = format12Hour(block.mergedEnd);

    for (const deadline of block.trappedDeadlines) {
      const dMins = toMinutes(deadline.startTime);
      const deadline12h = format12Hour(deadline.startTime);

      // Find events in the block that conclude at or before the deadline
      const priorEvents = block.events
        .filter((e) => toMinutes(e.endTime || e.startTime) <= dMins)
        .sort(
          (a, b) =>
            toMinutes(b.endTime || b.startTime) -
            toMinutes(a.endTime || a.startTime)
        );

      const naivePrior = priorEvents[0];

      // Identify subsequent or overlapping sessions that bridge across the gap
      const bridgingEvents = block.events.filter((e) => {
        if (naivePrior && e.id === naivePrior.id) return false;
        const eStart = toMinutes(e.startTime);
        const eEnd = toMinutes(e.endTime || e.startTime);
        const checkThreshold = naivePrior
          ? toMinutes(naivePrior.endTime)
          : dMins;
        return eStart <= checkThreshold && eEnd >= dMins;
      });

      const isCompound =
        Boolean(naivePrior && bridgingEvents.length > 0) ||
        block.events.length > 1;

      const trueLastFreeWindowEnd = block.mergedStart;
      const trueLastFreeWindowEnd12h = blockStart12h;

      let explanation: string;
      let summary: string;

      if (naivePrior && bridgingEvents.length > 0) {
        const naiveEnd12h = format12Hour(naivePrior.endTime);
        const bridgeTitles = bridgingEvents
          .map((b) => `"${b.title}"`)
          .join(" and ");

        explanation = `Even though "${naivePrior.title}" ends at ${naiveEnd12h} (before the ${deadline12h} deadline), the student is continuously occupied from ${blockStart12h} to ${blockEnd12h} (${blockDuration} minutes continuous commitment) because of the overlapping ${bridgeTitles}. The student's True Last Free Window before the ${deadline12h} deadline ends at ${blockStart12h}, not ${naiveEnd12h}.`;
        summary = `The student's True Last Free Window before the ${deadline12h} deadline ends at ${blockStart12h}, not ${naiveEnd12h}.`;
      } else {
        explanation = `The ${deadline12h} deadline for "${deadline.title}" falls during a continuous ${blockDuration}-minute busy block from ${blockStart12h} to ${blockEnd12h}. The student's True Last Free Window before the deadline ends at ${blockStart12h}.`;
        summary = `The student's True Last Free Window before the ${deadline12h} deadline ends at ${blockStart12h}.`;
      }

      details.push({
        deadline,
        deadlineId: deadline.id,
        deadlineTitle: deadline.title,
        deadlineTime: deadline.startTime,
        deadlineTime12h: deadline12h,
        venue: deadline.venue,
        busyBlock: block,
        busyBlockStart: block.mergedStart,
        busyBlockStart12h: blockStart12h,
        busyBlockEnd: block.mergedEnd,
        busyBlockEnd12h: blockEnd12h,
        busyBlockDurationMinutes: blockDuration,
        eventsInBlock: block.events,
        naivePriorEvent: naivePrior,
        naiveFreeWindowEnd: naivePrior?.endTime,
        naiveFreeWindowEnd12h: naivePrior
          ? format12Hour(naivePrior.endTime)
          : undefined,
        trueLastFreeWindowEnd,
        trueLastFreeWindowEnd12h,
        isCompoundTrapped: isCompound,
        explanation,
        summary,
      });
    }
  }

  return details;
}

/**
 * 3. Generates structured CompoundBusyInsight objects grouped by date.
 */
export function generateCompoundBusyInsights(
  events: DecodedEvent[]
): CompoundBusyInsight[] {
  const blocks = computeCompoundBusyBlocks(events);
  const trapped = findTrappedDeadlines(events, blocks);
  const dates = Array.from(new Set(blocks.map((b) => b.dateISO))).sort();

  const insights: CompoundBusyInsight[] = [];

  for (const date of dates) {
    const dayBlocks = blocks.filter((b) => b.dateISO === date);
    const dayTrapped = trapped.filter((t) => t.busyBlock.dateISO === date);
    const totalMinutes = dayBlocks.reduce(
      (acc, b) => acc + (b.durationMinutes ?? 0),
      0
    );

    const representativeEvent = events.find((e) => e.dateISO === date);
    const displayDate = representativeEvent?.displayDate || date;

    const windows = dayBlocks.map((b) => b.displayWindow || "").filter(Boolean);
    const continuousCommitmentWindow = windows.join(", ");

    const explanations = dayTrapped.map((t) => t.explanation);

    let summary = "";
    if (dayTrapped.length > 0) {
      summary = dayTrapped.map((t) => t.summary).join(" ");
    } else if (dayBlocks.length > 0) {
      summary = `Continuous scheduled busy block on ${displayDate}: ${continuousCommitmentWindow} (${totalMinutes} minutes total commitment).`;
    } else {
      summary = `No continuous busy blocks on ${displayDate}.`;
    }

    insights.push({
      dateISO: date,
      displayDate,
      busyBlocks: dayBlocks,
      trappedDeadlines: dayTrapped,
      totalBusyMinutes: totalMinutes,
      continuousCommitmentWindow,
      summary,
      explanations,
    });
  }

  return insights;
}

/**
 * 4. Master analysis combining sweep-line blocks, insights, and trapped deadlines.
 */
export function analyzeCompoundSchedule(
  events: DecodedEvent[]
): CompoundScheduleAnalysis {
  const busyBlocks = computeCompoundBusyBlocks(events);
  const insights = generateCompoundBusyInsights(events);
  const trappedDeadlines = findTrappedDeadlines(events, busyBlocks);

  const totalTrapped = trappedDeadlines.length;
  const totalBlocks = busyBlocks.length;

  let summary = "";
  if (totalTrapped > 0) {
    summary = `Detected ${totalBlocks} continuous busy block(s) with ${totalTrapped} trapped submission deadline(s). Student free windows end prior to compound block starts.`;
  } else if (totalBlocks > 0) {
    summary = `Identified ${totalBlocks} continuous busy commitment block(s). No deadlines trapped.`;
  } else {
    summary = "Schedule is fully clear without overlapping or continuous blocks.";
  }

  return {
    busyBlocks,
    insights,
    trappedDeadlines,
    summary,
  };
}