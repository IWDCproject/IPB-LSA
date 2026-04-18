"use client";
/**
 * NewsTab.tsx
 *
 * Changes from original:
 *  - Accepts `phase: AnimPhase` prop
 *  - Skeleton is shown immediately on tab enter (no flicker) — we keep the
 *    skeleton mounted until data arrives, then crossfade to content.
 *    The tab-transition animation masks the first skeleton appearance entirely.
 *  - NewsCardSkeleton now lives in NewsCard (shimmer version); this file
 *    just imports it.
 *  - Grid and pagination stagger in using TAB_ENTER when phase === "entering"
 *  - Removed the separate loading branch that caused layout shift
 */

import { useState, useEffect, useRef } from "react";
import NewsCard, { NewsCardSkeleton } from "@/components/NewsCard";
import { getNewsByEvent } from "@/lib/directus";
import { TAB_ENTER } from "./Animations";
import type { AnimPhase } from "./UseTabTransition";

const JK = { fontFamily: "'Plus Jakarta Sans', sans-serif" } as const;
const PAGE_SIZE = 12;
const BLUE   = "#0D26C2";
const YELLOW = "#FFC936";

// ─── Pagination (unchanged) ────────────────────────────────────────────────────

function PaginationButton({
  label, active, disabled, onClick,
}: {
  label: React.ReactNode; active?: boolean; disabled?: boolean; onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  const bg     = active ? YELLOW : hovered && !disabled ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)";
  const color  = active ? "#06125C" : disabled ? "rgba(255,255,255,0.25)" : "#fff";
  const border = active ? `1px solid ${YELLOW}` : "1px solid rgba(255,255,255,0.15)";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...JK, minWidth: 36, height: 36, padding: "0 10px", borderRadius: 6,
        border, background: bg, color, fontSize: 13, fontWeight: active ? 800 : 600,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 0.2s ease, border 0.2s ease",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      {label}
    </button>
  );
}

function Pagination({ page, totalPages, onPageChange }: {
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
      <PaginationButton
        label={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>}
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
      />
      {pages.map((p, i) =>
        p === "…"
          ? <span key={`e-${i}`} style={{ ...JK, color: "rgba(255,255,255,0.3)", fontSize: 13, padding: "0 4px" }}>…</span>
          : <PaginationButton key={p} label={p} active={p === page} onClick={() => onPageChange(p as number)} />
      )}
      <PaginationButton
        label={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>}
        disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}
      />
    </div>
  );
}

// ─── Placeholder Card (fills last row) ────────────────────────────────────────

function NewsPlaceholder() {
  return (
    <div style={{
      position: "relative", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", borderRadius: 8,
      boxShadow: "0 0 0 2px rgba(255, 255, 255, 0.15)",
      background: "rgba(255, 255, 255, 0.03)", backdropFilter: "blur(4px)",
      padding: "40px", height: "100%", minHeight: 380, overflow: "hidden",
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
        <span style={{ ...JK, fontSize: "11px", fontWeight: 800, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.12em" }}>
          Coming Soon
        </span>
      </div>
    </div>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px", gap: 12 }}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5">
        <path d="M4 4h16v16H4zM4 9h16M9 4v16" />
      </svg>
      <span style={{ ...JK, fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.3)" }}>
        No news yet for this event
      </span>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface Props {
  event:    any;
  isMobile: boolean;
  phase:    AnimPhase;
}


export default function NewsTab({ event, isMobile, phase }: Props) {
  const [page,         setPage]         = useState(1);
  const [items,        setItems]        = useState<any[]>([]);
  const [totalPages,   setTotalPages]   = useState(0);
  const [contentState, setContentState] = useState<"loading" | "loaded" | "empty">("loading");
  // Increments every time fresh content arrives. Used as a React `key` on the
  // content wrapper so the CSS animation resets and replays on each load —
  // correct trigger point because by the time the fetch resolves, `phase` is
  // already "idle" and would never fire the animation.
  const [contentKey, setContentKey] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(1);

  // Detect column count from rendered grid
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid || isMobile) return;
    const update = () => {
      const cols = window.getComputedStyle(grid).gridTemplateColumns.split(" ").length;
      setColumns(cols);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(grid);
    return () => ro.disconnect();
  }, [isMobile, contentState]);

  useEffect(() => {
    let cancelled = false;
    // Only show skeleton on first load (no existing items). On pagination,
    // keep old items visible until new ones arrive — no layout shift.
    if (items.length === 0) setContentState("loading");

    getNewsByEvent(event.slug, page, PAGE_SIZE).then((res) => {
      if (cancelled) return;
      setItems(res.items);
      setTotalPages(res.totalPages);
      setContentState(res.items.length === 0 ? "empty" : "loaded");
      // Bump key → React unmounts+remounts the content wrapper → CSS animation replays.
      setContentKey(k => k + 1);
    });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.slug, page]);

  const handlePageChange = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ─── Skeleton ─────────────────────────────────────────────────────────────
  if (contentState === "loading") {
    return (
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))",
        gap: 20, alignItems: "stretch", padding: 2,
      }}>
        {Array.from({ length: PAGE_SIZE }).map((_, i) => (
          <NewsCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (contentState === "empty") return <EmptyState />;

  const remainder        = items.length % columns;
  const isLastPage       = page === totalPages;
  const placeholderCount = !isMobile && remainder !== 0 && isLastPage ? columns - remainder : 0;

  // Card stagger config — kept modest so the last card doesn't wait too long.
  // 12 cards × 35ms = 420ms total spread, each card slides up individually.
  const CARD_STAGGER_MS = 35;
  const CARD_DURATION   = TAB_ENTER.duration; // 280ms
  const CARD_EASING     = TAB_ENTER.easing;

  // `key={contentKey}` unmounts+remounts this entire subtree on each fresh
  // load, resetting all CSS animation-delay timers back to 0 automatically.
  return (
    <div key={contentKey}>
      <div
        ref={gridRef}
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 20, alignItems: "stretch", padding: 2,
        }}
      >
        {items.map((item, i) => (
          <div
            key={item.id}
            style={{
              opacity:   0,
              animation: `anim-slide-up ${CARD_DURATION}ms ${CARD_EASING} ${i * CARD_STAGGER_MS}ms forwards`,
            }}
          >
            <NewsCard item={item} />
          </div>
        ))}
        {Array.from({ length: placeholderCount }).map((_, i) => (
          <div
            key={`p-${i}`}
            style={{
              opacity:   0,
              animation: `anim-slide-up ${CARD_DURATION}ms ${CARD_EASING} ${(items.length + i) * CARD_STAGGER_MS}ms forwards`,
            }}
          >
            <NewsPlaceholder />
          </div>
        ))}
      </div>

      <div style={{
        opacity:   0,
        animation: `anim-fade-in ${CARD_DURATION}ms ${CARD_EASING} ${items.length * CARD_STAGGER_MS + 60}ms forwards`,
      }}>
        <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
      </div>
    </div>
  );
}