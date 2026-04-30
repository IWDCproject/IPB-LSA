"use client";

// Accordion group for one event.
// Owns only its own isOpen state — nothing else.
//
// • Entrance stagger: fades + slides in based on `index` prop, same
//   keyframe used by MatchGrid (match-row-in).
// • Smooth expand/collapse via the CSS grid-rows trick:
//     grid-template-rows: 0fr → 1fr
// • Matches are grouped by date when they span multiple days.
//   If all matches share the same date (or the date filter already
//   constrains to one day), date headers are hidden to avoid redundancy.

import { useState } from "react";
import { ChevronDown, ChevronUp, CalendarDays } from "lucide-react";
import { getAssetUrl } from "@/lib/directus";
import { MatchGrid } from "./MatchGrid";

interface EventGroupProps {
  eventName: string;
  cardImage: string | null;
  matches:   any[]; // MappedMatch[]
  // Changes whenever the active filters change, so MatchGrid remounts
  // and the stagger animation replays.
  gridKey:   string;
  // Position in the rendered list — drives the entrance stagger delay.
  index:     number;
}

// ---------------------------------------------------------------------------
// Date grouping helpers
// ---------------------------------------------------------------------------

function getDateKey(scheduledAt: string | null | undefined): string {
  if (!scheduledAt) return "__tbd__";
  const d = new Date(scheduledAt);
  // Normalise to local date string so timezone shifts don't create phantom groups
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function fmtDateHeader(dateKey: string): string {
  if (dateKey === "__tbd__") return "Date TBD";
  // Reconstruct from the key parts
  const [y, m, day] = dateKey.split("-").map(Number);
  const d = new Date(y, m, day);
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day:     "numeric",
    month:   "long",
    year:    "numeric",
  });
}

function groupMatchesByDate(matches: any[]): { dateKey: string; matches: any[] }[] {
  const map: Record<string, any[]> = {};
  const order: string[] = [];

  for (const m of matches) {
    const key = getDateKey(m.scheduled_at);
    if (!map[key]) {
      map[key] = [];
      order.push(key);
    }
    map[key].push(m);
  }

  // Sort chronologically (TBD bucket goes last)
  order.sort((a, b) => {
    if (a === "__tbd__") return 1;
    if (b === "__tbd__") return -1;
    return a.localeCompare(b);
  });

  return order.map(key => ({ dateKey: key, matches: map[key] }));
}

// ---------------------------------------------------------------------------
// Animation constants (mirror MatchGrid's values)
// ---------------------------------------------------------------------------

const MAX_STAGGER_INDEX = 10;
const STAGGER_STEP_MS  = 60;
const ANIM_DURATION_MS = 300;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

// Count matches per status bucket for the header badges
function countByStatus(matches: any[]) {
  let live = 0, upcoming = 0, finished = 0;
  for (const m of matches) {
    const s = m.status ?? "";
    if (s === "live")                                                    live++;
    else if (s === "finished" || s === "done" || s === "completed")     finished++;
    else                                                                 upcoming++;
  }
  return { live, upcoming, finished };
}

export function EventGroup({ eventName, cardImage, matches, gridKey, index }: EventGroupProps) {
  const [isOpen,  setIsOpen]  = useState(false);
  // Incremented on every open so MatchGrid remounts and the stagger replays
  const [openKey, setOpenKey] = useState(0);
  const imageUrl = getAssetUrl(cardImage);

  const dateGroups      = groupMatchesByDate(matches);
  const showDateHeaders = dateGroups.length > 1;
  const statusCounts    = countByStatus(matches);

  const delayMs = Math.min(index, MAX_STAGGER_INDEX) * STAGGER_STEP_MS;

  function handleToggle() {
    setIsOpen(open => {
      if (!open) setOpenKey(k => k + 1); // new key → MatchGrid remounts → stagger replays
      return !open;
    });
  }

  return (
    <div
      className="flex flex-col gap-2 opacity-0"
      style={{
        animation: `match-row-in ${ANIM_DURATION_MS}ms ease ${delayMs}ms forwards`,
      }}
    >

      {/* Accordion trigger */}
      <button
        onClick={handleToggle}
        className="relative flex items-center justify-between w-full bg-[#11194C] border border-blue-800/40 p-4 md:p-6 rounded-lg hover:bg-[#162162] transition-colors shadow-lg group overflow-hidden"
      >
        {/* Card image fades in from the right edge */}
        {imageUrl && (
          <div
            className="absolute right-0 top-0 bottom-0 w-[70%] md:w-[50%] pointer-events-none opacity-50 group-hover:opacity-75 transition-opacity"
            style={{
              backgroundImage:    `url(${imageUrl})`,
              backgroundPosition: "center",
              backgroundSize:     "cover",
              backgroundRepeat:   "no-repeat",
              WebkitMaskImage:    "linear-gradient(to left, black 0%, transparent 100%)",
              maskImage:          "linear-gradient(to left, black 0%, transparent 100%)",
            }}
          />
        )}

        {/* Event name + match count */}
        <div className="relative z-10 flex flex-wrap md:flex-nowrap items-center gap-3 md:gap-4 text-left">
          <h2 className="font-bebas text-xl mt-1 md:text-2xl font-bold text-white uppercase tracking-wide group-hover:text-yellow-400 transition-colors drop-shadow-md">
            {eventName}
          </h2>
          <div className="flex flex-wrap items-center gap-1.5">
              {statusCounts.live > 0 && (
                <span className="bg-yellow-400 text-black text-[10px] md:text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap border border-yellow-300/40" style={{ boxShadow: "0 0 8px 2px rgba(250,204,21,0.45)" }}>
                  {statusCounts.live} LIVE
                </span>
              )}
              {statusCounts.upcoming > 0 && (
                <span className="bg-[#1D3282] text-white text-[10px] md:text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap shadow-inner border border-blue-600/30">
                  {statusCounts.upcoming} UPCOMING
                </span>
              )}
              {statusCounts.finished > 0 && (
                <span className="bg-[#0D1F4C]/80 text-blue-300 text-[10px] md:text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap shadow-inner border border-blue-800/40">
                  {statusCounts.finished} SELESAI
                </span>
              )}
            </div>
        </div>

        {/* Chevron */}
        <div className="relative z-10 bg-[#091340]/50 p-2 rounded-full text-blue-300 group-hover:text-yellow-400 group-hover:bg-[#091340]/80 transition-colors shrink-0 ml-4 border border-blue-800/30">
          {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>

      {/* Collapsible body — CSS grid-rows trick for smooth height animation */}
      <div
        style={{
          display:          "grid",
          gridTemplateRows: isOpen ? "1fr" : "0fr",
          transition:       "grid-template-rows 0.3s ease",
        }}
      >
        {/* Inner div must have overflow:hidden so content is clipped during animation */}
        <div className="overflow-hidden">
          <div className="pt-5 pb-10 flex flex-col gap-4">
            {showDateHeaders ? (
              dateGroups.map(({ dateKey, matches: dayMatches }) => (
                <div key={dateKey} className="flex flex-col gap-2">
                  {/* Date divider */}
                  <div className="flex items-center gap-3 px-1">
                    <CalendarDays size={13} className="text-blue-400 shrink-0" />
                    <span className="text-blue-300 text-xs font-bold uppercase tracking-widest">
                      {fmtDateHeader(dateKey)}
                    </span>
                    <div className="h-px flex-1 bg-blue-800/40" />
                  </div>

                  {/*
                    key combines gridKey + dateKey so remounting on filter change
                    still works correctly when date groups are visible.
                  */}
                  <MatchGrid key={`${gridKey}-${openKey}-${dateKey}`} matches={dayMatches} />
                </div>
              ))
            ) : (
              /*
                Single date (or all TBD): skip the divider, render matches directly.
                key={gridKey} forces remount + stagger replay on filter change.
              */
              <MatchGrid key={`${gridKey}-${openKey}`} matches={matches} />
            )}
          </div>
        </div>
      </div>

    </div>
  );
}