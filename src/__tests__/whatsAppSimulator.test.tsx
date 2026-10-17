import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { WhatsAppSimulator } from "../components/monetization/WhatsAppSimulator";
import { B2BAdminSandbox } from "../components/monetization/B2BAdminSandbox";
import { OFFICIAL_PS02_NOTICE } from "../lib/fixtures/sampleNotices";

describe("WhatsAppSimulator — 📱 WhatsApp Bot & 🔌 ERP Webhook Playground", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    vi.restoreAllMocks();

    // Mock window.URL
    global.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-ics-url");
    global.URL.revokeObjectURL = vi.fn();

    // Mock navigator.clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the WhatsApp Mobile Bot Simulator by default with authentic interface", () => {
    render(<WhatsAppSimulator />);

    expect(screen.getAllByText(/@ChronosCampusBot/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Verified Academic Assistant/i)).toBeDefined();
    expect(screen.getByText(/₹49 \/ Semester Pro/i)).toBeDefined();
    expect(screen.getByText(/Forward Messy Notice to @ChronosCampusBot/i)).toBeDefined();
    expect(screen.getByText(/Ready to parse\./i)).toBeDefined();
  });

  it("simulates forwarding notice to bot, typing delay, and <300ms reply card with 3 events", () => {
    render(<WhatsAppSimulator initialNotice={OFFICIAL_PS02_NOTICE} />);

    const forwardBtn = screen.getByRole("button", {
      name: /forward messy notice to @chronoscampusbot/i,
    });
    fireEvent.click(forwardBtn);

    // Should display typing indicator initially
    expect(screen.getByText(/typing\.\.\./i)).toBeDefined();

    // Fast-forward simulated 280ms bot turnaround
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Bot reply card is displayed
    expect(screen.getByText(/3 Events Decoded \(13 Nov 2026\)/i)).toBeDefined();
    expect(screen.getByText("Internal Test 2")).toBeDefined();
    expect(screen.getByText(/10:00 AM – 11:30 AM · Room 204/i)).toBeDefined();
    expect(screen.getByText("Lab Record Submission")).toBeDefined();
    expect(screen.getByText(/Due at 12:00 PM · Dept Office/i)).toBeDefined();
    expect(screen.getByText("Guest Lecture: AI in Healthcare")).toBeDefined();
    expect(screen.getByText(/11:00 AM – 12:30 PM · Seminar Hall/i)).toBeDefined();

    // Red conflict alert highlighted
    expect(screen.getByText(/⚠️ 2 Critical Schedule Conflicts Detected:/i)).toBeDefined();
    expect(screen.getByText(/30-min Overlap:/i)).toBeDefined();
    expect(screen.getByText(/Trapped Deadline:/i)).toBeDefined();
  });

  it("triggers RFC-5545 .ics download when 'Tap to Sync' button is clicked in WhatsApp card", () => {
    render(<WhatsAppSimulator initialNotice={OFFICIAL_PS02_NOTICE} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: /forward messy notice to @chronoscampusbot/i,
      })
    );

    act(() => {
      vi.advanceTimersByTime(300);
    });

    const syncBtn = screen.getByRole("button", {
      name: /tap to sync to google \/ apple calendar \(\.ics\)/i,
    });
    expect(syncBtn).toBeDefined();

    fireEvent.click(syncBtn);

    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(screen.getByText(/✓ Calendar \(\.ics\) downloaded & ready to import/i)).toBeDefined();
  });

  it("supports switching notice presets between Official PS-02 and Hinglish WhatsApp notice", () => {
    render(<WhatsAppSimulator />);

    const hinglishBtn = screen.getByRole("button", { name: /🇮🇳 Hinglish Class Group/i });
    fireEvent.click(hinglishBtn);

    const textarea = screen.getByPlaceholderText(/paste notice text\.\.\./i) as HTMLTextAreaElement;
    expect(textarea.value).toContain("subah 10 baje");
  });

  it("switches to the Live B2B ERP Webhook Playground and inspects cURL and payload", () => {
    render(<WhatsAppSimulator />);

    const webhookTabBtn = screen.getByRole("button", { name: /erp webhook \(b2b\)/i });
    fireEvent.click(webhookTabBtn);

    expect(screen.getByText(/College ERP Pre-Publish Validator Webhook/i)).toBeDefined();
    expect(screen.getAllByText(new RegExp("/api/v1/erp/validate-notice", "i")).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Samarth eGov")).toBeDefined();
    expect(screen.getByText("Moodle LMS")).toBeDefined();
    expect(screen.getByText("MasterSoft ERP")).toBeDefined();

    // Select Moodle LMS
    const moodleBtn = screen.getByRole("button", { name: /moodle lms/i });
    fireEvent.click(moodleBtn);
    expect(moodleBtn.className).toContain("bg-indigo-600");
  });

  it("executes simulated ERP webhook request returning HTTP 409 Conflict with clash details", () => {
    render(<WhatsAppSimulator initialView="webhook" />);

    const sendBtn = screen.getByRole("button", { name: /send simulated erp webhook/i });
    fireEvent.click(sendBtn);

    // Fast-forward simulation latency
    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(screen.getByText(/HTTP 409 Conflict/i)).toBeDefined();
    expect(screen.getByText(/Circular Publication Halted: 2 Conflicts Detected/i)).toBeDefined();
    expect(screen.getByText(/Action: BLOCKED/i)).toBeDefined();

    // Inspect live JSON payload elements
    expect(screen.getByText(/"CLASH_DETECTED"/i)).toBeDefined();
    expect(screen.getByText(/"BLOCK_CIRCULAR_BROADCAST"/i)).toBeDefined();
  });

  it("integrates seamlessly into B2BAdminSandbox via sub-navigation tabs", () => {
    render(<B2BAdminSandbox />);

    expect(screen.getByRole("button", { name: /🏛 Department Pre-Publish Validator/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /📱 WhatsApp Forward Bot \(B2C Pro ₹49\/sem\)/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /🔌 Live ERP Webhook Playground \(B2B SaaS \$500\/yr\)/i })).toBeDefined();

    // Switch to WhatsApp Simulator sub-tab
    const whatsappSubTab = screen.getByRole("button", { name: /📱 WhatsApp Forward Bot/i });
    fireEvent.click(whatsappSubTab);

    expect(screen.getAllByText(/@ChronosCampusBot/i).length).toBeGreaterThanOrEqual(1);

    // Switch to ERP Webhook sub-tab
    const webhookSubTab = screen.getByRole("button", { name: /🔌 Live ERP Webhook Playground/i });
    fireEvent.click(webhookSubTab);

    expect(screen.getByText(/College ERP Pre-Publish Validator Webhook/i)).toBeDefined();
  });
});
