import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  broadcastScheduleUpdate,
  subscribeToBroadcast,
  CURRENT_TAB_ID,
  BROADCAST_CHANNEL_NAME,
  STORAGE_FALLBACK_KEY,
  type SyncMessage,
} from "../lib/sync/broadcastChannel";
import { decodeNotice } from "../lib/parser/noticeDecoder";
import { OFFICIAL_PS02_NOTICE } from "../lib/fixtures/sampleNotices";

describe("broadcastChannel.ts — Native Broadcast & Storage Fallback Engine", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("broadcastScheduleUpdate formats a well-formed SyncMessage payload", () => {
    const events = decodeNotice(OFFICIAL_PS02_NOTICE);
    const msg = broadcastScheduleUpdate(events, {
      title: "Test Broadcast",
      message: "Testing synchronization payload",
      source: "B2B_ADMIN",
    });

    expect(msg.id).toContain("sync_");
    expect(msg.senderId).toBe(CURRENT_TAB_ID);
    expect(msg.source).toBe("B2B_ADMIN");
    expect(msg.title).toBe("Test Broadcast");
    expect(msg.message).toBe("Testing synchronization payload");
    expect(msg.events.length).toBe(3);
    expect(msg.timestamp).toBeGreaterThan(0);
  });

  it("subscribeToBroadcast listens to storage fallback events and filters self-broadcasts", () => {
    const callback = vi.fn();
    const unsubscribe = subscribeToBroadcast(callback);

    // 1. Simulated self-broadcast (same TAB_ID) -> should be ignored
    const selfMsg: SyncMessage = {
      id: "sync_1",
      type: "AUTO_RESCHEDULE",
      senderId: CURRENT_TAB_ID,
      source: "B2B_ADMIN",
      title: "Self Update",
      message: "Should be filtered out",
      events: decodeNotice(OFFICIAL_PS02_NOTICE),
      timestamp: Date.now(),
    };

    window.dispatchEvent(
      new StorageEvent("storage", {
        key: STORAGE_FALLBACK_KEY,
        newValue: JSON.stringify(selfMsg),
      })
    );

    expect(callback).not.toHaveBeenCalled();

    // 2. Simulated message from another window (different senderId) -> should trigger callback
    const remoteMsg: SyncMessage = {
      id: "sync_2",
      type: "AUTO_RESCHEDULE",
      senderId: "tab_window_faculty_b2b_99",
      source: "B2B_ADMIN",
      title: "🔔 Live Department Update Received: Clash Resolved!",
      message: "Guest Lecture moved to 12:15 PM",
      events: decodeNotice(OFFICIAL_PS02_NOTICE),
      timestamp: Date.now(),
    };

    window.dispatchEvent(
      new StorageEvent("storage", {
        key: STORAGE_FALLBACK_KEY,
        newValue: JSON.stringify(remoteMsg),
      })
    );

    expect(callback).toHaveBeenCalledWith(remoteMsg);

    // 3. Unsubscribe cleans up storage event listener
    unsubscribe();
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: STORAGE_FALLBACK_KEY,
        newValue: JSON.stringify(remoteMsg),
      })
    );
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
