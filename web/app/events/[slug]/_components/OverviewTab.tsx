"use client";
import { useState, useLayoutEffect, useRef, useMemo } from "react";
import AboutPanel from "./AboutPanel";
import TimelinePanel from "./TimelinePanel";
import CountdownPanel from "./CountdownPanel";
import { UpcomingMatchesPanel, LatestResultsPanel } from "./MatchesPanels";
import LatestStoriesSection from "./LatestStoriesSection";

const PANEL_GAP = 16;

// card-padding(32) + header-line-height(~21) + header-marginBottom(4) = 57
const ROW_H         = 52;   // used in fitRows — standard row height (logo 32 + padding 20)
const ROW_H_SAFE    = 64;   // used in rowsHeight — covers ScoreSetsLive rows with set pills (~61px)
const DATE_H        = 32;
const OVERHEAD_BASE = 57;
const FOOTER_H      = 20;

function naturalRowH(matches: any[]): number {
  let h = 0, lastDate = "";
  for (const m of matches) {
    const d = m.scheduled_at?.split("T")[0] ?? "~";
    if (d !== lastDate) { h += DATE_H; lastDate = d; }
    h += ROW_H;
  }
  return h;
}

function rowsHeight(matches: any[], count: number): number {
  let h = 0, lastDate = "";
  const n = Math.min(count, matches.length);
  for (let i = 0; i < n; i++) {
    const d = matches[i].scheduled_at?.split("T")[0] ?? "~";
    if (d !== lastDate) { h += DATE_H; lastDate = d; }
    h += ROW_H_SAFE;
  }
  return h + (count < matches.length ? FOOTER_H : 0);
}

function fitRows(matches: any[], budget: number): number {
  if (!matches.length || budget <= 0) return 0;

  // Step 1 — no footer cost
  let used = 0, lastDate = "", count = 0;
  for (const m of matches) {
    const d    = m.scheduled_at?.split("T")[0] ?? "~";
    const cost = (d !== lastDate ? DATE_H : 0) + ROW_H;
    if (used + cost > budget) break;
    used += cost; lastDate = d; count++;
  }
  if (count >= matches.length) return count; // all fit, no footer

  // Step 2 — reserve FOOTER_H
  used = 0; lastDate = ""; count = 0;
  const b2 = budget - FOOTER_H;
  for (const m of matches) {
    const d    = m.scheduled_at?.split("T")[0] ?? "~";
    const cost = (d !== lastDate ? DATE_H : 0) + ROW_H;
    if (used + cost > b2) break;
    used += cost; lastDate = d; count++;
  }

  // Step 3 — greedy: if gap after strict fit ≥ ½ ROW_H, add one more row
  const gap = b2 - used;
  if (gap >= ROW_H * 0.5 && count < matches.length) {
    count++;
  }

  return Math.max(1, count);
}

function useRightColumnLayout(
  upcoming:     any[],
  finished:     any[],
  anchorHeight: number,
  countdownH:   number,
  isMobile:     boolean,
) {
  return useMemo(() => {
    const FALLBACK = { upcomingH: 0, resultsH: 0, upcomingLimit: 3, resultsLimit: 3 };
    if (isMobile || anchorHeight <= 0) return FALLBACK;

    const hasUpcoming = upcoming.length > 0;
    const hasResults  = finished.length > 0;
    if (!hasUpcoming && !hasResults) return FALLBACK;

    const cdGap      = countdownH > 0 ? PANEL_GAP : 0;
    const totalAvail = anchorHeight - countdownH - cdGap;

    if (!hasUpcoming) {
      const limit    = fitRows(finished, totalAvail - OVERHEAD_BASE);
      const contentH = OVERHEAD_BASE + rowsHeight(finished, limit);
      return {
        upcomingH:     0,
        resultsH:      Math.max(totalAvail, contentH),
        upcomingLimit: 0,
        resultsLimit:  limit,
      };
    }

    if (!hasResults) {
      const limit    = fitRows(upcoming, totalAvail - OVERHEAD_BASE);
      const contentH = OVERHEAD_BASE + rowsHeight(upcoming, limit);
      return {
        upcomingH:     Math.max(totalAvail, contentH),
        resultsH:      0,
        upcomingLimit: limit,
        resultsLimit:  0,
      };
    }

    const bothAvail = totalAvail - PANEL_GAP;

    const upNat  = OVERHEAD_BASE + naturalRowH(upcoming);
    const resNat = OVERHEAD_BASE + naturalRowH(finished);
    const p60    = Math.round(bothAvail * 0.6);
    const p40    = bothAvail - p60;

    let upBudget:  number;
    let resBudget: number;

    if (upNat + resNat <= bothAvail) {
      resBudget = resNat;
      upBudget  = bothAvail - resBudget;
    } else if (upNat <= p60) {
      upBudget  = upNat;
      resBudget = bothAvail - upBudget;
    } else if (resNat <= p40) {
      resBudget = resNat;
      upBudget  = bothAvail - resBudget;
    } else {
      upBudget  = p60;
      resBudget = p40;
    }

    const upLimit  = fitRows(upcoming, upBudget  - OVERHEAD_BASE);
    const resLimit = fitRows(finished, resBudget - OVERHEAD_BASE);

    const upH  = Math.max(upBudget,  OVERHEAD_BASE + rowsHeight(upcoming, upLimit));
    const resH = Math.max(resBudget, OVERHEAD_BASE + rowsHeight(finished, resLimit));

    return {
      upcomingH:     upH,
      resultsH:      resH,
      upcomingLimit: upLimit,
      resultsLimit:  resLimit,
    };
  }, [upcoming, finished, anchorHeight, countdownH, isMobile]);
}

export default function OverviewTab({ event, isMobile }: { event: any; isMobile: boolean }) {
  const [anchorHeight,    setAnchorHeight]    = useState(0);
  const [countdownHeight, setCountdownHeight] = useState(0);

  const leftColRef   = useRef<HTMLDivElement>(null);
  const countdownRef = useRef<HTMLDivElement>(null);

  const upcoming      = (event.matches ?? []).filter((m: any) => m.status === "upcoming" || m.status === "live");
  const finished      = (event.matches ?? []).filter((m: any) => m.status === "finished");
  const showCountdown = !!(event.is_registration_open && event.registration_end_date);
  const hasResults    = finished.length > 0;
  const hasUpcoming   = upcoming.length > 0;

  useLayoutEffect(() => {
    if (isMobile) return;

    const updateHeights = () => {
      const el = leftColRef.current;
      const cd = countdownRef.current;

      if (el) {
        const prev = el.style.alignSelf;
        el.style.alignSelf = "start";
        const h = el.offsetHeight;
        el.style.alignSelf = prev;
        setAnchorHeight(curr => curr !== h ? h : curr);
      }
      if (cd) {
        const h = cd.offsetHeight;
        setCountdownHeight(curr => curr !== h ? h : curr);
      }
    };

    updateHeights();
    window.addEventListener("resize", updateHeights);
    return () => window.removeEventListener("resize", updateHeights);
  }, [isMobile]);

  const { upcomingH, resultsH, upcomingLimit, resultsLimit } = useRightColumnLayout(
    upcoming,
    finished,
    anchorHeight,
    showCountdown && !isMobile ? countdownHeight : 0,
    isMobile,
  );

  const measured = !isMobile && anchorHeight > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        style={{
          display:             "grid",
          gridTemplateColumns: isMobile ? "1fr" : "3fr 2fr",
          gap:                 PANEL_GAP,
          alignItems:          "stretch",
        }}
      >
        <div
          ref={leftColRef}
          style={{ display: "flex", flexDirection: "column", gap: PANEL_GAP }}
        >
          {isMobile && showCountdown && (
            <CountdownPanel
              deadline={event.registration_end_date}
              registrationUrl={event.registration_url}
            />
          )}
          <AboutPanel event={event} />
          <TimelinePanel phases={event.phases ?? []} />
        </div>

        {/* RIGHT COLUMN */}
        <div
          style={{
            display:       "flex",
            flexDirection: "column",
            gap:           PANEL_GAP,
          }}
        >
          {!isMobile && showCountdown && (
            <div ref={countdownRef} style={{ flex: "0 0 auto" }}>
              <CountdownPanel
                deadline={event.registration_end_date}
                registrationUrl={event.registration_url}
              />
            </div>
          )}

          {hasUpcoming && (
            <div
              style={
                measured && upcomingH > 0
                  ? { height: upcomingH, display: "flex", flexDirection: "column" }
                  : { flex: hasResults ? 3 : 1, display: "flex", flexDirection: "column", minHeight: 0 }
              }
            >
              <UpcomingMatchesPanel
                upcoming={upcoming}
                limit={measured ? upcomingLimit : 3}
                isMobile={isMobile}
              />
            </div>
          )}

          {hasResults && (
            <div
              style={
                measured && resultsH > 0
                  ? { height: resultsH, display: "flex", flexDirection: "column" }
                  : { flex: 2, display: "flex", flexDirection: "column", minHeight: 0 }
              }
            >
              <LatestResultsPanel
                finished={finished}
                limit={measured ? resultsLimit : 3}
                isMobile={isMobile}
              />
            </div>
          )}
        </div>
      </div>

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