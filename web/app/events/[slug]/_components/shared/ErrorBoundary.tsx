"use client";

import React from "react";
import { JK } from "./tokens";

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
 *
 * Usage:
 *   <ErrorBoundary label="Matches">
 *     <MatchesTab ... />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: null };

  static getDerivedStateFromError(err: unknown): State {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    return { hasError: true, message };
  }

  componentDidCatch(err: unknown, info: React.ErrorInfo) {
    // Swap for your own error-reporting service (Sentry, etc.) when ready
    console.error("[ErrorBoundary]", err, info.componentStack);
  }

  reset = () => this.setState({ hasError: false, message: null });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        padding:        "64px 24px",
        gap:            16,
        textAlign:      "center",
      }}>
        <div style={{ fontSize: 36 }}>⚠️</div>
        <div style={{ ...JK, fontSize: 16, fontWeight: 700, color: "#fff" }}>
          {this.props.label
            ? `The ${this.props.label} tab ran into a problem.`
            : "Something went wrong."}
        </div>
        {this.state.message && (
          <div style={{ ...JK, fontSize: 12, color: "rgba(255,255,255,0.5)", maxWidth: 400 }}>
            {this.state.message}
          </div>
        )}
        <button
          onClick={this.reset}
          style={{
            ...JK,
            marginTop:    8,
            padding:      "8px 20px",
            borderRadius: 8,
            border:       "1.5px solid rgba(255,255,255,0.3)",
            background:   "rgba(255,255,255,0.08)",
            color:        "#fff",
            fontSize:     13,
            fontWeight:   700,
            cursor:       "pointer",
          }}
        >
          Try again
        </button>
      </div>
    );
  }
}