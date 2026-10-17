import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { KeyboardShortcutBar } from "../components/workspace/KeyboardShortcutBar";
import { EditableEventGrid } from "../components/workspace/EditableEventGrid";
import { ClashAuditPanel } from "../components/workspace/ClashAuditPanel";
import { useStore } from "../store";
import { useNoticeStore } from "../store/useNoticeStore";
import { EXPECTED_PS02_OUTPUT } from "../lib/fixtures/sampleNotices";

describe("Workspace Accessibility & Keyboard Navigation Standards", () => {
  beforeEach(() => {
    useNoticeStore.getState().reset();
    useNoticeStore.getState().setEvents(EXPECTED_PS02_OUTPUT.events);
  });

  it("renders the KeyboardShortcutBar with shortcut keys and colorblind-safe legend", () => {
    render(<KeyboardShortcutBar />);

    expect(screen.getByText(/Quick Shortcuts:/)).toBeTruthy();
    expect(screen.getByText(/Undo/)).toBeTruthy();
    expect(screen.getByText(/Redo/)).toBeTruthy();
    expect(screen.getByText(/Export \.ics/)).toBeTruthy();

    // Colorblind-safe legend badges
    expect(screen.getByText(/Colorblind-Safe:/)).toBeTruthy();
    expect(screen.getByText("Clash")).toBeTruthy();
    expect(screen.getByText("Deadline")).toBeTruthy();
    expect(screen.getByText("Safe")).toBeTruthy();
  });

  it("EditableEventGrid contains ARIA labels and tabIndex on every editable cell", () => {
    render(<EditableEventGrid />);

    // Verify Title input has aria-label and tabIndex
    const titleInput = document.getElementById("title-input-0");
    expect(titleInput).toBeTruthy();
    expect(titleInput?.getAttribute("aria-label")).toContain("Event 1 title");
    expect(titleInput?.getAttribute("tabIndex")).toBe("0");

    // Verify Type select has aria-label and tabIndex
    const typeSelect = document.getElementById("type-select-0");
    expect(typeSelect).toBeTruthy();
    expect(typeSelect?.getAttribute("aria-label")).toContain("Event 1 category type");
    expect(typeSelect?.getAttribute("tabIndex")).toBe("0");

    // Verify Date input has aria-label and tabIndex
    const dateInput = document.getElementById("date-input-0");
    expect(dateInput).toBeTruthy();
    expect(dateInput?.getAttribute("aria-label")).toContain("Event 1 date");
    expect(dateInput?.getAttribute("tabIndex")).toBe("0");

    // Verify Start time input has aria-label and tabIndex
    const startTimeInput = document.getElementById("start-time-input-0");
    expect(startTimeInput).toBeTruthy();
    expect(startTimeInput?.getAttribute("aria-label")).toContain("Event 1 start time");
    expect(startTimeInput?.getAttribute("tabIndex")).toBe("0");

    // Verify Venue input has aria-label and tabIndex
    const venueInput = document.getElementById("venue-input-0");
    expect(venueInput).toBeTruthy();
    expect(venueInput?.getAttribute("aria-label")).toContain("Event 1 venue location");
    expect(venueInput?.getAttribute("tabIndex")).toBe("0");

    // Verify Delete button has aria-label
    const deleteBtn = document.getElementById("delete-btn-0");
    expect(deleteBtn).toBeTruthy();
    expect(deleteBtn?.getAttribute("aria-label")).toContain("Delete event 1");
  });

  it("ClashAuditPanel status badges contain colorblind-safe icons and accessible descriptions", () => {
    render(<ClashAuditPanel />);

    const table = document.getElementById("pairwise-clash-table")!;
    expect(table).toBeTruthy();

    const rows = table.querySelectorAll("tbody tr");
    expect(rows.length).toBe(3);

    // Row 1 (Test vs Lecture): Contains Clash label and aria-label
    const row1 = rows[0]!;
    expect(row1.getAttribute("aria-label")).toContain("Clash: 30m overlap");

    // Row 2 (Deadline vs Lecture): Contains Point collision aria-label
    const row2 = rows[1]!;
    expect(row2.getAttribute("aria-label")).toContain("Point collision");

    // Row 3 (Test vs Deadline): Contains Safe aria-label
    const row3 = rows[2]!;
    expect(row3.getAttribute("aria-label")).toContain("No clash: conflict-free");
  });

  it("global keyboard shortcut Ctrl+E triggers calendar export", () => {
    render(<KeyboardShortcutBar />);

    // Mock document.createElement / click
    const clickSpy = vi.fn();
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = origCreateElement(tag);
      if (tag === "a") {
        el.click = clickSpy;
      }
      return el;
    });

    // Press Ctrl + E
    fireEvent.keyDown(window, { key: "e", ctrlKey: true });

    // Toast feedback appears
    expect(screen.getByText("Exported .ics calendar!")).toBeTruthy();
  });
});
