import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ShareableScheduleCard } from "../components/workspace/ShareableScheduleCard";
import type { ReviewedEvent } from "../types";

const mockEvents: ReviewedEvent[] = [
  {
    id: "evt-1",
    title: "Special Guest Lecture on AI Ethics",
    type: "Lecture",
    dateISO: "2026-11-13",
    startTime: "10:00",
    endTime: "11:30",
    venue: "Auditorium Hall A",
    audience: "III-Year CSE",
    timeZone: "Asia/Kolkata",
    rawSource: "",
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
    id: "evt-2",
    title: "Mid-Term DBMS Laboratory Examination",
    type: "Test",
    dateISO: "2026-11-13",
    startTime: "11:00",
    endTime: "13:00",
    venue: "Lab 304, Computer Center",
    audience: "III-Year CSE",
    timeZone: "Asia/Kolkata",
    rawSource: "",
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
    id: "evt-3",
    title: "Assignment Submission Deadline",
    type: "Deadline",
    dateISO: "2026-11-13",
    startTime: "12:00",
    endTime: "12:00",
    venue: "Portal Upload",
    audience: "III-Year CSE",
    timeZone: "Asia/Kolkata",
    rawSource: "",
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
];

const mockClashes = [
  {
    eventA: mockEvents[0],
    eventB: mockEvents[1],
    clashType: "HARD_OVERLAP",
    severity: "CRITICAL",
    overlapMinutes: 30,
  },
];

describe("ShareableScheduleCard — Class WhatsApp Sharing", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("does not render when isOpen is false", () => {
    render(
      <ShareableScheduleCard
        isOpen={false}
        onClose={vi.fn()}
        events={mockEvents}
        clashes={mockClashes}
      />
    );
    expect(document.getElementById("shareable-schedule-card-modal")).toBeNull();
  });

  it("renders screenshot-ready visual summary card with Cohort badge and date when isOpen is true", () => {
    render(
      <ShareableScheduleCard
        isOpen={true}
        onClose={vi.fn()}
        events={mockEvents}
        clashes={mockClashes}
        cohort="III-Year CSE"
      />
    );

    const modal = document.getElementById("shareable-schedule-card-modal");
    expect(modal).toBeTruthy();

    const canvasCard = document.getElementById("shareable-schedule-card-canvas");
    expect(canvasCard).toBeTruthy();

    // Verify Cohort badge & header info
    expect(canvasCard?.textContent).toContain("III-Year CSE");
    expect(canvasCard?.textContent).toContain("ChronosCampus");
    expect(canvasCard?.textContent).toContain("Class Timetable");
  });

  it("renders clean events table with title, type, timings, and venues", () => {
    render(
      <ShareableScheduleCard
        isOpen={true}
        onClose={vi.fn()}
        events={mockEvents}
        clashes={mockClashes}
      />
    );

    expect(screen.getByText("Special Guest Lecture on AI Ethics")).toBeTruthy();
    expect(screen.getByText("Mid-Term DBMS Laboratory Examination")).toBeTruthy();
    expect(screen.getByText("Assignment Submission Deadline")).toBeTruthy();

    expect(screen.getByText("Auditorium Hall A")).toBeTruthy();
    expect(screen.getByText("Lab 304, Computer Center")).toBeTruthy();
  });

  it("displays prominent clash warning banner when clashes exist", () => {
    render(
      <ShareableScheduleCard
        isOpen={true}
        onClose={vi.fn()}
        events={mockEvents}
        clashes={mockClashes}
      />
    );

    const canvasCard = document.getElementById("shareable-schedule-card-canvas");
    expect(canvasCard?.textContent).toContain("Notice Overlap Warning");
  });

  it("displays emerald conflict-free seal when clashes is empty", () => {
    render(
      <ShareableScheduleCard
        isOpen={true}
        onClose={vi.fn()}
        events={mockEvents}
        clashes={[]}
      />
    );

    const canvasCard = document.getElementById("shareable-schedule-card-canvas");
    expect(canvasCard?.textContent).toContain("100% Conflict-Free Schedule");
  });

  it("renders dynamically generated SVG QR code with vector rect modules", () => {
    render(
      <ShareableScheduleCard
        isOpen={true}
        onClose={vi.fn()}
        events={mockEvents}
        clashes={mockClashes}
      />
    );

    const qrContainer = document.getElementById("schedule-qr-code");
    expect(qrContainer).toBeTruthy();

    const qrSvg = document.getElementById("schedule-qr-matrix");
    expect(qrSvg).toBeTruthy();
    const rects = qrSvg?.querySelectorAll("rect");
    expect(rects && rects.length).toBeGreaterThan(50);
  });

  it("copies clean WhatsApp markdown (*bold* and emojis) to clipboard", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(
      <ShareableScheduleCard
        isOpen={true}
        onClose={vi.fn()}
        events={mockEvents}
        clashes={mockClashes}
        cohort="III-Year CSE"
      />
    );

    const copyBtn = document.getElementById("copy-whatsapp-text-btn");
    expect(copyBtn).toBeTruthy();

    await act(async () => {
      fireEvent.click(copyBtn!);
    });

    expect(writeTextMock).toHaveBeenCalledTimes(1);
    const copiedText = writeTextMock.mock.calls[0]?.[0] as string;

    // Verify WhatsApp formatting
    expect(copiedText).toContain("*OFFICIAL CLASS SCHEDULE UPDATE*");
    expect(copiedText).toContain("*Cohort:* III-Year CSE");
    expect(copiedText).toContain("*1. Special Guest Lecture on AI Ethics*");
    expect(copiedText).toContain("⏰ *Time:*");
    expect(copiedText).toContain("📍 *Venue:* Auditorium Hall A");
    expect(copiedText).toContain("⚠️ *Clash Warning:*");
  });

  it("triggers download visual card and .ics without errors", () => {
    const createObjectURLMock = vi.fn().mockReturnValue("blob:mock-url");
    const revokeObjectURLMock = vi.fn();
    window.URL.createObjectURL = createObjectURLMock;
    window.URL.revokeObjectURL = revokeObjectURLMock;

    render(
      <ShareableScheduleCard
        isOpen={true}
        onClose={vi.fn()}
        events={mockEvents}
        clashes={mockClashes}
      />
    );

    const downloadCardBtn = document.getElementById("download-visual-card-btn");
    const downloadIcsBtn = document.getElementById("download-card-ics-btn");

    expect(downloadCardBtn).toBeTruthy();
    expect(downloadIcsBtn).toBeTruthy();

    act(() => {
      fireEvent.click(downloadCardBtn!);
    });

    act(() => {
      fireEvent.click(downloadIcsBtn!);
    });

    expect(createObjectURLMock).toHaveBeenCalled();
  });
});

import { EditableEventGrid } from "../components/workspace/EditableEventGrid";
import { useStore } from "../store";

describe("EditableEventGrid — Export Schedule Card Button Integration", () => {
  it("renders '📸 Export Clean Schedule Card' button next to .ics export button and opens modal upon click", () => {
    // Seed store with events
    act(() => {
      useStore.setState({
        events: mockEvents,
      });
    });

    render(<EditableEventGrid />);

    const exportCardBtn = document.getElementById("export-schedule-card-btn");
    const exportIcsBtn = document.getElementById("export-ics-btn");

    expect(exportCardBtn).toBeTruthy();
    expect(exportIcsBtn).toBeTruthy();
    expect(exportCardBtn?.textContent).toContain("Export Clean Schedule Card");

    // Click to open modal
    act(() => {
      fireEvent.click(exportCardBtn!);
    });

    expect(document.getElementById("shareable-schedule-card-modal")).toBeTruthy();
    expect(document.getElementById("shareable-schedule-card-canvas")).toBeTruthy();
  });
});
