"use client";

import Image from "next/image";
import { getEngine, calcAvg, fmtTime, resolveWinnerName } from "../match/scoreUtils";
import { MiddleBadge, ScoreCell, AnimatedScore, LIGHT_BADGE_COLORS, DARK_BADGE_COLORS } from "../match/ScoreBadges";
import type { BadgeColors } from "../match/ScoreBadges";
import type { MappedMatch } from "../../_types";

// --- Match Row Color Config ---------------------------------------------------

export type MatchColors = {
  cardBg:        string   // card background
  border:        string   // card border
  primaryText:   string   // names, time
  secondaryText: string   // category, venue, meta
  mutedText:     string   // institution name, timestamps
  dimmedText:    string   // loser text
}

export const LIGHT_MATCH_COLORS: MatchColors = {
  cardBg:        "#F8F9FB",
  border:        "#ECEEF2",
  primaryText:   "#111111",
  secondaryText: "#555555",
  mutedText:     "#aaaaaa",
  dimmedText:    "#C4C8D4",
}

export const DARK_MATCH_COLORS: MatchColors = {
  cardBg:        "#08103F",
  border:        "rgba(255,255,255,0.4)",
  primaryText:   "#ffffff",
  secondaryText: "rgba(255,255,255,0.7)",
  mutedText:     "rgba(255,255,255,0.55)",
  dimmedText:    "rgba(255,255,255,0.4)",
}

// --- MobileScoreCell ---------------------------------------------------------

const numPillCls = "font-jakarta text-sm font-black rounded-md min-w-[26px] h-[26px] flex items-center justify-center px-[5px]";

function MobileScoreCell({ match, C, badgeColors }: { match: MappedMatch; C: MatchColors; badgeColors: BadgeColors }) {
  const engine     = getEngine(match.competition_category?.format_id);
  const live       = match.live_state ?? {};
  const isLive     = match.status === "live";
  const isUpcoming = match.status === "upcoming";

  if (isUpcoming) return <MiddleBadge match={match} colors={badgeColors} />;

  if (engine?.type === "score_sets") {
    if (isLive) {
      const setScore  = live?.setScore ?? [0, 0];
      const setLog    = live?.setLog   ?? [];
      const detailArr = setLog.map((s: any) => `${s.home}-${s.away}`);
      return (
        <div className="flex flex-col items-end gap-[3px] max-w-[88px]">
          <div className="flex items-center gap-1">
            <span className={numPillCls} style={{ background: "#FFC936", color: "#111" }}>
              <AnimatedScore value={String(setScore[0])} />
            </span>
            <span className="font-jakarta text-xs font-extrabold text-yellow-600">vs</span>
            <span className={numPillCls} style={{ background: "#FFC936", color: "#111" }}>
              <AnimatedScore value={String(setScore[1])} />
            </span>
          </div>
          {detailArr.length > 0 && (
            <div className="flex flex-wrap justify-end gap-x-[3px] gap-y-px max-w-full">
              {detailArr.map((d: string, i: number) => (
                <span key={i} className="font-jakarta text-[9px] font-semibold text-yellow-600 whitespace-nowrap">[{d}]</span>
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
        <div className="flex flex-col items-end gap-[3px] max-w-[88px]">
          <div className="flex items-center gap-1">
            <span
              className={numPillCls}
              style={{ background: badgeColors.badgeBg, color: badgeColors.valueText }}
            >
              <AnimatedScore value={String(homeSets)} />
            </span>
            <span className="font-jakarta text-xs font-extrabold" style={{ color: badgeColors.mutedText }}>vs</span>
            <span
              className={numPillCls}
              style={{ background: badgeColors.badgeBg, color: badgeColors.valueText }}
            >
              <AnimatedScore value={String(awaySets)} />
            </span>
          </div>
          {detailArr.length > 0 && (
            <div className="flex flex-wrap justify-end gap-x-[3px] gap-y-px max-w-full">
              {detailArr.map((d: string, i: number) => (
                <span
                  key={i}
                  className="font-jakarta text-[9px] font-semibold whitespace-nowrap"
                  style={{ color: badgeColors.mutedText }}
                >[{d}]</span>
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
    const submitted          = scores.filter((s: any) => s !== undefined && s !== null);
    const hasAny             = submitted.length > 0;
    const avgResult          = hasAny
      ? calcAvg(submitted, method).toFixed(1).replace(".", ",")
      : "--,-";
    const detailArr          = judgeCount > 0
      ? Array.from({ length: judgeCount }, (_, i) => {
          const raw = scores[i];
          return (raw !== undefined && raw !== null) ? raw.toFixed(1).replace(".", ",") : "--,-";
        })
      : [];

    return (
      <div className="flex flex-col items-end gap-[3px] max-w-[88px]">
        <span
          className={`font-jakarta text-sm font-black rounded-md min-w-[26px] h-[26px] flex items-center justify-center px-[5px]`}
          style={{ background: isLive ? "#FFC936" : badgeColors.badgeBg, color: isLive ? "#111" : badgeColors.valueText }}
        >
          &nbsp;Avg:&nbsp;<AnimatedScore value={avgResult} />&nbsp;
        </span>
        {detailArr.length > 0 && (
          <div className="flex flex-wrap justify-end gap-x-[3px] gap-y-px max-w-full">
            {detailArr.map((d: string, i: number) => (
              <span
                key={i}
                className="font-jakarta text-[9px] font-semibold whitespace-nowrap"
                style={{ color: isLive ? "#CA8A04" : badgeColors.mutedText }}
              >[{d}]</span>
            ))}
          </div>
        )}
      </div>
    );
  }

  return <ScoreCell match={match} compact colors={badgeColors} />;
}

// --- Logo & Participants -----------------------------------------------------

function Logo({ inst, size = 32, isLoser = false }: { inst: any; size?: number; isLoser?: boolean }) {
  const dimFilter = isLoser ? "saturate(0) opacity(0.65)" : undefined;
  if (!inst?.logo_url) {
    return (
      <div
        className="rounded-full shrink-0 transition-[filter] duration-200"
        style={{ width: size, height: size, background: inst?.color ?? "#334155", filter: dimFilter }}
      />
    );
  }
  return (
    <Image
      src={inst.logo_url} alt={inst?.name ?? ""}
      width={size} height={size}
      className="shrink-0 transition-[filter] duration-200"
      style={{ objectFit: "contain", filter: dimFilter }}
    />
  );
}

function UndecidedLogo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 32 32"
      fill="none" xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <circle cx="16" cy="16" r="14.5" stroke="#D1D5DB" strokeWidth="1.5" strokeDasharray="3 2" />
      <text x="16" y="21" textAnchor="middle" fontSize="13" fontWeight="700"
        fontFamily="'Plus Jakarta Sans', sans-serif" fill="#D1D5DB">?</text>
    </svg>
  );
}

function UndecidedParticipant({ size = 32, align = "left", C }: { size?: number; align?: "left" | "right"; C: MatchColors }) {
  const textBlock = (
    <div className={`min-w-0 ${align === "right" ? "text-right" : ""}`}>
      <div className="font-jakarta text-[11px] font-semibold leading-[1.2]" style={{ color: C.mutedText }}>Undecided</div>
      <div className="font-jakarta text-[13px] font-bold mt-0.5"           style={{ color: C.mutedText }}>To Be Determined</div>
    </div>
  );
  return (
    <div className={`flex items-center gap-2 flex-1 min-w-0 ${align === "right" ? "justify-end" : "justify-start"}`}>
      {align === "right" && textBlock}
      <UndecidedLogo size={size} />
      {align === "left" && textBlock}
    </div>
  );
}

function ParticipantInfo({ inst, name, align = "left", dimmed = false, C }: {
  inst:    any;
  name:    string;
  align?:  "left" | "right";
  dimmed?: boolean;
  C:       MatchColors;
}) {
  return (
    <div className={`min-w-0 flex-1 text-${align}`}>
      <div
        className="font-jakarta line-clamp-2 text-[11px] font-semibold leading-[1.2] transition-colors duration-200"
        style={{
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
          color: dimmed ? C.dimmedText : C.mutedText,
        }}
      >
        {inst?.name ?? ""}
      </div>
      <div
        className="font-jakarta text-[13px] font-bold mt-0.5 transition-colors duration-200"
        style={{
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
          color: dimmed ? C.dimmedText : C.primaryText,
        }}
      >
        {name}
      </div>
    </div>
  );
}

function OpenParticipants({ match, C }: { match: MappedMatch; C: MatchColors }) {
  const entries = [...(match?.participants ?? [])]
    .sort((a: any, b: any) => (a?.position ?? Infinity) - (b?.position ?? Infinity))
    .map((j: any) => j.participant_id);

  const shown    = entries.slice(0, 4);
  const allNames = entries.map((p: any) => p?.name).filter(Boolean);
  const line1    = allNames.slice(0, 3).join(", ");
  const line2    = allNames.slice(3);

  if (entries.length === 0) {
    return <div className="font-jakarta text-xs font-semibold" style={{ color: C.mutedText }}>Waiting for participants...</div>;
  }

  return (
    <div className="flex items-center gap-2.5">
      <div className="flex pr-2">
        {shown.map((p: any, i: number) =>
          p?.institution?.logo_url ? (
            <Image
              key={i}
              src={p.institution.logo_url} alt={p.institution?.name ?? ""}
              width={32} height={32}
              className="rounded-full border-2 shrink-0"
              style={{ objectFit: "contain", width: 32, height: 32, borderColor: C.cardBg, background: C.cardBg, marginLeft: i > 0 ? -12 : 0, zIndex: shown.length - i }}
            />
          ) : (
            <div
              key={i}
              className="rounded-full border-2 shrink-0"
              style={{ width: 32, height: 32, background: (p as any)?.institution?.color ?? "#1D4ED8", borderColor: C.cardBg, marginLeft: i > 0 ? -12 : 0, zIndex: shown.length - i }}
            />
          )
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-jakarta truncate text-[13px] font-bold" style={{ color: C.primaryText }}>
          {line1}{line2.length > 0 ? "," : ""}
        </div>
        {line2.length > 0 && (
          <div className="font-jakarta truncate text-[11px] font-medium mt-0.5" style={{ color: C.mutedText }}>
            {line2.slice(0, 3).join(", ")}{line2.length > 3 ? ", ..." : ""}
          </div>
        )}
      </div>
    </div>
  );
}

function HomeCell({ match, isLoser = false, C }: { match: MappedMatch; isLoser?: boolean; C: MatchColors }) {
  const isOpen      = match.competition_category?.format_id?.match_type === "open";
  const participant = match.home_participant;
  if (isOpen) return <OpenParticipants match={match} C={C} />;
  if (!participant) return <UndecidedParticipant align="left" C={C} />;
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <Logo inst={participant.institution} isLoser={isLoser} />
      <ParticipantInfo inst={participant.institution} name={participant.name} dimmed={isLoser} C={C} />
    </div>
  );
}

function AwayCell({ match, isLoser = false, C }: { match: MappedMatch; isLoser?: boolean; C: MatchColors }) {
  const isH2H       = match.competition_category?.format_id?.match_type === "head_to_head";
  const participant = match.away_participant;
  if (!isH2H) return <div />;
  if (!participant) return <UndecidedParticipant align="right" C={C} />;
  return (
    <div className="flex items-center justify-end gap-2.5 min-w-0">
      <ParticipantInfo inst={participant.institution} name={participant.name} align="right" dimmed={isLoser} C={C} />
      <Logo inst={participant.institution} isLoser={isLoser} />
    </div>
  );
}

// --- Info Cells --------------------------------------------------------------

function PodiumRow({ live }: { live: any }) {
  const podium = (live?.timeLog ?? []).slice(0, 3);
  const labels = ["1st", "2nd", "3rd"];
  const pct    = `${(100 / podium.length).toFixed(4)}%`;
  return (
    <div className="flex items-center w-full">
      {podium.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 min-w-0 px-2 shrink-0" style={{ width: pct }}>
          <div className="font-jakarta text-xs font-extrabold text-[#676767] bg-gray-100 rounded-md px-[9px] py-[3px] shrink-0">
            {labels[i]}
          </div>
          <Logo inst={p.institution ?? null} size={26} />
          <div className="min-w-0">
            <div className="font-jakarta truncate text-[10px] font-semibold text-gray-400 leading-[1.1]">
              {p.institution?.name ?? ""}
            </div>
            <div className="font-jakarta truncate text-[13px] font-bold text-[#111]">
              {p.name}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusLabel({ match, C = LIGHT_MATCH_COLORS }: { match: MappedMatch; C?: MatchColors }) {
  const isLive     = match.status === "live";
  const isFinished = match.status === "finished";
  const round      = (match.round as string | null | undefined)?.trim();

  if (round) {
    return (
      <span className="font-jakarta text-[11px] font-bold" style={{ color: isLive ? "rgb(217,119,6)" : C.mutedText }}>
        {round}
      </span>
    );
  }

  if (isLive)     return <span className="font-jakarta text-[11px] font-extrabold" style={{ color: "rgb(217,119,6)" }}>Ongoing</span>;
  if (isFinished) {
    const winner = resolveWinnerName(match);
    return <span className="font-jakarta text-[11px] font-bold" style={{ color: C.mutedText }}>{winner ? `${winner} Win` : "Finished"}</span>;
  }
  return <span className="font-jakarta text-[11px] font-semibold" style={{ color: C.mutedText }}>Upcoming</span>;
}

function TimeVenueCell({ match, isLive, C = LIGHT_MATCH_COLORS }: { match: MappedMatch; isLive: boolean; C?: MatchColors }) {
  const timeLabel = isLive ? "Live" : fmtTime(match.scheduled_at);
  return (
    <div className="min-w-0">
      <div
        className="font-jakarta text-[15px] font-extrabold"
        style={{ color: isLive ? "rgb(217,119,6)" : C.secondaryText }}
        suppressHydrationWarning
      >
        {timeLabel}
      </div>
      {match.venue && (
        <div
          className="font-jakarta text-[11px] font-medium mt-0.5"
          style={{
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
            color: C.mutedText,
          }}
        >
          {match.venue}
        </div>
      )}
    </div>
  );
}

function MetaCell({ match, C = LIGHT_MATCH_COLORS }: { match: MappedMatch; C?: MatchColors }) {
  return (
    <div className="text-right min-w-0">
      <div
        className="font-jakarta text-[13px] font-extrabold"
        style={{
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
          color: C.primaryText,
        }}
      >
        {match.competition_category?.name ?? ""}
      </div>
      <div className="mt-[3px]">
        <StatusLabel match={match} C={C} />
      </div>
    </div>
  );
}

// --- DesktopMatchRow ---------------------------------------------------------
// Grid: [160px] [1fr] [auto] [1fr] [160px]
// gada versi darknya

export function DesktopMatchRow({ match }: { match: MappedMatch }) {
  const engine     = getEngine(match.competition_category?.format_id);
  const live       = match.live_state ?? {};
  const isLive     = match.status === "live";
  const isFinished = match.status === "finished";
  const isH2H      = match.competition_category?.format_id?.match_type === "head_to_head";

  const winnerId    = match.winner ?? live.winner;
  const homeIsLoser = isFinished && isH2H && !!winnerId && match.home_participant?.id !== winnerId;
  const awayIsLoser = isFinished && isH2H && !!winnerId && match.away_participant?.id !== winnerId;

  if (engine?.type === "finish_time" && isFinished) {
    return (
      <div
        className="grid items-center py-[7px]"
        style={{ gridTemplateColumns: "160px 1fr auto 1fr 160px", gap: "0 40px" }}
      >
        <TimeVenueCell match={match} isLive={isLive} />
        <div style={{ gridColumn: "2 / 5" }}>
          <PodiumRow live={live} />
        </div>
        <MetaCell match={match} />
      </div>
    );
  }

  return (
    <div
      className="grid items-center py-[7px]"
      style={{ gridTemplateColumns: "160px 1fr auto 1fr 160px", gap: "0 40px" }}
    >
      <TimeVenueCell match={match} isLive={isLive} />
      <div className="min-w-0 overflow-hidden">
        <HomeCell match={match} isLoser={homeIsLoser} C={LIGHT_MATCH_COLORS} />
      </div>
      <div className="flex justify-center">
        <ScoreCell match={match} />
      </div>
      <div className="min-w-0 overflow-hidden">
        <AwayCell match={match} isLoser={awayIsLoser} C={LIGHT_MATCH_COLORS} />
      </div>
      <MetaCell match={match} />
    </div>
  );
}

// --- MobileMatchRow ----------------------------------------------------------

function MobileParticipantRow({ participant, isLoser, C }: { participant: any; isLoser: boolean; C: MatchColors }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      {participant
        ? <Logo inst={participant.institution} size={26} isLoser={isLoser} />
        : <UndecidedLogo size={26} />
      }
      <div className="min-w-0">
        <div
          className="font-jakarta text-xs font-bold transition-colors duration-200"
          style={{
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
            color: participant ? (isLoser ? C.dimmedText : C.primaryText) : C.mutedText,
          }}
        >
          {participant?.name ?? "To Be Determined"}
        </div>
        <div
          className="font-jakarta text-[10px] font-medium transition-colors duration-200"
          style={{
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
            color: isLoser ? C.dimmedText : C.mutedText,
          }}
        >
          {participant ? (participant.institution?.name ?? "") : "Undecided"}
        </div>
      </div>
    </div>
  );
}

export function MobileMatchRow({ match, dark = false }: { match: MappedMatch; dark?: boolean }) {
  const C           = dark ? DARK_MATCH_COLORS : LIGHT_MATCH_COLORS;
  const badgeColors = dark ? DARK_BADGE_COLORS : LIGHT_BADGE_COLORS;

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
  const timeLabel   = isLive ? "Live" : fmtTime(match.scheduled_at);

  return (
    <div
      className="rounded-xl px-3 py-[10px] flex flex-col gap-2"
      style={{ background: C.cardBg, border: `1px solid ${C.border}` }}
    >
      {/* Meta row */}
      <div className="flex justify-between items-start">
        <div>
          <div
            className="font-jakarta text-[11px] font-bold"
            style={{ color: isLive ? "rgb(217,119,6)" : C.secondaryText }}
            suppressHydrationWarning
          >
            {timeLabel}
          </div>
          {match.venue && (
            <div
              className="font-jakarta text-[10px] font-medium mt-px max-w-[140px]"
              style={{
                display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                color: C.mutedText,
              }}
            >
              {match.venue}
            </div>
          )}
        </div>
        <div className="text-right">
          <div
            className="font-jakarta text-[11px] font-bold max-w-[150px]"
            style={{
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
              color: C.secondaryText,
            }}
          >
            {match.competition_category?.name ?? ""}
          </div>
          <div className="mt-px">
            <StatusLabel match={match} C={C} />
          </div>
        </div>
      </div>

      {/* Participants + score */}
      {isOpen ? (
        <div className="flex items-center gap-2.5">
          <div className="flex-1 min-w-0"><OpenParticipants match={match} C={C} /></div>
          <div className="shrink-0"><MobileScoreCell match={match} C={C} badgeColors={badgeColors} /></div>
        </div>
      ) : (
        <div className="flex items-center gap-2.5">
          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
            <MobileParticipantRow participant={home} isLoser={homeIsLoser} C={C} />
            {isH2H && <MobileParticipantRow participant={away} isLoser={awayIsLoser} C={C} />}
          </div>
          <div className="shrink-0 flex items-center justify-center">
            <MobileScoreCell match={match} C={C} badgeColors={badgeColors} />
          </div>
        </div>
      )}
    </div>
  );
}