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
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
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
  // 2. Mobile: If 1 or 3 items, add 1 placeholder to balance the 2-column grid.
  let placeholderCount = 0;
  if (isMobile) {
    if (displayNews.length === 1 || displayNews.length === 3) {
      placeholderCount = 1;
    }
  } else {
    placeholderCount = Math.max(0, 4 - displayNews.length);
  }

  const placeholders = Array.from({ length: placeholderCount });

  return (
    <div style={{ paddingBottom: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 30, marginTop: 60 }}>
        <span style={{ ...JK, fontSize: 22, fontWeight: 800, color: "#fff", whiteSpace: "nowrap" }}>
          Latest Stories
        </span>
        <div style={{ flex: 1, height: 2, background: "rgba(255,255,255,0.2)" }} />
        <Button
          variant="header-outline"
          size="sm"
          onClick={() => onTabChange?.("news")} 
          showShadow={false}
        >
          Read More News!
        </Button>
      </div>

      <div
        style={{
          display: "grid",
          // FIXED: Use explicit column counts instead of auto-fill to prevent wrapping
          gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
          gap: isMobile ? 12 : 20,
          alignItems: "stretch",
        }}
      >
        {displayNews.map((item) => (
          <NewsCard key={item.id} item={item} />
        ))}

        {/* Placeholders are now rendered for both mobile and desktop based on the count logic above */}
        {placeholders.map((_, i) => (
          <NewsPlaceholder key={`p-${i}`} />
        ))}
      </div>
    </div>
  );
}