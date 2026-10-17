import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RawIcsPreviewDrawer } from "../components/workspace/RawIcsPreviewDrawer";
import type { DecodedEvent, PairwiseClashResult, ActionRecommendation } from "../types/notice";

describe("RawIcsPreviewDrawer", () => {
  const sampleEvents: DecodedEvent[] = [
    {
      id: "ev-1",
      title: "Algorithms Midterm",
      type: "Test",
      dateISO: "2026-11-13",
      displayDate: "13 Nov 2026",
      startTime: "10:00",
      endTime: "11:30",
      venue: "Hall A",
      cohort: "III-year CSE",
      confidence: 96,
      needsReview: false,
      sourceSpan: {
        start: 0,
        end: 50,
        rawSentence: "Midterm test on 13/11/2026 from 10:00 to 11:30 in Hall A.",
      },
    },
    {
      id: "ev-2",
      title: "Project Submission",
      type: "Deadline",
      dateISO: "2026-11-13",
      displayDate: "13 Nov 2026",
      startTime: "12:00",
      endTime: "12:00",
      venue: "Faculty Room",
      cohort: "III-year CSE",
      confidence: 92,
      needsReview: false,
      sourceSpan: {
        start: 51,
        end: 100,
        rawSentence: "Submit reports by 12:00 PM.",
      },
    },
  ];

  const sampleClashes: PairwiseClashResult[] = [
    {
      id: "clash-1-2",
      eventA: "ev-1",
      eventB: "ev-2",
      hasClash: false,
      clashType: "NO_CLASH",
      overlapMinutes: 0,
      overlapWindow: null,
      explanation: "No overlap",
      severity: "SAFE",
    },
  ];

  const sampleRecommendations: ActionRecommendation[] = [
    {
      id: "rec-1",
      priority: "LOW",
      title: "Verify Room Availability",
      description: "Confirm Hall A reservation with department coordinator.",
      actionType: "NOTIFY_FACULTY",
      relatedEventIds: ["ev-1"],
    },
  ];

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <RawIcsPreviewDrawer
        isOpen={false}
        onClose={vi.fn()}
        events={sampleEvents}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders RFC-5545 inspector when isOpen is true", () => {
    render(
      <RawIcsPreviewDrawer
        isOpen={true}
        onClose={vi.fn()}
        events={sampleEvents}
        clashes={sampleClashes}
        recommendations={sampleRecommendations}
      />
    );

    expect(screen.getByText("RFC-5545 Raw .ics File Inspector")).toBeDefined();
    expect(screen.getByText("Valid RFC-5545")).toBeDefined();
    expect(screen.getByText("BEGIN:VCALENDAR")).toBeDefined();
    expect(screen.getByText("END:VCALENDAR")).toBeDefined();
  });

  it("displays compliance telemetry pills for CRLF and 75-octet limit", () => {
    render(
      <RawIcsPreviewDrawer
        isOpen={true}
        onClose={vi.fn()}
        events={sampleEvents}
      />
    );

    expect(screen.getByText(/CRLF Check:/i)).toBeDefined();
    expect(screen.getByText(/Max Octets:/i)).toBeDefined();
    expect(screen.getByText(/VEVENTs:/i)).toBeDefined();
  });

  it("calls onClose when close button is clicked", () => {
    const handleClose = vi.fn();
    render(
      <RawIcsPreviewDrawer
        isOpen={true}
        onClose={handleClose}
        events={sampleEvents}
      />
    );

    const closeBtn = screen.getByLabelText("Close inspector drawer");
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("toggles CRLF marker view when CRLF button is clicked", () => {
    render(
      <RawIcsPreviewDrawer
        isOpen={true}
        onClose={vi.fn()}
        events={sampleEvents}
      />
    );

    const crlfToggleBtn = screen.getByText(/CRLF Marks: OFF/i);
    fireEvent.click(crlfToggleBtn);
    expect(screen.getByText(/CRLF Marks: ON/i)).toBeDefined();
    // CRLF symbols rendered
    expect(screen.getAllByText(/\\r\\n↵/).length).toBeGreaterThan(0);
  });
});
