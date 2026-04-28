"use client";

import { useState, useEffect } from "react";
import NewsCard, { NewsCardSkeleton } from "@/components/NewsCard";
import { JK, YELLOW, NAVY, DUR, EASE, BASE, STAGGER } from "./_newsConstants";
import type { NewsItem } from "./_newsTypes";

// ─── Placeholder card — fills empty grid slots in the last row ────────────────

export function NewsPlaceholder({ isMobile = false }: { isMobile?: boolean }) {
  return (
    <div style={{
      position: "relative", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", borderRadius: 8,
      boxShadow: "0 0 0 2px rgba(255, 255, 255, 0.15)",
      background: "rgba(255, 255, 255, 0.03)", backdropFilter: "blur(8px)",
      padding: "40px", height: "100%", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "url(/Batik_Pattern_white.svg)",
        backgroundSize: "cover", backgroundRepeat: "no-repeat",
        backgroundPosition: "center", opacity: 0.15,
        pointerEvents: "none", zIndex: 0, filter: "blur(1.5px)",
      }} />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" style={{ marginBottom: 12 }}>
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span style={{ ...JK, fontSize: "11px", fontWeight: 800, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.12em", textAlign: "center" }}>
          Coming Soon
        </span>
      </div>
    </div>
  );
}

// ─── Card slot — skeleton/card crossfade + staggered slide-up ─────────────────
// Each slot is a CSS grid stack (gridArea: "1/1") so skeleton and real card
// occupy the same space and crossfade cleanly.

interface CardSlotProps {
  index:         number;
  item:          NewsItem | null;
  isPlaceholder: boolean;
  ready:         boolean;
  showSkeleton:  boolean;
  isMobile:      boolean;
  onClick?:      () => void;
}

export function CardSlot({ index, item, isPlaceholder, ready, showSkeleton, isMobile, onClick }: CardSlotProps) {
  const [cardShowing, setCardShowing] = useState(false);

  // One rAF after `ready` flips — gives the browser a frame to paint the card
  // at opacity:0 before starting the crossfade, preventing a flash.
  useEffect(() => {
    if (!ready || !showSkeleton) return;
    const raf = requestAnimationFrame(() => setCardShowing(true));
    return () => cancelAnimationFrame(raf);
  }, [ready, showSkeleton]);

  const delay        = `${BASE + index * STAGGER}ms`;
  const cardOpacity  = showSkeleton ? (cardShowing ? 1 : 0) : (ready ? 1 : 0);
  const cardInteract = showSkeleton ? cardShowing : ready;

  return (
    <div
      onClick={cardInteract && onClick ? onClick : undefined}
      style={{
        opacity: 0,
        animation: `np-slide-up ${DUR}ms ${EASE} ${delay} forwards`,
        display: "grid",
        cursor: cardInteract && onClick ? "pointer" : "default",
        borderRadius: 8,
      }}
    >
      {showSkeleton && (
        <div style={{
          gridArea:      "1/1",
          opacity:       cardShowing ? 0 : 1,
          visibility:    cardShowing ? "hidden" : "visible",
          transition:    "opacity 0.3s ease, visibility 0s linear 0.3s",
          pointerEvents: "none",
          zIndex:        cardShowing ? 0 : 1,
        }}>
          <NewsCardSkeleton isMobile={isMobile} />
        </div>
      )}
      <div style={{
        gridArea:      "1/1",
        opacity:       cardOpacity,
        transition:    showSkeleton ? "opacity 0.3s ease" : "none",
        pointerEvents: cardInteract ? "auto" : "none",
        zIndex:        cardInteract ? 1 : 0,
        height:        "100%",
      }}>
        {ready && (
          isPlaceholder
            ? <NewsPlaceholder isMobile={isMobile} />
            : item
              ? <NewsCard item={item} isMobile={isMobile} />
              : null
        )}
      </div>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function PaginationBtn({
  label, active, disabled, onClick,
}: {
  label: React.ReactNode; active?: boolean; disabled?: boolean; onClick: () => void;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        ...JK, minWidth: 36, height: 36, padding: "0 10px", borderRadius: 6,
        border: active ? `1px solid ${YELLOW}` : "1px solid rgba(255,255,255,0.15)",
        background: active ? YELLOW : hov && !disabled ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
        color: active ? NAVY : disabled ? "rgba(255,255,255,0.25)" : "#fff",
        fontSize: 13, fontWeight: active ? 800 : 600,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 0.2s, border 0.2s",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >{label}</button>
  );
}

export function Pagination({ page, totalPages, onPageChange }: {
  page: number; totalPages: number; onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages: (number | "…")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("…");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("…");
    pages.push(totalPages);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 40 }}>
      <PaginationBtn
        label={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>}
        disabled={page === 1} onClick={() => onPageChange(page - 1)}
      />
      {pages.map((p, i) =>
        p === "…"
          ? <span key={`e-${i}`} style={{ ...JK, color: "rgba(255,255,255,0.3)", fontSize: 13, padding: "0 4px" }}>…</span>
          : <PaginationBtn key={p} label={p} active={p === page} onClick={() => onPageChange(p as number)} />
      )}
      <PaginationBtn
        label={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>}
        disabled={page === totalPages} onClick={() => onPageChange(page + 1)}
      />
    </div>
  );
}