"use client";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { MatchCard } from "../match-stuff/MatchCard";
import { MatchTable } from "../match-stuff/MatchTable";
import Button from "@/components/Button";
import { useBlurImages } from "@/hooks/useBlurImages";
import { getAssetUrl } from "@/lib/directus";
import { BlockRevealText } from "@/components/BlockRevealText";

const SCALE_START = 1600;
const SCALE_FLOOR = 0.875;
const STAGGER_MS  = 80;
const SHOW_MAX    = 5;
const MIN_CARD_W  = 240;
const H_MARGIN    = 160;
const CTA_W       = 240;
const CARD_GAP    = 10;
const NAT_W       = 1920;

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

// Helper for blurred background logic used in MatchCard
function BitmapBlurLayer({ bitmap }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!bitmap || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.offsetWidth || 1;
      const h = canvas.offsetHeight || 1;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const bw = bitmap.width;
      const bh = bitmap.height;
      const scale = Math.max(w / bw, h / bh);
      const dw = bw * scale;
      const dh = bh * scale;
      const dx = (w - dw) / 2;
      const dy = (h - dh) / 2;
      ctx.drawImage(bitmap, dx, dy, dw, dh);
    };
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    draw();
    return () => ro.disconnect();
  }, [bitmap]);
  return <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />;
}

export default function MatchSection({ matches: rawMatches }) {
  const sectionRef = useRef(null);
  const cw         = useContainerWidth(sectionRef);

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

  const matchcardManifest = useMemo(() =>
    (rawMatches || [])
      .filter(m => m.competition_category?.event_id?.card_image)
      .map(m => {
        const img = m.competition_category.event_id.card_image;
        return {
          url:           getAssetUrl(img),
          type:          "matchcard",
          width:         400,
          height:        280,
          naturalWidth:  img?.width,
          naturalHeight: img?.height,
        };
      })
      .filter(entry => !!entry.url),
  [rawMatches]);

  const { bitmaps } = useBlurImages(matchcardManifest);

  const liveMatches = useMemo(() => 
    (rawMatches || []).filter(m => m.status === 'live'), 
  [rawMatches]);
  
  const upcomingMatches = useMemo(() => 
    (rawMatches || []).filter(m => m.status === 'upcoming'), 
  [rawMatches]);

  const isMobile = cw > 0 && cw < 1024;
  const mobilePad = 20;

  const animStyles = useMemo(() => {
    const totalSlots = (liveMatches.length || 5) + 5;
    return Array.from({ length: totalSlots }, (_, slot) =>
      visible
        ? { animation: `live-intro 1s cubic-bezier(0.22, 1, 0.36, 1) ${slot * STAGGER_MS}ms both` }
        : { opacity: 0 }
    );
  }, [visible, liveMatches.length]);

  const anim = useCallback((slot) => animStyles[slot] ?? animStyles[animStyles.length - 1], [animStyles]);

  const scale        = computeScale(cw || NAT_W);
  const availableW   = (cw || NAT_W) - 2 * H_MARGIN * scale - (CTA_W * scale + CARD_GAP);
  const fittingCount = Math.max(1, Math.floor(availableW / (MIN_CARD_W + CARD_GAP)));
  const visibleCount = Math.min(fittingCount, SHOW_MAX);
  
  const cardMatches  = liveMatches.slice(0, visibleCount);

  // Mobile card sizing — width drives everything; height follows the MatchCard 350:280 ratio
  const MOBILE_CARD_VW = 0.7;
  const mobileCardPx   = cw * MOBILE_CARD_VW;
  const mobileCardH    = Math.round(mobileCardPx * 0.8);

  // CTA Background Logic
  const ctaBgInfo = useMemo(() => {
    const sample = cardMatches[0] || rawMatches.find(m => m.competition_category?.event_id?.card_image);
    if (!sample) return null;
    const url = getAssetUrl(sample.competition_category.event_id.card_image);
    return { url, bitmap: bitmaps[url]?.matchcard?.bitmap };
  }, [cardMatches, rawMatches, bitmaps]);

  return (
    <section ref={sectionRef} style={{
      position: "relative",
      zIndex: 2,
      background: "#0D26C2",
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-start",
      color: "white",
      overflow: "hidden",
      padding: "80px 0 60px",
    }}>
      <div style={{
        width: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: isMobile ? 14 : 20,
      }}>

        <div style={{ ...anim(0), paddingLeft: isMobile ? mobilePad : "clamp(40px, 8.33vw, 160px)", paddingRight: isMobile ? mobilePad : "clamp(40px, 8.33vw, 160px)" 
        }}>
          <div style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: isMobile ? "2.2rem" : "calc(64px * var(--s))",
            lineHeight: 1,
            color: "#fff",
            filter: "drop-shadow(0 4px 4px rgba(0,0,0,0.25))",
            textTransform: "uppercase",
          }}>
            <BlockRevealText delay={0.4} blockColor="#ffffff">
              {liveMatches.length > 0 ? "Live Matches" : "No Live Matches"}
            </BlockRevealText>
          </div>
        </div>

        {liveMatches.length > 0 && (
          isMobile ? (
            <div
              className="match-scroll"
              style={{
                ...anim(1),
                display: "flex",
                flexDirection: "row",
                gap: CARD_GAP,
                overflowX: "auto",
                scrollSnapType: "x proximity",
                scrollPaddingLeft: mobilePad,
                WebkitOverflowScrolling: "touch",
                paddingLeft: mobilePad,
                paddingRight: 0,
              }}
            >
              {liveMatches.map((match) => (
                <div
                  key={match.id}
                  style={{
                    flex: `0 0 ${mobileCardPx}px`,
                    width: `${mobileCardPx}px`,
                    height: mobileCardH,
                    scrollSnapAlign: "start",
                    borderRadius: 10,
                    overflow: "hidden",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
                  }}
                >
                  <MatchCard match={match} />
                </div>
              ))}
              <div style={{ flexShrink: 0, width: 8 }} />
            </div>
          ) : (
            <div style={{ ...anim(1), display: "flex", flexDirection: "row", gap: CARD_GAP, paddingLeft: "clamp(40px, 8.33vw, 160px)", paddingRight: "clamp(40px, 8.33vw, 160px)" }}>
              {cardMatches.map((match, i) => (
                <div key={match.id} style={{ ...anim(i + 2), flex: 1, minWidth: 0 }}>
                  <div style={{ width: "100%", height: "calc(280px * var(--s))", overflow: "hidden", borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.35)" }}>
                    <MatchCard match={match} />
                  </div>
                </div>
              ))}

              {/* DESKTOP CTA CARD */}
              <div style={{ ...anim(cardMatches.length + 2), flexShrink: 0 }}>
                <div style={{
                  width: "calc(240px * var(--s))", height: "calc(280px * var(--s))",
                  borderRadius: 10, boxSizing: "border-box",
                  position: "relative", overflow: "hidden", 
                  boxShadow: "0 8px 32px rgba(0,0,0,0.35)"
                }}>
                  {/* Filtered Background Wrapper - This ensures the Canvas is also desaturated */}
                  <div style={{ position: "absolute", inset: 0, filter: "saturate(0)", zIndex: 0 }}>
                    {ctaBgInfo?.url && (
                      <div style={{ position: "absolute", inset: 0, backgroundSize: "cover", backgroundPosition: "center", backgroundImage: `url(${ctaBgInfo.url})` }} />
                    )}
                    {ctaBgInfo?.bitmap && <BitmapBlurLayer bitmap={ctaBgInfo.bitmap} />}
                  </div>
                  {/* Card Overlay matching MatchCard */}
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.75) 100%)", zIndex: 1 }} />
                  
                  {/* Content with EXACT STROKE and width fix */}
                  <div style={{ 
                    position: "relative", zIndex: 2, 
                    display: "flex", flexDirection: "column", 
                    alignItems: "center", justifyContent: "center", 
                    height: "100%", borderRadius: 10, 
                    boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,1)", 
                    padding: 24, textAlign: "center"
                  }}>
                    {/* spacer dikit */}
                    <div style={{ height: 18 }} />
                    <Button href="/schedule" variant="primary" size="md">See Schedules</Button>
                    <div style={{ 
                      fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 800, 
                      color: "rgba(255,255,255,0.6)", textTransform: "uppercase", 
                      letterSpacing: 1, lineHeight: 1.4, marginTop: 14
                    }}>
                      See real time update<br/>scores
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        )}

        <div style={{
          ...anim(cardMatches.length + 3),
          paddingLeft:  isMobile ? mobilePad : "clamp(40px, 8.33vw, 160px)",
          paddingRight: isMobile ? mobilePad : "clamp(40px, 8.33vw, 160px)",
        }}>
          <MatchTable
            matches={upcomingMatches.slice(0, 5)}
            groupBy="event"
            title="Upcoming Matches"
            isMobile={isMobile}
          />
        </div>

        <div style={{
          ...anim(cardMatches.length + 4),
          display: "flex",
          justifyContent: "flex-end",
          paddingLeft:  isMobile ? mobilePad : "clamp(40px, 8.33vw, 160px)",
          paddingRight: isMobile ? mobilePad : "clamp(40px, 8.33vw, 160px)",
        }}>
          <Button href="/schedule" variant="primary" size="md">See More</Button>
        </div>

      </div>
    </section>
  );
}