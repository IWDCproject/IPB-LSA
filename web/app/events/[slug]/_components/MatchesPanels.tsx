"use client";
import { PanelTitle, EmptyState } from "./Panel";

// ─── Helpers & Styles ─────────────────────────────────────────────────────────

const JK = { fontFamily: "'Plus Jakarta Sans', sans-serif" } as const;

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function getEngine(fmt: any) {
  return fmt?.modules?.[0] ?? null;
}

function calcAvg(scores: number[] = [], method = "avg"): number {
  if (!scores.length) return 0;
  if (method === "drop_extremes" && scores.length > 2) {
    const sorted = [...scores].sort((a, b) => a - b).slice(1, -1);
    return sorted.reduce((a, b) => a + b, 0) / sorted.length;
  }
  const sum = scores.reduce((a, b) => a + b, 0);
  return method === "sum" ? sum : sum / scores.length;
}

function groupByDate(matches: any[]): Map<string, any[]> {
  return matches.reduce((map, m) => {
    const key = m.scheduled_at ? fmtDate(m.scheduled_at) : "No Date";
    return map.set(key, [...(map.get(key) ?? []), m]);
  }, new Map<string, any[]>());
}

// ─── Score / badge components ──────────────────────────────────────────────────

function SolidLiveBadge() {
  return (
    <div style={{ ...JK, fontSize: 13, fontWeight: 800, color: "#111", background: "#FFC936", borderRadius: 6, padding: "4px 16px", flexShrink: 0 }}>
      Live
    </div>
  );
}

function ScoreSetsLive({ live }: { live: any }) {
  const setScore = live?.setScore ?? [0, 0];
  const setLog   = live?.setLog   ?? [];

  const NumPill = ({ n }: { n: number }) => (
    <div style={{ ...JK, fontSize: 14, fontWeight: 900, color: "#111", background: "#FFC936", borderRadius: 6, minWidth: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 6px" }}>
      {String(n).padStart(2, "0")}
    </div>
  );

  const SetPill = ({ s, i }: { s: any; i: number }) => (
    <div style={{
      background: "#FFF8D6",
      border: "1px solid #FFC936",
      borderRadius: 6,
      padding: "4px 8px",
      textAlign: "center",
      minWidth: 50
    }}>
      <div style={{ ...JK, fontSize: 10, fontWeight: 700, color: "#CA8A04", marginBottom: 2 }}>Set {i + 1}</div>
      <div style={{ ...JK, fontSize: 12, fontWeight: 800, color: "#111" }}>
        <span style={{ textDecoration: s.home > s.away ? "underline" : "none" }}>{s.home}</span>
        {" - "}
        <span style={{ textDecoration: s.away > s.home ? "underline" : "none" }}>{s.away}</span>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <NumPill n={setScore[0]} />
      {setLog.length === 0 ? (
        <span style={{ ...JK, fontSize: 14, fontWeight: 800, color: "#CA8A04" }}>-</span>
      ) : (
        setLog.map((s: any, i: number) => <SetPill key={i} s={s} i={i} />)
      )}
      <NumPill n={setScore[1]} />
    </div>
  );
}

function ScoreSetsFinished({ live }: { live: any }) {
  const setLog = live?.setLog ?? [];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      {setLog.map((s: any, i: number) => (
        <div key={i} style={{ background: "#f3f4f6", borderRadius: 6, padding: "4px 8px", textAlign: "center", minWidth: 50 }}>
          <div style={{ ...JK, fontSize: 10, fontWeight: 600, color: "#676767", marginBottom: 2 }}>Set {i + 1}</div>
          <div style={{ ...JK, fontSize: 12, fontWeight: 800, color: "#111" }}>
            <span style={{ textDecoration: s.home > s.away ? "underline" : "none" }}>{s.home}</span>
            {" - "}
            <span style={{ textDecoration: s.away > s.home ? "underline" : "none" }}>{s.away}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function JudgeScoreBadge({ live, engine }: { live: any; engine: any }) {
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

function ManualPickBadge({ live }: { live: any }) {
  const winner = live?.winner;
  if (!winner) return null;
  return (
    <div style={{ ...JK, fontSize: 13, fontWeight: 800, color: "#111", background: "#f3f4f6", borderRadius: 6, padding: "4px 16px" }}>
      {winner} Wins
    </div>
  );
}

function MiddleBadge({ match }: { match: any }) {
  const isH2H = match.competition_category?.format_id?.match_type === "head_to_head";
  return (
    <div style={{
      ...JK, fontSize: 13, fontWeight: 800, color: "#aaa",
      background: "#f3f4f6", borderRadius: 6, padding: "4px 16px",
      whiteSpace: "nowrap", minWidth: 50, textAlign: "center"
    }}>
      {isH2H ? "vs" : "---"}
    </div>
  );
}

function ScoreCell({ match }: { match: any }) {
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
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: isLive ? "#FFF8D6" : "#f3f4f6", border: isLive ? "1px solid #FFC936" : "1px solid transparent", borderRadius: 6, padding: "4px 16px" }}>
          <span style={{ ...JK, fontSize: 14, fontWeight: 800, color: "#111" }}>{String(h).padStart(2, "0")}</span>
          <span style={{ ...JK, fontSize: 14, fontWeight: 800, color: isLive ? "#CA8A04" : "#aaa" }}>-</span>
          <span style={{ ...JK, fontSize: 14, fontWeight: 800, color: "#111" }}>{String(a).padStart(2, "0")}</span>
        </div>
      );
    }
    case "score_sets":
      return isLive ? <ScoreSetsLive live={live} /> : <ScoreSetsFinished live={live} />;
    case "judge_scores":
    case "finish_time":
    case "manual_pick":
      if (isLive) return <SolidLiveBadge />;
      if (engine?.type === "judge_scores") return <JudgeScoreBadge live={live} engine={engine} />;
      if (engine?.type === "manual_pick") return <ManualPickBadge live={live} />;
      return null;
    default:
      return null;
  }
}

// ─── Participant cells ─────────────────────────────────────────────────────────

function Logo({ inst, size = 32, isLoser = false }: { inst: any; size?: number; isLoser?: boolean }) {
  const dimFilter = isLoser ? "saturate(0) opacity(0.65)" : undefined;
  if (!inst?.logo_url) {
    return <div style={{ width: size, height: size, borderRadius: "50%", background: inst?.color ?? "#334155", flexShrink: 0, filter: dimFilter, transition: "filter 0.2s" }} />;
  }
  return <img src={inst.logo_url} alt={inst?.name ?? ""} style={{ width: size, height: size, objectFit: "contain", flexShrink: 0, filter: dimFilter, transition: "filter 0.2s" }} />;
}

// ─── Mobile-only components (mirrors MatchesTab) ───────────────────────────────

function UndecidedLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <circle cx="16" cy="16" r="14.5" stroke="#D1D5DB" strokeWidth="1.5" strokeDasharray="3 2" />
      <text x="16" y="21" textAnchor="middle" fontSize="13" fontWeight="700" fontFamily="'Plus Jakarta Sans', sans-serif" fill="#D1D5DB">?</text>
    </svg>
  );
}

function UndecidedParticipant({ size = 32, align = "left" }: { size?: number; align?: "left" | "right" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0, justifyContent: align === "right" ? "flex-end" : "flex-start" }}>
      {align === "right" && (
        <div style={{ minWidth: 0, textAlign: "right" }}>
          <div style={{ ...JK, fontSize: 11, fontWeight: 600, color: "#D1D5DB", lineHeight: 1.2 }}>Undecided</div>
          <div style={{ ...JK, fontSize: 13, fontWeight: 700, color: "#D1D5DB", marginTop: 2 }}>To Be Determined</div>
        </div>
      )}
      <UndecidedLogo size={size} />
      {align === "left" && (
        <div style={{ minWidth: 0 }}>
          <div style={{ ...JK, fontSize: 11, fontWeight: 600, color: "#D1D5DB", lineHeight: 1.2 }}>Undecided</div>
          <div style={{ ...JK, fontSize: 13, fontWeight: 700, color: "#D1D5DB", marginTop: 2 }}>To Be Determined</div>
        </div>
      )}
    </div>
  );
}

function StatusLabel({ match }: { match: any }) {
  const isLive     = match.status === "live";
  const isFinished = match.status === "finished";
  const round      = (match.round as string | null | undefined)?.trim();
  if (round) return <span style={{ ...JK, fontSize: 11, fontWeight: 700, color: isLive ? "#D97706" : "#9CA3AF" }}>{round}</span>;
  if (isLive) return <span style={{ ...JK, fontSize: 11, fontWeight: 800, color: "#D97706" }}>Ongoing</span>;
  if (isFinished) {
    const winner = resolveWinnerName(match);
    return <span style={{ ...JK, fontSize: 11, fontWeight: 700, color: "#9CA3AF" }}>{winner ? `${winner} Win` : "Finished"}</span>;
  }
  return <span style={{ ...JK, fontSize: 11, fontWeight: 600, color: "#9CA3AF" }}>Upcoming</span>;
}

function MobileScoreCell({ match }: { match: any }) {
  const engine     = getEngine(match.competition_category?.format_id);
  const live       = match.live_state ?? {};
  const isLive     = match.status === "live";
  const isUpcoming = match.status === "upcoming";

  if (isUpcoming) return <MiddleBadge match={match} />;

  const numPill = (bg: string, color: string): React.CSSProperties => ({
    ...JK, fontSize: 14, fontWeight: 900, color,
    background: bg, borderRadius: 6,
    minWidth: 26, height: 26,
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "0 5px",
  });

  if (engine?.type === "score_sets") {
    if (isLive) {
      const setScore = live?.setScore ?? [0, 0];
      const setLog   = live?.setLog   ?? [];
      const detail   = setLog.map((s: any) => `${s.home}-${s.away}`).join(" | ");
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={numPill("#FFC936", "#111")}>{setScore[0]}</span>
            <span style={{ ...JK, fontSize: 12, fontWeight: 800, color: "#CA8A04" }}>vs</span>
            <span style={numPill("#FFC936", "#111")}>{setScore[1]}</span>
          </div>
          {detail && <div style={{ ...JK, ...truncateMobile, fontSize: 9, fontWeight: 600, color: "#CA8A04", maxWidth: 68, textAlign: "right" }}>{detail}</div>}
        </div>
      );
    } else {
      const setLog   = live?.setLog ?? [];
      const homeSets = setLog.filter((s: any) => s.home > s.away).length;
      const awaySets = setLog.filter((s: any) => s.away > s.home).length;
      const detail   = setLog.map((s: any) => `${s.home}-${s.away}`).join(" | ");
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={numPill("#f3f4f6", "#111")}>{homeSets}</span>
            <span style={{ ...JK, fontSize: 12, fontWeight: 800, color: "#aaa" }}>vs</span>
            <span style={numPill("#f3f4f6", "#111")}>{awaySets}</span>
          </div>
          {detail && <div style={{ ...JK, ...truncateMobile, fontSize: 9, fontWeight: 600, color: "#9CA3AF", maxWidth: 68, textAlign: "right" }}>{detail}</div>}
        </div>
      );
    }
  }

  // Fallback to regular ScoreCell for other engine types
  return <ScoreCell match={match} />;
}

function MobileMatchRow({ match }: { match: any }) {
  const isH2H      = match.competition_category?.format_id?.match_type === "head_to_head";
  const isOpen     = match.competition_category?.format_id?.match_type === "open";
  const isLive     = match.status === "live";
  const isFinished = match.status === "finished";
  const home       = match.home_participant;
  const away       = match.away_participant;
  const live       = match.live_state ?? {};

  const winnerId    = match.winner ?? live.winner;
  const homeIsLoser = isFinished && isH2H && !!winnerId && home?.id !== winnerId;
  const awayIsLoser = isFinished && isH2H && !!winnerId && away?.id !== winnerId;

  const timeLabel = isLive ? "Live" : fmtTime(match.scheduled_at);
  const metaTop: React.CSSProperties    = { ...JK, fontSize: 11, fontWeight: 700, color: isLive ? "#D97706" : "#555" };
  const metaBottom: React.CSSProperties = { ...JK, fontSize: 10, fontWeight: 500, color: "#aaa", marginTop: 1 };

  return (
    <div style={{
      background:    "#F8F9FB",
      borderRadius:  12,
      border:        "1px solid #ECEEF2",
      padding:       "10px 12px",
      display:       "flex",
      flexDirection: "column",
      gap:           8,
    }}>
      {/* Meta row: time/venue ←→ category/round */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ ...metaTop }} suppressHydrationWarning>{timeLabel}</div>
          {match.venue && <div style={{ ...metaBottom, ...truncateMobile, maxWidth: 140 }}>{match.venue}</div>}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ ...JK, fontSize: 11, fontWeight: 700, color: "#555", ...truncateMobile, maxWidth: 150 }}>
            {match.competition_category?.name ?? ""}
          </div>
          <div style={{ ...metaBottom, marginTop: 1 }}><StatusLabel match={match} /></div>
        </div>
      </div>

      {/* Participants + Score */}
      {isOpen ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}><OpenParticipants match={match} /></div>
          <div style={{ flexShrink: 0 }}><MobileScoreCell match={match} /></div>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              {home ? <Logo inst={home.institution} size={26} isLoser={homeIsLoser} /> : <UndecidedLogo size={26} />}
              <div style={{ minWidth: 0 }}>
                <div style={{ ...JK, ...truncateMobile, fontSize: 12, fontWeight: 700, color: home ? (homeIsLoser ? "#9CA3AF" : "#111") : "#D1D5DB", transition: "color 0.2s" }}>
                  {home?.name ?? "To Be Determined"}
                </div>
                <div style={{ ...JK, ...truncateMobile, fontSize: 10, fontWeight: 500, color: homeIsLoser ? "#C4C8D4" : "#aaa", transition: "color 0.2s" }}>
                  {home ? (home.institution?.name ?? "") : "Undecided"}
                </div>
              </div>
            </div>
            {isH2H && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                {away ? <Logo inst={away.institution} size={26} isLoser={awayIsLoser} /> : <UndecidedLogo size={26} />}
                <div style={{ minWidth: 0 }}>
                  <div style={{ ...JK, ...truncateMobile, fontSize: 12, fontWeight: 700, color: away ? (awayIsLoser ? "#9CA3AF" : "#111") : "#D1D5DB", transition: "color 0.2s" }}>
                    {away?.name ?? "To Be Determined"}
                  </div>
                  <div style={{ ...JK, ...truncateMobile, fontSize: 10, fontWeight: 500, color: awayIsLoser ? "#C4C8D4" : "#aaa", transition: "color 0.2s" }}>
                    {away ? (away.institution?.name ?? "") : "Undecided"}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <MobileScoreCell match={match} />
          </div>
        </div>
      )}
    </div>
  );
}

const truncate: React.CSSProperties = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };

// webkit-box truncate — used by mobile rows (allows 2-line clamp)
const truncateMobile: React.CSSProperties = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "?";
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta",
  });
}

function resolveWinnerName(match: any): string | null {
  const live     = match.live_state ?? {};
  const winnerId = match.winner ?? live.winner;
  if (!winnerId) return null;
  if (match.home_participant?.id === winnerId) return match.home_participant.name;
  if (match.away_participant?.id === winnerId) return match.away_participant.name;
  for (const entry of match.participants ?? []) {
    if (entry.participant_id?.id === winnerId) return entry.participant_id.name;
  }
  if (typeof live.winner === "string" && !live.winner.includes("-")) return live.winner;
  return null;
}

function ParticipantInfo({ inst, name, align = "left" }: { inst: any; name: string; align?: "left" | "right" }) {
  return (
    <div style={{ minWidth: 0, textAlign: align, flex: 1 }}>
      <div style={{ ...JK, ...truncate, fontSize: 11, fontWeight: 600, color: "#676767", lineHeight: 1.2 }}>
        {inst?.name ?? ""}
      </div>
      <div style={{ ...JK, ...truncate, fontSize: 13, fontWeight: 700, color: "#111", marginTop: 2 }}>
        {name}
      </div>
    </div>
  );
}

function OpenParticipants({ match }: { match: any }) {
  const entries = [...(match?.participants ?? [])]
    .sort((a: any, b: any) => a.position - b.position)
    .map((j: any) => j.participant_id);

  const shown    = entries.slice(0, 4);
  const allNames = entries.map((p: any) => p?.name).filter(Boolean);
  const line1    = allNames.slice(0, 3).join(", ");
  const line2    = allNames.slice(3);

  if (entries.length === 0) {
    return <div style={{ ...JK, fontSize: 12, fontWeight: 600, color: "#aaa" }}>Waiting for participants...</div>;
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ display: "flex", paddingRight: 8 }}>
        {shown.map((p: any, i: number) =>
          p?.institution?.logo_url ? (
            <img
              key={i}
              src={p.institution.logo_url}
              alt={p.institution?.name ?? ""}
              style={{
                width: 32, height: 32,
                objectFit: "contain",
                borderRadius: "50%",
                background: "#fff",
                border: "2px solid #fff",
                marginLeft: i > 0 ? -12 : 0,
                flexShrink: 0,
                zIndex: shown.length - i,
              }}
            />
          ) : (
            <div
              key={i}
              style={{
                width: 32, height: 32,
                borderRadius: "50%",
                background: (p as any)?.institution?.color ?? "#1D4ED8",
                border: "2px solid #fff",
                marginLeft: i > 0 ? -12 : 0,
                flexShrink: 0,
                zIndex: shown.length - i,
              }}
            />
          )
        )}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ ...JK, ...truncate, fontSize: 13, fontWeight: 700, color: "#000" }}>
          {line1}{line2.length > 0 ? "," : ""}
        </div>
        {line2.length > 0 && (
          <div style={{ ...JK, ...truncate, fontSize: 11, fontWeight: 500, color: "#676767", marginTop: 2 }}>
            {line2.slice(0, 3).join(", ")}{line2.length > 3 ? ", ..." : ""}
          </div>
        )}
      </div>
    </div>
  );
}

function HomeCell({ match }: { match: any }) {
  const isOpen      = match.competition_category?.format_id?.match_type === "open";
  const participant = match.home_participant;
  if (isOpen) return <OpenParticipants match={match} />;
  if (!participant) return <div />;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
      <Logo inst={participant.institution} />
      <ParticipantInfo inst={participant.institution} name={participant.name} />
    </div>
  );
}

function AwayCell({ match }: { match: any }) {
  const isH2H       = match.competition_category?.format_id?.match_type === "head_to_head";
  const participant = match.away_participant;
  if (!isH2H || !participant) return <div />;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-end", minWidth: 0 }}>
      <ParticipantInfo inst={participant.institution} name={participant.name} align="right" />
      <Logo inst={participant.institution} />
    </div>
  );
}

function PodiumRow({ live }: { live: any }) {
  const podium = (live?.timeLog ?? []).slice(0, 3);
  const labels = ["1st", "2nd", "3rd"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      {podium.map((p: any, i: number) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
          <div style={{ ...JK, fontSize: 13, fontWeight: 800, color: "#111", background: "#f3f4f6", borderRadius: 6, padding: "4px 10px", flexShrink: 0 }}>
            {labels[i]}
          </div>
          <Logo inst={p.institution ?? null} size={28} />
          <div style={{ minWidth: 0 }}>
            <div style={{ ...JK, ...truncate, fontSize: 11, fontWeight: 600, color: "#676767", lineHeight: 1.1 }}>
              {p.institution?.name ?? ""}
            </div>
            <div style={{ ...JK, ...truncate, fontSize: 13, fontWeight: 700, color: "#111" }}>
              {p.name}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Row ───────────────────────────────────────────────────────────────────────

const ROW_GRID: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto 1fr",
  alignItems: "center",
  padding: "10px 0",
  overflow: "hidden",
};

function CompactMatchRow({ match }: { match: any }) {
  const engine     = getEngine(match.competition_category?.format_id);
  const live       = match.live_state ?? {};
  const isH2H      = match.competition_category?.format_id?.match_type === "head_to_head";
  const isOpen     = match.competition_category?.format_id?.match_type === "open";
  const isFinished = match.status === "finished";

  if (engine?.type === "finish_time" && isFinished) {
    return (
      <div style={ROW_GRID}>
        <div style={{ gridColumn: "1 / -1", width: "100%" }}>
          <PodiumRow live={live} />
        </div>
      </div>
    );
  }

  return (
    <div style={ROW_GRID}>
      <div style={{ paddingRight: 10, minWidth: 0, overflow: "hidden", gridColumn: isOpen ? "1 / 3" : undefined }}>
        <HomeCell match={match} />
      </div>

      <div style={{ display: "flex", justifyContent: isOpen ? "flex-end" : "center", padding: "0 16px", gridColumn: isOpen ? "3 / 4" : undefined }}>
        <ScoreCell match={match} />
      </div>

      {!isOpen && (
        <div style={{ paddingLeft: 10, minWidth: 0, overflow: "hidden" }}>
          {isH2H ? <AwayCell match={match} /> : <div />}
        </div>
      )}
    </div>
  );
}

// ─── Date group header ─────────────────────────────────────────────────────────

function DateHeader({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 0 4px" }}>
      <span style={{ ...JK, fontSize: 11, fontWeight: 600, color: "#aaa", whiteSpace: "nowrap" }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: "#ebebeb" }} />
    </div>
  );
}

// ─── Panel card shell ──────────────────────────────────────────────────────────
//
// flex: 1 fills the explicit-height wrapper div from OverviewTab.
// The wrapper is a flex column, so this card expands to match it exactly.
//
const CARD: React.CSSProperties = {
  background:    "#fff",
  borderRadius:  12,
  padding:       "16px 20px",
  display:       "flex",
  flexDirection: "column",
  flex:          1,
  minHeight:     0,
};

// ─── Props ────────────────────────────────────────────────────────────────────
//
// `limit` is computed by useRightColumnLayout in OverviewTab.
// Panels no longer know about anchorHeight or budgetDeduction.
//
export interface MatchPanelProps {
  limit:         number;
  isMobile:      boolean;
  contentRef?:   React.RefObject<HTMLDivElement>;
  firstRowRef?:  React.RefObject<HTMLDivElement>; // measures a single row's true offsetHeight
  onTabChange?:  (tab: "matches") => void;
}

// ─── Panels ───────────────────────────────────────────────────────────────────

export function UpcomingMatchesPanel({
  upcoming,
  limit,
  isMobile,
  contentRef,
  firstRowRef,
  onTabChange,
}: MatchPanelProps & { upcoming: any[] }) {
  if (!upcoming.length) return null;

  const displayed = upcoming.slice(0, limit);
  const groups    = Array.from(groupByDate(displayed).entries());
  const remainder = upcoming.length - limit;

  const cardStyle: React.CSSProperties = isMobile
    ? { ...CARD, flex: "unset", minHeight: "unset" }
    : CARD;

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <span style={{ ...JK, fontSize: 14, fontWeight: 800, color: "#06125C" }}>Upcoming Matches</span>
        <span style={{ ...JK, fontSize: 10, color: "#aaa" }}>{upcoming.length} total</span>
      </div>

      <div ref={contentRef} style={isMobile ? {} : { flex: 1, overflow: "hidden", minHeight: 0 }}>
        {groups.map(([date, rows], gi) => (
          <div key={date}>
            <DateHeader label={date} />
            {rows.map((m: any, ri: number) => (
              <div key={m.id} ref={gi === 0 && ri === 0 ? firstRowRef : undefined}
                style={isMobile ? { marginBottom: 6 } : undefined}>
                {isMobile ? <MobileMatchRow match={m} /> : <CompactMatchRow match={m} />}
              </div>
            ))}
          </div>
        ))}
      </div>

      {remainder > 0 && (
        <div
          onClick={() => onTabChange?.("matches")}
          style={{
            ...JK,
            fontSize:      10,
            fontWeight:    600,
            color:         onTabChange ? "#0D26C2" : "#c8c8c8",
            textAlign:     "center",
            paddingTop:    6,
            letterSpacing: "0.02em",
            cursor:        onTabChange ? "pointer" : "default",
            textDecoration: onTabChange ? "underline" : "none",
          }}
        >
          +{remainder} more match{remainder !== 1 ? "es" : ""}
        </div>
      )}
    </div>
  );
}

export function LatestResultsPanel({
  finished,
  limit,
  isMobile,
  contentRef,
  firstRowRef,
  onTabChange,
}: MatchPanelProps & { finished: any[] }) {
  if (!finished.length) return null;

  const displayed = finished.slice(0, limit);
  const groups    = Array.from(groupByDate(displayed).entries());
  const remainder = finished.length - limit;

  const cardStyle: React.CSSProperties = isMobile
    ? { ...CARD, flex: "unset", minHeight: "unset" }
    : CARD;

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <span style={{ ...JK, fontSize: 14, fontWeight: 800, color: "#06125C" }}>Latest Results</span>
        <span style={{ ...JK, fontSize: 10, color: "#aaa" }}>{finished.length} total</span>
      </div>

      <div ref={contentRef} style={isMobile ? {} : { flex: 1, overflow: "hidden", minHeight: 0 }}>
        {groups.map(([date, rows], gi) => (
          <div key={date}>
            <DateHeader label={date} />
            {rows.map((m: any, ri: number) => (
              <div key={m.id} ref={gi === 0 && ri === 0 ? firstRowRef : undefined}
                style={isMobile ? { marginBottom: 6 } : undefined}>
                {isMobile ? <MobileMatchRow match={m} /> : <CompactMatchRow match={m} />}
              </div>
            ))}
          </div>
        ))}
      </div>

      {remainder > 0 && (
        <div
          onClick={() => onTabChange?.("matches")}
          style={{
            ...JK,
            fontSize:      10,
            fontWeight:    600,
            color:         onTabChange ? "#0D26C2" : "#c8c8c8",
            textAlign:     "center",
            paddingTop:    6,
            letterSpacing: "0.02em",
            cursor:        onTabChange ? "pointer" : "default",
            textDecoration: onTabChange ? "underline" : "none",
          }}
        >
          +{remainder} more result{remainder !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}