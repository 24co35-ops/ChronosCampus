"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/src/components/layout/Navbar";
import { ErrorBoundary } from "@/src/components/common/ErrorBoundary";
import { FileDropzone } from "@/src/components/workspace/FileDropzone";
import { NoticeInputStudio } from "@/src/components/workspace/NoticeInputStudio";
import { EditableEventGrid } from "@/src/components/workspace/EditableEventGrid";
import { VisualTimelineGantt } from "@/src/components/workspace/VisualTimelineGantt";
import { ClashAuditPanel } from "@/src/components/workspace/ClashAuditPanel";
import { B2BAdminSandbox } from "@/src/components/monetization/B2BAdminSandbox";
import { RedTeamLab } from "@/src/components/security/RedTeamLab";
import { JudgeQuickTour } from "@/src/components/workspace/JudgeQuickTour";
import { LiveSyncToastBanner } from "@/src/components/common/LiveSyncToastBanner";
import { useNoticeStore } from "@/src/store/useNoticeStore";
import { usePresenterShortcuts } from "@/src/lib/shortcuts/usePresenterShortcuts";
import { PresenterCheatSheetModal } from "@/src/components/common/PresenterCheatSheetModal";
import { Logo } from "@/src/components/brand/Logo";
import { Terminal, X } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AppPage() {
  const router = useRouter();
  const viewMode = useNoticeStore((s) => s.viewMode);
  const setViewMode = useNoticeStore((s) => s.setViewMode);
  const initLiveSyncListener = useNoticeStore((s) => s.initLiveSyncListener);

  const {
    isCheatSheetOpen,
    setIsCheatSheetOpen,
    loadPs02Sample,
    autoReschedule,
    openEscalationDraft,
    switchToB2B,
    switchToRedTeam,
    exportIcs,
  } = usePresenterShortcuts();

  const [isIntroVisible, setIsIntroVisible] = useState(true);
  const [isJudgeModeOpen, setIsJudgeModeOpen] = useState(false);

  useEffect(() => {
    const cleanup = initLiveSyncListener();
    return () => cleanup();
  }, [initLiveSyncListener]);

  return (
    <div className="min-h-screen bg-white dark:bg-[#09090B] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans selection:bg-zinc-200 dark:selection:bg-zinc-800 transition-colors">
      <Navbar
        onBackToLanding={() => router.push("/")}
        isJudgeModeOpen={isJudgeModeOpen}
        onToggleJudgeMode={() => setIsJudgeModeOpen(!isJudgeModeOpen)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 flex flex-col gap-6">
        {viewMode === "STUDENT" && isIntroVisible && (
          <div className="rounded-xl bg-zinc-50/70 dark:bg-[#121215] border border-zinc-200/80 dark:border-zinc-800 p-4 sm:p-5 transition-colors flex items-start justify-between gap-4">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700/80 mb-2">
                <Terminal className="w-3 h-3 text-zinc-500 dark:text-zinc-400 shrink-0" strokeWidth={1.75} />
                <span>Notice Decoder Studio</span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-1">
                Convert Academic Circulars into Conflict-Free Calendars
              </h1>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl">
                Sub-millisecond temporal extraction with source-span traceability. Mathematically verifies half-open intervals <code className="font-mono text-zinc-800 dark:text-zinc-200">[start, end)</code> and auto-reschedules overlapping commitments.
              </p>
            </div>
            <button
              onClick={() => setIsIntroVisible(false)}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition cursor-pointer shrink-0"
              title="Dismiss banner"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <ErrorBoundary>
          {viewMode === "STUDENT" && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 gap-5">
                <FileDropzone />
                <NoticeInputStudio />
              </div>
              <EditableEventGrid />
              <VisualTimelineGantt />
              <ClashAuditPanel />
            </div>
          )}

          {viewMode === "B2B_ADMIN" && (
            <div className="flex flex-col gap-5 animate-in fade-in duration-150">
              <B2BAdminSandbox />
            </div>
          )}

          {viewMode === "RED_TEAM_LAB" && (
            <div className="flex flex-col gap-5 animate-in fade-in duration-150">
              <RedTeamLab />
            </div>
          )}
        </ErrorBoundary>
      </main>

      <LiveSyncToastBanner />

      <footer className="mt-auto border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090B] py-4 text-xs text-zinc-500 dark:text-zinc-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Logo variant="full" size="sm" showBadge={false} />
            <button
              id="footer-presenter-hotkeys-pill"
              onClick={() => setIsCheatSheetOpen(true)}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono text-[10px] hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer border border-zinc-200/80 dark:border-zinc-700/80"
              title="Show Presenter Pitch Hotkeys (?)"
            >
              <kbd className="font-bold">?</kbd>
              <span>Hotkeys</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono tabular-nums">
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              100% OFFLINE READY
            </span>
            <span>·</span>
            <span>NEXT.JS 16 TURBOPACK</span>
            <span>·</span>
            <span>DETERMINISTIC REGEX AST</span>
          </div>
        </div>
      </footer>

      <JudgeQuickTour forceVisible={isJudgeModeOpen} />

      <PresenterCheatSheetModal
        isOpen={isCheatSheetOpen}
        onClose={() => setIsCheatSheetOpen(false)}
        onToggle={() => setIsCheatSheetOpen(!isCheatSheetOpen)}
        onTriggerAction={(key) => {
          setIsCheatSheetOpen(false);
          switch (key) {
            case "1": loadPs02Sample(); break;
            case "2": autoReschedule(); break;
            case "3": openEscalationDraft(); break;
            case "4": switchToB2B(); break;
            case "5": switchToRedTeam(); break;
            case "E": exportIcs(); break;
          }
        }}
      />
    </div>
  );
}
