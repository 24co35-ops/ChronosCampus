import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BusinessCaseModal } from "../components/monetization/BusinessCaseModal";

describe("BusinessCaseModal (3-Tier Pricing & Unit Economics)", () => {
  it("does not render when isOpen is false", () => {
    const { container } = render(
      <BusinessCaseModal isOpen={false} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders all 3 pricing tiers and buyers when isOpen is true", () => {
    render(<BusinessCaseModal isOpen={true} onClose={vi.fn()} />);

    // Tier 1: Student Free Tier
    expect(screen.getByText("Student Free Tier")).toBeDefined();
    expect(screen.getByText("₹0 / forever")).toBeDefined();
    expect(screen.getByText("$0 CAC Viral")).toBeDefined();

    // Tier 2: Student Pro Pass
    expect(screen.getByText("Student Pro Pass")).toBeDefined();
    expect(screen.getByText(/₹49/i)).toBeDefined();
    expect(screen.getByText(/automated phone call wake-up alarms/i)).toBeDefined();

    // Tier 3: University / ERP License
    expect(screen.getByText("University / ERP License")).toBeDefined();
    expect(screen.getByText(/₹45,000/i)).toBeDefined();
    expect(screen.getByText(/Samarth ERP, Moodle & ERP webhooks/i)).toBeDefined();
  });

  it("calculates 94%+ gross margins and updates live metrics when sliders move", () => {
    render(<BusinessCaseModal isOpen={true} onClose={vi.fn()} />);

    // Initial gross margin check
    expect(screen.getByText("Gross Profit Margin")).toBeDefined();
    expect(screen.getAllByText(/94/).length).toBeGreaterThanOrEqual(1);

    // Move student base slider
    const studentSlider = screen.getByLabelText("Enrolled student base slider");
    fireEvent.change(studentSlider, { target: { value: "5000" } });

    // Live recalculation check
    expect(screen.getByText("5,000")).toBeDefined();
    expect(screen.getByText("Total Annual Revenue")).toBeDefined();
  });

  it("explains the ₹0.00 deterministic edge architecture behind 94% margins", () => {
    render(<BusinessCaseModal isOpen={true} onClose={vi.fn()} />);

    expect(
      screen.getByText(/Architectural Secret Behind 94%\+ Margins: ₹0.00 Deterministic Client Compute/i)
    ).toBeDefined();
    expect(
      screen.getByText(/95% of notices \(dates, times, venues, clashes\) are resolved client-side in/i)
    ).toBeDefined();
  });

  it("calls onClose when close button is clicked", () => {
    const handleClose = vi.fn();
    render(<BusinessCaseModal isOpen={true} onClose={handleClose} />);

    const closeBtn = screen.getByLabelText("Close business case modal");
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
