"use client";
import { useState, useEffect } from "react";

const BB = { fontFamily: "'Bebas Neue', 'Arial Narrow', sans-serif" };
const JK = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

const S = {
  card: {
    borderRadius: 10, overflow: "hidden", color: "#fff",
    display: "flex", flexDirection: "column",
    width: "100%", height: "100%", position: "relative",
  },
  cardBg: {
    position: "absolute", inset: 0,
    backgroundSize: "cover", backgroundPosition: "center",
    filter: "blur(6px)", transform: "scale(1.1)",
  },
  cardOverlay: {
    position: "absolute", inset: 0,
    background: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.75) 100%)",
  },
  cardInner: {
    position: "relative", zIndex: 1,
    display: "flex", flexDirection: "column", flex: 1,
    boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,1)",
    height: "100%",
     borderRadius: 10,
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    padding: "18px 18px 0", gap: 8,
  },
  label:    { ...JK, fontWeight: 700, fontSize: 15, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  meta:     { ...JK, fontSize: 11, fontWeight: 600, opacity: 0.6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  liveBadge: {
    ...BB,
    display: "flex", alignItems: "center", gap: 5,
    background: "#ef4444", borderRadius: 4, padding: "0px 6px",
    fontSize: 14, letterSpacing: 1, flexShrink: 0,
  },
  liveDot: {
    width: 6, height: 6, borderRadius: "50%",
    background: "#fff", display: "inline-block",
    animation: "pulse 1.2s ease-in-out infinite",
  },
  participant:     { display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 },
  participantName: { ...JK, fontWeight: 700, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  participantInst: { ...JK, fontSize: 12, fontWeight: 600, opacity: 0.6, whiteSpace: "nowrap", overflow: "hidden" },
  vs:          { ...BB, fontSize: 15, opacity: 0.35, flexShrink: 0, letterSpacing: 2 },
  scoreWrapper: { padding: "10px 18px 8px" },
  scoreRow:    { display: "flex", alignItems: "center", justifyContent: "center", gap: 8 },
  scoreNum:    { ...BB, fontSize: 48, lineHeight: 1, letterSpacing: 2 },
  scoreSep:    { ...BB, fontSize: 24, opacity: 0.35, letterSpacing: 2 },
  pill:        { ...JK, background: "rgba(255,255,255,0.15)", borderRadius: 4, padding: "2px 7px", fontSize: 12 },
};

function fmtSecs(s) {
  const t = Math.max(0, Math.floor(s));
  return `${Math.floor(t / 60).toString().padStart(2, "0")}:${(t % 60).toString().padStart(2, "0")}`;
}

function getEngine(fmt)   { return fmt?.modules?.[0] ?? null; }
function getTimerMod(fmt) { return fmt?.modules?.find((m) => m.type === "timer") ?? null; }

function calcJudgeScore(scores = [], method = "avg") {
  if (!scores.length) return 0;
  if (method === "drop_extremes" && scores.length > 2) {
    const sorted = [...scores].sort((a, b) => a - b).slice(1, -1);
    return sorted.reduce((a, b) => a + b, 0) / sorted.length;
  }
  const sum = scores.reduce((a, b) => a + b, 0);
  return method === "sum" ? sum : sum / scores.length;
}

// timer pakai snapshot + elapsed, biar nggak nulis ke DB tiap detik
// lihat schema Bagian 11 untuk detail pattern ini
function useMatchTimer(live, timerMod) {
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

function InstitutionLogo({ inst, size = 32 }) {
  if (!inst?.logo_url) {
    return <div style={{ width: size, height: size, borderRadius: "50%", background: inst?.color ?? "#334155", flexShrink: 0 }} />;
  }
  return <img src={inst.logo_url} alt={inst.name} style={{ width: size, height: size, objectFit: "contain", flexShrink: 0 }} />;
}

function ScoreTimed({ live }) {
  return (
    <div style={S.scoreRow}>
      <span style={S.scoreNum}>{live?.homeScore ?? 0}</span>
      <span style={S.scoreSep}>-</span>
      <span style={S.scoreNum}>{live?.awayScore ?? 0}</span>
    </div>
  );
}

function ScoreSets({ live, engine }) {
  const setsWon   = live?.setsWon  ?? [0, 0];
  const setScore  = live?.setScore ?? [0, 0];
  const setLog    = live?.setLog   ?? [];
  const setsToWin = engine?.config?.sets_to_win ?? 3;

  const Dots = ({ filled }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, justifyContent: "center" }}>
      {Array.from({ length: setsToWin }).map((_, i) => (
        <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: i < filled ? "#fff" : "rgba(255,255,255,0.25)" }} />
      ))}
    </div>
  );

  return (
    <div style={{ textAlign: "center" }}>
      <div style={S.scoreRow}>
        {setsWon[0] > 0 && <Dots filled={setsWon[0]} />}
        <span style={S.scoreNum}>{setScore[0]}</span>
        <span style={S.scoreSep}>-</span>
        <span style={S.scoreNum}>{setScore[1]}</span>
        {setsWon[1] > 0 && <Dots filled={setsWon[1]} />}
      </div>
      {setLog.length > 0 && (
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 8, flexWrap: "wrap" }}>
          {setLog.map((s, i) => (
            <span key={i} style={S.pill}>{s.label ?? `Set ${i + 1}`}: {s.home}-{s.away}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function JudgeScores({ live, engine }) {
  const scores = live?.judgeScores ?? [];
  const method = engine?.config?.method ?? "avg";
  const result = calcJudgeScore(scores, method);
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ ...S.scoreNum, fontSize: 40 }}>{result.toFixed(2)}</div>
      <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 4, flexWrap: "wrap" }}>
        {scores.map((s, i) => <span key={i} style={S.pill}>{s.toFixed(1)}</span>)}
      </div>
      <div style={{ ...JK, fontSize: 11, fontWeight: 600, opacity: 0.5, marginTop: 4, textTransform: "uppercase", letterSpacing: 1 }}>
        {method === "drop_extremes" ? "Avg (drop extremes)" : method}
      </div>
    </div>
  );
}

function FinishTime({ live }) {
  const log = live?.timeLog ?? [];
  if (!log.length) {
    return <div style={{ ...JK, fontSize: 12, opacity: 0.4, textAlign: "center" }}>Waiting for results...</div>;
  }
  return (
    <ol style={{ margin: 0, padding: "0 0 0 18px" }}>
      {log.map((e, i) => (
        <li key={i} style={{ ...JK, fontSize: 13, marginBottom: 2 }}>
          <span style={{ fontWeight: 700 }}>{e.name}</span>
          <span style={{ opacity: 0.6, marginLeft: 6 }}>{e.time}</span>
        </li>
      ))}
    </ol>
  );
}

function ManualPick({ live }) {
  const winner   = live?.winner   ?? null;
  const rankings = live?.rankings ?? [];

  if (rankings.length > 0) {
    return (
      <ol style={{ margin: 0, padding: "0 0 0 18px" }}>
        {rankings.map((r) => (
          <li key={r.rank} style={{ ...JK, fontSize: 13, marginBottom: 2 }}>
            <span style={{ fontWeight: 700 }}>#{r.rank}</span>
            <span style={{ marginLeft: 6 }}>{r.name}</span>
          </li>
        ))}
      </ol>
    );
  }

  if (winner) {
    return <div style={{ ...JK, textAlign: "center", fontWeight: 700, fontSize: 15 }}>🏆 {winner}</div>;
  }

  return <div style={{ ...JK, fontSize: 12, fontWeight: 600, opacity: 0.5, textAlign: "center" }}>Waiting...</div>;
}

// peserta open match: dari junction rows match_participants
// tiap item: { id, position, participant_id: { id, name, institution } }
function OpenParticipants({ match }) {
  const entries = [...(match?.participants ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((j) => j.participant_id);

  if (!entries.length) return null;

  const shown = entries.slice(0, 4);
  const rest  = entries.length - shown.length;

  return (
    <div style={{ padding: "12px 18px 0", display: "flex", flexDirection: "column", gap: 3 }}>
      {shown.map((p, i) => (
        <div key={p?.id ?? i} style={{ ...JK, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ opacity: 0.5, fontSize: 11, fontWeight: 700, minWidth: 16 }}>{i + 1}</span>
          <span style={{ opacity: 0.9 }}>{p?.name ?? "?"}</span>
        </div>
      ))}
      {rest > 0 && (
        <div style={{ ...JK, fontSize: 12, fontWeight: 600, opacity: 0.5, marginTop: 2 }}>+{rest} more competing...</div>
      )}
    </div>
  );
}

function ScoreSection({ fmt, live, match }) {
  const engine = getEngine(fmt);
  switch (engine?.type) {
    case "score_timed":  return <ScoreTimed  live={live} />;
    case "score_sets":   return <ScoreSets   live={live} engine={engine} />;
    case "judge_scores": return <JudgeScores live={live} engine={engine} />;
    case "finish_time":  return <FinishTime  live={live} />;
    case "manual_pick":  return <ManualPick  live={live} />;
    default:             return null;
  }
}

export function MatchCard({ match }) {
  const { format: fmt, live_state: live, event, competition_category: cat } = match;

  const timerMod = getTimerMod(fmt);
  const secs     = useMatchTimer(live, timerMod);
  const isH2H    = fmt?.match_type === "head_to_head";
  const isSolo   = fmt?.match_type === "solo";
  const isOpen   = fmt?.match_type === "open";

  // match_name override, fallback ke "Kategori - Ronde"
  const label = match.match_name || [cat?.name, match.round].filter(Boolean).join(" - ");

  return (
    <div style={{ ...S.card, background: event?.card_image_url ? undefined : "rgba(255,255,255,0.08)" }}>
      {event?.card_image_url && (
        <div style={{ ...S.cardBg, backgroundImage: `url(${event.card_image_url})` }} />
      )}
      <div style={S.cardOverlay} />
      <div style={S.cardInner}>

        <div style={S.header}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={S.label}>{event?.name ?? ""}</div>
            <div style={S.meta}>{label}</div>
          </div>
          <div style={S.liveBadge}>
            <span style={S.liveDot} />
            {timerMod ? fmtSecs(secs) : "LIVE"}
          </div>
        </div>

        {isH2H && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 18px 0" }}>
            <div style={S.participant}>
              <InstitutionLogo inst={match.home_participant?.institution} />
              <div style={{ minWidth: 0 }}>
                <div style={S.participantName}>{match.home_participant?.name ?? "?"}</div>
                <div style={S.participantInst}>{match.home_participant?.institution?.name ?? ""}</div>
              </div>
            </div>
            <span style={S.vs}>VS</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0, justifyContent: "flex-end" }}>
              <div style={{ minWidth: 0, textAlign: "right" }}>
                <div style={S.participantName}>{match.away_participant?.name ?? "?"}</div>
                <div style={S.participantInst}>{match.away_participant?.institution?.name ?? ""}</div>
              </div>
              <InstitutionLogo inst={match.away_participant?.institution} />
            </div>
          </div>
        )}

        {isSolo && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px 0" }}>
            <InstitutionLogo inst={match.home_participant?.institution} />
            <div style={{ minWidth: 0 }}>
              <div style={S.participantName}>{match.home_participant?.name ?? "?"}</div>
              <div style={S.participantInst}>{match.home_participant?.institution?.name ?? ""}</div>
            </div>
          </div>
        )}

        {isOpen && <OpenParticipants match={match} />}

        <div style={{ ...S.scoreWrapper, paddingTop: isOpen ? 4 : 10 }}>
          {!isOpen && <ScoreSection fmt={fmt} live={live} match={match} />}
        </div>

        <div style={{ marginTop: "auto", padding: "8px 18px 16px" }}>
          <div style={S.meta}>{match.venue ?? ""}</div>
        </div>

      </div>
    </div>
  );
}

export default MatchCard;