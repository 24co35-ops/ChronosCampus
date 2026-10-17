import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import PitchDeckPage from "../app/pitch/page";

describe("PitchDeckPage — In-App Pitch Mode & Judge 1-Pager", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders Slide 1 (The Hook & Problem) on initial mount", () => {
    render(<PitchDeckPage />);

    expect(screen.getByText(/Why Indian College Schedules Fail Every Semester/i)).toBeTruthy();
    expect(screen.getByText(/Slide 01 • The Problem Hook/i)).toBeTruthy();
    expect(screen.getByText(/Typical University WhatsApp Blurb/i)).toBeTruthy();
  });

  it("advances slides using keyboard ArrowRight navigation", () => {
    render(<PitchDeckPage />);

    // Initial is Slide 1
    expect(screen.getByText(/Slide 01 • The Problem Hook/i)).toBeTruthy();

    // Trigger ArrowRight key
    fireEvent.keyDown(window, { key: "ArrowRight" });

    // Should now be on Slide 2 (Live Embedded Widget)
    expect(screen.getByText(/Slide 02 • Live Embedded Widget/i)).toBeTruthy();
    expect(screen.getByText(/Extracted PS-02 Commitments/i)).toBeTruthy();

    // Trigger ArrowRight key again to Slide 3
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByText(/Slide 03 • Engineering Architecture/i)).toBeTruthy();
  });

  it("navigates backward using keyboard ArrowLeft navigation", () => {
    render(<PitchDeckPage />);

    // Move to Slide 2
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByText(/Slide 02 • Live Embedded Widget/i)).toBeTruthy();

    // Move back to Slide 1
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByText(/Slide 01 • The Problem Hook/i)).toBeTruthy();
  });

  it("operates the live embedded widget on Slide 2 and dynamically resolves clashes", () => {
    render(<PitchDeckPage />);

    // Go to Slide 2
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByText(/2 Clashes Active/i)).toBeTruthy();

    // Click auto-reschedule button
    const rescheduleBtn = screen.getByText(/Auto-Reschedule Lecture to 12:30 PM/i);
    fireEvent.click(rescheduleBtn);

    // Assert it flips to conflict-free
    expect(screen.getByText(/100% Conflict-Free/i)).toBeTruthy();
    expect(screen.getAllByText(/🟢 NO CLASH/i).length).toBeGreaterThan(0);
  });

  it("triggers window.print() when Print Judge 1-Pager button is clicked", () => {
    window.print = vi.fn();
    render(<PitchDeckPage />);

    const printBtn = screen.getByTitle(/Print clean 1-page judge executive handout/i);
    expect(printBtn).toBeTruthy();
    fireEvent.click(printBtn);

    expect(window.print).toHaveBeenCalledTimes(1);
  });

  it("renders the printable judge 1-pager handout in the document", () => {
    render(<PitchDeckPage />);

    expect(
      screen.getByText(/ChronosCampus • Notice Decoder \(PS-02\)/i)
    ).toBeTruthy();
    expect(
      screen.getByText(/Official PS-02 Ground Truth Regression Results/i)
    ).toBeTruthy();
    expect(
      screen.getByText(/Core Innovation: Continuous Busy-Block/i)
    ).toBeTruthy();
  });
});
