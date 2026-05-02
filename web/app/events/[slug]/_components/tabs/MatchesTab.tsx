"use client";

import { useMemo, useState } from "react";

import { staggerSlideUp, TAB_ENTER }       from "../shared/Animations";
import type { AnimPhase }                  from "../shared/UseTabTransition";
import type { MappedEvent, MappedMatch }   from "../../_types";
import { groupByDateLong as groupByDate }  from "../match/scoreUtils";
import { DesktopMatchRow, MobileMatchRow } from "../match/MatchRow";

// --- Konstanta ----------------------------------------------

const GROUP_OPTIONS = [
  { value: "schedule" as const, label: "Schedule" },
  { value: "category" as const, label: "Category" },
];

const FILTER_OPTIONS = [
  { value: "all"      as const, label: "All"      },
  { value: "live"     as const, label: "Live"     },
  { value: "upcoming" as const, label: "Upcoming" },
  { value: "finished" as const, label: "Results"  },
];

// Animasi baris dibatasi di index ke-n biar baris ke-n+1 dst nggak nunggu lama
const MAX_STAGGER_INDEX = 15;

// --- Types ---------------------------------------------------

type GroupValue  = (typeof GROUP_OPTIONS)[number]["value"];
type FilterValue = (typeof FILTER_OPTIONS)[number]["value"];
type LayoutValue = "list" | "grid";

// --- Layout toggle icons -----------------------------------------------------

function ListIcon({ active }: { active: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1"  y="2.5" width="13" height="1.6" rx="0.8" fill={active ? "#171717" : "#BBBEC8"} />
      <rect x="1"  y="6.7" width="13" height="1.6" rx="0.8" fill={active ? "#171717" : "#BBBEC8"} />
      <rect x="1"  y="10.9" width="13" height="1.6" rx="0.8" fill={active ? "#171717" : "#BBBEC8"} />
    </svg>
  );
}

function GridIcon({ active }: { active: boolean }) {
  const fill = active ? "#171717" : "#BBBEC8";
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1"   y="1"   width="5.5" height="5.5" rx="1.2" fill={fill} />
      <rect x="8.5" y="1"   width="5.5" height="5.5" rx="1.2" fill={fill} />
      <rect x="1"   y="8.5" width="5.5" height="5.5" rx="1.2" fill={fill} />
      <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.2" fill={fill} />
    </svg>
  );
}

interface MatchesTabProps {
  event:        MappedEvent;
  isMobile:     boolean;
  phase:        AnimPhase;
  lastUpdated?: Date | null;
  isPolling?:   boolean;
  wsStatus?:    "connected" | "reconnecting" | "polling";
}

// --- Helpers -------------------------------------------------

function sortNewestFirst(matches: MappedMatch[]): MappedMatch[] {
  return [...matches].sort((a, b) => {
    const ta = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0;
    const tb = b.scheduled_at ? new Date(b.scheduled_at).getTime() : 0;
    return tb - ta;
  });
}

function groupByCategory(matches: MappedMatch[]): Map<string, MappedMatch[]> {
  const map = new Map<string, MappedMatch[]>();
  for (const match of matches) {
    const key = match.competition_category?.name ?? "Uncategorized";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(match);
  }
  return map;
}

// --- Komponen kecil ------------------------------------------

function DateHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-3 pt-[18px] pb-1">
      <span className="font-jakarta text-xs font-bold text-[#0D26C2] whitespace-nowrap">{label}</span>
      <div className="flex-1 h-px bg-gray-100" />
      <span className="font-jakarta text-[11px] font-semibold text-gray-300 whitespace-nowrap">
        {count} match{count !== 1 ? "es" : ""}
      </span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-2.5">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8"  y1="2" x2="8"  y2="6" />
        <line x1="3"  y1="10" x2="21" y2="10" />
      </svg>
      <span className="font-jakarta text-[13px] font-semibold text-gray-300">No matches scheduled yet</span>
    </div>
  );
}

// --- Toolbar -------------------------------------------------

function FilterBar({ active, onChange, counts, isMobile = false }: {
  active:    FilterValue;
  onChange:  (v: FilterValue) => void;
  counts:    Record<FilterValue, number>;
  isMobile?: boolean;
}) {
  return (
    <div className="flex items-center">
      {FILTER_OPTIONS.map(({ value, label }) => {
        const isActive = active === value;
        return (
          <button
            key={value}
            onClick={() => onChange(value)}
            className={`font-jakarta bg-transparent border-none cursor-pointer flex items-center gap-1 transition-colors whitespace-nowrap
              ${isMobile ? "pl-[10px] text-xs" : "pl-4 text-[13px]"}
              ${isActive ? "font-extrabold text-[#171717]" : "font-semibold text-[#676767]"}`}
          >
            {label}
            {counts[value] > 0 && (
              <span className={`font-jakarta text-[10px] font-bold rounded-xl px-[5px] py-px
                ${isActive ? "text-[#444] bg-gray-100" : "text-[#bbb] bg-gray-50"}`}>
                {counts[value]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function GroupToggle({ active, onChange, groupCounts }: {
  active:      GroupValue;
  onChange:    (v: GroupValue) => void;
  groupCounts: Record<GroupValue, number>;
}) {
  return (
    <div className="flex items-center">
      {GROUP_OPTIONS.map(({ value, label }) => {
        const isActive = active === value;
        return (
          <button
            key={value}
            onClick={() => onChange(value)}
            className={`font-jakarta bg-transparent border-none pl-4 text-[13px] cursor-pointer flex items-center gap-1 transition-colors whitespace-nowrap
              ${isActive ? "font-extrabold text-[#171717]" : "font-semibold text-[#676767]"}`}
          >
            {label}
            {groupCounts[value] > 0 && (
              <span className={`font-jakarta text-[10px] font-bold rounded-xl px-[5px] py-px
                ${isActive ? "text-[#444] bg-gray-100" : "text-[#bbb] bg-gray-50"}`}>
                {groupCounts[value]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function MobileCombinedFilterDropdown({ activeGroup, onGroupChange, groupCounts, activeFilter, onFilterChange, filterCounts }: {
  activeGroup:    GroupValue;
  onGroupChange:  (v: GroupValue) => void;
  groupCounts:    Record<GroupValue, number>;
  activeFilter:   FilterValue;
  onFilterChange: (v: FilterValue) => void;
  filterCounts:   Record<FilterValue, number>;
}) {
  const [open, setOpen] = useState(false);
  const isFiltered = activeFilter !== "all" || activeGroup !== "schedule";

  // Helper biar nggak duplikat markup kolom "Group by" dan "Status"
  function DropdownColumn({ title, options, activeValue, counts, onSelect }: {
    title:       string;
    options:     typeof GROUP_OPTIONS | typeof FILTER_OPTIONS;
    activeValue: string;
    counts:      Record<string, number>;
    onSelect:    (v: string) => void;
  }) {
    return (
      <div className="min-w-[130px]">
        <p className="font-jakarta text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.06em] px-3.5 pt-2.5 pb-1.5 opacity-0 animate-[dropdown-item-in_0.2s_ease_60ms_forwards]">
          {title}
        </p>
        <div className="px-1.5 pb-2">
          {options.map(({ value, label }, i) => {
            const isActive = activeValue === value;
            return (
              <button
                key={value}
                onClick={() => onSelect(value)}
                className={`font-jakarta flex items-center justify-between w-full border-none cursor-pointer px-3.5 py-2 text-[13px] rounded-[7px] opacity-0
                  ${isActive ? "font-extrabold text-[#171717] bg-gray-100" : "font-semibold text-[#444] bg-transparent"}`}
                style={{ animation: `dropdown-item-in 0.22s ease ${90 + i * 40}ms forwards` }}
              >
                {label}
                {counts[value] > 0 && (
                  <span className={`font-jakarta text-[10px] font-bold rounded-xl px-1.5 py-px
                    ${isActive ? "text-[#444] bg-gray-200" : "text-[#bbb] bg-gray-50"}`}>
                    {counts[value]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`font-jakarta flex items-center gap-[5px] border-none rounded-lg px-[10px] py-[5px] text-xs font-extrabold cursor-pointer
          ${isFiltered ? "bg-[#171717] text-white" : "bg-gray-100 text-[#171717]"}`}
      >
        Filter
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="shrink-0">
          <path
            d={open ? "M2 6.5L5 3.5L8 6.5" : "M2 3.5L5 6.5L8 3.5"}
            stroke={isFiltered ? "#ccc" : "#555"}
            strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} className="fixed inset-0 z-10" />
          <div className="absolute top-[calc(100%+6px)] right-0 z-20 bg-white rounded-xl border border-[#ECEEF2] shadow-[0_8px_28px_rgba(0,0,0,0.3)] flex overflow-hidden animate-dropdown-panel-in">
            <div className="border-r border-gray-100">
              <DropdownColumn title="Group by" options={GROUP_OPTIONS} activeValue={activeGroup} counts={groupCounts} onSelect={v => onGroupChange(v as GroupValue)} />
            </div>
            <DropdownColumn title="Status" options={FILTER_OPTIONS} activeValue={activeFilter} counts={filterCounts} onSelect={v => onFilterChange(v as FilterValue)} />
          </div>
        </>
      )}
    </div>
  );
}

// --- MatchesTab ----------------------------------------------

export default function MatchesTab({ event, isMobile, phase, lastUpdated, isPolling, wsStatus }: MatchesTabProps) {
  const allMatches: MappedMatch[] = event.matches ?? [];
  const [filter,  setFilter]  = useState<FilterValue>("all");
  const [groupBy, setGroupBy] = useState<GroupValue>("schedule");
  const [layout,  setLayout]  = useState<LayoutValue>("list");

  const filterCounts = useMemo<Record<FilterValue, number>>(() => ({
    all:      allMatches.length,
    live:     allMatches.filter(m => m.status === "live").length,
    upcoming: allMatches.filter(m => m.status === "upcoming").length,
    finished: allMatches.filter(m => m.status === "finished").length,
  }), [allMatches]);

  const filteredAndSorted = useMemo(() => {
    const filtered = filter === "all" ? allMatches : allMatches.filter(m => m.status === filter);
    return sortNewestFirst(filtered);
  }, [allMatches, filter]);

  const groupEntries = useMemo(() => {
    const map = groupBy === "category" ? groupByCategory(filteredAndSorted) : groupByDate(filteredAndSorted);
    return Array.from(map.entries());
  }, [filteredAndSorted, groupBy]);

  const groupCounts = useMemo<Record<GroupValue, number>>(() => ({
    schedule: groupByDate(filteredAndSorted).size,
    category: groupByCategory(filteredAndSorted).size,
  }), [filteredAndSorted]);

  const cardEnterStyle = phase === "entering" ? staggerSlideUp(0, TAB_ENTER) : {};

  return (
    <div style={cardEnterStyle}>
      <div className={`bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.10)] ${isMobile ? "px-4 py-4" : "px-7 py-5"}`}>

        {/* Header: judul + kontrol filter */}
        <div className="flex justify-between items-center">
          <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className={`font-jakarta font-extrabold text-navy ${isMobile ? "text-[15px]" : "text-[17px]"}`}>
              Matches
            </span>

            {/* Layout toggle — only shown on desktop */}
            {!isMobile && (
              <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-[3px]">
                <button
                  onClick={() => setLayout("list")}
                  className={`flex items-center justify-center rounded-md w-[24px] h-[24px] border-none cursor-pointer transition-colors
                    ${layout === "list" ? "bg-white shadow-sm" : "bg-transparent"}`}
                  aria-label="List view"
                >
                  <ListIcon active={layout === "list"} />
                </button>
                <button
                  onClick={() => setLayout("grid")}
                  className={`flex items-center justify-center rounded-md w-[24px] h-[24px] border-none cursor-pointer transition-colors
                    ${layout === "grid" ? "bg-white shadow-sm" : "bg-transparent"}`}
                  aria-label="Grid view"
                >
                  <GridIcon active={layout === "grid"} />
                </button>
              </div>
            )}
          </div>

            {/* Prioritas status: WebSocket > timestamp polling > kosong */}
            {wsStatus === "connected" || wsStatus === "reconnecting" ? (
              <p className="font-jakarta text-xs font-semibold text-black/35">
                {wsStatus === "connected" ? "Real-time · SSE" : "Connecting SSE…"}
              </p>
            ) : lastUpdated ? (
              <p className="font-jakarta text-xs font-semibold text-black/35">
                Last updated {lastUpdated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col items-end gap-2">
            {isMobile ? (
              <MobileCombinedFilterDropdown
                activeGroup={groupBy}  onGroupChange={setGroupBy}  groupCounts={groupCounts}
                activeFilter={filter}  onFilterChange={setFilter}  filterCounts={filterCounts}
              />
            ) : (
              <>
                <FilterBar   active={filter}  onChange={setFilter}  counts={filterCounts}  />
                <GroupToggle active={groupBy} onChange={setGroupBy} groupCounts={groupCounts} />
              </>
            )}
          </div>
        </div>

        {/* Daftar match */}
        {filteredAndSorted.length === 0 ? (
          <EmptyState />
        ) : layout === "grid" ? (
          // Grid layout — key berubah tiap filter/group/layout ganti biar animasi entrance muter ulang
          <div key={`${filter}-${groupBy}-grid`}>
            {(() => {
              let rowIdx = 0;
              return groupEntries.map(([groupLabel, rows]) => (
                <div key={groupLabel}>
                  <DateHeader label={groupLabel} count={rows.length} />
                  <div className={`grid gap-3 mt-1 ${isMobile ? "grid-cols-1" : "grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"}`}>
                    {rows.map((match: MappedMatch) => (
                      <div
                        key={match.id}
                        className="opacity-0 h-full"
                        style={{ animation: `match-row-in 0.28s ease ${Math.min(rowIdx++, MAX_STAGGER_INDEX) * 40}ms forwards` }}
                      >
                        <MobileMatchRow match={match} className="h-full" />
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>
        ) : (
          // List layout (default)
          <div key={`${filter}-${groupBy}-list`}>
            {(() => {
              let rowIdx = 0;
              return groupEntries.map(([groupLabel, rows]) => (
                <div key={groupLabel}>
                  <DateHeader label={groupLabel} count={rows.length} />
                  {rows.map((match: MappedMatch) => (
                    <div
                      key={match.id}
                      className={`opacity-0 rounded-lg ${isMobile ? "mb-1.5" : ""}`}
                      style={{ animation: `match-row-in 0.28s ease ${Math.min(rowIdx++, MAX_STAGGER_INDEX) * 40}ms forwards` }}
                    >
                      {isMobile ? <MobileMatchRow match={match} /> : <DesktopMatchRow match={match} />}
                    </div>
                  ))}
                </div>
              ));
            })()}
          </div>
        )}

        <div className="h-5" />
      </div>
    </div>
  );
}