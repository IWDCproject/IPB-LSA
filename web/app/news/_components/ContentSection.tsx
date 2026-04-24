"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NewsCard from "@/components/NewsCard";
import UniversityMarquee from "@/components/UniversityMarquee";
import AllNewsTab, { type EventOption } from "./AllNewsTab";

const JK     = { fontFamily: "'Plus Jakarta Sans', sans-serif" } as const;
const BB     = { fontFamily: "'Bebas Neue', sans-serif"        } as const;
const YELLOW = "#FFC936";
const BLUE   = "#0D26C2";
const NAVY   = "#06125C";

type EventStatus = "upcoming" | "ongoing" | "concluded";
type FilterTab   = "all" | EventStatus;
type ContentTab  = "byEvent" | "allNews";

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

interface EventWithNews {
  id:           string;
  name:         string;
  slug:         string;
  status:       EventStatus;
  banner_image: { id: string } | null;
  banner_url:   string | null;
  news:         NewsItem[];
}

interface Props {
  events:   EventWithNews[];
  isMobile: boolean;
  pad:      number;
}

// ─── Keyframes & CSS ─────────────────────────────────────────────────────────
// Tab shape technique: css-tip.com/rounded-tab by Temani Afif
// Uses mask + radial-gradient — no pseudo-elements, no SVG data URIs.

const KEYFRAMES = `
  @keyframes news-livepulse { 0%,100%{opacity:1} 50%{opacity:.2} }

  /* 1. The Full-Width Stroke (The Rail) */
  .news-tab-rail {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    z-index: 0;
  }

  /* 2. The Tab Bar Container */
  .news-tab-bar {
    display: flex;
    align-items: flex-end;
    position: absolute;
    top: 0px;
    transform: translateY(-99%);
    width: 100%;
    /* This ensures tabs don't have gaps at the bottom */
    padding-bottom: 0; 
  }

  /* 3. The Trapezoid Tab Shape */
  .news-browser-tab {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 30px 40px; /* Wide padding for the slant */
    height: 44px;
    cursor: pointer;
    border: none;
    background: transparent;
    margin-right: -15px; /* Overlap amount */
    transition: all 0.1s ease-out;
    outline: none;
		z-index: -1;
  }

  /* This pseudo-element creates the actual Trapezoid */
  .news-browser-tab::before {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(30, 50, 195, 0.4);
    border-bottom: none;
    border-radius: 12px 12px 0 0;
    /* THE TRICK: Perspective makes the top narrower than bottom */
    transform: perspective(100px) rotateX(25deg) translateY(10px);
    transform-origin: bottom;
    transition: all 0.1s ease-out;
  }

  /* 4. Active Tab Styling */
  .news-browser-tab.nbt-active {
    z-index: 10;
    height: 52px; /* Popping out slightly */
  }

  .news-browser-tab.nbt-active::before {
    background: ${BLUE};
    /* Push the active tab down by 2px to overlap and "erase" the rail line */
    transform: perspective(100px) rotateX(25deg) translateY(0px);
  }

  /* Content inside the tab (Text/Icon) needs to be lifted back up */
  .nbt-content {
	  margin-top: 14px; 
    display: flex;
    align-items: center;
    gap: 10px;
    color: rgba(255,255,255,0.5);
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-weight: 800;
    font-size: 13px;
    z-index: 1;
    pointer-events: none;
		transform: translateY(10px);
    transition: transform 0.1s ease-out, color 0.1s ease-out;
  }

  .nbt-active .nbt-content {
    color: #fff;
    transform: translateY(2px); /* Match the base shift */
  }

  .news-browser-tab:hover:not(.nbt-active) ::before {
    background: rgba(57, 77, 205, 0.6);
  }

  .nbt-icon { color: rgba(255,255,255,0.25); }
  .nbt-active .nbt-icon { color: ${YELLOW}; }

  @media (max-width: 768px) {
    .news-browser-tab { padding: 0 25px; height: 38px; margin-right: -15px; }
    .news-browser-tab.nbt-active { height: 44px; }
    .nbt-content { font-size: 11px; }
  }
`;





const HIDE_SCROLLBAR = `.nhscroll::-webkit-scrollbar{display:none}.nhscroll{-ms-overflow-style:none;scrollbar-width:none}`;

// ─── Status pill ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<EventStatus, { label: string; bg: string; color: string; dot?: boolean }> = {
  ongoing:   { label: "Ongoing",   bg: "#dc2626",               color: "#fff",                     dot: true },
  upcoming:  { label: "Upcoming",  bg: "rgba(255,201,54,0.18)", color: YELLOW                               },
  concluded: { label: "Concluded", bg: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)"              },
};

function StatusPill({ status }: { status: EventStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span style={{
      ...JK, display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase",
      padding: "4px 10px", borderRadius: 4, background: cfg.bg, color: cfg.color, whiteSpace: "nowrap",
    }}>
      {cfg.dot && (
        <span style={{
          width: 5, height: 5, borderRadius: "50%", background: "#fff", flexShrink: 0,
          animation: "news-livepulse 1.3s ease-out infinite",
        }} />
      )}
      {cfg.label}
    </span>
  );
}

// ─── By Event filter tabs ─────────────────────────────────────────────────────

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all",       label: "All"       },
  { key: "upcoming",  label: "Upcoming"  },
  { key: "ongoing",   label: "Ongoing"   },
  { key: "concluded", label: "Concluded" },
];

function FilterTabs({ active, onChange }: { active: FilterTab; onChange: (t: FilterTab) => void }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {FILTER_TABS.map(({ key, label }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            style={{
              ...JK, padding: "7px 16px", borderRadius: 99,
              border: isActive ? `1.5px solid ${YELLOW}` : "1.5px solid rgba(255,255,255,0.15)",
              background: isActive ? YELLOW : "rgba(255,255,255,0.05)",
              color: isActive ? NAVY : "rgba(255,255,255,0.55)",
              fontSize: 12, fontWeight: 800, letterSpacing: "0.05em",
              cursor: "pointer", transition: "all 0.2s ease-out", whiteSpace: "nowrap",
            }}
          >{label}</button>
        );
      })}
    </div>
  );
}

// ─── Ghost card ───────────────────────────────────────────────────────────────

function GhostCard() {
  return (
    <div style={{
      borderRadius: 8, border: "1px dashed rgba(255,255,255,0.07)",
      background: "rgba(255,255,255,0.02)", minHeight: 280,
    }} />
  );
}

// ─── Desktop event grid ───────────────────────────────────────────────────────

const DESK_COLS = 4;

function EventNewsDesktopGrid({ news }: { news: NewsItem[] }) {
  const router    = useRouter();
  const displayed = news.slice(0, DESK_COLS);
  const ghosts    = Math.max(0, DESK_COLS - displayed.length);

  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${DESK_COLS}, 1fr)`, gap: 12, alignItems: "start" }}>
      {displayed.map(item => (
        <div key={item.id} onClick={() => router.push(`/news/${item.slug}`)} style={{ cursor: "pointer", borderRadius: 8 }}>
          <NewsCard item={item} />
        </div>
      ))}
      {Array.from({ length: ghosts }).map((_, i) => <GhostCard key={i} />)}
    </div>
  );
}

// ─── Mobile horizontal scroll ─────────────────────────────────────────────────

const MOB_CARD_W = 220;
const MOB_CARD_H = 260;

function EventNewsMobileScroll({ news, eventSlug }: { news: NewsItem[]; eventSlug: string }) {
  const router = useRouter();
  if (!news.length) return <div style={{ ...JK, fontSize: 13, color: "rgba(255,255,255,0.3)", padding: "24px 0" }}>No articles yet.</div>;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: HIDE_SCROLLBAR }} />
      <div className="nhscroll" style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8 }}>
        {news.map(item => (
          <div key={item.id} onClick={() => router.push(`/news/${item.slug}`)}
            style={{ flexShrink: 0, width: MOB_CARD_W, cursor: "pointer", borderRadius: 8 }}>
            <NewsCard item={item} isMobile />
          </div>
        ))}
        <Link href={`/events/${eventSlug}?tab=news`} style={{
          flexShrink: 0, width: 120, height: MOB_CARD_H, textDecoration: "none",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10,
          borderRadius: 8, border: "1.5px dashed rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.03)",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={YELLOW} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
          <span style={{ ...JK, fontSize: 10, fontWeight: 800, color: YELLOW, letterSpacing: "0.08em", textTransform: "uppercase", textAlign: "center", lineHeight: 1.4 }}>
            All<br />News
          </span>
        </Link>
      </div>
    </>
  );
}

// ─── Section head row ─────────────────────────────────────────────────────────

function SectionHead({ eventName, status, eventSlug, isMobile }: {
  eventName: string; status: EventStatus; eventSlug: string; isMobile: boolean;
}) {
  return (
    <div style={{
      display: "flex", alignItems: isMobile ? "flex-start" : "center",
      justifyContent: "space-between", flexDirection: isMobile ? "column" : "row",
      gap: isMobile ? 10 : 0, marginBottom: isMobile ? 14 : 18,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 3, height: 28, background: YELLOW, borderRadius: 2, flexShrink: 0 }} />
        <h3 style={{ margin: 0, ...BB, fontSize: isMobile ? 22 : 28, color: "#fff", lineHeight: 1 }}>{eventName}</h3>
        <StatusPill status={status} />
      </div>
      <Link
        href={`/events/${eventSlug}?tab=news`}
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

function EventSection({ event, pad, isMobile }: { event: EventWithNews; pad: number; isMobile: boolean }) {
  return (
    <div style={{ position: "relative", overflow: "hidden", zIndex: 2 }}>
      {event.banner_url && (
        <>
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: `url(${event.banner_url})`,
            backgroundSize: "cover", backgroundPosition: "center",
            filter: "blur(8px)", transform: "scale(1.12)",
            opacity: 0.65, pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(160deg, rgba(13,38,194,0.45) 0%, rgba(6,18,92,0.60) 100%)",
            pointerEvents: "none",
          }} />
        </>
      )}
      <div style={{
        position: "relative", zIndex: 1,
        paddingLeft: pad, paddingRight: pad,
        paddingTop: isMobile ? 28 : 40,
        paddingBottom: isMobile ? 32 : 48,
      }}>
        <SectionHead eventName={event.name} status={event.status} eventSlug={event.slug} isMobile={isMobile} />
        {isMobile
          ? <EventNewsMobileScroll news={event.news} eventSlug={event.slug} />
          : <EventNewsDesktopGrid  news={event.news} />
        }
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyEventsState({ filter }: { filter: FilterTab }) {
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
      <span style={{ ...JK, fontSize: 13, color: "rgba(255,255,255,0.25)", textAlign: "center" }}>{messages[filter]}</span>
    </div>
  );
}

// ─── Content tab definitions ──────────────────────────────────────────────────

const CONTENT_TABS: { key: ContentTab; label: string; icon: React.ReactNode }[] = [
  {
    key: "byEvent",
    label: "Berdasarkan Event",
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

// ─── Root component ───────────────────────────────────────────────────────────

const STATUS_ORDER: Record<EventStatus, number> = { ongoing: 0, upcoming: 1, concluded: 2 };

export default function ContentSection({ events, isMobile, pad }: Props) {
  const [contentTab,   setContentTab]   = useState<ContentTab>("byEvent");
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

  const sortedEvents   = [...events].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
  const filteredEvents = activeFilter === "all" ? sortedEvents : sortedEvents.filter(e => e.status === activeFilter);

  const eventOptions: EventOption[] = sortedEvents.map(e => ({
    id: e.id, name: e.name, slug: e.slug, status: e.status,
  }));

  const tabPad = isMobile ? "11px 16px 13px" : "11px 26px 14px";
  const tabFontSize = isMobile ? 12 : 13;

  return (
		<section style={{ background: `linear-gradient(to bottom, ${BLUE} 0%, ${NAVY} 100%)`, position: "relative", zIndex: 1 }}>
			<style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

			{/* 1. The Rail: End-to-end stroke along the top of the section */}
      <div className="news-tab-rail" />

      {/* Batik top */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 500,
        backgroundImage: "url(/Batik_Pattern_dark.svg)",
        backgroundSize: "1600px auto", backgroundRepeat: "repeat-x",
        backgroundPosition: "top center", opacity: 0.18, pointerEvents: "none",
      }} />

      {/* 2. The Tab Bar Container */}
      <div className="news-tab-bar" style={{ paddingLeft: pad }}>
        {CONTENT_TABS.map(tab => {
          const isActive = contentTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setContentTab(tab.key)}
              className={`news-browser-tab ${isActive ? "nbt-active" : "nbt-inactive"}`}
            >
              {/* Content wrapper keeps icons/text from skewing */}
              <div className="nbt-content">
                {tab.label}
              </div>
            </button>
          );
        })}
      </div>

      {/* Mask overlay to hide overlapping tabs */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        height: 10, zIndex: 3,
        background: BLUE,
        pointerEvents: "none",
      }} />

      {/* ── By Event tab ────────────────────────────────────────────────── */}
      {contentTab === "byEvent" && (
        <>
          <div style={{
            position: "relative", zIndex: 2,
            paddingLeft: pad, paddingRight: pad,
            paddingTop: isMobile ? 32 : 44,
            paddingBottom: isMobile ? 20 : 28,
          }}>
            <div style={{
              display: "flex", alignItems: isMobile ? "flex-start" : "center",
              justifyContent: "space-between", flexDirection: isMobile ? "column" : "row",
              gap: isMobile ? 14 : 0,
            }}>
              <div>
                <div style={{ ...BB, fontSize: isMobile ? "clamp(1.8rem, 7vw, 2.4rem)" : "clamp(2rem, 3.5vw, 3rem)", color: "#fff", lineHeight: 1 }}>
                  By Event
                </div>
                <p style={{ ...JK, margin: "6px 0 0", fontSize: "clamp(12px, 1.4vw, 14px)", color: "rgba(255,255,255,0.7)", filter: "drop-shadow(2px 4px 6px rgba(0,0,0,0.2))", fontWeight: 600}}>
                  News grouped by competition
                </p>
              </div>
              <div style={{ overflowX: "auto", paddingBottom: 2 }}>
                <FilterTabs active={activeFilter} onChange={setActiveFilter} />
              </div>
            </div>
          </div>

          {filteredEvents.length === 0 ? (
            <div style={{ position: "relative", zIndex: 2 }}>
              <EmptyEventsState filter={activeFilter} />
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {filteredEvents.map(event => (
                <EventSection key={event.id} event={event} pad={pad} isMobile={isMobile} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Semua Berita tab ─────────────────────────────────────────────── */}
      {contentTab === "allNews" && (
        <div style={{
          position: "relative", zIndex: 2,
          paddingLeft: pad, paddingRight: pad,
          paddingTop: isMobile ? 32 : 44,
        }}>
          <AllNewsTab events={eventOptions} isMobile={isMobile} />
        </div>
      )}
    </section>
  );
}