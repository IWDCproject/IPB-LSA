"use client";

import { useRef, useState, useEffect } from "react";
import LatestStoriesSection from "./LatestStoriesSection";
import ContentSection from "./ContentSection";
import Footer from "@/components/Footer";

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
  const [width, setWidth] = useState(1280);
  useEffect(() => {
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

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function NewsPageClient({ latestNews, events }: Props) {
  const rootRef  = useRef<HTMLDivElement>(null!);
  const cw       = useContainerWidth(rootRef as React.RefObject<HTMLElement>);
  const isMobile = cw < 1024;
  const pad      = isMobile ? 20 : desktopPad(cw);

  return (
    <div ref={rootRef} style={{ overflowX: "hidden" }}>
      {/* ── 1. Latest Stories (blue gradient) ─────────────────────────── */}
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