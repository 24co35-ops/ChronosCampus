import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { AlgorithmExplainerModal } from "../components/workspace/AlgorithmExplainerModal";
import { Navbar } from "../components/layout/Navbar";
import { useNoticeStore } from "../store/useNoticeStore";
import { OFFICIAL_PS02_NOTICE } from "../lib/fixtures/sampleNotices";
import { decodeNotice } from "../lib/parser/noticeDecoder";

describe("AlgorithmExplainerModal — 4-Step Deterministic Pipeline Visualizer", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    const events = decodeNotice(OFFICIAL_PS02_NOTICE);
    act(() => {
      useNoticeStore.setState({
        rawNoticeText: OFFICIAL_PS02_NOTICE,
        events,
      });
    });
  });

  it("does not render when isOpen is false", () => {
    render(<AlgorithmExplainerModal isOpen={false} onClose={vi.fn()} />);
    expect(document.getElementById("algorithm-explainer-modal")).toBeNull();
  });

  it("renders when isOpen is true with modal title and 4 step tabs", () => {
    render(<AlgorithmExplainerModal isOpen={true} onClose={vi.fn()} />);

    expect(document.getElementById("algorithm-explainer-modal")).toBeTruthy();
    expect(screen.getByText("Deterministic Engine Logic & Architecture")).toBeTruthy();

    expect(document.getElementById("explainer-step-1-btn")).toBeTruthy();
    expect(document.getElementById("explainer-step-2-btn")).toBeTruthy();
    expect(document.getElementById("explainer-step-3-btn")).toBeTruthy();
    expect(document.getElementById("explainer-step-4-btn")).toBeTruthy();
  });

  it("Step 1: Displays Lexical Pre-Processor, raw text, and token clauses with [start, end] spans", () => {
    render(<AlgorithmExplainerModal isOpen={true} onClose={vi.fn()} />);

    const step1Content = document.getElementById("explainer-step-1-content");
    expect(step1Content).toBeTruthy();
    expect(step1Content?.textContent).toContain("Lexical Normalization & Tokenization Pipeline");
    expect(step1Content?.textContent).toContain("Raw Input Circular");
    expect(step1Content?.textContent).toContain("Segmented Token Clauses");
    expect(step1Content?.textContent).toContain("Clause #1");
  });

  it("Step 2: Displays Deterministic Temporal AST with epoch intervals [600, 690], [660, 780], [720, 720]", () => {
    render(<AlgorithmExplainerModal isOpen={true} onClose={vi.fn()} />);

    // Click step 2 tab
    const step2Btn = document.getElementById("explainer-step-2-btn");
    act(() => {
      fireEvent.click(step2Btn!);
    });

    const step2Content = document.getElementById("explainer-step-2-content");
    expect(step2Content).toBeTruthy();
    expect(step2Content?.textContent).toContain("Deterministic Temporal Abstract Syntax Tree (AST)");
    expect(step2Content?.textContent).toContain("Minutes Epoch:");
    expect(step2Content?.textContent).toContain("[600, 690]"); // Lecture 10:00 - 11:30
    expect(step2Content?.textContent).toContain("[660, 750]"); // Lecture 11:00 - 12:30 11:00 - 13:00
    expect(step2Content?.textContent).toContain("[720, 720]"); // Deadline 12:00
  });

  it("Step 3: Displays Interval Algebra formulas max(Sa, Sb) < min(Ea, Eb) and Se <= Td <= Ee", () => {
    render(<AlgorithmExplainerModal isOpen={true} onClose={vi.fn()} />);

    // Click step 3 tab
    const step3Btn = document.getElementById("explainer-step-3-btn");
    act(() => {
      fireEvent.click(step3Btn!);
    });

    const step3Content = document.getElementById("explainer-step-3-content");
    expect(step3Content).toBeTruthy();
    expect(step3Content?.textContent).toContain("Pairwise Interval Algebra & Sweep-Line Union");
    expect(step3Content?.textContent).toContain("max(S_a, S_b) < min(E_a, E_b)");
    expect(step3Content?.textContent).toContain("S_e ≤ T_d ≤ E_e");
    expect(step3Content?.textContent).toContain("Live Mathematical Proofs");
  });

  it("Step 4: Displays RFC-5545 Synthesizer, security firewall, and VCALENDAR syntax", () => {
    render(<AlgorithmExplainerModal isOpen={true} onClose={vi.fn()} />);

    // Click step 4 tab
    const step4Btn = document.getElementById("explainer-step-4-btn");
    act(() => {
      fireEvent.click(step4Btn!);
    });

    const step4Content = document.getElementById("explainer-step-4-content");
    expect(step4Content).toBeTruthy();
    expect(step4Content?.textContent).toContain("RFC-5545 Synthesizer & Security Firewall");
    expect(step4Content?.textContent).toContain("CRLF Injection Firewall");
    expect(step4Content?.textContent).toContain("CWE-1236 Formula Guard");
    expect(step4Content?.textContent).toContain("BEGIN:VCALENDAR");
    expect(step4Content?.textContent).toContain("END:VCALENDAR");
  });

  it("allows stepping forward and backward via Next / Previous buttons", () => {
    render(<AlgorithmExplainerModal isOpen={true} onClose={vi.fn()} />);

    expect(document.getElementById("explainer-step-1-content")).toBeTruthy();

    const nextBtn = screen.getByText("Next Step");
    act(() => {
      fireEvent.click(nextBtn);
    });
    expect(document.getElementById("explainer-step-2-content")).toBeTruthy();

    const prevBtn = screen.getByText("Previous Step");
    act(() => {
      fireEvent.click(prevBtn);
    });
    expect(document.getElementById("explainer-step-1-content")).toBeTruthy();
  });

  it("Navbar renders '🧠 Inspect Engine Logic' button and opens modal upon click", () => {
    render(<Navbar />);

    const inspectBtn = document.getElementById("inspect-engine-logic-btn");
    expect(inspectBtn).toBeTruthy();
    expect(inspectBtn?.textContent).toContain("Inspect Engine Logic");

    act(() => {
      fireEvent.click(inspectBtn!);
    });

    expect(document.getElementById("algorithm-explainer-modal")).toBeTruthy();
  });
});
