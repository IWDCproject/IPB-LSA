"use client";
import { useMemo, useState } from "react";

const JK = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta",
  });
}

function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function getEngine(fmt) { return fmt?.modules?.[0] ?? null; }

function calcAvg(scores = [], method = "avg") {
  if (!scores.length) return 0;
  if (method === "drop_extremes" && scores.length > 2) {
    const s = [...scores].sort((a, b) => a - b).slice(1, -1);
    return s.reduce((a, b) => a + b, 0) / s.length;
  }
  const sum = scores.reduce((a, b) => a + b, 0);
  return method === "sum" ? sum : sum / scores.length;
}

function groupByEvent(matches) {
  const g = new Map();
  for (const m of matches) {
    const k = m.event?.name ?? "Unknown Event";
    if (!g.has(k)) g.set(k, []);
    g.get(k).push(m);
  }
  return g;
}

function groupByCategory(matches) {
  const g = new Map();
  for (const m of matches) {
    const k = m.competition_category?.name ?? "Uncategorized";
    if (!g.has(k)) g.set(k, []);
    g.get(k).push(m);
  }
  return g;
}

function groupByDate(matches) {
  const g = new Map();
  for (const m of matches) {
    const k = m.scheduled_at ? fmtDate(m.scheduled_at) : "No Date";
    if (!g.has(k)) g.set(k, []);
    g.get(k).push(m);
  }
  return g;
}

// sub-group within a group by engine + match_type (raw figma style)
function subGroup(matches) {
  const g = new Map();
  for (const m of matches) {
    const engine = getEngine(m.format)?.type ?? "—";
    const mt     = m.format?.match_type ?? "—";
    const k      = `${engine} + ${mt}`;
    if (!g.has(k)) g.set(k, []);
    g.get(k).push(m);
  }
  return g;
}

// ─── Score / center cell renderers ───────────────────────────────────────────

// yellow "Live" badge
function LiveBadge() {
  return (
    <div style={{ ...JK, fontSize: 14, fontWeight: 800, color: "#000", background: "#EAB308", borderRadius: 99, padding: "5px 22px" }}>
      Live
    </div>
  );
}

// score_sets live: [setsWon[0]] set1pill set2pill [setsWon[1]]
function ScoreSetsLive({ live }) {
  const setsWon = live?.setsWon ?? [0, 0];
  const setLog  = live?.setLog  ?? [];
  const NumPill = ({ n }) => (
    <div style={{ ...JK, fontSize: 16, fontWeight: 900, color: "#000", background: "#EAB308", borderRadius: 99, minWidth: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 6px" }}>
      {String(n).padStart(2, "0")}
    </div>
  );
  const SetPill = ({ s, i }) => (
    <div style={{ background: "#f3f4f6", borderRadius: 6, padding: "3px 8px", textAlign: "center" }}>
      <div style={{ ...JK, fontSize: 10, fontWeight: 600, color: "#aaa" }}>Set {i + 1}</div>
      <div style={{ ...JK, fontSize: 12, fontWeight: 700, color: "#111" }}>{s.home} - {s.away}</div>
    </div>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <NumPill n={setsWon[0]} />
      {setLog.map((s, i) => <SetPill key={i} s={s} i={i} />)}
      <NumPill n={setsWon[1]} />
    </div>
  );
}

// score_sets finished: Sets 1: 21-17  Sets 2: 13-21  Sets 3: 24-22
function ScoreSetsFinished({ live }) {
  const setLog = live?.setLog ?? [];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      {setLog.map((s, i) => (
        <div key={i} style={{ background: "#f3f4f6", borderRadius: 6, padding: "3px 8px", textAlign: "center" }}>
          <div style={{ ...JK, fontSize: 10, fontWeight: 600, color: "#aaa" }}>Sets {i + 1}</div>
          <div style={{ ...JK, fontSize: 12, fontWeight: 700, color: "#111", textDecoration: s.home > s.away ? "underline" : "none" }}>
            {s.home} - {s.away}
          </div>
        </div>
      ))}
    </div>
  );
}

// judge_scores finished: Avg: 20,67
function JudgeScoreFinished({ live, engine }) {
  const scores = live?.judgeScores ?? [];
  const method = engine?.config?.method ?? "avg";
  const result = calcAvg(scores, method).toFixed(2).replace(".", ",");
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
      <span style={{ ...JK, fontSize: 14, fontWeight: 600, color: "#676767" }}>Avg:</span>
      <span style={{ ...JK, fontSize: 22, fontWeight: 800, color: "#111", background: "#f3f4f6", borderRadius: 8, padding: "2px 12px" }}>
        {result}
      </span>
    </div>
  );
}

// manual_pick finished: "IPB University Wins" pill
function ManualPickFinished({ live }) {
  const winner = live?.winner;
  if (!winner) return null;
  return (
    <div style={{ ...JK, fontSize: 14, fontWeight: 700, color: "#111", background: "#f3f4f6", borderRadius: 99, padding: "6px 18px" }}>
      {winner} Wins
    </div>
  );
}

// ─── Participant cells ────────────────────────────────────────────────────────

function Logo({ inst, size = 44 }) {
  if (!inst?.logo_url) return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: inst?.color ?? "#334155", flexShrink: 0 }} />
  );
  return (
    <img src={inst.logo_url} alt={inst?.name ?? ""} style={{ width: size, height: size, objectFit: "contain", flexShrink: 0 }} />
  );
}

function ParticipantInfo({ inst, name, align = "left" }) {
  return (
    <div style={{ minWidth: 0, textAlign: align }}>
      <div style={{ ...JK, fontSize: 13, fontWeight: 500, color: "#676767", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {inst?.name ?? ""}
      </div>
      <div style={{ ...JK, fontSize: 15, fontWeight: 700, color: "#000000", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {name}
      </div>
    </div>
  );
}

// home cell — logo left, text right
function HomeCell({ participant, isOpen, match }) {
  if (isOpen) {
    const ids      = match?.participant_ids ?? [];
    const timeLog  = match?.live_state?.timeLog ?? [];
    // use timeLog entries if available (finished), else fall back to participant_ids strings
    const entries  = timeLog.length > 0 ? timeLog : ids.map(id => ({ name: id }));
    const shown    = entries.slice(0, 4);
    const rest     = entries.length - shown.length;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ display: "flex" }}>
          {shown.map((entry, i) => (
            entry.institution?.logo_url
              ? <img key={i} src={entry.institution.logo_url} alt="" style={{ width: 44, height: 44, objectFit: "contain", borderRadius: "50%", border: "2px solid #fff", marginLeft: i > 0 ? -14 : 0, flexShrink: 0, zIndex: shown.length - i }} />
              : <div key={i} style={{ width: 44, height: 44, borderRadius: "50%", background: entry.institution?.color ?? "#1D4ED8", border: "2px solid #fff", marginLeft: i > 0 ? -14 : 0, flexShrink: 0, zIndex: shown.length - i }} />
          ))}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ ...JK, fontSize: 14, fontWeight: 500, color: "#000", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {shown.slice(0, 3).map(e => e.name).join(", ")}{rest > 0 ? `, ...` : ""}
          </div>
        </div>
      </div>
    );
  }
  if (!participant) return <div />;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <Logo inst={participant.institution} />
      <ParticipantInfo inst={participant.institution} name={participant.name} />
    </div>
  );
}

// away cell — text left, logo right
function AwayCell({ participant }) {
  if (!participant) return <div />;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "flex-end" }}>
      <ParticipantInfo inst={participant.institution} name={participant.name} align="right" />
      <Logo inst={participant.institution} />
    </div>
  );
}

// finish_time finished — podium spanning cols 2–4
// institution comes from timeLog[i].institution — populated via participants relation in Directus query
function PodiumRow({ live }) {
  const podium = (live?.timeLog ?? []).slice(0, 3);
  const labels = ["1st", "2nd", "3rd"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
      {podium.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ ...JK, fontSize: 12, fontWeight: 800, color: "#fff", background: "#111", borderRadius: 6, padding: "3px 7px", flexShrink: 0 }}>
            {labels[i]}
          </div>
          <Logo inst={p.institution ?? null} size={40} />
          <div>
            <div style={{ ...JK, fontSize: 13, fontWeight: 500, color: "#676767", lineHeight: 1.1 }}>{p.institution?.name ?? ""}</div>
            <div style={{ ...JK, fontSize: 14, fontWeight: 700, color: "#000" }}>{p.name}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Middle badge for upcoming ────────────────────────────────────────────────

function MiddleBadge({ matchType }) {
  const label = matchType === "head_to_head" ? "vs" : "---";
  return (
    <div style={{ ...JK, fontSize: 14, fontWeight: 700, color: "#676767", background: "#eeeeee", borderRadius: 99, padding: "6px 20px", whiteSpace: "nowrap" }}>
      {label}
    </div>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function MatchRow({ match, isLast }) {
  const engine  = getEngine(match.format);
  const live    = match.live_state ?? {};
  const status  = match.status;
  const isH2H   = match.format?.match_type === "head_to_head";
  const isOpen  = match.format?.match_type === "open";
  const isLive  = status === "live";
  const isUpcoming   = status === "upcoming";
  const isFinished   = status === "finished";

  const statusLabel = isLive ? "Ongoing" : isFinished ? "Finished" : "Upcoming";
  const timeLabel   = isLive ? "Live Match" : fmtTime(match.scheduled_at);

  // finish_time finished — podium spans col 2–4 (home + score + away)
  const isPodiumRow = engine?.type === "finish_time" && isFinished;

  const rowStyle = {
    display: "grid",
    gridTemplateColumns: "160px 1fr auto 1fr 200px",
    alignItems: "center",
    gap: 0,
    padding: "18px 0",
    borderBottom: isLast ? "none" : "1px solid #f0f0f0",
  };

  // center score content for non-podium rows
  const renderCenter = () => {
    if (isUpcoming) return <MiddleBadge matchType={match.format?.match_type} />;

    switch (engine?.type) {
      case "score_timed": {
        if (isLive) {
          const h = live.homeScore ?? 0, a = live.awayScore ?? 0;
          return (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ ...JK, fontSize: 26, fontWeight: 900, color: "#111" }}>{String(h).padStart(2, "0")}</span>
              <span style={{ ...JK, fontSize: 16, color: "#ccc" }}>–</span>
              <span style={{ ...JK, fontSize: 26, fontWeight: 900, color: "#111" }}>{String(a).padStart(2, "0")}</span>
            </div>
          );
        }
        // finished score_timed
        const h = live.homeScore ?? 0, a = live.awayScore ?? 0;
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ ...JK, fontSize: 26, fontWeight: 900, color: "#111" }}>{String(h).padStart(2, "0")}</span>
            <span style={{ ...JK, fontSize: 16, color: "#ccc" }}>–</span>
            <span style={{ ...JK, fontSize: 26, fontWeight: 900, color: "#111" }}>{String(a).padStart(2, "0")}</span>
          </div>
        );
      }
      case "score_sets":
        return isLive
          ? <ScoreSetsLive live={live} />
          : <ScoreSetsFinished live={live} />;
      case "judge_scores":
        return isLive
          ? <LiveBadge />
          : <JudgeScoreFinished live={live} engine={engine} />;
      case "finish_time":
        return isLive ? <LiveBadge /> : null; // finished handled by podium
      case "manual_pick":
        return isLive
          ? <LiveBadge />
          : <ManualPickFinished live={live} />;
      default:
        return null;
    }
  };

  if (isPodiumRow) {
    return (
      <div style={rowStyle}>
        {/* col 1: time + venue */}
        <div style={{ paddingRight: 16, minWidth: 0 }}>
          <div style={{ ...JK, fontSize: 15, fontWeight: 800, color: "#676767", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{timeLabel}</div>
          <div style={{ ...JK, fontSize: 13, color: "#676767", marginTop: 2 }}>{match.venue ?? ""}</div>
        </div>
        <div style={{ gridColumn: "2 / 5", paddingLeft: 24 }}>
          <PodiumRow live={live} />
        </div>
        {/* col 5: category + status */}
        <div style={{ textAlign: "right" }}>
          <div style={{ ...JK, fontSize: 15, fontWeight: 700, color: "#676767" }}>{match.competition_category?.name ?? "—"}</div>
          <div style={{ ...JK, fontSize: 13, color: "#676767", marginTop: 2 }}>{statusLabel}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={rowStyle}>
      {/* col 1: time + venue */}
      <div style={{ paddingRight: 16, minWidth: 0 }}>
        <div style={{ ...JK, fontSize: 15, fontWeight: 800, color: isLive ? "#CA8A04" : "#676767", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{timeLabel}</div>
        <div style={{ ...JK, fontSize: 13, color: "#676767", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{match.venue ?? ""}</div>
      </div>

      {/* col 2: home */}
      <div style={{ paddingLeft: 24, paddingRight: 24, minWidth: 0, overflow: "hidden" }}>
        <HomeCell participant={match.home_participant} isOpen={isOpen} match={match} />
      </div>

      {/* col 3: score / badge */}
      <div style={{ display: "flex", justifyContent: "center", padding: "0 16px" }}>
        {renderCenter()}
      </div>

      {/* col 4: away — empty for solo / open */}
      <div style={{ paddingLeft: 24, paddingRight: 24, minWidth: 0, overflow: "hidden" }}>
        {isH2H ? <AwayCell participant={match.away_participant} /> : <div />}
      </div>

      {/* col 5: category + status */}
      <div style={{ paddingLeft: 16, textAlign: "right", minWidth: 0, overflow: "hidden" }}>
        <div style={{ ...JK, fontSize: 15, fontWeight: 700, color: "#676767", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{match.competition_category?.name ?? "—"}</div>
        <div style={{ ...JK, fontSize: 13, color: "#676767", marginTop: 2 }}>{statusLabel}</div>
      </div>
    </div>
  );
}

// ─── Group header ─────────────────────────────────────────────────────────────

function GroupHeader({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 0 4px" }}>
      <span style={{ ...JK, fontSize: 13, fontWeight: 600, color: "#aaa", whiteSpace: "nowrap" }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: "#ebebeb" }} />
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function MatchTable({
  matches = [],
  groupBy = "event",
  showGroupFilter = false,
  onGroupByChange,
  title = "Upcoming Matches",
}) {
  const groups = useMemo(() => {
    switch (groupBy) {
      case "category": return groupByCategory(matches);
      case "date":     return groupByDate(matches);
      default:         return groupByEvent(matches);
    }
  }, [matches, groupBy]);

  const firstDate = matches.find(m => m.scheduled_at)?.scheduled_at;

  return (
    <div style={{ background: "#fff", borderRadius: 16, padding: "24px 32px" }}>

      {/* title row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ ...JK, fontSize: 18, fontWeight: 800, color: "#06125C" }}>{title}</span>
        {firstDate && (
          <span style={{ ...JK, fontSize: 14, color: "#aaa" }}>{fmtDate(firstDate)}</span>
        )}
      </div>

      {/* filter tabs — EventDetails only */}
      {showGroupFilter && (
        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #f0f0f0", marginBottom: 0 }}>
          {["event", "category", "date"].map((opt) => (
            <button key={opt} onClick={() => onGroupByChange?.(opt)} style={{
              ...JK, background: "none", border: "none", cursor: "pointer",
              padding: "10px 14px", fontSize: 13,
              fontWeight: groupBy === opt ? 700 : 500,
              color: groupBy === opt ? "#111" : "#999",
              borderBottom: groupBy === opt ? "2px solid #111" : "2px solid transparent",
              marginBottom: -1,
            }}>
              {opt === "event" ? "By Event" : opt === "category" ? "By Category" : "By Date"}
            </button>
          ))}
        </div>
      )}

      {/* groups */}
      {[...groups.entries()].map(([groupKey, groupRows]) => (
        <div key={groupKey}>
          {/* single header: event name text + horizontal line */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 0 4px" }}>
            <span style={{ ...JK, fontSize: 13, fontWeight: 600, color: "#aaa", whiteSpace: "nowrap" }}>{groupKey}</span>
            <div style={{ flex: 1, height: 1, background: "#ebebeb" }} />
          </div>
          {groupRows.map((match, i) => (
            <MatchRow key={match.id} match={match} isLast={i === groupRows.length - 1} />
          ))}
        </div>
      ))}
    </div>
  );
}

export default MatchTable;