"use client";
import { useState, useLayoutEffect, useRef, useMemo } from "react";
import AboutPanel from "./AboutPanel";
import TimelinePanel from "./TimelinePanel";
import CountdownPanel from "./CountdownPanel";
import { UpcomingMatchesPanel, LatestResultsPanel } from "./MatchesPanels";
import LatestStoriesSection from "./LatestStoriesSection";

const PANEL_GAP     = 16;
const DATE_H        = 32;
const OVERHEAD_BASE = 57;
const FOOTER_H      = 20;

// Static fallbacks used before first measurement.
// These only affect the very first render frame.
const ROW_H_DEFAULT      = 52;
const ROW_H_SETS_DEFAULT = 64; // generous upper bound so first frame never clips

// Cost of the next row after `count` shown (includes date-header if date changes).
function nextRowCost(matches: any[], count: number, getRowH: (m: any) => number): number {
  if (count >= matches.length) return Infinity;
  const prevDate = count > 0 ? (matches[count - 1].scheduled_at?.split("T")[0] ?? "~") : "";
  const next     = matches[count];
  const nextDate = next.scheduled_at?.split("T")[0] ?? "~";
  return (nextDate !== prevDate ? DATE_H : 0) + getRowH(next);
}

function naturalRowH(matches: any[], getRowH: (m: any) => number): number {
  let h = 0, lastDate = "";
  for (const m of matches) {
    const d = m.scheduled_at?.split("T")[0] ?? "~";
    if (d !== lastDate) { h += DATE_H; lastDate = d; }
    h += getRowH(m);
  }
  return h;
}

function rowsHeight(matches: any[], count: number, getRowH: (m: any) => number): number {
  let h = 0, lastDate = "";
  const n = Math.min(count, matches.length);
  for (let i = 0; i < n; i++) {
    const m = matches[i];
    const d = m.scheduled_at?.split("T")[0] ?? "~";
    if (d !== lastDate) { h += DATE_H; lastDate = d; }
    h += getRowH(m);
  }
  return h + (count < matches.length ? FOOTER_H : 0);
}

function fitRows(matches: any[], budget: number, getRowH: (m: any) => number): number {
  if (!matches.length || budget <= 0) return 0;

  // Step 1 — no footer cost
  let used = 0, lastDate = "", count = 0;
  for (const m of matches) {
    const d    = m.scheduled_at?.split("T")[0] ?? "~";
    const cost = (d !== lastDate ? DATE_H : 0) + getRowH(m);
    if (used + cost > budget) break;
    used += cost; lastDate = d; count++;
  }
  if (count >= matches.length) return count;

  // Step 2 — reserve footer
  used = 0; lastDate = ""; count = 0;
  const b2 = budget - FOOTER_H;
  for (const m of matches) {
    const d    = m.scheduled_at?.split("T")[0] ?? "~";
    const cost = (d !== lastDate ? DATE_H : 0) + getRowH(m);
    if (used + cost > b2) break;
    used += cost; lastDate = d; count++;
  }

  // Step 3 — greedy: if gap >= 50% of next row's actual cost, add one more
  if (count < matches.length) {
    const next     = matches[count];
    const nextDate = next.scheduled_at?.split("T")[0] ?? "~";
    const nextCost = (nextDate !== lastDate ? DATE_H : 0) + getRowH(next);
    if (b2 - used >= nextCost * 0.5) count++;
  }

  return Math.max(1, count);
}

function useRightColumnLayout(
  upcoming:     any[],
  finished:     any[],
  anchorHeight: number,
  countdownH:   number,
  isMobile:     boolean,
  getRowH:      (m: any) => number,
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
      const limit    = fitRows(finished, totalAvail - OVERHEAD_BASE, getRowH);
      const contentH = OVERHEAD_BASE + rowsHeight(finished, limit, getRowH);
      return { upcomingH: 0, resultsH: Math.max(totalAvail, contentH), upcomingLimit: 0, resultsLimit: limit };
    }

    if (!hasResults) {
      const limit    = fitRows(upcoming, totalAvail - OVERHEAD_BASE, getRowH);
      const contentH = OVERHEAD_BASE + rowsHeight(upcoming, limit, getRowH);
      return { upcomingH: Math.max(totalAvail, contentH), resultsH: 0, upcomingLimit: limit, resultsLimit: 0 };
    }

    const bothAvail = totalAvail - PANEL_GAP;
    const upNat  = OVERHEAD_BASE + naturalRowH(upcoming, getRowH);
    const resNat = OVERHEAD_BASE + naturalRowH(finished, getRowH);
    const p60    = Math.round(bothAvail * 0.6);
    const p40    = bothAvail - p60;

    let upBudget: number, resBudget: number;
    if (upNat + resNat <= bothAvail) {
      resBudget = resNat; upBudget = bothAvail - resBudget;
    } else if (upNat <= p60) {
      upBudget = upNat; resBudget = bothAvail - upBudget;
    } else if (resNat <= p40) {
      resBudget = resNat; upBudget = bothAvail - resBudget;
    } else {
      upBudget = p60; resBudget = p40;
    }

    let upLimit  = fitRows(upcoming, upBudget  - OVERHEAD_BASE, getRowH);
    let resLimit = fitRows(finished, resBudget - OVERHEAD_BASE, getRowH);
    let upH  = Math.max(upBudget,  OVERHEAD_BASE + rowsHeight(upcoming, upLimit,  getRowH));
    let resH = Math.max(resBudget, OVERHEAD_BASE + rowsHeight(finished, resLimit, getRowH));

    // Cross-panel greedy: pool the leftover space from both panels.
    // Each individual gap may be under threshold, but combined they may cover
    // another row. Add it to whichever panel's next row is cheaper.
    {
      const upContentH  = OVERHEAD_BASE + rowsHeight(upcoming, upLimit,  getRowH);
      const resContentH = OVERHEAD_BASE + rowsHeight(finished, resLimit, getRowH);
      const totalSlack  = Math.max(0, upH - upContentH) + Math.max(0, resH - resContentH);
      const upNext      = nextRowCost(upcoming, upLimit,  getRowH);
      const resNext     = nextRowCost(finished, resLimit, getRowH);

      if (upNext <= resNext && totalSlack >= upNext * 0.3) {
        upLimit++;
        upH = Math.max(upH, OVERHEAD_BASE + rowsHeight(upcoming, upLimit, getRowH));
      } else if (resNext < upNext && totalSlack >= resNext * 0.3) {
        resLimit++;
        resH = Math.max(resH, OVERHEAD_BASE + rowsHeight(finished, resLimit, getRowH));
      }
    }

    return { upcomingH: upH, resultsH: resH, upcomingLimit: upLimit, resultsLimit: resLimit };
  }, [upcoming, finished, anchorHeight, countdownH, isMobile, getRowH]);
}

export default function OverviewTab({ event, isMobile }: { event: any; isMobile: boolean }) {
  const [anchorHeight,    setAnchorHeight]    = useState(0);
  const [countdownHeight, setCountdownHeight] = useState(0);
  const [upRowH,          setUpRowH]          = useState(ROW_H_DEFAULT);
  const [resRowH,         setResRowH]         = useState(ROW_H_SETS_DEFAULT);

  const leftColRef      = useRef<HTMLDivElement>(null);
  const countdownRef    = useRef<HTMLDivElement>(null);
  const upContentRef    = useRef<HTMLDivElement>(null);
  const resContentRef   = useRef<HTMLDivElement>(null);
  // Measure a single row's offsetHeight — immune to parent flex-stretch,
  // unlike scrollHeight on a flex:1 child which returns the stretched size.
  const upFirstRowRef   = useRef<HTMLDivElement>(null);
  const resFirstRowRef  = useRef<HTMLDivElement>(null);

  const upcoming      = (event.matches ?? []).filter((m: any) => m.status === "upcoming" || m.status === "live");
  const finished      = (event.matches ?? []).filter((m: any) => m.status === "finished");
  const showCountdown = !!(event.is_registration_open && event.registration_end_date);
  const hasResults    = finished.length > 0;
  const hasUpcoming   = upcoming.length > 0;

  useLayoutEffect(() => {
    if (isMobile) return;
    const el = leftColRef.current;
    if (!el) return;

    const measure = () => {
      const prev = el.style.alignSelf;
      el.style.alignSelf = "start";
      const h = el.offsetHeight;
      el.style.alignSelf = prev;
      setAnchorHeight(curr => curr !== h ? h : curr);

      const cd = countdownRef.current;
      if (cd) {
        const ch = cd.offsetHeight;
        setCountdownHeight(curr => curr !== ch ? ch : curr);
      }

      // Measure actual row heights from the first rendered row's offsetHeight.
      // offsetHeight on a specific element is the browser's real layout height,
      // never affected by parent flex-grow stretching (unlike scrollHeight).
      const upRowEl = upFirstRowRef.current;
      if (upRowEl) {
        const h = upRowEl.offsetHeight;
        if (h > 0) setUpRowH(prev => prev !== h ? h : prev);
      }

      const resRowEl = resFirstRowRef.current;
      if (resRowEl) {
        const h = resRowEl.offsetHeight;
        if (h > 0) setResRowH(prev => prev !== h ? h : prev);
      }
    };

    measure();

    let rafId = 0;
    const onResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(measure);
    };
    window.addEventListener("resize", onResize);
    document.fonts?.ready.then(measure);

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafId);
    };
  }, [isMobile]);

  // Stable function reference — only recreated when measured heights change.
  const getRowH = useMemo(
    () => (m: any) => m.status === "finished" ? resRowH : upRowH,
    [upRowH, resRowH],
  );

  const { upcomingH, resultsH, upcomingLimit, resultsLimit } = useRightColumnLayout(
    upcoming,
    finished,
    anchorHeight,
    showCountdown && !isMobile ? countdownHeight : 0,
    isMobile,
    getRowH,
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

        <div style={{ display: "flex", flexDirection: "column", gap: PANEL_GAP }}>
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
                contentRef={upContentRef}
                firstRowRef={upFirstRowRef}
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
                contentRef={resContentRef}
                firstRowRef={resFirstRowRef}
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