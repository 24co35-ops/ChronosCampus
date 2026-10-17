"use client";
import React, { useState, useRef } from "react";
import { useStore } from "@/src/store";
import {
  ingestNoticeFile,
  simulateScannedNoticeDemo,
  type IngestionProgress,
  type IngestedFileResult,
} from "@/src/lib/parser/fileIngestor";
import { extractDraftEvents } from "@/src/lib/parser";
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  FileCheck,
  Camera,
  Sparkles,
  AlertCircle,
  Eye,
  X,
  CheckCircle2,
  Cpu,
  RefreshCw,
} from "lucide-react";

export function FileDropzone() {
  const { setNoticeText, setEvents, setIsParsing } = useStore();

  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<IngestionProgress | null>(null);
  const [ingestedResult, setIngestedResult] = useState<IngestedFileResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showFullPreview, setShowFullPreview] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processSelectedFile(files[0]!);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processSelectedFile(files[0]!);
    }
  };

  const processSelectedFile = async (file: File) => {
    setErrorMsg(null);
    setIsProcessing(true);
    setProgress({
      stage: "reading",
      percentage: 10,
      statusMessage: `Loading ${file.name}...`,
    });

    try {
      const result = await ingestNoticeFile(file, (p) => setProgress(p));
      setIngestedResult(result);

      // Populate text into store
      setNoticeText(result.cleanedText);

      // Auto-decode
      setIsParsing(true);
      const events = extractDraftEvents(result.cleanedText, {
        referenceYear: 2026,
        timeZone: "Asia/Kolkata",
        locale: "IN",
      });
      setEvents(events as any);
      setIsParsing(false);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to process uploaded file.");
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  const handleSimulateDemo = async () => {
    setErrorMsg(null);
    setIsProcessing(true);

    try {
      const result = await simulateScannedNoticeDemo((p) => setProgress(p));
      setIngestedResult(result);

      // Populate text into store
      setNoticeText(result.cleanedText);

      // Auto-decode
      setIsParsing(true);
      const events = extractDraftEvents(result.cleanedText, {
        referenceYear: 2026,
        timeZone: "Asia/Kolkata",
        locale: "IN",
      });
      setEvents(events as any);
      setIsParsing(false);
    } catch (err: any) {
      setErrorMsg(err?.message || "Demo simulation failed.");
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  const handleClear = () => {
    setIngestedResult(null);
    setErrorMsg(null);
    setProgress(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <section className="bg-white rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-violet-50 text-violet-600">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Multi-Modal Ingestion & Scanned Notice OCR
              </h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                Client-Side OCR
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Drag &amp; drop circular PDFs, notice board photos, WhatsApp screenshots, or plain text
            </p>
          </div>
        </div>

        {/* 1-Click Demo Simulation Button */}
        <button
          id="simulate-scan-btn"
          onClick={handleSimulateDemo}
          disabled={isProcessing}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 text-xs font-medium disabled:opacity-40 shadow-xs transition cursor-pointer"
        >
          <Camera className="w-3.5 h-3.5 text-violet-200" />
          <span>Simulate Scanned Notice Photo</span>
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
        </button>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.markdown,.pdf,.png,.jpg,.jpeg,.webp"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Dropzone Container */}
      {!ingestedResult ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-6 sm:p-8 bg-zinc-50/50 dark:bg-zinc-900/30 flex flex-col items-center justify-center gap-3 text-center transition cursor-pointer ${
            isDragging
              ? "border-violet-500 bg-violet-50/50 scale-[0.99]"
              : "border-zinc-200 dark:border-zinc-800 hover:border-violet-300 hover:bg-slate-50/50"
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center shadow-xs">
            {isProcessing ? (
              <RefreshCw className="w-6 h-6 animate-spin text-violet-600" />
            ) : (
              <UploadCloud className="w-6 h-6" />
            )}
          </div>

          <div className="flex flex-col gap-1 max-w-md">
            <p className="text-sm font-semibold text-slate-800">
              {isDragging ? "Drop your notice file here" : "Click to browse or drag and drop your notice"}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Supports university circulars, physical notice board photos, WhatsApp screenshots, or PDF files
            </p>
          </div>

          {/* Supported Format Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
              <FileText className="w-3 h-3 text-zinc-500 dark:text-zinc-400" />
              <span>.txt / .md</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
              <FileCheck className="w-3 h-3 text-rose-500" />
              <span>.pdf Circulars</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
              <ImageIcon className="w-3 h-3 text-emerald-500" />
              <span>.png / .jpg / .webp Photos</span>
            </span>
          </div>
        </div>
      ) : (
        /* Ingested File Card */
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-slate-50/70 p-4 flex flex-col sm:flex-row items-center gap-4">
          {/* Thumbnail preview */}
          {ingestedResult.previewUrl ? (
            <div
              onClick={() => setShowFullPreview(true)}
              className="relative w-28 h-20 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shrink-0 shadow-xs cursor-pointer group bg-amber-900/10"
            >
              <img
                src={ingestedResult.previewUrl}
                alt={ingestedResult.fileName}
                className="w-full h-full object-cover group-hover:scale-105 transition"
              />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition">
                <Eye className="w-4 h-4" />
              </div>
            </div>
          ) : (
            <div className="w-12 h-12 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
              {ingestedResult.fileType === "pdf" ? (
                <FileCheck className="w-6 h-6" />
              ) : (
                <FileText className="w-6 h-6" />
              )}
            </div>
          )}

          {/* Metadata */}
          <div className="flex-1 min-w-0 flex flex-col gap-1 w-full sm:w-auto">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                {ingestedResult.fileName}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 uppercase">
                {ingestedResult.fileType}
              </span>
              {ingestedResult.ocrConfidence && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {ingestedResult.ocrConfidence}% OCR Confidence
                </span>
              )}
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
              {(ingestedResult.fileSizeBytes / 1024).toFixed(1)} KB • {ingestedResult.cleanedText.length} characters extracted
            </p>

            {/* OCR Typo Fix Badge */}
            {ingestedResult.ocrFixesCount !== undefined && ingestedResult.ocrFixesCount > 0 && (
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium pt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Automated OCR Typo Repair Applied ({ingestedResult.ocrFixesCount} artifacts corrected)</span>
              </div>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {ingestedResult.previewUrl && (
              <button
                onClick={() => setShowFullPreview(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-slate-700 hover:bg-white transition cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                <span>View Photo</span>
              </button>
            )}

            <button
              onClick={handleClear}
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-slate-400 hover:text-zinc-600 dark:text-zinc-400 hover:bg-white transition cursor-pointer"
              title="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Live Animated Progress Bar */}
      {isProcessing && progress && (
        <div className="rounded-xl bg-violet-50/80 border border-violet-200 p-3.5 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-violet-900 font-medium">
              <Cpu className="w-4 h-4 text-violet-600 animate-pulse" />
              <span>{progress.statusMessage}</span>
            </div>
            <span className="font-mono font-semibold text-violet-700">{progress.percentage}%</span>
          </div>

          {/* Progress Bar track */}
          <div className="w-full h-2 rounded-full bg-violet-200/80 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Modal / Lightbox for Scanned Photo Preview */}
      {showFullPreview && ingestedResult?.previewUrl && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-4 shadow-2xl flex flex-col gap-3 relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-violet-600" />
                <span className="text-sm font-semibold text-slate-800">{ingestedResult.fileName}</span>
              </div>
              <button
                onClick={() => setShowFullPreview(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-zinc-500 dark:text-zinc-400 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-slate-900/5 max-h-[70vh] flex items-center justify-center">
              <img
                src={ingestedResult.previewUrl}
                alt="Scanned College Notice"
                className="w-full h-auto max-h-[70vh] object-contain"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 pt-1">
              <span>Simulated High-Resolution Physical Notice Board Scan</span>
              <button
                onClick={() => setShowFullPreview(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800 transition cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}