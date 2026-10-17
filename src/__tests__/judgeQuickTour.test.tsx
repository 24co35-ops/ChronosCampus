import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { JudgeQuickTour } from "../components/workspace/JudgeQuickTour";
import { useNoticeStore } from "../store/useNoticeStore";

describe("JudgeQuickTour — 🏆 SETU 2026 Judge Evaluation Floating Checklist", () => {
  beforeEach(() => {
    useNoticeStore.getState().reset();
    vi.restoreAllMocks();
  });

  it("renders the floating collapsed trigger pill in the bottom-right corner", () => {
    render(<JudgeQuickTour />);

    const triggerBtn = screen.getByRole("button", { name: /judge evaluation checklist/i });
    expect(triggerBtn).toBeDefined();
    expect(screen.getByText("100/100")).toBeDefined();
  });

  it("expands the full evaluation drawer with all 4 SETU criteria upon click", () => {
    render(<JudgeQuickTour />);

    const triggerBtn = screen.getByRole("button", { name: /judge evaluation checklist/i });
    fireEvent.click(triggerBtn);

    // Header & Rubric Pillars
    expect(screen.getByText(/SETU 2026 FORGE REALM/i)).toBeDefined();
    expect(screen.getByText(/1. Completeness & Accuracy/i)).toBeDefined();
    expect(screen.getByText("35 / 35")).toBeDefined();
    expect(screen.getByText(/2. Monetization & Business Value/i)).toBeDefined();
    expect(screen.getByText("30 / 30")).toBeDefined();
    expect(screen.getByText(/3. Technical Innovation/i)).toBeDefined();
    expect(screen.getByText("20 / 20")).toBeDefined();
    expect(screen.getByText(/4. UI \/ UX Design & Access/i)).toBeDefined();
    expect(screen.getByText("15 / 15")).toBeDefined();
  });

  it("Criterion 1: Runs PS-02 sample end-to-end and triggers .ics calendar download", async () => {
    const createObjectURLMock = vi.fn().mockReturnValue("blob:mock-ics-url");
    const revokeObjectURLMock = vi.fn();
    global.URL.createObjectURL = createObjectURLMock;
    global.URL.revokeObjectURL = revokeObjectURLMock;

    render(<JudgeQuickTour />);

    fireEvent.click(screen.getByRole("button", { name: /judge evaluation checklist/i }));

    const runBtn = screen.getByRole("button", { name: /1-click run ps-02 & download \.ics/i });
    fireEvent.click(runBtn);

    // Verify events populated in store
    const events = useNoticeStore.getState().events;
    expect(events.length).toBe(3);
    expect(useNoticeStore.getState().viewMode).toBe("STUDENT");

    // Verify download trigger was invoked
    expect(createObjectURLMock).toHaveBeenCalled();

    // Success feedback message displayed
    await waitFor(() => {
      expect(screen.getByText(/PS-02 decoded, 3 pairwise clashes evaluated, and RFC-5545 \.ics downloaded!/i)).toBeDefined();
    });
  });

  it("Criterion 2: 1-click button opens B2B Admin Sandbox & Unit Economics Calculator", () => {
    render(<JudgeQuickTour />);

    fireEvent.click(screen.getByRole("button", { name: /judge evaluation checklist/i }));

    const b2bBtn = screen.getByRole("button", { name: /open b2b sandbox & arr calculator/i });
    fireEvent.click(b2bBtn);

    expect(useNoticeStore.getState().viewMode).toBe("B2B_ADMIN");
  });

  it("Criterion 3: Demonstrates 1-click auto-rescheduling for active clashes", async () => {
    render(<JudgeQuickTour />);

    fireEvent.click(screen.getByRole("button", { name: /judge evaluation checklist/i }));

    const autoRescheduleBtn = screen.getByRole("button", { name: /auto-reschedule demo/i });
    fireEvent.click(autoRescheduleBtn);

    await waitFor(() => {
      expect(screen.getByText(/Gap-Finder shifted event to next verified free academic slot!/i)).toBeDefined();
    });
  });

  it("Criterion 3: Switches to Security & Red-Team Lab", () => {
    render(<JudgeQuickTour />);

    fireEvent.click(screen.getByRole("button", { name: /judge evaluation checklist/i }));

    const redTeamBtn = screen.getByRole("button", { name: /red-team lab/i });
    fireEvent.click(redTeamBtn);

    expect(useNoticeStore.getState().viewMode).toBe("RED_TEAM_LAB");
  });

  it("collapses the drawer when close button is clicked", () => {
    render(<JudgeQuickTour />);

    // Open
    fireEvent.click(screen.getByRole("button", { name: /judge evaluation checklist/i }));
    expect(screen.getByText(/SETU 2026 FORGE REALM/i)).toBeDefined();

    // Close
    const closeBtn = screen.getByRole("button", { name: /close judge quick tour/i });
    fireEvent.click(closeBtn);

    // Back to collapsed trigger pill
    expect(screen.queryByText(/SETU 2026 FORGE REALM/i)).toBeNull();
    expect(screen.getByRole("button", { name: /judge evaluation checklist/i })).toBeDefined();
  });
});
