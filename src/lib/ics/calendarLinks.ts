/**
 * calendarLinks.ts — 1-Click Calendar Links & Live webcal:// Subscription Generator
 *
 * Implements:
 * 1. 1-click "Add to Google Calendar" URL generator
 * 2. 1-click "Add to Outlook Web" & "Add to Office 365" URL generator
 * 3. Live "webcal://" batch subscription URL generator for Class Representatives
 * 4. Rich metadata embedding (notice sentence provenance, clash warnings, recommendations)
 */

import type { DecodedEvent, PairwiseClashResult, ActionRecommendation } from "@/src/types/notice";
import type { ReviewedEvent } from "@/src/types";
import { addMinutesToHHmm } from "./icsGenerator";

export type AnyCalendarEvent = DecodedEvent | ReviewedEvent;

export interface CalendarLinkOptions {
  /** Target timezone, default "Asia/Kolkata" */
  timeZone?: string;
  /** Active pairwise clashes to embed as warnings in event description */
  clashes?: PairwiseClashResult[];
  /** Action recommendations to embed inside notes */
  recommendations?: ActionRecommendation[];
}

export interface GeneratedCalendarLinks {
  googleUrl: string;
  outlookLiveUrl: string;
  office365Url: string;
  webcalUrl: string;
}

/**
 * Formats YYYY-MM-DD + HH:mm into compact Google Calendar format: YYYYMMDDTHHmm00
 */
export function formatGoogleDateTime(dateISO: string, timeHHmm: string): string {
  const [y, m, d] = dateISO.split("-");
  const [h, min] = timeHHmm.split(":");
  const year = y ?? "2026";
  const month = (m ?? "01").padStart(2, "0");
  const day = (d ?? "01").padStart(2, "0");
  const hour = (h ?? "00").padStart(2, "0");
  const minute = (min ?? "00").padStart(2, "0");
  return `${year}${month}${day}T${hour}${minute}00`;
}

/**
 * Formats YYYY-MM-DD + HH:mm into ISO format for Outlook Web: YYYY-MM-DDTHH:mm:00
 */
export function formatOutlookDateTime(dateISO: string, timeHHmm: string): string {
  const [y, m, d] = dateISO.split("-");
  const [h, min] = timeHHmm.split(":");
  const year = y ?? "2026";
  const month = (m ?? "01").padStart(2, "0");
  const day = (d ?? "01").padStart(2, "0");
  const hour = (h ?? "00").padStart(2, "0");
  const minute = (min ?? "00").padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}:00`;
}

/**
 * Builds rich notes for calendar descriptions with notice provenance and active clash warnings.
 */
export function buildEventDetails(
  event: AnyCalendarEvent,
  clashes?: PairwiseClashResult[],
  recommendations?: ActionRecommendation[]
): string {
  const notes: string[] = [];

  notes.push(`=== ${event.title} ===`);

  const cohort =
    ("cohort" in event && event.cohort) ||
    ("audience" in event && event.audience) ||
    "All Students";
  notes.push(`Cohort: ${cohort}`);

  // Provenance
  let sourceSentence = "";
  if ("sourceSpan" in event && event.sourceSpan && "rawSentence" in event.sourceSpan) {
    sourceSentence = event.sourceSpan.rawSentence;
  } else if ("rawSource" in event && event.rawSource) {
    sourceSentence = event.rawSource;
  }
  if (sourceSentence) {
    notes.push(`Notice: "${sourceSentence.trim()}"`);
  }

  // Active clash warnings
  if (clashes && clashes.length > 0) {
    const relevant = clashes.filter(
      (c) => c.hasClash && (c.eventA === event.id || c.eventB === event.id)
    );
    if (relevant.length > 0) {
      notes.push("");
      notes.push("⚠️ ACTIVE CONFLICT DETECTED:");
      for (const clash of relevant) {
        notes.push(`• [${clash.clashType}] ${clash.explanation}`);
      }
    }
  }

  // Recommended actions
  if (recommendations && recommendations.length > 0) {
    const relevant = recommendations.filter(
      (r) => r.relatedEventIds && r.relatedEventIds.includes(event.id)
    );
    if (relevant.length > 0) {
      notes.push("");
      notes.push("Recommended Action:");
      for (const r of relevant) {
        notes.push(`• ${r.title}: ${r.description}`);
      }
    }
  }

  notes.push("");
  notes.push("Organized via ChronosCampus Notice Decoder (PS-02 Deterministic Engine)");

  return notes.join("\n");
}

/**
 * 1. Generates 1-click "Add to Google Calendar" URL.
 * URL: https://calendar.google.com/calendar/render?action=TEMPLATE
 *
 * For Deadlines at 12:00 PM:
 * - Start: 12:00 PM
 * - End: 12:15 PM
 * - Title prefixed with "[DEADLINE] "
 */
export function buildGoogleCalendarUrl(
  event: AnyCalendarEvent,
  options: CalendarLinkOptions = {}
): string {
  const isDeadline = event.type === "Deadline";
  const title = isDeadline
    ? event.title.startsWith("[DEADLINE]")
      ? event.title
      : `[DEADLINE] ${event.title}`
    : event.title;

  const startFormatted = formatGoogleDateTime(event.dateISO, event.startTime);
  const endHhmm = isDeadline
    ? addMinutesToHHmm(event.startTime, 15)
    : event.endTime || event.startTime;
  const endFormatted = formatGoogleDateTime(event.dateISO, endHhmm);

  const datesParam = `${startFormatted}/${endFormatted}`;
  const timeZone = options.timeZone || "Asia/Kolkata";
  const details = buildEventDetails(event, options.clashes, options.recommendations);
  const location =
    "venue" in event && event.venue && event.venue !== "TBD" ? event.venue : "";

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: datesParam,
    ctz: timeZone,
    details: details,
  });

  if (location) {
    params.set("location", location);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * 2. Generates 1-click "Add to Outlook Web" (consumer live.com) URL.
 * URL: https://outlook.live.com/calendar/0/deeplink/compose
 */
export function buildOutlookWebUrl(
  event: AnyCalendarEvent,
  options: CalendarLinkOptions = {}
): string {
  const isDeadline = event.type === "Deadline";
  const subject = isDeadline
    ? event.title.startsWith("[DEADLINE]")
      ? event.title
      : `[DEADLINE] ${event.title}`
    : event.title;

  const startIso = formatOutlookDateTime(event.dateISO, event.startTime);
  const endHhmm = isDeadline
    ? addMinutesToHHmm(event.startTime, 15)
    : event.endTime || event.startTime;
  const endIso = formatOutlookDateTime(event.dateISO, endHhmm);

  const body = buildEventDetails(event, options.clashes, options.recommendations);
  const location =
    "venue" in event && event.venue && event.venue !== "TBD" ? event.venue : "";

  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject,
    startdt: startIso,
    enddt: endIso,
    body,
  });

  if (location) {
    params.set("location", location);
  }

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * 3. Generates 1-click "Add to Office 365" (corporate / university account) URL.
 * URL: https://outlook.office.com/calendar/0/deeplink/compose
 */
export function buildOffice365Url(
  event: AnyCalendarEvent,
  options: CalendarLinkOptions = {}
): string {
  const liveUrl = buildOutlookWebUrl(event, options);
  return liveUrl.replace("outlook.live.com", "outlook.office.com");
}

/**
 * 4. Generates a live "webcal://" Batch Subscription Link for Class Representatives.
 *
 * Example:
 *   webcal://college.edu/api/webcal?cohort=III-year%20CSE
 *
 * When clicked or pasted into Apple Calendar, Outlook, or Google Calendar,
 * it establishes a live-updating subscription to the cohort's schedule feed!
 */
export function buildWebcalSubscriptionUrl(
  origin?: string,
  cohort?: string,
  filter?: { preset?: string }
): string {
  // If no origin provided, use fallback window origin or relative
  let host = origin;
  if (!host && typeof window !== "undefined") {
    host = window.location.origin;
  }
  if (!host) {
    host = "http://localhost:3000";
  }

  // Convert http/https to webcal scheme
  const webcalBase = host
    .replace(/^https?:\/\//i, "webcal://")
    .replace(/\/$/, "");

  const params = new URLSearchParams();
  if (cohort && cohort !== "All" && cohort !== "All Students") {
    params.set("cohort", cohort);
  }
  if (filter?.preset) {
    params.set("preset", filter.preset);
  }

  const query = params.toString() ? `?${params.toString()}` : "";
  return `${webcalBase}/api/webcal${query}`;
}

/**
 * Bundles all calendar links for an event in one convenient structure.
 */
export function buildAllCalendarLinks(
  event: AnyCalendarEvent,
  options: CalendarLinkOptions = {}
): GeneratedCalendarLinks {
  return {
    googleUrl: buildGoogleCalendarUrl(event, options),
    outlookLiveUrl: buildOutlookWebUrl(event, options),
    office365Url: buildOffice365Url(event, options),
    webcalUrl: buildWebcalSubscriptionUrl(
      undefined,
      "cohort" in event ? event.cohort : undefined
    ),
  };
}
