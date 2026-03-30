"use client";
import { useEffect, useRef } from "react";
import { getAssetUrl } from "@/lib/directus";

const BB = { fontFamily: "'Bebas Neue', 'Arial Narrow', sans-serif" };
const JK = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

const S = {
  card: {
    borderRadius: 10, overflow: "hidden", color: "#fff",
    display: "flex", flexDirection: "column",
    width: "100%", height: "100%", position: "relative",
    contain: "layout paint",
  },
  cardBg: {
    position: "absolute", inset: 0,
    backgroundSize: "cover", backgroundPosition: "center",
  },
  cardBgBlur: {
    position: "absolute",
    inset: "-5%",
    backgroundSize: "cover", backgroundPosition: "center",
    filter: "blur(6px)",
    transform: "scale(1.1)",
    willChange: "transform",
    zIndex: 0,
  },
  cardOverlay: {
    position: "absolute", inset: 0,
    background: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.75) 100%)",
    zIndex: 1,
  },
  cardInner: {
    position: "relative", zIndex: 2,
    display: "flex", flexDirection: "column", flex: 1,
    boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,1)",
    height: "100%",
    borderRadius: 10,
  },
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

function useMatchTimerDOM(ref, live, timerMod) {
  useEffect(() => {
    if (!timerMod) return;

    const isStopwatch = timerMod?.config?.mode === "stopwatch";

    const calc = () => {
      const snap = Math.max(0, live?.timerSecs ?? 0);
      if (!live?.timerRunning || !live?.timerLastStarted) return snap;
      const elapsed = Math.max(0, (Date.now() - new Date(live.timerLastStarted).getTime()) / 1000);
      return isStopwatch ? snap + elapsed : Math.max(0, snap - elapsed);
    };

    if (ref.current) ref.current.textContent = fmtSecs(calc());
    if (!live?.timerRunning) return;

    const id = setInterval(() => {
      if (ref.current) ref.current.textContent = fmtSecs(calc());
    }, 1000);

    return () => clearInterval(id);
  }, [live?.timerRunning, live?.timerLastStarted, live?.timerSecs, timerMod?.config?.mode]);
}

function InstitutionLogo({ inst, size = "calc(32px * var(--s))" }) {
  if (!inst?.logo_url) {
    return <div style={{ width: size, height: size, borderRadius: "50%", background: inst?.color ?? "#334155", flexShrink: 0 }} />;
  }
  return <img src={inst.logo_url} alt={inst.name} style={{ width: size, height: size, objectFit: "contain", flexShrink: 0 }} />;
}

function ScoreTimed({ live }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "calc(8px * var(--s))" }}>
      <span style={{ ...BB, fontSize: "calc(48px * var(--s))", lineHeight: 1, letterSpacing: 2 }}>{live?.homeScore ?? 0}</span>
      <span style={{ ...BB, fontSize: "calc(24px * var(--s))", opacity: 0.35, letterSpacing: 2 }}>-</span>
      <span style={{ ...BB, fontSize: "calc(48px * var(--s))", lineHeight: 1, letterSpacing: 2 }}>{live?.awayScore ?? 0}</span>
    </div>
  );
}

function ScoreSets({ live, engine }) {
  const setsWon   = live?.setsWon  ?? [0, 0];
  const setScore  = live?.setScore ?? [0, 0];
  const setLog    = live?.setLog   ?? [];
  const setsToWin = engine?.config?.sets_to_win ?? 3;

  const Dots = ({ filled }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "calc(4px * var(--s))", justifyContent: "center" }}>
      {Array.from({ length: setsToWin }).map((_, i) => (
        <div key={i} style={{ width: "calc(7px * var(--s))", height: "calc(7px * var(--s))", borderRadius: "50%", background: i < filled ? "#fff" : "rgba(255,255,255,0.25)" }} />
      ))}
    </div>
  );

  const pill = { ...JK, background: "rgba(255,255,255,0.15)", borderRadius: 4, padding: "calc(2px * var(--s)) calc(7px * var(--s))", fontSize: "calc(12px * var(--s))" };

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "calc(8px * var(--s))" }}>
        {setsWon[0] > 0 && <Dots filled={setsWon[0]} />}
        <span style={{ ...BB, fontSize: "calc(48px * var(--s))", lineHeight: 1, letterSpacing: 2 }}>{setScore[0]}</span>
        <span style={{ ...BB, fontSize: "calc(24px * var(--s))", opacity: 0.35, letterSpacing: 2 }}>-</span>
        <span style={{ ...BB, fontSize: "calc(48px * var(--s))", lineHeight: 1, letterSpacing: 2 }}>{setScore[1]}</span>
        {setsWon[1] > 0 && <Dots filled={setsWon[1]} />}
      </div>
      {setLog.length > 0 && (
        <div style={{ display: "flex", gap: "calc(6px * var(--s))", justifyContent: "center", marginTop: "calc(8px * var(--s))", flexWrap: "wrap" }}>
          {setLog.map((s, i) => (
            <span key={i} style={pill}>{s.label ?? `Set ${i + 1}`}: {s.home}-{s.away}</span>
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
  const pill = { ...JK, background: "rgba(255,255,255,0.15)", borderRadius: 4, padding: "calc(2px * var(--s)) calc(7px * var(--s))", fontSize: "calc(12px * var(--s))" };
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ ...BB, fontSize: "calc(40px * var(--s))", lineHeight: 1, letterSpacing: 2 }}>{result.toFixed(2)}</div>
      <div style={{ display: "flex", gap: "calc(6px * var(--s))", justifyContent: "center", marginTop: "calc(4px * var(--s))", flexWrap: "wrap" }}>
        {scores.map((s, i) => <span key={i} style={pill}>{s.toFixed(1)}</span>)}
      </div>
      <div style={{ ...JK, fontSize: "calc(11px * var(--s))", fontWeight: 600, opacity: 0.5, marginTop: "calc(4px * var(--s))", textTransform: "uppercase", letterSpacing: 1 }}>
        {method === "drop_extremes" ? "Avg (drop extremes)" : method}
      </div>
    </div>
  );
}

function FinishTime({ live }) {
  const log = live?.timeLog ?? [];
  if (!log.length) {
    return <div style={{ ...JK, fontSize: "calc(12px * var(--s))", opacity: 0.4, textAlign: "center" }}>Waiting for results...</div>;
  }
  return (
    <ol style={{ margin: 0, padding: `0 0 0 calc(18px * var(--s))` }}>
      {log.map((e, i) => (
        <li key={i} style={{ ...JK, fontSize: "calc(13px * var(--s))", marginBottom: "calc(2px * var(--s))" }}>
          <span style={{ fontWeight: 700 }}>{e.name}</span>
          <span style={{ opacity: 0.6, marginLeft: "calc(6px * var(--s))" }}>{e.time}</span>
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
      <ol style={{ margin: 0, padding: `0 0 0 calc(18px * var(--s))` }}>
        {rankings.map((r) => (
          <li key={r.rank} style={{ ...JK, fontSize: "calc(13px * var(--s))", marginBottom: "calc(2px * var(--s))" }}>
            <span style={{ fontWeight: 700 }}>#{r.rank}</span>
            <span style={{ marginLeft: "calc(6px * var(--s))" }}>{r.name}</span>
          </li>
        ))}
      </ol>
    );
  }

  if (winner) {
    return <div style={{ ...JK, textAlign: "center", fontWeight: 700, fontSize: "calc(15px * var(--s))" }}>🏆 {winner}</div>;
  }

  return <div style={{ ...JK, fontSize: "calc(12px * var(--s))", fontWeight: 600, opacity: 0.5, textAlign: "center" }}>Waiting...</div>;
}

function OpenParticipants({ match }) {
  const entries = [...(match?.participants ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((j) => j.participant_id);

  if (!entries.length) return null;

  const shown = entries.slice(0, 4);
  const rest  = entries.length - shown.length;

  return (
    <div style={{ padding: "calc(12px * var(--s)) calc(18px * var(--s)) 0", display: "flex", flexDirection: "column", gap: "calc(3px * var(--s))" }}>
      {shown.map((p, i) => (
        <div key={p?.id ?? i} style={{ ...JK, fontSize: "calc(13px * var(--s))", fontWeight: 600, display: "flex", alignItems: "center", gap: "calc(6px * var(--s))" }}>
          <span style={{ opacity: 0.5, fontSize: "calc(11px * var(--s))", fontWeight: 700, minWidth: "calc(16px * var(--s))" }}>{i + 1}</span>
          <span style={{ opacity: 0.9 }}>{p?.name ?? "?"}</span>
        </div>
      ))}
      {rest > 0 && (
        <div style={{ ...JK, fontSize: "calc(12px * var(--s))", fontWeight: 600, opacity: 0.5, marginTop: "calc(2px * var(--s))" }}>+{rest} more competing...</div>
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

// canvas blur path — draw bitmap ke canvas, scale ikutin ukuran container
// ResizeObserver mastiin canvas dimensions selalu sync sama display size
function BitmapBlurLayer({ bitmap }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!bitmap || !canvasRef.current) return;
    const canvas = canvasRef.current;

    function draw() {
      const dpr = window.devicePixelRatio || 1;
      const w   = canvas.offsetWidth  || 1;
      const h   = canvas.offsetHeight || 1;
      canvas.width        = Math.round(w * dpr);
      canvas.height       = Math.round(h * dpr);
      canvas.style.width  = w + "px";
      canvas.style.height = h + "px";
      const ctx = canvas.getContext("2d");
      ctx.scale(dpr, dpr);
      ctx.drawImage(bitmap, 0, 0, w, h);
    }

    const ro = new ResizeObserver(draw);
    ro.observe(canvas);

    return () => ro.disconnect();
  }, [bitmap]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:      "absolute",
        inset:         0,
        width:         "100%",
        height:        "100%",
        pointerEvents: "none",
        zIndex:        0,
      }}
    />
  );
}

// bitmap prop opsional — kalau null, fallback ke CSS backdrop-filter (jalan seperti biasa)
// scale(1.1) pada CSS path untuk nutup edge bleed blur
// pada canvas path tidak diperlukan karena PAD_FACTOR sudah handle itu
export function MatchCard({ match, bitmap = null }) {
  const { live_state: live, competition_category: cat } = match;
  const event = cat?.event_id;
  const fmt = cat?.format_id; // Menggunakan format dari kategori kompetisi

  const timerMod = getTimerMod(fmt);
  const timerRef = useRef(null);
  useMatchTimerDOM(timerRef, live, timerMod);

  const isH2H  = fmt?.match_type === "head_to_head";
  const isSolo = fmt?.match_type === "solo";
  const isOpen = fmt?.match_type === "open";

  const label = match.match_name || [cat?.name, match.round].filter(Boolean).join(" - ");

  const imageUrl = getAssetUrl(event?.card_image);
  const hasBg = !!imageUrl;

  return (
    <div style={{ ...S.card, background: hasBg ? undefined : "rgba(255,255,255,0.08)" }}>
      {hasBg && (
        <>
          <div style={{ ...S.cardBg, backgroundImage: `url(${imageUrl})` }} />
          {bitmap ? (
            <BitmapBlurLayer bitmap={bitmap} />
          ) : (
            <div style={{ ...S.cardBgBlur, backgroundImage: `url(${imageUrl})` }} />
          )}
        </>
      )}

      <div style={S.cardOverlay} />
      <div style={S.cardInner}>

        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          padding: "calc(18px * var(--s)) calc(18px * var(--s)) 0", gap: "calc(8px * var(--s))",
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            {/* Kosong di design bagian kiri atas, tapi kita tetap simpan data jika perlu */}
          </div>
          <div style={{
            ...BB,
            display: "flex", alignItems: "center", gap: "calc(5px * var(--s))",
            background: "#FFC936", color: "#000", borderRadius: 4, padding: "calc(2px * var(--s)) calc(10px * var(--s))",
            fontSize: "calc(14px * var(--s))", letterSpacing: 1, flexShrink: 0,
            fontWeight: 800
          }}>
            <div style={{ width: 8, height: 8, background: "#000", borderRadius: "50%" }} />
            ONGOING
          </div>
        </div>

        {/* Participants & Scores (Center) */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 calc(18px * var(--s))" }}>
          
          {isH2H && (
            <div style={{ display: "flex", alignItems: "center", gap: "calc(12px * var(--s))" }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", minWidth: 0 }}>
                <InstitutionLogo inst={match.home_participant?.institution} size="calc(48px * var(--s))" />
                <div style={{ ...JK, fontWeight: 700, fontSize: "calc(12px * var(--s))", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 4, textAlign: "center", width: "100%" }}>
                  {match.home_participant?.name?.split(" ")[0] ?? "?"}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "calc(8px * var(--s))" }}>
                <span style={{ ...BB, fontSize: "calc(48px * var(--s))", lineHeight: 1 }}>{live?.homeScore ?? 0}</span>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <span style={{ ...BB, fontSize: "calc(16px * var(--s))", opacity: 0.5 }}>VS</span>
                  <div style={{ ...BB, fontSize: "calc(11px * var(--s))", background: "rgba(0,0,0,0.4)", padding: "2px 6px", borderRadius: 2 }}>
                    {timerMod ? <span ref={timerRef}>00:00</span> : "LIVE"}
                  </div>
                </div>
                <span style={{ ...BB, fontSize: "calc(48px * var(--s))", lineHeight: 1 }}>{live?.awayScore ?? 0}</span>
              </div>

              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", minWidth: 0 }}>
                <InstitutionLogo inst={match.away_participant?.institution} size="calc(48px * var(--s))" />
                <div style={{ ...JK, fontWeight: 700, fontSize: "calc(12px * var(--s))", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 4, textAlign: "center", width: "100%" }}>
                  {match.away_participant?.name?.split(" ")[0] ?? "?"}
                </div>
              </div>
            </div>
          )}

          {isSolo && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "calc(24px * var(--s))" }}>
               <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 0 }}>
                <InstitutionLogo inst={match.home_participant?.institution} size="calc(56px * var(--s))" />
                <div style={{ ...JK, fontWeight: 700, fontSize: "calc(14px * var(--s))", marginTop: 8 }}>
                  {match.home_participant?.name ?? "?"}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <ScoreSection fmt={fmt} live={live} match={match} />
                <div style={{ ...BB, fontSize: "calc(14px * var(--s))", background: "rgba(0,0,0,0.4)", padding: "2px 8px", borderRadius: 2, marginTop: 4 }}>
                    {timerMod ? <span ref={timerRef}>00:00</span> : "LIVE"}
                </div>
              </div>
            </div>
          )}

          {isOpen && (
            <div style={{ textAlign: "center" }}>
              <OpenParticipants match={match} />
              <div style={{ ...BB, fontSize: "calc(18px * var(--s))", marginTop: 12 }}>30 MINUTES LEFT</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ 
          marginTop: "auto", 
          padding: "calc(12px * var(--s)) calc(18px * var(--s))",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          display: "flex", justifyContent: "space-between", alignItems: "center"
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ ...JK, fontWeight: 800, fontSize: "calc(12px * var(--s))", textTransform: "uppercase", letterSpacing: 0.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {event?.name ?? ""}
            </div>
          </div>
          <div style={{ ...JK, fontSize: "calc(11px * var(--s))", fontWeight: 600, opacity: 0.6 }}>
            {match.venue ?? ""}
          </div>
        </div>

      </div>
    </div>
  );
}

export default MatchCard;