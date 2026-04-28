"use client";

import { useMemo, useState } from "react";
import { staggerSlideUp, TAB_ENTER } from "../shared/Animations";
import type { AnimPhase } from "../shared/UseTabTransition";
import type { MappedEvent, MappedMatch } from "../../_types";
import { JK } from "../shared/tokens";
import { groupByDateLong as groupByDate } from "../match/scoreUtils";
import { DesktopMatchRow, MobileMatchRow } from "../match/MatchRow";

// Animasi masuk untuk setiap baris pertandingan.
const ROW_KEYFRAMES = `
  @keyframes match-row-in {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0);   }
  }
`;

// Urutkan dari terbaru: tanggal mendatang di atas, yang sudah lewat di bawah.
function sortNewestFirst(matches: MappedMatch[]): MappedMatch[] {
  return [...matches].sort((a, b) => {
    const ta = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0;
    const tb = b.scheduled_at ? new Date(b.scheduled_at).getTime() : 0;
    return tb - ta;
  });
}

// Kelompokkan pertandingan berdasarkan nama kategori kompetisi.
function groupByCategory(matches: MappedMatch[]): Map<string, MappedMatch[]> {
  const map = new Map<string, MappedMatch[]>();
  for (const m of matches) {
    const key = m.competition_category?.name ?? "Uncategorized";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }
  return map;
}

// Header pemisah antar grup tanggal atau kategori.
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

// Tampilan kosong kalau belum ada pertandingan terjadwal.
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

// Tipe dan pilihan grouping.
type GroupValue = "schedule" | "category";

const GROUP_OPTIONS: { value: GroupValue; label: string }[] = [
  { value: "schedule", label: "Schedule" },
  { value: "category", label: "Category" },
];

// Toggle grouping (Schedule / Category) versi desktop.
function GroupToggle({ active, onChange, groupCounts }: {
  active:      GroupValue;
  onChange:    (v: GroupValue) => void;
  groupCounts: Record<GroupValue, number>;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
      {GROUP_OPTIONS.map(({ value, label }) => {
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
              gap:        4,
              transition: "color 0.15s",
              whiteSpace: "nowrap",
            }}
          >
            {label}
            {groupCounts[value] > 0 && (
              <span style={{
                ...JK, fontSize: 10, fontWeight: 700,
                color:        isActive ? "#444" : "#bbb",
                background:   isActive ? "#f0f0f0" : "#f5f5f5",
                borderRadius: 12, padding: "1px 5px",
              }}>
                {groupCounts[value]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Tipe dan pilihan filter status.
type FilterValue = "all" | "upcoming" | "live" | "finished";

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: "all",      label: "All"      },
  { value: "live",     label: "Live"     },
  { value: "upcoming", label: "Upcoming" },
  { value: "finished", label: "Results"  },
];

// Filter bar status (All / Live / Upcoming / Results) versi desktop.
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

// Dropdown filter gabungan untuk mobile. Dua kolom: Group By dan Status.
// Panel tetap terbuka saat memilih opsi supaya user bisa atur dua filter sekaligus.
function MobileCombinedFilterDropdown({ activeGroup, onGroupChange, groupCounts, activeFilter, onFilterChange, filterCounts }: {
  activeGroup:    GroupValue;
  onGroupChange:  (v: GroupValue) => void;
  groupCounts:    Record<GroupValue, number>;
  activeFilter:   FilterValue;
  onFilterChange: (v: FilterValue) => void;
  filterCounts:   Record<FilterValue, number>;
}) {
  const [open, setOpen] = useState(false);

  const colHeader: React.CSSProperties = {
    ...JK, fontSize: 10, fontWeight: 800, color: "#9CA3AF",
    textTransform: "uppercase", letterSpacing: "0.06em",
    padding: "10px 14px 6px",
  };

  const optionBtn = (isActive: boolean): React.CSSProperties => ({
    ...JK, display: "flex", alignItems: "center", justifyContent: "space-between",
    width: "100%", border: "none", cursor: "pointer",
    padding: "8px 14px", fontSize: 13, fontWeight: isActive ? 800 : 600,
    color: isActive ? "#171717" : "#444",
    background: isActive ? "#f3f4f6" : "none",
    borderRadius: 7,
  });

  const badge = (isActive: boolean, count: number) => (
    <span style={{
      ...JK, fontSize: 10, fontWeight: 700,
      color: isActive ? "#444" : "#bbb",
      background: isActive ? "#e5e7eb" : "#f5f5f5",
      borderRadius: 12, padding: "1px 6px",
    }}>
      {count}
    </span>
  );

  // Tombol trigger berubah warna kalau ada filter aktif selain default
  const isFiltered = activeFilter !== "all" || activeGroup !== "schedule";

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          ...JK, display: "flex", alignItems: "center", gap: 5,
          background: isFiltered ? "#171717" : "#f0f0f0",
          border: "none", borderRadius: 8,
          padding: "5px 10px", fontSize: 12, fontWeight: 800,
          color: isFiltered ? "#fff" : "#171717", cursor: "pointer",
        }}
      >
        Filter
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}>
          <path d={open ? "M2 6.5L5 3.5L8 6.5" : "M2 3.5L5 6.5L8 3.5"} stroke={isFiltered ? "#ccc" : "#555"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <>
          {/* Backdrop untuk tutup panel saat tap di luar */}
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 10 }} />

          <div style={{
            position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 20,
            background: "#fff", borderRadius: 12, border: "1px solid #ECEEF2",
            boxShadow: "0 8px 28px rgba(0,0,0,0.13)",
            display: "flex", gap: 0,
            overflow: "hidden",
          }}>
            {/* Kolom Group By */}
            <div style={{ minWidth: 130, borderRight: "1px solid #F3F4F6" }}>
              <div style={colHeader}>Group by</div>
              <div style={{ padding: "0 6px 8px" }}>
                {GROUP_OPTIONS.map(({ value, label }) => {
                  const isActive = activeGroup === value;
                  return (
                    <button key={value} onClick={() => onGroupChange(value)} style={optionBtn(isActive)}>
                      {label}
                      {groupCounts[value] > 0 && badge(isActive, groupCounts[value])}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Kolom Status */}
            <div style={{ minWidth: 130 }}>
              <div style={colHeader}>Status</div>
              <div style={{ padding: "0 6px 8px" }}>
                {FILTERS.map(({ value, label }) => {
                  const isActive = activeFilter === value;
                  return (
                    <button key={value} onClick={() => onFilterChange(value)} style={optionBtn(isActive)}>
                      {label}
                      {filterCounts[value] > 0 && badge(isActive, filterCounts[value])}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Props untuk MatchesTab
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
  const [filter,  setFilter]  = useState<FilterValue>("all");
  const [groupBy, setGroupBy] = useState<GroupValue>("schedule");

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

  const groups = useMemo(() => {
    const map = groupBy === "category" ? groupByCategory(sorted) : groupByDate(sorted);
    return Array.from(map.entries());
  }, [sorted, groupBy]);

  const groupCounts = useMemo<Record<GroupValue, number>>(() => ({
    schedule: groupByDate(sorted).size,
    category: groupByCategory(sorted).size,
  }), [sorted]);

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

        {/* Judul + kontrol filter dalam satu baris */}
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
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            {isMobile ? (
              <MobileCombinedFilterDropdown
                activeGroup={groupBy}   onGroupChange={setGroupBy}   groupCounts={groupCounts}
                activeFilter={filter}  onFilterChange={setFilter}   filterCounts={counts}
              />
            ) : (
              <>
                <FilterBar active={filter} onChange={setFilter} counts={counts} />
                <GroupToggle active={groupBy} onChange={setGroupBy} groupCounts={groupCounts} />
              </>
            )}
          </div>
        </div>

        {/* Daftar pertandingan */}
        {sorted.length === 0 ? (
          <EmptyState />
        ) : (() => {
          // Counter baris global supaya stagger delay konsisten lintas semua grup
          let rowIdx = 0;
          return (
            // Key pada filter supaya baris remount dan animasi ulang tiap ganti filter
            <div key={`${filter}-${groupBy}`}>
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
        {/* Spacer bawah */}
        <div style={{ height: 20 }} />
      </div>
    </div>
  );
}