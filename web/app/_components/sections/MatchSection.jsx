"use client";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { MatchCard } from "../match-stuff/MatchCard";
import { MatchTable } from "../match-stuff/MatchTable";
import Button from "@/components/Button";
import { getAssetUrl } from "@/lib/directus";
import { BlockRevealText } from "@/components/BlockRevealText";
import { useScheduleMatchState } from "@/hooks/useScheduleMatchState";

// --- Konstanta -----------------------------------------------

const SCALE_START       = 1600;
const SCALE_FLOOR       = 0.875;
const NAT_W             = 1920;
const H_MARGIN          = 160;
const CTA_W             = 240;
const CARD_GAP          = 10;
const MIN_CARD_W        = 240;
const SHOW_MAX          = 5;
const STAGGER_MS        = 80;
const MOBILE_PAD        = 20;
const MOBILE_CARD_VW    = 0.7;
const MOBILE_CARD_RATIO = 0.8;
// live yang dialihkan ke tabel nggak dihitung dari limit ini
const TABLE_MAX         = 5;

// --- Helpers -------------------------------------------------

function computeScale(w) {
  return Math.max(SCALE_FLOOR, Math.min(1, w / SCALE_START));
}

function useContainerWidth(ref) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = (w) => {
      el.style.setProperty("--s", computeScale(w));
      setWidth(w);
    };
    const ro = new ResizeObserver(([e]) => apply(e.contentRect.width));
    ro.observe(el);
    apply(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

// --- Komponen utama ------------------------------------------

export default function MatchSection({ matches: rawMatches }) {
  const sectionRef = useRef(null);
  const cw         = useContainerWidth(sectionRef);
  const { liveMatches: patchedMatches } = useScheduleMatchState(rawMatches ?? []);

  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const liveMatches     = useMemo(() => patchedMatches.filter(m => m.status === "live"),     [patchedMatches]);
  const upcomingMatches = useMemo(() => patchedMatches.filter(m => m.status === "upcoming"), [patchedMatches]);
  const finishedMatches = useMemo(() => patchedMatches.filter(m => m.status === "finished"), [patchedMatches]);

  const isMobile     = cw > 0 && cw < 1024;
  const scale        = computeScale(cw || NAT_W);
  const availableW   = (cw || NAT_W) - 2 * H_MARGIN * scale - (CTA_W * scale + CARD_GAP);
  const fittingCount = Math.max(1, Math.floor(availableW / (MIN_CARD_W + CARD_GAP)));
  const visibleCount = Math.min(fittingCount, SHOW_MAX);

  // kalau live kurang dari slot yang tersedia, jangan tampilkan kartu - pindahin ke tabel
  const showLiveCards = liveMatches.length > 0 && liveMatches.length >= visibleCount;
  const cardMatches   = showLiveCards ? liveMatches.slice(0, visibleCount) : [];

  const tableMatches = useMemo(() => {
    const liveRows      = showLiveCards ? [] : liveMatches;
    const upcomingSlice = upcomingMatches.slice(0, TABLE_MAX);
    const remaining     = TABLE_MAX - upcomingSlice.length;
    const finishedSlice = remaining > 0 ? finishedMatches.slice(0, remaining) : [];
    return [...liveRows, ...upcomingSlice, ...finishedSlice];
  }, [showLiveCards, liveMatches, upcomingMatches, finishedMatches]);

  const ctaBgUrl = useMemo(() => {
    const sample = cardMatches[0] ?? rawMatches?.find(m => m.competition_category?.event_id?.card_image);
    if (!sample) return null;
    return getAssetUrl(sample.competition_category?.event_id?.card_image);
  }, [cardMatches, rawMatches]);

  const animStyles = useMemo(() => {
    const totalSlots = (liveMatches.length || 5) + 5;
    return Array.from({ length: totalSlots }, (_, slot) =>
      visible
        ? { animation: `live-intro 1s cubic-bezier(0.22, 1, 0.36, 1) ${slot * STAGGER_MS}ms both` }
        : { opacity: 0 }
    );
  }, [visible, liveMatches.length]);

  const anim = useCallback(
    (slot) => animStyles[slot] ?? animStyles[animStyles.length - 1],
    [animStyles]
  );

  const mobileCardPx = cw * MOBILE_CARD_VW;
  const mobileCardH  = Math.round(mobileCardPx * MOBILE_CARD_RATIO);

  const tableTitle = useMemo(() => {
    const liveInTable = !showLiveCards && liveMatches.length > 0;
    if (liveInTable && upcomingMatches.length > 0) return "Live & Upcoming";
    if (liveInTable) return "Live Matches";
    return "Upcoming Matches";
  }, [showLiveCards, liveMatches.length, upcomingMatches.length]);

  const hPad = isMobile
    ? { paddingLeft: MOBILE_PAD, paddingRight: MOBILE_PAD }
    : { paddingLeft: "clamp(40px, 8.33vw, 160px)", paddingRight: "clamp(40px, 8.33vw, 160px)" };

  return (
    <section ref={sectionRef} style={{
      position: "relative", zIndex: 2,
      background: "#0D26C2", color: "white",
      display: "flex", flexDirection: "column", justifyContent: "flex-start",
      overflow: "hidden", padding: "80px 0 60px",
    }}>
      <div style={{
        width: "100%", boxSizing: "border-box",
        display: "flex", flexDirection: "column",
        gap: isMobile ? 14 : 20,
      }}>

        <div style={{ ...anim(0), ...hPad }}>
          <div style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: isMobile ? "2.2rem" : "calc(64px * var(--s))",
            lineHeight: 1, color: "#fff", textTransform: "uppercase",
            filter: "drop-shadow(0 4px 4px rgba(0,0,0,0.25))",
          }}>
            <BlockRevealText delay={0.4} blockColor="#ffffff">
              {liveMatches.length > 0 ? "Live Matches" : "No Live Matches"}
            </BlockRevealText>
          </div>
        </div>

        {showLiveCards && (
          isMobile ? (
            <div
              className="match-scroll"
              style={{
                ...anim(1),
                display: "flex", flexDirection: "row", gap: CARD_GAP,
                overflowX: "auto", scrollSnapType: "x proximity",
                scrollPaddingLeft: MOBILE_PAD, WebkitOverflowScrolling: "touch",
                paddingLeft: MOBILE_PAD, paddingRight: 0,
              }}
            >
              {liveMatches.map((match) => (
                <div
                  key={match.id}
                  style={{
                    flex: `0 0 ${mobileCardPx}px`, width: `${mobileCardPx}px`, height: mobileCardH,
                    scrollSnapAlign: "start", borderRadius: 10,
                    overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
                  }}
                >
                  <MatchCard match={match} />
                </div>
              ))}
              <div style={{ flexShrink: 0, width: 8 }} />
            </div>
          ) : (
            <div style={{ ...anim(1), ...hPad, display: "flex", flexDirection: "row", gap: CARD_GAP }}>
              {cardMatches.map((match, i) => (
                <div key={match.id} style={{ ...anim(i + 2), flex: 1, minWidth: 0 }}>
                  <div style={{ width: "100%", height: "calc(280px * var(--s))", overflow: "hidden", borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.35)" }}>
                    <MatchCard match={match} />
                  </div>
                </div>
              ))}

              <div style={{ ...anim(cardMatches.length + 2), flexShrink: 0 }}>
                <div style={{
                  width: "calc(240px * var(--s))", height: "calc(280px * var(--s))",
                  borderRadius: 10, boxSizing: "border-box",
                  position: "relative", overflow: "hidden",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
                }}>
                  <div style={{ position: "absolute", inset: 0, filter: "saturate(0)", zIndex: 0, overflow: "hidden" }}>
                    {ctaBgUrl && (
                      <div style={{
                        position: "absolute",
                        inset: "-20px", // inset negatif biar pinggiran blur disembunyikan overflow:hidden
                        backgroundImage: `url(${ctaBgUrl})`,
                        backgroundSize: "cover", backgroundPosition: "center",
                        filter: "blur(20px)",
                      }} />
                    )}
                  </div>
                  <div style={{ position: "absolute", inset: 0, zIndex: 1, background: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.75) 100%)" }} />
                  <div style={{
                    position: "relative", zIndex: 2,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    height: "100%", borderRadius: 10, padding: 24, textAlign: "center",
                    boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,1)",
                  }}>
                    <div style={{ height: 18 }} />
                    <Button href="/schedule" variant="primary" size="md">See Schedules</Button>
                    <div style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 800,
                      color: "rgba(255,255,255,0.6)", textTransform: "uppercase",
                      letterSpacing: 1, lineHeight: 1.4, marginTop: 14,
                    }}>
                      See real time update<br />scores
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        )}

        <div style={{ ...anim(cardMatches.length + 3), ...hPad }}>
          <MatchTable
            matches={tableMatches}
            groupBy="event"
            title={tableTitle}
            isMobile={isMobile}
          />
        </div>

        <div style={{ ...anim(cardMatches.length + 4), ...hPad, display: "flex", justifyContent: "flex-end" }}>
          <Button href="/schedule" variant="primary" size="md">See More</Button>
        </div>

      </div>
    </section>
  );
}