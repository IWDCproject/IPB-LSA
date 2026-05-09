"use client";

import React from "react";
import NewsCard from "@/components/NewsCard";
import Button from "@/components/Button";
import { NewsPlaceholder } from "../shared/NewsPlaceholder";
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

  // Desktop: fill up to 4 items with placeholders.
  // Mobile: single column - no placeholders needed to balance the grid.
  const placeholderCount = isMobile ? 0 : Math.max(0, 4 - displayNews.length);
  const placeholders     = Array.from({ length: placeholderCount });

  return (
    <div className="pb-0">
      {/* Section header */}
      <div className="flex items-center gap-4 mb-5 mt-[60px]">
        <span className="font-jakarta text-[22px] font-extrabold text-white whitespace-nowrap">
          Latest Stories
        </span>
        <div className="mt-[3px] flex-1 h-0.5 bg-gradient-to-r from-white/70 to-white/30" />
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

      {/* News grid */}
      <div
        className={`grid gap-2 items-stretch ${
          isMobile ? "grid-cols-1" : "grid-cols-4"
        }`}
      >
        {displayNews.map((item) => (
          <NewsCard key={item.id} item={item} isMobile={isMobile} />
        ))}
        {placeholders.map((_, i) => (
          <NewsPlaceholder key={`p-${i}`} />
        ))}
      </div>

      {/* Mobile read-more button */}
      {isMobile && (
        <div className="mt-5 flex justify-center">
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