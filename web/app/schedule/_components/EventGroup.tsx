"use client";

// Accordion group for one event.
// Owns only its own isOpen state — nothing else.
//
// Smooth expand/collapse is achieved via the CSS grid-rows trick:
//   grid-template-rows: 0fr → 1fr
// which animates height without knowing the content's height in JS.

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { getAssetUrl } from "@/lib/directus";
import { MatchGrid } from "./MatchGrid";

interface EventGroupProps {
  eventName: string;
  cardImage: string | null;
  matches:   any[]; // MappedMatch[]
  // Changes whenever the active filters change, so MatchGrid remounts
  // and the stagger animation replays.
  gridKey:   string;
}

export function EventGroup({ eventName, cardImage, matches, gridKey }: EventGroupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const imageUrl = getAssetUrl(cardImage);

  return (
    <div className="flex flex-col gap-3">

      {/* Accordion trigger */}
      <button
        onClick={() => setIsOpen(open => !open)}
        className="relative flex items-center justify-between w-full bg-[#11194C] border border-blue-800/40 p-4 md:p-6 rounded-2xl hover:bg-[#162162] transition-colors shadow-lg group overflow-hidden"
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
          <h2 className="text-lg md:text-2xl font-bold text-white uppercase tracking-wide group-hover:text-yellow-400 transition-colors drop-shadow-md">
            {eventName}
          </h2>
          <span className="bg-[#1D3282] text-white text-[10px] md:text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap shadow-inner border border-blue-600/30">
            {matches.length} PERTANDINGAN
          </span>
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
          <div className="pt-1 pb-4">
            {/*
              key={gridKey} forces MatchGrid to fully remount whenever filters change,
              so the stagger animation replays from the start.
            */}
            <MatchGrid key={gridKey} matches={matches} />
          </div>
        </div>
      </div>

    </div>
  );
}