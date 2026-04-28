"use client";

import { useRef, useState, useEffect } from "react";
import { staggerSlideUp, staggerFadeIn, PAGE_ENTER } from "./shared/Animations";
import Button from "@/components/Button";
import { getYouTubeID } from "@/lib/utils";
import { JK, BB } from "./shared/tokens";
import type { MappedEvent } from "../_types";

export type TabKey = "overview" | "matches" | "participants" | "news";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview",     label: "Overview" },
  { key: "matches",      label: "Matches" },
  { key: "participants", label: "Participants" },
  { key: "news",         label: "News" },
];

// STATUS_LABEL and STATUS_COLOR use the canonical status values produced by
// STATUS_MAP in directus.ts: "upcoming" | "ongoing" | "concluded".
const STATUS_LABEL: Record<string, string> = {
  upcoming:  "Upcoming",
  ongoing:   "On Going",
  concluded: "Concluded",
};
const STATUS_COLOR: Record<string, string> = {
  upcoming:  "rgb(219, 219, 219, 0.2)",
  ongoing:   "rgb(255, 201, 54, 0.2)",
  concluded: "rgb(107, 114, 128, 0.2)",
};
const STATUS_COLOR_OPAQUE: Record<string, string> = {
  upcoming:  "rgb(219, 219, 219, 1)",
  ongoing:   "rgb(255, 201, 54, 1)",
  concluded: "rgb(107, 114, 128, 1)",
};

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ─── ScrollRow ───────────────────────────────────────────────────────────────
// Scrollable flex row with scroll-aware left/right fade masks.
function ScrollRow({
  children,
  style,
  className,
}: {
  children:   React.ReactNode;
  style?:     React.CSSProperties;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      const overflowRight = Math.max(0, scrollWidth - clientWidth - scrollLeft);

      const leftFade  = scrollLeft < 4 ? 0 : Math.min(scrollLeft / 48, 1) * 48;
      const rightFade = overflowRight < 4 ? 0 : Math.min(overflowRight / 48, 1) * 48;

      let mask = "none";
      if (leftFade > 0 && rightFade > 0) {
        mask = `linear-gradient(to right, transparent 0px, black ${leftFade}px, black calc(100% - ${rightFade}px), transparent 100%)`;
      } else if (leftFade > 0) {
        mask = `linear-gradient(to right, transparent 0px, black ${leftFade}px, black 100%)`;
      } else if (rightFade > 0) {
        mask = `linear-gradient(to right, black calc(100% - ${rightFade}px), transparent 100%)`;
      }

      el.style.webkitMaskImage = mask;
      el.style.maskImage = mask;
    };

    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        display:                 "flex",
        alignItems:              "center",
        gap:                     8,
        flexWrap:                "nowrap",
        overflowX:               "auto",
        scrollbarWidth:          "none",
        WebkitOverflowScrolling: "touch",
        padding:                 "4px 8px",
        margin:                  "-4px -8px",
        position:                "relative",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────
interface Props {
  event:        MappedEvent;
  activeTab:    TabKey;
  onTabChange:  (t: TabKey) => void;
  isMobile:     boolean;
  spinnerPhase: "hidden" | "showing" | "fading";
}

export default function EventDetailHeader({
  event,
  activeTab,
  onTabChange,
  isMobile,
  spinnerPhase,
}: Props) {
  const TOP_PAD  = "30px";
  const SIDE_PAD = isMobile ? "20px" : "clamp(20px, 8.33vw, 160px)";
  const PAD      = `${TOP_PAD} ${SIDE_PAD} 36px`;
  const MIN_HERO_HEIGHT = isMobile ? "0px" : "300px";

  // ─── Layout: single-row vs two-row ─────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const probeRef     = useRef<HTMLDivElement>(null);
  const [needsTwoRows, setNeedsTwoRows] = useState(false);

  useEffect(() => {
    const check = () => {
      const probe     = probeRef.current;
      const container = containerRef.current;
      if (!probe || !container) return;
      setNeedsTwoRows(probe.scrollWidth > container.clientWidth);
    };

    check();

    const ro = new ResizeObserver(check);
    if (containerRef.current) ro.observe(containerRef.current);
    if (probeRef.current)     ro.observe(probeRef.current);
    return () => ro.disconnect();
  }, [event]);

  const tabsRef = useRef<Record<string, HTMLButtonElement | null>>({});

  // ─── Scroll selected tab into view ─────────────────────────────────────────
  useEffect(() => {
    const btn = tabsRef.current[activeTab];
    if (!btn || !needsTwoRows) return;

    const container = btn.closest(".tab-scroll") as HTMLDivElement;
    if (!container) return;

    const fadeBuffer       = 48;
    const containerPadding = 8;
    const containerWidth   = container.clientWidth;
    const scrollLeft       = container.scrollLeft;

    const btnLeft  = btn.offsetLeft - containerPadding;
    const btnRight = btnLeft + btn.offsetWidth;

    let targetScroll = scrollLeft;
    if (btnLeft < scrollLeft + fadeBuffer) {
      targetScroll = btnLeft - (btnLeft < 10 ? 0 : fadeBuffer);
    } else if (btnRight > scrollLeft + containerWidth - fadeBuffer) {
      targetScroll = btnRight - containerWidth + fadeBuffer;
    }

    container.scrollTo({ left: targetScroll, behavior: "smooth" });
  }, [activeTab, needsTwoRows]);

  // ─── Keyboard navigation for the tab list (← → Home End) ──────────────────
  // ARIA APG pattern: https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
  const handleTabKeyDown = (e: React.KeyboardEvent, currentIdx: number) => {
    let nextIdx: number | null = null;

    if (e.key === "ArrowRight") nextIdx = (currentIdx + 1) % TABS.length;
    if (e.key === "ArrowLeft")  nextIdx = (currentIdx - 1 + TABS.length) % TABS.length;
    if (e.key === "Home")       nextIdx = 0;
    if (e.key === "End")        nextIdx = TABS.length - 1;

    if (nextIdx !== null) {
      e.preventDefault();
      const nextKey = TABS[nextIdx].key;
      onTabChange(nextKey);
      // Move focus to the newly selected tab button
      tabsRef.current[nextKey]?.focus();
    }
  };

  // ─── Meta ─────────────────────────────────────────────────────────────────
  const meta = [
    { label: "Registration", value: event.registration_end_date ? `Until ${fmtDate(event.registration_end_date)}` : "—" },
    { label: "Dates",        value: event.start_date ? `${fmtDate(event.start_date)} – ${fmtDate(event.end_date)}` : "—" },
    { label: "Location",     value: event.location ?? "—" },
  ];

  const videoId = getYouTubeID(event.url_youtube);

  // ─── Animation delays ─────────────────────────────────────────────────────
  const s = {
    badge:   staggerSlideUp(80,  PAGE_ENTER),
    title:   staggerSlideUp(160, PAGE_ENTER),
    video:   staggerFadeIn( 220, PAGE_ENTER),
    meta:    staggerSlideUp(260, PAGE_ENTER),
    tabRow:  staggerSlideUp(340, PAGE_ENTER),
    actions: staggerFadeIn( 560, PAGE_ENTER),
  };

  // ─── Tab pills — shared between single-row and two-row layouts ────────────
  // role="tablist" + role="tab" satisfies WCAG 2.1 SC 4.1.2.
  // aria-controls points to the tab panel id rendered by each tab component.
  const tabPills = (
    <div
      role="tablist"
      aria-label="Event sections"
      style={{ display: "flex", alignItems: "center", gap: 8 }}
    >
      {TABS.map((t, i) => (
        <button
          key={t.key}
          id={`tab-${t.key}`}
          role="tab"
          aria-selected={activeTab === t.key}
          aria-controls={`tabpanel-${t.key}`}
          tabIndex={activeTab === t.key ? 0 : -1}
          ref={(el) => { tabsRef.current[t.key] = el; }}
          onClick={() => onTabChange(t.key)}
          onKeyDown={(e) => handleTabKeyDown(e, i)}
          style={{
            ...JK,
            fontWeight:   700,
            fontSize:     13,
            padding:      "7px 16px",
            borderRadius: 999,
            border:       "1.5px solid rgba(255,255,255,0.7)",
            background:   activeTab === t.key ? "#fff" : "rgba(255,255,255,0.1)",
            color:        activeTab === t.key ? "#0D26C2" : "#fff",
            cursor:       "pointer",
            transition:   "background 0.2s, color 0.2s",
            flexShrink:   0,
            outline:      "none",
            // Visible focus ring for keyboard users; hidden for mouse users
            // (would ideally be done with :focus-visible in CSS, but inline
            // styles don't support pseudo-classes — use a className if you
            // add a global stylesheet later).
            ...staggerSlideUp(360 + i * PAGE_ENTER.stagger, PAGE_ENTER),
          }}
          // Accessible focus ring via data attr + global CSS (see style tag below)
          data-tab-btn
        >
          {t.label}
        </button>
      ))}

      {spinnerPhase !== "hidden" && (
        <div
          aria-hidden
          role="status"
          aria-live="polite"
          aria-label="Loading tab content"
          style={{
            marginLeft:     4,
            width:          24,
            height:         24,
            borderRadius:   "50%",
            border:         "1px solid rgba(255,255,255,0.2)",
            borderTopColor: "rgba(255,255,255,1)",
            animation:      "tab-spin 0.7s linear infinite",
            flexShrink:     0,
            opacity:        spinnerPhase === "fading" ? 0 : 1,
            transition:     spinnerPhase === "fading" ? "opacity 500ms ease" : "none",
          }}
        />
      )}
    </div>
  );

  // Register button comes first on narrow screens so it's visible without
  // scrolling. This is the only place isMobile still drives ordering.
  const actionButtons = (
    <>
      {isMobile && event.is_registration_open && event.registration_url && (
        <Button href={event.registration_url} variant="header-solid" size="sm" external className="!rounded-[8px] !bg-[#FFC936] !border-[#FFC936]">
          Register
        </Button>
      )}
      {event.guidebook_url && (
        <Button href={event.guidebook_url} variant="header-outline" size="sm" external className="!rounded-[8px]">
          Guidebook
        </Button>
      )}
      {event.instagram_url && (
        <Button href={event.instagram_url} variant="header-outline" size="sm" external className="!rounded-[8px]">
          Instagram
        </Button>
      )}
      {!isMobile && event.is_registration_open && event.registration_url && (
        <Button href={event.registration_url} variant="header-solid" size="sm" external className="!rounded-[8px] !bg-[#FFC936] !border-[#FFC936]">
          Register
        </Button>
      )}
    </>
  );

  return (
    <div style={{
      position:       "relative",
      zIndex:         1,
      minHeight:      MIN_HERO_HEIGHT,
      height:         "auto",
      display:        "flex",
      flexDirection:  "column",
      justifyContent: "flex-end",
      padding:        PAD,
      marginBottom:   16,
      gap:            18,
    }}>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes tab-spin { to { transform: rotate(360deg); } }
        .tab-scroll::-webkit-scrollbar { display: none; }
        [data-tab-btn]:focus-visible {
          outline: 2px solid rgba(255,255,255,0.9);
          outline-offset: 2px;
        }
      `}} />

      {/* ── Status badge ── */}
      <div style={s.badge}>
        <span style={{
          ...JK,
          display:       "inline-block",
          padding:       "4px 12px",
          borderRadius:  8,
          background:    STATUS_COLOR[event.status]        ?? "rgba(107, 114, 128, 0.2)",
          borderColor:   STATUS_COLOR_OPAQUE[event.status] ?? "rgba(107, 114, 128, 1)",
          borderWidth:   1.8,
          borderStyle:   "solid",
          color:         STATUS_COLOR_OPAQUE[event.status] ?? "rgba(107, 114, 128, 1)",
          fontSize:      11,
          fontWeight:    800,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom:  20,
        }}>
          {STATUS_LABEL[event.status] ?? event.status}
        </span>

        {/* ── Title block ── */}
        <div style={{ ...s.title, position: "relative" }}>
          <div style={{
            ...BB,
            filter:        "drop-shadow(2px 4px 6px rgba(0,0,0,0.2))",
            fontSize:      "clamp(3rem, 4.5vw, 4rem)",
            color:         "#fff",
            lineHeight:    1,
            textTransform: "uppercase",
          }}>
            {event.name}
          </div>

          <div style={{
            ...JK,
            fontSize:   "clamp(14px, 1.4vw, 16px)",
            fontWeight: 600,
            color:      "rgba(255,255,255,0.7)",
            filter:     "drop-shadow(2px 4px 6px rgba(0,0,0,0.2))",
            marginTop:  0,
            display:    "flex",
            alignItems: "center",
            gap:        8,
          }}>
            <span style={{ fontStyle: "italic" }}>by</span>
            <span style={{ fontWeight: 700 }}>{event.organiser}</span>
          </div>

          {/* Desktop video — floats right of title block */}
          {!isMobile && videoId && (
            <div style={{
              ...s.video,
              position:     "absolute",
              top:          0,
              right:        0,
              width:        "clamp(320px, 25vw, 330px)",
              aspectRatio:  "16/9",
              borderRadius: 8,
              overflow:     "hidden",
              background:   "#000",
              boxShadow:    "0 10px 40px rgba(0,0,0,0.2)",
              border:       "2px solid rgba(255,255,255,1)",
              zIndex:       10,
            }}>
              <iframe
                title={`${event.name} — YouTube video`}
                width="100%" height="100%"
                src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </div>
      </div>

      {/* Mobile video — inline between title and meta */}
      {isMobile && videoId && (
        <div style={{
          ...s.video,
          width:        "100%",
          aspectRatio:  "16/9",
          borderRadius: 8,
          overflow:     "hidden",
          background:   "#000",
          border:       "2px solid #fff",
          zIndex:       5,
          marginTop:    4,
        }}>
          <iframe
            title={`${event.name} — YouTube video`}
            width="100%" height="100%"
            src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {/* ── Meta strip ── */}
      <div style={{ display: "flex", gap: isMobile ? 20 : 36, flexWrap: "wrap", ...s.meta }}>
        {meta.map((m) => (
          <div key={m.label}>
            <div style={{ ...JK, fontSize: 12, color: "#fff",                  fontWeight: 800, marginTop: 8 }}>{m.label}</div>
            <div style={{ ...JK, fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: 800, marginTop: 2 }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* ── Tab row + action buttons ─────────────────────────────────────────
          Layout driven by overflow detection — no isMobile gate.
          Fits?      → single row: tabs left │ spacer │ actions right
          Overflows? → two rows: each independently scrollable with fades
      ──────────────────────────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        style={{
          marginBottom: -20,
          marginTop:    isMobile ? 16 : 30,
          width:        "100%",
          minWidth:     0,
          overflow:     "visible",
          ...s.tabRow,
        }}
      >
        {/* Hidden probe — measures natural combined width to decide layout */}
        <div
          ref={probeRef}
          aria-hidden
          style={{
            position:      "absolute",
            visibility:    "hidden",
            pointerEvents: "none",
            display:       "flex",
            alignItems:    "center",
            gap:           8,
            flexWrap:      "nowrap",
            whiteSpace:    "nowrap",
          }}
        >
          {TABS.map((t) => (
            <button key={t.key} style={{ ...JK, fontWeight: 700, fontSize: 13, padding: "7px 16px", flexShrink: 0 }}>
              {t.label}
            </button>
          ))}
          <div style={{ width: 32, flexShrink: 0 }} />
          {event.guidebook_url                                   && <button style={{ padding: "7px 16px", flexShrink: 0 }}>Guidebook</button>}
          {event.instagram_url                                   && <button style={{ padding: "7px 16px", flexShrink: 0 }}>Instagram</button>}
          {event.is_registration_open && event.registration_url && <button style={{ padding: "7px 16px", flexShrink: 0 }}>Register</button>}
        </div>

        {/* ── Single-row layout ── */}
        {!needsTwoRows && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              {tabPills}
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ ...s.actions, display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              {actionButtons}
            </div>
          </div>
        )}

        {/* ── Two-row layout ── */}
        {needsTwoRows && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <ScrollRow className="tab-scroll">
              {tabPills}
            </ScrollRow>

            <ScrollRow
              className="tab-scroll"
              style={{ ...s.actions, justifyContent: "flex-start" }}
            >
              {actionButtons}
            </ScrollRow>
          </div>
        )}
      </div>
    </div>
  );
}