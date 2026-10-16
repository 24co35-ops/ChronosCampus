// ─── RFC-5545 ICS Synthesizer & Security Sanitizer ───────────────────────
// Uses the `ics` npm package when available; falls back to hand-rolled output.
// All text values are sanitized before insertion.

import type { ReviewedEvent, IcsOptions } from "@/src/types";
import { escapeIcsText } from "@/src/lib/security";

const DEFAULT_OPTS: IcsOptions = {
  reminderMinsTest: 30,
  reminderHrsDeadline: 12,
};

/** Convert YYYY-MM-DD + HH:mm to [year,month,day,hour,minute] tuple for `ics` pkg */
function toDateArray(dateISO: string, time: string): [number,number,number,number,number] {
  const [y, m, d] = dateISO.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  return [y ?? 2026, m ?? 1, d ?? 1, h ?? 0, min ?? 0];
}

/** Generate a stable UID from event id */
function makeUid(id: string): string {
  return `${id}@noticedecoder.local`;
}

/**
 * Generate a valid RFC-5545 .ics string for the reviewed event list.
 * Deadlines are exported as a 15-minute block ending at the due time
 * (RFC 5545 requires DTEND > DTSTART for VEVENT).
 */
export function generateIcs(events: ReviewedEvent[], opts: Partial<IcsOptions> = {}): string {
  const o = { ...DEFAULT_OPTS, ...opts };
  const now = new Date();
  const dtstamp = now.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const vevents = events
    .filter((e) => e.dateISO && e.startTime)
    .map((e) => buildVevent(e, o, dtstamp))
    .join("\r\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NoticeDecoder//PS-02//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    vevents,
    "END:VCALENDAR",
  ].join("\r\n");
}

function buildVevent(e: ReviewedEvent, opts: IcsOptions, dtstamp: string): string {
  const tz = e.timeZone || "Asia/Kolkata";

  let dtstart: string;
  let dtend: string;

  if (e.type === "Deadline") {
    // 15-min display block ending at due time
    const [year, month, day, hour, minute] = toDateArray(e.dateISO, e.startTime);
    const dueMins = (hour ?? 0) * 60 + (minute ?? 0);
    const startMins = Math.max(0, dueMins - 15);
    const sh = Math.floor(startMins / 60);
    const sm = startMins % 60;
    dtstart = fmtDt(e.dateISO, `${String(sh).padStart(2,"0")}:${String(sm).padStart(2,"0")}`, tz);
    dtend   = fmtDt(e.dateISO, e.startTime, tz);
  } else {
    dtstart = fmtDt(e.dateISO, e.startTime, tz);
    dtend   = fmtDt(e.dateISO, e.endTime || e.startTime, tz);
  }

  const summary = escapeIcsText(
    e.type === "Deadline" ? `[DEADLINE] ${e.title}` : e.title
  );
  const location = e.venue ? escapeIcsText(e.venue) : "";
  const desc = escapeIcsText(`Source: ${e.rawSource}`);

  const alarmMins = e.type === "Deadline"
    ? opts.reminderHrsDeadline * 60
    : opts.reminderMinsTest;

  return [
    "BEGIN:VEVENT",
    `UID:${makeUid(e.id)}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;TZID=${tz}:${dtstart}`,
    `DTEND;TZID=${tz}:${dtend}`,
    fold(`SUMMARY:${summary}`),
    location ? fold(`LOCATION:${location}`) : null,
    fold(`DESCRIPTION:${desc}`),
    "BEGIN:VALARM",
    "TRIGGER:-PT" + alarmMins + "M",
    "ACTION:DISPLAY",
    `DESCRIPTION:Reminder: ${summary}`,
    "END:VALARM",
    "END:VEVENT",
  ].filter(Boolean).join("\r\n");
}

/** Format a local datetime string for TZID-prefixed DTSTART/DTEND */
function fmtDt(dateISO: string, time: string, _tz: string): string {
  const [y, m, d] = dateISO.split("-");
  const [h, min] = time.split(":");
  return `${y}${m}${d}T${String(h).padStart(2,"0")}${String(min).padStart(2,"0")}00`;
}

/** RFC 5545 §3.1 content-line folding at 75 octets */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  chunks.push(line.slice(0, 75));
  let i = 75;
  while (i < line.length) {
    chunks.push(" " + line.slice(i, i + 74));
    i += 74;
  }
  return chunks.join("\r\n");
}
