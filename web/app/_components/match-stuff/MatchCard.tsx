"use client";
import { useEffect, useLayoutEffect, useRef } from "react";
import { getAssetUrl } from "@/lib/directus";
import { useBlur } from "@/contexts/BlurContext";

const BB = { fontFamily: "'Bebas Neue', 'Arial Narrow', sans-serif" };
const JK = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

const S = {
  card: {
    borderRadius: 10, overflow: "hidden", color: "#fff",
    display: "flex", flexDirection: "column",
    width: "100%", height: "100%", position: "relative",
    contain: "layout paint",
  } as React.CSSProperties,
  cardBg: {
    position: "absolute", inset: 0,
    backgroundSize: "cover", backgroundPosition: "center",
  } as React.CSSProperties,
  cardOverlay: {
    position: "absolute", inset: 0,
    background: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.75) 100%)",
    zIndex: 1,
  } as React.CSSProperties,
  cardInner: {
    position: "relative", zIndex: 2,
    display: "flex", flexDirection: "column", flex: 1,
    boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,1)",
    height: "100%",
    borderRadius: 10,
  } as React.CSSProperties,
};

function fmtSecs(s: number) {
  const t = Math.max(0, Math.floor(s));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = t % 60;
  if (h > 0) return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

function getEngine(fmt: any)   { return fmt?.modules?.[0] ?? null; }
function getTimerMod(fmt: any) { return fmt?.modules?.find((m: any) => m.type === "timer") ?? null; }

function calcJudgeScore(rawScores: any[] =[], method = "avg") {
  // 1. FILTER OUT NULL/UNDEFINED SCORES FIRST
  const scores = rawScores.filter((s) => typeof s === "number" && !isNaN(s));
  
  if (!scores.length) return 0;
  if (method === "drop_extremes" && scores.length > 2) {
    const sorted = [...scores].sort((a, b) => a - b).slice(1, -1);
    return sorted.reduce((a, b) => a + b, 0) / sorted.length;
  }
  const sum = scores.reduce((a, b) => a + b, 0);
  return method === "sum" ? sum : sum / scores.length;
}

function useMatchTimerDOM(ref: React.RefObject<HTMLSpanElement>, live: any, timerMod: any) {
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
  },[live?.timerRunning, live?.timerLastStarted, live?.timerSecs, timerMod?.config?.mode]);
}

function InstitutionLogo({ inst, size = "calc(32px * var(--s))" }: { inst: any; size?: string }) {
  if (!inst?.logo_url) {
    return <div style={{ width: size, height: size, borderRadius: "50%", background: inst?.color ?? "#334155", flexShrink: 0 }} />;
  }
  return <img src={inst.logo_url} alt={inst.name} style={{ width: size, height: size, objectFit: "contain", flexShrink: 0 }} />;
}

function ScoreTimed({ live }: { live: any }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "calc(8px * var(--s))" }}>
      <span style={{ ...BB, fontSize: "calc(48px * var(--s))", lineHeight: 1, letterSpacing: 2 }}>{live?.homeScore ?? 0}</span>
      <span style={{ ...BB, fontSize: "calc(24px * var(--s))", opacity: 0.35, letterSpacing: 2 }}>-</span>
      <span style={{ ...BB, fontSize: "calc(48px * var(--s))", lineHeight: 1, letterSpacing: 2 }}>{live?.awayScore ?? 0}</span>
    </div>
  );
}

function ScoreSets({ live, engine }: { live: any; engine: any }) {
  const setsWon   = live?.setsWon  ?? [0, 0];
  const setScore  = live?.setScore ??[0, 0];
  const setLog    = live?.setLog   ??[];
  const setsToWin = engine?.config?.sets_to_win ?? 3;

  const Dots = ({ filled }: { filled: number }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "calc(4px * var(--s))", justifyContent: "center" }}>
      {Array.from({ length: setsToWin }).map((_, i) => (
        <div key={i} style={{
          width: "calc(7px * var(--s))", height: "calc(7px * var(--s))",
          borderRadius: "50%", background: i < filled ? "#fff" : "rgba(255,255,255,0.25)",
        }} />
      ))}
    </div>
  );

  const pill: React.CSSProperties = {
    ...JK,
    background: "rgba(255,255,255,0.15)", borderRadius: 4,
    padding: "calc(2px * var(--s)) calc(7px * var(--s))",
    fontSize: "calc(12px * var(--s))",
  };

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "calc(8px * var(--s))" }}>
        <Dots filled={setsWon[0]} />
        <span style={{ ...BB, fontSize: "calc(48px * var(--s))", lineHeight: 1, letterSpacing: 2 }}>{setScore[0]}</span>
        <span style={{ ...BB, fontSize: "calc(24px * var(--s))", opacity: 0.35, letterSpacing: 2 }}>-</span>
        <span style={{ ...BB, fontSize: "calc(48px * var(--s))", lineHeight: 1, letterSpacing: 2 }}>{setScore[1]}</span>
        <Dots filled={setsWon[1]} />
      </div>
      {setLog.length > 0 && (
        <div style={{ display: "flex", gap: "calc(6px * var(--s))", justifyContent: "center", marginTop: "calc(4px * var(--s))", flexWrap: "wrap" }}>
          {setLog.map((s: any, i: number) => (
            <span key={i} style={pill}>{s.home} - {s.away}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function JudgeScores({ live, engine }: { live: any; engine: any }) {
  const scores = live?.judgeScores ??[];
  const method = engine?.config?.method ?? "avg";
  const result = calcJudgeScore(scores, method);
  const pill: React.CSSProperties = {
    ...JK,
    background: "rgba(255,255,255,0.15)", borderRadius: 4,
    padding: "calc(2px * var(--s)) calc(7px * var(--s))",
    fontSize: "calc(12px * var(--s))",
  };
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ ...BB, fontSize: "calc(40px * var(--s))", lineHeight: 1, letterSpacing: 2 }}>{result.toFixed(2)}</div>
      <div style={{ display: "flex", gap: "calc(6px * var(--s))", justifyContent: "center", marginTop: "calc(4px * var(--s))", flexWrap: "wrap" }}>
        {/* 2. SAFELY HANDLE NULL VALUES IN THE UI */}
        {scores.map((s: number | null, i: number) => (
          <span key={i} style={pill}>
            {typeof s === "number" ? s.toFixed(1) : "-"}
          </span>
        ))}
      </div>
      <div style={{ ...JK, fontSize: "calc(11px * var(--s))", fontWeight: 600, opacity: 0.5, marginTop: "calc(4px * var(--s))", textTransform: "uppercase", letterSpacing: 1 }}>
        {method === "drop_extremes" ? "Avg (drop extremes)" : method}
      </div>
    </div>
  );
}

function FinishTime({ live, match }: { live: any; match: any }) {
  const log = live?.timeLog ??[];
  if (!log.length) {
    const isOpen = match?.competition_category?.format_id?.match_type === "open";
    if (isOpen && match?.participants?.length) return <OpenParticipants match={match} />;
    return <div style={{ ...JK, fontSize: "calc(12px * var(--s))", opacity: 0.4, textAlign: "center" }}>Waiting for results...</div>;
  }
  return (
    <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "calc(260px * var(--s))", display: "flex", flexDirection: "column", gap: "calc(5px * var(--s))" }}>
        {log.map((e: any, i: number) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "calc(12px * var(--s))" }}>
            <span style={{ ...JK, fontSize: "calc(13px * var(--s))", fontWeight: 700, minWidth: 0 }}>
              <span style={{ opacity: 0.4, fontSize: "calc(11px * var(--s))", fontWeight: 700, marginRight: "calc(5px * var(--s))" }}>{i + 1}</span>
              {e.name}
            </span>
            <span style={{ ...JK, fontSize: "calc(13px * var(--s))", opacity: 0.6, flexShrink: 0 }}>{e.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ManualPick({ live, match }: { live: any; match: any }) {
  const winner   = live?.winner   ?? null;
  const rankings = live?.rankings ??[];

  if (rankings.length > 0) {
    return (
      <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "calc(5px * var(--s))", alignItems: "flex-start" }}>
          {rankings.map((r: any) => (
            <div key={r.rank} style={{ display: "flex", alignItems: "baseline", gap: "calc(8px * var(--s))" }}>
              <span style={{ opacity: 0.5, fontSize: "calc(11px * var(--s))", fontWeight: 800 }}>#{r.rank}</span>
              <span style={{ ...JK, fontSize: "calc(13px * var(--s))", fontWeight: 600 }}>{r.name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (winner) {
    return <div style={{ ...JK, textAlign: "center", fontWeight: 700, fontSize: "calc(15px * var(--s))" }}>🏆 {winner}</div>;
  }

  const isOpen = match?.competition_category?.format_id?.match_type === "open";
  if (isOpen && match?.participants?.length) {
    return <OpenParticipants match={match} />;
  }

  return <div style={{ ...JK, fontSize: "calc(12px * var(--s))", fontWeight: 600, opacity: 0.5, textAlign: "center" }}>Waiting...</div>;
}

function ScoreSection({ fmt, live, match }: { fmt: any; live: any; match: any }) {
  const engine = getEngine(fmt);
  switch (engine?.type) {
    case "score_timed":  return <ScoreTimed  live={live} />;
    case "score_sets":   return <ScoreSets   live={live} engine={engine} />;
    case "judge_scores": return <JudgeScores live={live} engine={engine} />;
    case "finish_time":  return <FinishTime  live={live} match={match} />;
    case "manual_pick":  return <ManualPick  live={live} match={match} />;
    default:             return null;
  }
}

function OpenParticipants({ match }: { match: any }) {
  const entries = [...(match?.participants ?? [])]
    .sort((a: any, b: any) => a.position - b.position)
    .map((j: any) => j.participant_id);

  if (!entries.length) return null;

  const shown = entries.slice(0, 4);
  const rest  = entries.length - shown.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "calc(3px * var(--s))", alignItems: "center" }}>
      {shown.map((p: any, i: number) => (
        <div key={p?.id ?? i} style={{ ...JK, fontSize: "calc(13px * var(--s))", fontWeight: 600, display: "flex", alignItems: "center", gap: "calc(6px * var(--s))" }}>
          <span style={{ opacity: 0.5, fontSize: "calc(11px * var(--s))", fontWeight: 700, width: "calc(14px * var(--s))", textAlign: "right" }}>{i + 1}</span>
          <span style={{ opacity: 0.9 }}>{p?.name ?? "?"}</span>
        </div>
      ))}
      {rest > 0 && (
        <div style={{ ...JK, fontSize: "calc(12px * var(--s))", fontWeight: 600, opacity: 0.5, marginTop: "calc(2px * var(--s))" }}>+{rest} more competing...</div>
      )}
    </div>
  );
}


function BitmapBlurLayer({ bitmap }) {
  const canvasRef = useRef(null);
  const bitmapRef = useRef(null);

  useEffect(() => {
    if (!bitmap || !canvasRef.current) return;
    bitmapRef.current = bitmap;
    const canvas = canvasRef.current;

    function draw() {
      if (!bitmapRef.current) return;
      const dpr = window.devicePixelRatio || 1;
      const w   = canvas.offsetWidth  || 1;
      const h   = canvas.offsetHeight || 1;
      canvas.width  = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // cover-fit: scale bitmap so it fills w×h without distortion
      const bw = bitmapRef.current.width;
      const bh = bitmapRef.current.height;
      const scale = Math.max(w / bw, h / bh);
      const dw = bw * scale;
      const dh = bh * scale;
      const dx = (w - dw) / 2;
      const dy = (h - dh) / 2;
      ctx.drawImage(bitmapRef.current, dx, dy, dw, dh);
    }

    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    draw(); // initial paint
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
      }}
    />
  );
}

export function MatchCard({ match, bitmap: bitmapProp = null }: { match: any; bitmap?: ImageBitmap | null }) {
  const { live_state: live, competition_category: cat } = match;
  const event = cat?.event_id;
  const fmt   = cat?.format_id;

  const isH2H  = fmt?.match_type === "head_to_head";
  const isSolo = fmt?.match_type === "solo";
  const isOpen = fmt?.match_type === "open";

  const timerMod     = getTimerMod(fmt);
  const badgeTimerRef = useRef<HTMLSpanElement>(null);
  const openTimerRef  = useRef<HTMLSpanElement>(null);
  useMatchTimerDOM(badgeTimerRef, live, (!isOpen && timerMod) ? timerMod : null);
  useMatchTimerDOM(openTimerRef,  live,  (isOpen && timerMod) ? timerMod : null);

  const cardRef  = useRef<HTMLDivElement>(null);
  const DESIGN_W = 350;

  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const update = () => {
      const w = el.getBoundingClientRect().width;
      if (w) el.style.setProperty("--s", (w / DESIGN_W).toFixed(3));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  },[]);

  const imageUrl = getAssetUrl(event?.card_image);
  const hasBg    = !!imageUrl;

  const { bitmaps } = useBlur();
  const bitmap = bitmapProp ?? (imageUrl ? bitmaps[imageUrl]?.matchcard?.bitmap ?? null : null);

  return (
    <div ref={cardRef} style={{ ...S.card, background: hasBg ? undefined : "rgba(255,255,255,0.08)" }}>
      {hasBg && (
        <>
          <div style={{ ...S.cardBg, backgroundImage: `url(${imageUrl})` }} />
          {bitmap && <BitmapBlurLayer bitmap={bitmap} />}
        </>
      )}

      <div style={S.cardOverlay} />
      <div style={S.cardInner}>

        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          padding: "calc(18px * var(--s)) calc(18px * var(--s)) 0", gap: "calc(8px * var(--s))",
        }}>
          <div style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: "calc(2px * var(--s))", paddingTop: "calc(2px * var(--s))" }}>
            {match.round && (
              <span style={{ ...JK, fontSize: "calc(12px * var(--s))", fontWeight: 800, color: "#FFC936", textTransform: "uppercase", letterSpacing: 0.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {match.round}
              </span>
            )}
            {cat?.name && (
              <span style={{ ...JK, fontSize: "calc(11px * var(--s))", fontWeight: 600, opacity: 0.8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {cat.name}
              </span>
            )}
          </div>
          <div style={{
            ...BB,
            display: "flex", alignItems: "center", gap: "calc(5px * var(--s))",
            background: "rgba(255,201,54,0.4)", color: "#fff",
            border: "1px solid #FFC936",
            borderRadius: 4,
            padding: "calc(2px * var(--s)) calc(10px * var(--s))",
            fontSize: "calc(14px * var(--s))", letterSpacing: 1, flexShrink: 0,
            fontWeight: 800,
          }}>
            {timerMod && !isOpen ? <span ref={badgeTimerRef}>00:00</span> : "LIVE"}
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 calc(18px * var(--s))" }}>

          {isH2H && (
            <div style={{ display: "flex", alignItems: "center", gap: "calc(12px * var(--s))" }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", minWidth: 0 }}>
                <InstitutionLogo inst={match.home_participant?.institution} size="calc(56px * var(--s))" />
                <div style={{ ...JK, fontWeight: 700, fontSize: "calc(14px * var(--s))", marginTop: 4, textAlign: "center", width: "100%", lineHeight: 1.2, whiteSpace: "pre-wrap" }}>
                  {match.home_participant?.name?.replace(" ", "\n") ?? "?"}
                </div>
              </div>

              <ScoreSection fmt={fmt} live={live} match={match} />

              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", minWidth: 0 }}>
                <InstitutionLogo inst={match.away_participant?.institution} size="calc(56px * var(--s))" />
                <div style={{ ...JK, fontWeight: 700, fontSize: "calc(14px * var(--s))", marginTop: 4, textAlign: "center", width: "100%", lineHeight: 1.2, whiteSpace: "pre-wrap" }}>
                  {match.away_participant?.name?.replace(" ", "\n") ?? "?"}
                </div>
              </div>
            </div>
          )}

          {(isSolo || isOpen) && (
            <div style={{ textAlign: "center" }}>
              {isOpen && (
                <div style={{ ...BB, fontSize: "calc(36px * var(--s))", marginBottom: "calc(10px * var(--s))", letterSpacing: 2 }}>
                  {timerMod ? (
                    <span ref={openTimerRef}>00:00:00</span>
                  ) : (
                    <span style={{ opacity: 0.15 }}>--:--:--</span>
                  )}
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "calc(24px * var(--s))" }}>
                {isSolo && (
                   <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 0 }}>
                     <InstitutionLogo inst={match.home_participant?.institution} size="calc(56px * var(--s))" />
                     <div style={{ ...JK, fontWeight: 700, fontSize: "calc(14px * var(--s))", marginTop: 4 }}>
                       {match.home_participant?.name ?? "?"}
                     </div>
                   </div>
                )}
                <ScoreSection fmt={fmt} live={live} match={match} />
              </div>
            </div>
          )}
        </div>

        <div style={{
          marginTop: "auto",
          padding: "calc(12px * var(--s)) calc(18px * var(--s))",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
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