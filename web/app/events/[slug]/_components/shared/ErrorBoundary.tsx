"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
  /** Optional label shown in the error UI, e.g. "Matches" */
  label?: string;
}

interface State {
  hasError: boolean;
  message:  string | null;
}

/**
 * Per-tab error boundary.
 * Catches render errors and shows a friendly retry card instead of a
 * white screen. The "Try again" button resets the error state, which
 * causes React to re-mount the child tree.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: null };

  static getDerivedStateFromError(err: unknown): State {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    return { hasError: true, message };
  }

  componentDidCatch(err: unknown, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", err, info.componentStack);
  }

  reset = () => this.setState({ hasError: false, message: null });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 gap-4 text-center">
        <div className="text-4xl">⚠️</div>

        <div className="font-jakarta text-base font-bold text-white">
          {this.props.label
            ? `The ${this.props.label} tab ran into a problem.`
            : "Something went wrong."}
        </div>

        {this.state.message && (
          <div className="font-jakarta text-xs text-white/50 max-w-[400px]">
            {this.state.message}
          </div>
        )}

        <button
          onClick={this.reset}
          className="font-jakarta mt-2 px-5 py-2 rounded-lg border border-white/30 bg-white/[0.08] text-white text-[13px] font-bold cursor-pointer hover:bg-white/[0.14] transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }
}