"use client";
import { useState, useLayoutEffect, useRef } from "react";
import AboutPanel from "./AboutPanel";
import TimelinePanel from "./TimelinePanel";
import CountdownPanel from "./CountdownPanel";
import { UpcomingMatchesPanel, LatestResultsPanel } from "./MatchesPanels";
import LatestStoriesSection from "./LatestStoriesSection";

// Gap between panels in the right column (must match the CSS gap value below)
const PANEL_GAP = 16;

export default function OverviewTab({ event, isMobile }: { event: any; isMobile: boolean }) {
  const [anchorHeight,   setAnchorHeight]   = useState(0);
  const [countdownHeight, setCountdownHeight] = useState(0);

  const leftColRef    = useRef<HTMLDivElement>(null);
  const countdownRef  = useRef<HTMLDivElement>(null);

  const upcoming     = (event.matches ?? []).filter((m: any) => m.status === "upcoming" || m.status === "live");
  const finished     = (event.matches ?? []).filter((m: any) => m.status === "finished");
  const showCountdown = !!(event.is_registration_open && event.registration_end_date);
  const hasResults    = finished.length > 0;

  // ── Anchor Measurement ──────────────────────────────────────────────────────
  // We observe *both* the left column and the countdown panel so we always
  // have fresh measurements when either changes size (e.g. font-load reflow).
  useLayoutEffect(() => {
    if (isMobile) return;

    const updateHeights = () => {
      setAnchorHeight(leftColRef.current?.offsetHeight ?? 0);
      setCountdownHeight(countdownRef.current?.offsetHeight ?? 0);
    };

    updateHeights();

    const ro = new ResizeObserver(updateHeights);
    if (leftColRef.current)   ro.observe(leftColRef.current);
    if (countdownRef.current) ro.observe(countdownRef.current);

    return () => ro.disconnect();
  }, [isMobile]);

  // ── Budget Deduction Calculation ────────────────────────────────────────────
  //
  // The right column's total height is:
  //
  //   [countdownHeight + gap]   ← only when countdown is shown on desktop
  //   [upcomingPanelHeight    ]
  //   [gap + resultsPanelHeight]  ← only when finished matches exist
  //
  // For the right column to equal anchorHeight (before greedy expansion):
  //
  //   upcomingH + resultsH = anchorHeight − countdownAndGap − interPanelGap
  //                        = anchorHeight − budgetDeduction
  //
  // We pass budgetDeduction to useSmartSlice so it applies the 60/40 split
  // against this corrected pool, not the raw anchorHeight.
  //
  const countdownAndGap = !isMobile && showCountdown
    ? countdownHeight + PANEL_GAP   // countdown + the gap beneath it
    : 0;
  const interPanelGap = hasResults ? PANEL_GAP : 0; // gap between the two match panels
  const budgetDeduction = countdownAndGap + interPanelGap;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        style={{
          display:             "grid",
          gridTemplateColumns: isMobile ? "1fr" : "3fr 2fr",
          gap:                 PANEL_GAP,
          // Step 5 – Mutual Compensation:
          // After the greedy row expands the right column past anchorHeight,
          // this stretches the left column (AboutPanel) to stay flush.
          alignItems:          "stretch",
        }}
      >
        {/* ── COLUMN 1: Anchor ──────────────────────────────────────────────── */}
        {/* We measure this column's natural height; it becomes the layout anchor */}
        <div
          ref={leftColRef}
          style={{ display: "flex", flexDirection: "column", gap: PANEL_GAP }}
        >
          {/* Countdown only visible on mobile here (desktop shows it in col 2) */}
          {isMobile && showCountdown && (
            <CountdownPanel
              deadline={event.registration_end_date}
              registrationUrl={event.registration_url}
            />
          )}

          {/*
            AboutPanel is configured to flex-grow its card container.
            When the right column is taller (after greedy), align-items:stretch
            makes this column match that height, and AboutPanel fills it.
          */}
          <AboutPanel event={event} />

          <TimelinePanel phases={event.phases ?? []} />
        </div>

        {/* ── COLUMN 2: Greedy ──────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: PANEL_GAP }}>

          {/* Countdown — desktop only; wrapped in a div so we can measure it */}
          {!isMobile && showCountdown && (
            <div ref={countdownRef}>
              <CountdownPanel
                deadline={event.registration_end_date}
                registrationUrl={event.registration_url}
              />
            </div>
          )}

          {/*
            Upcoming Matches – priority panel (60% share).
            flex: 1.5 lets it visually dominate over Latest Results.
          */}
          <div style={{ flex: 1.5, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <UpcomingMatchesPanel
              upcoming={upcoming}
              anchorHeight={anchorHeight}
              isMobile={isMobile}
              budgetDeduction={budgetDeduction}
              hasCounterpart={hasResults}
            />
          </div>

          {/*
            Latest Results – secondary panel (40% share).
            Only rendered when there are finished matches.
          */}
          {hasResults && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
              <LatestResultsPanel
                finished={finished}
                anchorHeight={anchorHeight}
                isMobile={isMobile}
                budgetDeduction={budgetDeduction}
                hasCounterpart={true}
              />
            </div>
          )}
        </div>
      </div>

      {/* Latest Stories section below the grid */}
      {event.news?.length > 0 && (
        <LatestStoriesSection
          news={event.news}
          eventSlug={event.slug}
          isMobile={isMobile}
        />
      )}
    </div>
  );
}