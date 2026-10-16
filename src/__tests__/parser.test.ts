import { describe, it, expect } from "vitest";
import { normalizeTime, normalizeNamedDate, normalizeSlashDate, classifyEventType, extractDraftEvents } from "../lib/parser";
import { PS02_NOTICE, PS02_EXPECTED_EVENTS } from "../lib/parser/sample";
import type { ParseContext } from "../types";

const CTX: ParseContext = { referenceYear: 2026, timeZone: "Asia/Kolkata", locale: "IN" };

describe("normalizeTime", () => {
  it("handles 2 PM", () => expect(normalizeTime("2 PM")).toBe("14:00"));
  it("handles 14:00", () => expect(normalizeTime("14:00")).toBe("14:00"));
  it("handles 12:00 noon", () => expect(normalizeTime("12:00 noon")).toBe("12:00"));
  it("handles 12 noon", () => expect(normalizeTime("12 noon")).toBe("12:00"));
  it("handles 12 midnight", () => expect(normalizeTime("12 midnight")).toBe("00:00"));
  it("rejects 25:90", () => expect(normalizeTime("25:90")).toBeNull());
  it("handles 11:30 AM", () => expect(normalizeTime("11:30 AM")).toBe("11:30"));
});

describe("normalizeNamedDate", () => {
  it("13 Nov 2026", () => {
    const { dateISO, yearStatus } = normalizeNamedDate("13", "Nov", "2026", CTX);
    expect(dateISO).toBe("2026-11-13");
    expect(yearStatus).toBe("matched");
  });
  it("13 Nov without year flags needs-review", () => {
    const { yearStatus } = normalizeNamedDate("13", "Nov", undefined, CTX);
    expect(yearStatus).toBe("needs-review");
  });
});

describe("normalizeSlashDate", () => {
  it("13/11/2026 → 2026-11-13 (DD/MM/YYYY)", () => {
    expect(normalizeSlashDate("13", "11", "2026")).toBe("2026-11-13");
  });
  it("rejects invalid day 32", () => {
    expect(normalizeSlashDate("32", "01", "2026")).toBeNull();
  });
  it("rejects invalid month 13", () => {
    expect(normalizeSlashDate("01", "13", "2026")).toBeNull();
  });
});

describe("classifyEventType", () => {
  it("identifies Test", () => expect(classifyEventType("Internal Test 2")).toBe("Test"));
  it("identifies Deadline", () => expect(classifyEventType("submission due")).toBe("Deadline"));
  it("identifies Lecture", () => expect(classifyEventType("guest lecture")).toBe("Lecture"));
  it("defaults Other", () => expect(classifyEventType("random text")).toBe("Other"));
});

describe("PS-02 sample fixture", () => {
  it("extracts exactly 3 events", () => {
    const events = extractDraftEvents(PS02_NOTICE, CTX);
    expect(events.length).toBe(3);
  });

  it("all events are on 2026-11-13", () => {
    const events = extractDraftEvents(PS02_NOTICE, CTX);
    for (const e of events) expect(e.dateISO).toBe("2026-11-13");
  });

  it("detects a Test type event", () => {
    const events = extractDraftEvents(PS02_NOTICE, CTX);
    expect(events.some((e) => e.type === "Test")).toBe(true);
  });

  it("detects a Deadline type event", () => {
    const events = extractDraftEvents(PS02_NOTICE, CTX);
    expect(events.some((e) => e.type === "Deadline")).toBe(true);
  });

  it("detects a Lecture type event", () => {
    const events = extractDraftEvents(PS02_NOTICE, CTX);
    expect(events.some((e) => e.type === "Lecture")).toBe(true);
  });
});
