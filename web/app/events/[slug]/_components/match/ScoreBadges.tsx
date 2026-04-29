"use client";

// Keyframes (digit-slot-in, digit-slot-out, score-cell-swap) are defined in
// tailwind.config.js — the old runtime useDigitStyles() injection is gone.

import React, { useState, useRef, useEffect } from "react";
import { calcAvg, getEngine, resolveWinnerName } from "./scoreUtils";
import type { MappedMatch } from "../../_types";

// --- AnimatedDigit -------------------------------------------------------------

export function AnimatedDigit({ char, delay = 0 }: { char: string; delay?: number }) {
  const [state, setState] = useState<{ cur: string; prev: string | null; gen: number }>({
    cur: char, prev: null, gen: 0,
  });

  const prevRef         = useRef(char);
  const staggerTimerRef = useRef<any>(null);
  const animTimerRef    = useRef<any>(null);

  useEffect(() => {
    if (char === prevRef.current) return;

    if (staggerTimerRef.current) clearTimeout(staggerTimerRef.current);
    if (animTimerRef.current)    clearTimeout(animTimerRef.current);

    const from = prevRef.current;
    prevRef.current = char;

    staggerTimerRef.current = setTimeout(() => {
      setState(s => ({ cur: char, prev: from, gen: s.gen + 1 }));
      animTimerRef.current = setTimeout(() => {
        setState(s => ({ ...s, prev: null }));
      }, 360);
    }, delay);

    return () => {
      clearTimeout(staggerTimerRef.current);
      clearTimeout(animTimerRef.current);
    };
  }, [char, delay]);

  const { cur, prev, gen } = state;
  const isAnimating = prev !== null;
  const isDigit     = char >= "0" && char <= "9";

  return (
    <span
      className="relative overflow-hidden inline-flex items-center justify-center h-[1.15em] leading-none [font-variant-numeric:tabular-nums]"
      style={isDigit ? { width: "1ch" } : undefined}
    >
      {isAnimating && (
        <span
          key={`out-${gen}`}
          className="absolute inset-0 flex items-center justify-center animate-digit-slot-out pointer-events-none"
        >
          {prev}
        </span>
      )}

      <span
        key={`in-${gen}`}
        className={`flex items-center justify-center${isAnimating ? " animate-digit-slot-in" : ""}`}
      >
        {cur}
      </span>
    </span>
  );
}

// --- AnimatedScore -------------------------------------------------------------

export function AnimatedScore({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center">
      {value.split("").map((char, i) => (
        <AnimatedDigit key={i} char={char} delay={i * 50} />
      ))}
    </span>
  );
}

// --- ScoreCellWrapper ----------------------------------------------------------
// key={id} causes React to remount, restarting the CSS animation automatically.

function ScoreCellWrapper({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <span key={id} className="inline-flex animate-score-cell-swap">
      {children}
    </span>
  );
}

// --- Live badge ---------------------------------------------------------------

export function SolidLiveBadge() {
  return (
    <div className="font-jakarta text-[13px] font-extrabold text-[#111] bg-[#FFC936] rounded-[6px] px-4 py-1 shrink-0">
      Live
    </div>
  );
}

// --- Set-based score display --------------------------------------------------

interface SetScoreProps {
  live:     any;
  compact?: boolean;
}

export function ScoreSetsLive({ live, compact = false }: SetScoreProps) {
  const setScore = live?.setScore ?? [0, 0];
  const setLog   = live?.setLog   ?? [];

  const SetPill = ({ s, i }: { s: any; i: number }) => (
    <div className={`bg-[#FFF8D6] border border-[#FFC936] rounded-[6px] text-center ${compact ? "p-[3px_5px] min-w-[38px]" : "p-[4px_8px] min-w-[50px]"}`}>
      <div className="font-jakarta text-[9px] font-bold text-[#CA8A04] mb-0.5">Set {i + 1}</div>
      <div className={`font-jakarta font-extrabold text-[#111] flex items-center justify-center ${compact ? "text-[11px]" : "text-xs"}`}>
        <span style={{ textDecoration: s.home > s.away ? "underline" : "none" }}>
          <AnimatedScore value={String(s.home)} />
        </span>
        <span className="font-extrabold text-[#676767]">{" : "}</span>
        <span style={{ textDecoration: s.away > s.home ? "underline" : "none" }}>
          <AnimatedScore value={String(s.away)} />
        </span>
      </div>
    </div>
  );

  const pillClass = `font-jakarta font-black text-[#111] bg-[#FFC936] rounded-[6px] flex items-center justify-center px-[5px] ${compact ? "text-xs min-w-[26px] h-[26px]" : "text-sm min-w-8 h-8"}`;

  return (
    <div className={`flex items-center ${compact ? "gap-1" : "gap-1.5"}`}>
      <div className={pillClass}>
        <AnimatedScore value={String(setScore[0]).padStart(2, "0")} />
      </div>

      {setLog.length === 0
        ? <span className={`font-jakarta font-extrabold text-[#CA8A04] ${compact ? "text-xs" : "text-sm"}`}>vs</span>
        : setLog.map((s: any, i: number) => <SetPill key={i} s={s} i={i} />)
      }

      <div className={pillClass}>
        <AnimatedScore value={String(setScore[1]).padStart(2, "0")} />
      </div>
    </div>
  );
}

export function ScoreSetsFinished({ live, compact = false }: SetScoreProps) {
  const setLog = live?.setLog ?? [];
  return (
    <div className={`flex items-center flex-wrap ${compact ? "gap-1" : "gap-1.5"}`}>
      {setLog.map((s: any, i: number) => (
        <div key={i} className={`bg-[#f3f4f6] rounded-[6px] text-center ${compact ? "p-[3px_5px] min-w-[38px]" : "p-[4px_8px] min-w-[50px]"}`}>
          <div className="font-jakarta text-[9px] font-semibold text-[#676767] mb-0.5">Set {i + 1}</div>
          <div className={`font-jakarta font-extrabold text-[#111] flex items-center justify-center ${compact ? "text-[11px]" : "text-xs"}`}>
            <span style={{ textDecoration: s.home > s.away ? "underline" : "none" }}>
              <AnimatedScore value={String(s.home)} />
            </span>
            <span className="font-extrabold text-[#676767]">{" : "}</span>
            <span style={{ textDecoration: s.away > s.home ? "underline" : "none" }}>
              <AnimatedScore value={String(s.away)} />
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Judge score cells --------------------------------------------------------

interface JudgeCellsProps {
  live:     any;
  engine:   any;
  isLive:   boolean;
  compact?: boolean;
}

function JudgeCells({ live, engine, isLive, compact = false }: JudgeCellsProps) {
  const scores: number[]   = live?.judgeScores ?? [];
  const judgeCount: number = engine?.config?.num_judges ?? scores.length;

  if (judgeCount === 0) return null;

  return (
    <>
      {Array.from({ length: judgeCount }, (_, i) => {
        const raw      = scores[i];
        const hasScore = raw !== undefined && raw !== null;
        const label    = hasScore ? raw.toFixed(1).replace(".", ",") : "--,-";

        if (isLive) {
          return (
            <div
              key={i}
              className={`border border-[#FFC936] rounded-[6px] text-center transition-[background] duration-300
                ${compact ? "p-[3px_5px] min-w-[38px]" : "p-[4px_8px] min-w-[50px]"}
                ${hasScore ? "bg-[#FFC936]" : "bg-transparent"}`}
            >
              <div className={`font-jakarta text-[9px] font-bold mb-0.5 transition-[color] duration-300 ${hasScore ? "text-[#92400E]" : "text-[#CA8A04]"}`}>
                Jud. {i + 1}
              </div>
              <div className={`font-jakarta font-extrabold text-[#111] flex items-center justify-center ${compact ? "text-[11px]" : "text-xs"}`}>
                <AnimatedScore value={label} />
              </div>
            </div>
          );
        }

        return (
          <div key={i} className={`bg-[#f3f4f6] rounded-[6px] text-center ${compact ? "p-[3px_5px] min-w-[38px]" : "p-[4px_8px] min-w-[50px]"}`}>
            <div className="font-jakarta text-[9px] font-semibold text-[#676767] mb-0.5">Jud. {i + 1}</div>
            <div className={`font-jakarta font-extrabold text-[#111] flex items-center justify-center ${compact ? "text-[11px]" : "text-xs"}`}>
              {hasScore
                ? <AnimatedScore value={label} />
                : <span className="text-[#aaa]">--</span>
              }
            </div>
          </div>
        );
      })}
    </>
  );
}

// --- JudgeScoreBadge — finished state -----------------------------------------

export function JudgeScoreBadge({
  live, engine, compact = false,
}: {
  live: any; engine: any; compact?: boolean;
}) {
  const scores = live?.judgeScores ?? [];
  const method = engine?.config?.method ?? "avg";
  const result = calcAvg(scores, method).toFixed(1).replace(".", ",");

  return (
    <div className={`flex items-center flex-wrap ${compact ? "gap-1" : "gap-1.5"}`}>
      <div className={`flex items-center ${compact ? "gap-1" : "gap-1.5"}`}>
        <div className={`bg-[#f3f4f6] rounded-[6px] text-center ${compact ? "p-[3px_5px] min-w-[38px]" : "p-[4px_8px] min-w-[50px]"}`}>
          <div className="font-jakarta text-[9px] font-semibold text-[#676767] mb-0.5">Avg</div>
          <div className={`font-jakarta font-extrabold text-[#111] flex items-center justify-center ${compact ? "text-[11px]" : "text-xs"}`}>
            <AnimatedScore value={result} />
          </div>
        </div>
        <span className={`font-jakarta font-extrabold text-[#aaa] shrink-0 ${compact ? "text-xs" : "text-sm"}`}>:</span>
      </div>
      <JudgeCells live={live} engine={engine} isLive={false} compact={compact} />
    </div>
  );
}

// --- JudgeScoreLive -----------------------------------------------------------

export function JudgeScoreLive({
  live, engine, compact = false,
}: {
  live: any; engine: any; compact?: boolean;
}) {
  const scores: number[] = live?.judgeScores ?? [];
  const method           = engine?.config?.method ?? "avg";
  const submitted        = scores.filter((s: any) => s !== undefined && s !== null);
  const hasAny           = submitted.length > 0;
  const result           = hasAny
    ? calcAvg(submitted, method).toFixed(1).replace(".", ",")
    : "--,-";

  return (
    <div className={`flex items-center flex-wrap ${compact ? "gap-1" : "gap-1.5"}`}>
      <div className={`flex items-center ${compact ? "gap-1" : "gap-1.5"}`}>
        <div className={`bg-[#FFF8D6] border border-[#FFC936] rounded-[6px] text-center transition-[background] duration-300 ${compact ? "p-[3px_5px] min-w-[38px]" : "p-[4px_8px] min-w-[50px]"}`}>
          <div className="font-jakarta text-[9px] font-bold text-[#CA8A04] mb-0.5">Avg</div>
          <div className={`font-jakarta font-extrabold text-[#111] flex items-center justify-center ${compact ? "text-[11px]" : "text-xs"}`}>
            {hasAny
              ? <AnimatedScore value={result} />
              : <span className="text-[#CA8A04]">--</span>
            }
          </div>
        </div>
        <span className={`font-jakarta font-extrabold text-[#aaa] shrink-0 ${compact ? "text-xs" : "text-sm"}`}>:</span>
      </div>
      <JudgeCells live={live} engine={engine} isLive={true} compact={compact} />
    </div>
  );
}

// --- ManualPickBadge ----------------------------------------------------------

export function ManualPickBadge({ match }: { match: MappedMatch }) {
  const winner = resolveWinnerName(match);
  if (!winner) return null;
  return (
    <div className="font-jakarta text-[13px] font-extrabold text-[#111] bg-[#f3f4f6] rounded-[6px] px-4 py-1">
      {winner} Wins
    </div>
  );
}

// --- MiddleBadge -------------------------------------------------------------

export function MiddleBadge({ match }: { match: MappedMatch }) {
  const isH2H = (match.competition_category?.format_id as any)?.match_type === "head_to_head";
  return (
    <div className="font-jakarta text-[13px] font-extrabold text-[#aaa] bg-[#f3f4f6] rounded-[6px] px-4 py-1 whitespace-nowrap min-w-[50px] text-center">
      {isH2H ? "vs" : "--"}
    </div>
  );
}

// --- ScoreCell ----------------------------------------------------------------

export function ScoreCell({ match, compact = false }: { match: MappedMatch; compact?: boolean }) {
  const engine     = getEngine(match.competition_category?.format_id);
  const live       = match.live_state ?? {};
  const isLive     = match.status === "live";
  const isUpcoming = match.status === "upcoming";

  if (isUpcoming) return <MiddleBadge match={match} />;

  const swapKey = `${match.status}-${engine?.type ?? "none"}`;

  switch (engine?.type) {
    case "score_timed": {
      const h = live.homeScore ?? 0;
      const a = live.awayScore ?? 0;
      return (
        <ScoreCellWrapper id={swapKey}>
          <div className={`flex items-center gap-2 rounded-[6px] px-4 py-1 font-jakarta text-sm font-extrabold text-[#111] ${isLive ? "bg-[#FFF8D6] border border-[#FFC936]" : "bg-[#f3f4f6] border border-transparent"}`}>
            <AnimatedScore value={String(h).padStart(2, "0")} />
            <span className={`text-sm font-extrabold ${isLive ? "text-[#CA8A04]" : "text-[#aaa]"}`}>-</span>
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
      return (
        <ScoreCellWrapper id={swapKey}>
          {isLive
            ? <JudgeScoreLive live={live} engine={engine} compact={compact} />
            : <JudgeScoreBadge live={live} engine={engine} compact={compact} />}
        </ScoreCellWrapper>
      );

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