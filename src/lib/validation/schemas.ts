import { z } from "zod";
import type {
  EventCategory,
  DecodedEvent,
  SourceSpan,
  ClashType,
  ClashSeverity,
  OverlapWindow,
  PairwiseClashResult,
  CompoundBusyBlock,
} from "@/src/types/notice";

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Validates real calendar dates in YYYY-MM-DD format,
 * strictly accounting for days per month and leap years.
 */
export function isValidCalendarDate(val: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) return false;
  const [y, m, d] = val.split("-").map(Number);
  if (!y || !m || !d) return false;
  if (y < 1900 || y > 2100) return false;
  if (m < 1 || m > 12) return false;

  const isLeap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const daysInMonth = [
    31,
    isLeap ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  const maxDays = daysInMonth[m - 1];
  if (!maxDays || d < 1 || d > maxDays) return false;

  return true;
}

export const TIME_24H_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Validates 24-hour time in HH:mm format (00:00 to 23:59).
 */
export function isValidTime24(val: string): boolean {
  return TIME_24H_REGEX.test(val);
}

// ── Base Schemas ───────────────────────────────────────────────────────────

export const eventCategorySchema = z.enum(["Test", "Deadline", "Lecture"]);

export const dateISOSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must match YYYY-MM-DD format")
  .refine(isValidCalendarDate, {
    message: "Invalid calendar date (check month bounds and leap years)",
  });

export const timeSchema = z
  .string()
  .regex(TIME_24H_REGEX, "Time must match HH:mm 24-hour format (00:00 to 23:59)");

export const sourceSpanSchema = z
  .object({
    start: z.number().int().min(0, "Start index must be >= 0"),
    end: z.number().int().min(0, "End index must be >= 0"),
    rawSentence: z.string(),
  })
  .refine((s) => s.end >= s.start, {
    message: "sourceSpan.end must be >= sourceSpan.start",
    path: ["end"],
  });

// ── DecodedEvent Schema ───────────────────────────────────────────────────

export const decodedEventBaseSchema = z.object({
  id: z.string().min(1, "Event ID cannot be empty"),
  title: z
    .string()
    .trim()
    .min(1, "Title must be at least 1 character")
    .max(200, "Title cannot exceed 200 characters"),
  type: eventCategorySchema,
  dateISO: dateISOSchema,
  displayDate: z.string().min(1, "Display date cannot be empty"),
  startTime: timeSchema,
  endTime: timeSchema,
  venue: z.string().default("TBD"),
  cohort: z.string().default("All Students"),
  confidence: z
    .number()
    .min(0, "Confidence cannot be less than 0")
    .max(100, "Confidence cannot exceed 100"),
  needsReview: z.boolean(),
  sourceSpan: sourceSpanSchema,
});

export const decodedEventSchema = decodedEventBaseSchema
  .refine(
    (data) => {
      if (data.type === "Deadline") {
        return data.endTime === data.startTime;
      }
      return true;
    },
    {
      message: "For Deadline events, endTime must equal startTime",
      path: ["endTime"],
    }
  )
  .refine(
    (data) => {
      if (data.confidence < 80) {
        return data.needsReview === true;
      }
      return true;
    },
    {
      message: "needsReview must be true if confidence is less than 80",
      path: ["needsReview"],
    }
  )
  .refine(
    (data) => {
      if (data.type === "Test" || data.type === "Lecture") {
        return data.endTime >= data.startTime;
      }
      return true;
    },
    {
      message: "endTime must be greater than or equal to startTime for ranged events",
      path: ["endTime"],
    }
  );

export const DecodedEventSchema = decodedEventSchema;

// ── Pairwise Clash Result Schema ──────────────────────────────────────────

export const clashTypeSchema = z.enum([
  "HARD_OVERLAP",
  "DEADLINE_CONTAINMENT",
  "TRANSIT_RISK",
  "NO_CLASH",
]);

export const clashSeveritySchema = z.enum(["CRITICAL", "WARNING", "SAFE"]);

export const overlapWindowSchema = z
  .union([
    z.object({
      start: timeSchema,
      end: timeSchema,
    }),
    z.string(),
  ])
  .nullable();

export const pairwiseClashResultSchema = z.object({
  id: z.string().min(1, "Clash ID cannot be empty"),
  eventA: z.string().min(1, "eventA ID cannot be empty"),
  eventB: z.string().min(1, "eventB ID cannot be empty"),
  hasClash: z.boolean(),
  clashType: clashTypeSchema,
  overlapMinutes: z.number().min(0, "overlapMinutes must be >= 0"),
  overlapWindow: overlapWindowSchema,
  explanation: z.string().min(1, "Explanation cannot be empty"),
  severity: clashSeveritySchema,
});

// ── Compound Busy Block Schema ────────────────────────────────────────────

export const compoundBusyBlockSchema = z
  .object({
    dateISO: dateISOSchema,
    mergedStart: timeSchema,
    mergedEnd: timeSchema,
    events: z.array(decodedEventSchema),
    trappedDeadlines: z.array(decodedEventSchema),
  })
  .refine((block) => block.mergedEnd >= block.mergedStart, {
    message: "mergedEnd must be >= mergedStart",
    path: ["mergedEnd"],
  });

// ── Parse & Validation Utilities ──────────────────────────────────────────

export function validateDecodedEvent(data: unknown): DecodedEvent {
  return decodedEventSchema.parse(data);
}

export function safeValidateDecodedEvent(data: unknown) {
  return decodedEventSchema.safeParse(data);
}

export function validatePairwiseClash(data: unknown): PairwiseClashResult {
  return pairwiseClashResultSchema.parse(data);
}

export function validateCompoundBusyBlock(data: unknown): CompoundBusyBlock {
  return compoundBusyBlockSchema.parse(data);
}
