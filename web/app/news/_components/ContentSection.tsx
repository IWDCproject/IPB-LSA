"use client";

import { useState, useRef, useCallback } from "react";
import AllNewsTab from "./AllNewsTab";
import EventHighlightTab, { type EventWithNews } from "./EventHighlightTab";
import { JK, YELLOW, BLUE, NAVY } from "./_newsConstants";
import type { EventOption } from "./_newsTypes";

type ContentTab = "byEvent" | "allNews";

interface Props {
  events:   EventWithNews[];
  isMobile: boolean;
  pad:      number;
}

// --- Tab definitions ----------------------------------------------------------

const TABS: { key: ContentTab; label: string; icon: React.ReactNode }[] = [
  {
    key: "byEvent",
    label: "Highlights Event",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    key: "allNews",
    label: "Semua Berita",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
        <path d="M18 14h-8M15 18h-5M10 6h8v4h-8V6Z"/>
      </svg>
    ),
  },
];

// --- Tab bar CSS --------------------------------------------------------------
// Trapezoid tab shape via perspective transform - no SVG/pseudo-element hacks.

const TAB_BAR_CSS = `
  .cs-tab-rail {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    z-index: 0;
  }
  .cs-tab-bar {
    display: flex;
    align-items: flex-end;
    position: absolute;
    top: 0;
    transform: translateY(-99%);
    width: 100%;
  }
  .cs-tab {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 40px;
    height: 44px;
    cursor: pointer;
    border: none;
    background: transparent;
    margin-right: -15px;
    transition: height 0.1s ease-out;
    outline: none;
    z-index: 1;
  }
  .cs-tab::before {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(30, 50, 195, 0.4);
    border-radius: 12px 12px 0 0;
    transform: perspective(100px) rotateX(25deg) translateY(10px);
    transform-origin: bottom;
    transition: background 0.1s ease-out, transform 0.1s ease-out;
  }
  .cs-tab.cs-active {
    height: 52px;
    z-index: 10;
  }
  .cs-tab.cs-active::before {
    background: ${BLUE};
    transform: perspective(100px) rotateX(25deg) translateY(0px);
  }
  .cs-tab-content {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    color: rgba(255,255,255,0.5);
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-weight: 800;
    font-size: 13px;
    pointer-events: none;
    transform: translateY(10px);
    transition: transform 0.1s ease-out, color 0.1s ease-out;
  }
  .cs-active .cs-tab-content {
    color: #fff;
    transform: translateY(2px);
  }
  .cs-tab-icon { color: rgba(255,255,255,0.25); }
  .cs-active .cs-tab-icon { color: ${YELLOW}; }
  @media (max-width: 768px) {
    .cs-tab { padding: 0 25px; height: 38px; }
    .cs-tab.cs-active { height: 44px; }
    .cs-tab-content { font-size: 11px; }
  }
`;

// --- Main ---------------------------------------------------------------------

export default function ContentSection({ events, isMobile, pad }: Props) {
  const [activeTab, setActiveTab] = useState<ContentTab>("byEvent");
  const contentRef = useRef<HTMLDivElement>(null);
  const unlockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lockedH, setLockedH] = useState<number | undefined>();

  const handleTabChange = useCallback((tab: ContentTab) => {
    if (tab === activeTab) return;

    // Lock current height so the page doesn't shrink during tab switch,
    // which would cause the browser to clamp scroll position (the jump bug).
    if (contentRef.current) {
      setLockedH(contentRef.current.offsetHeight);
    }
    setActiveTab(tab);

    // Release after new content has had time to start rendering.
    if (unlockTimer.current) clearTimeout(unlockTimer.current);
    unlockTimer.current = setTimeout(() => setLockedH(undefined), 800);
  }, [activeTab]);

  const eventOptions: EventOption[] = events.map(e => ({
    id: e.id, name: e.name, slug: e.slug, status: e.status,
  }));

  return (
    <section style={{
      background: `linear-gradient(to bottom, ${BLUE} 0%, ${NAVY} 100%)`,
      position: "relative",
      zIndex: 1,
    }}>
      <style dangerouslySetInnerHTML={{ __html: TAB_BAR_CSS }} />

      {/* Rail - full-width top stroke */}
      <div className="cs-tab-rail" />

      {/* Batik overlay */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 500,
        backgroundImage: "url(/Batik_Pattern_dark.svg)",
        backgroundSize: "1600px auto", backgroundRepeat: "repeat-x",
        backgroundPosition: "top center", opacity: 0.18, pointerEvents: "none",
      }} />

      {/* Tab bar */}
      <div className="cs-tab-bar" style={{ paddingLeft: pad }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`cs-tab ${activeTab === tab.key ? "cs-active" : ""}`}
          >
            <div className="cs-tab-content">
              <span className="cs-tab-icon">{tab.icon}</span>
              {tab.label}
            </div>
          </button>
        ))}
      </div>

      {/* Mask to hide tab overlap at the very top edge */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        height: 10, zIndex: 3,
        background: BLUE,
        pointerEvents: "none",
      }} />

      {/* Tab content - height locked during switches to prevent scroll jump */}
      <div
        ref={contentRef}
        style={{
          position: "relative", zIndex: 2,
          minHeight: lockedH,
          transition: lockedH ? "none" : undefined,
        }}
      >
        {/* key remounts on every switch → triggers np-in animation */}
        <div key={activeTab} style={{ animation: "np-in 0.35s ease both" }}>
          {activeTab === "byEvent" && (
            <EventHighlightTab
              events={events}
              isMobile={isMobile}
              pad={pad}
            />
          )}

          {activeTab === "allNews" && (
            <div style={{
              paddingLeft: pad, paddingRight: pad,
              paddingTop: isMobile ? 32 : 44,
              paddingBottom: 60,
            }}>
              <AllNewsTab events={eventOptions} isMobile={isMobile} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}