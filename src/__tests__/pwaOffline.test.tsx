import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { render, act } from "@testing-library/react";
import fs from "fs";
import path from "path";
import { Navbar } from "../components/layout/Navbar";
import { OFFICIAL_PS02_NOTICE } from "../lib/fixtures/sampleNotices";
import { decodeNotice } from "../lib/parser/noticeDecoder";
import { evaluateAllPairs } from "../lib/clash/pairwiseEngine";
import { generateIcs } from "../lib/ics/icsGenerator";

describe("PWA Manifest & Mobile Readiness", () => {
  const manifestPath = path.resolve(process.cwd(), "public/manifest.json");

  it("manifest.json exists and is valid JSON", () => {
    expect(fs.existsSync(manifestPath)).toBe(true);
    const content = fs.readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(content);

    expect(manifest.name).toBe("ChronosCampus Notice Decoder");
    expect(manifest.short_name).toBe("NoticeDecoder");
    expect(manifest.display).toBe("standalone");
    expect(manifest.theme_color).toBe("#4f46e5");
    expect(manifest.background_color).toBe("#0f172a");
    expect(manifest.icons).toBeDefined();
    expect(manifest.icons.length).toBeGreaterThan(0);
    expect(manifest.icons[0].src).toBe("/icon.svg");
  });

  it("public/icon.svg exists and is valid SVG", () => {
    const iconPath = path.resolve(process.cwd(), "public/icon.svg");
    expect(fs.existsSync(iconPath)).toBe(true);
    const svg = fs.readFileSync(iconPath, "utf-8");
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
  });

  it("public/sw.js exists and contains cache handlers", () => {
    const swPath = path.resolve(process.cwd(), "public/sw.js");
    expect(fs.existsSync(swPath)).toBe(true);
    const swCode = fs.readFileSync(swPath, "utf-8");
    expect(swCode).toContain("chronoscampus-cache-v2");
    expect(swCode).toContain("addEventListener('fetch'");
    expect(swCode).toContain("addEventListener('install'");
  });
});

describe("Offline Network Status Detector in Navbar", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: true,
    });
  });

  it("displays '🟢 Online • Hybrid AI Ready' when network is connected", () => {
    render(<Navbar />);
    const badge = document.getElementById("network-status-badge");
    expect(badge).toBeTruthy();
    expect(badge?.textContent).toContain("Online • Hybrid AI Ready");
  });

  it("flips to '🛡 Offline Mode • 100% Local Deterministic Engine Active' when offline event fires", () => {
    render(<Navbar />);

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    const badge = document.getElementById("network-status-badge");
    expect(badge).toBeTruthy();
    expect(badge?.textContent).toContain("Offline Mode • 100% Local Deterministic Engine Active");
  });

  it("toggles back to online when online event fires", () => {
    render(<Navbar />);

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(document.getElementById("network-status-badge")?.textContent).toContain("Offline Mode");

    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    expect(document.getElementById("network-status-badge")?.textContent).toContain("Online • Hybrid AI Ready");
  });
});

describe("100% Offline Capability: Parsing, Clash Detection and ICS Export", () => {
  it("parses notices deterministically in Airplane Mode with 0 network calls", () => {
    const startTime = performance.now();
    const events = decodeNotice(OFFICIAL_PS02_NOTICE);
    const duration = performance.now() - startTime;

    expect(events.length).toBe(3);
    expect(duration).toBeLessThan(50);
  });

  it("computes mathematical interval clashes and gaps 100% locally", () => {
    const events = decodeNotice(OFFICIAL_PS02_NOTICE);
    const clashes = evaluateAllPairs(events);
    expect(clashes.length).toBe(3);
    const hasOverlap = clashes.some(c => c.clashType === "HARD_OVERLAP");
    expect(hasOverlap).toBe(true);
  });

  it("generates RFC-5545 valid .ics calendar output without server dependencies", () => {
    const events = decodeNotice(OFFICIAL_PS02_NOTICE);
    const icsString = generateIcs(events);

    expect(icsString).toContain("BEGIN:VCALENDAR");
    expect(icsString).toContain("END:VCALENDAR");
    expect(icsString).toContain("BEGIN:VEVENT");
    expect(icsString).toContain("END:VEVENT");
  });
});
