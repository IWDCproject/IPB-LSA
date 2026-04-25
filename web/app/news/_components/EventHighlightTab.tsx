"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NewsCard from "@/components/NewsCard";

const JK     = { fontFamily: "'Plus Jakarta Sans', sans-serif" } as const;
const BB     = { fontFamily: "'Bebas Neue', sans-serif"        } as const;
const YELLOW = "#FFC936";
const BLUE   = "#0D26C2";

const HIDE_SCROLLBAR = `.nhscroll::-webkit-scrollbar{display:none}.nhscroll{-ms-overflow-style:none;scrollbar-width:none}`;

// ─── Animation constants ───────────────────────────────────────────────────────
const DUR     = 420;
const EASE    = "cubic-bezier(0.22, 1, 0.36, 1)";
const BASE    = 40;   // ms base delay for first element
const STAGGER = 28;   // ms between cards inside a section
// Section-level stagger (each event section is large, use wider spacing)
const SEC_BASE    = 60;
const SEC_STAGGER = 90; // ms between sections (capped at 4 max delay)

type EventStatus = "upcoming" | "ongoing" | "concluded";
type FilterTab   = "all" | EventStatus;

export interface EventWithNews {
  id:           string;
  name:         string;
  slug:         string;
  status:       EventStatus;
  banner_image: { id: string } | null;
  banner_url:   string | null;
  news:         NewsItem[];
}

interface NewsItem {
  id:            string;
  title:         string;
  slug:          string;
  excerpt:       string | null;
  thumbnail_url: string | null;
  category:      string;
  published_at:  string;
  event_id:      { name: string; slug?: string } | null;
}

interface Props {
  events:   EventWithNews[];
  isMobile: boolean;
  pad:      number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_ORDER: Record<EventStatus, number> = { ongoing: 0, upcoming: 1, concluded: 2 };

const STATUS_CONFIG: Record<EventStatus, { label: string; bg: string; border: string; color: string }> = {
  ongoing:   { label: "Ongoing",   bg: "rgba(255,201,54,0.2)",  border: "rgba(255,201,54,1)",  color: "rgba(255,201,54,1)"  },
  upcoming:  { label: "Upcoming",  bg: "rgba(219,219,219,0.2)", border: "rgba(219,219,219,1)", color: "rgba(219,219,219,1)" },
  concluded: { label: "Concluded", bg: "rgba(107,114,128,0.2)", border: "rgba(107,114,128,1)", color: "rgba(107,114,128,1)" },
};

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all",       label: "All"       },
  { key: "upcoming",  label: "Upcoming"  },
  { key: "ongoing",   label: "Ongoing"   },
  { key: "concluded", label: "Concluded" },
];

const LIVE_PULSE_CSS = `@keyframes news-livepulse { 0%,100%{opacity:1} 50%{opacity:.2} }`;
const DESK_COLS  = 4;
const MOB_CARD_W = 220;
const MOB_CARD_H = 260;

// ─── Status pill ──────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: EventStatus }) {
  const { label, bg, border, color } = STATUS_CONFIG[status];
  return (
    <span style={{
      ...JK, display: "inline-block",
      padding: "4px 12px", borderRadius: 8,
      background: bg,
      border: `1.8px solid ${border}`,
      color, fontSize: 11, fontWeight: 800,
      textTransform: "uppercase", letterSpacing: "0.06em",
      whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}

// ─── Filter tabs ──────────────────────────────────────────────────────────────

function FilterTabs({ active, onChange }: { active: FilterTab; onChange: (t: FilterTab) => void }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {FILTER_TABS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          style={{
            ...JK, padding: "7px 16px", borderRadius: 999,
            border: "1.5px solid rgba(255,255,255,0.7)",
            background: active === key ? "#fff" : "rgba(255,255,255,0.1)",
            color: active === key ? BLUE : "#fff",
            fontSize: 13, fontWeight: 700,
            cursor: "pointer", transition: "background 0.2s, color 0.2s", whiteSpace: "nowrap",
          }}
        >{label}</button>
      ))}
    </div>
  );
}

// ─── Placeholder card ─────────────────────────────────────────────────────────

function NewsPlaceholder({ isMobile = false }: { isMobile?: boolean }) {
  return (
    <div style={{
      position: "relative", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", borderRadius: 8,
      boxShadow: "0 0 0 2px rgba(255, 255, 255, 0.15)",
      background: "rgba(255, 255, 255, 0.03)", backdropFilter: "blur(8px)",
      padding: "40px", height: "100%", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "url(/Batik_Pattern_white.svg)",
        backgroundSize: "cover", backgroundRepeat: "no-repeat",
        backgroundPosition: "center", opacity: 0.15,
        pointerEvents: "none", zIndex: 0, filter: "blur(1.5px)",
      }} />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" style={{ marginBottom: 12 }}>
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span style={{ ...JK, fontSize: "11px", fontWeight: 800, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.12em", textAlign: "center" }}>
          Coming Soon
        </span>
      </div>
    </div>
  );
}

// ─── Desktop grid ─────────────────────────────────────────────────────────────

function EventNewsDesktopGrid({ news }: { news: NewsItem[] }) {
  const router    = useRouter();
  const displayed = news.slice(0, DESK_COLS);
  const ghosts    = Math.max(0, DESK_COLS - displayed.length);

  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${DESK_COLS}, 1fr)`, gap: 12, alignItems: "stretch" }}>
      {displayed.map((item, i) => (
        <div
          key={item.id}
          onClick={() => router.push(`/news/${item.slug}`)}
          style={{
            cursor: "pointer", borderRadius: 8,
            opacity: 0,
            animation: `np-slide-up ${DUR}ms ${EASE} ${BASE + i * STAGGER}ms both`,
          }}
        >
          <NewsCard item={item} />
        </div>
      ))}
      {Array.from({ length: ghosts }).map((_, i) => (
        <div key={`ghost-${i}`} style={{
          opacity: 0,
          animation: `np-slide-up ${DUR}ms ${EASE} ${BASE + (displayed.length + i) * STAGGER}ms both`,
        }}>
          <NewsPlaceholder />
        </div>
      ))}
    </div>
  );
}

// ─── Mobile horizontal scroll ─────────────────────────────────────────────────

const MOB_FADE_W = 24;

function EventNewsMobileScroll({ news, pad }: { news: NewsItem[]; pad: number }) {
  const router    = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  const applyMask = (el: HTMLDivElement) => {
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const leftW  = Math.min(scrollLeft, MOB_FADE_W);
    const rightW = Math.min(Math.max(0, scrollWidth - clientWidth - scrollLeft), MOB_FADE_W);
    const mask = `linear-gradient(to right, rgba(0,0,0,0.5), black ${leftW}px, black calc(100% - ${rightW}px), rgba(0,0,0,0.5))`;
    el.style.webkitMaskImage = mask;
    (el.style as any).maskImage = mask;
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => applyMask(el);
    el.addEventListener("scroll", onScroll, { passive: true });
    applyMask(el);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) setTimeout(() => applyMask(el), 50);
  }, [news]);

  if (!news.length) {
    return (
      <div style={{ ...JK, fontSize: 13, color: "rgba(255,255,255,0.3)", padding: "24px 0", paddingLeft: pad }}>
        No articles yet.
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <style dangerouslySetInnerHTML={{ __html: HIDE_SCROLLBAR }} />
      <div
        ref={scrollRef}
        className="nhscroll"
        style={{
          display: "flex", gap: 8, overflowX: "auto",
          paddingBottom: 8, paddingLeft: pad, paddingRight: pad,
        }}
      >
        {news.map(item => (
          <div
            key={item.id}
            onClick={() => router.push(`/news/${item.slug}`)}
            style={{ flexShrink: 0, width: MOB_CARD_W, cursor: "pointer", borderRadius: 8, overflow: "hidden" }}
          >
            <NewsCard item={item} isMobile />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Section head ─────────────────────────────────────────────────────────────

function SectionHead({ event, isMobile }: { event: EventWithNews; isMobile: boolean }) {
  return (
    <div style={{
      display: "flex", alignItems: isMobile ? "flex-start" : "center",
      justifyContent: "space-between", flexDirection: isMobile ? "column" : "row",
      gap: isMobile ? 10 : 0, marginBottom: isMobile ? 14 : 18,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 3, height: 28, background: YELLOW, borderRadius: 2, flexShrink: 0 }} />
        <h3 style={{ margin: 0, ...BB, fontSize: isMobile ? 22 : 28, color: "#fff", lineHeight: 1 }}>
          {event.name}
        </h3>
        <StatusPill status={event.status} />
      </div>
      <Link
        href={`/events/${event.slug}?tab=news`}
        style={{
          ...JK, fontSize: 12, fontWeight: 800, color: YELLOW,
          textDecoration: "none", letterSpacing: "0.05em",
          display: "flex", alignItems: "center", gap: 5,
          opacity: 0.85, transition: "opacity 0.2s",
        }}
      >
        Lihat semua berita
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
        </svg>
      </Link>
    </div>
  );
}

// ─── Event section ────────────────────────────────────────────────────────────

function EventSection({ event, pad, isMobile, index }: { event: EventWithNews; pad: number; isMobile: boolean; index: number }) {
  const secDelay = `${SEC_BASE + Math.min(index, 4) * SEC_STAGGER}ms`;
  return (
    <div style={{
      position: "relative", zIndex: 2,
      opacity: 0,
      animation: `np-slide-up ${DUR}ms ${EASE} ${secDelay} both`,
    }}>
      {/* Banner blur — own overflow:hidden so it never clips the scroll row */}
      {event.banner_url && (
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: `url(${event.banner_url})`,
            backgroundSize: "cover", backgroundPosition: "center",
            filter: "blur(8px)", transform: "scale(1.12)",
            opacity: 0.65,
          }} />
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(160deg, rgba(13,38,194,0.45) 0%, rgba(6,18,92,0.60) 100%)",
          }} />
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 50%)",
          }} />
        </div>
      )}

      <div style={{
        position: "relative", zIndex: 1,
        paddingTop: isMobile ? 28 : 40, paddingBottom: isMobile ? 32 : 48,
      }}>
        {/* Section head always has horizontal padding */}
        <div style={{ paddingLeft: pad, paddingRight: pad }}>
          <SectionHead event={event} isMobile={isMobile} />
        </div>

        {isMobile
          ? <EventNewsMobileScroll news={event.news} pad={pad} />
          : (
            <div style={{ paddingLeft: pad, paddingRight: pad }}>
              <EventNewsDesktopGrid news={event.news} />
            </div>
          )
        }
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ filter }: { filter: FilterTab }) {
  const messages: Record<FilterTab, string> = {
    all:       "No event coverage yet.",
    upcoming:  "No upcoming events with news yet.",
    ongoing:   "No ongoing events right now.",
    concluded: "No concluded events with news yet.",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px", gap: 12 }}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5">
        <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
        <path d="M18 14h-8M15 18h-5M10 6h8v4h-8V6Z"/>
      </svg>
      <span style={{ ...JK, fontSize: 13, color: "rgba(255,255,255,0.25)", textAlign: "center" }}>
        {messages[filter]}
      </span>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function EventHighlightTab({ events, isMobile, pad }: Props) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

  const sorted   = [...events].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
  const filtered = activeFilter === "all" ? sorted : sorted.filter(e => e.status === activeFilter);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: LIVE_PULSE_CSS }} />

      {/* Header */}
      <div style={{
        position: "relative", zIndex: 2,
        paddingLeft: pad, paddingRight: pad,
        paddingTop: isMobile ? 32 : 44, paddingBottom: isMobile ? 20 : 28,
      }}>
        <div style={{
          display: "flex", alignItems: isMobile ? "flex-start" : "center",
          justifyContent: "space-between", flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? 14 : 0,
        }}>
          <div style={{
            opacity: 0,
            animation: `np-slide-up ${DUR}ms ${EASE} ${BASE}ms both`,
          }}>
            <div style={{ ...BB, fontSize: isMobile ? "clamp(1.8rem, 7vw, 2.4rem)" : "clamp(2rem, 3.5vw, 3rem)", color: "#fff", lineHeight: 1 }}>
              By Event
            </div>
            <p style={{ ...JK, margin: "6px 0 0", fontSize: "clamp(12px, 1.4vw, 14px)", color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>
              News grouped by competition
            </p>
          </div>
          <div style={{
            overflowX: "auto", paddingBottom: 2,
            opacity: 0,
            animation: `np-slide-up ${DUR}ms ${EASE} ${BASE + STAGGER * 2}ms both`,
          }}>
            <FilterTabs active={activeFilter} onChange={setActiveFilter} />
          </div>
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div style={{ position: "relative", zIndex: 2, animation: "np-in 0.3s ease both" }}>
          <EmptyState filter={activeFilter} />
        </div>
      ) : (
        <div key={activeFilter} style={{ display: "flex", flexDirection: "column" }}>
          {filtered.map((event, i) => (
            <EventSection key={event.id} event={event} pad={pad} isMobile={isMobile} index={i} />
          ))}
        </div>
      )}
    </>
  );
}