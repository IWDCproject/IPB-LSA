"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, CalendarDays } from "lucide-react";
import { getAssetUrl } from "@/lib/directus";
import { MatchGrid } from "./MatchGrid";

// --- Konstanta ----------------------------------------------------------------

// Dibatasi biar item ke-11 dst nggak nunggu lama
const MAX_STAGGER_INDEX = 10;
const STAGGER_STEP_MS   = 60;
const ANIM_DURATION_MS  = 300;

// --- Types --------------------------------------------------------------------

interface EventGroupProps {
  eventName: string;
  cardImage: string | null;
  matches:   any[];
  // key berubah tiap filter ganti biar animasi entrance muter ulang
  gridKey:   string;
  index:     number;
}

// --- Helpers ------------------------------------------------------------------

function getDateKey(scheduledAt: string | null | undefined): string {
  if (!scheduledAt) return "__tbd__";
  const d = new Date(scheduledAt);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function fmtDateHeader(dateKey: string): string {
  if (dateKey === "__tbd__") return "Date TBD";
  const [y, m, day] = dateKey.split("-").map(Number);
  return new Date(y, m, day).toLocaleDateString("en-GB", {
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
    if (!map[key]) { map[key] = []; order.push(key); }
    map[key].push(m);
  }

  order.sort((a, b) => {
    if (a === "__tbd__") return 1;
    if (b === "__tbd__") return -1;
    return a.localeCompare(b);
  });

  return order.map(key => ({ dateKey: key, matches: map[key] }));
}

function countByStatus(matches: any[]) {
  let live = 0, upcoming = 0, finished = 0;
  for (const m of matches) {
    const s = m.status ?? "";
    if (s === "live")                                              live++;
    else if (s === "finished" || s === "done" || s === "completed") finished++;
    else                                                           upcoming++;
  }
  return { live, upcoming, finished };
}

// --- Komponen -----------------------------------------------------------------

export function EventGroup({ eventName, cardImage, matches, gridKey, index }: EventGroupProps) {
  const [isOpen,  setIsOpen]  = useState(false);
  // naik tiap kali dibuka biar MatchGrid remount dan stagger muter ulang
  const [openKey, setOpenKey] = useState(0);

  const imageUrl     = getAssetUrl(cardImage);
  const dateGroups   = groupMatchesByDate(matches);
  const showDates    = dateGroups.length > 1;
  const statusCounts = countByStatus(matches);
  const delayMs      = Math.min(index, MAX_STAGGER_INDEX) * STAGGER_STEP_MS;

  function handleToggle() {
    setIsOpen(open => {
      if (!open) setOpenKey(k => k + 1);
      return !open;
    });
  }

  return (
    <div
      className="flex flex-col gap-2 opacity-0"
      style={{ animation: `match-row-in ${ANIM_DURATION_MS}ms ease ${delayMs}ms forwards` }}
    >

      <button
        onClick={handleToggle}
        className="relative flex items-center justify-between w-full bg-[#11194C] border border-blue-800/40 p-4 md:p-6 rounded-lg hover:bg-[#162162] transition-colors shadow-lg group overflow-hidden"
      >
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

        <div className="relative z-10 bg-[#091340]/50 p-2 rounded-full text-blue-300 group-hover:text-yellow-400 group-hover:bg-[#091340]/80 transition-colors shrink-0 ml-4 border border-blue-800/30">
          {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>

      <div style={{ display: "grid", gridTemplateRows: isOpen ? "1fr" : "0fr", transition: "grid-template-rows 0.3s ease" }}>
        <div className="overflow-hidden">
          <div className="pt-5 pb-16 flex flex-col gap-4">
            {showDates ? (
              dateGroups.map(({ dateKey, matches: dayMatches }) => (
                <div key={dateKey} className="flex flex-col gap-2">
                  <div className="flex items-center gap-3 px-1">
                    <CalendarDays size={13} className="text-white/50 shrink-0" />
                    <span
                      className="font-jakarta text-xs tracking-wide whitespace-nowrap"
                      style={{ color: "rgba(255,255,255,0.7)", fontWeight: 600 }}
                    >
                      {fmtDateHeader(dateKey)}
                    </span>
                    <div className="h-px flex-1 bg-white/20" />
                  </div>
                  <MatchGrid key={`${gridKey}-${openKey}-${dateKey}`} matches={dayMatches} />
                </div>
              ))
            ) : (
              <MatchGrid key={`${gridKey}-${openKey}`} matches={matches} />
            )}
          </div>
        </div>
      </div>

    </div>
  );
}