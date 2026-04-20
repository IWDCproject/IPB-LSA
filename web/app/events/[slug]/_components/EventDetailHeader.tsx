"use client";

import { staggerSlideUp, staggerFadeIn, PAGE_ENTER } from "./Animations";
import Button from "@/components/Button";
import { getYouTubeID } from "@/lib/directus";

const BB = { fontFamily: "'Bebas Neue', sans-serif" }        as const;
const JK = { fontFamily: "'Plus Jakarta Sans', sans-serif" } as const;

export type TabKey = "overview" | "matches" | "participants" | "news";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview",     label: "Overview" },
  { key: "matches",      label: "Matches" },
  { key: "participants", label: "Participants" },
  { key: "news",         label: "News" },
];

const STATUS_LABEL: Record<string, string> = {
  upcoming:  "Upcoming",
  active:    "On Going",
  finished:  "Finished",
  cancelled: "Cancelled",
};
const STATUS_COLOR: Record<string, string> = {
  upcoming:  "rgb(219, 219, 219, 0.2)",
  active:    "rgb(255, 201, 54, 0.2)",
  finished:  "rgb(107, 114, 128, 0.2)",
  cancelled: "rgb(239, 68, 68, 0.2)",
};
const STATUS_COLOR_OPAQUE: Record<string, string> = {
  upcoming:  "rgb(219, 219, 219, 1)",
  active:    "rgb(255, 201, 54, 1)",
  finished:  "rgb(107, 114, 128, 1)",
  cancelled: "rgb(239, 68, 68, 1)",
};

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

interface Props {
  event:        any;
  activeTab:    TabKey;
  onTabChange:  (t: TabKey) => void;
  isMobile:     boolean;
  spinnerPhase: "hidden" | "showing" | "fading";
}

export default function EventDetailHeader({ event, activeTab, onTabChange, isMobile, spinnerPhase }: Props) {
  const TOP_PAD  = "30px";
  const SIDE_PAD = isMobile ? "20px" : "clamp(20px, 8.33vw, 160px)";
  const PAD      = `${TOP_PAD} ${SIDE_PAD} 36px`;
  const MIN_HERO_HEIGHT = isMobile ? "0px" : "300px";

  const meta = [
    { label: "Registration", value: event.registration_end_date ? `Until ${fmtDate(event.registration_end_date)}` : "—" },
    { label: "Dates",        value: event.start_date ? `${fmtDate(event.start_date)} – ${fmtDate(event.end_date)}` : "—" },
    { label: "Location",     value: event.location ?? "—" },
  ];

  const videoId = getYouTubeID(event.url_youtube);

  // ─── Coordinated stagger delays (PAGE_ENTER tier) ─────────────────────────
  // These run once when the page first loads, driven by animation-delay.
  // The header always animates as PAGE_ENTER since it only mounts once.
  const s = {
    badge:    staggerSlideUp(80,  PAGE_ENTER),   // status badge
    title:    staggerSlideUp(160, PAGE_ENTER),   // event name + organiser
    video:    staggerFadeIn( 220, PAGE_ENTER),   // YouTube embed
    meta:     staggerSlideUp(260, PAGE_ENTER),   // dates / location strip
    tabRow:   staggerSlideUp(340, PAGE_ENTER),   // tab buttons row
    // individual tab buttons stagger from 360ms with PAGE_ENTER.stagger spacing
    actions:  staggerFadeIn( 560, PAGE_ENTER),   // guidebook / register buttons
  };

  return (
    <div style={{
      position:      "relative",
      zIndex:        1,
      minHeight:     MIN_HERO_HEIGHT,
      height:        "auto",
      display:       "flex",
      flexDirection: "column",
      justifyContent:"flex-end",
      padding:       PAD,
      marginBottom:  16,
      gap:           18,
    }}>

      {/* ── Status badge ── */}
      <div style={s.badge}>
        <span style={{
          ...JK,
          display:       "inline-block",
          padding:       "4px 12px",
          borderRadius:  8,
          background:    STATUS_COLOR[event.status]       ?? "rgba(107, 114, 128, 0.2)",
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
                width="100%" height="100%"
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
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
            width="100%" height="100%"
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {/* ── Meta strip (dates, location) ── */}
      <div style={{ display: "flex", gap: isMobile ? 20 : 36, flexWrap: "wrap", ...s.meta }}>
        {meta.map((m) => (
          <div key={m.label}>
            <div style={{ ...JK, fontSize: 12, color: "#fff",                     fontWeight: 800, marginTop: 8  }}>{m.label}</div>
            <div style={{ ...JK, fontSize: 12, color: "rgba(255,255,255,0.7)",    fontWeight: 800, marginTop: 2  }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* ── Tab row + action buttons ── */}
      <div style={{
        display:        "flex",
        flexDirection:  "row",
        alignItems:     "center",
        justifyContent: "space-between",
        gap:            10,
        flexWrap:       "wrap",
        marginBottom:   -20,
        marginTop:      30,
        width:          "100%",
        ...s.tabRow,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {TABS.map((t, i) => (
            <button
              key={t.key}
              onClick={() => onTabChange(t.key)}
              style={{
                ...JK,
                fontWeight:  700,
                fontSize:    13,
                padding:     "7px 16px",
                borderRadius: 999,
                border:      "1.5px solid rgba(255,255,255,0.7)",
                background:  activeTab === t.key ? "#fff" : "rgba(255,255,255,0.1)",
                color:       activeTab === t.key ? "#0D26C2" : "#fff",
                cursor:      "pointer",
                transition:  "background 0.2s, color 0.2s",
                // Individual button stagger within the tab row
                ...staggerSlideUp(360 + i * PAGE_ENTER.stagger, PAGE_ENTER),
              }}
            >
              {t.label}
            </button>
          ))}

          {/* Loading spinner — fades in on tab switch, min 500ms, fades out 500ms */}
          {spinnerPhase !== "hidden" && (
            <>
              <style dangerouslySetInnerHTML={{ __html: `
                @keyframes tab-spin { to { transform: rotate(360deg); } }
              `}} />
              <div style={{
                marginLeft: 4,
                width: 24, height: 24, borderRadius: "50%",
                border: "1px solid rgba(255,255,255,0.2)",
                borderTopColor: "rgba(255,255,255,1)",
                animation: "tab-spin 0.7s linear infinite",
                flexShrink: 0,
                opacity:    spinnerPhase === "fading" ? 0 : 1,
                transition: spinnerPhase === "fading" ? "opacity 500ms ease" : "none",
              }} />
            </>
          )}
        </div>

        <div style={{
          display:   "flex",
          gap:       8,
          marginLeft: isMobile ? 0 : "auto",
          ...s.actions,
        }}>
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
          {event.is_registration_open && event.registration_url && (
            <Button href={event.registration_url} variant="header-solid" size="sm" external className="!rounded-[8px] !bg-[#FFC936] !border-[#FFC936]">
              Register
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}