import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, act, renderHook } from "@testing-library/react";
import { usePresenterShortcuts } from "@/src/lib/shortcuts/usePresenterShortcuts";
import { PresenterCheatSheetModal } from "@/src/components/common/PresenterCheatSheetModal";
import { useNoticeStore } from "@/src/store/useNoticeStore";
import { useStore } from "@/src/store";

describe("usePresenterShortcuts — PS-02 Single-Key Live Pitch Hotkeys", () => {
  beforeEach(() => {
    // Reset stores
    useNoticeStore.setState({
      viewMode: "STUDENT",
      rawNoticeText: "",
      events: [],
      pairwiseClashes: [],
      activeHighlightedEventId: null,
      activeEscalationClashId: null,
      liveSyncToast: null,
    });
    useStore.setState({
      events: [],
    });

    // Mock document.getElementById for smooth scroll
    vi.spyOn(document, "getElementById").mockReturnValue({
      scrollIntoView: vi.fn(),
    } as unknown as HTMLElement);

    // Mock URL.createObjectURL and revokeObjectURL
    if (!window.URL.createObjectURL) {
      window.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    }
    if (!window.URL.revokeObjectURL) {
      window.URL.revokeObjectURL = vi.fn();
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initializes with cheat sheet closed", () => {
    const { result } = renderHook(() => usePresenterShortcuts());
    expect(result.current.isCheatSheetOpen).toBe(false);
  });

  it("Hotkey '1' instantly loads official PS-02 sample notice & highlights clash", () => {
    const { result } = renderHook(() => usePresenterShortcuts());

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "1" }));
    });

    const noticeState = useNoticeStore.getState();
    const storeState = useStore.getState();

    expect(noticeState.viewMode).toBe("STUDENT");
    expect(noticeState.events.length).toBe(3);
    expect(storeState.events.length).toBe(3);

    // Check extracted events
    const titles = noticeState.events.map((e) => e.title);
    expect(titles.some((t) => t.includes("Internal Test 2"))).toBe(true);
    expect(titles.some((t) => t.includes("Lab record"))).toBe(true);
    expect(titles.some((t) => t.includes("AI in Healthcare"))).toBe(true);

    // Check highlighted event
    expect(noticeState.activeHighlightedEventId).toBeTruthy();

    // Check live toast
    expect(noticeState.liveSyncToast?.title).toContain("PS-02 Benchmark Loaded");
  });

  it("Hotkey '2' triggers 1-Click Auto-Rescheduler and flips clashes to 🟢 NO CLASH", () => {
    const { result } = renderHook(() => usePresenterShortcuts());

    // First load sample
    act(() => {
      result.current.loadPs02Sample();
    });

    // Clashes should be active before auto-rescheduling
    const initialClashes = useNoticeStore.getState().pairwiseClashes;
    const hasInitialClash = initialClashes.some((c) => c.hasClash);
    expect(hasInitialClash).toBe(true);

    // Trigger Hotkey '2'
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "2" }));
    });

    const updatedState = useNoticeStore.getState();
    const lecture = updatedState.events.find((e) => e.title.includes("AI in Healthcare"));
    expect(lecture).toBeDefined();
    expect(lecture?.startTime).toBe("12:30");
    expect(lecture?.endTime).toBe("14:00");

    // All clashes should now be NO_CLASH
    const remainingClashes = updatedState.pairwiseClashes.filter((c) => c.hasClash);
    expect(remainingClashes.length).toBe(0);

    // Live toast updated
    expect(updatedState.liveSyncToast?.title).toContain("Auto-Rescheduled");
  });

  it("Hotkey '3' opens the 1-Click Conflict Escalation Modal", () => {
    const { result } = renderHook(() => usePresenterShortcuts());

    act(() => {
      result.current.loadPs02Sample();
    });

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "3" }));
    });

    const state = useNoticeStore.getState();
    expect(state.activeEscalationClashId).toBeTruthy();
  });

  it("Hotkey '4' switches view mode to 🏛 B2B Admin Validator", () => {
    renderHook(() => usePresenterShortcuts());

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "4" }));
    });

    expect(useNoticeStore.getState().viewMode).toBe("B2B_ADMIN");
    expect(useNoticeStore.getState().liveSyncToast?.title).toContain("B2B Admin Validator");
  });

  it("Hotkey '5' switches view mode to 🛡 Security & Red-Team Lab", () => {
    renderHook(() => usePresenterShortcuts());

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "5" }));
    });

    expect(useNoticeStore.getState().viewMode).toBe("RED_TEAM_LAB");
    expect(useNoticeStore.getState().liveSyncToast?.title).toContain("Security & Red-Team Lab");
  });

  it("Hotkey 'E' exports .ics calendar and triggers celebratory toast", () => {
    const { result } = renderHook(() => usePresenterShortcuts());

    act(() => {
      result.current.loadPs02Sample();
    });

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "e" }));
    });

    const toast = useNoticeStore.getState().liveSyncToast;
    expect(toast?.title).toContain("Valid RFC-5545 .ics Exported");
    expect(toast?.title).toContain("Ready for Google, Apple & Outlook Calendar");
  });

  it("Hotkey '?' toggles cheat sheet and 'Escape' closes it", () => {
    const { result } = renderHook(() => usePresenterShortcuts());

    expect(result.current.isCheatSheetOpen).toBe(false);

    // Press '?'
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "?" }));
    });
    expect(result.current.isCheatSheetOpen).toBe(true);

    // Press 'Escape'
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(result.current.isCheatSheetOpen).toBe(false);
  });

  it("ignores hotkeys when typing inside an input element", () => {
    const { result } = renderHook(() => usePresenterShortcuts());

    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    act(() => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "1", bubbles: true }));
    });

    // Events should remain empty
    expect(useNoticeStore.getState().events.length).toBe(0);

    document.body.removeChild(input);
  });
});

describe("PresenterCheatSheetModal Component", () => {
  it("renders the floating toggle pill in footer", () => {
    const onToggle = vi.fn();
    render(
      <PresenterCheatSheetModal
        isOpen={false}
        onClose={vi.fn()}
        onToggle={onToggle}
      />
    );

    const pill = screen.getByRole("button", { name: /toggle presenter keyboard shortcuts/i });
    expect(pill).toBeDefined();

    fireEvent.click(pill);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("renders the modal when isOpen is true and lists all 6 hotkeys", () => {
    const onTrigger = vi.fn();
    render(
      <PresenterCheatSheetModal
        isOpen={true}
        onClose={vi.fn()}
        onToggle={vi.fn()}
        onTriggerAction={onTrigger}
      />
    );

    expect(screen.getByText(/Live Pitch Presenter Hotkeys/i)).toBeDefined();
    expect(screen.getByText("1")).toBeDefined();
    expect(screen.getByText("2")).toBeDefined();
    expect(screen.getByText("3")).toBeDefined();
    expect(screen.getByText("4")).toBeDefined();
    expect(screen.getByText("5")).toBeDefined();
    expect(screen.getByText("E")).toBeDefined();

    // Clicking row 1 triggers action
    fireEvent.click(screen.getByText(/Load PS-02 Benchmark/i));
    expect(onTrigger).toHaveBeenCalledWith("1");
  });
});
