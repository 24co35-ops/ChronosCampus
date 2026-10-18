import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { LandingPage } from "@/src/components/landing/LandingPage";
import { LandingInteractivePreview } from "@/src/components/landing/LandingInteractivePreview";

describe("LandingPage & Interactive Preview — Linear/Vercel Aesthetic", () => {
  const mockOpenApp = vi.fn();
  const mockLoadSample = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    mockOpenApp.mockClear();
    mockLoadSample.mockClear();
  });

  it("renders the primary headline, value proposition, and trust metrics", () => {
    render(<LandingPage onOpenApp={mockOpenApp} onLoadSample={mockLoadSample} />);

    // Headline
    expect(screen.getByText(/Turn chaotic college notices into/i)).toBeDefined();
    expect(screen.getByText(/conflict-free calendars/i)).toBeDefined();

    // Trust metrics
    expect(screen.getByText("1.1 ms")).toBeDefined();
    expect(screen.getByText("100% Offline")).toBeDefined();
    expect(screen.getByText("RFC-5545")).toBeDefined();
    expect(screen.getByText("0% LLM Drift")).toBeDefined();
  });

  it("renders the 3-step workflow pipeline and capabilities grid", () => {
    render(<LandingPage onOpenApp={mockOpenApp} onLoadSample={mockLoadSample} />);

    // How it works steps
    expect(screen.getByText(/Multi-Modal Ingestion/i)).toBeDefined();
    expect(screen.getByText(/Deterministic AST & Collision Audit/i)).toBeDefined();
    expect(screen.getByText(/1-Click Gap Fix & Calendar Sync/i)).toBeDefined();

    // Feature bento cards
    expect(screen.getByText("Indian Academic Date Parser")).toBeDefined();
    expect(screen.getByText("1-Click Gap-Finder Rescheduler")).toBeDefined();
    expect(screen.getByText("Faculty B2B Pre-Publish Blocker")).toBeDefined();
    expect(screen.getByText("Campus Transit Risk Engine")).toBeDefined();
    expect(screen.getByText("OWASP & ReDoS Defense Layer")).toBeDefined();
    expect(screen.getByText("WhatsApp Bot & Live Webcal Feed")).toBeDefined();
  });

  it("renders comparison matrix and pricing tiers", () => {
    render(<LandingPage onOpenApp={mockOpenApp} onLoadSample={mockLoadSample} />);

    // Comparison
    expect(screen.getByText("Unstructured Circular Parsing")).toBeDefined();
    expect(screen.getByText("Mathematical Collision Detection")).toBeDefined();

    // Pricing
    expect(screen.getByText("STUDENT EDITION")).toBeDefined();
    expect(screen.getByText("DEPARTMENT SAAS")).toBeDefined();
    expect(screen.getByText("CAMPUS ENTERPRISE")).toBeDefined();
    expect(screen.getByText("₹0")).toBeDefined();
    expect(screen.getByText("₹15")).toBeDefined();
    expect(screen.getByText("₹45")).toBeDefined();
  });

  it("invokes onOpenApp callback when Launch Studio CTAs are clicked", () => {
    render(<LandingPage onOpenApp={mockOpenApp} onLoadSample={mockLoadSample} />);

    const heroBtn = document.getElementById("hero-launch-studio-btn");
    expect(heroBtn).toBeTruthy();

    fireEvent.click(heroBtn!);
    expect(mockOpenApp).toHaveBeenCalledTimes(1);
  });

  it("invokes onLoadSample callback when Load PS-02 Sample CTA is clicked", () => {
    render(<LandingPage onOpenApp={mockOpenApp} onLoadSample={mockLoadSample} />);

    const sampleBtn = document.getElementById("hero-try-sample-btn");
    expect(sampleBtn).toBeTruthy();

    fireEvent.click(sampleBtn!);
    expect(mockLoadSample).toHaveBeenCalledTimes(1);
  });

  it("LandingInteractivePreview allows simulating 1-click auto-reschedule", () => {
    render(<LandingInteractivePreview onLaunchWithSample={mockLoadSample} />);

    // Initial state shows clashes detected
    expect(screen.getByText("2 Schedule Clashes Detected")).toBeDefined();
    expect(screen.getByText("OVERLAP (30m)")).toBeDefined();

    // Click toggle to simulate 1-click fix
    const toggleBtn = screen.getByTitle(/Toggle between detected clash state and 1-click resolved state/i);
    fireEvent.click(toggleBtn);

    // Resolved state shows 100% Conflict-Free and updated time
    expect(screen.getByText("100% Conflict-Free")).toBeDefined();
    expect(screen.getByText("AUTO-RESCHEDULED")).toBeDefined();
    expect(screen.getByText("12:30 PM – 2:00 PM")).toBeDefined();

    // Click 'Open in Full Studio'
    const openBtn = screen.getByRole("button", { name: /Open in Full Studio/i });
    fireEvent.click(openBtn);
    expect(mockLoadSample).toHaveBeenCalledTimes(1);
  });
});
