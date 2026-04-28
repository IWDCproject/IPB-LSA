"use client";

import { useState, useLayoutEffect, useRef, useMemo } from "react";
import AboutPanel from "../panels/AboutPanel";
import TimelinePanel from "../panels/TimelinePanel";
import CountdownPanel from "../panels/CountdownPanel";
import { UpcomingMatchesPanel, LatestResultsPanel } from "../panels/MatchesPanels";
import LatestStoriesSection from "../panels/LatestStoriesSection";
import { staggerSlideUp, TAB_ENTER, PAGE_ENTER } from "../shared/Animations";
import type { AnimPhase } from "../shared/UseTabTransition";
import type { MappedEvent, TabKey } from "../../_types";

// ─── Layout constants ──────────────────────────────────────────────────────────
// These pixel values are an invisible contract with MatchesPanels.tsx.
// Each one must match the actual rendered height of the corresponding element
// in MatchesPanels. If padding, font size, or line height changes in
// MatchesPanels, update the matching constant here.

/** Height of the DateHeader component in MatchesPanels (font 13px + padding). */
const DATE_H        = 32;
/** PanelCard padding (16px top + 16px bottom) + PanelTitle height (≈25px) = 57px. */
const OVERHEAD_BASE = 57;
/** Footer/"show more" row height at the bottom of UpcomingMatchesPanel/LatestResultsPanel. */
const FOOTER_H      = 20;

/** Default height of a MatchRow in MatchesPanels (no set score). */
const ROW_H_DEFAULT      = 52;
/** Height of a MatchRow that shows a set-score breakdown. */
const ROW_H_SETS_DEFAULT = 64;

// ─── Layout math ──────────────────────────────────────────────────────────────

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

  let used = 0, lastDate = "", count = 0;
  for (const m of matches) {
    const d    = m.scheduled_at?.split("T")[0] ?? "~";
    const cost = (d !== lastDate ? DATE_H : 0) + getRowH(m);
    if (used + cost > budget) break;
    used += cost; lastDate = d; count++;
  }
  if (count >= matches.length) return count;

  used = 0; lastDate = ""; count = 0;
  const b2 = budget - FOOTER_H;
  for (const m of matches) {
    const d    = m.scheduled_at?.split("T")[0] ?? "~";
    const cost = (d !== lastDate ? DATE_H : 0) + getRowH(m);
    if (used + cost > b2) break;
    used += cost; lastDate = d; count++;
  }

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
  panelGap:     number,
  getRowH:      (m: any) => number,
) {
  return useMemo(() => {
    const FALLBACK = { upcomingH: 0, resultsH: 0, upcomingLimit: 3, resultsLimit: 3 };
    if (isMobile || anchorHeight <= 0) return FALLBACK;

    const hasUpcoming = upcoming.length > 0;
    const hasResults  = finished.length > 0;
    if (!hasUpcoming && !hasResults) return FALLBACK;

    const cdGap      = countdownH > 0 ? panelGap : 0;
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

    const bothAvail = totalAvail - panelGap;
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

    // ── FIX: use per-panel slack, not combined (totalSlack) ───────────────────
    //
    // Bug: the old code computed totalSlack = upSlack + resSlack, then allowed
    // upLimit++ even when upSlack alone was insufficient. This caused upH to
    // grow beyond upBudget by consuming resH's slack — silently making
    // upH + gap + resH > bothAvail, so the right column overflowed anchorHeight.
    // That pushed the right column taller than the left, and the About panel
    // (which couldn't grow — see wrapper fix below) failed to close the gap.
    //
    // Fix: only bump a panel's row count when THAT panel has enough slack.
    // This keeps upH + gap + resH <= bothAvail at all times.
    {
      const upContentH  = OVERHEAD_BASE + rowsHeight(upcoming, upLimit,  getRowH);
      const resContentH = OVERHEAD_BASE + rowsHeight(finished, resLimit, getRowH);
      const upSlack     = Math.max(0, upH  - upContentH);
      const resSlack    = Math.max(0, resH - resContentH);
      const upNext      = nextRowCost(upcoming, upLimit,  getRowH);
      const resNext     = nextRowCost(finished, resLimit, getRowH);

      if (upNext <= resNext && upSlack >= upNext * 0.3) {
        upLimit++;
        upH = Math.max(upH, OVERHEAD_BASE + rowsHeight(upcoming, upLimit, getRowH));
      } else if (resNext < upNext && resSlack >= resNext * 0.3) {
        resLimit++;
        resH = Math.max(resH, OVERHEAD_BASE + rowsHeight(finished, resLimit, getRowH));
      }
    }

    return { upcomingH: upH, resultsH: resH, upcomingLimit: upLimit, resultsLimit: resLimit };
  }, [upcoming, finished, anchorHeight, countdownH, isMobile, panelGap, getRowH]);
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  event:       MappedEvent;
  isMobile:    boolean;
  phase:       AnimPhase;
  onTabChange: (t: TabKey) => void;
}

export default function OverviewTab({ event, isMobile, phase, onTabChange }: Props) {
  const [anchorHeight,    setAnchorHeight]    = useState(0);
  const [countdownHeight, setCountdownHeight] = useState(0);
  const [upRowH,          setUpRowH]          = useState(ROW_H_DEFAULT);
  const [resRowH,         setResRowH]         = useState(ROW_H_SETS_DEFAULT);

  const leftColRef     = useRef<HTMLDivElement>(null);
  const countdownRef   = useRef<HTMLDivElement>(null);
  const upContentRef   = useRef<HTMLDivElement>(null);
  const resContentRef  = useRef<HTMLDivElement>(null);
  const upFirstRowRef  = useRef<HTMLDivElement>(null);
  const resFirstRowRef = useRef<HTMLDivElement>(null);

  const PANEL_GAP = isMobile ? 4 : 8;
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
    // ResizeObserver on the left column fires whenever the column's own width
    // changes — the window resize listener was redundant and couldn't detect
    // container-width changes independently of window size.
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(measure);
    });
    ro.observe(el);
    document.fonts?.ready.then(measure);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, [isMobile]);

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
    PANEL_GAP,
    getRowH,
  );

  const measured = !isMobile && anchorHeight > 0;

  // ─── Panel stagger styles ────────────────────────────────────────────────
  const tier = TAB_ENTER;

  const s0 = staggerSlideUp(0,                tier);
  const s1 = staggerSlideUp(tier.stagger,     tier);
  const s2 = staggerSlideUp(tier.stagger * 2, tier);
  const s3 = staggerSlideUp(tier.stagger * 3, tier);
  const s4 = staggerSlideUp(tier.stagger * 4, tier);
  const s5 = staggerSlideUp(tier.stagger * 5, tier);

  const panelStyle = (s: React.CSSProperties) =>
    phase === "entering" ? s : {};

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        style={{
          display:             "grid",
          // minmax(0,1fr) on mobile: the 0 minimum stops the grid cell from inflating
          // to fit the min-content of deeply-nested children (e.g. the scrollable
          // timeline rail). Without this, `1fr` = `minmax(auto,1fr)` and the cell
          // expands to accommodate any child's minWidth, defeating overflow/scroll.
          gridTemplateColumns: isMobile ? "minmax(0, 1fr)" : "3fr 2fr",
          gap:                 PANEL_GAP,
          alignItems:          "stretch",
        }}
      >
        {/* Left column */}
        <div
          ref={leftColRef}
          style={{ display: "flex", flexDirection: "column", gap: PANEL_GAP }}
        >
          {isMobile && showCountdown && (
            <div style={panelStyle(s0)}>
              <CountdownPanel
                deadline={event.registration_end_date}
                registrationUrl={event.registration_url}
              />
            </div>
          )}

          {/*
           * FIX: The wrapper around AboutPanel must be:
           *   • a flex child that CAN GROW  →  flex: "1 1 auto"
           *   • a flex container itself     →  display: flex / flexDirection: column
           *
           * Why flex-basis: auto (not 0)?
           *   The measurement loop temporarily sets alignSelf: "start" on the
           *   left column to read its natural height. With flex-basis: 0, the
           *   wrapper collapses to 0px in that mode, understating anchorHeight
           *   and making the right panels too short. flex-basis: auto uses the
           *   wrapper's content height as the base, so measurement is correct.
           *
           * Why display: flex on the wrapper?
           *   AboutPanel's CARD already declares flex: 1. flex: 1 only takes
           *   effect when the parent is a flex container. Without this, the card
           *   ignores the extra height given by flex-grow and stays content-sized.
           *
           * End result: when the grid stretches the left column to match a taller
           * right column (e.g. extra match row), this wrapper absorbs the delta
           * and AboutPanel's card fills it — both columns are flush at the bottom.
           */}
          <div
            style={{
              flex:          "1 1 auto",
              display:       "flex",
              flexDirection: "column",
              minHeight:     0,
              ...panelStyle(isMobile && showCountdown ? s1 : s0),
            }}
          >
            <AboutPanel event={event} isMobile={isMobile} />
          </div>

          <div style={panelStyle(isMobile && showCountdown ? staggerSlideUp(tier.stagger * 2, tier) : s1)}>
            <TimelinePanel phases={event.phases ?? []} />
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: PANEL_GAP }}>
          {!isMobile && showCountdown && (
            <div ref={countdownRef} style={{ flex: "0 0 auto", ...panelStyle(s2) }}>
              <CountdownPanel
                deadline={event.registration_end_date}
                registrationUrl={event.registration_url}
              />
            </div>
          )}

          {hasUpcoming && (
            <div
              style={{
                ...(measured && upcomingH > 0
                  ? { height: upcomingH, display: "flex", flexDirection: "column" }
                  : isMobile
                    ? { display: "flex", flexDirection: "column" }
                    : { flex: hasResults ? 3 : 1, display: "flex", flexDirection: "column", minHeight: 0 }),
                ...panelStyle(!isMobile && showCountdown ? s3 : s2),
              }}
            >
              <UpcomingMatchesPanel
                upcoming={upcoming}
                limit={isMobile ? Math.min(upcoming.length, 5) : (measured ? upcomingLimit : 3)}
                isMobile={isMobile}
                contentRef={upContentRef}
                firstRowRef={upFirstRowRef}
                onTabChange={() => onTabChange("matches")}
              />
            </div>
          )}

          {hasResults && (
            <div
              style={{
                ...(measured && resultsH > 0
                  ? { height: resultsH, display: "flex", flexDirection: "column" }
                  : isMobile
                    ? { display: "flex", flexDirection: "column" }
                    : { flex: 2, display: "flex", flexDirection: "column", minHeight: 0 }),
                ...panelStyle(!isMobile && showCountdown ? s4 : s3),
              }}
            >
              <LatestResultsPanel
                finished={finished}
                limit={isMobile ? Math.min(finished.length, 5) : (measured ? resultsLimit : 3)}
                isMobile={isMobile}
                contentRef={resContentRef}
                firstRowRef={resFirstRowRef}
                onTabChange={() => onTabChange("matches")}
              />
            </div>
          )}
        </div>
      </div>

      {event.news?.length > 0 && (
        <div style={panelStyle(s5)}>
          <LatestStoriesSection
            news={event.news}
            eventSlug={event.slug}
            isMobile={isMobile}
            onTabChange={onTabChange}
          />
        </div>
      )}
    </div>
  );
}