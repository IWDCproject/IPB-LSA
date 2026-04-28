"use client";
import React from "react";
import Image from "next/image";
import { PanelTitle, EmptyState } from "./Panel";
import { JK } from "../shared/tokens";
import {
  getEngine, fmtDateShort as fmtDate, fmtTime, groupByDateShort as groupByDate,
  resolveWinnerName,
} from "../match/scoreUtils";
import { MiddleBadge, ScoreCell, AnimatedScore } from "../match/ScoreBadges";
import type { MappedMatch } from "../../_types";
import { MobileMatchRow } from "../match/MatchRow";

// ─── Participant cells ─────────────────────────────────────────────────────────

function Logo({ inst, size = 32, isLoser = false }: { inst: any; size?: number; isLoser?: boolean }) {
  const dimFilter = isLoser ? "saturate(0) opacity(0.65)" : undefined;
  if (!inst?.logo_url) {
    return <div style={{ width: size, height: size, borderRadius: "50%", background: inst?.color ?? "#334155", flexShrink: 0, filter: dimFilter, transition: "filter 0.2s" }} />;
  }
  return <Image src={inst.logo_url} alt={inst?.name ?? ""} width={size} height={size} style={{ objectFit: "contain", flexShrink: 0, filter: dimFilter, transition: "filter 0.2s" }} />;
}


const truncate: React.CSSProperties = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };

// webkit-box truncate — used by mobile rows (allows 2-line clamp)
const truncateMobile: React.CSSProperties = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

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

function OpenParticipants({ match }: { match: MappedMatch }) {
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
            <Image
              key={i}
              src={p.institution.logo_url}
              alt={p.institution?.name ?? ""}
              width={32}
              height={32}
              style={{
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

function HomeCell({ match }: { match: MappedMatch }) {
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

function AwayCell({ match }: { match: MappedMatch }) {
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

function CompactMatchRow({ match }: { match: MappedMatch }) {
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
}: MatchPanelProps & { upcoming: MappedMatch[] }) {
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
            {rows.map((m: MappedMatch, ri: number) => (
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
}: MatchPanelProps & { finished: MappedMatch[] }) {
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
            {rows.map((m: MappedMatch, ri: number) => (
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