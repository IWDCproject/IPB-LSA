"use client";

import { useRef, useState, useEffect } from "react";
import { staggerSlideUp, staggerFadeIn, PAGE_ENTER } from "./shared/Animations";
import Button from "@/components/Button";
import { getYouTubeID } from "@/lib/utils";
import type { MappedEvent } from "../_types";

export type TabKey = "overview" | "matches" | "participants" | "news";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview",     label: "Overview" },
  { key: "matches",      label: "Matches" },
  { key: "participants", label: "Participants" },
  { key: "news",         label: "News" },
];

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
// Mask image is set imperatively via the DOM — must stay in JS.
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
      className={`flex items-center gap-2 flex-nowrap overflow-x-auto relative ${className ?? ""}`}
      style={{
        // Static pixel values kept in style to avoid Tailwind purge concerns with
        // negative margin. WebkitOverflowScrolling and scrollbarWidth have no
        // Tailwind equivalent.
        scrollbarWidth:          "none",
        WebkitOverflowScrolling: "touch",
        padding:                 "4px 8px",
        margin:                  "-4px -8px",
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
  // clamp() and isMobile-conditional pixel values must stay in style
  const SIDE_PAD        = isMobile ? "20px" : "clamp(20px, 8.33vw, 160px)";
  const PAD             = `30px ${SIDE_PAD} 36px`;
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
  // staggerSlideUp / staggerFadeIn return CSSProperties (opacity + animation
  // string with a computed delay) — these must stay in style props.
  const s = {
    badge:   staggerSlideUp(80,  PAGE_ENTER),
    title:   staggerSlideUp(160, PAGE_ENTER),
    video:   staggerFadeIn( 220, PAGE_ENTER),
    meta:    staggerSlideUp(260, PAGE_ENTER),
    tabRow:  staggerSlideUp(340, PAGE_ENTER),
    actions: staggerFadeIn( 560, PAGE_ENTER),
  };

  // ─── Tab pills ─────────────────────────────────────────────────────────────
  const tabPills = (
    <div role="tablist" aria-label="Event sections" className="flex items-center gap-2">
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
          className={`font-jakarta font-bold text-[13px] px-4 py-[7px] rounded-full border border-white/70 shrink-0 outline-none transition-[background,color] duration-200 cursor-pointer
            ${activeTab === t.key ? "bg-white text-accent-blue" : "bg-white/10 text-white"}`}
          style={staggerSlideUp(360 + i * PAGE_ENTER.stagger, PAGE_ENTER)}
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
          className="ml-1 w-6 h-6 rounded-full border border-white/20 border-t-white animate-tab-spin shrink-0"
          style={{
            opacity:    spinnerPhase === "fading" ? 0 : 1,
            transition: spinnerPhase === "fading" ? "opacity 500ms ease" : "none",
          }}
        />
      )}
    </div>
  );

  // Register button comes first on narrow screens so it's visible without scrolling.
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
    <div
      className="relative z-[1] h-auto flex flex-col justify-end mb-4 gap-[18px]"
      style={{ minHeight: MIN_HERO_HEIGHT, padding: PAD }}
    >
      {/* ── Status badge ── */}
      <div style={s.badge}>
        <span
          className="font-jakarta inline-block px-3 py-1 rounded-lg border-[1.8px] text-[11px] font-extrabold uppercase tracking-[0.06em] mb-5"
          style={{
            background:  STATUS_COLOR[event.status]        ?? "rgba(107, 114, 128, 0.2)",
            borderColor: STATUS_COLOR_OPAQUE[event.status] ?? "rgba(107, 114, 128, 1)",
            color:       STATUS_COLOR_OPAQUE[event.status] ?? "rgba(107, 114, 128, 1)",
          }}
        >
          {STATUS_LABEL[event.status] ?? event.status}
        </span>

        {/* ── Title block ── */}
        <div style={{ ...s.title, position: "relative" }}>
          <div
            className="font-bebas drop-shadow-md uppercase leading-none text-white"
            style={{ fontSize: "clamp(3rem, 4.5vw, 4rem)" }}
          >
            {event.name}
          </div>

          <div
            className="font-jakarta font-semibold text-white/70 drop-shadow-md mt-0 flex items-center gap-2"
            style={{ fontSize: "clamp(14px, 1.4vw, 16px)" }}
          >
            <span className="italic">by</span>
            <span className="font-bold">{event.organiser}</span>
          </div>

          {/* Desktop video — floats right of title block */}
          {!isMobile && videoId && (
            <div
              className="absolute top-0 right-0 rounded-lg overflow-hidden bg-black border-2 border-white z-10"
              style={{
                ...s.video,
                width:       "clamp(320px, 25vw, 330px)",
                aspectRatio: "16/9",
                boxShadow:   "0 10px 40px rgba(0,0,0,0.2)",
              }}
            >
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
        <div
          className="w-full rounded-lg overflow-hidden bg-black border-2 border-white z-[5] mt-1"
          style={{ ...s.video, aspectRatio: "16/9" }}
        >
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
      <div
        className="flex flex-wrap"
        style={{ gap: isMobile ? 20 : 36, ...s.meta }}
      >
        {meta.map((m) => (
          <div key={m.label}>
            <div className="font-jakarta text-xs text-white font-extrabold mt-2">{m.label}</div>
            <div className="font-jakarta text-xs text-white/70 font-extrabold mt-0.5">{m.value}</div>
          </div>
        ))}
      </div>

      {/* ── Tab row + action buttons ──────────────────────────────────────────
          Fits?      → single row: tabs left │ spacer │ actions right
          Overflows? → two rows: each independently scrollable with fades
      ────────────────────────────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="w-full min-w-0 overflow-visible -mb-5"
        style={{ marginTop: isMobile ? 16 : 30, ...s.tabRow }}
      >
        {/* Hidden probe — measures natural combined width to decide layout */}
        <div
          ref={probeRef}
          aria-hidden
          className="absolute invisible pointer-events-none flex items-center gap-2 flex-nowrap whitespace-nowrap"
        >
          {TABS.map((t) => (
            <button key={t.key} className="font-jakarta font-bold text-[13px] px-4 py-[7px] shrink-0">
              {t.label}
            </button>
          ))}
          <div className="w-8 shrink-0" />
          {event.guidebook_url                                   && <button className="px-4 py-[7px] shrink-0">Guidebook</button>}
          {event.instagram_url                                   && <button className="px-4 py-[7px] shrink-0">Instagram</button>}
          {event.is_registration_open && event.registration_url && <button className="px-4 py-[7px] shrink-0">Register</button>}
        </div>

        {/* ── Single-row layout ── */}
        {!needsTwoRows && (
          <div className="flex items-center gap-2 w-full">
            <div className="flex items-center gap-2 shrink-0">
              {tabPills}
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-2 shrink-0" style={s.actions}>
              {actionButtons}
            </div>
          </div>
        )}

        {/* ── Two-row layout ── */}
        {needsTwoRows && (
          <div className="flex flex-col gap-2">
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