"use client";
import { useMemo } from "react";

const JK = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

// format jam WIB dari ISO string
function fmtTime(iso) {
  if (!iso) return "?";
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

// ambil scoring engine (selalu index 0 di modules)
function getEngine(fmt) {
  return fmt?.modules?.[0] ?? null;
}

function calcAvg(scores = [], method = "avg") {
  if (!scores.length) return 0;
  if (method === "drop_extremes" && scores.length > 2) {
    const sorted = [...scores].sort((a, b) => a - b).slice(1, -1);
    return sorted.reduce((a, b) => a + b, 0) / sorted.length;
  }
  const sum = scores.reduce((a, b) => a + b, 0);
  return method === "sum" ? sum : sum / scores.length;
}

// grouping helpers
function groupByEvent(matches) {
  return matches.reduce((map, m) => {
    const key = m.event?.name ?? "Unknown Event";
    return map.set(key, [...(map.get(key) ?? []), m]);
  }, new Map());
}

function groupByCategory(matches) {
  return matches.reduce((map, m) => {
    const key = m.competition_category?.name ?? "Uncategorized";
    return map.set(key, [...(map.get(key) ?? []), m]);
  }, new Map());
}

function groupByDate(matches) {
  return matches.reduce((map, m) => {
    const key = m.scheduled_at ? fmtDate(m.scheduled_at) : "No Date";
    return map.set(key, [...(map.get(key) ?? []), m]);
  }, new Map());
}

// badge kuning "Live"
function LiveBadge() {
  return (
    <div style={{ ...JK, fontSize: 14, fontWeight: 800, color: "#000", background: "#FFC936", borderRadius: 7, padding: "5px 22px" }}>
      Live
    </div>
  );
}

function ScoreSetsLive({ live }) {
  const setsWon = live?.setsWon ?? [0, 0];
  const setLog  = live?.setLog  ?? [];

  const NumPill = ({ n }) => (
    <div style={{ ...JK, fontSize: 16, fontWeight: 900, color: "#000", background: "#FFC936", borderRadius: 7, minWidth: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 6px" }}>
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

function ScoreSetsFinished({ live }) {
  const setLog = live?.setLog ?? [];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      {setLog.map((s, i) => (
        <div key={i} style={{ background: "#f3f4f6", borderRadius: 6, padding: "3px 8px", textAlign: "center" }}>
          <div style={{ ...JK, fontSize: 10, fontWeight: 600, color: "#676767" }}>Sets {i + 1}</div>
          <div style={{ ...JK, fontSize: 12, fontWeight: 700, color: "#111" }}>
            <span style={{ textDecoration: s.home > s.away ? "underline" : "none" }}>{s.home}</span>
            {" - "}
            <span style={{ textDecoration: s.away > s.home ? "underline" : "none" }}>{s.away}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function JudgeScoreFinished({ live, engine }) {
  const scores = live?.judgeScores ?? [];
  const method = engine?.config?.method ?? "avg";
  const result = calcAvg(scores, method).toFixed(2).replace(".", ",");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ ...JK, fontSize: 14, fontWeight: 600, color: "#676767" }}>Avg:</span>
      <span style={{ ...JK, fontSize: 22, fontWeight: 800, color: "#111", background: "#f3f4f6", borderRadius: 8, padding: "2px 12px" }}>
        {result}
      </span>
    </div>
  );
}

function ManualPickFinished({ live }) {
  const winner = live?.winner;
  if (!winner) return null;
  return (
    <div style={{ ...JK, fontSize: 14, fontWeight: 700, color: "#111", background: "#f3f4f6", borderRadius: 7, padding: "6px 18px" }}>
      {winner} Wins
    </div>
  );
}

function Logo({ inst, size = 44 }) {
  if (!inst?.logo_url) {
    return <div style={{ width: size, height: size, borderRadius: "50%", background: inst?.color ?? "#334155", flexShrink: 0 }} />;
  }
  return <img src={inst.logo_url} alt={inst?.name ?? ""} style={{ width: size, height: size, objectFit: "contain", flexShrink: 0 }} />;
}

function ParticipantInfo({ inst, name, align = "left" }) {
  const truncate = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
  return (
    <div style={{ minWidth: 0, textAlign: align }}>
      <div style={{ ...JK, ...truncate, fontSize: 13, fontWeight: 500, color: "#676767", lineHeight: 1.2 }}>
        {inst?.name ?? ""}
      </div>
      <div style={{ ...JK, ...truncate, fontSize: 15, fontWeight: 700, color: "#000" }}>
        {name}
      </div>
    </div>
  );
}

const LOGO_OPACITIES = [1, 0.75, 0.5, 0.25];

// kolom kiri untuk open match: logo stack + nama 2 baris
function OpenParticipants({ match }) {
  // unwrap junction rows, urutkan by position
  const entries = [...(match?.participants ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((j) => j.participant_id);

  const shown    = entries.slice(0, 4);
  const allNames = entries.map((p) => p?.name).filter(Boolean);
  const line1    = allNames.slice(0, 3).join(", ");
  const line2    = allNames.slice(3);

  const truncate = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ display: "flex", paddingRight: 20 }}>
        {shown.map((p, i) =>
          p?.institution?.logo_url ? (
            <img
              key={i}
              src={p.institution.logo_url}
              alt={p.institution?.name ?? ""}
              style={{
                width: 44, height: 44,
                objectFit: "contain",
                borderRadius: "50%",
                border: "2px solid #fff",
                marginLeft: i > 0 ? -14 : 0,
                flexShrink: 0,
                zIndex: shown.length - i,
                opacity: LOGO_OPACITIES[i] ?? 0.25,
              }}
            />
          ) : (
            <div
              key={i}
              style={{
                width: 44, height: 44,
                borderRadius: "50%",
                background: p?.institution?.color ?? "#1D4ED8",
                border: "2px solid #fff",
                marginLeft: i > 0 ? -14 : 0,
                flexShrink: 0,
                zIndex: shown.length - i,
                opacity: LOGO_OPACITIES[i] ?? 0.25,
              }}
            />
          )
        )}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ ...JK, ...truncate, fontSize: 14, fontWeight: 500, color: "#000" }}>
          {line1}{line2.length > 0 ? "," : ""}
        </div>
        {line2.length > 0 && (
          <div style={{ ...JK, ...truncate, fontSize: 14, fontWeight: 500, color: "#000", marginTop: 1 }}>
            {line2.slice(0, 3).join(", ")}{line2.length > 3 ? ", ..." : ""}
          </div>
        )}
      </div>
    </div>
  );
}

function HomeCell({ participant, isOpen, match }) {
  if (isOpen) return <OpenParticipants match={match} />;
  if (!participant) return <div />;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <Logo inst={participant.institution} />
      <ParticipantInfo inst={participant.institution} name={participant.name} />
    </div>
  );
}

function AwayCell({ participant }) {
  if (!participant) return <div />;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "flex-end" }}>
      <ParticipantInfo inst={participant.institution} name={participant.name} align="right" />
      <Logo inst={participant.institution} />
    </div>
  );
}

// podium finish_time (finished): span kolom 2-4
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

function MiddleBadge({ matchType }) {
  return (
    <div style={{ ...JK, fontSize: 14, fontWeight: 700, color: "#676767", background: "#eeeeee", borderRadius: 7, padding: "6px 20px", whiteSpace: "nowrap" }}>
      {matchType === "head_to_head" ? "vs" : "---"}
    </div>
  );
}

// render konten kolom tengah sesuai engine + status
function ScoreCell({ match }) {
  const engine     = getEngine(match.format);
  const live       = match.live_state ?? {};
  const isLive     = match.status === "live";
  const isUpcoming = match.status === "upcoming";

  if (isUpcoming) return <MiddleBadge matchType={match.format?.match_type} />;

  switch (engine?.type) {
    case "score_timed": {
      const h = live.homeScore ?? 0;
      const a = live.awayScore ?? 0;
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ ...JK, fontSize: 26, fontWeight: 900, color: "#111" }}>{String(h).padStart(2, "0")}</span>
          <span style={{ ...JK, fontSize: 26, fontWeight: 900, color: "#111" }}>-</span>
          <span style={{ ...JK, fontSize: 26, fontWeight: 900, color: "#111" }}>{String(a).padStart(2, "0")}</span>
        </div>
      );
    }
    case "score_sets":
      return isLive ? <ScoreSetsLive live={live} /> : <ScoreSetsFinished live={live} />;
    case "judge_scores":
      return isLive ? <LiveBadge /> : <JudgeScoreFinished live={live} engine={engine} />;
    case "finish_time":
      return isLive ? <LiveBadge /> : null; // finished pakai PodiumRow
    case "manual_pick":
      return isLive ? <LiveBadge /> : <ManualPickFinished live={live} />;
    default:
      return null;
  }
}

const ROW_GRID = {
  display: "grid",
  gridTemplateColumns: "210px 1fr auto 1fr 210px",
  alignItems: "center",
  padding: "11px 0",
};

function MatchRow({ match }) {
  const engine     = getEngine(match.format);
  const live       = match.live_state ?? {};
  const isH2H      = match.format?.match_type === "head_to_head";
  const isOpen     = match.format?.match_type === "open";
  const isLive     = match.status === "live";
  const isFinished = match.status === "finished";

  const statusLabel = isLive ? "Ongoing" : isFinished ? "Finished" : "Upcoming";
  const timeLabel   = isLive ? "Live Match" : fmtTime(match.scheduled_at);

  // finish_time selesai: baris khusus dengan podium
  if (engine?.type === "finish_time" && isFinished) {
    return (
      <div style={ROW_GRID}>
        <div style={{ paddingRight: 16, minWidth: 0 }}>
          <div style={{ ...JK, fontSize: 15, fontWeight: 800, color: "#676767", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{timeLabel}</div>
          <div style={{ ...JK, fontSize: 13, color: "#676767", marginTop: 2 }}>{match.venue ?? ""}</div>
        </div>
        <div style={{ gridColumn: "2 / 5", paddingLeft: 24 }}>
          <PodiumRow live={live} />
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ ...JK, fontSize: 15, fontWeight: 700, color: "#676767" }}>{match.competition_category?.name ?? "?"}</div>
          <div style={{ ...JK, fontSize: 13, color: "#676767", marginTop: 2 }}>{statusLabel}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={ROW_GRID}>
      <div style={{ paddingRight: 16, minWidth: 0 }}>
        <div style={{ ...JK, fontSize: 15, fontWeight: 800, color: isLive ? "#CA8A04" : "#676767", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {timeLabel}
        </div>
        <div style={{ ...JK, fontSize: 13, color: "#676767", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {match.venue ?? ""}
        </div>
      </div>

      <div style={{ paddingLeft: 24, paddingRight: 24, minWidth: 0, overflow: "hidden" }}>
        <HomeCell participant={match.home_participant} isOpen={isOpen} match={match} />
      </div>

      <div style={{ display: "flex", justifyContent: "center", padding: "0 16px" }}>
        <ScoreCell match={match} />
      </div>

      <div style={{ paddingLeft: 24, paddingRight: 24, minWidth: 0, overflow: "hidden" }}>
        {isH2H ? <AwayCell participant={match.away_participant} /> : <div />}
      </div>

      <div style={{ paddingLeft: 16, textAlign: "right", minWidth: 0, overflow: "hidden" }}>
        <div style={{ ...JK, fontSize: 15, fontWeight: 700, color: "#676767", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {match.competition_category?.name ?? "?"}
        </div>
        <div style={{ ...JK, fontSize: 13, color: "#676767", marginTop: 2 }}>{statusLabel}</div>
      </div>
    </div>
  );
}

function GroupHeader({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 0 4px" }}>
      <span style={{ ...JK, fontSize: 13, fontWeight: 600, color: "#aaa", whiteSpace: "nowrap" }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: "#ebebeb" }} />
    </div>
  );
}

export function MatchTable({
  matches = [],
  groupBy = "event",
  showGroupFilter = false,
  onGroupByChange,
  title = "Upcoming Matches",
}) {
  const groups = useMemo(() => {
    if (groupBy === "category") return groupByCategory(matches);
    if (groupBy === "date")     return groupByDate(matches);
    return groupByEvent(matches);
  }, [matches, groupBy]);

  const firstDate = matches.find((m) => m.scheduled_at)?.scheduled_at;

  return (
    <div style={{ background: "#fff", borderRadius: 10, padding: "24px 32px", boxShadow: "0 8px 32px rgba(0,0,0,0.35)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ ...JK, fontSize: 18, fontWeight: 800, color: "#06125C" }}>{title}</span>
        {firstDate && <span style={{ ...JK, fontSize: 14, color: "#aaa" }}>{fmtDate(firstDate)}</span>}
      </div>

      {showGroupFilter && (
        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #f0f0f0" }}>
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

      {[...groups.entries()].map(([key, rows]) => (
        <div key={key}>
          <GroupHeader label={key} />
          {rows.map((match) => <MatchRow key={match.id} match={match} />)}
        </div>
      ))}
    </div>
  );
}

export default MatchTable;