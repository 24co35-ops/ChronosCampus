/**
 * escalationDrafter.ts — PS-02 Faculty & Coordinator Escalation Drafter
 *
 * Auto-generates polite, structured, evidence-backed conflict escalation messages
 * for students and Class Representatives (CR).
 *
 * Implements:
 * 1. Persona-based message generation (Class Representative vs Individual Student).
 * 2. Strict citation of Cohort, Clashing Events, Exact Times, Venues, Overlap Duration.
 * 3. Proposed conflict-free alternative slot computed by the Gap Finder.
 * 4. 1-click generators for Email (mailto:), WhatsApp, and Clipboard.
 */

import type { DecodedEvent, PairwiseClashResult } from "../../types/notice";
import type { RescheduleSuggestion } from "./actionRecommender";
import { format12Hour } from "./pairwiseEngine";

export type EscalationSenderRole = "CLASS_REPRESENTATIVE" | "STUDENT";

export interface EscalationDraftOptions {
  clash: PairwiseClashResult;
  eventA: DecodedEvent;
  eventB: DecodedEvent;
  rescheduleSuggestion?: RescheduleSuggestion | null;
  role?: EscalationSenderRole;
  cohort?: string;
  senderName?: string;
  recipientEmail?: string;
  recipientRole?: string;
}

export interface EscalationDraftResult {
  role: EscalationSenderRole;
  cohort: string;
  dateStr: string;
  subject: string;
  emailBody: string;
  whatsAppText: string;
  mailtoUrl: string;
  whatsAppUrl: string;
  summary: {
    eventAFormatted: string;
    eventBFormatted: string;
    overlapFormatted: string;
    proposedSlotFormatted: string | null;
    targetEventToReschedule: string | null;
  };
}

/**
 * Formats an event with title, times, and venue for academic citation.
 * e.g. "Internal Test 2 [10:00 AM – 11:30 AM, Room 204]"
 */
export function formatEventCitation(event: DecodedEvent): string {
  const start12 = format12Hour(event.startTime);
  const end12 = format12Hour(event.endTime || event.startTime);
  const timeStr = event.type === "Deadline" ? `due at ${start12}` : `${start12} – ${end12}`;
  const venueStr = event.venue && event.venue !== "TBD" ? event.venue : "Venue TBD";
  return `"${event.title}" [${timeStr}, ${venueStr}]`;
}

/**
 * Resolves the effective student cohort from events or default fallback.
 */
export function resolveCohort(
  eventA?: DecodedEvent,
  eventB?: DecodedEvent,
  override?: string
): string {
  if (override && override.trim()) return override.trim();
  if (eventA?.cohort && eventA.cohort !== "All Students") return eventA.cohort;
  if (eventB?.cohort && eventB.cohort !== "All Students") return eventB.cohort;
  return "III-year CSE";
}

/**
 * Builds the structured email subject line.
 */
export function generateEscalationSubject(
  cohort: string,
  eventA: DecodedEvent,
  eventB: DecodedEvent,
  role: EscalationSenderRole
): string {
  const prefix = role === "CLASS_REPRESENTATIVE" ? `[CR Urgent] [${cohort}]` : `[Student Query] [${cohort}]`;
  const dateStr = eventA.displayDate || eventB.displayDate || "Academic Schedule";
  return `${prefix} Timetable Clash: "${eventA.title}" vs "${eventB.title}" (${dateStr})`;
}

/**
 * Formats the overlap duration text.
 */
export function formatOverlapDuration(clash: PairwiseClashResult): string {
  if (clash.clashType === "DEADLINE_CONTAINMENT") {
    return "Deadline falls directly during scheduled session";
  }

  const window = clash.overlapWindow;
  if (typeof window === "object" && window !== null && window.start && window.end) {
    const s = format12Hour(window.start);
    const e = format12Hour(window.end);
    return `${clash.overlapMinutes} minutes (from ${s} to ${e})`;
  }

  if (clash.overlapMinutes > 0) {
    return `${clash.overlapMinutes} minutes`;
  }

  return "Direct time collision";
}

/**
 * Auto-generates formal email and WhatsApp text for escalation.
 */
export function generateEscalationDraft(options: EscalationDraftOptions): EscalationDraftResult {
  const {
    clash,
    eventA,
    eventB,
    rescheduleSuggestion,
    role = "CLASS_REPRESENTATIVE",
    senderName = role === "CLASS_REPRESENTATIVE" ? "Class Representative" : "Student",
    recipientEmail = "coordinator@university.edu",
    recipientRole = "Course & Timetable Coordinator",
  } = options;

  const cohort = resolveCohort(eventA, eventB, options.cohort);
  const dateStr = eventA.displayDate || eventB.displayDate || "Upcoming Schedule";

  const citationA = formatEventCitation(eventA);
  const citationB = formatEventCitation(eventB);
  const overlapStr = formatOverlapDuration(clash);

  // Proposed slot details
  let proposedSlotStr: string | null = null;
  let targetEventTitle: string | null = null;
  if (rescheduleSuggestion) {
    targetEventTitle = rescheduleSuggestion.eventTitle;
    const pStart = format12Hour(rescheduleSuggestion.proposedStart);
    const pEnd = format12Hour(rescheduleSuggestion.proposedEnd);
    proposedSlotStr = `${pStart} – ${pEnd}`;
  }

  const subject = generateEscalationSubject(cohort, eventA, eventB, role);

  // ── 1. Formal Email Body ──────────────────────────────────────────────────
  const emailLines: string[] = [];
  emailLines.push(`Respected ${recipientRole},`);
  emailLines.push("");

  if (role === "CLASS_REPRESENTATIVE") {
    emailLines.push(
      `I am writing to you on behalf of the students of ${cohort} to bring an urgent timetable clash to your attention scheduled for ${dateStr}.`
    );
  } else {
    emailLines.push(
      `I am a student of ${cohort} and am writing to bring an academic scheduling clash to your attention scheduled for ${dateStr}.`
    );
  }
  emailLines.push("");
  emailLines.push("The following commitments directly collide on the official department timetable:");
  emailLines.push(`  1. ${citationA}`);
  emailLines.push(`  2. ${citationB}`);
  emailLines.push("");
  emailLines.push(`Conflict Details:`);
  emailLines.push(`  • Overlap Duration: ${overlapStr}`);
  emailLines.push(`  • Impact: Students cannot attend both sessions simultaneously or reach the venue in time.`);
  emailLines.push("");

  if (proposedSlotStr && targetEventTitle) {
    emailLines.push("Proposed Resolution (Algorithmic Gap Finder):");
    emailLines.push(
      `Based on the day's commitments, shifting "${targetEventTitle}" to ${proposedSlotStr} resolves this collision completely without creating secondary clashes.`
    );
    emailLines.push("");
    emailLines.push(
      `Could you kindly consider adjusting "${targetEventTitle}" to this slot, or grant permission for late attendance / alternate submission arrangements?`
    );
  } else {
    emailLines.push(
      "Could you kindly advise on an alternative arrangement, rescheduled timing, or permissible late entry so students may fulfill all academic obligations?"
    );
  }

  emailLines.push("");
  emailLines.push("Thank you very much for your time, support, and guidance.");
  emailLines.push("");
  emailLines.push("Sincerely,");
  emailLines.push(senderName);
  emailLines.push(role === "CLASS_REPRESENTATIVE" ? `Class Representative, ${cohort}` : `Student, ${cohort}`);

  const emailBody = emailLines.join("\n");

  // ── 2. WhatsApp Friendly Message ──────────────────────────────────────────
  const waLines: string[] = [];
  waLines.push(`*⚠️ ACADEMIC TIMETABLE CLASH NOTICE — ${cohort}*`);
  waLines.push(`_Date: ${dateStr}_`);
  waLines.push("");
  waLines.push("Respected Faculty Coordinator,");
  waLines.push(`We have detected a scheduling collision affecting *${cohort}*:`);
  waLines.push("");
  waLines.push(`1️⃣ *${eventA.title}*: ${format12Hour(eventA.startTime)} – ${format12Hour(eventA.endTime || eventA.startTime)} (${eventA.venue || "TBD"})`);
  waLines.push(`2️⃣ *${eventB.title}*: ${format12Hour(eventB.startTime)} – ${format12Hour(eventB.endTime || eventB.startTime)} (${eventB.venue || "TBD"})`);
  waLines.push("");
  waLines.push(`⏱️ *Overlap*: ${overlapStr}`);
  if (proposedSlotStr && targetEventTitle) {
    waLines.push(`💡 *Proposed Conflict-Free Slot*: *${proposedSlotStr}* for _"${targetEventTitle}"_`);
  }
  waLines.push("");
  waLines.push("Kindly advise on whether the session can be rescheduled or if late entry is permitted.");
  waLines.push(`— *${senderName}* (${role === "CLASS_REPRESENTATIVE" ? "Class Representative" : "Student"}, ${cohort})`);

  const whatsAppText = waLines.join("\n");

  // ── 3. URLs ───────────────────────────────────────────────────────────────
  const mailtoUrl = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
  const whatsAppUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsAppText)}`;

  return {
    role,
    cohort,
    dateStr,
    subject,
    emailBody,
    whatsAppText,
    mailtoUrl,
    whatsAppUrl,
    summary: {
      eventAFormatted: citationA,
      eventBFormatted: citationB,
      overlapFormatted: overlapStr,
      proposedSlotFormatted: proposedSlotStr,
      targetEventToReschedule: targetEventTitle,
    },
  };
}