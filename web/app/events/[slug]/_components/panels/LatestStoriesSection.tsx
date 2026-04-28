"use client";

import React from "react";
import NewsCard from "@/components/NewsCard";
import Button from "@/components/Button";
import { NewsPlaceholder } from "../shared/NewsPlaceholder";
import { JK } from "../shared/tokens";
import type { MappedNews } from "../../_types";

export default function LatestStoriesSection({
  news = [],
  eventSlug,
  isMobile,
  onTabChange,
}: {
  news:         MappedNews[];
  eventSlug:    string;
  isMobile:     boolean;
  onTabChange?: (t: "news") => void;
}) {
  const displayNews = news.slice(0, 4);

  // Desktop: always fill up to 4 items with placeholders.
  // Mobile: single column — no placeholders needed to balance grid.
  const placeholderCount = isMobile ? 0 : Math.max(0, 4 - displayNews.length);
  const placeholders = Array.from({ length: placeholderCount });

  return (
    <div style={{ paddingBottom: 0 }}>
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

      <div style={{
        display:             "grid",
        gridTemplateColumns: isMobile ? "repeat(1, 1fr)" : "repeat(4, 1fr)",
        gap:                 8,
        alignItems:          "stretch",
      }}>
        {displayNews.map((item) => (
          <NewsCard key={item.id} item={item} isMobile={isMobile} />
        ))}
        {placeholders.map((_, i) => (
          <NewsPlaceholder key={`p-${i}`} />
        ))}
      </div>

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