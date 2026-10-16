// 🧠 ChronosCampus Notice Decoder Adapter 🧠
// Re-exports and wraps entityExtractor with backwards-compatible signatures.

import type { DecodedEvent, EventCategory } from "@/src/types/notice";
import {
  parseNoticeText,
  extractTargetCohort,
  extractVenue,
  extractCleanTitle,
  classifyEventType,
  calculateConfidence,
  type ParseNoticeOptions,
} from "./entityExtractor";

export type DecodeOptions = ParseNoticeOptions;

export const decodeNotice = parseNoticeText;
export const extractGlobalCohort = extractTargetCohort;
export { extractVenue, calculateConfidence };

export function extractTitleAndCategory(clauseText: string): {
  title: string;
  type: EventCategory;
} {
  const type = classifyEventType(clauseText);
  const title = extractCleanTitle(clauseText, type);
  return { title, type };
}