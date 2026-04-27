"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import HomepageNewsCard from "@/app/_components/news-stuff/HomepageNewsCard";
import Button from "@/components/Button";
import UniversityMarquee from "@/components/UniversityMarquee";
import { BB, JK, BLUE, NAVY } from "./_newsConstants";

// Local subset type — intentionally narrow, documents what this component uses
interface NewsItem {
  id:            string;
  title:         string;
  slug:          string;
  thumbnail_url: string | null;
  event_id:      { name: string; slug?: string } | null;
}

interface Props {
  latestNews: NewsItem[];
  cw:         number;
  isMobile:   boolean;
  pad:        number;
}

// ─── Hover card wrapper ────────────────────────────────────────────────────────

function HoverCard({
  children,
  style,
  onClick,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 10,
        overflow: "hidden",
        position: "relative",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      {children}

      {/* Border overlay — sits above the card image so it's always visible */}
      <div style={{
        position: "absolute", inset: 0,
        borderRadius: 10,
        border: `2px solid ${hovered ? "#FFD43B" : "rgba(255,255,255,0.55)"}`,
        transition: "border-color 0.18s ease",
        pointerEvents: "none",
        zIndex: 10,
      }} />
    </div>
  );
}

// ─── Ghost card ───────────────────────────────────────────────────────────────

function LatestGhost({ style }: { style?: React.CSSProperties }) {
  return (
    <div style={{
      width: "100%", height: "100%", minHeight: 100,
      borderRadius: 10,
      border: "1.5px dashed rgba(255,255,255,0.10)",
      background: "rgba(255,255,255,0.03)",
      position: "relative", overflow: "hidden",
      display: "flex", alignItems: "center", justifyContent: "center",
      ...style,
    }}>
      {/* Batik overlay */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "url(/Batik_Pattern_white.svg)",
        backgroundSize: "cover", backgroundRepeat: "no-repeat",
        backgroundPosition: "center", opacity: 0.06,
        pointerEvents: "none",
      }} />
      <span style={{
        ...JK, position: "relative", zIndex: 1,
        fontSize: 10, fontWeight: 800, letterSpacing: "0.12em",
        color: "rgba(255,255,255,0.18)", textTransform: "uppercase",
      }}>
        More soon
      </span>
    </div>
  );
}

// ─── Desktop grid ─────────────────────────────────────────────────────────────

function DesktopGrid({ news, cw }: { news: NewsItem[]; cw: number }) {
  const router  = useRouter();
  const rowH    = Math.min(260, Math.max(160, cw * 0.135));
  const [main, ...rest] = news;

  // Build 4 small slots — real cards or ghosts
  const smallSlots = Array.from({ length: 4 }, (_, i) => rest[i] ?? null);

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "2fr 1fr 1fr",
      gridTemplateRows: `${rowH}px ${rowH}px`,
      gap: 6,
    }}>
      {/* Main slot — always 2 rows tall */}
      <div style={{ gridRow: "1 / 3" }}>
        {main ? (
          <HoverCard
            style={{ height: "100%" }}
            onClick={() => router.push(`/news/${main.event_id?.slug}/${main.slug}`)}
          >
            <HomepageNewsCard
              thumbnail_url={main.thumbnail_url}
              tag={main.event_id?.name ?? null}
              title={main.title}
              isMain
            />
          </HoverCard>
        ) : (
          <LatestGhost />
        )}
      </div>

      {/* 4 small slots */}
      {smallSlots.map((item, i) =>
        item ? (
          <HoverCard
            key={item.id}
            style={{ minHeight: 0 }}
            onClick={() => router.push(`/news/${item.event_id?.slug}/${item.slug}`)}
          >
            <HomepageNewsCard
              thumbnail_url={item.thumbnail_url}
              tag={item.event_id?.name ?? null}
              title={item.title}
            />
          </HoverCard>
        ) : (
          <LatestGhost key={`ghost-${i}`} />
        )
      )}
    </div>
  );
}

// ─── Mobile stack ─────────────────────────────────────────────────────────────

function MobileStack({ news }: { news: NewsItem[] }) {
  const router = useRouter();
  const [main, ...rest] = news;
  const smallSlots = Array.from({ length: 4 }, (_, i) => rest[i] ?? null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(3px, 2vw, 5px)" }}>
      {/* Main */}
      <div style={{ width: "100%", height: "clamp(200px, 52vw, 280px)" }}>
        {main ? (
          <HoverCard
            style={{ height: "100%" }}
            onClick={() => router.push(`/news/${main.event_id?.slug}/${main.slug}`)}
          >
            <HomepageNewsCard thumbnail_url={main.thumbnail_url} tag={main.event_id?.name ?? null} title={main.title} isMain compact />
          </HoverCard>
        ) : (
          <LatestGhost />
        )}
      </div>

      {/* 2×2 small grid */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "clamp(120px, 32vw, 160px) clamp(120px, 32vw, 160px)",
        gap: "clamp(3px, 2vw, 5px)",
      }}>
        {smallSlots.map((item, i) =>
          item ? (
            <HoverCard
              key={item.id}
              style={{ minHeight: 0 }}
              onClick={() => router.push(`/news/${item.event_id?.slug}/${item.slug}`)}
            >
              <HomepageNewsCard thumbnail_url={item.thumbnail_url} tag={item.event_id?.name ?? null} title={item.title} compact />
            </HoverCard>
          ) : (
            <LatestGhost key={`ghost-${i}`} />
          )
        )}
      </div>
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

export default function LatestStoriesSection({ latestNews, cw, isMobile, pad }: Props) {
  return (
    <section style={{ background: `linear-gradient(160deg, ${BLUE} 0%, ${NAVY} 100%)`, position: "relative", overflow: "hidden" }}>

      {/* Batik top overlay */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "100%", width: "100%",
        backgroundImage: "url(/Batik_Pattern_dark.svg)",
        // backgroundSize: "cover",
        backgroundPosition: "bottom center",
				backgroundRepeat: "repeat-x",
        opacity: 0.3, pointerEvents: "none",
      }} />

      <div style={{
        position: "relative", zIndex: 1,
        paddingLeft: pad, paddingRight: pad,
        paddingTop: isMobile ? 40 : 64,
        paddingBottom: isMobile ? 10 : 15,
      }}>

        {/* Title row */}
        <div style={{
          display: "flex", alignItems: "flex-end", justifyContent: "space-between",
          marginBottom: isMobile ? 18 : 24, gap: 12, flexWrap: "wrap",
          animation: "np-up 0.5s ease 0.05s both",
        }}>
          <div>
            <div style={{
              ...BB,
              fontSize: isMobile ? "clamp(2.5rem, 10vw, 4rem)" : "clamp(3rem, 4.5vw, 4rem)",
              color: "#fff", lineHeight: 1,
            }}>
              Latest Stories
            </div>
            {latestNews.length > 0 && (
              <p style={{ ...JK, margin: "0px 0 10px", fontSize: "clamp(12px, 1.4vw, 14px)", color: "rgba(255,255,255,0.7)", filter: "drop-shadow(2px 4px 6px rgba(0,0,0,0.2))", fontWeight: 600,}}>
                The freshest coverage from our events
              </p>
            )}
          </div>
        </div>

        {/* Grid */}
        <div style={{ animation: "np-up 0.55s ease 0.2s both" }}>
          {isMobile
            ? <MobileStack news={latestNews} />
            : <DesktopGrid news={latestNews} cw={cw} />
          }
        </div>

        
      </div>
      {/* University marquee */}
      <div style={{ position: "relative", zIndex: 2, animation: "np-in 0.6s ease 0.4s both" }}>
        <UniversityMarquee />
      </div>
      {/* spacer dikit buat tabs notch */}
      <div style={{ height: 120 }} />
    </section>
  );
}