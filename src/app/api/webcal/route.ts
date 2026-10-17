import { NextRequest } from "next/server";
import { generateIcs } from "@/src/lib/ics/icsGenerator";
import { parseNoticeText } from "@/src/lib/parser/entityExtractor";
import { evaluateAllPairs } from "@/src/lib/clash/pairwiseEngine";
import { generateRecommendations } from "@/src/lib/clash/actionRecommender";
import { generateCompoundBusyInsights } from "@/src/lib/clash/compoundAnalyzer";
import type { DecodedEvent } from "@/src/types/notice";

/**
 * Default Official PS-02 Schedule Fixture
 */
const DEFAULT_PS02_EVENTS: DecodedEvent[] = [
  {
    id: "test-01",
    title: "Internal Test 2",
    type: "Test",
    dateISO: "2026-11-13",
    displayDate: "13 Nov 2026",
    startTime: "10:00",
    endTime: "11:30",
    venue: "Room 204",
    cohort: "III-year CSE",
    confidence: 98,
    needsReview: false,
    sourceSpan: {
      start: 0,
      end: 80,
      rawSentence: "The III-year CSE Internal Test 2 will be held on 13/11/2026 from 10:00 AM to 11:30 AM in Room 204.",
    },
  },
  {
    id: "lecture-01",
    title: "Guest lecture: AI in Healthcare",
    type: "Lecture",
    dateISO: "2026-11-13",
    displayDate: "13 Nov 2026",
    startTime: "11:00",
    endTime: "12:30",
    venue: "Seminar Hall",
    cohort: "III-year CSE",
    confidence: 95,
    needsReview: false,
    sourceSpan: {
      start: 81,
      end: 170,
      rawSentence: "Guest lecture on AI in Healthcare scheduled from 11:00 AM to 12:30 PM in Seminar Hall.",
    },
  },
  {
    id: "deadline-01",
    title: "Record submission deadline",
    type: "Deadline",
    dateISO: "2026-11-13",
    displayDate: "13 Nov 2026",
    startTime: "12:00",
    endTime: "12:00",
    venue: "Faculty Cabin",
    cohort: "III-year CSE",
    confidence: 90,
    needsReview: false,
    sourceSpan: {
      start: 171,
      end: 235,
      rawSentence: "All students must submit their lab records by 12:00 PM.",
    },
  },
];

/**
 * GET /api/webcal
 *
 * Serves an RFC-5545 iCalendar stream directly to calendar apps
 * (Apple Calendar, Google Calendar, Outlook Web, Thunderbird)
 * subscribing via webcal:// or http(s)://.
 */
export async function GET(req: NextRequest): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const cohortFilter = searchParams.get("cohort");
  const rawText = searchParams.get("text");
  const dataB64 = searchParams.get("data");

  let events: DecodedEvent[] = [];

  // 1. Data passed via base64 encoded JSON
  if (dataB64) {
    try {
      const decodedJson = Buffer.from(dataB64, "base64").toString("utf-8");
      events = JSON.parse(decodedJson);
    } catch {
      events = [...DEFAULT_PS02_EVENTS];
    }
  }
  // 2. Dynamic notice text parsed on the fly
  else if (rawText) {
    try {
      events = parseNoticeText(rawText);
    } catch {
      events = [...DEFAULT_PS02_EVENTS];
    }
  }
  // 3. Fallback to default PS-02 schedule
  else {
    events = [...DEFAULT_PS02_EVENTS];
  }

  // Filter by cohort if requested
  if (cohortFilter && cohortFilter !== "All" && cohortFilter !== "All Students") {
    events = events.filter(
      (e) =>
        !e.cohort ||
        e.cohort.toLowerCase() === cohortFilter.toLowerCase() ||
        e.cohort.toLowerCase().includes(cohortFilter.toLowerCase())
    );
  }

  // Run clash analysis & action recommendation for rich calendar event notes
  const clashes = evaluateAllPairs(events);
  const compoundInsights = generateCompoundBusyInsights(events);
  const { recommendations } = generateRecommendations(events, clashes, compoundInsights);

  // Generate RFC-5545 payload
  const icsPayload = generateIcs(events, {
    clashes,
    recommendations,
    prodId: "-//ChronosCampus//Notice Decoder PS-02 Live Webcal//EN",
    domain: "chronoscampus.edu",
  });

  return new Response(icsPayload, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="college-schedule.ics"',
      "Cache-Control": "no-cache, no-store, max-age=0, must-revalidate",
      "X-ChronosCampus-Events-Count": String(events.length),
      "X-ChronosCampus-Cohort": cohortFilter || "All",
    },
  });
}

/**
 * POST /api/webcal
 *
 * Accepts arbitrary custom events list and generates matching .ics stream.
 */
export async function POST(req: NextRequest): Promise<Response> {
  try {
    const body = await req.json();
    const events: DecodedEvent[] = Array.isArray(body.events) ? body.events : DEFAULT_PS02_EVENTS;
    const clashes = body.clashes || evaluateAllPairs(events);
    const recommendations = body.recommendations || [];

    const icsPayload = generateIcs(events, {
      clashes,
      recommendations,
      prodId: "-//ChronosCampus//Notice Decoder PS-02 Live Webcal//EN",
      domain: "chronoscampus.edu",
    });

    return new Response(icsPayload, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="college-schedule.ics"',
        "Cache-Control": "no-cache, no-store, max-age=0, must-revalidate",
        "X-ChronosCampus-Events-Count": String(events.length),
      },
    });
  } catch {
    return new Response("Invalid request body. Expected JSON with events array.", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
