import { describe, it, expect } from "vitest";
import {
  computeCompoundBusyBlocks,
  findTrappedDeadlines,
  generateCompoundBusyInsights,
  analyzeCompoundSchedule,
} from "../lib/clash/compoundAnalyzer";
import { parseNoticeText } from "../lib/parser/entityExtractor";
import {
  OFFICIAL_PS02_NOTICE,
  EXPECTED_PS02_OUTPUT,
} from "../lib/fixtures/sampleNotices";
import type { DecodedEvent } from "../types/notice";

describe("CompoundAnalyzer - 1. Sweep-Line Interval Merge on PS-02 Benchmark", () => {
  const events = parseNoticeText(OFFICIAL_PS02_NOTICE);

  it("merges Internal Test 2 (10:00-11:30) and Guest Lecture (11:00-12:30) into 10:00-12:30 (150 mins)", () => {
    const blocks = computeCompoundBusyBlocks(events);

    expect(blocks.length).toBe(1);
    const block = blocks[0]!;

    expect(block.dateISO).toBe("2026-11-13");
    expect(block.mergedStart).toBe("10:00");
    expect(block.mergedEnd).toBe("12:30");
    expect(block.durationMinutes).toBe(150);
    expect(block.displayWindow).toBe("10:00 AM – 12:30 PM");

    // Both ranged events must be present in the merged block
    expect(block.events.length).toBe(2);
    expect(block.events.some((e) => e.type === "Test")).toBe(true);
    expect(block.events.some((e) => e.type === "Lecture")).toBe(true);
  });

  it("identifies that the 12:00 PM record submission deadline is trapped in the merged block", () => {
    const blocks = computeCompoundBusyBlocks(events);
    const block = blocks[0]!;

    expect(block.trappedDeadlines.length).toBe(1);
    const deadline = block.trappedDeadlines[0]!;
    expect(deadline.type).toBe("Deadline");
    expect(deadline.startTime).toBe("12:00");
    expect(deadline.title).toBe("Lab record submission");
  });
});

describe("CompoundAnalyzer - 2. False Sense of Security & True Last Free Window", () => {
  const events = parseNoticeText(OFFICIAL_PS02_NOTICE);

  it("detects that naive test ending at 11:30 AM is bridged by lecture, moving True Last Free Window to 10:00 AM", () => {
    const trapped = findTrappedDeadlines(events);
    expect(trapped.length).toBe(1);

    const detail = trapped[0]!;

    expect(detail.deadlineTime).toBe("12:00");
    expect(detail.deadlineTime12h).toBe("12:00 PM");
    expect(detail.busyBlockStart).toBe("10:00");
    expect(detail.busyBlockStart12h).toBe("10:00 AM");
    expect(detail.busyBlockEnd).toBe("12:30");
    expect(detail.busyBlockEnd12h).toBe("12:30 PM");
    expect(detail.busyBlockDurationMinutes).toBe(150);

    // Naive prior event is Internal Test 2 ending at 11:30 AM
    expect(detail.naivePriorEvent).toBeDefined();
    expect(detail.naivePriorEvent?.title).toBe("Internal Test 2");
    expect(detail.naiveFreeWindowEnd).toBe("11:30");
    expect(detail.naiveFreeWindowEnd12h).toBe("11:30 AM");

    // True Last Free Window ends at 10:00 AM (start of the compound busy block)
    expect(detail.trueLastFreeWindowEnd).toBe("10:00");
    expect(detail.trueLastFreeWindowEnd12h).toBe("10:00 AM");
    expect(detail.isCompoundTrapped).toBe(true);

    // Check explanation text meets PS-02 requirements
    expect(detail.explanation).toContain("Internal Test 2");
    expect(detail.explanation).toContain("ends at 11:30 AM");
    expect(detail.explanation).toContain("before the 12:00 PM deadline");
    expect(detail.explanation).toContain("continuously occupied from 10:00 AM to 12:30 PM");
    expect(detail.explanation).toContain("150 minutes continuous commitment");
    expect(detail.explanation).toContain("True Last Free Window before the 12:00 PM deadline ends at 10:00 AM, not 11:30 AM");

    expect(detail.summary).toBe(
      "The student's True Last Free Window before the 12:00 PM deadline ends at 10:00 AM, not 11:30 AM."
    );
  });
});

describe("CompoundAnalyzer - 3. Structured CompoundBusyInsight", () => {
  it("generates date-level CompoundBusyInsight with continuous commitment window and summary", () => {
    const insights = generateCompoundBusyInsights(EXPECTED_PS02_OUTPUT.events);
    expect(insights.length).toBe(1);

    const insight = insights[0]!;
    expect(insight.dateISO).toBe("2026-11-13");
    expect(insight.displayDate).toBe("13 Nov 2026");
    expect(insight.totalBusyMinutes).toBe(150);
    expect(insight.continuousCommitmentWindow).toBe("10:00 AM – 12:30 PM");
    expect(insight.busyBlocks.length).toBe(1);
    expect(insight.trappedDeadlines.length).toBe(1);
    expect(insight.summary).toContain("True Last Free Window before the 12:00 PM deadline ends at 10:00 AM, not 11:30 AM");
    expect(insight.explanations.length).toBe(1);
  });

  it("runs master analyzeCompoundSchedule and provides high-level schedule audit", () => {
    const analysis = analyzeCompoundSchedule(EXPECTED_PS02_OUTPUT.events);
    expect(analysis.busyBlocks.length).toBe(1);
    expect(analysis.insights.length).toBe(1);
    expect(analysis.trappedDeadlines.length).toBe(1);
    expect(analysis.summary).toContain("Detected 1 continuous busy block(s) with 1 trapped submission deadline(s)");
  });
});

describe("CompoundAnalyzer - 4. Multi-Interval & Edge Case Behaviors", () => {
  it("keeps disjoint morning and afternoon sessions as separate compound blocks", () => {
    const mockEvents: DecodedEvent[] = [
      {
        id: "e1",
        title: "Morning Lab",
        type: "Test",
        dateISO: "2026-11-13",
        displayDate: "13 Nov 2026",
        startTime: "09:00",
        endTime: "10:30",
        venue: "Lab 1",
        cohort: "CSE",
        confidence: 95,
        needsReview: false,
        sourceSpan: { start: 0, end: 10, rawSentence: "" },
      },
      {
        id: "e2",
        title: "Afternoon Workshop",
        type: "Lecture",
        dateISO: "2026-11-13",
        displayDate: "13 Nov 2026",
        startTime: "14:00",
        endTime: "16:00",
        venue: "Auditorium",
        cohort: "CSE",
        confidence: 95,
        needsReview: false,
        sourceSpan: { start: 0, end: 10, rawSentence: "" },
      },
    ];

    const blocks = computeCompoundBusyBlocks(mockEvents);
    expect(blocks.length).toBe(2);
    expect(blocks[0]!.mergedStart).toBe("09:00");
    expect(blocks[0]!.mergedEnd).toBe("10:30");
    expect(blocks[1]!.mergedStart).toBe("14:00");
    expect(blocks[1]!.mergedEnd).toBe("16:00");
  });

  it("merges back-to-back contiguous sessions with zero minute gap", () => {
    const contiguousEvents: DecodedEvent[] = [
      {
        id: "c1",
        title: "Lecture A",
        type: "Lecture",
        dateISO: "2026-11-13",
        displayDate: "13 Nov 2026",
        startTime: "10:00",
        endTime: "11:00",
        venue: "Room 101",
        cohort: "CSE",
        confidence: 95,
        needsReview: false,
        sourceSpan: { start: 0, end: 10, rawSentence: "" },
      },
      {
        id: "c2",
        title: "Lecture B",
        type: "Lecture",
        dateISO: "2026-11-13",
        displayDate: "13 Nov 2026",
        startTime: "11:00",
        endTime: "12:00",
        venue: "Room 102",
        cohort: "CSE",
        confidence: 95,
        needsReview: false,
        sourceSpan: { start: 0, end: 10, rawSentence: "" },
      },
    ];

    const blocks = computeCompoundBusyBlocks(contiguousEvents);
    expect(blocks.length).toBe(1);
    expect(blocks[0]!.mergedStart).toBe("10:00");
    expect(blocks[0]!.mergedEnd).toBe("12:00");
    expect(blocks[0]!.durationMinutes).toBe(120);
  });

  it("correctly flags deadline outside busy window as not trapped", () => {
    const eventsWithOutsideDeadline: DecodedEvent[] = [
      ...EXPECTED_PS02_OUTPUT.events.filter((e) => e.type !== "Deadline"),
      {
        id: "d-outside",
        title: "Evening Online Quiz",
        type: "Deadline",
        dateISO: "2026-11-13",
        displayDate: "13 Nov 2026",
        startTime: "17:00",
        endTime: "17:00",
        venue: "Portal",
        cohort: "III-year CSE",
        confidence: 95,
        needsReview: false,
        sourceSpan: { start: 0, end: 10, rawSentence: "" },
      },
    ];

    const blocks = computeCompoundBusyBlocks(eventsWithOutsideDeadline);
    expect(blocks.length).toBe(1);
    expect(blocks[0]!.trappedDeadlines.length).toBe(0);

    const trapped = findTrappedDeadlines(eventsWithOutsideDeadline);
    expect(trapped.length).toBe(0);
  });
});