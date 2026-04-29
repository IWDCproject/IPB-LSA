"use client";

import React from "react";

/**
 * Decorative "Coming Soon" card — shown when an event has fewer news items
 * than the grid expects. Used in both LatestStoriesSection and NewsTab.
 */
export function NewsPlaceholder() {
  return (
    <div className="relative flex flex-col items-center justify-center rounded-lg shadow-[0_0_0_2px_rgba(255,255,255,0.15)] bg-white/[0.03] backdrop-blur-sm p-10 h-full min-h-[380px] overflow-hidden">
      {/* Batik pattern bg — background-image needs an inline style */}
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-no-repeat bg-center opacity-[0.15] pointer-events-none z-0 blur-[1.5px]"
        style={{ backgroundImage: "url(/Batik_Pattern_white.svg)" }}
      />

      <div className="relative z-10 flex flex-col items-center justify-center w-full text-center">
        <svg
          width="18" height="18" viewBox="0 0 24 24"
          fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2"
          className="mb-3"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span className="font-jakarta text-[11px] font-extrabold text-white/40 uppercase tracking-[0.12em]">
          Coming Soon
        </span>
      </div>
    </div>
  );
}