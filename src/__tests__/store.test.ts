import { describe, it, expect, beforeEach } from "vitest";
import { useNoticeStore, runClashEngine } from "../store/useNoticeStore";
import { EXPECTED_PS02_OUTPUT } from "../lib/fixtures/sampleNotices";
import type { DecodedEvent } from "../types/notice";

describe("useNoticeStore - Reactive State & Instant Clash Resolution", () => {
  beforeEach(() => {
    useNoticeStore.getState().reset();
  });

  it("initializes with default clean state", () => {
    const state = useNoticeStore.getState();
    expect(state.rawNoticeText).toBe("");
    expect(state.events).toEqual([]);
    expect(state.pairwiseClashes).toEqual([]);
    expect(state.busyBlocks).toEqual([]);
    expect(state.recommendations).toEqual([]);
    expect(state.selectedCohort).toBe("All");
    expect(state.viewMode).toBe("STUDENT");
    expect(state.activeHighlightedEventId).toBeNull();
    expect(state.history.past).toEqual([]);
    expect(state.history.future).toEqual([]);
  });

  it("updates viewMode, selectedCohort, and activeHighlightedEventId", () => {
    const store = useNoticeStore.getState();
    store.setViewMode("B2B_ADMIN");
    expect(useNoticeStore.getState().viewMode).toBe("B2B_ADMIN");

    store.setSelectedCohort("III-year CSE");
    expect(useNoticeStore.getState().selectedCohort).toBe("III-year CSE");

    store.setActiveHighlightedEventId("event-123");
    expect(useNoticeStore.getState().activeHighlightedEventId).toBe("event-123");
  });

  it("populates events and recomputes clashes in < 5ms", () => {
    const t0 = performance.now();
    useNoticeStore.getState().setEvents(EXPECTED_PS02_OUTPUT.events);
    const duration = performance.now() - t0;

    const state = useNoticeStore.getState();
    expect(state.events.length).toBe(3);
    expect(state.pairwiseClashes.length).toBe(3);

    // Assert speed constraint (< 5ms)
    expect(duration).toBeLessThan(5);

    // Verify clashes identified
    const overlap = state.pairwiseClashes.find((c) => c.clashType === "HARD_OVERLAP");
    expect(overlap).toBeDefined();
    expect(overlap?.overlapMinutes).toBe(30);

    const containment = state.pairwiseClashes.find((c) => c.clashType === "DEADLINE_CONTAINMENT");
    expect(containment).toBeDefined();

    // Verify compound busy block created
    expect(state.busyBlocks.length).toBeGreaterThan(0);
  });

  it("updates event fields and triggers clash recalculation immediately", () => {
    useNoticeStore.getState().setEvents(EXPECTED_PS02_OUTPUT.events);

    // Shift test from 10:00-11:30 to 08:00-09:30 (eliminates overlap with 11:00 lecture)
    const t0 = performance.now();
    useNoticeStore.getState().updateEvent("ps02-test-2", {
      startTime: "08:00",
      endTime: "09:30",
    });
    const duration = performance.now() - t0;

    expect(duration).toBeLessThan(5);

    const state = useNoticeStore.getState();
    const updatedTest = state.events.find((e) => e.id === "ps02-test-2");
    expect(updatedTest?.startTime).toBe("08:00");
    expect(updatedTest?.endTime).toBe("09:30");

    // Overlap should now be gone
    const testLectureClash = state.pairwiseClashes.find(
      (c) =>
        (c.eventA === "ps02-test-2" && c.eventB === "ps02-guest-lecture") ||
        (c.eventA === "ps02-guest-lecture" && c.eventB === "ps02-test-2")
    );
    expect(testLectureClash?.hasClash).toBe(false);
    expect(testLectureClash?.clashType).toBe("NO_CLASH");
  });

  it("supports full Undo and Redo with clash recomputation", () => {
    useNoticeStore.getState().setEvents(EXPECTED_PS02_OUTPUT.events);
    expect(useNoticeStore.getState().events[0]?.startTime).toBe("10:00");

    // Mutation 1: edit startTime
    useNoticeStore.getState().updateEventField("ps02-test-2", "startTime", "07:00");
    expect(useNoticeStore.getState().events.find((e) => e.id === "ps02-test-2")?.startTime).toBe("07:00");

    // Undo
    useNoticeStore.getState().undo();
    expect(useNoticeStore.getState().events.find((e) => e.id === "ps02-test-2")?.startTime).toBe("10:00");

    // Redo
    useNoticeStore.getState().redo();
    expect(useNoticeStore.getState().events.find((e) => e.id === "ps02-test-2")?.startTime).toBe("07:00");
  });

  it("adds and deletes events dynamically", () => {
    useNoticeStore.getState().setEvents(EXPECTED_PS02_OUTPUT.events);
    expect(useNoticeStore.getState().events.length).toBe(3);

    useNoticeStore.getState().addManualEvent({
      id: "manual-1",
      title: "New Tutorial",
      startTime: "14:00",
      endTime: "15:00",
      type: "Lecture",
    });

    expect(useNoticeStore.getState().events.length).toBe(4);

    useNoticeStore.getState().deleteEvent("manual-1");
    expect(useNoticeStore.getState().events.length).toBe(3);
  });

  it("autoResolveClash eliminates HARD_OVERLAP conflict cleanly", () => {
    useNoticeStore.getState().setEvents(EXPECTED_PS02_OUTPUT.events);

    const overlapClash = useNoticeStore
      .getState()
      .pairwiseClashes.find((c) => c.clashType === "HARD_OVERLAP");
    expect(overlapClash).toBeDefined();

    const t0 = performance.now();
    useNoticeStore.getState().autoResolveClash(overlapClash!.id);
    const duration = performance.now() - t0;

    expect(duration).toBeLessThan(5);

    const state = useNoticeStore.getState();
    const resolvedClash = state.pairwiseClashes.find(
      (c) =>
        (c.eventA === overlapClash!.eventA && c.eventB === overlapClash!.eventB) ||
        (c.eventA === overlapClash!.eventB && c.eventB === overlapClash!.eventA)
    );

    // Overlap should be resolved
    expect(resolvedClash?.clashType).toBe("NO_CLASH");
    expect(resolvedClash?.hasClash).toBe(false);
  });
});
