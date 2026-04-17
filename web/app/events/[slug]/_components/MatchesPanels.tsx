"use client";
import { useMemo } from "react";
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

const LOGO_OPACITIES = [1, 0.75, 0.5, 0.25];

function Logo({ inst, size = 32 }: { inst: any; size?: number }) {
  if (!inst?.logo_url) {
    return <div style={{ width: size, height: size, borderRadius: "50%", background: inst?.color ?? "#334155", flexShrink: 0 }} />;
  }
  return <img src={inst.logo_url} alt={inst?.name ?? ""} style={{ width: size, height: size, objectFit: "contain", flexShrink: 0 }} />;
}

const truncate: React.CSSProperties = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };

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

// ─── Layout constants ──────────────────────────────────────────────────────────
//
// These represent the rendered pixel height of each repeating UI element.
// They feed into useSmartSlice so the row-count is calculated without
// ever measuring the panel itself (which would create a resize loop).
//
//  ROW_H  – CompactMatchRow: padding(10+10) + logo(32) = 52px
//  DATE_H – DateHeader: padding(14+4) + text(~14px) ≈ 32px
//
//  OVERHEAD – The fixed chrome inside each panel card:
//    vertical card padding : 16 + 16 = 32px
//    title row + margin    : ~18px text + 6px spacing = 24px
//    footer "+ N more"     : paddingTop(6) + text(~16px) = 22px
//    ─────────────────────────────────────────────────────
//    total                 : 78px
//
const ROW_H    = 52;
const DATE_H   = 32;
const OVERHEAD = 78; // panel chrome: padding + title + footer

// ─── Negotiated Greedy Growth — The Slicer ────────────────────────────────────
//
// Algorithm:
//   1. Take the left-column anchor height and subtract any fixed right-column
//      elements (countdown panel + inter-panel gaps) → effective pool.
//   2. Apply the weighted share (60 % upcoming / 40 % results, or 100 % if
//      only one panel is present).
//   3. Subtract panel chrome (OVERHEAD) to get rows-only budget.
//   4. Walk through matches, accumulating height. Stop at the first match
//      that doesn't fit.
//   5. Greedy Rule: if the leftover gap ≥ 50 % of ROW_H, absorb one extra row.
//      This intentionally pushes the right column past the anchor height;
//      CSS `align-items: stretch` then pulls AboutPanel flush.
//
function useSmartSlice(
  matches:        any[],
  anchorHeight:   number,
  isMobile:       boolean,
  priority:       boolean,
  budgetDeduction: number,  // countdown height + inter-panel gaps (px)
  hasCounterpart: boolean,  // false when only one matches panel exists
): number {
  return useMemo(() => {
    // Mobile: skip all logic and let panels render naturally
    if (isMobile || anchorHeight <= 0) return 3;

    // Step 1 & 2 – Weighted share of the deducted pool
    const share = hasCounterpart ? (priority ? 0.6 : 0.4) : 1.0;
    const pool  = (anchorHeight - budgetDeduction) * share - OVERHEAD;

    // Step 3 – Strict fit
    let used     = 0;
    let lastDate = "";
    let count    = 0;

    for (const m of matches) {
      const matchDate   = m.scheduled_at?.split("T")[0] ?? "No Date";
      const needsHeader = matchDate !== lastDate;
      const cost        = (needsHeader ? DATE_H : 0) + ROW_H;

      if (used + cost <= pool) {
        used    += cost;
        lastDate = matchDate;
        count++;
      } else {
        // Step 4 – Greedy Rule: absorb one extra row if gap ≥ 50 % of ROW_H
        if (pool - used >= ROW_H * 0.5) count++;
        break;
      }
    }

    return Math.max(1, count);
  }, [matches, anchorHeight, isMobile, priority, budgetDeduction, hasCounterpart]);
}

// ─── Panel card shell ──────────────────────────────────────────────────────────

const CARD: React.CSSProperties = {
  background:     "#fff",
  borderRadius:   12,
  padding:        "16px 20px",
  display:        "flex",
  flexDirection:  "column",
  flex:           1,
  minHeight:      0,
};

// ─── Panels ───────────────────────────────────────────────────────────────────

export interface MatchPanelProps {
  anchorHeight:    number;
  isMobile:        boolean;
  budgetDeduction: number;  // see OverviewTab for calculation
  hasCounterpart:  boolean;
}

export function UpcomingMatchesPanel({
  upcoming,
  anchorHeight,
  isMobile,
  budgetDeduction,
  hasCounterpart,
}: MatchPanelProps & { upcoming: any[] }) {
  const limit     = useSmartSlice(upcoming, anchorHeight, isMobile, true, budgetDeduction, hasCounterpart);
  const displayed = upcoming.slice(0, limit);
  const groups    = Array.from(groupByDate(displayed).entries());
  const remainder = upcoming.length - limit;

  if (!upcoming.length) return null;

  return (
    <div style={CARD}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <span style={{ ...JK, fontSize: 14, fontWeight: 800, color: "#06125C" }}>Upcoming Matches</span>
        <span style={{ ...JK, fontSize: 10, color: "#aaa" }}>{upcoming.length} total</span>
      </div>

      {/* Rows — no overflow, sliced to fit */}
      <div style={{ flex: 1 }}>
        {groups.map(([date, rows]) => (
          <div key={date}>
            <DateHeader label={date} />
            {rows.map((m: any) => <CompactMatchRow key={m.id} match={m} />)}
          </div>
        ))}
      </div>

      {/* Subtle footer — minimal height, only shown when rows are hidden */}
      {remainder > 0 && (
        <div style={{
          ...JK,
          fontSize:      10,
          fontWeight:    600,
          color:         "#c8c8c8",
          textAlign:     "center",
          paddingTop:    6,
          letterSpacing: "0.02em",
        }}>
          +{remainder} more match{remainder !== 1 ? "es" : ""}
        </div>
      )}
    </div>
  );
}

export function LatestResultsPanel({
  finished,
  anchorHeight,
  isMobile,
  budgetDeduction,
  hasCounterpart,
}: MatchPanelProps & { finished: any[] }) {
  const limit     = useSmartSlice(finished, anchorHeight, isMobile, false, budgetDeduction, hasCounterpart);
  const displayed = finished.slice(0, limit);
  const groups    = Array.from(groupByDate(displayed).entries());
  const remainder = finished.length - limit;

  if (!finished.length) return null;

  return (
    <div style={CARD}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <span style={{ ...JK, fontSize: 14, fontWeight: 800, color: "#06125C" }}>Latest Results</span>
        <span style={{ ...JK, fontSize: 10, color: "#aaa" }}>{finished.length} total</span>
      </div>

      {/* Rows — no overflow, sliced to fit */}
      <div style={{ flex: 1 }}>
        {groups.map(([date, rows]) => (
          <div key={date}>
            <DateHeader label={date} />
            {rows.map((m: any) => <CompactMatchRow key={m.id} match={m} />)}
          </div>
        ))}
      </div>

      {/* Subtle footer */}
      {remainder > 0 && (
        <div style={{
          ...JK,
          fontSize:      10,
          fontWeight:    600,
          color:         "#c8c8c8",
          textAlign:     "center",
          paddingTop:    6,
          letterSpacing: "0.02em",
        }}>
          +{remainder} more result{remainder !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}