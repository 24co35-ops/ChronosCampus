/**
 * ps02-golden-path.spec.ts — Playwright End-to-End Specification
 *
 * Simulates the exact judge evaluation flow from start to finish:
 * 1. Render application and load official PS-02 sample notice.
 * 2. Assert all 3 events appear in the editable grid with exact dates (13 Nov 2026),
 *    times (10:00 AM - 11:30 AM, by 12:00 PM, 11:00 AM - 12:30 PM),
 *    and venues (Room 204, Department office, Seminar Hall).
 * 3. Assert all 3 clash check rows match the PS-02 document results:
 *    - 30 minutes overlap between Test and Guest Lecture.
 *    - 12:00 PM deadline falls during the lecture.
 *    - No clash between Test and record deadline.
 * 4. Simulate a user editing Guest Lecture time to 12:30 PM - 2:00 PM
 *    and assert all clashes immediately flip to No Clash.
 * 5. Trigger the .ics generator and assert output is a valid RFC-5545 calendar stream.
 */

import { test, expect } from "@playwright/test";

test.describe("ChronosCampus — PS-02 Golden Path E2E", () => {
  test("executes complete evaluation flow from sample load to conflict resolution and RFC-5545 export", async ({ page }) => {
    // ── 1. Navigate to Application and Load PS-02 Notice ─────────────────────
    await page.goto("http://localhost:3000");

    const presetBtn = page.locator("#preset-ps02-official");
    await expect(presetBtn).toBeVisible();
    await presetBtn.click();

    // ── 2. Assert All 3 Events in Editable Grid with Exact Fields ────────────
    // Event 1: Internal Test 2
    const row0 = page.locator("#event-row-0");
    await expect(page.locator("#title-input-0")).toHaveValue("Internal Test 2");
    await expect(page.locator("#date-input-0")).toHaveValue("2026-11-13");
    await expect(row0).toContainText("13 Nov 2026");
    await expect(page.locator("#start-time-input-0")).toHaveValue("10:00");
    await expect(page.locator("#end-time-input-0")).toHaveValue("11:30");
    await expect(row0).toContainText("10:00 AM – 11:30 AM");
    await expect(page.locator("#venue-input-0")).toHaveValue(/Room 204/i);

    // Event 2: Lab record submission
    const row1 = page.locator("#event-row-1");
    await expect(page.locator("#title-input-1")).toHaveValue("Lab record submission");
    await expect(page.locator("#date-input-1")).toHaveValue("2026-11-13");
    await expect(row1).toContainText("13 Nov 2026");
    await expect(page.locator("#start-time-input-1")).toHaveValue("12:00");
    await expect(row1).toContainText("by 12:00 PM");
    await expect(page.locator("#venue-input-1")).toHaveValue(/Department office/i);

    // Event 3: Guest lecture: AI in Healthcare
    const row2 = page.locator("#event-row-2");
    await expect(page.locator("#title-input-2")).toHaveValue("Guest lecture: AI in Healthcare");
    await expect(page.locator("#date-input-2")).toHaveValue("2026-11-13");
    await expect(row2).toContainText("13 Nov 2026");
    await expect(page.locator("#start-time-input-2")).toHaveValue("11:00");
    await expect(page.locator("#end-time-input-2")).toHaveValue("12:30");
    await expect(row2).toContainText("11:00 AM – 12:30 PM");
    await expect(page.locator("#venue-input-2")).toHaveValue(/Seminar Hall/i);

    // ── 3. Assert All 3 Pairwise Clash Rows Match PS-02 Document ─────────────
    // Row 1: Test and guest lecture (30 minutes overlap)
    const clashRow0 = page.locator("#pairwise-row-0");
    await expect(clashRow0).toContainText("Test and guest lecture");
    await expect(clashRow0).toContainText("CLASH (30m)");
    await expect(clashRow0).toContainText("30 minutes");

    // Row 2: Record deadline and guest lecture (12:00 PM falls during lecture)
    const clashRow1 = page.locator("#pairwise-row-1");
    await expect(clashRow1).toContainText("Record deadline and guest lecture");
    await expect(clashRow1).toContainText("CLASH (Point)");
    await expect(clashRow1).toContainText("12:00 PM deadline falls during the lecture");

    // Row 3: Test and record deadline (No clash)
    const clashRow2 = page.locator("#pairwise-row-2");
    await expect(clashRow2).toContainText("Test and record deadline");
    await expect(clashRow2).toContainText("NO CLASH");
    await expect(clashRow2).toContainText("No clash");

    // ── 4. Simulate User Editing Guest Lecture Time to 12:30 PM - 2:00 PM ────
    await page.fill("#start-time-input-2", "12:30");
    await page.fill("#end-time-input-2", "14:00");

    // Assert that all clashes immediately flip to No clash
    await expect(page.locator("#pairwise-row-0")).toContainText("NO CLASH");
    await expect(page.locator("#pairwise-row-1")).toContainText("NO CLASH");
    await expect(page.locator("#pairwise-row-2")).toContainText("NO CLASH");

    // ── 5. Trigger .ics Generator and Assert RFC-5545 Calendar Stream ─────────
    const downloadPromise = page.waitForEvent("download");
    await page.click("#export-ics-btn");
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/chronoscampus[-_]schedule[-_].*\.ics$/i);
    const readStream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of readStream) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }
    const icsContent = Buffer.concat(chunks).toString("utf-8");

    // RFC-5545 Standards Assertions
    expect(icsContent).toContain("BEGIN:VCALENDAR");
    expect(icsContent).toContain("VERSION:2.0");
    expect(icsContent).toContain("PRODID:-//ChronosCampus//Notice Decoder PS-02//EN");
    expect(icsContent).toContain("BEGIN:VEVENT");
    expect(icsContent).toContain("SUMMARY:Internal Test 2");
    expect(icsContent).toContain("SUMMARY:[DEADLINE] Lab record submission");
    expect(icsContent).toContain("SUMMARY:Guest lecture: AI in Healthcare");
    expect(icsContent).toContain("DTSTART;TZID=Asia/Kolkata:20261113T123000");
    expect(icsContent).toContain("DTEND;TZID=Asia/Kolkata:20261113T140000");
    expect(icsContent).toContain("END:VCALENDAR");
  });
});
