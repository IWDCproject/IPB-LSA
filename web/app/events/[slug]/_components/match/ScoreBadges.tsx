"use client";

import React, { useState, useRef, useEffect } from "react";
import { calcAvg, getEngine, resolveWinnerName } from "./scoreUtils";
import type { MappedMatch } from "../../_types";

// --- Badge Color Config -------------------------------------------------------

export type BadgeColors = {
  badgeBg:   string   // inactive pill background
  labelText: string   // "Set 1", "Jud. 1", "Avg" labels
  valueText: string   // score numbers
  mutedText: string   // separators, "--" placeholder
}

export const LIGHT_BADGE_COLORS: BadgeColors = {
  badgeBg:   "rgba(0,0,0,0.06)",
  labelText: "#676767",
  valueText: "#111111",
  mutedText: "#aaaaaa",
}

export const DARK_BADGE_COLORS: BadgeColors = {
  badgeBg:   "rgba(255,255,255,0.1)",
  labelText: "rgba(255,255,255,0.55)",
  valueText: "#ffffff",
  mutedText: "rgba(255,255,255,0.35)",
}

// --- Slot Animation System ---------------------------------------------------

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

// --- AnimatedScore -----------------------------------------------------------

export function AnimatedScore({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center">
      {value.split("").map((char, i) => (
        <AnimatedDigit key={i} char={char} delay={i * 50} />
      ))}
    </span>
  );
}

// --- ScoreCellWrapper --------------------------------------------------------
// key={id} causes React to remount, restarting the CSS animation automatically.

function ScoreCellWrapper({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <span key={id} className="inline-flex animate-score-cell-swap">
      {children}
    </span>
  );
}

// --- Live badge --------------------------------------------------------------

export function SolidLiveBadge() {
  return (
    <div className="font-jakarta text-[13px] font-extrabold text-[#111] bg-[#FFC936] rounded-[6px] px-4 py-1 shrink-0">
      Live
    </div>
  );
}

// --- Set-based score display -------------------------------------------------

interface SetScoreProps {
  live:     any;
  compact?: boolean;
  colors?:  BadgeColors;
}

export function ScoreSetsLive({ live, compact = false, colors = LIGHT_BADGE_COLORS }: SetScoreProps) {
  const setScore = live?.setScore ?? [0, 0];
  const setLog   = live?.setLog   ?? [];

  const SetPill = ({ s, i }: { s: any; i: number }) => (
    <div
      className={`border border-[#FFC936] rounded-[6px] text-center ${compact ? "p-[3px_5px] min-w-[38px]" : "p-[4px_8px] min-w-[50px]"}`}
      style={{ background: "rgba(255,201,54,0.15)" }}
    >
      <div className="font-jakarta text-[9px] font-bold mb-0.5" style={{ color: "#CA8A04" }}>Set {i + 1}</div>
      <div
        className={`font-jakarta font-extrabold flex items-center justify-center ${compact ? "text-[11px]" : "text-xs"}`}
        style={{ color: colors.valueText }}
      >
        <span className={s.home > s.away ? "border-b pb-[1px]" : ""} style={{ borderColor: colors.valueText }}>
          <AnimatedScore value={String(s.home)} />
        </span>
        <span className="font-extrabold px-0.5" style={{ color: colors.mutedText }}> : </span>
        <span className={s.away > s.home ? "border-b pb-[1px]" : ""} style={{ borderColor: colors.valueText }}>
          <AnimatedScore value={String(s.away)} />
        </span>
      </div>
    </div>
  );

  const pillClass = `font-jakarta font-black text-[#111] bg-[#FFC936] rounded-[6px] flex items-center justify-center px-[5px] ${compact ? "text-xs min-w-[26px] h-[26px]" : "text-sm min-w-8 h-8"}`;

  return (
    <div className={`flex items-center ${compact ? "gap-1" : "gap-1.5"}`}>
      <div className={pillClass}>
        <span className={setScore[0] > setScore[1] ? "border-b border-[#111] pb-0.5" : ""}>
          <AnimatedScore value={String(setScore[0]).padStart(2, "0")} />
        </span>
      </div>

      {setLog.length === 0
        ? <span className={`font-jakarta font-extrabold text-[#CA8A04] ${compact ? "text-xs" : "text-sm"}`}>vs</span>
        : setLog.map((s: any, i: number) => <SetPill key={i} s={s} i={i} />)
      }

      <div className={pillClass}>
        <span className={setScore[1] > setScore[0] ? "border-b border-[#111] pb-0.5" : ""}>
          <AnimatedScore value={String(setScore[1]).padStart(2, "0")} />
        </span>
      </div>
    </div>
  );
}

export function ScoreSetsFinished({ live, compact = false, colors = LIGHT_BADGE_COLORS }: SetScoreProps) {
  const setLog = live?.setLog ?? [];
  return (
    <div className={`flex items-center flex-wrap ${compact ? "gap-1" : "gap-1.5"}`}>
      {setLog.map((s: any, i: number) => (
        <div
          key={i}
          className={`rounded-[6px] text-center ${compact ? "p-[3px_5px] min-w-[38px]" : "p-[4px_8px] min-w-[50px]"}`}
          style={{ background: colors.badgeBg }}
        >
          <div className="font-jakarta text-[9px] font-semibold mb-0.5" style={{ color: colors.labelText }}>Set {i + 1}</div>
          <div
            className={`font-jakarta font-extrabold flex items-center justify-center ${compact ? "text-[11px]" : "text-xs"}`}
            style={{ color: colors.valueText }}
          >
            <span className={s.home > s.away ? "border-b pb-[1px]" : ""} style={{ borderColor: colors.valueText }}>
              <AnimatedScore value={String(s.home)} />
            </span>
            <span className="font-extrabold px-0.5" style={{ color: colors.mutedText }}> : </span>
            <span className={s.away > s.home ? "border-b pb-[1px]" : ""} style={{ borderColor: colors.valueText }}>
              <AnimatedScore value={String(s.away)} />
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Judge score cells -------------------------------------------------------

interface JudgeCellsProps {
  live:     any;
  engine:   any;
  isLive:   boolean;
  compact?: boolean;
  colors?:  BadgeColors;
}

function JudgeCells({ live, engine, isLive, compact = false, colors = LIGHT_BADGE_COLORS }: JudgeCellsProps) {
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
              className={`border border-[#FFC936] rounded-[6px] text-center transition-[background] duration-300 ${compact ? "p-[3px_5px] min-w-[38px]" : "p-[4px_8px] min-w-[50px]"}`}
              style={{ background: hasScore ? "#FFC936" : "transparent" }}
            >
              <div
                className="font-jakarta text-[9px] font-bold mb-0.5 transition-[color] duration-300"
                style={{ color: hasScore ? "#92400E" : "#CA8A04" }}
              >
                Jud. {i + 1}
              </div>
              <div
                className={`font-jakarta font-extrabold flex items-center justify-center ${compact ? "text-[11px]" : "text-xs"}`}
                style={{ color: "#111" }}
              >
                <AnimatedScore value={label} />
              </div>
            </div>
          );
        }

        return (
          <div
            key={i}
            className={`rounded-[6px] text-center ${compact ? "p-[3px_5px] min-w-[38px]" : "p-[4px_8px] min-w-[50px]"}`}
            style={{ background: colors.badgeBg }}
          >
            <div className="font-jakarta text-[9px] font-semibold mb-0.5" style={{ color: colors.labelText }}>
              Jud. {i + 1}
            </div>
            <div
              className={`font-jakarta font-extrabold flex items-center justify-center ${compact ? "text-[11px]" : "text-xs"}`}
              style={{ color: colors.valueText }}
            >
              {hasScore
                ? <AnimatedScore value={label} />
                : <span style={{ color: colors.mutedText }}>--</span>
              }
            </div>
          </div>
        );
      })}
    </>
  );
}

// --- JudgeScoreBadge — finished state ----------------------------------------

export function JudgeScoreBadge({
  live, engine, compact = false, colors = LIGHT_BADGE_COLORS,
}: {
  live: any; engine: any; compact?: boolean; colors?: BadgeColors;
}) {
  const scores = live?.judgeScores ?? [];
  const method = engine?.config?.method ?? "avg";
  const result = calcAvg(scores, method).toFixed(1).replace(".", ",");

  return (
    <div className={`flex items-center flex-wrap ${compact ? "gap-1" : "gap-1.5"}`}>
      <div className={`flex items-center ${compact ? "gap-1" : "gap-1.5"}`}>
        <div
          className={`rounded-[6px] text-center ${compact ? "p-[3px_5px] min-w-[38px]" : "p-[4px_8px] min-w-[50px]"}`}
          style={{ background: colors.badgeBg }}
        >
          <div className="font-jakarta text-[9px] font-semibold mb-0.5" style={{ color: colors.labelText }}>Avg</div>
          <div
            className={`font-jakarta font-extrabold flex items-center justify-center ${compact ? "text-[11px]" : "text-xs"}`}
            style={{ color: colors.valueText }}
          >
            <AnimatedScore value={result} />
          </div>
        </div>
        <span
          className={`font-jakarta font-extrabold shrink-0 ${compact ? "text-xs" : "text-sm"}`}
          style={{ color: colors.mutedText }}
        >:</span>
      </div>
      <JudgeCells live={live} engine={engine} isLive={false} compact={compact} colors={colors} />
    </div>
  );
}

// --- JudgeScoreLive ----------------------------------------------------------

export function JudgeScoreLive({
  live, engine, compact = false, colors = LIGHT_BADGE_COLORS,
}: {
  live: any; engine: any; compact?: boolean; colors?: BadgeColors;
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
        <div
          className={`border border-[#FFC936] rounded-[6px] text-center transition-[background] duration-300 ${compact ? "p-[3px_5px] min-w-[38px]" : "p-[4px_8px] min-w-[50px]"}`}
          style={{ background: "rgba(255,201,54,0.15)" }}
        >
          <div className="font-jakarta text-[9px] font-bold text-[#CA8A04] mb-0.5">Avg</div>
          <div
            className={`font-jakarta font-extrabold flex items-center justify-center ${compact ? "text-[11px]" : "text-xs"}`}
            style={{ color: "#111" }}
          >
            {hasAny
              ? <AnimatedScore value={result} />
              : <span className="text-[#CA8A04]">--</span>
            }
          </div>
        </div>
        <span
          className={`font-jakarta font-extrabold shrink-0 ${compact ? "text-xs" : "text-sm"}`}
          style={{ color: colors.mutedText }}
        >:</span>
      </div>
      <JudgeCells live={live} engine={engine} isLive={true} compact={compact} colors={colors} />
    </div>
  );
}

// --- ManualPickBadge ---------------------------------------------------------

export function ManualPickBadge({ match, colors = LIGHT_BADGE_COLORS }: { match: MappedMatch; colors?: BadgeColors }) {
  const winner = resolveWinnerName(match);
  if (!winner) return null;
  return (
    <div
      className="font-jakarta text-[13px] font-extrabold rounded-[6px] px-4 py-1"
      style={{ background: colors.badgeBg, color: colors.valueText }}
    >
      {winner} Wins
    </div>
  );
}

// --- MiddleBadge -------------------------------------------------------------

export function MiddleBadge({ match, colors = LIGHT_BADGE_COLORS }: { match: MappedMatch; colors?: BadgeColors }) {
  const isH2H = (match.competition_category?.format_id as any)?.match_type === "head_to_head";
  return (
    <div
      className="font-jakarta text-[13px] font-extrabold rounded-[6px] px-4 py-1 whitespace-nowrap min-w-[50px] text-center"
      style={{ background: colors.badgeBg, color: colors.mutedText }}
    >
      {isH2H ? "vs" : "--"}
    </div>
  );
}

// --- ScoreCell ---------------------------------------------------------------

export function ScoreCell({ match, compact = false, colors = LIGHT_BADGE_COLORS }: { match: MappedMatch; compact?: boolean; colors?: BadgeColors }) {
  const engine     = getEngine(match.competition_category?.format_id);
  const live       = match.live_state ?? {};
  const isLive     = match.status === "live";
  const isUpcoming = match.status === "upcoming";

  if (isUpcoming) return <MiddleBadge match={match} colors={colors} />;

  const swapKey = `${match.status}-${engine?.type ?? "none"}`;

  switch (engine?.type) {
    case "score_timed": {
      const h = live.homeScore ?? 0;
      const a = live.awayScore ?? 0;
      return (
        <ScoreCellWrapper id={swapKey}>
          <div
            className={`flex items-center gap-2 rounded-[6px] px-4 py-1 font-jakarta text-sm font-extrabold border ${isLive ? "border-[#FFC936]" : "border-transparent"}`}
            style={{
              background: isLive ? "rgba(255,201,54,0.15)" : colors.badgeBg,
              color:      colors.valueText,
            }}
          >
            <AnimatedScore value={String(h).padStart(2, "0")} />
            <span className={`text-sm font-extrabold`} style={{ color: isLive ? "#CA8A04" : colors.mutedText }}>-</span>
            <AnimatedScore value={String(a).padStart(2, "0")} />
          </div>
        </ScoreCellWrapper>
      );
    }

    case "score_sets":
      return (
        <ScoreCellWrapper id={swapKey}>
          {isLive
            ? <ScoreSetsLive    live={live} compact={compact} colors={colors} />
            : <ScoreSetsFinished live={live} compact={compact} colors={colors} />}
        </ScoreCellWrapper>
      );

    case "judge_scores":
      return (
        <ScoreCellWrapper id={swapKey}>
          {isLive
            ? <JudgeScoreLive  live={live} engine={engine} compact={compact} colors={colors} />
            : <JudgeScoreBadge live={live} engine={engine} compact={compact} colors={colors} />}
        </ScoreCellWrapper>
      );

    case "finish_time":
      if (isLive) return <ScoreCellWrapper id={swapKey}><SolidLiveBadge /></ScoreCellWrapper>;
      return null;

    case "manual_pick":
      if (isLive) return <ScoreCellWrapper id={swapKey}><SolidLiveBadge /></ScoreCellWrapper>;
      return <ScoreCellWrapper id={swapKey}><ManualPickBadge match={match} colors={colors} /></ScoreCellWrapper>;

    default:
      return null;
  }
}