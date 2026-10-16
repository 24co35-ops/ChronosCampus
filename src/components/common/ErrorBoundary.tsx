"use client";
import React, { Component, type ReactNode } from "react";
import { logDiagnostic } from "@/src/lib/telemetry/diagnostics";
import { OFFICIAL_PS02_NOTICE } from "@/src/lib/fixtures/sampleNotices";
import { useStore } from "@/src/store";
import {
  ShieldAlert,
  RotateCcw,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo });
    logDiagnostic("error", "ErrorBoundary", error.message, {
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  handleResetWorkspace = (): void => {
    try {
      // 1. Reset state store
      const store = useStore.getState();
      store.reset();
      store.setNoticeText(OFFICIAL_PS02_NOTICE);

      // 2. Invoke optional external callback
      if (this.props.onReset) {
        this.props.onReset();
      }
    } catch (resetErr) {
      logDiagnostic("error", "ErrorBoundary:Reset", "Failed to reset store", resetErr);
    } finally {
      // 3. Clear error boundary state to remount children cleanly
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        showDetails: false,
      });
    }
  };

  handleTryAgain = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="w-full max-w-3xl mx-auto my-8 p-6 rounded-2xl bg-white border border-rose-200 shadow-lg flex flex-col gap-5">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  {this.props.fallbackTitle || "Crash Firewall Intercepted Render Error"}
                </h3>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                  Protected Mode
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                ChronosCampus graceful degradation activated · White-screen crash prevented
              </p>
            </div>
          </div>

          {/* Explanation Banner */}
          <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200 text-xs text-rose-950 flex flex-col gap-1.5 leading-relaxed">
            <div className="flex items-center gap-1.5 font-semibold text-rose-900">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>An unexpected exception occurred while evaluating notice data</span>
            </div>
            <p className="text-rose-800 pl-5">
              {this.state.error?.message || "An unhandled UI exception occurred."}
            </p>
          </div>

          {/* 1-Click Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              id="error-boundary-reset-btn"
              onClick={this.handleResetWorkspace}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Workspace & Load Safe Sample</span>
            </button>

            <button
              id="error-boundary-retry-btn"
              onClick={this.handleTryAgain}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              <span>Try Again</span>
            </button>

            <button
              id="error-boundary-toggle-details-btn"
              onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
              className="ml-auto flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition"
            >
              <span>{this.state.showDetails ? "Hide Technical Stack" : "View Technical Stack"}</span>
              {this.state.showDetails ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Collapsible diagnostic details */}
          {this.state.showDetails && (
            <div className="rounded-xl bg-slate-900 p-4 text-[11px] font-mono text-slate-300 flex flex-col gap-2 overflow-x-auto border border-slate-800">
              <span className="font-semibold text-rose-400">Error Stack Forensics:</span>
              <pre className="whitespace-pre-wrap leading-relaxed text-slate-400">
                {this.state.error?.stack || "No stack trace available"}
              </pre>
              {this.state.errorInfo?.componentStack && (
                <>
                  <span className="font-semibold text-amber-400 mt-2">Component Hierarchy:</span>
                  <pre className="whitespace-pre-wrap leading-relaxed text-slate-400">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </>
              )}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
