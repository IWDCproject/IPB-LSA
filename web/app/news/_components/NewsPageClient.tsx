"use client";

import { useRef, useState, useLayoutEffect, useMemo } from "react";
import LatestStoriesSection from "./LatestStoriesSection";
import ContentSection from "./ContentSection";
import Footer from "@/components/Footer";
import { useBlurImages } from "@/hooks/useBlurImages";

// ─── Types ────────────────────────────────────────────────────────────────────

type EventStatus = "upcoming" | "ongoing" | "concluded";

interface NewsItem {
  id:               string;
  title:            string;
  slug:             string;
  excerpt:          string | null;
  thumbnail_url:    string | null;
  thumbnail_width:  number | null;
  thumbnail_height: number | null;
  category:         string;
  published_at:     string;
  event_id:         { name: string; slug?: string } | null;
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
  latestNews: NewsItem[];
  events:     EventWithNews[];
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useContainerWidth(ref: React.RefObject<HTMLElement>): number {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

function desktopPad(cw: number) {
  return Math.min(160, Math.max(40, cw * 0.0833));
}

// ─── Global animation keyframes (referenced by all child components) ──────────

const NP_CSS = `
  @keyframes np-up       { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: none; } }
  @keyframes np-in       { from { opacity: 0; }                              to { opacity: 1; }                  }
  @keyframes np-slide-up { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
`;

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function NewsPageClient({ latestNews, events }: Props) {
  const rootRef  = useRef<HTMLDivElement>(null!);
  const cw       = useContainerWidth(rootRef as React.RefObject<HTMLElement>);
  const isMobile = cw < 1024;
  const pad      = isMobile ? 20 : desktopPad(cw);

  // Register latestNews thumbnails with the shared blur worker —
  // mirrors what NewsSection does on the homepage so HomepageNewsCard
  // receives blur bitmaps and renders with the same blurred background.
  const blurManifest = useMemo(() =>
    latestNews
      .map((item, i) =>
        item.thumbnail_url
          ? {
              url:           item.thumbnail_url,
              type:          "newscard" as const,
              width:         i === 0 ? 800 : 400,
              height:        i === 0 ? 600 : 300,
              naturalWidth:  item.thumbnail_width,
              naturalHeight: item.thumbnail_height,
            }
          : null
      )
      .filter(Boolean),
    [latestNews]
  );

  useBlurImages(blurManifest);

  // Don't render content until the real container width is known —
  // prevents the one-frame flash where row heights are calculated from the
  // stale useState default.
  if (cw === 0) return <div ref={rootRef} style={{ overflowX: "hidden" }} />;

  return (
    <div ref={rootRef} style={{ overflowX: "hidden" }}>
      <style dangerouslySetInnerHTML={{ __html: NP_CSS }} />

      {/* ── 1. Latest Stories ─────────────────────────────────────────── */}
      <LatestStoriesSection
        latestNews={latestNews}
        cw={cw}
        isMobile={isMobile}
        pad={pad}
      />

      {/* ── 2. Content section (By Event | Semua Berita tabs) ─────────── */}
      <ContentSection
        events={events}
        isMobile={isMobile}
        pad={pad}
      />
      <Footer />
    </div>
  );
}