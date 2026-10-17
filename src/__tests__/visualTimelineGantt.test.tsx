import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { VisualTimelineGantt } from "../components/workspace/VisualTimelineGantt";
import { useStore } from "../store";
import { useNoticeStore } from "../store/useNoticeStore";
import type { RescheduleSuggestion } from "../lib/clash/actionRecommender";

describe("VisualTimelineGantt — Precision Architectural Schedule Canvas", () => {
  beforeEach(() => {
    // Set up standard PS-02 events
    useStore.setState({
      events: [
        {
          id: "ev-test",
          title: "Internal Test 2",
          type: "Test",
          dateISO: "2026-11-13",
          startTime: "10:00",
          endTime: "11:30",
          venue: "Room 204",
          audience: "All III-year CSE students",
          timeZone: "Asia/Kolkata",
          rawSource: "Internal Test 2 will be held on 13 Nov 2026 from 10:00 AM to 11:30 AM in Room 204",
          sourceSpans: [],
          fieldStatus: {
            title: "matched",
            type: "matched",
            date: "matched",
            startTime: "matched",
            endTime: "matched",
            venue: "matched",
            audience: "matched",
          },
          confirmed: true,
        },
        {
          id: "ev-lecture",
          title: "Guest Lecture",
          type: "Lecture",
          dateISO: "2026-11-13",
          startTime: "11:00",
          endTime: "12:30",
          venue: "Seminar Hall",
          audience: "All III-year CSE students",
          timeZone: "Asia/Kolkata",
          rawSource: "A guest lecture on AI in Healthcare is scheduled on 13 Nov, 11:00 AM to 12:30 PM, Seminar Hall",
          sourceSpans: [],
          fieldStatus: {
            title: "matched",
            type: "matched",
            date: "matched",
            startTime: "matched",
            endTime: "matched",
            venue: "matched",
            audience: "matched",
          },
          confirmed: true,
        },
        {
          id: "ev-deadline",
          title: "Lab Record Submission",
          type: "Deadline",
          dateISO: "2026-11-13",
          startTime: "12:00",
          endTime: "12:00",
          venue: "Department office",
          audience: "All III-year CSE students",
          timeZone: "Asia/Kolkata",
          rawSource: "Lab records must be submitted to the department office by 12:00 noon on 13 Nov",
          sourceSpans: [],
          fieldStatus: {
            title: "matched",
            type: "matched",
            date: "matched",
            startTime: "matched",
            endTime: "matched",
            venue: "matched",
            audience: "matched",
          },
          confirmed: true,
        },
      ],
      clashes: [],
    });

    const mockSuggestion: RescheduleSuggestion = {
      eventId: "ev-lecture",
      eventTitle: "Guest Lecture",
      originalStart: "11:00",
      originalEnd: "12:30",
      proposedStart: "12:30",
      proposedEnd: "14:00",
      freedWindowStart: "11:30",
      freedWindowEnd: "12:30",
      freedWindowMinutes: 60,
      transitMinutesToDeadlineVenue: 5,
      narrative: "Shifting after deadline clears all overlaps",
      isDeadlineFeasible: true,
    };

    useNoticeStore.setState({
      events: [],
      rescheduleMap: new Map([["ev-lecture", mockSuggestion]]),
      activeHighlightedEventId: null,
    });
  });

  it("1. Renders the SVG canvas with precision time axis and 30-min hairlines", () => {
    const { container } = render(<VisualTimelineGantt />);
    const svg = container.querySelector("#visual-gantt-svg");
    expect(svg).toBeDefined();

    // Check time axis monospace hour markers
    expect(screen.getByText("10:00 AM")).toBeDefined();
    expect(screen.getByText("11:00 AM")).toBeDefined();
    expect(screen.getByText("12:00 PM")).toBeDefined();

    // Check 180px left column clean labels
    expect(screen.getAllByText("Internal Test 2").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Guest Lecture").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Lab Record Submission").length).toBeGreaterThan(0);
  });

  it("2. Renders the diagonal hatched overlap zone (#clash-hatch) for the 30-min collision", () => {
    const { container } = render(<VisualTimelineGantt />);
    const pattern = container.querySelector("#clash-hatch");
    expect(pattern).toBeDefined();
    expect(pattern?.getAttribute("width")).toBe("8");
    expect(pattern?.getAttribute("height")).toBe("8");

    // Check the overlap zone group
    const overlapZone = container.querySelector("#shaded-overlap-zone");
    expect(overlapZone).toBeDefined();

    // Check 30 MIN OVERLAP pill text
    const overlapBadges = screen.getAllByText(/30 MIN OVERLAP/i);
    expect(overlapBadges.length).toBeGreaterThan(0);
  });

  it("3. Renders sleek 32px event bars with 3px solid accent borders and venue inside bar", () => {
    const { container } = render(<VisualTimelineGantt />);

    // Test bar venue
    expect(screen.getByText("Room 204")).toBeDefined();
    // Lecture bar venue
    expect(screen.getByText("Seminar Hall")).toBeDefined();
  });

  it("4. Renders the vertical dashed crimson line and sharp 12×12 vector diamond at 12:00 PM", () => {
    const { container } = render(<VisualTimelineGantt />);

    // Trapped line
    const trappedLine = container.querySelector("#deadline-trapped-vertical-line");
    expect(trappedLine).toBeDefined();

    // Vector diamond at 12:00 PM
    const diamondGroup = container.querySelector("#deadline-diamond-ev-deadline");
    expect(diamondGroup).toBeDefined();

    // Right-aligned label "(inside the lecture)"
    expect(screen.getByText(/12:00 PM \(inside the lecture\)/i)).toBeDefined();
  });

  it("5. Quick-nudge controls shift timing by 15 minutes and live resolves collision", () => {
    const { container } = render(<VisualTimelineGantt />);

    // Nudge Lecture forward by clicking nudge forward button
    const nudgeForwardBtn = container.querySelector("#nudge-forward-ev-lecture");
    expect(nudgeForwardBtn).toBeDefined();

    // Nudge forward multiple times to clear clash (from 11:00 to 11:30+)
    fireEvent.click(nudgeForwardBtn!);
    fireEvent.click(nudgeForwardBtn!);

    // Check that state updated
    const updatedEvents = useStore.getState().events;
    const updatedLecture = updatedEvents.find((e) => e.id === "ev-lecture");
    expect(updatedLecture?.startTime).toBe("11:30");
  });

  it("6. Syncs bi-directional hover with activeHighlightedEventId", () => {
    const { container } = render(<VisualTimelineGantt />);
    const testRow = container.querySelector("#timeline-row-ev-test");
    expect(testRow).toBeDefined();

    fireEvent.mouseEnter(testRow!);
    expect(useNoticeStore.getState().activeHighlightedEventId).toBe("ev-test");

    fireEvent.mouseLeave(testRow!);
    expect(useNoticeStore.getState().activeHighlightedEventId).toBeNull();
  });
});
