import { describe, it, expect, vi } from "vitest";
import {
  determineFileType,
  extractTextFromPdfBuffer,
  generateSimulatedNoticeBoardImage,
  simulateScannedNoticeDemo,
  type IngestionProgress,
} from "../lib/parser/fileIngestor";

describe("FileIngestor - 1. File Type Detection", () => {
  it("detects plain text and markdown files (.txt, .md)", () => {
    expect(determineFileType({ name: "circular.txt", type: "text/plain" })).toBe("text");
    expect(determineFileType({ name: "notes.md", type: "text/markdown" })).toBe("text");
    expect(determineFileType({ name: "notice.log" })).toBe("text");
  });

  it("detects notice board photos and screenshots (.png, .jpg, .webp)", () => {
    expect(determineFileType({ name: "notice_board.jpg", type: "image/jpeg" })).toBe("image");
    expect(determineFileType({ name: "whatsapp_screenshot.png", type: "image/png" })).toBe("image");
    expect(determineFileType({ name: "scan.webp", type: "image/webp" })).toBe("image");
  });

  it("detects PDF circulars (.pdf)", () => {
    expect(determineFileType({ name: "exam_schedule.pdf", type: "application/pdf" })).toBe("pdf");
    expect(determineFileType({ name: "circular.PDF" })).toBe("pdf");
  });

  it("rejects unsupported extensions", () => {
    expect(determineFileType({ name: "archive.zip", type: "application/zip" })).toBeNull();
    expect(determineFileType({ name: "audio.mp3" })).toBeNull();
  });
});

describe("FileIngestor - 2. PDF Text Stream Extraction", () => {
  it("extracts text from simulated PDF stream buffers", () => {
    const rawPdf =
      "BT /F1 12 Tf (All III-year CSE students:) Tj ( Internal Test 2 in Room 204) Tj ET";
    const enc = new TextEncoder();
    const buffer = enc.encode(rawPdf).buffer;

    const extracted = extractTextFromPdfBuffer(buffer);
    expect(extracted).toContain("All III-year CSE students:");
    expect(extracted).toContain("Internal Test 2 in Room 204");
  });

  it("decodes escaped PDF characters", () => {
    const rawPdf =
      "BT (Lecture\\(AI\\) at 10\\:00 AM) Tj ET";
    const enc = new TextEncoder();
    const buffer = enc.encode(rawPdf).buffer;

    const extracted = extractTextFromPdfBuffer(buffer);
    expect(extracted).toContain("Lecture(AI) at 10:00 AM");
  });
});

describe("FileIngestor - 3. Simulated Notice Board Photo Generator", () => {
  it("generates a high-resolution SVG data URI with university header and PS-02 notice", () => {
    const uri = generateSimulatedNoticeBoardImage();
    expect(uri.startsWith("data:image/svg+xml;utf8,")).toBe(true);
    expect(uri).toContain("GOVERNMENT%20COLLEGE%20OF%20TECHNOLOGY");
    expect(uri).toContain("DEPARTMENT%20OF%20COMPUTER%20SCIENCE");
    expect(uri).toContain("Internal%20Test%202");
    expect(uri).toContain("Room%20204");
    expect(uri).toContain("12%3A00%20noon");
  });
});

describe("FileIngestor - 4. 1-Click Simulated Scanned Notice Demo", () => {
  it("runs animated OCR progress and automatically applies OCR typo repair", async () => {
    const progressList: IngestionProgress[] = [];

    const result = await simulateScannedNoticeDemo((p) => {
      progressList.push(p);
    });

    expect(progressList.length).toBeGreaterThanOrEqual(4);
    expect(progressList[0]?.percentage).toBe(10);
    expect(progressList[progressList.length - 1]?.percentage).toBe(100);

    expect(result.fileType).toBe("image");
    expect(result.fileName).toBe("campus_notice_board_photo.jpg");
    expect(result.ocrConfidence).toBe(96);
    expect(result.ocrFixesCount).toBeGreaterThanOrEqual(1);

    // Verifies OCR typo repair: Serminar Hall -> Seminar Hall
    expect(result.rawText).toContain("Serminar Hall");
    expect(result.cleanedText).toContain("Seminar Hall");
    expect(result.cleanedText).not.toContain("Serminar Hall");
  });
});