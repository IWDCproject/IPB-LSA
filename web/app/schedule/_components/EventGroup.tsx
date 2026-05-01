"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, CalendarDays } from "lucide-react";
import { getAssetUrl } from "@/lib/directus";
import { MatchGrid } from "./MatchGrid";

// --- Konstanta ----------------------------------------------------------------

const MAX_STAGGER_INDEX = 10;
const STAGGER_STEP_MS   = 60;
const ANIM_DURATION_MS  = 300;
const SCROLL_MARGIN_TOP = 100;

// --- Types --------------------------------------------------------------------

interface EventGroupProps {
  eventName: string;
  cardImage: string | null;
  organizer: string | null;
  matches:   any[];
  gridKey:   string;
  index:     number;
  isOpen:    boolean;
  onToggle:  (eventName: string) => void;
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
    if (s === "live")                                                live++;
    else if (s === "finished" || s === "done" || s === "completed") finished++;
    else                                                             upcoming++;
  }
  return { live, upcoming, finished };
}

// --- Komponen -----------------------------------------------------------------

export function EventGroup({ eventName, cardImage, organizer, matches, gridKey, index, isOpen, onToggle }: EventGroupProps) {
  const groupRef  = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLButtonElement>(null);
  // Ref on the grid wrapper so we can listen to its transitionend precisely.
  const gridRef   = useRef<HTMLDivElement>(null);

  const [openKey, setOpenKey] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    setOpenKey(k => k + 1);

    const gridEl   = gridRef.current;
    const headerEl = headerRef.current;
    if (!gridEl || !headerEl) return;

    // WHY transitionend instead of RAF or setTimeout:
    //
    // The overshoot happens because the previously-open group above is also
    // collapsing at the same time. If we read getBoundingClientRect() too early
    // (RAF, or a short timeout), the collapsing group hasn't finished shrinking
    // yet — so our target position is off by however much height still remains.
    // By the time the smooth scroll reaches that position, the layout has shifted
    // and we've overshot.
    //
    // Both groups use the same transition duration (0.3s). So by the time OUR
    // grid's transitionend fires, the other group's collapse is also complete.
    // Layout is fully settled → position measurement is accurate → no overshoot.
    //
    // We guard with `e.target === gridEl` because transitionend bubbles up from
    // child elements (MatchGrid cards, etc.) and we only want the one from our
    // specific grid row, not any child.
    const onTransitionEnd = (e: TransitionEvent) => {
      if (e.target !== gridEl || e.propertyName !== "grid-template-rows") return;

      const rect   = headerEl.getBoundingClientRect();
      const inView = rect.top >= SCROLL_MARGIN_TOP && rect.bottom <= window.innerHeight;
      if (inView) return;

      // Works for both directions:
      // - header below viewport (rect.top > innerHeight) → scroll down
      // - header above viewport (rect.top < 0, e.g. collapse above pushed us up) → scroll up
      window.scrollTo({ top: rect.top + window.scrollY - SCROLL_MARGIN_TOP, behavior: "smooth" });
    };

    gridEl.addEventListener("transitionend", onTransitionEnd);
    return () => gridEl.removeEventListener("transitionend", onTransitionEnd);
  }, [isOpen]);

  const imageUrl     = cardImage ? getAssetUrl(cardImage) : null;
  const dateGroups   = useMemo(() => groupMatchesByDate(matches), [matches]);
  const statusCounts = useMemo(() => countByStatus(matches), [matches]);
  const showDates    = dateGroups.length > 1;
  const delayMs      = Math.min(index, MAX_STAGGER_INDEX) * STAGGER_STEP_MS;
  const handleToggle = useCallback(() => onToggle(eventName), [eventName, onToggle]);

  return (
    <div
      ref={groupRef}
      className="flex flex-col gap-2 opacity-0"
      style={{ animation: `match-row-in ${ANIM_DURATION_MS}ms ease ${delayMs}ms forwards` }}
    >

      <button
        ref={headerRef}
        onClick={handleToggle}
        className="relative flex items-center justify-between w-full bg-[#11194C] border border-blue-800/40 p-4 md:p-6 rounded-lg hover:bg-[#162162] transition-colors shadow-lg group overflow-hidden"
      >
        {imageUrl && (
          <div
            className="absolute right-0 top-0 bottom-0 w-[70%] md:w-[75%] pointer-events-none opacity-50 group-hover:opacity-75 transition-opacity"
            style={{
              backgroundImage:    `url(${imageUrl})`,
              backgroundPosition: "center",
              backgroundSize:     "cover",
              backgroundRepeat:   "no-repeat",
              WebkitMaskImage:    "linear-gradient(to left, black 0%, black 15%, transparent 75%)",
              maskImage:          "linear-gradient(to left, black 0%, black 15%, transparent 75%)",
            }}
          />
        )}

        <div className="relative z-10 flex flex-col gap-1 text-left">
          <h2 className="font-bebas text-xl mt-1 md:text-2xl font-bold text-white uppercase tracking-wide group-hover:text-yellow-400 transition-colors drop-shadow-md">
            {eventName}
          </h2>
          {organizer && (
            <p className="font-jakarta text-[12px] font-bold text-white/70 -mt-2 mb-2">
              by {organizer}
            </p>
          )}
          <div className="flex flex-col gap-0.5">
            {statusCounts.live > 0 && (
              <span className="font-jakarta text-[11px] font-bold text-yellow-400 whitespace-nowrap">
                [{statusCounts.live} live]
              </span>
            )}
            {statusCounts.upcoming > 0 && (
              <span className="font-jakarta text-[11px] font-bold text-white/60 whitespace-nowrap">
                [{statusCounts.upcoming} upcoming]
              </span>
            )}
            {statusCounts.finished > 0 && (
              <span className="font-jakarta text-[11px] font-bold text-white/30 whitespace-nowrap">
                [{statusCounts.finished} selesai]
              </span>
            )}
          </div>
        </div>

        <div className="relative z-10 bg-[#091340]/50 p-2 rounded-full text-blue-300 group-hover:text-yellow-400 group-hover:bg-[#091340]/80 transition-colors shrink-0 ml-4 border border-blue-800/30">
          {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>

      <div
        ref={gridRef}
        style={{ display: "grid", gridTemplateRows: isOpen ? "1fr" : "0fr", transition: "grid-template-rows 0.3s ease" }}
      >
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
                    <span className="text-[10px] font-bold bg-white/10 text-white/50 px-2 py-0.5 rounded-full shrink-0 tabular-nums whitespace-nowrap">
                      {dayMatches.length} matches
                    </span>
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