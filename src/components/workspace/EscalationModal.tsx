"use client";

/**
 * EscalationModal.tsx — PS-02 Coordinator Escalation & Conflict Notice Modal
 *
 * Provides a 1-click modal for students and Class Representatives (CR) to:
 * 1. Auto-generate a polite, structured coordinator escalation citing cohort,
 *    clashing events, exact venues, overlap duration, and the Gap Finder's proposed slot.
 * 2. Instant 1-click action buttons: "Copy to Clipboard", "Open in Email Client (mailto:)",
 *    and "Share via WhatsApp".
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Mail,
  Copy,
  Check,
  Share2,
  ExternalLink,
  Sparkles,
  Users,
  User,
  Clock,
  MapPin,
  AlertTriangle,
  Send,
  MessageSquare,
} from "lucide-react";
import { useNoticeStore } from "@/src/store/useNoticeStore";
import {
  generateEscalationDraft,
  type EscalationSenderRole,
  type EscalationDraftResult,
} from "@/src/lib/clash/escalationDrafter";

export interface EscalationModalProps {
  clashId?: string | null;
  onClose?: () => void;
}

export function EscalationModal({ clashId: propClashId, onClose: propOnClose }: EscalationModalProps) {
  const storeClashId = useNoticeStore((s) => s.activeEscalationClashId);
  const closeEscalation = useNoticeStore((s) => s.closeEscalation);
  const pairwiseClashes = useNoticeStore((s) => s.pairwiseClashes);
  const events = useNoticeStore((s) => s.events);
  const rescheduleMap = useNoticeStore((s) => s.rescheduleMap);

  const activeId = propClashId !== undefined ? propClashId : storeClashId;

  // Selected options
  const [role, setRole] = useState<EscalationSenderRole>("CLASS_REPRESENTATIVE");
  const [activeTab, setActiveTab] = useState<"email" | "whatsapp">("email");
  const [recipientEmail, setRecipientEmail] = useState("coordinator@university.edu");
  const [senderName, setSenderName] = useState("Ashwith (CR)");
  const [cohortOverride, setCohortOverride] = useState("III-year CSE");

  // Custom edited message buffers
  const [customEmailBody, setCustomEmailBody] = useState<string | null>(null);
  const [customWhatsAppText, setCustomWhatsAppText] = useState<string | null>(null);

  // Copy status
  const [copied, setCopied] = useState(false);

  const clash = useMemo(() => {
    if (!activeId) return null;
    return pairwiseClashes.find((c) => c.id === activeId) || null;
  }, [activeId, pairwiseClashes]);

  const eventA = useMemo(() => {
    if (!clash) return null;
    return events.find((e) => e.id === clash.eventA) || null;
  }, [clash, events]);

  const eventB = useMemo(() => {
    if (!clash) return null;
    return events.find((e) => e.id === clash.eventB) || null;
  }, [clash, events]);

  const rescheduleSuggestion = useMemo(() => {
    if (!clash) return null;
    return rescheduleMap.get(clash.eventA) || rescheduleMap.get(clash.eventB) || null;
  }, [clash, rescheduleMap]);

  // Generate fresh draft whenever base parameters change
  const draft: EscalationDraftResult | null = useMemo(() => {
    if (!clash || !eventA || !eventB) return null;
    return generateEscalationDraft({
      clash,
      eventA,
      eventB,
      rescheduleSuggestion,
      role,
      cohort: cohortOverride,
      senderName,
      recipientEmail,
    });
  }, [clash, eventA, eventB, rescheduleSuggestion, role, cohortOverride, senderName, recipientEmail]);

  // Reset custom overrides when draft changes
  useEffect(() => {
    if (draft) {
      setCustomEmailBody(draft.emailBody);
      setCustomWhatsAppText(draft.whatsAppText);
    }
  }, [draft?.emailBody, draft?.whatsAppText]);

  // Escape key handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleClose();
      }
    }
    if (activeId) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [activeId]);

  function handleClose() {
    if (propOnClose) {
      propOnClose();
    } else {
      closeEscalation();
    }
  }

  if (!activeId || !clash || !eventA || !eventB || !draft) {
    return null;
  }

  const currentTextToCopy = activeTab === "email" ? (customEmailBody ?? draft.emailBody) : (customWhatsAppText ?? draft.whatsAppText);

  const handleCopy = () => {
    const fullText =
      activeTab === "email"
        ? `To: ${recipientEmail}\nSubject: ${draft.subject}\n\n${customEmailBody ?? draft.emailBody}`
        : (customWhatsAppText ?? draft.whatsAppText);
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const currentMailtoUrl = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(customEmailBody ?? draft.emailBody)}`;
  const currentWhatsAppUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(customWhatsAppText ?? draft.whatsAppText)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-900/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight text-white">
                  Draft Coordinator Escalation Message
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  PS-02 Resolver
                </span>
              </div>
              <p className="text-xs text-indigo-200/80 font-medium">
                Auto-generated academic conflict notification citing exact timetable evidence
              </p>
            </div>
          </div>

          <button
            id="close-escalation-modal-btn"
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Evidence Banner */}
        <div className="px-6 py-3 bg-indigo-50/70 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-indigo-200 font-semibold text-indigo-900 shadow-2xs">
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              <span>{draft.cohort}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 border border-rose-200 font-semibold text-rose-800 shadow-2xs">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>{draft.summary.overlapFormatted}</span>
            </span>
            {draft.summary.proposedSlotFormatted && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 font-semibold text-emerald-800 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Proposed Slot: {draft.summary.proposedSlotFormatted}</span>
              </span>
            )}
          </div>
          <span className="text-slate-500 font-mono text-[11px]">{draft.dateStr}</span>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4 text-slate-800">
          {/* Controls: Persona Role & Format Tab */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            {/* Persona Switcher */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                <span>Sender Persona:</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-white border border-slate-200 text-xs font-medium">
                <button
                  id="role-cr-btn"
                  onClick={() => {
                    setRole("CLASS_REPRESENTATIVE");
                    setSenderName("Ashwith (Class Representative)");
                  }}
                  className={`py-1.5 px-2 rounded-md transition text-center font-semibold cursor-pointer ${
                    role === "CLASS_REPRESENTATIVE"
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Class Rep (CR)
                </button>
                <button
                  id="role-student-btn"
                  onClick={() => {
                    setRole("STUDENT");
                    setSenderName("Ashwith (Student)");
                  }}
                  className={`py-1.5 px-2 rounded-md transition text-center font-semibold cursor-pointer ${
                    role === "STUDENT"
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Individual Student
                </button>
              </div>
            </div>

            {/* Message Channel Switcher */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                <span>Format Channel:</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-white border border-slate-200 text-xs font-medium">
                <button
                  id="format-email-btn"
                  onClick={() => setActiveTab("email")}
                  className={`py-1.5 px-2 rounded-md transition text-center font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === "email"
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Formal Email</span>
                </button>
                <button
                  id="format-whatsapp-btn"
                  onClick={() => setActiveTab("whatsapp")}
                  className={`py-1.5 px-2 rounded-md transition text-center font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === "whatsapp"
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
              </div>
            </div>
          </div>

          {/* Email Specific Header Fields */}
          {activeTab === "email" && (
            <div className="flex flex-col gap-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-16 font-semibold text-slate-500">To:</span>
                <input
                  id="escalation-recipient-input"
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="coordinator@university.edu"
                  className="flex-1 px-2.5 py-1.5 rounded-md bg-white border border-slate-200 font-mono text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-16 font-semibold text-slate-500">Subject:</span>
                <span className="flex-1 font-semibold text-slate-900 truncate bg-white px-2.5 py-1.5 rounded-md border border-slate-200 font-mono text-xs">
                  {draft.subject}
                </span>
              </div>
            </div>
          )}

          {/* Editable Preview Box */}
          <div className="flex flex-col gap-1.5 flex-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-slate-700">
                {activeTab === "email" ? "Email Body (Editable):" : "WhatsApp Text (Editable):"}
              </span>
              <span className="text-[11px] text-slate-400">Feel free to personalize before sending</span>
            </div>

            <textarea
              id="escalation-message-textarea"
              rows={activeTab === "email" ? 11 : 10}
              value={activeTab === "email" ? (customEmailBody ?? draft.emailBody) : (customWhatsAppText ?? draft.whatsAppText)}
              onChange={(e) => {
                if (activeTab === "email") {
                  setCustomEmailBody(e.target.value);
                } else {
                  setCustomWhatsAppText(e.target.value);
                }
              }}
              className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50/50 font-mono text-xs text-slate-800 leading-relaxed focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition resize-y"
            />
          </div>
        </div>

        {/* Footer Actions: 3 Prominent 1-Click Action Buttons */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Powered by ChronosCampus Gap Finder</span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* 1. Copy to Clipboard Button */}
            <button
              id="escalation-copy-btn"
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition shadow-2xs cursor-pointer ${
                copied
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>✓ Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy to Clipboard</span>
                </>
              )}
            </button>

            {/* 2. Open in Email Client (mailto:) */}
            <a
              id="escalation-mailto-link"
              href={currentMailtoUrl}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-2xs transition cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5 text-indigo-200" />
              <span>Open in Email Client</span>
              <ExternalLink className="w-3 h-3 opacity-70 ml-0.5" />
            </a>

            {/* 3. Share via WhatsApp */}
            <a
              id="escalation-whatsapp-link"
              href={currentWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 shadow-2xs transition cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-200" />
              <span>Share via WhatsApp</span>
              <ExternalLink className="w-3 h-3 opacity-70 ml-0.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}