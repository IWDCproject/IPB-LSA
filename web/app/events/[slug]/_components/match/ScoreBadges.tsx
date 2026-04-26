"use client";

import React from "react";
import { JK } from "../shared/tokens";
import { calcAvg, getEngine, resolveWinnerName } from "./scoreUtils";
import type { MappedMatch } from "../../_types";

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

  const NumPill = ({ n }: { n: number }) => (
    <div style={{
      ...JK, fontSize: compact ? 12 : 14, fontWeight: 900,
      color: "#111", background: "#FFC936", borderRadius: 6,
      minWidth: compact ? 26 : 32, height: compact ? 26 : 32,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "0 5px",
    }}>
      {String(n).padStart(2, "0")}
    </div>
  );

  const SetPill = ({ s, i }: { s: any; i: number }) => (
    <div style={{
      background: "#FFF8D6", border: "1px solid #FFC936",
      borderRadius: 6, padding: compact ? "3px 5px" : "4px 8px",
      textAlign: "center", minWidth: compact ? 38 : 50,
    }}>
      <div style={{ ...JK, fontSize: 9, fontWeight: 700, color: "#CA8A04", marginBottom: 2 }}>
        Set {i + 1}
      </div>
      <div style={{ ...JK, fontSize: compact ? 11 : 12, fontWeight: 800, color: "#111" }}>
        <span style={{ textDecoration: s.home > s.away ? "underline" : "none" }}>{s.home}</span>
        <span style={{ fontWeight: 800, color: "#676767" }}>{" : "}</span>
        <span style={{ textDecoration: s.away > s.home ? "underline" : "none" }}>{s.away}</span>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", alignItems: "center", gap: compact ? 4 : 6 }}>
      <NumPill n={setScore[0]} />
      {setLog.length === 0
        ? <span style={{ ...JK, fontSize: compact ? 12 : 14, fontWeight: 800, color: "#CA8A04" }}>vs</span>
        : setLog.map((s: any, i: number) => <SetPill key={i} s={s} i={i} />)}
      <NumPill n={setScore[1]} />
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
          <div style={{ ...JK, fontSize: compact ? 11 : 12, fontWeight: 800, color: "#111" }}>
            <span style={{ textDecoration: s.home > s.away ? "underline" : "none" }}>{s.home}</span>
            <span style={{ fontWeight: 800, color: "#676767" }}>{" : "}</span>
            <span style={{ textDecoration: s.away > s.home ? "underline" : "none" }}>{s.away}</span>
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
      <span style={{ ...JK, fontSize: 14, fontWeight: 800, color: "#111", background: "#f3f4f6", borderRadius: 6, padding: "4px 10px" }}>
        {result}
      </span>
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

  switch (engine?.type) {
    case "score_timed": {
      const h = live.homeScore ?? 0;
      const a = live.awayScore ?? 0;
      return (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: isLive ? "#FFF8D6" : "#f3f4f6",
          border: isLive ? "1px solid #FFC936" : "1px solid transparent",
          borderRadius: 6, padding: "4px 16px",
        }}>
          <span style={{ ...JK, fontSize: 14, fontWeight: 800, color: "#111" }}>{String(h).padStart(2, "0")}</span>
          <span style={{ ...JK, fontSize: 14, fontWeight: 800, color: isLive ? "#CA8A04" : "#aaa" }}>-</span>
          <span style={{ ...JK, fontSize: 14, fontWeight: 800, color: "#111" }}>{String(a).padStart(2, "0")}</span>
        </div>
      );
    }
    case "score_sets":
      return isLive
        ? <ScoreSetsLive live={live} compact={compact} />
        : <ScoreSetsFinished live={live} compact={compact} />;
    case "judge_scores":
      if (isLive) return <SolidLiveBadge />;
      return <JudgeScoreBadge live={live} engine={engine} />;
    case "finish_time":
      if (isLive) return <SolidLiveBadge />;
      return null;
    case "manual_pick":
      if (isLive) return <SolidLiveBadge />;
      return <ManualPickBadge match={match} />;
    default:
      return null;
  }
}