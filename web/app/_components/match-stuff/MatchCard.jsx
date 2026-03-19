"use client";
import { useState, useEffect } from "react";

// font shortcut, pakai di mana aja
export const BB = { fontFamily: "'Bebas Neue', 'Arial Narrow', sans-serif" };
export const JK = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

// format detik jadi MM:SS
export function fmtSecs(s) {
  const t = Math.max(0, Math.floor(s));
  return `${Math.floor(t / 60).toString().padStart(2, "0")}:${(t % 60).toString().padStart(2, "0")}`;
}

// ambil scoring engine (modules[0])
export function getEngine(fmt) {
  return fmt?.modules?.[0] ?? null;
}

// ambil add-on timer kalau ada
export function getTimerMod(fmt) {
  return fmt?.modules?.find((m) => m.type === "timer") ?? null;
}

// hitung nilai juri sesuai method
export function calcJudgeScore(scores = [], method = "avg") {
  if (!scores.length) return 0;
  if (method === "drop_extremes" && scores.length > 2) {
    const sorted = [...scores].sort((a, b) => a - b).slice(1, -1);
    return sorted.reduce((a, b) => a + b, 0) / sorted.length;
  }
  const sum = scores.reduce((a, b) => a + b, 0);
  return method === "sum" ? sum : sum / scores.length;
}

// hook timer, pakai snapshot + elapsed biar ga nulis ke DB tiap detik
export function useMatchTimer(live, timerMod) {
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    const isStopwatch = timerMod?.config?.mode === "stopwatch";

    const calc = () => {
      const snap = Math.max(0, live?.timerSecs ?? 0);
      if (!live?.timerRunning || !live?.timerLastStarted) return snap;
      const elapsed = Math.max(0, (Date.now() - new Date(live.timerLastStarted).getTime()) / 1000);
      return isStopwatch ? snap + elapsed : Math.max(0, snap - elapsed);
    };

    setSecs(calc());
    if (!live?.timerRunning) return;
    const id = setInterval(() => setSecs(calc()), 1000);
    return () => clearInterval(id);
  }, [live?.timerRunning, live?.timerLastStarted, live?.timerSecs, timerMod?.config?.mode]);

  return secs;
}

// komponen score pakai render prop, kamu yang tulis JSX-nya
export function ScoreTimedDisplay({ live, children }) {
  return children({
    home: live?.homeScore ?? 0,
    away: live?.awayScore ?? 0,
  });
}

export function ScoreSetsDisplay({ live, children }) {
  return children({
    setsWon: live?.setsWon ?? [0, 0],
    setScore: live?.setScore ?? [0, 0],
    setLog: live?.setLog ?? [],
  });
}

export function JudgeScoreDisplay({ live, config, children }) {
  const scores = live?.judgeScores ?? [];
  const method = config?.method ?? "avg";
  return children({
    scores,
    method,
    result: calcJudgeScore(scores, method),
  });
}

export function FinishTimeDisplay({ live, children }) {
  return children({
    timeLog: live?.timeLog ?? [],
  });
}

export function ManualPickDisplay({ live, match, children }) {
  return children({
    winner: live?.winner ?? null,
    count: match?.participant_ids?.length ?? null,
    rankings: live?.rankings ?? [],
  });
}

// komponen timer, pass children sebagai render prop
export function TimerDisplay({ fmt, live, children }) {
  const mod = getTimerMod(fmt);
  const secs = useMatchTimer(live, mod);
  if (!mod) return null;
  return children({
    secs,
    formatted: fmtSecs(secs),
    isRunning: live?.timerRunning ?? false,
    isStopwatch: mod.config?.mode === "stopwatch",
  });
}

// router score, pilih display yang bener berdasarkan engine type
// pass renderXxx props dengan JSX kamu sendiri
export function ScoreDisplay({ fmt, live, match, renderScoreTimed, renderScoreSets, renderJudgeScore, renderFinishTime, renderManualPick }) {
  const engine = getEngine(fmt);
  if (!engine) return null;

  switch (engine.type) {
    case "score_timed":
      return renderScoreTimed
        ? <ScoreTimedDisplay live={live}>{renderScoreTimed}</ScoreTimedDisplay>
        : null;
    case "score_sets":
      return renderScoreSets
        ? <ScoreSetsDisplay live={live}>{renderScoreSets}</ScoreSetsDisplay>
        : null;
    case "judge_scores":
      return renderJudgeScore
        ? <JudgeScoreDisplay live={live} config={engine.config}>{renderJudgeScore}</JudgeScoreDisplay>
        : null;
    case "finish_time":
      return renderFinishTime
        ? <FinishTimeDisplay live={live}>{renderFinishTime}</FinishTimeDisplay>
        : null;
    case "manual_pick":
      return renderManualPick
        ? <ManualPickDisplay live={live} match={match}>{renderManualPick}</ManualPickDisplay>
        : null;
    default:
      return null;
  }
}

// shell utama, ga render apa-apa sendiri
// children adalah render prop yang nerima semua data dan sub-komponen
export function MatchCard({ match, children }) {
  const { format: fmt, live_state: live, event, competition_category: cat } = match;

  const matchType  = fmt?.match_type;        // "head_to_head" | "solo" | "open"
  const engineType = getEngine(fmt)?.type;   // "score_timed" | "score_sets" | "judge_scores" | "finish_time" | "manual_pick"
  const isH2H  = matchType === "head_to_head";
  const isSolo = matchType === "solo";
  const isOpen = matchType === "open";

  // pakai match_name kalau ada, fallback ke "Kategori - Babak"
  const label = match.match_name || [cat?.name, match.round].filter(Boolean).join(" - ");

  return children({
    // data mentah
    match, fmt, live, event, cat,
    // derived
    matchType, engineType, isH2H, isSolo, isOpen, label,
    // shortcut peserta
    home: match.home_participant ?? null,
    away: match.away_participant ?? null,
    homeInst: match.home_participant?.institution ?? null,
    awayInst: match.away_participant?.institution ?? null,
    // sub-komponen sudah di-bind ke data match ini
    Timer: ({ children: c }) => <TimerDisplay fmt={fmt} live={live}>{c}</TimerDisplay>,
    Score: (renderProps) => <ScoreDisplay fmt={fmt} live={live} match={match} {...renderProps} />,
  });
}

export default MatchCard;