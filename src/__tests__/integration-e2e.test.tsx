/**
 * integration-e2e.test.tsx — Complete PS-02 Golden Path E2E & Evaluation Flow Test
 *
 * Simulates the exact judge evaluation flow from start to finish:
 * 1. Render the application and load the official PS-02 sample notice.
 * 2. Assert all 3 events appear in the editable grid with exact dates, times, and venues.
 * 3. Assert all 3 pairwise clash check rows match the PS-02 document results:
 *    - 30 minutes overlap between Test and Guest Lecture (11:00 to 11:30 AM).
 *    - 12:00 PM deadline falls during the lecture.
 *    - No clash between Test and record submission deadline.
 * 4. Simulate user editing the Guest Lecture time to 12:30 PM - 2:00 PM and assert all clashes flip to No Clash.
 * 5. Trigger .ics export and verify RFC-5545 calendar stream syntax.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import Home from "../app/page";
import { useNoticeStore } from "../store/useNoticeStore";
import { useStore } from "../store";
import { OFFICIAL_PS02_NOTICE } from "../lib/fixtures/sampleNotices";
import { generateIcs } from "../lib/ics/icsGenerator";

describe("PS-02 Golden Path — Full Integration & Evaluation Flow", () => {
  let createdBlob: Blob | null = null;

  beforeEach(() => {
    vi.restoreAllMocks();
    createdBlob = null;

    // Reset stores to clean state
    act(() => {
      useStore.getState().reset();
      useNoticeStore.setState({
        viewMode: "STUDENT",
        rawNoticeText: "",
        events: [],
        pairwiseClashes: [],
      });
    });

    // Mock URL object methods for .ics download capture
    window.URL.createObjectURL = vi.fn((blob: Blob) => {
      createdBlob = blob;
      return "blob:mock-ics-url";
    });
    window.URL.revokeObjectURL = vi.fn();
  });

  it("executes the entire PS-02 evaluation flow from notice load to conflict resolution and .ics export", async () => {
    // ── 1. Render Application Shell ──────────────────────────────────────────
    render(<Home />);

    // Load the official PS-02 sample notice via the benchmark preset pill
    const presetBtn = document.getElementById("preset-ps02-official");
    expect(presetBtn).toBeTruthy();

    await act(async () => {
      fireEvent.click(presetBtn!);
    });

    // ── 2. Assert All 3 Events in Editable Grid with Exact Fields ────────────
    const titleInput0 = document.getElementById("title-input-0") as HTMLInputElement;
    const titleInput1 = document.getElementById("title-input-1") as HTMLInputElement;
    const titleInput2 = document.getElementById("title-input-2") as HTMLInputElement;

    expect(titleInput0).toBeTruthy();
    expect(titleInput1).toBeTruthy();
    expect(titleInput2).toBeTruthy();

    // Event 1: Internal Test 2
    expect(titleInput0.value).toBe("Internal Test 2");
    const dateInput0 = document.getElementById("date-input-0") as HTMLInputElement;
    expect(dateInput0.value).toBe("2026-11-13");
    const startInput0 = document.getElementById("start-time-input-0") as HTMLInputElement;
    const endInput0 = document.getElementById("end-time-input-0") as HTMLInputElement;
    expect(startInput0.value).toBe("10:00");
    expect(endInput0.value).toBe("11:30");
    const venueInput0 = document.getElementById("venue-input-0") as HTMLInputElement;
    expect(venueInput0.value.toLowerCase()).toContain("room 204");

    // Event 2: Lab record submission
    expect(titleInput1.value).toBe("Lab record submission");
    const dateInput1 = document.getElementById("date-input-1") as HTMLInputElement;
    expect(dateInput1.value).toBe("2026-11-13");
    const startInput1 = document.getElementById("start-time-input-1") as HTMLInputElement;
    expect(startInput1.value).toBe("12:00");
    const venueInput1 = document.getElementById("venue-input-1") as HTMLInputElement;
    expect(venueInput1.value.toLowerCase()).toContain("department office");

    // Event 3: Guest lecture: AI in Healthcare
    expect(titleInput2.value).toBe("Guest lecture: AI in Healthcare");
    const dateInput2 = document.getElementById("date-input-2") as HTMLInputElement;
    expect(dateInput2.value).toBe("2026-11-13");
    const startInput2 = document.getElementById("start-time-input-2") as HTMLInputElement;
    const endInput2 = document.getElementById("end-time-input-2") as HTMLInputElement;
    expect(startInput2.value).toBe("11:00");
    expect(endInput2.value).toBe("12:30");
    const venueInput2 = document.getElementById("venue-input-2") as HTMLInputElement;
    expect(venueInput2.value.toLowerCase()).toContain("seminar hall");

    // ── 3. Assert All 3 Clash Check Rows Match PS-02 Document Results ────────
    const clashTable = document.getElementById("pairwise-clash-table");
    expect(clashTable).toBeTruthy();

    const row0 = document.getElementById("pairwise-row-0");
    const row1 = document.getElementById("pairwise-row-1");
    const row2 = document.getElementById("pairwise-row-2");

    expect(row0).toBeTruthy();
    expect(row1).toBeTruthy();
    expect(row2).toBeTruthy();

    // Row 0: Test vs Guest Lecture -> 30 minutes overlap from 11:00 to 11:30 AM
    expect(row0?.textContent).toContain("Test and guest lecture");
    expect(row0?.textContent).toContain("CLASH (30m)");
    expect(row0?.textContent).toContain("30 minutes");
    expect(row0?.textContent).toContain("11:00 to 11:30 AM");

    // Row 1: Record Deadline vs Guest Lecture -> 12:00 PM deadline falls during lecture
    expect(row1?.textContent).toContain("Record deadline and guest lecture");
    expect(row1?.textContent).toContain("CLASH (Point)");
    expect(row1?.textContent).toContain("12:00 PM deadline falls during the lecture");

    // Row 2: Test vs Record Deadline -> No clash (test ends at 11:30 AM before deadline)
    expect(row2?.textContent).toContain("Test and record deadline");
    expect(row2?.textContent).toContain("NO CLASH");
    expect(row2?.textContent).toContain("The test ends at 11:30 AM, before the deadline");

    // ── 4. Simulate User Editing Guest Lecture to 12:30 PM - 2:00 PM ─────────
    // 12:30 PM is "12:30", 2:00 PM is "14:00"
    await act(async () => {
      fireEvent.change(startInput2, { target: { value: "12:30" } });
      fireEvent.change(endInput2, { target: { value: "14:00" } });
    });

    // Verify all clashes immediately flip to "NO CLASH"
    const updatedRow0 = document.getElementById("pairwise-row-0");
    const updatedRow1 = document.getElementById("pairwise-row-1");
    const updatedRow2 = document.getElementById("pairwise-row-2");

    expect(updatedRow0?.textContent).toContain("NO CLASH");
    expect(updatedRow1?.textContent).toContain("NO CLASH");
    expect(updatedRow2?.textContent).toContain("NO CLASH");

    // Assert that the global status pill displays 100% Conflict-Free
    const clashPanel = document.getElementById("clash-audit-panel");
    expect(clashPanel?.textContent).toContain("100% Conflict-Free Schedule");

    // ── 5. Trigger .ics Export and Verify RFC-5545 Integrity ─────────────────
    const exportIcsBtn = document.getElementById("export-ics-btn");
    expect(exportIcsBtn).toBeTruthy();

    await act(async () => {
      fireEvent.click(exportIcsBtn!);
    });

    expect(window.URL.createObjectURL).toHaveBeenCalledTimes(1);

    // Verify synthesized RFC-5545 content
    const currentEvents = useStore.getState().events;
    const icsString = generateIcs(currentEvents);

    expect(icsString).toContain("BEGIN:VCALENDAR");
    expect(icsString).toContain("VERSION:2.0");
    expect(icsString).toContain("PRODID:-//ChronosCampus//Notice Decoder PS-02//EN");
    expect(icsString).toContain("BEGIN:VEVENT");
    expect(icsString).toContain("SUMMARY:Internal Test 2");
    expect(icsString).toContain("SUMMARY:[DEADLINE] Lab record submission");
    expect(icsString).toContain("SUMMARY:Guest lecture: AI in Healthcare");

    // Confirm updated times are reflected in VEVENT
    expect(icsString).toContain("DTSTART;TZID=Asia/Kolkata:20261113T123000");
    expect(icsString).toContain("DTEND;TZID=Asia/Kolkata:20261113T140000");
    expect(icsString).toContain("END:VCALENDAR");
  });
});
