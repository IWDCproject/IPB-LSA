"use client";
import { useMemo } from "react";
// Adjust this import path to wherever MatchRow lives in your project.
// Since MatchRow is likely co-located with MatchTable, "./MatchRow" should work.
import { DesktopMatchRow, MobileMatchRow } from "../../events/[slug]/_components/match/MatchRow";

const JK = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
}

// --- Grouping helpers ----------------------------------------------------------

function groupByEvent(matches) {
  return matches.reduce((map, m) => {
    const key = m.competition_category?.event_id?.name ?? "Unknown Event";
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
    const key = m.scheduled_at
      ? new Date(m.scheduled_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
      : "No Date";
    return map.set(key, [...(map.get(key) ?? []), m]);
  }, new Map());
}

// --- Shared --------------------------------------------------------------------

function GroupHeader({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 0 4px" }}>
      <span style={{ ...JK, fontSize: 13, fontWeight: 600, color: "#aaa", whiteSpace: "nowrap" }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: "#ebebeb" }} />
    </div>
  );
}

// --- MatchTable ----------------------------------------------------------------

export function MatchTable({
  matches = [],
  groupBy = "event",
  showGroupFilter = false,
  onGroupByChange,
  title = "Upcoming Matches",
  isMobile = false,
}) {
  const groups = useMemo(() => {
    if (groupBy === "category") return groupByCategory(matches);
    if (groupBy === "date")     return groupByDate(matches);
    return groupByEvent(matches);
  }, [matches, groupBy]);

  const firstDate = matches.find((m) => m.scheduled_at)?.scheduled_at;

  return (
    <div style={{ background: "#fff", borderRadius: 10, padding: isMobile ? "16px 16px" : "24px 32px", boxShadow: "0 8px 32px rgba(0,0,0,0.35)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ ...JK, fontSize: isMobile ? 15 : 18, fontWeight: 800, color: "#06125C" }}>{title}</span>
        {firstDate && (
          <span suppressHydrationWarning style={{ ...JK, fontSize: isMobile ? 11 : 14, color: "#aaa" }}>
            {fmtDate(firstDate)}
          </span>
        )}
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
          {rows.map((match) =>
            isMobile
              ? <MobileMatchRow key={match.id} match={match} />
              : <DesktopMatchRow key={match.id} match={match} />
          )}
        </div>
      ))}
    </div>
  );
}

export default MatchTable;