"use client";

import { useMemo, useState } from "react";
import { staggerSlideUp, TAB_ENTER } from "./Animations";
import type { AnimPhase } from "./UseTabTransition";

// ─── Shared ────────────────────────────────────────────────────────────────────

const JK = { fontFamily: "'Plus Jakarta Sans', sans-serif" } as const;

const ROW_KEYFRAMES = `
  @keyframes match-row-in {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0);   }
  }
`;
const truncate: React.CSSProperties = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "?";
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta",
  });
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "No Date";
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function getEngine(fmt: any) { return fmt?.modules?.[0] ?? null; }

function calcAvg(scores: number[] = [], method = "avg"): number {
  if (!scores.length) return 0;
  if (method === "drop_extremes" && scores.length > 2) {
    const sorted = [...scores].sort((a, b) => a - b).slice(1, -1);
    return sorted.reduce((a, b) => a + b, 0) / sorted.length;
  }
  const sum = scores.reduce((a, b) => a + b, 0);
  return method === "sum" ? sum : sum / scores.length;
}

/**
 * Resolve winner display name — `match.winner` / `live.winner` may be a
 * raw participant UUID in the DB.  We look it up against home / away /
 * open participants so the UI always shows the human-readable name.
 */
function resolveWinnerName(match: any): string | null {
  const live     = match.live_state ?? {};
  const winnerId = match.winner ?? live.winner;
  if (!winnerId) return null;

  if (match.home_participant?.id === winnerId) return match.home_participant.name;
  if (match.away_participant?.id === winnerId) return match.away_participant.name;

  for (const entry of match.participants ?? []) {
    if (entry.participant_id?.id === winnerId) return entry.participant_id.name;
  }

  // manual_pick may store the name directly (no hyphens → not a UUID)
  if (typeof live.winner === "string" && !live.winner.includes("-")) return live.winner;

  return null;
}

// ─── Sort & group ──────────────────────────────────────────────────────────────

/** Newest-first: future dates at top, past at bottom.  Within a day, time is ascending. */
function sortNewestFirst(matches: any[]): any[] {
  return [...matches].sort((a, b) => {
    const ta = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0;
    const tb = b.scheduled_at ? new Date(b.scheduled_at).getTime() : 0;
    return tb - ta;
  });
}

function groupByDate(matches: any[]): Map<string, any[]> {
  return matches.reduce((map, m) => {
    const key = fmtDate(m.scheduled_at);
    return map.set(key, [...(map.get(key) ?? []), m]);
  }, new Map<string, any[]>());
}

// ─── Score / badge components — copied straight from MatchesPanels ─────────────

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
    <div style={{ background: "#FFF8D6", border: "1px solid #FFC936", borderRadius: 6, padding: "4px 8px", textAlign: "center", minWidth: 50 }}>
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
      {setLog.length === 0
        ? <span style={{ ...JK, fontSize: 14, fontWeight: 800, color: "#CA8A04" }}>-</span>
        : setLog.map((s: any, i: number) => <SetPill key={i} s={s} i={i} />)}
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

function ManualPickBadge({ match }: { match: any }) {
  const winner = resolveWinnerName(match);
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
    <div style={{ ...JK, fontSize: 13, fontWeight: 800, color: "#aaa", background: "#f3f4f6", borderRadius: 6, padding: "4px 16px", whiteSpace: "nowrap", minWidth: 50, textAlign: "center" }}>
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
      if (engine?.type === "manual_pick")  return <ManualPickBadge match={match} />;
      return null;
    default:
      return null;
  }
}

// ─── Participant components — copied straight from MatchesPanels ───────────────

function Logo({ inst, size = 32, isLoser = false }: { inst: any; size?: number; isLoser?: boolean }) {
  const dimFilter = isLoser ? "saturate(0) opacity(0.65)" : undefined;
  if (!inst?.logo_url) {
    return (
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: inst?.color ?? "#334155", flexShrink: 0,
        filter: dimFilter, transition: "filter 0.2s",
      }} />
    );
  }
  return (
    <img
      src={inst.logo_url} alt={inst?.name ?? ""}
      style={{ width: size, height: size, objectFit: "contain", flexShrink: 0, filter: dimFilter, transition: "filter 0.2s" }}
    />
  );
}

/** Circle outline with a "?" — used for bracket slots that have no participant yet. */
function UndecidedLogo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 32 32"
      fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
    >
      <circle cx="16" cy="16" r="14.5" stroke="#D1D5DB" strokeWidth="1.5" strokeDasharray="3 2" />
      <text
        x="16" y="21"
        textAnchor="middle"
        fontSize="13"
        fontWeight="700"
        fontFamily="'Plus Jakarta Sans', sans-serif"
        fill="#D1D5DB"
      >?</text>
    </svg>
  );
}

/** Participant slot that hasn't been decided yet (bracket seed). */
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

function ParticipantInfo({ inst, name, align = "left", dimmed = false }: {
  inst:    any;
  name:    string;
  align?:  "left" | "right";
  dimmed?: boolean;
}) {
  return (
    <div style={{ minWidth: 0, textAlign: align, flex: 1 }}>
      <div style={{ ...JK, ...truncate, fontSize: 11, fontWeight: 600, color: dimmed ? "#C4C8D4" : "#676767", lineHeight: 1.2, transition: "color 0.2s" }}>
        {inst?.name ?? ""}
      </div>
      <div style={{ ...JK, ...truncate, fontSize: 13, fontWeight: 700, color: dimmed ? "#9CA3AF" : "#111", marginTop: 2, transition: "color 0.2s" }}>
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
                width: 32, height: 32, objectFit: "contain", borderRadius: "50%",
                background: "#fff", border: "2px solid #fff",
                marginLeft: i > 0 ? -12 : 0, flexShrink: 0, zIndex: shown.length - i,
              }}
            />
          ) : (
            <div
              key={i}
              style={{
                width: 32, height: 32, borderRadius: "50%",
                background: (p as any)?.institution?.color ?? "#1D4ED8",
                border: "2px solid #fff",
                marginLeft: i > 0 ? -12 : 0, flexShrink: 0, zIndex: shown.length - i,
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

function HomeCell({ match, isLoser = false }: { match: any; isLoser?: boolean }) {
  const isOpen      = match.competition_category?.format_id?.match_type === "open";
  const participant = match.home_participant;
  if (isOpen) return <OpenParticipants match={match} />;
  if (!participant) return <UndecidedParticipant align="left" />;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
      <Logo inst={participant.institution} isLoser={isLoser} />
      <ParticipantInfo inst={participant.institution} name={participant.name} dimmed={isLoser} />
    </div>
  );
}

function AwayCell({ match, isLoser = false }: { match: any; isLoser?: boolean }) {
  const isH2H       = match.competition_category?.format_id?.match_type === "head_to_head";
  const participant = match.away_participant;
  if (!isH2H) return <div />;
  if (!participant) return <UndecidedParticipant align="right" />;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, minWidth: 0 }}>
      <ParticipantInfo inst={participant.institution} name={participant.name} align="right" dimmed={isLoser} />
      <Logo inst={participant.institution} isLoser={isLoser} />
    </div>
  );
}

function PodiumRow({ live }: { live: any }) {
  const podium = (live?.timeLog ?? []).slice(0, 3);
  const labels = ["1st", "2nd", "3rd"];
  const pct    = `${(100 / podium.length).toFixed(4)}%`;
  return (
    <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
      {podium.map((p: any, i: number) => (
        <div key={i} style={{ width: pct, flexShrink: 0, display: "flex", alignItems: "center", gap: 8, minWidth: 0, padding: "0 8px" }}>
          <div style={{ ...JK, fontSize: 12, fontWeight: 800, color: "#676767", background: "#f3f4f6", borderRadius: 6, padding: "3px 9px", flexShrink: 0 }}>
            {labels[i]}
          </div>
          <Logo inst={p.institution ?? null} size={26} />
          <div style={{ minWidth: 0 }}>
            <div style={{ ...JK, ...truncate, fontSize: 10, fontWeight: 600, color: "#9CA3AF", lineHeight: 1.1 }}>{p.institution?.name ?? ""}</div>
            <div style={{ ...JK, ...truncate, fontSize: 13, fontWeight: 700, color: "#111" }}>{p.name}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Status label ──────────────────────────────────────────────────────────────

function StatusLabel({ match }: { match: any }) {
  const isLive     = match.status === "live";
  const isFinished = match.status === "finished";
  const round      = (match.round as string | null | undefined)?.trim();

  // Round name is primary — tinted amber when live so it still reads as active
  if (round) {
    return (
      <span style={{ ...JK, fontSize: 11, fontWeight: 700, color: isLive ? "#D97706" : "#9CA3AF" }}>
        {round}
      </span>
    );
  }

  // Fallback: derive label from status
  if (isLive)     return <span style={{ ...JK, fontSize: 11, fontWeight: 800, color: "#D97706" }}>Ongoing</span>;
  if (isFinished) {
    const winner = resolveWinnerName(match);
    return <span style={{ ...JK, fontSize: 11, fontWeight: 700, color: "#9CA3AF" }}>{winner ? `${winner} Win` : "Finished"}</span>;
  }
  return <span style={{ ...JK, fontSize: 11, fontWeight: 600, color: "#9CA3AF" }}>Upcoming</span>;
}

// ─── Desktop row ───────────────────────────────────────────────────────────────
//
// 5-column grid: [time+venue 140px] [home 1fr] [score auto] [away 1fr] [meta 140px]
//
// Open-format: participants in col 2, Live badge in col 3 (middle), col 4 empty.
// finish_time finished: podium spans cols 2–4.

const DESKTOP_GRID: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "160px 1fr auto 1fr 160px",
  alignItems: "center",
  gap: "0 40px",
  padding: "7px 0",
};

function TimeVenueCell({ match, isLive }: { match: any; isLive: boolean }) {
  const timeLabel = isLive ? "Live" : fmtTime(match.scheduled_at);
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ ...JK, fontSize: 15, fontWeight: 800, color: isLive ? "#D97706" : "#676767" }} suppressHydrationWarning>
        {timeLabel}
      </div>
      {match.venue && (
        <div style={{ ...JK, ...truncate, fontSize: 11, fontWeight: 500, color: "#aaa", marginTop: 2 }}>
          {match.venue}
        </div>
      )}
    </div>
  );
}

function MetaCell({ match }: { match: any }) {
  return (
    <div style={{ textAlign: "right", minWidth: 0 }}>
      <div style={{ ...JK, ...truncate, fontSize: 13, fontWeight: 800, color: "#444" }}>
        {match.competition_category?.name ?? ""}
      </div>
      <div style={{ marginTop: 3 }}>
        <StatusLabel match={match} />
      </div>
    </div>
  );
}

function DesktopMatchRow({ match }: { match: any }) {
  const engine     = getEngine(match.competition_category?.format_id);
  const live       = match.live_state ?? {};
  const isLive     = match.status === "live";
  const isFinished = match.status === "finished";
  const isH2H      = match.competition_category?.format_id?.match_type === "head_to_head";

  // Derive loser for H2H finished matches
  const winnerId    = match.winner ?? live.winner;
  const homeIsLoser = isFinished && isH2H && !!winnerId && match.home_participant?.id !== winnerId;
  const awayIsLoser = isFinished && isH2H && !!winnerId && match.away_participant?.id !== winnerId;

  // finish_time + finished → podium
  if (engine?.type === "finish_time" && isFinished) {
    return (
      <div style={DESKTOP_GRID}>
        <TimeVenueCell match={match} isLive={isLive} />
        <div style={{ gridColumn: "2 / 5" }}>
          <PodiumRow live={live} />
        </div>
        <MetaCell match={match} />
      </div>
    );
  }

  return (
    <div style={DESKTOP_GRID}>
      {/* Col 1 — time + venue */}
      <TimeVenueCell match={match} isLive={isLive} />

      {/* Col 2 — home participant (or open participants list) */}
      <div style={{ minWidth: 0, overflow: "hidden" }}>
        <HomeCell match={match} isLoser={homeIsLoser} />
      </div>

      {/* Col 3 — score badge (always centered, even for open) */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <ScoreCell match={match} />
      </div>

      {/* Col 4 — away participant (empty div for open, keeps grid intact) */}
      <div style={{ minWidth: 0, overflow: "hidden" }}>
        <AwayCell match={match} isLoser={awayIsLoser} />
      </div>

      {/* Col 5 — category + status */}
      <MetaCell match={match} />
    </div>
  );
}

// ─── Mobile row ────────────────────────────────────────────────────────────────

function MobileMatchRow({ match }: { match: any }) {
  const isH2H      = match.competition_category?.format_id?.match_type === "head_to_head";
  const isOpen     = match.competition_category?.format_id?.match_type === "open";
  const isLive     = match.status === "live";
  const isFinished = match.status === "finished";
  const home       = match.home_participant;
  const away       = match.away_participant;
  const live       = match.live_state ?? {};

  // Derive loser for H2H finished matches
  const winnerId    = match.winner ?? live.winner;
  const homeIsLoser = isFinished && isH2H && !!winnerId && home?.id !== winnerId;
  const awayIsLoser = isFinished && isH2H && !!winnerId && away?.id !== winnerId;

  const timeLabel = isLive ? "Live" : fmtTime(match.scheduled_at);

  return (
    <div style={{
      background:   "#F8F9FB",
      borderRadius: 10,
      border:       "1px solid #ECEEF2",
      padding:      "12px 14px",
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      {/* Time · venue — category · status */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div>
          <span style={{ ...JK, fontSize: 12, fontWeight: 800, color: isLive ? "#D97706" : "#676767" }} suppressHydrationWarning>
            {timeLabel}
          </span>
          {match.venue && (
            <span style={{ ...JK, fontSize: 11, color: "#aaa" }}>{" · "}{match.venue}</span>
          )}
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ ...JK, fontSize: 12, fontWeight: 800, color: "#444" }}>{match.competition_category?.name ?? ""}</div>
          <div style={{ marginTop: 1 }}><StatusLabel match={match} /></div>
        </div>
      </div>

      {/* Participants + score */}
      {isOpen ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}><OpenParticipants match={match} /></div>
          <ScoreCell match={match} />
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
            {home ? <Logo inst={home.institution} size={28} isLoser={homeIsLoser} /> : <UndecidedLogo size={28} />}
            <div style={{ minWidth: 0 }}>
              <div style={{ ...JK, ...truncate, fontSize: 13, fontWeight: 700, color: home ? (homeIsLoser ? "#9CA3AF" : "#111") : "#D1D5DB", transition: "color 0.2s" }}>
                {home?.name ?? "To Be Determined"}
              </div>
              <div style={{ ...JK, ...truncate, fontSize: 11, color: homeIsLoser ? "#C4C8D4" : "#aaa", transition: "color 0.2s" }}>
                {home ? (home.institution?.name ?? "") : "Undecided"}
              </div>
            </div>
          </div>
          <div style={{ flexShrink: 0 }}><ScoreCell match={match} /></div>
          {isH2H && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0, justifyContent: "flex-end" }}>
              <div style={{ minWidth: 0, textAlign: "right" }}>
                <div style={{ ...JK, ...truncate, fontSize: 13, fontWeight: 700, color: away ? (awayIsLoser ? "#9CA3AF" : "#111") : "#D1D5DB", transition: "color 0.2s" }}>
                  {away?.name ?? "To Be Determined"}
                </div>
                <div style={{ ...JK, ...truncate, fontSize: 11, color: awayIsLoser ? "#C4C8D4" : "#aaa", transition: "color 0.2s" }}>
                  {away ? (away.institution?.name ?? "") : "Undecided"}
                </div>
              </div>
              {away ? <Logo inst={away.institution} size={28} isLoser={awayIsLoser} /> : <UndecidedLogo size={28} />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Date group header ─────────────────────────────────────────────────────────

function DateHeader({ label, count }: { label: string; count: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "18px 0 4px" }}>
      <span style={{ ...JK, fontSize: 12, fontWeight: 700, color: "#0D26C2", whiteSpace: "nowrap" }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: "#f0f0f0" }} />
      <span style={{ ...JK, fontSize: 11, fontWeight: 600, color: "#d1d5db", whiteSpace: "nowrap" }}>
        {count} match{count !== 1 ? "es" : ""}
      </span>
    </div>
  );
}

function RowDivider() {
  return <div style={{ height: 1, background: "#f5f5f5" }} />;
}

// ─── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "56px 20px", gap: 10 }}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      </svg>
      <span style={{ ...JK, fontSize: 13, fontWeight: 600, color: "#d1d5db" }}>No matches scheduled yet</span>
    </div>
  );
}

// ─── Filter tabs — inside the card, text-style ─────────────────────────────────

type FilterValue = "all" | "upcoming" | "live" | "finished";

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: "all",      label: "All"      },
  { value: "live",     label: "Live"     },
  { value: "upcoming", label: "Upcoming" },
  { value: "finished", label: "Results"  },
];

function FilterBar({ active, onChange, counts }: {
  active:   FilterValue;
  onChange: (v: FilterValue) => void;
  counts:   Record<FilterValue, number>;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
      {FILTERS.map(({ value, label }) => {
        const isActive = active === value;
        return (
          <button
            key={value}
            onClick={() => onChange(value)}
            style={{
              ...JK,
              background: "none",
              border:     "none",
              padding:    "0 0 0 16px",
              fontSize:   13,
              fontWeight: isActive ? 800 : 600,
              color:      isActive ? "#171717" : "#676767",
              cursor:     "pointer",
              display:    "flex",
              alignItems: "center",
              gap:        5,
              transition: "color 0.15s",
              whiteSpace: "nowrap",
            }}
          >
            {label}
            {counts[value] > 0 && (
              <span style={{
                ...JK, fontSize: 10, fontWeight: 700,
                color:        isActive ? "#444" : "#bbb",
                background:   isActive ? "#f0f0f0" : "#f5f5f5",
                borderRadius: 10, padding: "1px 6px",
              }}>
                {counts[value]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── MatchesTab ────────────────────────────────────────────────────────────────

interface Props {
  event:    any;
  isMobile: boolean;
  phase:    AnimPhase;
}

export default function MatchesTab({ event, isMobile, phase }: Props) {
  const allMatches: any[] = event.matches ?? [];
  const [filter, setFilter] = useState<FilterValue>("all");

  const counts = useMemo<Record<FilterValue, number>>(() => ({
    all:      allMatches.length,
    live:     allMatches.filter(m => m.status === "live").length,
    upcoming: allMatches.filter(m => m.status === "upcoming").length,
    finished: allMatches.filter(m => m.status === "finished").length,
  }), [allMatches]);

  const sorted = useMemo(() => {
    const base = filter === "all" ? allMatches : allMatches.filter(m => m.status === filter);
    return sortNewestFirst(base);
  }, [allMatches, filter]);

  const groups = useMemo(() => Array.from(groupByDate(sorted).entries()), [sorted]);

  const cardStyle = phase === "entering" ? staggerSlideUp(0, TAB_ENTER) : {};

  return (
    <div style={cardStyle}>
      <style dangerouslySetInnerHTML={{ __html: ROW_KEYFRAMES }} />
      <div style={{
        background:   "#fff",
        borderRadius: 14,
        padding:      isMobile ? "16px 16px" : "20px 28px",
        boxShadow:    "0 4px 24px rgba(0,0,0,0.10)",
      }}>

        {/* ── Title + filters in one row ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ ...JK, fontSize: isMobile ? 15 : 17, fontWeight: 800, color: "#06125C" }}>
            Matches
          </span>
          <FilterBar active={filter} onChange={setFilter} counts={counts} />
        </div>

        {/* ── Rows ── */}
        {sorted.length === 0 ? (
          <EmptyState />
        ) : (() => {
          // Flat row counter so stagger delay is global across all date groups
          let rowIdx = 0;
          return (
            // Key on filter so rows remount → animation replays on every filter switch
            <div key={filter}>
              {groups.map(([date, rows]) => (
                <div key={date}>
                  <DateHeader label={date} count={rows.length} />
                  {rows.map((match: any) => {
                    const delay = Math.min(rowIdx++, 8) * 40;
                    return (
                      <div
                        key={match.id}
                        style={{
                          opacity: 0,
                          animation: `match-row-in 0.28s ease ${delay}ms forwards`,
                          borderRadius: 8,
                          marginBottom: isMobile ? 6 : 0,
                        }}
                      >
                        {isMobile
                          ? <MobileMatchRow match={match} />
                          : <DesktopMatchRow match={match} />}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}