import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "../app/api/webcal/route";

describe("GET /api/webcal (Live webcal:// Feed Endpoint)", () => {
  it("serves valid RFC-5545 stream with proper calendar headers", async () => {
    const req = new NextRequest("http://localhost:3000/api/webcal");
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/calendar; charset=utf-8");
    expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="college-schedule.ics"');
    expect(res.headers.get("Cache-Control")).toContain("no-cache");

    const icsText = await res.text();
    expect(icsText).toContain("BEGIN:VCALENDAR");
    expect(icsText).toContain("VERSION:2.0");
    expect(icsText).toContain("METHOD:PUBLISH");
    expect(icsText).toContain("END:VCALENDAR");
    expect(icsText.match(/BEGIN:VEVENT/g)?.length).toBeGreaterThanOrEqual(1);
  });

  it("filters events by cohort when specified in query parameters", async () => {
    const req = new NextRequest("http://localhost:3000/api/webcal?cohort=III-year%20CSE");
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("X-ChronosCampus-Cohort")).toBe("III-year CSE");
    const icsText = await res.text();
    expect(icsText).toContain("Internal Test 2");
  });

  it("accepts custom base64-encoded events array in query string", async () => {
    const customEvents = [
      {
        id: "custom-1",
        title: "Special Workshop",
        type: "Lecture",
        dateISO: "2026-11-20",
        displayDate: "20 Nov 2026",
        startTime: "14:00",
        endTime: "16:00",
        venue: "Auditorium",
        cohort: "All",
        confidence: 100,
        needsReview: false,
        sourceSpan: { start: 0, end: 20, rawSentence: "Special Workshop" },
      },
    ];
    const b64 = Buffer.from(JSON.stringify(customEvents)).toString("base64");
    const req = new NextRequest(`http://localhost:3000/api/webcal?data=${b64}`);
    const res = await GET(req);

    expect(res.status).toBe(200);
    const icsText = await res.text();
    expect(icsText).toContain("Special Workshop");
  });
});

describe("POST /api/webcal", () => {
  it("accepts JSON payload with events and returns .ics stream", async () => {
    const payload = {
      events: [
        {
          id: "custom-post",
          title: "Hackathon Kickoff",
          type: "Test",
          dateISO: "2026-11-25",
          startTime: "09:00",
          endTime: "10:00",
          venue: "Innovation Center",
          cohort: "Final Year",
        },
      ],
    };

    const req = new NextRequest("http://localhost:3000/api/webcal", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/calendar; charset=utf-8");
    const icsText = await res.text();
    expect(icsText).toContain("Hackathon Kickoff");
  });
});
