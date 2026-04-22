"use client";

import React from "react";
import NewsCard from "@/components/NewsCard";
import Button from "@/components/Button";

const JK = { fontFamily: "'Plus Jakarta Sans', sans-serif" } as const;

/**
 * Placeholder Card — decorative, shown when an event has fewer than 4 news items.
 */
function NewsPlaceholder() {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
        boxShadow: "0 0 0 2px rgba(255, 255, 255, 0.15)",
        background: "rgba(255, 255, 255, 0.03)",
        backdropFilter: "blur(8px)",
        padding: "40px",
        height: "100%",
        minHeight: 380,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "url(/Batik_Pattern_white.svg)",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          opacity: 0.15,
          pointerEvents: "none",
          zIndex: 0,
          filter: "blur(1.5px)",
        }}
      />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", textAlign: "center" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" style={{ marginBottom: 12 }}>
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span style={{ ...JK, fontSize: "11px", fontWeight: 800, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.12em" }}>
          Coming Soon
        </span>
      </div>
    </div>
  );
}

export default function LatestStoriesSection({
  news = [],
  eventSlug,
  isMobile,
  onTabChange,
}: {
  news: any[];
  eventSlug: string;
  isMobile: boolean;
  onTabChange?: (t: "news") => void;
}) {
  // Limit to 4 items for the "Latest" row
  const displayNews = news.slice(0, 4);
  
  // Logic for placeholders:
  // 1. Desktop: Always fill up to 4 items.
  // 2. Mobile: Single column — no placeholders needed to balance grid.
  let placeholderCount = 0;
  if (!isMobile) {
    placeholderCount = Math.max(0, 4 - displayNews.length);
  }

  const placeholders = Array.from({ length: placeholderCount });

  return (
    <div style={{ paddingBottom: 0 }}>
      {/* Header row — on mobile: title + line only (no CTA button) */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, marginTop: 60 }}>
        <span style={{ ...JK, fontSize: 22, fontWeight: 800, color: "#fff", whiteSpace: "nowrap" }}>
          Latest Stories
        </span>
        <div style={{ marginTop: 3, flex: 1, height: 2, background: "linear-gradient(to right, rgba(255,255,255,0.7), rgba(255,255,255,0.3))" }} />
        {!isMobile && (
          <Button
            variant="header-outline"
            size="sm"
            onClick={() => onTabChange?.("news")}
            showShadow={false}
          >
            Read More News!
          </Button>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "repeat(1, 1fr)" : "repeat(4, 1fr)",
          gap: isMobile ? 10 : 20,
          alignItems: "stretch",
        }}
      >
        {displayNews.map((item) => (
          <NewsCard key={item.id} item={item} isMobile={isMobile} />
        ))}

        {placeholders.map((_, i) => (
          <NewsPlaceholder key={`p-${i}`} />
        ))}
      </div>

      {/* CTA button below cards — mobile only */}
      {isMobile && (
        <div style={{ marginTop: 20, display: "flex", justifyContent: "center" }}>
          <Button
            variant="header-outline"
            size="sm"
            onClick={() => onTabChange?.("news")}
            showShadow={false}
          >
            Read More News!
          </Button>
        </div>
      )}
    </div>
  );
}