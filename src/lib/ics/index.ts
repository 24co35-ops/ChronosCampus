// ─── RFC-5545 ICS Synthesizer & Security Sanitizer ───────────────────────
// Re-exports the rock-solid, standards-compliant RFC-5545 generator.

export * from "./icsGenerator";
import {
  generateIcs as generateStandardIcs,
  type IcsGeneratorOptions,
  type AnyCalendarEvent,
} from "./icsGenerator";
import type { ReviewedEvent, IcsOptions } from "@/src/types";

const DEFAULT_OPTS: IcsOptions = {
  reminderMinsTest: 30,
  reminderHrsDeadline: 12,
};

/**
 * Generate a valid RFC-5545 .ics string for the reviewed event list.
 * Delegates to the standards-compliant RFC-5545 generator with backward compatibility.
 */
export function generateIcs(
  events: (ReviewedEvent | any)[],
  opts: Partial<IcsOptions & IcsGeneratorOptions> = {}
): string {
  const o = { ...DEFAULT_OPTS, ...opts };

  return generateStandardIcs(events, {
    domain: opts.domain || "noticedecoder.local",
    useSimpleIdUid: opts.useSimpleIdUid ?? true,
    testReminderMins: o.reminderMinsTest,
    deadlineReminderHours: o.reminderHrsDeadline,
    ...opts,
  });
}
