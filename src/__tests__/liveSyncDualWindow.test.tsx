import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { useNoticeStore } from "../store/useNoticeStore";
import { useStore } from "../store";
import { B2BAdminSandbox } from "../components/monetization/B2BAdminSandbox";
import { VisualTimelineGantt } from "../components/workspace/VisualTimelineGantt";
import { LiveSyncToastBanner } from "../components/common/LiveSyncToastBanner";
import { decodeNotice } from "../lib/parser/noticeDecoder";
import { OFFICIAL_PS02_NOTICE } from "../lib/fixtures/sampleNotices";
import { STORAGE_FALLBACK_KEY, type SyncMessage } from "../lib/sync/broadcastChannel";

describe("Live Pitch Dual-Window Sync (Faculty B2B -> Student Mobile View)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    vi.restoreAllMocks();
    useNoticeStore.getState().reset();
    useStore.getState().reset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("Window 1 (Faculty B2B view): renders live pitch dual-window banner and broadcast button", () => {
    render(<B2BAdminSandbox />);

    expect(screen.getByText(/Live Pitch Dual-Window Sync Demo/i)).toBeDefined();
    expect(screen.getByText(/BroadcastChannel\('chronoscampus_live_sync'\)/i)).toBeDefined();

    const broadcastBtn = screen.getByRole("button", {
      name: /✨ Auto-Reschedule Guest Lecture to 12:15 PM & Broadcast Notice/i,
    });
    expect(broadcastBtn).toBeDefined();

    // Clicking broadcast button dispatches update and shows feedback
    fireEvent.click(broadcastBtn);

    expect(
      screen.getByText(/✨ Dispatched: Guest Lecture rescheduled to 12:15 PM/i)
    ).toBeDefined();
  });

  it("Window 2 (Student view): receives broadcast, flashes live alert toast, and animates Gantt to zero-clash emerald", () => {
    // 1. Initial State in Student Window: load original clashing PS-02 notice
    const initialEvents = decodeNotice(OFFICIAL_PS02_NOTICE);
    useNoticeStore.getState().setEvents(initialEvents);

    // Initialize listener
    const cleanup = useNoticeStore.getState().initLiveSyncListener();

    const { rerender } = render(
      <div>
        <LiveSyncToastBanner />
        <VisualTimelineGantt />
      </div>
    );

    // Confirm initial clashing state (30 min overlap badge present)
    expect(screen.getAllByText(/30 Min Overlap/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/All Clear: 100% Clash-Free Schedule/i)).toBeNull();

    // 2. Simulate Faculty Window broadcasting auto-rescheduled events
    const rescheduledEvents = initialEvents.map((e) =>
      e.title.toLowerCase().includes("lecture") || e.type === "Lecture"
        ? { ...e, startTime: "12:15", endTime: "13:45" }
        : e
    );

    const facultyBroadcast: SyncMessage = {
      id: "sync_pitch_demo_01",
      type: "AUTO_RESCHEDULE",
      senderId: "tab_faculty_window_b2b_primary",
      source: "B2B_ADMIN",
      title: "🔔 Live Department Update Received: Clash Resolved!",
      message:
        "Department Exam Cell auto-rescheduled Guest Lecture to 12:15 PM – 100% clash-free schedule.",
      events: rescheduledEvents,
      timestamp: Date.now(),
    };

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: STORAGE_FALLBACK_KEY,
          newValue: JSON.stringify(facultyBroadcast),
        })
      );
    });

    rerender(
      <div>
        <LiveSyncToastBanner />
        <VisualTimelineGantt />
      </div>
    );

    // 3. Verification: Toast notification displayed with exact requested copy
    expect(screen.getByText("🔔 Live Department Update Received: Clash Resolved!")).toBeDefined();
    expect(
      screen.getByText(
        "Department Exam Cell auto-rescheduled Guest Lecture to 12:15 PM – 100% clash-free schedule."
      )
    ).toBeDefined();

    // 4. Verification: Gantt timeline switches to zero clashes and displays emerald all-clear badge
    expect(screen.getByText("All Clear: 100% Clash-Free Schedule")).toBeDefined();
    expect(screen.queryAllByText(/30 Min Overlap/i).length).toBe(0);

    cleanup();
  });
});
