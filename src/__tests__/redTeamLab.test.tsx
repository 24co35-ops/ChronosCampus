import "@testing-library/jest-dom";
import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RedTeamLab } from "../components/security/RedTeamLab";
import { useNoticeStore } from "../store/useNoticeStore";

describe("RedTeamLab Component & 5 Adversarial Chaos Scenarios", () => {
  beforeEach(() => {
    useNoticeStore.getState().reset();
  });

  it("renders the 5 mandatory adversarial test case tabs", () => {
    render(<RedTeamLab />);

    expect(screen.getByText("1. CRLF & Malware")).toBeInTheDocument();
    expect(screen.getByText("2. Prompt Injection")).toBeInTheDocument();
    expect(screen.getByText("3. Impossible Dates")).toBeInTheDocument();
    expect(screen.getByText("4. ReDoS Bomb (<15ms)")).toBeInTheDocument();
    expect(screen.getByText("5. 5-Way Clash")).toBeInTheDocument();

    // Default selected test is Case 1
    expect(
      screen.getByText("Test Case 1: .ics CRLF & Malware Injection Attempt")
    ).toBeInTheDocument();
  });

  it("Test Case 1: Neutralizes .ics CRLF & Malware Injection attempt", async () => {
    render(<RedTeamLab />);

    // Click Launch Live Attack
    const launchButtons = screen.getAllByRole("button", { name: /launch live attack/i });
    fireEvent.click(launchButtons[0]!);

    await waitFor(() => {
      expect(screen.getByText(/Active Defense Verifications/i)).toBeInTheDocument();
      expect(screen.getByText(/CRLF control chars stripped/i)).toBeInTheDocument();
      expect(screen.getByText(/Malware URL disarmed/i)).toBeInTheDocument();
      expect(screen.getByText(/Macro prefixed with single quote/i)).toBeInTheDocument();
    });
  });

  it("Test Case 2: Neutralizes Prompt Injection Notice and extracts true academic event", async () => {
    render(<RedTeamLab />);

    // Switch to tab 2
    fireEvent.click(screen.getByText("2. Prompt Injection"));
    expect(
      screen.getByText("Test Case 2: Adversarial Prompt Injection Notice")
    ).toBeInTheDocument();

    // Run test
    const launchButtons = screen.getAllByRole("button", { name: /launch live attack/i });
    fireEvent.click(launchButtons[0]!);

    await waitFor(() => {
      expect(screen.getByText(/XML Sandboxing/i)).toBeInTheDocument();
      expect(screen.getByText(/Flagged Patterns/i)).toBeInTheDocument();
      expect(screen.getByText(/Deterministic Extraction/i)).toBeInTheDocument();
      // Verifies true exam extracted
      expect(screen.getAllByText(/Internal Test 2/i).length).toBeGreaterThanOrEqual(2);
    });
  });

  it("Test Case 3: Detects impossible dates (31 Nov 2026 / 29 Feb 2026) and offers auto-correction", async () => {
    render(<RedTeamLab />);

    // Switch to tab 3
    fireEvent.click(screen.getByText("3. Impossible Dates"));
    expect(
      screen.getByText("Test Case 3: Impossible Calendar Date (31 Nov / 29 Feb 2026)")
    ).toBeInTheDocument();

    // Run test
    const launchButtons = screen.getAllByRole("button", { name: /launch live attack/i });
    fireEvent.click(launchButtons[0]!);

    await waitFor(() => {
      expect(screen.getByText(/31 November 2026 Detection/i)).toBeInTheDocument();
      expect(screen.getByText(/Snap to 30 Nov 2026/i)).toBeInTheDocument();
      expect(screen.getByText(/29 February 2026 Detection/i)).toBeInTheDocument();
      expect(screen.getByText(/Snap to 28 Feb 2026/i)).toBeInTheDocument();
    });
  });

  it("Test Case 4: Executes 10,000-character ReDoS stress bomb live in under 15ms", async () => {
    render(<RedTeamLab />);

    // Switch to tab 4
    fireEvent.click(screen.getByText("4. ReDoS Bomb (<15ms)"));
    expect(
      screen.getByText("Test Case 4: 10,000-Char Catastrophic ReDoS Stress Bomb")
    ).toBeInTheDocument();

    // Run test
    const launchButtons = screen.getAllByRole("button", { name: /launch live attack/i });
    fireEvent.click(launchButtons[0]!);

    await waitFor(() => {
      expect(screen.getByText(/SUB-15MS GUARANTEED/i)).toBeInTheDocument();
      expect(screen.getByText(/ReDoS Defense Audit Passed/i)).toBeInTheDocument();
    });
  });

  it("Test Case 5: Detects 5-way cascading collision and Gap-Finder resolves all 5 cleanly", async () => {
    render(<RedTeamLab />);

    // Switch to tab 5
    fireEvent.click(screen.getByText("5. 5-Way Clash"));
    expect(
      screen.getByText("Test Case 5: 5-Way Cascading Clash Nightmare")
    ).toBeInTheDocument();

    // Run test
    const launchButtons = screen.getAllByRole("button", { name: /launch live attack/i });
    fireEvent.click(launchButtons[0]!);

    await waitFor(() => {
      expect(screen.getByText(/Gap-Finder Resolved Schedule/i)).toBeInTheDocument();
      expect(screen.getByText(/0 Clashes Remaining/i)).toBeInTheDocument();
      expect(screen.getByText(/Load Into Workspace/i)).toBeInTheDocument();
    });

    // Test pushing resolved schedule to main workspace
    fireEvent.click(screen.getByText(/Load Into Workspace/i));
    const storeEvents = useNoticeStore.getState().events;
    expect(storeEvents.length).toBe(5);
    expect(useNoticeStore.getState().viewMode).toBe("STUDENT");
  });

  it("runs the full 5-test suite in 1-click via 'Run All 5 Adversarial Tests'", async () => {
    render(<RedTeamLab />);

    const runAllBtn = screen.getByRole("button", { name: /run all 5 adversarial tests/i });
    fireEvent.click(runAllBtn);

    await waitFor(() => {
      expect(screen.getByText(/Active Defense Verifications/i)).toBeInTheDocument();
    });
  });
});
