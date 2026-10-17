import { describe, it, expect } from "vitest";
import {
  buildGoogleCalendarUrl,
  buildOutlookWebUrl,
  buildOffice365Url,
  buildWebcalSubscriptionUrl,
  buildAllCalendarLinks,
  formatGoogleDateTime,
  formatOutlookDateTime,
} from "../lib/ics/calendarLinks";
import type { DecodedEvent, PairwiseClashResult, ActionRecommendation } from "../types/notice";

describe("Calendar Links & Webcal Generator", () => {
  const sampleEvent: DecodedEvent = {
    id: "test-01",
    title: "Operating Systems Midterm",
    type: "Test",
    dateISO: "2026-11-13",
    displayDate: "13 Nov 2026",
    startTime: "10:00",
    endTime: "11:30",
    venue: "Lab 3",
    cohort: "III-year CSE",
    confidence: 97,
    needsReview: false,
    sourceSpan: {
      start: 0,
      end: 45,
      rawSentence: "Midterm test scheduled in Lab 3.",
    },
  };

  const sampleDeadline: DecodedEvent = {
    id: "dl-01",
    title: "Lab Journal Submission",
    type: "Deadline",
    dateISO: "2026-11-13",
    displayDate: "13 Nov 2026",
    startTime: "12:00",
    endTime: "12:00",
    venue: "Staff Room",
    cohort: "III-year CSE",
    confidence: 95,
    needsReview: false,
    sourceSpan: {
      start: 46,
      end: 90,
      rawSentence: "Submit lab journals by 12:00 PM.",
    },
  };

  const sampleClashes: PairwiseClashResult[] = [
    {
      id: "clash-1",
      eventA: "test-01",
      eventB: "dl-01",
      hasClash: true,
      clashType: "HARD_OVERLAP",
      overlapMinutes: 30,
      overlapWindow: { start: "11:00", end: "11:30" },
      explanation: "Test overlaps with next session",
      severity: "CRITICAL",
    },
  ];

  const sampleRecommendations: ActionRecommendation[] = [
    {
      id: "rec-1",
      priority: "CRITICAL",
      title: "Reschedule Slot",
      description: "Move session to 12:15 PM.",
      actionType: "RESCHEDULE_EVENT",
      relatedEventIds: ["test-01"],
    },
  ];

  it("formats Google date-times correctly", () => {
    expect(formatGoogleDateTime("2026-11-13", "10:00")).toBe("20261113T100000");
  });

  it("formats Outlook date-times correctly", () => {
    expect(formatOutlookDateTime("2026-11-13", "10:00")).toBe("2026-11-13T10:00:00");
  });

  it("generates 1-click Google Calendar URL with correct dates and action", () => {
    const url = buildGoogleCalendarUrl(sampleEvent, {
      clashes: sampleClashes,
      recommendations: sampleRecommendations,
    });

    const parsed = new URL(url);
    expect(parsed.searchParams.get("action")).toBe("TEMPLATE");
    expect(parsed.searchParams.get("text")).toBe("Operating Systems Midterm");
    expect(parsed.searchParams.get("dates")).toBe("20261113T100000/20261113T113000");
    expect(parsed.searchParams.get("ctz")).toBe("Asia/Kolkata");
    expect(parsed.searchParams.get("location")).toBe("Lab 3");
    // Rich details check
    const details = parsed.searchParams.get("details") || "";
    expect(details).toContain("ACTIVE CONFLICT DETECTED");
    expect(details).toContain("Reschedule Slot");
  });

  it("adds [DEADLINE] prefix and 15-minute duration to Google Calendar URL for Deadlines", () => {
    const url = buildGoogleCalendarUrl(sampleDeadline);
    const parsed = new URL(url);
    expect(parsed.searchParams.get("text")).toBe("[DEADLINE] Lab Journal Submission");
    expect(parsed.searchParams.get("dates")).toBe("20261113T120000/20261113T121500");
  });

  it("generates 1-click Outlook Web URL for consumer accounts", () => {
    const url = buildOutlookWebUrl(sampleEvent);
    expect(url).toContain("https://outlook.live.com/calendar/0/deeplink/compose");
    expect(url).toContain("rru=addevent");
    expect(url).toContain("startdt=2026-11-13T10%3A00%3A00");
    expect(url).toContain("enddt=2026-11-13T11%3A30%3A00");
  });

  it("generates 1-click Office 365 URL for university accounts", () => {
    const url = buildOffice365Url(sampleEvent);
    expect(url).toContain("https://outlook.office.com/calendar/0/deeplink/compose");
    expect(url).toContain("rru=addevent");
  });

  it("generates live webcal:// batch subscription URL for Class Representatives", () => {
    const webcal = buildWebcalSubscriptionUrl("https://chronos.edu", "III-year CSE");
    expect(webcal).toBe("webcal://chronos.edu/api/webcal?cohort=III-year+CSE");
  });

  it("bundles all links into buildAllCalendarLinks", () => {
    const all = buildAllCalendarLinks(sampleEvent);
    expect(all.googleUrl).toContain("calendar.google.com");
    expect(all.outlookLiveUrl).toContain("outlook.live.com");
    expect(all.office365Url).toContain("outlook.office.com");
    expect(all.webcalUrl).toContain("webcal://");
  });
});
