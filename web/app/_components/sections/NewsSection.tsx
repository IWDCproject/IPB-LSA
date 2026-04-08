"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useBlurImages } from "@/hooks/useBlurImages";
import NewsCard from "../news-stuff/NewsCard";
import Button   from "@/components/Button";


// Types

interface NewsItem {
  id:            string;
  title:         string;
  slug:          string;
  excerpt:       string | null;
  thumbnail_url:    string | null;
  thumbnail_width:  number | null;
  thumbnail_height: number | null;
  category:      string;
  published_at:  string;
  event_id:      { name: string } | null;
}

interface NewsSectionProps {
  news?: NewsItem[];
}


// Layout constants

const MOBILE_PAD = 20;
const MOBILE_THRESHOLD = 1024;
const SCALE_START = 1600;
const SCALE_FLOOR = 0.875;

// Horizontal padding that scales with container width (8.33% of cw),
function desktopPad(cw: number) {
  return Math.min(160, Math.max(40, cw * 0.0833));
}

const styles = {
  section: {
    position:       "relative",
    zIndex:         2,
    boxShadow:      "0 -30px 60px rgba(0,0,0,0.5)",
    background:     "#ffffff",
    overflow:       "hidden",
    boxSizing:      "border-box",
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
  } as React.CSSProperties,

  inner: {
    boxSizing: "border-box",
    width:     "100%",
  } as React.CSSProperties,

  heading: {
    margin:     0,
    fontFamily: "'Bebas Neue', sans-serif",
    lineHeight: 1,
    color:      "#111111",
    filter:     "drop-shadow(0 4px 4px rgba(0,0,0,0.25))",
  } as React.CSSProperties,

  // -- desktop grid --
  grid: (cw: number): React.CSSProperties => ({
    display:             "grid",
    gridTemplateColumns: "2fr 1fr 1fr",
    gridTemplateRows:    `${Math.min(260, Math.max(160, cw * 0.135))}px ${Math.min(260, Math.max(160, cw * 0.135))}px`,
    gap:                 "12px",
  }),

  mainCell: {
    gridRow: "1 / 3",
  } as React.CSSProperties,

  smallCell: {
    minHeight: 0,
  } as React.CSSProperties,

  // -- mobile layout --
  mobileLayout: {
    display:       "flex",
    flexDirection: "column",
    gap:           12,
  } as React.CSSProperties,

  mobileMainCell: {
    width:  "100%",
    height: 280,
  },

  mobileSmallGrid: {
    display:             "grid",
    gridTemplateColumns: "1fr 1fr",
    gridTemplateRows:    "160px 160px",
    gap:                 12,
  },

  mobileSmallCell: {
    minHeight: 0,
  },

  buttonWrap: {
    display:        "flex",
    justifyContent: "flex-end",
    marginTop:      20,
  },
} as const;


// Hook

function useContainerWidth(ref: React.RefObject<HTMLElement>): number {
  const [width, setWidth] = useState(1200);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = (w: number) => {
      setWidth(w);
      // Aligned to HeroSection: same reference width and scale floor
      el.style.setProperty("--s", `${Math.max(SCALE_FLOOR, Math.min(1, w / SCALE_START))}`);
    };
    const ro = new ResizeObserver(([entry]) => update(entry.contentRect.width));
    ro.observe(el);
    update(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, [ref]);

  return width;
}


// Component

// `news` prop = array dari Directus
export default function NewsSection({ news }: NewsSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const cw         = useContainerWidth(sectionRef);
  const isMobile = cw < MOBILE_THRESHOLD;
  const pad      = isMobile ? MOBILE_PAD : desktopPad(cw);

  // Register news thumbnails with the shared blur worker.
  // NewsCard reads the resulting bitmaps directly from BlurContext.
  const newsManifest = useMemo(() =>
    (news ?? []).map((item, i) => item.thumbnail_url ? {
      url:           item.thumbnail_url,
      type:          "newscard" as const,
      width:         i === 0 ? 800 : 400,
      height:        i === 0 ? 600 : 300,
      naturalWidth:  item.thumbnail_width,
      naturalHeight: item.thumbnail_height,
    } : null).filter(Boolean),
  [news]);

  useBlurImages(newsManifest);

  const [main, ...rest] = news;
  // if (!main) return null;

  return (
    <section
      ref={sectionRef}
      style={{
        ...styles.section,
        minHeight: isMobile ? "auto" : "100vh",
        padding:   isMobile ? "60px 0" : "0",
      }}
    >
      <div
        style={{
          ...styles.inner,
          paddingLeft:   pad,
          paddingRight:  pad,
          paddingBottom: isMobile ? 60 : Math.min(100, Math.max(40, cw * 0.052)),
        }}
      >
        {/* Batik texture overlay */}
        <div style={{
          position: "absolute", inset: 0, backgroundImage: "url(/Batik_Pattern_dark.svg)",
          backgroundSize: "cover", opacity: 0.3, pointerEvents: "none",
        }} />

        <h2
          style={{
            ...styles.heading,
            fontSize:     isMobile ? "clamp(1.8rem, 7vw, 2.5rem)" : "calc(64px * var(--s))",
            marginBottom: isMobile ? 12 : 17,
          }}
        >
          Latest Stories
        </h2>

        {isMobile ? (
          // mobile: kartu gede di atas, 4 kecil 2x2 di bawah
          <div style={styles.mobileLayout}>
            <div style={styles.mobileMainCell}>
              <NewsCard
                thumbnail_url={main.thumbnail_url}
                tag={main.event_id?.name ?? null}
                title={main.title}
                isMain
                compact
              />
            </div>
            <div style={styles.mobileSmallGrid}>
              {rest.map((item) => (
                <div key={item.id} style={styles.mobileSmallCell}>
                  <NewsCard
                    thumbnail_url={item.thumbnail_url}
                    tag={item.event_id?.name ?? null}
                    title={item.title}
                    compact
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          // desktop: gede kiri span 2 baris, 2x2 di kanan
          <div style={styles.grid(cw)}>
            <div style={styles.mainCell}>
              <NewsCard
                thumbnail_url={main?.thumbnail_url}
                tag={main?.event_id?.name ?? null}
                title={main?.title}
                isMain
              />
            </div>
            {rest.map((item) => (
              <div key={item.id} style={styles.smallCell}>
                <NewsCard
                  thumbnail_url={item.thumbnail_url}
                  tag={item.event_id?.name ?? null}
                  title={item.title}
                />
              </div>
            ))}
          </div>
        )}

        <div style={styles.buttonWrap}>
          <Button href="/news" variant="primary" size="md">
            More News
          </Button>
        </div>
      </div>
    </section>
  );
}