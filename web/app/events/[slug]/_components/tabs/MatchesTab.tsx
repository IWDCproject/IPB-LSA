"use client";

import Image from "next/image";

import { useMemo, useState } from "react";
import { staggerSlideUp, TAB_ENTER } from "../shared/Animations";
import type { AnimPhase } from "../shared/UseTabTransition";
import type { MappedEvent, MappedMatch, TabKey } from "../../_types";
import { JK } from "../shared/tokens";
import {
  getEngine, calcAvg, fmtDateLong as fmtDate, fmtTime, groupByDateLong as groupByDate, resolveWinnerName,
} from "../match/scoreUtils";
import { MiddleBadge, ScoreCell, AnimatedScore } from "../match/ScoreBadges";

const ROW_KEYFRAMES = `
  @keyframes match-row-in {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0);   }
  }
`;
const truncate: React.CSSProperties = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

/** Newest-first sort: future dates at top, past at bottom. */
function sortNewestFirst(matches: MappedMatch[]): MappedMatch[] {
  return [...matches].sort((a, b) => {
    const ta = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0;
    const tb = b.scheduled_at ? new Date(b.scheduled_at).getTime() : 0;
    return tb - ta;
  });
}

/** Mobile-only score display for score_sets engine:
 *  - Big set-count numbers (home sets won vs away sets won)
 *  - Tiny detail line: "21-18 | 18-21 | 21-16"
 *  - Falls back to compact ScoreCell for all other engine types
 */
function MobileScoreCell({ match }: { match: MappedMatch }) {
  const engine     = getEngine(match.competition_category?.format_id);
  const live       = match.live_state ?? {};
  const isLive     = match.status === "live";
  const isUpcoming = match.status === "upcoming";

  if (isUpcoming) return <MiddleBadge match={match} />;

  // Shared pill style — matches compact NumPill sizing used across all other score cells
  const numPill = (bg: string, color: string): React.CSSProperties => ({
    ...JK, fontSize: 14, fontWeight: 900, color,
    background: bg, borderRadius: 6,
    minWidth: 26, height: 26,
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "0 5px",
  });

  if (engine?.type === "score_sets") {
    if (isLive) {
      const setScore  = live?.setScore ?? [0, 0];
      const setLog    = live?.setLog   ?? [];
      const detailArr = setLog.map((s: any) => `${s.home}-${s.away}`);
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, maxWidth: 88 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={numPill("#FFC936", "#111")}><AnimatedScore value={String(setScore[0])} /></span>
            <span style={{ ...JK, fontSize: 12, fontWeight: 800, color: "#CA8A04" }}>vs</span>
            <span style={numPill("#FFC936", "#111")}><AnimatedScore value={String(setScore[1])} /></span>
          </div>
          {detailArr.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: "1px 3px", maxWidth: "100%" }}>
              {detailArr.map((d, i) => (
                <span key={i} style={{ ...JK, fontSize: 9, fontWeight: 600, color: "#CA8A04", whiteSpace: "nowrap" }}>[{d}]</span>
              ))}
            </div>
          )}
        </div>
      );
    } else {
      const setLog    = live?.setLog ?? [];
      const homeSets  = setLog.filter((s: any) => s.home > s.away).length;
      const awaySets  = setLog.filter((s: any) => s.away > s.home).length;
      const detailArr = setLog.map((s: any) => `${s.home}-${s.away}`);
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, maxWidth: 88 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={numPill("#f3f4f6", "#111")}><AnimatedScore value={String(homeSets)} /></span>
            <span style={{ ...JK, fontSize: 12, fontWeight: 800, color: "#aaa" }}>vs</span>
            <span style={numPill("#f3f4f6", "#111")}><AnimatedScore value={String(awaySets)} /></span>
          </div>
          {detailArr.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: "1px 3px", maxWidth: "100%" }}>
              {detailArr.map((d, i) => (
                <span key={i} style={{ ...JK, fontSize: 9, fontWeight: 600, color: "#9CA3AF", whiteSpace: "nowrap" }}>[{d}]</span>
              ))}
            </div>
          )}
        </div>
      );
    }
  }

  if (engine?.type === "judge_scores") {
    const scores: number[]   = live?.judgeScores ?? [];
    const method             = engine?.config?.method ?? "avg";
    const judgeCount: number = engine?.config?.num_judges ?? scores.length;

    const submitted = scores.filter((s: any) => s !== undefined && s !== null);
    const hasAny    = submitted.length > 0;
    const avgResult = hasAny
      ? calcAvg(submitted, method).toFixed(1).replace(".", ",")
      : "--,-";

    // Detail tokens — no animation, "--,-" placeholder for each pending judge
    const detailArr = judgeCount > 0
      ? Array.from({ length: judgeCount }, (_, i) => {
          const raw = scores[i];
          return (raw !== undefined && raw !== null)
            ? raw.toFixed(1).replace(".", ",")
            : "--,-";
        })
      : [];

    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, maxWidth: 88 }}>
        <span style={numPill(isLive ? "#FFC936" : "#f3f4f6", "#111")}>
          &nbsp;Avg:&nbsp;<AnimatedScore value={avgResult} />&nbsp;
        </span>
        {detailArr.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: "1px 3px", maxWidth: "100%" }}>
            {detailArr.map((d, i) => (
              <span key={i} style={{ ...JK, fontSize: 9, fontWeight: 600, color: isLive ? "#CA8A04" : "#9CA3AF", whiteSpace: "nowrap" }}>[{d}]</span>
            ))}
          </div>
        )}
      </div>
    );
  }

  // All other engine types: use existing compact ScoreCell
  return <ScoreCell match={match} compact />;
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
    <Image
      src={inst.logo_url} alt={inst?.name ?? ""}
      width={size} height={size}
      style={{ objectFit: "contain", flexShrink: 0, filter: dimFilter, transition: "filter 0.2s" }}
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

function OpenParticipants({ match }: { match: MappedMatch }) {
  const entries = [...(match?.participants ?? [])]
    .sort((a: any, b: any) => (a?.position ?? Infinity) - (b?.position ?? Infinity))
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
            <Image
              key={i}
              src={p.institution.logo_url}
              alt={p.institution?.name ?? ""}
              width={32} height={32}
              style={{
                objectFit: "contain", borderRadius: "50%",
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

function HomeCell({ match, isLoser = false }: { match: MappedMatch; isLoser?: boolean }) {
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

function AwayCell({ match, isLoser = false }: { match: MappedMatch; isLoser?: boolean }) {
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

function StatusLabel({ match }: { match: MappedMatch }) {
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

function TimeVenueCell({ match, isLive }: { match: MappedMatch; isLive: boolean }) {
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

function MetaCell({ match }: { match: MappedMatch }) {
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

function DesktopMatchRow({ match }: { match: MappedMatch }) {
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

export function MobileMatchRow({ match }: { match: MappedMatch }) {
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

  // Shared label styles — same structure for both left (time/venue) and right (category/round)
  const metaTop: React.CSSProperties    = { ...JK, fontSize: 11, fontWeight: 700, color: isLive ? "#D97706" : "#555" };
  const metaBottom: React.CSSProperties = { ...JK, fontSize: 10, fontWeight: 500, color: "#aaa", marginTop: 1 };

  return (
    <div style={{
      background:   "#F8F9FB",
      borderRadius: 12,
      border:       "1px solid #ECEEF2",
      padding:      "10px 12px",
      display:      "flex",
      flexDirection:"column",
      gap:          8,
    }}>

      {/* ── Meta row: time/venue ←→ category/round ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        {/* Left: time stacked above venue */}
        <div>
          <div style={{ ...metaTop }} suppressHydrationWarning>{timeLabel}</div>
          {match.venue && (
            <div style={{ ...metaBottom, ...truncate, maxWidth: 140 }}>{match.venue}</div>
          )}
        </div>
        {/* Right: category stacked above round/status — mirrors left layout */}
        <div style={{ textAlign: "right" }}>
          <div style={{ ...JK, fontSize: 11, fontWeight: 700, color: "#555", ...truncate, maxWidth: 150 }}>
            {match.competition_category?.name ?? ""}
          </div>
          <div style={{ ...metaBottom, marginTop: 1 }}><StatusLabel match={match} /></div>
        </div>
      </div>

      {/* ── Participants (vertical) + Score (right column) ── */}
      {isOpen ? (
        // Open format: participant list left, score right
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}><OpenParticipants match={match} /></div>
          <div style={{ flexShrink: 0 }}><MobileScoreCell match={match} /></div>
        </div>
      ) : (
        // H2H / single participant: stacked rows left, score right
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

          {/* Left: home on top, away below */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>

            {/* Home row */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              {home ? <Logo inst={home.institution} size={26} isLoser={homeIsLoser} /> : <UndecidedLogo size={26} />}
              <div style={{ minWidth: 0 }}>
                <div style={{ ...JK, ...truncate, fontSize: 12, fontWeight: 700, color: home ? (homeIsLoser ? "#9CA3AF" : "#111") : "#D1D5DB", transition: "color 0.2s" }}>
                  {home?.name ?? "To Be Determined"}
                </div>
                <div style={{ ...JK, ...truncate, fontSize: 10, fontWeight: 500, color: homeIsLoser ? "#C4C8D4" : "#aaa", transition: "color 0.2s" }}>
                  {home ? (home.institution?.name ?? "") : "Undecided"}
                </div>
              </div>
            </div>

            {/* Away row — only for H2H */}
            {isH2H && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                {away ? <Logo inst={away.institution} size={26} isLoser={awayIsLoser} /> : <UndecidedLogo size={26} />}
                <div style={{ minWidth: 0 }}>
                  <div style={{ ...JK, ...truncate, fontSize: 12, fontWeight: 700, color: away ? (awayIsLoser ? "#9CA3AF" : "#111") : "#D1D5DB", transition: "color 0.2s" }}>
                    {away?.name ?? "To Be Determined"}
                  </div>
                  <div style={{ ...JK, ...truncate, fontSize: 10, fontWeight: 500, color: awayIsLoser ? "#C4C8D4" : "#aaa", transition: "color 0.2s" }}>
                    {away ? (away.institution?.name ?? "") : "Undecided"}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: score badge — centered vertically against both rows */}
          <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <MobileScoreCell match={match} />
          </div>

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

function FilterBar({ active, onChange, counts, isMobile = false }: {
  active:    FilterValue;
  onChange:  (v: FilterValue) => void;
  counts:    Record<FilterValue, number>;
  isMobile?: boolean;
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
              padding:    `0 0 0 ${isMobile ? 10 : 16}px`,
              fontSize:   isMobile ? 12 : 13,
              fontWeight: isActive ? 800 : 600,
              color:      isActive ? "#171717" : "#676767",
              cursor:     "pointer",
              display:    "flex",
              alignItems: "center",
              gap:        4,
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
                borderRadius: 12, padding: "1px 5px",
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

/** Mobile-only: single button showing active filter, taps open an overlay dropdown. */
function MobileFilterDropdown({ active, onChange, counts }: {
  active:   FilterValue;
  onChange: (v: FilterValue) => void;
  counts:   Record<FilterValue, number>;
}) {
  const [open, setOpen] = useState(false);
  const current = FILTERS.find(f => f.value === active)!;

  return (
    <div style={{ position: "relative" }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          ...JK, display: "flex", alignItems: "center", gap: 5,
          background: "#f0f0f0", border: "none", borderRadius: 8,
          padding: "5px 10px", fontSize: 12, fontWeight: 800, color: "#171717", cursor: "pointer",
        }}
      >
        {current.label}
        {counts[active] > 0 && (
          <span style={{ ...JK, fontSize: 10, fontWeight: 700, color: "#444", background: "#ddd", borderRadius: 10, padding: "1px 5px" }}>
            {counts[active]}
          </span>
        )}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}>
          <path d={open ? "M2 6.5L5 3.5L8 6.5" : "M2 3.5L5 6.5L8 3.5"} stroke="#555" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <>
          {/* Invisible backdrop to close on outside tap */}
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 10 }} />
          {/* Dropdown panel */}
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 20,
            background: "#fff", borderRadius: 10, border: "1px solid #ECEEF2",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: "4px 0", minWidth: 150,
          }}>
            {FILTERS.map(({ value, label }) => {
              const isActive = active === value;
              return (
                <button
                  key={value}
                  onClick={() => { onChange(value); setOpen(false); }}
                  style={{
                    ...JK, display: "flex", alignItems: "center", justifyContent: "space-between",
                    width: "100%", background: isActive ? "#f8f8f8" : "none", border: "none",
                    padding: "9px 14px", fontSize: 13, fontWeight: isActive ? 800 : 600,
                    color: isActive ? "#171717" : "#444", cursor: "pointer",
                  }}
                >
                  {label}
                  {counts[value] > 0 && (
                    <span style={{ ...JK, fontSize: 10, fontWeight: 700, color: isActive ? "#444" : "#bbb", background: isActive ? "#f0f0f0" : "#f5f5f5", borderRadius: 12, padding: "1px 6px" }}>
                      {counts[value]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── MatchesTab ────────────────────────────────────────────────────────────────

interface Props {
  event:    MappedEvent;
  isMobile: boolean;
  phase:    AnimPhase;

  lastUpdated?: Date | null;
  isPolling?:   boolean;
  wsStatus?:    "connected" | "reconnecting" | "polling";
}

export default function MatchesTab({ event, isMobile, phase, lastUpdated, isPolling, wsStatus }: Props) {
  const allMatches: MappedMatch[] = event.matches ?? [];
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ ...JK, fontSize: isMobile ? 15 : 17, fontWeight: 800, color: "#06125C" }}>
              Matches
            </span>
            {/* Status koneksi realtime */}
            {wsStatus === "connected" || wsStatus === "reconnecting" ? (
              <div style={{ display: "flex", alignItems: "center", gap: 5, ...JK, fontSize: 12, fontWeight: 600, color: "rgba(0,0,0,0.35)" }}>
                {wsStatus === "connected" ? "Real-time · WebSocket" : "Connecting WebSocket..."}
              </div>
            ) : lastUpdated ? (
              <div style={{ ...JK, fontSize: 12, fontWeight: 600, color: "rgba(0,0,0,0.35)" }}>
                Last updated {lastUpdated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
              </div>
            ) : null}
          </div>
          {isMobile
            ? <MobileFilterDropdown active={filter} onChange={setFilter} counts={counts} />
            : <FilterBar active={filter} onChange={setFilter} counts={counts} />
          }
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
                  {rows.map((match: MappedMatch) => {
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
        {/* spacer di bawah biar ga mepet */}
        <div style={{ height: 20 }} />
      </div>
    </div>
  );
}