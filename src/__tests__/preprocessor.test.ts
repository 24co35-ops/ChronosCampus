import { describe, it, expect } from "vitest";
import {
  normalizeUnicode,
  fixOcrArtifacts,
  normalizeCampusHinglish,
  segmentEventClauses,
  preprocessNotice,
} from "../lib/parser/preprocessor";
import { OFFICIAL_PS02_NOTICE, HINGLISH_WHATSAPP_NOTICE } from "../lib/fixtures/sampleNotices";

describe("Preprocessor - Unicode Normalization", () => {
  it("converts fancy quotes and apostrophes to standard ASCII", () => {
    const input = '“Guest lecture on ‘AI in Healthcare’ announced”';
    const output = normalizeUnicode(input);
    expect(output).toBe('"Guest lecture on \'AI in Healthcare\' announced"');
  });

  it("converts em-dashes and en-dashes to standard hyphens", () => {
    const input = "10:00 AM—11:30 AM; 11:00 AM–12:30 PM";
    const output = normalizeUnicode(input);
    expect(output).toBe("10:00 AM-11:30 AM; 11:00 AM-12:30 PM");
  });

  it("strips zero-width characters and replaces non-breaking spaces", () => {
    const input = "Room\u00A0204\u200B\uFEFF";
    const output = normalizeUnicode(input);
    expect(output).toBe("Room 204");
  });
});

describe("Preprocessor - OCR Artifact Glitch Corrections", () => {
  it("corrects year scan typos: 'Il-year' and 'lll-year' to 'III-year'", () => {
    const input1 = "All Il-year CSE students are informed";
    expect(fixOcrArtifacts(input1).text).toBe("All III-year CSE students are informed");

    const input2 = "For lll-year students only";
    expect(fixOcrArtifacts(input2).text).toBe("For III-year students only");
  });

  it("corrects time OCR glitch: 'T:00' to '11:00'", () => {
    const input = "Internal Test 2 will start at T:00 AM sharp";
    const { text, count } = fixOcrArtifacts(input);
    expect(text).toBe("Internal Test 2 will start at 11:00 AM sharp");
    expect(count).toBe(1);
  });

  it("corrects 'Al in Healthcare' to 'AI in Healthcare'", () => {
    const input = 'A guest lecture on "Al in Healthcare" is scheduled';
    const { text, count } = fixOcrArtifacts(input);
    expect(text).toBe('A guest lecture on "AI in Healthcare" is scheduled');
    expect(count).toBe(1);
  });

  it("corrects venue scan typos: 'Serminar Hall', 'Departrnent', 'Roorn 204'", () => {
    const input = "Meeting in Serminar Hall at Departrnent Office Roorn 204";
    const { text } = fixOcrArtifacts(input);
    expect(text).toBe("Meeting in Seminar Hall at Department Office Room 204");
  });
});

describe("Preprocessor - Indian Campus Hinglish & Vernacular Normalization", () => {
  it("converts 'subah 10 baje' to '10 AM'", () => {
    const input = "subah 10 baje test hoga";
    const { text } = normalizeCampusHinglish(input);
    expect(text).toContain("10 AM");
    expect(text).not.toContain("baje");
  });

  it("converts 'dopahar 12' to '12:00 PM'", () => {
    const input = "submission due dopahar 12 baje";
    const { text } = normalizeCampusHinglish(input);
    expect(text).toContain("12:00 PM");
  });

  it("converts 'shaam 5' to '5 PM'", () => {
    const input = "workshop shaam 5 baje";
    const { text } = normalizeCampusHinglish(input);
    expect(text).toContain("5 PM");
  });

  it("converts 'se' between times to 'to'", () => {
    const input = "10:00 AM se 11:30 AM tak";
    const { text } = normalizeCampusHinglish(input);
    expect(text).toContain("10:00 AM to 11:30 AM");
    expect(text).not.toContain("tak");
  });

  it("normalizes '12:00 noon' to '12:00 PM' and '12 midnight' to '00:00'", () => {
    expect(normalizeCampusHinglish("due by 12:00 noon").text).toBe("due by 12:00 PM");
    expect(normalizeCampusHinglish("due at 12 midnight").text).toBe("due at 00:00");
  });
});

describe("Preprocessor - Clause Segmentation Guarding Abbreviations", () => {
  it("does not split on 'Dr.', 'Prof.', 'Dept.', 'Room No.', or 'B.Tech.'", () => {
    const input = "Prof. Sharma from Dept. of CSE announced that Internal Test in B.Tech. Room No. 204 starts at 10:00 AM. Submission is due at 12:00 PM.";
    const clauses = segmentEventClauses(input);

    expect(clauses.length).toBe(2);
    expect(clauses[0]?.text).toContain("Prof. Sharma");
    expect(clauses[0]?.text).toContain("Dept. of CSE");
    expect(clauses[0]?.text).toContain("B.Tech.");
    expect(clauses[0]?.text).toContain("Room No. 204");
    expect(clauses[1]?.text).toContain("Submission is due at 12:00 PM");
  });

  it("segments OFFICIAL_PS02_NOTICE into 3 atomic event clauses", () => {
    const clauses = segmentEventClauses(OFFICIAL_PS02_NOTICE);
    expect(clauses.length).toBe(3);

    expect(clauses[0]?.text).toContain("Internal Test 2");
    expect(clauses[1]?.text).toContain("Lab records must be submitted");
    expect(clauses[2]?.text).toContain("guest lecture");
  });
});

describe("Preprocessor - Full preprocessNotice Pipeline", () => {
  it("processes HINGLISH_WHATSAPP_NOTICE and fixes campus vernacular tokens", () => {
    const result = preprocessNotice(HINGLISH_WHATSAPP_NOTICE);

    expect(result.appliedFixes.hinglishFixesCount).toBeGreaterThan(0);
    expect(result.normalizedText).toContain("10 AM");
    expect(result.clauses.length).toBeGreaterThanOrEqual(2);
  });

  it("processes scanned notice with multiple OCR glitches", () => {
    const scannedNotice = 'All Il-year CSE: Internal Test at T:00 AM in Roorn 204. Guest lecture on "Al in Healthcare" in Serminar Hall.';
    const result = preprocessNotice(scannedNotice);

    expect(result.appliedFixes.ocrFixesCount).toBeGreaterThanOrEqual(4);
    expect(result.normalizedText).toContain("III-year");
    expect(result.normalizedText).toContain("11:00 AM");
    expect(result.normalizedText).toContain("Room 204");
    expect(result.normalizedText).toContain("AI in Healthcare");
    expect(result.normalizedText).toContain("Seminar Hall");
  });
});

