import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { NoticeInputStudio } from "../components/workspace/NoticeInputStudio";
import { ClashAuditPanel } from "../components/workspace/ClashAuditPanel";
import { useStore } from "../store";
import { useNoticeStore } from "../store/useNoticeStore";
import { EXPECTED_PS02_OUTPUT } from "../lib/fixtures/sampleNotices";

describe("NoticeInputStudio & ClashAuditPanel — Enterprise Design System", () => {
  beforeEach(() => {
    useStore.getState().reset();
    useNoticeStore.getState().reset();
    useNoticeStore.getState().setEvents(EXPECTED_PS02_OUTPUT.events);
  });

  describe("NoticeInputStudio", () => {
    it("renders the top toolbar with monochrome preset pills and active state", () => {
      const { container } = render(<NoticeInputStudio />);

      // Preset pills
      const ps02Pill = container.querySelector("#preset-ps02-official");
      const multiFormatPill = container.querySelector("#preset-multi-format");
      const hinglishPill = container.querySelector("#preset-hinglish-whatsapp");
      const uploadPill = container.querySelector("#preset-upload-pdf");

      expect(ps02Pill).toBeTruthy();
      expect(multiFormatPill).toBeTruthy();
      expect(hinglishPill).toBeTruthy();
      expect(uploadPill).toBeTruthy();

      expect(ps02Pill?.textContent).toContain("PS-02 Sample");
      expect(multiFormatPill?.textContent).toContain("Multi-Format Dates");
      expect(hinglishPill?.textContent).toContain("Hinglish Notice");
      expect(uploadPill?.textContent).toContain("Upload PDF/Image");
    });

    it("renders live monospace character and entity counter strip", () => {
      render(<NoticeInputStudio />);

      // 3 EVENTS • 1 DATE • 2 CLASHES
      expect(screen.getByText(/3 EVENTS • 1 DATE • \d+ CLASH/)).toBeDefined();
    });

    it("renders the Annotated Source Token Strip with grounded entity badges", () => {
      render(<NoticeInputStudio />);

      // Annotated tokens
      expect(screen.getByText("Annotated Source Token Strip (Grounded NLP Spans)")).toBeDefined();
      expect(screen.getByText("Internal Test 2")).toBeDefined();
      expect(screen.getByText("TEST")).toBeDefined();
      expect(screen.getByText("13 Nov 2026")).toBeDefined();
      expect(screen.getAllByText("DATE").length).toBeGreaterThan(0);
      expect(screen.getByText("10:00 AM to 11:30 AM")).toBeDefined();
      expect(screen.getAllByText("TIME").length).toBeGreaterThan(0);
      expect(screen.getByText("Room 204")).toBeDefined();
      expect(screen.getAllByText("VENUE").length).toBeGreaterThan(0);
      expect(screen.getByText("by 12:00 noon")).toBeDefined();
      expect(screen.getByText("DEADLINE")).toBeDefined();
    });
  });

  describe("ClashAuditPanel", () => {
    it("renders the executive 2-column matrix with status pills and formatted results", () => {
      render(<ClashAuditPanel />);

      const table = document.getElementById("pairwise-clash-table");
      expect(table).toBeTruthy();

      const tableScope = within(table!);
      expect(tableScope.getByText("Test and guest lecture")).toBeTruthy();
      expect(
        tableScope.getByText("Clash. They overlap from 11:00 to 11:30 AM (30 minutes).")
      ).toBeTruthy();

      expect(tableScope.getByText("Record deadline and guest lecture")).toBeTruthy();
      expect(
        tableScope.getByText("Clash. The 12:00 PM deadline falls during the lecture.")
      ).toBeTruthy();

      expect(tableScope.getByText("Test and record deadline")).toBeTruthy();
      expect(
        tableScope.getByText("No clash. The test ends at 11:30 AM, before the deadline.")
      ).toBeTruthy();
    });

    it("renders the structured Recommended Actions Callout Box with action buttons", () => {
      render(<ClashAuditPanel />);

      expect(screen.getByText("Recommended Actions")).toBeDefined();
      expect(screen.getByText(/Immediate Fix:/)).toBeDefined();
      expect(
        screen.getByText(
          /Submit lab records to the Department office before 10:00 AM prior to Internal Test 2/
        )
      ).toBeDefined();
      expect(screen.getByText(/Coordinator Escalation:/)).toBeDefined();
      expect(
        screen.getByText(/Ask the coordinator about the 11:00–11:30 AM lecture overlap/)
      ).toBeDefined();

      // Action buttons
      const autoRescheduleBtn = document.getElementById("auto-reschedule-lecture-btn");
      expect(autoRescheduleBtn?.textContent).toContain("Resolve Clash Automatically");

      const draftBtn = document.getElementById("draft-deadline-escalation-btn");
      expect(draftBtn?.textContent).toContain("Copy Coordinator Email");

      const inspectIcsBtn = document.getElementById("inspect-download-ics-btn");
      expect(inspectIcsBtn?.textContent).toContain("Inspect & Download .ics");
    });
  });
});
