import { describe, it, expect, vi } from "vitest";
import {
  determineFileType,
  extractTextFromPdfBuffer,
  extractTextFromPdfBufferDetailed,
  generateSimulatedNoticeBoardImage,
  simulateScannedNoticeDemo,
  validateFileSize,
  validateFileMagicBytes,
  ingestNoticeFile,
  MAX_FILE_SIZE_BYTES,
  MAX_PDF_PAGES,
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

describe("FileIngestor - 5. Enterprise Upload Security (5 MB Max Limit)", () => {
  it("allows files under 5 MB", () => {
    expect(() => validateFileSize(1024 * 1024)).not.toThrow(); // 1 MB
    expect(() => validateFileSize(MAX_FILE_SIZE_BYTES)).not.toThrow(); // exactly 5 MB
  });

  it("throws clear error when file exceeds 5 MB", () => {
    const oversizedBytes = 5.5 * 1024 * 1024; // 5.5 MB
    expect(() => validateFileSize(oversizedBytes)).toThrowError(
      /exceeds the strict 5 MB limit/i
    );
  });

  it("ingestNoticeFile rejects files larger than 5 MB", async () => {
    const bigFile = new File(["A".repeat(100)], "large_notice.pdf", {
      type: "application/pdf",
    });
    Object.defineProperty(bigFile, "size", { value: 6 * 1024 * 1024 });

    await expect(ingestNoticeFile(bigFile)).rejects.toThrowError(
      /exceeds the strict 5 MB limit/i
    );
  });
});

describe("FileIngestor - 6. Magic Bytes File Signature Verification", () => {
  it("validates authentic PNG magic bytes (89 50 4E 47)", () => {
    const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const check = validateFileMagicBytes(pngHeader, "image");
    expect(check.isValid).toBe(true);
    expect(check.format).toBe("png");
    expect(check.magicHex).toBe("89 50 4E 47");
  });

  it("validates authentic JPEG magic bytes (FF D8 FF)", () => {
    const jpegHeader = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
    const check = validateFileMagicBytes(jpegHeader, "image");
    expect(check.isValid).toBe(true);
    expect(check.format).toBe("jpeg");
    expect(check.magicHex).toBe("FF D8 FF E0");
  });

  it("validates authentic PDF magic bytes (25 50 44 46, %PDF)", () => {
    const pdfHeader = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x35]);
    const check = validateFileMagicBytes(pdfHeader, "pdf");
    expect(check.isValid).toBe(true);
    expect(check.format).toBe("pdf");
    expect(check.magicHex).toBe("25 50 44 46");
  });

  it("detects and blocks disguised Windows executable (4D 5A, MZ) named as PDF", () => {
    // Windows PE EXE magic header: 4D 5A (MZ)
    const exeHeader = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
    const check = validateFileMagicBytes(exeHeader, "pdf");
    expect(check.isValid).toBe(false);
    expect(check.error).toContain("Disguised binary executable detected");
    expect(check.error).toContain("Windows PE");
  });

  it("detects and blocks disguised Linux ELF binary (7F 45 4C 46) named as PNG", () => {
    const elfHeader = new Uint8Array([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00]);
    const check = validateFileMagicBytes(elfHeader, "image");
    expect(check.isValid).toBe(false);
    expect(check.error).toContain("Disguised binary executable detected");
    expect(check.error).toContain("Linux ELF");
  });

  it("rejects HTML or script payload disguised as image or PDF", () => {
    // "<!DO" -> 3C 21 44 4F
    const htmlHeader = new Uint8Array([0x3c, 0x21, 0x44, 0x4f, 0x43, 0x54, 0x59, 0x50]);
    const checkPdf = validateFileMagicBytes(htmlHeader, "pdf");
    expect(checkPdf.isValid).toBe(false);
    expect(checkPdf.error).toContain("Invalid PDF file signature");

    const checkImg = validateFileMagicBytes(htmlHeader, "image");
    expect(checkImg.isValid).toBe(false);
    expect(checkImg.error).toContain("Invalid image file signature");
  });
});

describe("FileIngestor - 7. PDF Page Parsing Ceiling (First 5 Pages)", () => {
  it("caps multi-page PDF parsing strictly to the first 5 pages", () => {
    // Construct a simulated 8-page PDF document
    const pages = Array.from(
      { length: 8 },
      (_, i) =>
        `/Type /Page\nBT /F1 12 Tf (Page ${i + 1} Examination Clause on 13 Nov) Tj ET\n`
    ).join("\n");

    const rawPdf = `%PDF-1.4\n${pages}\n%%EOF`;
    const enc = new TextEncoder();
    const buffer = enc.encode(rawPdf).buffer;

    const detailed = extractTextFromPdfBufferDetailed(buffer, undefined, MAX_PDF_PAGES);

    expect(detailed.pagesCapped).toBe(true);
    expect(detailed.pagesExtracted).toBe(5);

    // First 5 pages are present
    expect(detailed.text).toContain("Page 1 Examination Clause");
    expect(detailed.text).toContain("Page 5 Examination Clause");

    // Pages 6, 7, 8 must NOT be extracted
    expect(detailed.text).not.toContain("Page 6 Examination Clause");
    expect(detailed.text).not.toContain("Page 7 Examination Clause");
    expect(detailed.text).not.toContain("Page 8 Examination Clause");
  });

  it("extracts all pages when PDF is under the 5 page limit without capping", () => {
    const pages = Array.from(
      { length: 3 },
      (_, i) =>
        `/Type /Page\nBT /F1 12 Tf (Page ${i + 1} Lecture Announcement) Tj ET\n`
    ).join("\n");

    const rawPdf = `%PDF-1.4\n${pages}\n%%EOF`;
    const enc = new TextEncoder();
    const buffer = enc.encode(rawPdf).buffer;

    const detailed = extractTextFromPdfBufferDetailed(buffer, undefined, 5);

    expect(detailed.pagesCapped).toBe(false);
    expect(detailed.pagesExtracted).toBe(3);
    expect(detailed.text).toContain("Page 1 Lecture Announcement");
    expect(detailed.text).toContain("Page 3 Lecture Announcement");
  });
});
