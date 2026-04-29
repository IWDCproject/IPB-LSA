"use client";

import React, { useRef, useState, useLayoutEffect } from "react";
import { groupByDateShort as groupByDate } from "../match/scoreUtils";
import type { MappedMatch } from "../../_types";
import { MobileMatchRow } from "../match/MatchRow";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function DateHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-[14px] pb-1">
      <span className="font-jakarta text-[11px] font-semibold text-[#aaa] whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-[#ebebeb]" />
    </div>
  );
}

const CARD_BASE    = "bg-white rounded-xl px-5 py-4 flex flex-col flex-1 min-h-0";
const MOBILE_LIMIT = 5;

// ─── useVisibleRowCount ───────────────────────────────────────────────────────
//
// After every paint, walks the [data-match-row] elements inside `contentRef`
// and counts how many have their bottom edge within the container's visible
// bottom boundary (the overflow:hidden clip edge). Uses ResizeObserver so it
// re-counts whenever the container is resized (e.g. window resize, font load).
//
// Returns null on the first frame before measurement completes; callers treat
// null as "no footer yet" so there's no flash of a wrong count.

function useVisibleRowCount(
  contentRef: React.RefObject<HTMLDivElement>,
  enabled: boolean,
  matchCount: number, // re-measure when the data set changes
): number | null {
  const [count, setCount] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!enabled) {
      setCount(null);
      return;
    }

    const el = contentRef.current;
    if (!el) return;

    const measure = () => {
      const rows = Array.from(el.querySelectorAll<HTMLElement>("[data-match-row]"));
      if (!rows.length) {
        setCount(0);
        return;
      }

      // containerBottom is the visual clip boundary of overflow:hidden.
      // Row elements' getBoundingClientRect() returns their full (unclipped)
      // position, so comparing row.bottom <= containerBottom correctly
      // identifies every row that is fully visible.
      const containerBottom = el.getBoundingClientRect().bottom;
      let visible = 0;
      for (const row of rows) {
        if (row.getBoundingClientRect().bottom <= containerBottom + 2) {
          visible++;
        } else {
          // Rows are in DOM order — once one is clipped, all subsequent are too.
          break;
        }
      }
      setCount(visible);
    };

    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(el);

    // Re-measure once web fonts finish loading (text reflow can change row heights).
    document.fonts?.ready.then(measure);

    return () => ro.disconnect();
  }, [enabled, matchCount]); // eslint-disable-line react-hooks/exhaustive-deps

  return count;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MatchPanelProps {
  isMobile:     boolean;
  onTabChange?: () => void;
}

// ─── UpcomingMatchesPanel ─────────────────────────────────────────────────────

export function UpcomingMatchesPanel({
  upcoming, isMobile, desktopLimit = -1, onTabChange,
}: MatchPanelProps & { upcoming: MappedMatch[], desktopLimit?: number }) {
  if (!upcoming.length) return null;

  const displayedCount = isMobile ? MOBILE_LIMIT : (desktopLimit === -1 ? upcoming.length : desktopLimit);
  const displayed = upcoming.slice(0, displayedCount); // STRICT SLICE
  const groups    = Array.from(groupByDate(displayed).entries());
  const hiddenCount = Math.max(0, upcoming.length - displayedCount);

  return (
    <div data-panel-container="true" className={isMobile ? "bg-white rounded-xl px-5 py-4" : CARD_BASE}>
      <div data-panel-header="true" className="flex justify-between items-baseline mb-1">
        <span className="font-jakarta text-sm font-extrabold text-navy">Upcoming Matches</span>
        <span className="font-jakarta text-[10px] text-[#aaa]">{upcoming.length} total</span>
      </div>

      <div data-panel-content="true" className="flex-none">
        {groups.map(([date, rows]) => (
          <React.Fragment key={date}>
            <div data-date-header="true"><DateHeader label={date} /></div>
            {rows.map((m: MappedMatch) => (
              <div key={m.id} data-match-row="true" data-is-live={m.status === "live" ? "true" : undefined} className="mb-1.5">
                <MobileMatchRow match={m} />
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>

      {hiddenCount > 0 && (
        <div 
          data-panel-footer="true" 
          onClick={() => onTabChange?.()}
          className={`mt-auto font-jakarta text-[10px] font-semibold text-center pt-1.5 tracking-[0.02em] 
            ${onTabChange ? "text-[#0D26C2] cursor-pointer underline" : "text-[#c8c8c8] cursor-default no-underline"}`}
        >
          +{hiddenCount} more match{hiddenCount !== 1 ? "es" : ""}
        </div>
      )}
    </div>
  );
}

// ─── LatestResultsPanel ───────────────────────────────────────────────────────

export function LatestResultsPanel({
  finished, isMobile, desktopLimit = -1, onTabChange,
}: MatchPanelProps & { finished: MappedMatch[], desktopLimit?: number }) {
  if (!finished.length) return null;

  const displayedCount = isMobile ? MOBILE_LIMIT : (desktopLimit === -1 ? finished.length : desktopLimit);
  const displayed = finished.slice(0, displayedCount); // STRICT SLICE
  const groups    = Array.from(groupByDate(displayed).entries());
  const hiddenCount = Math.max(0, finished.length - displayedCount);

  return (
    <div data-panel-container="true" className={isMobile ? "bg-white rounded-xl px-5 py-4" : CARD_BASE}>
      <div data-panel-header="true" className="flex justify-between items-baseline mb-1">
        <span className="font-jakarta text-sm font-extrabold text-navy">Latest Results</span>
        <span className="font-jakarta text-[10px] text-[#aaa]">{finished.length} total</span>
      </div>

      <div data-panel-content="true" className="flex-none">
        {groups.map(([date, rows]) => (
          <React.Fragment key={date}>
            <div data-date-header="true"><DateHeader label={date} /></div>
            {rows.map((m: MappedMatch) => (
              <div key={m.id} data-match-row="true" className="mb-1.5">
                <MobileMatchRow match={m} />
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>

      {hiddenCount > 0 && (
        <div 
          data-panel-footer="true" 
          onClick={() => onTabChange?.()}
          className={`mt-auto font-jakarta text-[10px] font-semibold text-center pt-1.5 tracking-[0.02em] 
            ${onTabChange ? "text-[#0D26C2] cursor-pointer underline" : "text-[#c8c8c8] cursor-default no-underline"}`}
        >
          +{hiddenCount} more result{hiddenCount !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}