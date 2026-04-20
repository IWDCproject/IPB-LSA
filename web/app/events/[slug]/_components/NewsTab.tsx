"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import NewsCard, { NewsCardSkeleton } from "@/components/NewsCard";
import { getNewsByEvent, getNewsCountByEvent } from "@/lib/directus";
import { TAB_ENTER } from "./Animations";
import type { AnimPhase } from "./UseTabTransition";

const JK = { fontFamily: "'Plus Jakarta Sans', sans-serif" } as const;
const PAGE_SIZE = 12;
const YELLOW = "#FFC936";

// ─── Responsive columns ────────────────────────────────────────────────────────

function getColumns(width: number, isMobile: boolean): number {
  if (isMobile || width < 768) return 2;
  if (width < 1400)            return 3;
  return 4;
}

function useColumns(isMobile: boolean): number {
  const [columns, setColumns] = useState(() =>
    typeof window !== "undefined" ? getColumns(window.innerWidth, isMobile) : 4
  );
  useEffect(() => {
    const handler = () => setColumns(getColumns(window.innerWidth, isMobile));
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [isMobile]);
  return columns;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

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

// ─── Placeholder Card ─────────────────────────────────────────────────────────

function NewsPlaceholder({ isMobile = false }: { isMobile?: boolean }) {
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
        <span style={{ ...JK, fontSize: "11px", fontWeight: 800, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.12em" }}>
          Coming Soon
        </span>
      </div>
    </div>
  );
}

// ─── Card Slot ────────────────────────────────────────────────────────────────
// Uses CSS grid stacking (grid-area: 1/1) so skeleton and real card occupy the
// same cell. Slot height = max(skeleton, card) — no clipping, no absolute
// positioning, no height jump. Skeleton fades out, card fades in, in place.

interface SlotProps {
  index:         number;
  item:          any | null;
  isPlaceholder: boolean;
  ready:         boolean;
  isMobile:      boolean;
  dur:           number;
  ease:          string;
  base:          number;
  stagger:       number;
}

function CardSlot({ index, item, isPlaceholder, ready, isMobile, dur, ease, base, stagger }: SlotProps) {
  return (
    <div
      style={{
        opacity: 0,
        animation: `anim-slide-up-soft ${dur}ms ${ease} ${base + index * stagger}ms forwards`,
        display: "grid",   // grid stacking: both children share the same cell
        height: "100%",
      }}
    >
      {/* Skeleton — grid-area 1/1, fades out when ready, stays in layout */}
      <div
        style={{
          gridArea:      "1/1",
          opacity:       ready ? 0 : 1,
          visibility:    ready ? "hidden" : "visible",
          transition:    ready ? "opacity 0.3s ease" : "none",
          pointerEvents: "none",
          zIndex:        ready ? 0 : 1,
        }}
      >
        <NewsCardSkeleton isMobile={isMobile} />
      </div>

      {/* Real card — grid-area 1/1, fades in when ready */}
      <div
        style={{
          gridArea:      "1/1",
          opacity:       ready ? 1 : 0,
          transition:    ready ? "opacity 0.3s ease" : "none",
          pointerEvents: ready ? "auto" : "none",
          zIndex:        ready ? 1 : 0,
        }}
      >
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

// ─── Main Component ────────────────────────────────────────────────────────────

interface Props {
  event:    any;
  isMobile: boolean;
  phase:    AnimPhase;
}

export default function NewsTab({ event, isMobile, phase }: Props) {
  const [page,       setPage]       = useState(1);
  const [items,      setItems]      = useState<any[] | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [totalSlots, setTotalSlots] = useState(PAGE_SIZE);
  const [ready,      setReady]      = useState(false);
  const [animKey,    setAnimKey]    = useState(0);

  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [lockedHeight, setLockedHeight] = useState<number | null>(null);

  const COLUMNS = useColumns(isMobile);
  const GAP     = isMobile ? 12 : 20;

  useEffect(() => {
    setItems(null);
    setReady(false);
    setTotalSlots(PAGE_SIZE);
    setAnimKey(k => k + 1);

    let cancelled = false;

    getNewsCountByEvent(event.slug, page, PAGE_SIZE).then(({ pageCount, totalPages: tp }) => {
      if (cancelled) return;

      const isLastPage   = page === tp;
      const remainder    = pageCount % COLUMNS;
      const placeholders = remainder !== 0 && isLastPage ? COLUMNS - remainder : 0;

      setTotalSlots(pageCount + placeholders);
      setTotalPages(tp);
    });

    getNewsByEvent(event.slug, page, PAGE_SIZE).then(({ items: newItems }) => {
      if (cancelled) return;
      setItems(newItems);
      setReady(true);
    });

    return () => { cancelled = true; };
  }, [event.slug, page]);

  useLayoutEffect(() => {
    if (!ready)                return;
    if (lockedHeight === null) return;
    if (!innerRef.current)     return;
    setLockedHeight(innerRef.current.offsetHeight);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const handlePageChange = (p: number) => {
    if (outerRef.current) setLockedHeight(outerRef.current.offsetHeight);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setPage(p);
  };

  const handleTransitionEnd = () => setLockedHeight(null);

  const DUR     = TAB_ENTER.duration;
  const EASE    = TAB_ENTER.easing;
  const BASE    = TAB_ENTER.baseDelay;
  const STAGGER = TAB_ENTER.stagger;

  const isEmpty = ready && items !== null && items.length === 0;

  return (
    <div
      ref={outerRef}
      onTransitionEnd={handleTransitionEnd}
      style={{
        height:     lockedHeight !== null ? lockedHeight : undefined,
        overflow:   lockedHeight !== null ? "hidden"     : undefined,
        transition: lockedHeight !== null ? "height 0.4s ease" : undefined,
      }}
    >
      <div ref={innerRef}>

        {isEmpty && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 20px" }}>
            <span style={{ ...JK, fontSize: 14, color: "rgba(255,255,255,0.3)" }}>No news yet for this event</span>
          </div>
        )}

        {!isEmpty && (
          <>
            <div style={{
              display: "grid",
              gridTemplateColumns: `repeat(${COLUMNS}, 1fr)`,
              gap: GAP, alignItems: "stretch", padding: 2,
            }}>
              {Array.from({ length: totalSlots }).map((_, i) => {
                const isPlaceholder = ready && items !== null && i >= items.length;
                const item          = ready && items !== null && !isPlaceholder ? items[i] : null;

                return (
                  <CardSlot
                    key={`${animKey}-${i}`}
                    index={i}
                    item={item}
                    isPlaceholder={isPlaceholder}
                    ready={ready}
                    isMobile={isMobile}
                    dur={DUR} ease={EASE} base={BASE} stagger={STAGGER}
                  />
                );
              })}
            </div>

            {ready && (
              <div style={{
                opacity: 0,
                animation: `anim-fade-in ${DUR}ms ${EASE} ${BASE + totalSlots * STAGGER + 60}ms forwards`,
              }}>
                <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}