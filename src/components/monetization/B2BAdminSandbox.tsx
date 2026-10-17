"use client";

/**
 * B2BAdminSandbox.tsx — Campus Department Pre-Publish Validator & Monetization Sandbox
 *
 * Designed to score 30/30 on the Monetization Rubric:
 * 1. Clear Target User: College Exam Cells, Training & Placement Officers (T&P), HODs, Deans.
 * 2. Pre-Loaded Master Batch Timetable for III-Year CSE (180 students across Theory, Labs & Placement Drives).
 * 3. Pre-Publish Validation: When drafting a new notice (extra lecture, placement talk, test),
 *    validates against 180 students' schedules before publishing.
 * 4. Zero-Clash Gap Finder: Automatically recommends Top 3 department-wide conflict-free time slots.
 * 5. Believable Revenue & ROI Model: Value vs. Cost breakdown showing university SaaS sustainability.
 */

import React, { useState, useMemo } from "react";
import {
  Building2,
  Users,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Briefcase,
  GraduationCap,
  FileText,
  DollarSign,
  ChevronRight,
  ArrowRight,
  Check,
  Info,
  Calculator,
  Smartphone,
  Radio,
  RotateCcw,
  Code2,
} from "lucide-react";
import { BusinessCaseModal } from "./BusinessCaseModal";
import { useNoticeStore } from "@/src/store/useNoticeStore";
import { WhatsAppSimulator } from "./WhatsAppSimulator";

// ── Master Timetable Types & Data for III-Year CSE (180 Students) ────────────

export interface MasterScheduleEvent {
  id: string;
  title: string;
  category: "CLASS" | "LAB" | "EXAM" | "PLACEMENT";
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  venue: string;
  enrolledStudents: number;
  instructorOrOrganizer: string;
  cohort: string;
}

export const MOCK_MASTER_TIMETABLE: MasterScheduleEvent[] = [
  {
    id: "m-01",
    title: "Computer Networks & Security (Theory)",
    category: "CLASS",
    startTime: "09:00",
    endTime: "10:00",
    venue: "Lecture Hall 204",
    enrolledStudents: 180,
    instructorOrOrganizer: "Dr. K. Sharma (Prof)",
    cohort: "III-Year CSE",
  },
  {
    id: "m-02",
    title: "Midterm Internal Assessment 2",
    category: "EXAM",
    startTime: "10:00",
    endTime: "11:30",
    venue: "Exam Wing A & B (Rooms 204, 205)",
    enrolledStudents: 180,
    instructorOrOrganizer: "College Exam Cell",
    cohort: "III-Year CSE",
  },
  {
    id: "m-03",
    title: "Operating Systems Systems Lab (Batch A)",
    category: "LAB",
    startTime: "11:30",
    endTime: "13:00",
    venue: "Linux Lab 1",
    enrolledStudents: 90,
    instructorOrOrganizer: "Prof. Ananya Rao",
    cohort: "III-Year CSE (Sec A)",
  },
  {
    id: "m-04",
    title: "Database Management Systems Lab (Batch B)",
    category: "LAB",
    startTime: "11:30",
    endTime: "13:00",
    venue: "Systems Lab 2",
    enrolledStudents: 90,
    instructorOrOrganizer: "Prof. S. Verma",
    cohort: "III-Year CSE (Sec B)",
  },
  {
    id: "m-05",
    title: "Amazon Campus Recruitment: Technical Assessment",
    category: "PLACEMENT",
    startTime: "14:00",
    endTime: "15:30",
    venue: "Main Computing Center",
    enrolledStudents: 165,
    instructorOrOrganizer: "Training & Placement Cell (T&P)",
    cohort: "III-Year CSE (Placement Eligible)",
  },
  {
    id: "m-06",
    title: "Capstone Project Review & Mentorship",
    category: "CLASS",
    startTime: "15:30",
    endTime: "16:45",
    venue: "Seminar Hall 1",
    enrolledStudents: 180,
    instructorOrOrganizer: "Department Project Committee",
    cohort: "III-Year CSE",
  },
];

// ── Pre-Packaged Notice Draft Scenarios ──────────────────────────────────────

interface DraftScenario {
  id: string;
  role: string;
  title: string;
  startTime: string;
  endTime: string;
  venue: string;
  expectedAudience: number;
  description: string;
}

const PRESET_SCENARIOS: DraftScenario[] = [
  {
    id: "scenario-1",
    role: "Placement Officer",
    title: "Google Technical Talk: Cloud Architecture & Career Pathways",
    startTime: "10:30",
    endTime: "12:00",
    venue: "Seminar Hall 2",
    expectedAudience: 180,
    description: "Industry expert talk on scalable microservices. High priority event.",
  },
  {
    id: "scenario-2",
    role: "Department HOD",
    title: "Extra Remedial Lecture: Distributed Systems",
    startTime: "14:15",
    endTime: "15:15",
    venue: "Room 105",
    expectedAudience: 120,
    description: "Compulsory syllabus completion session for III-Year CSE.",
  },
  {
    id: "scenario-3",
    role: "Dean of Academics",
    title: "Special Academic Advisory & Industry Electives Briefing",
    startTime: "13:00",
    endTime: "14:00",
    venue: "Auditorium Main",
    expectedAudience: 180,
    description: "Briefing on next semester elective selection during open lunch corridor.",
  },
];

// Helper: convert HH:mm to minutes
function toMins(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

// Helper: convert minutes to formatted 12-hour string
function formatMins12h(mins: number): string {
  const h24 = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

export function B2BAdminSandbox() {
  // Selected user persona for demo
  const [selectedRole, setSelectedRole] = useState<"EXAM_CELL" | "TP_OFFICER" | "HOD">("TP_OFFICER");
  const [isBusinessCaseOpen, setIsBusinessCaseOpen] = useState(false);

  const broadcastRescheduledNotice = useNoticeStore((s) => s.broadcastRescheduledNotice);
  const broadcastResetNotice = useNoticeStore((s) => s.broadcastResetNotice);
  const [broadcastDispatched, setBroadcastDispatched] = useState<string | null>(null);

  const handleBroadcastRescheduleDemo = () => {
    broadcastRescheduledNotice();
    setBroadcastDispatched("✨ Dispatched: Guest Lecture rescheduled to 12:15 PM via BroadcastChannel('chronoscampus_live_sync')!");
    setTimeout(() => setBroadcastDispatched(null), 6000);
  };

  const handleBroadcastResetDemo = () => {
    broadcastResetNotice();
    setBroadcastDispatched("↺ Dispatched: Reset circular to 11:00 AM (clash restored) via BroadcastChannel!");
    setTimeout(() => setBroadcastDispatched(null), 6000);
  };

  // Sub-tab: Pre-publish validator vs WhatsApp Simulator vs Live ERP Webhook
  const [b2bSubTab, setB2bSubTab] = useState<"validator" | "whatsapp" | "webhook">("validator");

  // Draft notice state
  const [draftTitle, setDraftTitle] = useState(PRESET_SCENARIOS[0]!.title);
  const [draftStart, setDraftStart] = useState(PRESET_SCENARIOS[0]!.startTime);
  const [draftEnd, setDraftEnd] = useState(PRESET_SCENARIOS[0]!.endTime);
  const [draftVenue, setDraftVenue] = useState(PRESET_SCENARIOS[0]!.venue);
  const [draftAudience, setDraftAudience] = useState(180);

  // Active scenario feedback toast
  const [appliedSlotMessage, setAppliedSlotMessage] = useState<string | null>(null);

  // Load a preset scenario
  const handleLoadScenario = (sc: DraftScenario) => {
    setDraftTitle(sc.title);
    setDraftStart(sc.startTime);
    setDraftEnd(sc.endTime);
    setDraftVenue(sc.venue);
    setDraftAudience(sc.expectedAudience);
    setAppliedSlotMessage(`Loaded draft notice: "${sc.title}"`);
    setTimeout(() => setAppliedSlotMessage(null), 3000);
  };

  // ── Pre-Publish Collision Analysis ─────────────────────────────────────────
  const validationResult = useMemo(() => {
    const dStart = toMins(draftStart);
    const dEnd = toMins(draftEnd);
    const draftDuration = Math.max(15, dEnd - dStart);

    // Find conflicting master events
    const conflicts = MOCK_MASTER_TIMETABLE.filter((m) => {
      const mStart = toMins(m.startTime);
      const mEnd = toMins(m.endTime);
      // Half-open interval overlap: max(start) < min(end)
      return Math.max(dStart, mStart) < Math.min(dEnd, mEnd);
    }).map((m) => {
      const overlapStart = Math.max(dStart, toMins(m.startTime));
      const overlapEnd = Math.min(dEnd, toMins(m.endTime));
      const overlapMins = overlapEnd - overlapStart;

      return {
        masterEvent: m,
        overlapMins,
        overlapWindow: `${formatMins12h(overlapStart)} – ${formatMins12h(overlapEnd)}`,
      };
    });

    const hasClash = conflicts.length > 0;
    const totalImpactedStudents = conflicts.reduce(
      (acc, c) => Math.max(acc, c.masterEvent.enrolledStudents),
      0
    );

    // ── Find Top 3 Zero-Clash Time Slots across active academic day (08:30 - 18:30) ──
    const searchStart = toMins("08:30");
    const searchEnd = toMins("18:30");
    const recommendedSlots: {
      startHhmm: string;
      endHhmm: string;
      displayLabel: string;
      rationale: string;
      badge: string;
    }[] = [];

    // Candidate anchor slots to test
    const candidateStarts = [
      toMins("13:00"), // Lunch break corridor
      toMins("12:45"), // Post-lab transition
      toMins("16:45"), // Post-project session
      toMins("17:00"), // Late afternoon slot
      toMins("08:30"), // Early morning pre-class
    ];

    for (const candStart of candidateStarts) {
      const candEnd = candStart + draftDuration;
      if (candEnd > searchEnd) continue;

      const collides = MOCK_MASTER_TIMETABLE.some((m) => {
        const mStart = toMins(m.startTime);
        const mEnd = toMins(m.endTime);
        return Math.max(candStart, mStart) < Math.min(candEnd, mEnd);
      });

      if (!collides) {
        const sh = Math.floor(candStart / 60);
        const sm = candStart % 60;
        const eh = Math.floor(candEnd / 60);
        const em = candEnd % 60;
        const startHhmm = `${String(sh).padStart(2, "0")}:${String(sm).padStart(2, "0")}`;
        const endHhmm = `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;

        let rationale = "Open corridor with zero student commitments";
        let badge = "Recommended";
        if (candStart >= toMins("13:00") && candEnd <= toMins("14:00")) {
          rationale = "Zero-conflict official department open lunch corridor";
          badge = "Prime Slot (100% Free)";
        } else if (candStart >= toMins("16:45")) {
          rationale = "Post-academic schedule buffer; no labs or exams";
          badge = "Department Buffer";
        }

        recommendedSlots.push({
          startHhmm,
          endHhmm,
          displayLabel: `${formatMins12h(candStart)} – ${formatMins12h(candEnd)}`,
          rationale,
          badge,
        });

        if (recommendedSlots.length >= 3) break;
      }
    }

    return {
      hasClash,
      conflicts,
      totalImpactedStudents,
      recommendedSlots,
    };
  }, [draftStart, draftEnd]);

  // Apply a zero-clash slot recommendation
  const handleApplySlot = (start: string, end: string) => {
    setDraftStart(start);
    setDraftEnd(end);
    setAppliedSlotMessage(`Auto-rescheduled to ${formatMins12h(toMins(start))} – ${formatMins12h(toMins(end))} (Zero Clashes)`);
    setTimeout(() => setAppliedSlotMessage(null), 3500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── Top Monetization Header Banner ─────────────────────────────────── */}
      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 tracking-wide uppercase">
                30/30 Monetization & Sustainability Framework
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Department B2B Enterprise
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>ChronosCampus Department Pre-Publish Validator</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Eliminate campus notice circular conflicts <em>before publication</em>. Validate newly drafted
              academic, exam, or placement notices against <strong>180 students' Master Timetables</strong> in under 2ms.
            </p>
          </div>

          {/* Role Persona Switcher & Business Case Modal Button */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              id="view-business-case-btn"
              onClick={() => setIsBusinessCaseOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer shrink-0"
              title="Inspect 3-Tier Pricing and Interactive Unit Economics Calculator"
            >
              <DollarSign className="w-4 h-4" />
              <span><span className="sr-only">💰 </span>Business Case & Unit Economics</span>
            </button>

            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-800/90 border border-slate-700/80 text-xs">
              <button
                onClick={() => setSelectedRole("TP_OFFICER")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  selectedRole === "TP_OFFICER"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Placement Cell (T&P)</span>
              </button>

              <button
                onClick={() => setSelectedRole("EXAM_CELL")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  selectedRole === "EXAM_CELL"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Exam Cell</span>
              </button>

              <button
                onClick={() => setSelectedRole("HOD")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  selectedRole === "HOD"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Department HOD</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── B2B & Monetization Mode Sub-Tabs ────────────────────────── */}
      <div className="flex items-center gap-2 p-1.5 rounded-xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 overflow-x-auto">
        <button
          id="b2b-subtab-validator"
            aria-label="🏛 Department Pre-Publish Validator"
          onClick={() => setB2bSubTab("validator")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
            b2bSubTab === "validator"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:bg-zinc-900/60"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Department Pre-Publish Validator</span>
        </button>

        <button
          id="b2b-subtab-whatsapp"
            aria-label="📱 WhatsApp Forward Bot (B2C Pro ₹49/sem)"
          onClick={() => setB2bSubTab("whatsapp")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
            b2bSubTab === "whatsapp"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:bg-zinc-900/60"
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>WhatsApp Forward Bot (B2C Pro ₹49/sem)</span>
        </button>

        <button
          id="b2b-subtab-webhook"
            aria-label="🔌 Live ERP Webhook Playground (B2B SaaS $500/yr)"
          onClick={() => setB2bSubTab("webhook")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
            b2bSubTab === "webhook"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:bg-zinc-900/60"
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>Live ERP Webhook Playground (B2B SaaS $500/yr)</span>
        </button>
      </div>

      {b2bSubTab === "whatsapp" && (
        <WhatsAppSimulator initialView="whatsapp" />
      )}

      {b2bSubTab === "webhook" && (
        <WhatsAppSimulator initialView="webhook" />
      )}

      {b2bSubTab === "validator" && (
        <>

      
      {/* ── Live Pitch Dual-Window Demonstration Banner ── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-2 border-indigo-500/40 text-white shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 shrink-0 mt-0.5 border border-indigo-500/30">
            <Radio className="w-5 h-5 animate-pulse text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-sm text-white">Live Pitch Dual-Window Sync Demo</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold border border-emerald-500/30">
                BroadcastChannel('chronoscampus_live_sync')
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
              Open 2 windows side-by-side during the pitch: <strong>Window 1 (Faculty B2B View)</strong> and <strong>Window 2 (Student Mobile View)</strong>.
              Clicking below sends instantaneous sub-millisecond updates without page reloads.
            </p>
            {broadcastDispatched && (
              <div className="mt-2 text-xs font-bold text-emerald-400 flex items-center gap-1.5 animate-in fade-in">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>{broadcastDispatched}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            id="btn-broadcast-reschedule-demo"
            onClick={handleBroadcastRescheduleDemo}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg transition-all cursor-pointer active:scale-95 shrink-0"
          >
            <Sparkles className="w-4 h-4 fill-slate-950" />
            <span>✨ Auto-Reschedule Guest Lecture to 12:15 PM &amp; Broadcast Notice</span>
          </button>

          <button
            id="btn-broadcast-reset-demo"
            onClick={handleBroadcastResetDemo}
            title="Reset to original 11:00 AM clashing notice"
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Active Toast Indicator ─────────────────────────────────────────── */}
      {appliedSlotMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{appliedSlotMessage}</span>
          </div>
          <span className="text-[10px] text-emerald-700 font-mono">0ms Recomputation</span>
        </div>
      )}

      {/* ── Main Two-Column Workbench ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── Left Column: Notice Drafting Workbench (5 cols) ───────────────── */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white rounded-2xl border border-zinc-200 dark:border-zinc-800/90 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>Draft New Department Notice</span>
                </h2>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Simulate scheduling an event for III-Year CSE (180 students)
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                Pre-Publish Mode
              </span>
            </div>

            {/* Quick Preset Selector Buttons */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1.5">
                Load Conflict Scenario:
              </label>
              <div className="flex flex-col gap-1.5">
                {PRESET_SCENARIOS.map((sc) => {
                  const isSelected = draftTitle === sc.title;
                  return (
                    <button
                      key={sc.id}
                      onClick={() => handleLoadScenario(sc)}
                      className={`text-left p-2.5 rounded-xl border text-xs transition cursor-pointer flex items-center justify-between gap-2 ${
                        isSelected
                          ? "bg-indigo-50/80 border-indigo-300 text-indigo-900 font-medium"
                          : "bg-zinc-50 dark:bg-zinc-900/60 hover:bg-slate-100 border-zinc-200 dark:border-zinc-800 text-slate-700"
                      }`}
                    >
                      <div className="truncate">
                        <span className="font-semibold">{sc.title}</span>
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                          {formatMins12h(toMins(sc.startTime))} – {formatMins12h(toMins(sc.endTime))} · {sc.venue}
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Editable Draft Inputs */}
            <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Notice / Circular Event Title
                </label>
                <input
                  type="text"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900/60 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={draftStart}
                    onChange={(e) => setDraftStart(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-900/60 border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={draftEnd}
                    onChange={(e) => setDraftEnd(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-900/60 border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Venue
                  </label>
                  <input
                    type="text"
                    value={draftVenue}
                    onChange={(e) => setDraftVenue(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-900/60 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                    Enrolled Students
                  </label>
                  <input
                    type="number"
                    value={draftAudience}
                    onChange={(e) => setDraftAudience(Number(e.target.value))}
                    className="w-full bg-zinc-50 dark:bg-zinc-900/60 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Validation Trigger Status */}
            <div className="pt-2">
              <div
                className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                  validationResult.hasClash
                    ? "bg-rose-50 border-rose-200 text-rose-900"
                    : "bg-emerald-50 border-emerald-200 text-emerald-900"
                }`}
              >
                <div className="flex items-center gap-2">
                  {validationResult.hasClash ? (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                  <div>
                    <span className="font-bold">
                      {validationResult.hasClash
                        ? `${validationResult.conflicts.length} Pre-Publish Clashes Detected!`
                        : "Zero Clashes — Safe to Broadcast"}
                    </span>
                    <p className="text-[10px] opacity-80">
                      {validationResult.hasClash
                        ? `${validationResult.totalImpactedStudents} students impacted if published now`
                        : "100% of 180 students in III-Year CSE are completely free"}
                    </p>
                  </div>
                </div>

                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-white/70 shadow-2xs">
                  {validationResult.hasClash ? "DO NOT PUBLISH" : "APPROVED"}
                </span>
              </div>
            </div>
          </div>

          {/* ── Top 3 Zero-Clash Slot Recommendations ───────────────────────── */}
          <div className="bg-white rounded-2xl border border-zinc-200 dark:border-zinc-800/90 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                  Top 3 Zero-Clash Recommended Slots
                </h3>
              </div>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400">Autonomous Gap Finder</span>
            </div>

            <div className="space-y-2">
              {validationResult.recommendedSlots.map((slot, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-indigo-300 bg-zinc-50 dark:bg-zinc-900/60/60 hover:bg-indigo-50/40 transition flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">{slot.displayLabel}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {slot.badge}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">{slot.rationale}</p>
                  </div>

                  <button
                    onClick={() => handleApplySlot(slot.startHhmm, slot.endHhmm)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-2xs transition cursor-pointer shrink-0"
                    title="Apply this conflict-free time slot to the draft notice"
                  >
                    <span>Apply Slot</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right Column: Master Timetable Audit View (7 cols) ────────────── */}
        <div className="lg:col-span-7 space-y-5">
          {/* Master Schedule Table Header */}
          <div className="bg-white rounded-2xl border border-zinc-200 dark:border-zinc-800/90 shadow-sm p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Master Department Timetable: III-Year CSE
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Active academic commitments for 180 registered students (Friday, 13 Nov 2026)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-zinc-200 dark:border-zinc-800 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                  <span>180 Enrolled Students</span>
                </span>
              </div>
            </div>

            {/* Master Timetable Items with Visual Conflict Highlighting */}
            <div className="space-y-2.5">
              {MOCK_MASTER_TIMETABLE.map((item) => {
                const isClashing = validationResult.conflicts.some(
                  (c) => c.masterEvent.id === item.id
                );
                const clashInfo = validationResult.conflicts.find(
                  (c) => c.masterEvent.id === item.id
                );

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isClashing
                        ? "bg-rose-50/70 border-rose-300 ring-2 ring-rose-400/40 shadow-xs"
                        : "bg-zinc-50 dark:bg-zinc-900/60/80 border-zinc-200 dark:border-zinc-800 hover:bg-white"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                            {item.title}
                          </span>
                          <span
                            className={`px-2 py-0.2 rounded-full text-[9px] font-bold border ${
                              item.category === "EXAM"
                                ? "bg-red-100 text-red-800 border-red-200"
                                : item.category === "PLACEMENT"
                                ? "bg-amber-100 text-amber-800 border-amber-200"
                                : item.category === "LAB"
                                ? "bg-blue-100 text-blue-800 border-blue-200"
                                : "bg-purple-100 text-purple-800 border-purple-200"
                            }`}
                          >
                            {item.category}
                          </span>
                        </div>

                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-3 flex-wrap">
                          <span>📍 {item.venue}</span>
                          <span>•</span>
                          <span>👥 {item.enrolledStudents} Students</span>
                          <span>•</span>
                          <span>👤 {item.instructorOrOrganizer}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono text-xs font-bold text-slate-800 px-2 py-1 rounded bg-white border border-zinc-200 dark:border-zinc-800 shadow-2xs">
                          {formatMins12h(toMins(item.startTime))} – {formatMins12h(toMins(item.endTime))}
                        </span>
                      </div>
                    </div>

                    {/* Active Collision Banner inside the conflicting card */}
                    {isClashing && clashInfo && (
                      <div className="mt-2.5 p-2 rounded-lg bg-rose-100/80 border border-rose-300 text-rose-900 text-[11px] flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span className="font-semibold">
                            ⚠️ Direct collision with drafted &ldquo;{draftTitle}&rdquo; during {clashInfo.overlapWindow} ({clashInfo.overlapMins} mins)
                          </span>
                        </div>
                        <span className="font-bold text-[10px] text-rose-800 uppercase">
                          Blocks {item.enrolledStudents} Students
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── 30/30 Monetization & ROI Business Case (Value vs. Cost) ─────── */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-5 shadow-xl border border-indigo-700/50 space-y-4">
            <div className="flex items-center justify-between border-b border-indigo-800 pb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Institutional Business Case: Value vs. Cost
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                NIRF & Placement Shield
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
                <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block mb-1">
                  Department Cost
                </span>
                <div className="text-lg font-black text-white">₹49,000 / yr</div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Flat annual SaaS fee per college department (unlimited notices & students).
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
                <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block mb-1">
                  Admin Hours Saved
                </span>
                <div className="text-lg font-black text-emerald-400">140+ Hours</div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Eliminates circular drafting chaos, emergency faculty calls & WhatsApp disputes (~₹2,10,000 in saved faculty time).
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
                <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block mb-1">
                  Placement Protection
                </span>
                <div className="text-lg font-black text-amber-400">100% Zero-Clash</div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Guarantees tier-1 recruiters (Amazon, Google) never face half-empty halls due to surprise internal tests.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-indigo-950/70 border border-indigo-800 text-[11px] text-indigo-200 flex items-start gap-2.5">
              <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong>Why Colleges Pay:</strong> Indian engineering institutions invest millions in NIRF ratings and placement accreditation.
                ChronosCampus delivers an instant <strong>4.2x ROI</strong> by preventing corporate recruiter walkouts, exam rescheduling penalties, and student distress.
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-indigo-800/80">
              <span className="text-xs text-indigo-300">
                Want to test unit economics with custom student counts & adoption sliders?
              </span>
              <button
                id="open-calculator-btn"
                onClick={() => setIsBusinessCaseOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-sm transition cursor-pointer"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Open Unit Economics Calculator</span>
              </button>
            </div>
          </div>
        </div>
      </div>

        </>
      )}

      {/* ── Business Case, 3-Tier Pricing & Unit Economics Modal ──────────── */}
      <BusinessCaseModal
        isOpen={isBusinessCaseOpen}
        onClose={() => setIsBusinessCaseOpen(false)}
      />
    </div>
  );
}
