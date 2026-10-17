import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { B2BAdminSandbox, MOCK_MASTER_TIMETABLE } from "../components/monetization/B2BAdminSandbox";

describe("B2BAdminSandbox (Monetization & Pre-Publish Validator)", () => {
  it("renders Master Department Timetable for III-Year CSE with 180 students", () => {
    render(<B2BAdminSandbox />);

    expect(screen.getByText(/Master Department Timetable: III-Year CSE/i)).toBeDefined();
    expect(screen.getByText("180 Enrolled Students")).toBeDefined();

    // Verify key timetable fixtures
    expect(screen.getByText("Computer Networks & Security (Theory)")).toBeDefined();
    expect(screen.getByText("Midterm Internal Assessment 2")).toBeDefined();
    expect(screen.getByText("Amazon Campus Recruitment: Technical Assessment")).toBeDefined();
  });

  it("allows switching admin personas between T&P Officer, Exam Cell, and HOD", () => {
    render(<B2BAdminSandbox />);

    const examCellBtn = screen.getByText("Exam Cell");
    fireEvent.click(examCellBtn);
    expect(examCellBtn.closest("button")?.className).toContain("bg-indigo-600");

    const hodBtn = screen.getByText("Department HOD");
    fireEvent.click(hodBtn);
    expect(hodBtn.closest("button")?.className).toContain("bg-indigo-600");
  });

  it("identifies direct collisions against master schedule when drafting during exam hours", () => {
    render(<B2BAdminSandbox />);

    // Default scenario: Google Tech Talk (10:30 AM - 12:00 PM) overlaps with Midterm Assessment 2 (10:00 - 11:30 AM)
    expect(screen.getByText(/Pre-Publish Clashes Detected!/i)).toBeDefined();
    expect(screen.getByText("DO NOT PUBLISH")).toBeDefined();
    expect(screen.getByText(/180 students impacted/i)).toBeDefined();
  });

  it("recommends Top 3 zero-clash slots and updates draft when 'Apply Slot' is clicked", () => {
    render(<B2BAdminSandbox />);

    expect(screen.getByText("Top 3 Zero-Clash Recommended Slots")).toBeDefined();

    const applyButtons = screen.getAllByText("Apply Slot");
    expect(applyButtons.length).toBeGreaterThanOrEqual(1);

    // Apply the first zero-clash recommended slot
    fireEvent.click(applyButtons[0]!);

    // Should now report Zero Clashes — Safe to Broadcast
    expect(screen.getByText("Zero Clashes — Safe to Broadcast")).toBeDefined();
    expect(screen.getByText("APPROVED")).toBeDefined();
    expect(screen.getByText(/100% of 180 students in III-Year CSE are completely free/i)).toBeDefined();
  });

  it("displays the Institutional Business Case: Value vs. Cost breakdown", () => {
    render(<B2BAdminSandbox />);

    expect(screen.getByText("Institutional Business Case: Value vs. Cost")).toBeDefined();
    expect(screen.getByText("₹49,000 / yr")).toBeDefined();
    expect(screen.getByText("140+ Hours")).toBeDefined();
    expect(screen.getByText("100% Zero-Clash")).toBeDefined();
    expect(screen.getByText(/4.2x ROI/i)).toBeDefined();
  });
});
