import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WebcalModal } from "../components/workspace/WebcalModal";

describe("WebcalModal", () => {
  it("does not render when isOpen is false", () => {
    const { container } = render(
      <WebcalModal isOpen={false} onClose={vi.fn()} cohort="III-year CSE" />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders subscription feed URL and platform instructions when isOpen is true", () => {
    render(
      <WebcalModal isOpen={true} onClose={vi.fn()} cohort="III-year CSE" />
    );

    expect(screen.getByText("Live webcal:// Batch Calendar Feed")).toBeDefined();
    expect(screen.getByText("CR Broadcast Ready")).toBeDefined();
    expect(screen.getByLabelText("Live webcal subscription URL")).toBeDefined();
    expect(screen.getByText(/Apple Calendar/i)).toBeDefined();
    expect(screen.getByText(/Google Calendar/i)).toBeDefined();
    expect(screen.getByText(/Microsoft Outlook/i)).toBeDefined();
  });

  it("calls onClose when close button is clicked", () => {
    const handleClose = vi.fn();
    render(
      <WebcalModal isOpen={true} onClose={handleClose} cohort="III-year CSE" />
    );

    const closeBtn = screen.getByLabelText("Close subscription modal");
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
