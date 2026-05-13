"use client";

import { useState, useLayoutEffect, useRef } from "react";
import AboutPanel from "../panels/AboutPanel";
import TimelinePanel from "../panels/TimelinePanel";
import CountdownPanel from "../panels/CountdownPanel";
import { UpcomingMatchesPanel, LatestResultsPanel } from "../panels/MatchesPanels";
import LatestStoriesSection from "../panels/LatestStoriesSection";
import { staggerSlideUp, TAB_ENTER } from "../shared/Animations";
import type { AnimPhase } from "../shared/UseTabTransition";
import type { MappedEvent, TabKey } from "../../_types";
import { calculateGreedyLayout } from "./layoutEngine";

// --- Types --------------------------------------------------------------------

interface Props {
  event?:       MappedEvent | null;
  loading?:     boolean;
  isMobile:    boolean;
  phase?:       AnimPhase;
  onTabChange?: (t: TabKey) => void;
}

// --- OverviewTab --------------------------------------------------------------
//
// Desktop layout strategy:
//   1. Measure the left column's NATURAL height (with alignSelf:start so the
//      right column doesn't inflate it). This is the only JS measurement needed.
//   2. Set the right column to that exact height explicitly. This gives the
//      overflow:hidden panels a real bounded height to clip against.
//   3. Inside the right column, CSS flex weights (3:2) distribute the space.
//      No row-height pixel math, no hardcoded constants.
//   4. Each panel renders ALL its rows. overflow:hidden clips what doesn't fit.
//      After each paint, the panel counts actually-visible rows via
//      getBoundingClientRect() and shows the correct "N more" footer.

export default function OverviewTab({ 
  event, 
  loading = false,
  isMobile, 
  phase = "entering", 
  onTabChange = () => {} 
}: Props) {
  const PANEL_GAP = isMobile ? 4 : 8;

  const upcoming      = !loading && event ? (event.matches ?? []).filter((m: any) => m.status === "upcoming" || m.status === "live") : [];
  const finished      = !loading && event ? (event.matches ?? []).filter((m: any) => m.status === "finished") : [];
  const showCountdown = !loading && event ? !!(event.is_registration_open && event.registration_end_date) : false;
  
  const hasUpcoming   = loading || upcoming.length > 0;
  const hasResults    = loading || finished.length > 0;
  const displayCountdown = loading || showCountdown;

  const skeletonPanel = "bg-white/5 rounded-2xl p-6 border border-white/10 animate-pulse";
  const skeletonItem  = "h-4 bg-white/10 rounded border border-white/5";

  // -- Height measurement ------------------------------------------------------
  // We only need two measurements: left column natural height, and countdown
  // panel height (so the match panels share the remaining space correctly).
  // Everything else is handled by CSS flex inside the right column.

  const [layoutState, setLayoutState] = useState({ 
    measuredWidth: -1, isMeasuring: true, upCount: -1, lateCount: -1 
  });

  const leftColRef   = useRef<HTMLDivElement>(null);
  const countdownRef = useRef<HTMLDivElement>(null);
  const upRef        = useRef<HTMLDivElement>(null);
  const lateRef      = useRef<HTMLDivElement>(null);

  // Pass 1: Watch width resizes and trigger an invisible measurement reset
  useLayoutEffect(() => {
    if (isMobile) return;
    const el = leftColRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      setLayoutState(prev => prev.measuredWidth !== w 
        ? { ...prev, measuredWidth: w, isMeasuring: true, upCount: -1, lateCount: -1 } 
        : prev
      );
    });
    ro.observe(el);
    return () => ro.disconnect();
  },[isMobile]);

  // Pass 2: Synchronous DOM Measurement (Runs invisibly before paint!)
  useLayoutEffect(() => {
    if (isMobile || !layoutState.isMeasuring) return;
    const el = leftColRef.current;
    if (!el) return;

    const prevAlign = el.style.alignSelf;
    const prevMinH  = el.style.minHeight;
    el.style.alignSelf = "start";
    el.style.minHeight = "0px";

    const upPrevDisp = upRef.current?.style.display;
    const latePrevDisp = lateRef.current?.style.display;
    if (upRef.current) upRef.current.style.display = "none";
    if (lateRef.current) lateRef.current.style.display = "none";

    void el.offsetHeight; // Force reflow
    const leftH = el.offsetHeight;
    const cdH   = countdownRef.current?.offsetHeight || 0;
    const availH = leftH - cdH - (showCountdown && cdH > 0 ? PANEL_GAP : 0);

    if (upRef.current) upRef.current.style.display = upPrevDisp || "";
    if (lateRef.current) lateRef.current.style.display = latePrevDisp || "";
    void el.offsetHeight; 

    const extractPanelData = (panelEl: HTMLElement | null) => {
      if (!panelEl) return null;
      const container = panelEl.querySelector('[data-panel-container]') as HTMLElement;
      const content   = panelEl.querySelector('[data-panel-content]') as HTMLElement;
      const header    = panelEl.querySelector('[data-panel-header]') as HTMLElement;
      if (!container || !content || !header) return null;

      const comp = window.getComputedStyle(container);
      const baseH = (parseFloat(comp.paddingTop) || 0) + header.offsetHeight + (parseFloat(window.getComputedStyle(header).marginBottom) || 0) + (parseFloat(comp.paddingBottom) || 0);

      const items: { height: number, isLive: boolean }[] =[];
      let cost = 0;
      
      content.querySelectorAll('[data-date-header],[data-match-row]').forEach(child => {
        const htmlChild = child as HTMLElement;
        if (htmlChild.hasAttribute('data-date-header')) cost += htmlChild.offsetHeight;
        else {
          const mb = parseFloat(window.getComputedStyle(htmlChild).marginBottom) || 0;
          items.push({ height: cost + htmlChild.offsetHeight + mb, isLive: htmlChild.hasAttribute('data-is-live') });
          cost = 0;
        }
      });
      return { baseH, items, footerH: 28 };
    };

    const res = calculateGreedyLayout(availH, extractPanelData(upRef.current), extractPanelData(lateRef.current), PANEL_GAP, 28);

    el.style.alignSelf = prevAlign;
    el.style.minHeight = prevMinH;

    setLayoutState(prev => ({ ...prev, isMeasuring: false, upCount: res.upCount, lateCount: res.lateCount }));
  },[isMobile, layoutState.isMeasuring, displayCountdown, event?.matches?.length]);


  // Stagger animation helpers
  const s0 = staggerSlideUp(0,                    TAB_ENTER);
  const s1 = staggerSlideUp(TAB_ENTER.stagger,     TAB_ENTER);
  const s2 = staggerSlideUp(TAB_ENTER.stagger * 2, TAB_ENTER);
  const s3 = staggerSlideUp(TAB_ENTER.stagger * 3, TAB_ENTER);
  const s4 = staggerSlideUp(TAB_ENTER.stagger * 4, TAB_ENTER);
  const s5 = staggerSlideUp(TAB_ENTER.stagger * 5, TAB_ENTER);

  const panelStyle = (s: React.CSSProperties) => phase === "entering" ? s : {};

  return (
    <div className="flex flex-col gap-5">
      <div
        className="grid items-stretch"
        style={{ gridTemplateColumns: isMobile ? "minmax(0, 1fr)" : "3fr 2fr", gap: PANEL_GAP }}
      >
        {/* -- Left column -- */}
        <div ref={leftColRef} className={`flex flex-col h-full ${isMobile ? "gap-1" : "gap-2"}`}>
          {isMobile && displayCountdown && (
            <div style={panelStyle(s0)}>
              {loading || !event ? (
                <div className={`h-[120px] ${skeletonPanel}`} />
              ) : (
                <CountdownPanel deadline={event.registration_end_date!} registrationUrl={event.registration_url} />
              )}
            </div>
          )}

          <div className="flex-1 flex flex-col min-h-0" style={panelStyle(isMobile && displayCountdown ? s1 : s0)}>
            {loading || !event ? (
              <div className={`flex-1 ${skeletonPanel}`}>
                <div className="h-8 w-48 bg-white/10 rounded mb-6" />
                <div className="space-y-4">
                  <div className={skeletonItem} />
                  <div className={`w-5/6 ${skeletonItem}`} />
                  <div className={`w-4/6 ${skeletonItem}`} />
                </div>
              </div>
            ) : (
              <AboutPanel event={event} isMobile={isMobile} />
            )}
          </div>

          <div style={panelStyle(isMobile && displayCountdown ? s2 : s1)}>
            {loading || !event ? (
              <div className={`h-[200px] ${skeletonPanel}`} />
            ) : (
              <TimelinePanel phases={event.phases ?? []} isMobile={isMobile} />
            )}
          </div>
        </div>

        {/* -- Right column -- */}
        <div className={`flex flex-col h-full ${isMobile ? "gap-1" : "gap-2"}`}>
          {!isMobile && displayCountdown && (
            <div ref={countdownRef} className="flex-none" style={panelStyle(s2)}>
              {loading || !event ? (
                <div className={`h-[120px] ${skeletonPanel}`} />
              ) : (
                <CountdownPanel deadline={event.registration_end_date!} registrationUrl={event.registration_url} />
              )}
            </div>
          )}

          <div className="flex-1 flex flex-col" style={{ gap: PANEL_GAP }}>
            {hasUpcoming && (
              <div ref={upRef} className="flex flex-col flex-1" style={panelStyle(!isMobile && displayCountdown ? s3 : s2)}>
                {loading || !event ? (
                  <div className={`flex-1 ${skeletonPanel}`} />
                ) : (
                  <UpcomingMatchesPanel 
                     upcoming={upcoming} 
                     isMobile={isMobile} 
                     desktopLimit={layoutState.upCount} 
                     onTabChange={() => onTabChange("matches")} 
                  />
                )}
              </div>
            )}

            {hasResults && (
              <div ref={lateRef} className="flex flex-col flex-1" style={panelStyle(!isMobile && displayCountdown ? s4 : s3)}>
                {loading || !event ? (
                  <div className={`flex-1 ${skeletonPanel}`} />
                ) : (
                  <LatestResultsPanel 
                     finished={finished} 
                     isMobile={isMobile} 
                     desktopLimit={layoutState.lateCount} 
                     onTabChange={() => onTabChange("matches")} 
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {(loading || (event && event.news?.length > 0)) && (
        <div style={panelStyle(s5)}>
          {loading || !event ? (
            <div className={`h-[300px] ${skeletonPanel}`} />
          ) : (
            <LatestStoriesSection news={event.news} eventSlug={event.slug} isMobile={isMobile} onTabChange={onTabChange!} />
          )}
        </div>
      )}
    </div>
  );
}

