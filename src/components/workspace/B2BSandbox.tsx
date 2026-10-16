"use client";
import React, { useState } from "react";
import { useStore } from "@/src/store";
import type { ReviewedEvent } from "@/src/types";
import { toMins } from "@/src/lib/clash";
import { Building2, CheckCircle2, AlertTriangle, ShieldCheck, ArrowRight } from "lucide-react";

const DEMO_TIMETABLE: ReviewedEvent[] = [
  {
    id: "tt-1",
    title: "Engineering Mathematics III",
    type: "Lecture",
    dateISO: "2026-11-13",
    startTime: "09:00",
    endTime: "10:00",
    venue: "Room 101",
    audience: "III-year CSE",
    timeZone: "Asia/Kolkata",
    rawSource: "[Demo Departmental Timetable]",
    sourceSpans: [],
    fieldStatus: {
      title: "matched",
      type: "matched",
      date: "matched",
      startTime: "matched",
      endTime: "matched",
      venue: "matched",
      audience: "matched",
    },
    confirmed: true,
  },
  {
    id: "tt-2",
    title: "Operating Systems Lab (Batch B)",
    type: "Lecture",
    dateISO: "2026-11-13",
    startTime: "14:00",
    endTime: "16:00",
    venue: "Linux Lab 2",
    audience: "III-year CSE",
    timeZone: "Asia/Kolkata",
    rawSource: "[Demo Departmental Timetable]",
    sourceSpans: [],
    fieldStatus: {
      title: "matched",
      type: "matched",
      date: "matched",
      startTime: "matched",
      endTime: "matched",
      venue: "matched",
      audience: "matched",
    },
    confirmed: true,
  },
];

export function B2BSandbox() {
  const { events } = useStore();
  const [active, setActive] = useState(false);

  // Compute conflicts against demo timetable
  const departmentClashes = events.flatMap((userEv) => {
    if (!userEv.dateISO || !userEv.startTime) return [];
    const uStart = toMins(userEv.startTime);
    const uEnd = userEv.endTime ? toMins(userEv.endTime) : uStart;

    return DEMO_TIMETABLE.filter((deptEv) => {
      if (deptEv.dateISO !== userEv.dateISO) return false;
      const dStart = toMins(deptEv.startTime);
      const dEnd = toMins(deptEv.endTime);
      // Half-open overlap
      return Math.max(uStart, dStart) < Math.min(uEnd, dEnd);
    }).map((deptEv) => ({
      userEvent: userEv,
      deptEvent: deptEv,
    }));
  });

  return (
    <section className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900">Faculty Pre-Publish Verification</h2>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                Departmental Sandbox
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Audit drafted notices against master departmental timetables before official student circular release
            </p>
          </div>
        </div>

        <button
          id="b2b-toggle"
          onClick={() => setActive((v) => !v)}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition"
        >
          {active ? "Close Audit View" : "Run Pre-Publish Audit"}
        </button>
      </div>

      {active && (
        <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col gap-4">
          {/* Audit Result Status */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-200">
            <div className="flex items-center gap-2">
              {departmentClashes.length > 0 ? (
                <AlertTriangle className="w-4 h-4 text-rose-500" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              )}
              <span className="text-xs font-semibold text-slate-800">
                {departmentClashes.length > 0
                  ? `${departmentClashes.length} Department Timetable Conflict(s) Identified`
                  : "Zero Conflicts with Department Master Timetable"}
              </span>
            </div>
            <span className="text-[11px] text-slate-400">Sample Academic Year 2026</span>
          </div>

          {/* Department clash list */}
          {departmentClashes.length > 0 && (
            <div className="flex flex-col gap-2">
              {departmentClashes.map((c, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900 flex flex-col gap-1">
                  <span className="font-semibold">
                    Conflict: Notice event &ldquo;{c.userEvent.title}&rdquo; ({c.userEvent.startTime}–{c.userEvent.endTime})
                  </span>
                  <span className="text-rose-700">
                    Overlaps with master schedule: &ldquo;{c.deptEvent.title}&rdquo; ({c.deptEvent.startTime}–{c.deptEvent.endTime} in {c.deptEvent.venue})
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Comparison grids */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-purple-500" />
                Master Department Schedule (Demo)
              </h3>
              <div className="flex flex-col gap-2">
                {DEMO_TIMETABLE.map((e) => (
                  <div key={e.id} className="text-xs p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-800">{e.title}</span>
                      <p className="text-[11px] text-slate-500">{e.venue} · {e.audience}</p>
                    </div>
                    <span className="font-mono text-[11px] font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                      {e.startTime}–{e.endTime}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                Decoded Notice Events
              </h3>
              <div className="flex flex-col gap-2">
                {events.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">No events decoded yet.</p>
                ) : (
                  events.map((e) => (
                    <div key={e.id} className="text-xs p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-800">{e.title}</span>
                        <p className="text-[11px] text-slate-500">{e.type} · {e.venue || "No venue"}</p>
                      </div>
                      <span className="font-mono text-[11px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                        {e.startTime}{e.endTime && e.endTime !== e.startTime ? `–${e.endTime}` : ""}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
