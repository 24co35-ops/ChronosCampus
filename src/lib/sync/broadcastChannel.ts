"use client";

/**
 * broadcastChannel.ts — ChronosCampus Cross-Window Live Broadcast Sync Engine
 *
 * Implements real-time cross-tab / cross-window synchronization for live pitches & production:
 * 1. Uses browser-native BroadcastChannel('chronoscampus_live_sync') for zero-latency (<2ms) peer sync.
 * 2. Provides robust localStorage event fallback for cross-origin or private-browsing edge cases.
 * 3. Supports dual-window pitch mode:
 *    - Window 1: Faculty / B2B Admin mode auto-reschedules and broadcasts circular updates.
 *    - Window 2: Student Mobile view receives update in real time, flashes toast, and animates Gantt to green.
 */

import type { DecodedEvent } from "@/src/types/notice";

export const BROADCAST_CHANNEL_NAME = "chronoscampus_live_sync";
export const STORAGE_FALLBACK_KEY = "chronoscampus_live_sync_fallback";

export interface SyncMessage {
  id: string;
  type: "SCHEDULE_BROADCAST" | "AUTO_RESCHEDULE" | "RESET_NOTICE" | "REQUEST_SYNC";
  senderId: string;
  source: "B2B_ADMIN" | "STUDENT" | "SYSTEM";
  title: string;
  message: string;
  events: DecodedEvent[];
  timestamp: number;
}

// Generate unique session tab ID to filter out self-broadcasts
export const CURRENT_TAB_ID =
  typeof window !== "undefined"
    ? "tab_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now().toString(36)
    : "ssr_host";

/**
 * Dispatches a schedule update to all listening browser windows and tabs.
 */
export function broadcastScheduleUpdate(
  events: DecodedEvent[],
  meta?: {
    title?: string;
    message?: string;
    source?: "B2B_ADMIN" | "STUDENT" | "SYSTEM";
    type?: "SCHEDULE_BROADCAST" | "AUTO_RESCHEDULE" | "RESET_NOTICE";
  }
): SyncMessage {
  const payload: SyncMessage = {
    id: "sync_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 6),
    type: meta?.type || "AUTO_RESCHEDULE",
    senderId: CURRENT_TAB_ID,
    source: meta?.source || "B2B_ADMIN",
    title: meta?.title || "🔔 Live Department Update Received: Clash Resolved!",
    message:
      meta?.message ||
      "Department Exam Cell auto-rescheduled Guest Lecture to 12:15 PM – 100% clash-free schedule.",
    events,
    timestamp: Date.now(),
  };

  // 1. Native BroadcastChannel
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    try {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.postMessage(payload);
      channel.close();
    } catch (e) {
      console.warn("[ChronosCampus:Broadcast] Error sending via BroadcastChannel:", e);
    }
  }

  // 2. LocalStorage Fallback (triggers 'storage' event in other windows)
  if (typeof window !== "undefined" && window.localStorage && typeof window.localStorage.setItem === "function") {
    try {
      localStorage.setItem(STORAGE_FALLBACK_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn("[ChronosCampus:Broadcast] Error writing to localStorage fallback:", e);
    }
  }

  return payload;
}

/**
 * Subscribes to live broadcasts from other windows/tabs.
 * Returns an unsubscribe cleanup function.
 */
export function subscribeToBroadcast(callback: (payload: SyncMessage) => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  let channel: BroadcastChannel | null = null;

  // 1. Native BroadcastChannel Listener
  if ("BroadcastChannel" in window) {
    try {
      channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.onmessage = (event: MessageEvent) => {
        const data = event.data as SyncMessage;
        if (data && data.senderId !== CURRENT_TAB_ID && Array.isArray(data.events)) {
          callback(data);
        }
      };
    } catch (e) {
      console.warn("[ChronosCampus:Broadcast] Error initializing BroadcastChannel listener:", e);
    }
  }

  // 2. Storage Event Listener (Fallback)
  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key === STORAGE_FALLBACK_KEY && event.newValue) {
      try {
        const data = JSON.parse(event.newValue) as SyncMessage;
        if (data && data.senderId !== CURRENT_TAB_ID && Array.isArray(data.events)) {
          callback(data);
        }
      } catch (err) {
        console.warn("[ChronosCampus:Broadcast] Failed to parse storage event payload:", err);
      }
    }
  };

  window.addEventListener("storage", handleStorageEvent);

  return () => {
    if (channel) {
      try {
        channel.close();
      } catch {
        // Ignore close error on cleanup
      }
      channel = null;
    }
    window.removeEventListener("storage", handleStorageEvent);
  };
}
