"use client";

import React, { useState, useRef, useEffect } from "react";
import { JK } from "../shared/tokens";
import { calcAvg, getEngine, resolveWinnerName } from "./scoreUtils";
import type { MappedMatch } from "../../_types";

// ─── Keyframe injection ────────────────────────────────────────────────────────
// Injected once on first client mount. Module-level flag prevents duplicates
// across re-renders and HMR hot reloads.

let _digitsStyleInjected = false;

function useDigitStyles() {
  useEffect(() => {
    if (_digitsStyleInjected || typeof document === "undefined") return;
    _digitsStyleInjected = true;
    const el = document.createElement("style");
    el.dataset.id = "score-digit-anim";
    el.textContent = `
      @keyframes digit-slot-in {
        from { transform: translateY(-110%); opacity: 0; }
        to   { transform: translateY(0%);   opacity: 1; }
      }
      @keyframes digit-slot-out {
        from { transform: translateY(0%);    opacity: 1; }
        to   { transform: translateY(110%); opacity: 0; }
      }
      @keyframes score-cell-swap {
        from { opacity: 0; transform: scale(0.92); }
        to   { opacity: 1; transform: scale(1);    }
      }
    `;
    document.head.appendChild(el);
  }, []);
}

// ─── AnimatedDigit ─────────────────────────────────────────────────────────────
// Single-character slot machine animation.
// When `char` changes: the old char slides out downward, the new one enters from top.
// Uses a generation counter so React remounts the spans and CSS animations restart.

export function AnimatedDigit({ char }: { char: string }) {
  useDigitStyles();

  const [state, setState] = useState<{ cur: string; prev: string | null; gen: number }>({
    cur: char, prev: null, gen: 0,
  });

  const prevRef  = useRef(char);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (char === prevRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    const from = prevRef.current;
    prevRef.current = char;

    setState(s => ({ cur: char, prev: from, gen: s.gen + 1 }));

    // Clear the exiting ghost after animation finishes
    timerRef.current = setTimeout(
      () => setState(s => ({ ...s, prev: null })),
      360,
    );
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [char]);

  const { cur, prev, gen } = state;
  const isAnimating = prev !== null;

  // Digits get a fixed 1ch width so the cell never reflows when e.g. "1" ↔ "0".
  // tabular-nums tells the font to use equal advance widths for all digit glyphs.
  // Non-digit chars (comma, colon, dot) keep their natural width.
  const isDigit = char >= "0" && char <= "9";

  return (
    <span
      style={{
        position:          "relative",
        overflow:          "hidden",
        display:           "inline-flex",
        alignItems:        "center",
        justifyContent:    "center",
        height:            "1.15em",
        lineHeight:        1,
        fontVariantNumeric:"tabular-nums",
        ...(isDigit && { width: "1ch" }),
      }}
    >
      {/* Exiting character — slides downward and fades */}
      {isAnimating && (
        <span
          key={`out-${gen}`}
          style={{
            position:  "absolute",
            inset:     0,
            display:   "flex",
            alignItems:"center",
            justifyContent:"center",
            animation: "digit-slot-out 360ms cubic-bezier(0.4,0,0.2,1) forwards",
            pointerEvents: "none",
          }}
        >
          {prev}
        </span>
      )}

      {/* Entering character — slides in from top */}
      <span
        key={`in-${gen}`}
        style={{
          display:   "flex",
          alignItems:"center",
          justifyContent:"center",
          ...(isAnimating && {
            animation: "digit-slot-in 360ms cubic-bezier(0.4,0,0.2,1) forwards",
          }),
        }}
      >
        {cur}
      </span>
    </span>
  );
}

// ─── AnimatedScore ─────────────────────────────────────────────────────────────
// Splits a string into individual characters and animates each independently.
// Digits animate with the slot effect; non-digit chars (colon, comma, dot) are
// wrapped in AnimatedDigit too but won't animate since they rarely change.
//
// `key={i}` is intentional — stable keys let React preserve each digit's state
// across re-renders so digit[0] always maps to the tens place, etc.

export function AnimatedScore({ value }: { value: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center" }}>
      {value.split("").map((char, i) => (
        <AnimatedDigit key={i} char={char} />
      ))}
    </span>
  );
}

// ─── ScoreCellWrapper ──────────────────────────────────────────────────────────
// Fades + scales in whenever the score engine TYPE or match STATUS changes —
// i.e. when the whole displayed component switches, not just individual numbers.

function ScoreCellWrapper({
  id,
  children,
}: {
  id:       string;
  children: React.ReactNode;
}) {
  useDigitStyles();
  return (
    <span
      key={id}
      style={{
        display:   "inline-flex",
        animation: "score-cell-swap 260ms ease forwards",
      }}
    >
      {children}
    </span>
  );
}

// ─── Live badge ───────────────────────────────────────────────────────────────

export function SolidLiveBadge() {
  return (
    <div style={{
      ...JK, fontSize: 13, fontWeight: 800,
      color: "#111", background: "#FFC936",
      borderRadius: 6, padding: "4px 16px", flexShrink: 0,
    }}>
      Live
    </div>
  );
}

// ─── Set-based score display ──────────────────────────────────────────────────

interface SetScoreProps {
  live:     any;
  compact?: boolean;
}

export function ScoreSetsLive({ live, compact = false }: SetScoreProps) {
  const setScore = live?.setScore ?? [0, 0];
  const setLog   = live?.setLog   ?? [];

  // Individual set score pill: slot-animates both team scores inside a set
  const SetPill = ({ s, i }: { s: any; i: number }) => (
    <div style={{
      background: "#FFF8D6", border: "1px solid #FFC936",
      borderRadius: 6, padding: compact ? "3px 5px" : "4px 8px",
      textAlign: "center", minWidth: compact ? 38 : 50,
    }}>
      <div style={{ ...JK, fontSize: 9, fontWeight: 700, color: "#CA8A04", marginBottom: 2 }}>
        Set {i + 1}
      </div>
      <div style={{ ...JK, fontSize: compact ? 11 : 12, fontWeight: 800, color: "#111", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ textDecoration: s.home > s.away ? "underline" : "none" }}>
          <AnimatedScore value={String(s.home)} />
        </span>
        <span style={{ fontWeight: 800, color: "#676767" }}>{" : "}</span>
        <span style={{ textDecoration: s.away > s.home ? "underline" : "none" }}>
          <AnimatedScore value={String(s.away)} />
        </span>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", alignItems: "center", gap: compact ? 4 : 6 }}>
      {/* Home set count pill */}
      <div style={{
        ...JK, fontSize: compact ? 12 : 14, fontWeight: 900,
        color: "#111", background: "#FFC936", borderRadius: 6,
        minWidth: compact ? 26 : 32, height: compact ? 26 : 32,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "0 5px",
      }}>
        <AnimatedScore value={String(setScore[0]).padStart(2, "0")} />
      </div>

      {setLog.length === 0
        ? <span style={{ ...JK, fontSize: compact ? 12 : 14, fontWeight: 800, color: "#CA8A04" }}>vs</span>
        : setLog.map((s: any, i: number) => <SetPill key={i} s={s} i={i} />)}

      {/* Away set count pill */}
      <div style={{
        ...JK, fontSize: compact ? 12 : 14, fontWeight: 900,
        color: "#111", background: "#FFC936", borderRadius: 6,
        minWidth: compact ? 26 : 32, height: compact ? 26 : 32,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "0 5px",
      }}>
        <AnimatedScore value={String(setScore[1]).padStart(2, "0")} />
      </div>
    </div>
  );
}

export function ScoreSetsFinished({ live, compact = false }: SetScoreProps) {
  const setLog = live?.setLog ?? [];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: compact ? 4 : 6, flexWrap: "wrap" }}>
      {setLog.map((s: any, i: number) => (
        <div key={i} style={{
          background: "#f3f4f6", borderRadius: 6,
          padding: compact ? "3px 5px" : "4px 8px",
          textAlign: "center", minWidth: compact ? 38 : 50,
        }}>
          <div style={{ ...JK, fontSize: 9, fontWeight: 600, color: "#676767", marginBottom: 2 }}>
            Set {i + 1}
          </div>
          <div style={{ ...JK, fontSize: compact ? 11 : 12, fontWeight: 800, color: "#111", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ textDecoration: s.home > s.away ? "underline" : "none" }}>
              <AnimatedScore value={String(s.home)} />
            </span>
            <span style={{ fontWeight: 800, color: "#676767" }}>{" : "}</span>
            <span style={{ textDecoration: s.away > s.home ? "underline" : "none" }}>
              <AnimatedScore value={String(s.away)} />
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Judge / manual pick badges ───────────────────────────────────────────────

export function JudgeScoreBadge({ live, engine }: { live: any; engine: any }) {
  const scores = live?.judgeScores ?? [];
  const method = engine?.config?.method ?? "avg";
  const result = calcAvg(scores, method).toFixed(2).replace(".", ",");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ ...JK, fontSize: 13, fontWeight: 700, color: "#111" }}>Avg:</span>
      <div style={{
        ...JK, fontSize: 14, fontWeight: 800, color: "#111",
        background: "#f3f4f6", borderRadius: 6, padding: "4px 10px",
        display: "flex", alignItems: "center",
      }}>
        <AnimatedScore value={result} />
      </div>
    </div>
  );
}

export function ManualPickBadge({ match }: { match: MappedMatch }) {
  const winner = resolveWinnerName(match);
  if (!winner) return null;
  return (
    <div style={{ ...JK, fontSize: 13, fontWeight: 800, color: "#111", background: "#f3f4f6", borderRadius: 6, padding: "4px 16px" }}>
      {winner} Wins
    </div>
  );
}

// ─── Generic score cell ───────────────────────────────────────────────────────

export function MiddleBadge({ match }: { match: MappedMatch }) {
  const isH2H = (match.competition_category?.format_id as any)?.match_type === "head_to_head";
  return (
    <div style={{
      ...JK, fontSize: 13, fontWeight: 800, color: "#aaa",
      background: "#f3f4f6", borderRadius: 6, padding: "4px 16px",
      whiteSpace: "nowrap", minWidth: 50, textAlign: "center",
    }}>
      {isH2H ? "vs" : "--"}
    </div>
  );
}

export function ScoreCell({ match, compact = false }: { match: MappedMatch; compact?: boolean }) {
  const engine     = getEngine(match.competition_category?.format_id);
  const live       = match.live_state ?? {};
  const isLive     = match.status === "live";
  const isUpcoming = match.status === "upcoming";

  if (isUpcoming) return <MiddleBadge match={match} />;

  // Wrap key changes on status or engine type so the whole badge fades/scales
  // in when it switches between different component variants.
  const swapKey = `${match.status}-${engine?.type ?? "none"}`;

  switch (engine?.type) {
    case "score_timed": {
      const h = live.homeScore ?? 0;
      const a = live.awayScore ?? 0;
      return (
        <ScoreCellWrapper id={swapKey}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: isLive ? "#FFF8D6" : "#f3f4f6",
            border: isLive ? "1px solid #FFC936" : "1px solid transparent",
            borderRadius: 6, padding: "4px 16px",
            ...JK, fontSize: 14, fontWeight: 800, color: "#111",
          }}>
            <AnimatedScore value={String(h).padStart(2, "0")} />
            <span style={{ fontSize: 14, fontWeight: 800, color: isLive ? "#CA8A04" : "#aaa" }}>-</span>
            <AnimatedScore value={String(a).padStart(2, "0")} />
          </div>
        </ScoreCellWrapper>
      );
    }

    case "score_sets":
      return (
        <ScoreCellWrapper id={swapKey}>
          {isLive
            ? <ScoreSetsLive live={live} compact={compact} />
            : <ScoreSetsFinished live={live} compact={compact} />}
        </ScoreCellWrapper>
      );

    case "judge_scores":
      if (isLive) return <ScoreCellWrapper id={swapKey}><SolidLiveBadge /></ScoreCellWrapper>;
      return <ScoreCellWrapper id={swapKey}><JudgeScoreBadge live={live} engine={engine} /></ScoreCellWrapper>;

    case "finish_time":
      if (isLive) return <ScoreCellWrapper id={swapKey}><SolidLiveBadge /></ScoreCellWrapper>;
      return null;

    case "manual_pick":
      if (isLive) return <ScoreCellWrapper id={swapKey}><SolidLiveBadge /></ScoreCellWrapper>;
      return <ScoreCellWrapper id={swapKey}><ManualPickBadge match={match} /></ScoreCellWrapper>;

    default:
      return null;
  }
}