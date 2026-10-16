import { describe, it, expect } from "vitest";
import { extractTimeRange, toMinutes, fromMinutes, parseSingleTime } from "../lib/parser/timeParser";

describe("Time Parsing Helpers (toMinutes, fromMinutes, parseSingleTime)", () => {
  it("converts HH:mm to minutes and back", () => {
    expect(toMinutes("10:30")).toBe(630);
    expect(fromMinutes(630)).toBe("10:30");
    expect(toMinutes("00:00")).toBe(0);
    expect(fromMinutes(0)).toBe("00:00");
  });

  it("parses single times across 12h/24h/noon/midnight formats", () => {
    expect(parseSingleTime("12", "00", "noon")).toBe("12:00");
    expect(parseSingleTime("12", "00", "midnight")).toBe("00:00");
    expect(parseSingleTime("2", "30", "pm")).toBe("14:30");
    expect(parseSingleTime("11", "00", "am")).toBe("11:00");
    expect(parseSingleTime("14", "00")).toBe("14:00");
  });
});

describe("Explicit Time Ranges", () => {
  it("parses 'from 10:00 AM to 11:30 AM'", () => {
    const res = extractTimeRange("from 10:00 AM to 11:30 AM");
    expect(res).not.toBeNull();
    expect(res?.startTime).toBe("10:00");
    expect(res?.endTime).toBe("11:30");
    expect(res?.durationMinutes).toBe(90);
    expect(res?.isDeadline).toBe(false);
  });

  it("parses '11:00 AM to 12:30 PM'", () => {
    const res = extractTimeRange("11:00 AM to 12:30 PM");
    expect(res?.startTime).toBe("11:00");
    expect(res?.endTime).toBe("12:30");
    expect(res?.durationMinutes).toBe(90);
  });

  it("parses '10:00 - 11:30 AM' with hyphen separator", () => {
    const res = extractTimeRange("Internal Test from 10:00 - 11:30 AM");
    expect(res?.startTime).toBe("10:00");
    expect(res?.endTime).toBe("11:30");
    expect(res?.durationMinutes).toBe(90);
  });

  it("parses '2 PM to 4 PM'", () => {
    const res = extractTimeRange("Workshop from 2 PM to 4 PM");
    expect(res?.startTime).toBe("14:00");
    expect(res?.endTime).toBe("16:00");
    expect(res?.durationMinutes).toBe(120);
  });

  it("parses 24-hour ranges '14:00 to 15:30' and '14:00-16:00'", () => {
    const res1 = extractTimeRange("Session from 14:00 to 15:30");
    expect(res1?.startTime).toBe("14:00");
    expect(res1?.endTime).toBe("15:30");
    expect(res1?.durationMinutes).toBe(90);

    const res2 = extractTimeRange("Lab from 14:00-16:00");
    expect(res2?.startTime).toBe("14:00");
    expect(res2?.endTime).toBe("16:00");
    expect(res2?.durationMinutes).toBe(120);
  });
});

describe("Meridiem Inheritance Across Ranges", () => {
  it("infers AM for start time in '10:00 to 11:30 AM'", () => {
    const res = extractTimeRange("Session 10:00 to 11:30 AM");
    expect(res?.startTime).toBe("10:00");
    expect(res?.endTime).toBe("11:30");
  });

  it("infers AM for 11:00 when spanning noon in '11:00 to 1:00 PM'", () => {
    const res = extractTimeRange("Lecture from 11:00 to 1:00 PM");
    expect(res?.startTime).toBe("11:00");
    expect(res?.endTime).toBe("13:00");
    expect(res?.durationMinutes).toBe(120);
  });

  it("infers PM for start time in '2 to 4 PM'", () => {
    const res = extractTimeRange("Discussion from 2 to 4 PM");
    expect(res?.startTime).toBe("14:00");
    expect(res?.endTime).toBe("16:00");
  });

  it("infers AM for start time in '9 to 11 AM'", () => {
    const res = extractTimeRange("Review from 9 to 11 AM");
    expect(res?.startTime).toBe("09:00");
    expect(res?.endTime).toBe("11:00");
  });
});

describe("Point-in-Time Deadlines", () => {
  it("parses 'by 12:00 noon' as point-in-time deadline (duration = 0)", () => {
    const res = extractTimeRange("Submission by 12:00 noon");
    expect(res?.startTime).toBe("12:00");
    expect(res?.endTime).toBe("12:00");
    expect(res?.durationMinutes).toBe(0);
    expect(res?.isDeadline).toBe(true);
  });

  it("parses 'due at 12:00 PM'", () => {
    const res = extractTimeRange("Project due at 12:00 PM");
    expect(res?.startTime).toBe("12:00");
    expect(res?.endTime).toBe("12:00");
    expect(res?.isDeadline).toBe(true);
  });

  it("parses 'by 2 PM'", () => {
    const res = extractTimeRange("Hand in records by 2 PM");
    expect(res?.startTime).toBe("14:00");
    expect(res?.endTime).toBe("14:00");
    expect(res?.isDeadline).toBe(true);
  });

  it("parses 'by 14:00' and 'by 5:00 PM'", () => {
    const res1 = extractTimeRange("Upload files by 14:00");
    expect(res1?.startTime).toBe("14:00");
    expect(res1?.endTime).toBe("14:00");
    expect(res1?.isDeadline).toBe(true);

    const res2 = extractTimeRange("Submit latest by 5:00 PM");
    expect(res2?.startTime).toBe("17:00");
    expect(res2?.endTime).toBe("17:00");
    expect(res2?.isDeadline).toBe(true);
  });

  it("parses official PS-02 deadline clause", () => {
    const text = "Lab records must be submitted to the department office by 12:00 noon on 13 Nov.";
    const res = extractTimeRange(text);
    expect(res?.startTime).toBe("12:00");
    expect(res?.endTime).toBe("12:00");
    expect(res?.durationMinutes).toBe(0);
    expect(res?.isDeadline).toBe(true);
  });
});

describe("Missing End-Time Fallback (+60 mins for Test/Lecture)", () => {
  it("defaults endTime to +60 minutes for Lecture with only start time", () => {
    const res = extractTimeRange("Guest lecture at 2 PM", "Lecture");
    expect(res?.startTime).toBe("14:00");
    expect(res?.endTime).toBe("15:00");
    expect(res?.durationMinutes).toBe(60);
    expect(res?.isInferredEndTime).toBe(true);
    expect(res?.confidencePenalty).toBe(15);
    expect(res?.needsReview).toBe(true);
    expect(res?.reviewReason).toBe("End time inferred (+1 hr)");
  });

  it("defaults endTime to +60 minutes for Test with only start time", () => {
    const res = extractTimeRange("Internal Test starting at 10:00 AM", "Test");
    expect(res?.startTime).toBe("10:00");
    expect(res?.endTime).toBe("11:00");
    expect(res?.durationMinutes).toBe(60);
    expect(res?.isInferredEndTime).toBe(true);
    expect(res?.needsReview).toBe(true);
  });
});
