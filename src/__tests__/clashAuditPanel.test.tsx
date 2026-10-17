import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { ClashAuditPanel } from "../components/workspace/ClashAuditPanel";
import { useNoticeStore } from "../store/useNoticeStore";
import { EXPECTED_PS02_OUTPUT } from "../lib/fixtures/sampleNotices";
import { toMinutes } from "../lib/clash/pairwiseEngine";

describe("ClashAuditPanel — PS-02 Section 03 Compliance", () => {
  beforeEach(() => {
    useNoticeStore.getState().reset();
    useNoticeStore.getState().setEvents(EXPECTED_PS02_OUTPUT.events);
  });

  it("renders the Pairwise Clash Check Table with correct headers", () => {
    render(<ClashAuditPanel />);

    const table = document.getElementById("pairwise-clash-table");
    expect(table).toBeTruthy();

    const tableScope = within(table!);
    expect(tableScope.getByText("Clash check")).toBeTruthy();
    expect(tableScope.getByText("Status Badge")).toBeTruthy();
    expect(tableScope.getByText("Result")).toBeTruthy();
  });

  it("renders Row 1 matching PS-02: Test and guest lecture with 30m clash", () => {
    render(<ClashAuditPanel />);

    const table = document.getElementById("pairwise-clash-table")!;
    const tableScope = within(table);

    expect(tableScope.getByText("Test and guest lecture")).toBeTruthy();
    expect(tableScope.getByText(/🔴 CLASH \(30m\)/)).toBeTruthy();
    expect(
      tableScope.getByText("Clash. They overlap from 11:00 to 11:30 AM (30 minutes).")
    ).toBeTruthy();
  });

  it("renders Row 2 matching PS-02: Record deadline and guest lecture point collision", () => {
    render(<ClashAuditPanel />);

    const table = document.getElementById("pairwise-clash-table")!;
    const tableScope = within(table);

    expect(tableScope.getByText("Record deadline and guest lecture")).toBeTruthy();
    expect(tableScope.getByText("🔴 CLASH (Point)")).toBeTruthy();
    expect(
      tableScope.getByText("Clash. The 12:00 PM deadline falls during the lecture.")
    ).toBeTruthy();
  });

  it("renders Row 3 matching PS-02: Test and record deadline no clash", () => {
    render(<ClashAuditPanel />);

    const table = document.getElementById("pairwise-clash-table")!;
    const tableScope = within(table);

    expect(tableScope.getByText("Test and record deadline")).toBeTruthy();
    expect(tableScope.getByText("🟢 NO CLASH")).toBeTruthy();
    expect(
      tableScope.getByText("No clash. The test ends at 11:30 AM, before the deadline.")
    ).toBeTruthy();
  });

  it("renders the Compound Busy-Chain Banner with 10:00 AM – 12:30 PM continuous block detected", () => {
    render(<ClashAuditPanel />);

    const banner = document.getElementById("compound-busy-chain-banner");
    expect(banner).toBeTruthy();

    const bannerScope = within(banner!);
    expect(
      bannerScope.getByText("10:00 AM – 12:30 PM continuous block detected")
    ).toBeTruthy();
    expect(bannerScope.getByText("150 Min Continuous Block")).toBeTruthy();
    expect(bannerScope.getByText(/False Sense of Security Trapped/)).toBeTruthy();
    expect(bannerScope.getByText(/BEFORE 10:00 AM/)).toBeTruthy();
  });

  it("renders the Actionable Resolution Cards with 1-click Auto-Reschedule and Draft buttons", () => {
    render(<ClashAuditPanel />);

    const cardDeadline = document.getElementById("resolution-card-deadline");
    const cardLecture = document.getElementById("resolution-card-lecture");
    expect(cardDeadline).toBeTruthy();
    expect(cardLecture).toBeTruthy();

    const autoRescheduleBtn = document.getElementById("auto-reschedule-lecture-btn");
    expect(autoRescheduleBtn).toBeTruthy();
    expect(autoRescheduleBtn?.textContent).toContain("Auto-Reschedule Guest Lecture to Free Slot");

    const draftBtn = document.getElementById("draft-deadline-escalation-btn");
    expect(draftBtn).toBeTruthy();
    expect(draftBtn?.textContent).toContain("Draft Email / WhatsApp to Coordinator");
  });

  it("clicking Auto-Reschedule shifts the guest lecture to conflict-free slot and allows reverting", () => {
    render(<ClashAuditPanel />);

    const autoRescheduleBtn = document.getElementById("auto-reschedule-lecture-btn")!;
    fireEvent.click(autoRescheduleBtn);

    // Verify lecture times were shifted past 11:30 AM
    const currentEvents = useNoticeStore.getState().events;
    const lecture = currentEvents.find((e) => e.type === "Lecture");
    expect(lecture).toBeDefined();

    const startMins = toMinutes(lecture!.startTime);
    const endMins = toMinutes(lecture!.endTime || lecture!.startTime);
    expect(startMins).toBeGreaterThanOrEqual(11 * 60 + 30);
    expect(endMins - startMins).toBe(90);

    // Success feedback rendered
    expect(screen.getByText(/Zero clashes remain!/)).toBeTruthy();
    expect(autoRescheduleBtn.textContent).toContain("Revert to Original Time");

    // Revert
    fireEvent.click(autoRescheduleBtn);
    const revertedEvents = useNoticeStore.getState().events;
    const revertedLecture = revertedEvents.find((e) => e.type === "Lecture");
    expect(revertedLecture?.startTime).toBe("11:00");
    expect(revertedLecture?.endTime).toBe("12:30");
  });

  it("clicking Draft Coordinator Message opens the EscalationModal", () => {
    render(<ClashAuditPanel />);

    const draftBtn = document.getElementById("draft-deadline-escalation-btn")!;
    fireEvent.click(draftBtn);

    expect(useNoticeStore.getState().activeEscalationClashId).toBeTruthy();
  });
});
