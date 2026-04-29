"use client";
import React from "react";
import { groupByDateShort as groupByDate } from "../match/scoreUtils";
import type { MappedMatch } from "../../_types";
import { MobileMatchRow } from "../match/MatchRow";

// --- Helpers -----------------------------------------------------------------

function DateHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-[14px] pb-1">
      <span className="font-jakarta text-[11px] font-semibold text-[#aaa] whitespace-nowrap">{label}</span>
      <div className="flex-1 h-px bg-[#ebebeb]" />
    </div>
  );
}

const CARD_BASE = "bg-white rounded-xl px-5 py-4 flex flex-col flex-1 min-h-0";

// --- Types -------------------------------------------------------------------

export interface MatchPanelProps {
  limit:        number;
  isMobile:     boolean;
  contentRef?:  React.RefObject<HTMLDivElement>;
  firstRowRef?: React.RefObject<HTMLDivElement>;
  onTabChange?: (tab: "matches") => void;
}

// --- UpcomingMatchesPanel ----------------------------------------------------

export function UpcomingMatchesPanel({
  upcoming,
  limit,
  isMobile,
  contentRef,
  firstRowRef,
  onTabChange,
}: MatchPanelProps & { upcoming: MappedMatch[] }) {
  if (!upcoming.length) return null;

  const displayed = upcoming.slice(0, limit);
  const groups    = Array.from(groupByDate(displayed).entries());
  const remainder = upcoming.length - limit;

  return (
    <div className={isMobile ? "bg-white rounded-xl px-5 py-4" : CARD_BASE}>
      <div className="flex justify-between items-baseline mb-1">
        <span className="font-jakarta text-sm font-extrabold text-navy">Upcoming Matches</span>
        <span className="font-jakarta text-[10px] text-[#aaa]">{upcoming.length} total</span>
      </div>

      <div ref={contentRef} className={isMobile ? "" : "flex-1 overflow-hidden min-h-0"}>
        {groups.map(([date, rows], gi) => (
          <div key={date}>
            <DateHeader label={date} />
            {rows.map((m: MappedMatch, ri: number) => (
              <div
                key={m.id}
                ref={gi === 0 && ri === 0 ? firstRowRef : undefined}
                className="mb-1.5"
              >
                <MobileMatchRow match={m} />
              </div>
            ))}
          </div>
        ))}
      </div>

      {remainder > 0 && (
        <div
          onClick={() => onTabChange?.("matches")}
          className={`font-jakarta text-[10px] font-semibold text-center pt-1.5 tracking-[0.02em]
            ${onTabChange ? "text-[#0D26C2] cursor-pointer underline" : "text-[#c8c8c8] cursor-default no-underline"}`}
        >
          +{remainder} more match{remainder !== 1 ? "es" : ""}
        </div>
      )}
    </div>
  );
}

// --- LatestResultsPanel ------------------------------------------------------

export function LatestResultsPanel({
  finished,
  limit,
  isMobile,
  contentRef,
  firstRowRef,
  onTabChange,
}: MatchPanelProps & { finished: MappedMatch[] }) {
  if (!finished.length) return null;

  const displayed = finished.slice(0, limit);
  const groups    = Array.from(groupByDate(displayed).entries());
  const remainder = finished.length - limit;

  return (
    <div className={isMobile ? "bg-white rounded-xl px-5 py-4" : CARD_BASE}>
      <div className="flex justify-between items-baseline mb-1">
        <span className="font-jakarta text-sm font-extrabold text-navy">Latest Results</span>
        <span className="font-jakarta text-[10px] text-[#aaa]">{finished.length} total</span>
      </div>

      <div ref={contentRef} className={isMobile ? "" : "flex-1 overflow-hidden min-h-0"}>
        {groups.map(([date, rows], gi) => (
          <div key={date}>
            <DateHeader label={date} />
            {rows.map((m: MappedMatch, ri: number) => (
              <div
                key={m.id}
                ref={gi === 0 && ri === 0 ? firstRowRef : undefined}
                className="mb-1.5"
              >
                <MobileMatchRow match={m} />
              </div>
            ))}
          </div>
        ))}
      </div>

      {remainder > 0 && (
        <div
          onClick={() => onTabChange?.("matches")}
          className={`font-jakarta text-[10px] font-semibold text-center pt-1.5 tracking-[0.02em]
            ${onTabChange ? "text-[#0D26C2] cursor-pointer underline" : "text-[#c8c8c8] cursor-default no-underline"}`}
        >
          +{remainder} more result{remainder !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}