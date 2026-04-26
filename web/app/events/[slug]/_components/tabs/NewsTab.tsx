"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import NewsCard from "@/components/NewsCard";
import { NewsCardSkeleton } from "../shared/NewsCardSkeleton";
import { getNewsByEvent, getNewsCountByEvent } from "@/lib/directus";
import { TAB_ENTER } from "../shared/Animations";
import type { AnimPhase } from "../shared/UseTabTransition";
import { NewsPlaceholder } from "../shared/NewsPlaceholder";
import { JK, YELLOW } from "../shared/tokens";
import type { MappedEvent, MappedNews } from "../../_types";

const PAGE_SIZE = 12;

// ─── Skeleton debounce thresholds ─────────────────────────────────────────────
// 1. Show delay  — if data arrives before this, skeleton never appears at all.
// 2. Min display — once skeleton is visible, keep it for at least this long
//                  to avoid a flash.
const SKELETON_SHOW_DELAY_MS  = 200;
const SKELETON_MIN_DISPLAY_MS = 200;

// ─── Responsive columns ────────────────────────────────────────────────────────

function getColumns(width: number, isMobile: boolean): number {
  if (isMobile || width < 768) return 2;
  if (width < 1280)            return 3;
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

// ─── Card Slot ────────────────────────────────────────────────────────────────
// CSS grid stacking (grid-area:1/1) keeps both layers in normal flow so slot
// height = max(skeleton, card) — no clipping, no position:absolute games.
//
// showSkeleton = false (fast path): card slides in directly, no skeleton layer.
// showSkeleton = true             : skeleton animates in, crossfades to card.

interface SlotProps {
  index:        number;
  item:         MappedNews | null;
  isPlaceholder: boolean;
  ready:        boolean;
  showSkeleton: boolean;
  isMobile:     boolean;
  dur:          number;
  ease:         string;
  base:         number;
  stagger:      number;
}

function CardSlot({ index, item, isPlaceholder, ready, showSkeleton, isMobile, dur, ease, base, stagger }: SlotProps) {
  // cardShowing lags one rAF behind ready (skeleton path only).
  // This ensures the card first paints at opacity:0, then the transition fires —
  // giving a real crossfade instead of an instant jump that flashes the background.
  const [cardShowing, setCardShowing] = useState(false);

  useEffect(() => {
    if (!ready || !showSkeleton) return;
    const raf = requestAnimationFrame(() => setCardShowing(true));
    return () => cancelAnimationFrame(raf);
  }, [ready, showSkeleton]);

  // On the fast path (no skeleton) the card is immediately visible; the parent
  // slide-up keyframe animation handles the visual entry.
  const cardOpacity    = showSkeleton ? (cardShowing ? 1 : 0) : (ready ? 1 : 0);
  const cardInteract   = showSkeleton ? cardShowing : ready;

  return (
    <div
      style={{
        opacity: 0,
        animation: `anim-slide-up-soft ${dur}ms ${ease} ${base + index * stagger}ms forwards`,
        display: "grid",
        height: "100%",
      }}
    >
      {/* Skeleton layer — only mounted when showSkeleton=true */}
      {showSkeleton && (
        <div
          style={{
            gridArea:      "1/1",
            opacity:       cardShowing ? 0 : 1,
            // Delay visibility:hidden until after the opacity fade completes
            // so the skeleton doesn't disappear before the card is fully visible.
            visibility:    cardShowing ? "hidden" : "visible",
            transition:    "opacity 0.3s ease, visibility 0s linear 0.3s",
            pointerEvents: "none",
            zIndex:        cardShowing ? 0 : 1,
          }}
        >
          <NewsCardSkeleton />
        </div>
      )}

      {/* Real card layer */}
      <div
        style={{
          gridArea:      "1/1",
          opacity:       cardOpacity,
          // Always keep transition present so the browser has a "from" state
          // when opacity changes from 0→1 (avoids instant jump).
          transition:    showSkeleton ? "opacity 0.3s ease" : "none",
          pointerEvents: cardInteract ? "auto" : "none",
          zIndex:        cardInteract ? 1 : 0,
          height:        "100%",
        }}
      >
        {ready && (
          isPlaceholder
            ? <NewsPlaceholder />
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
  event:    MappedEvent;
  isMobile: boolean;
  phase:    AnimPhase;
}

export default function NewsTab({ event, isMobile, phase }: Props) {
  const [page,            setPage]            = useState(1);
  const [items,           setItems]           = useState<MappedNews[] | null>(null);
  const [totalPages,      setTotalPages]      = useState(0);
  const [totalSlots,      setTotalSlots]      = useState(PAGE_SIZE);
  const [ready,           setReady]           = useState(false);
  // skeletonVisible: true only once the show-delay fires. If data arrives
  // before the delay, this stays false and skeleton is never rendered at all.
  const [skeletonVisible, setSkeletonVisible] = useState(false);
  const [animKey,         setAnimKey]         = useState(0);

  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [lockedHeight, setLockedHeight] = useState<number | null>(null);

  const COLUMNS = useColumns(isMobile);
  const GAP     = isMobile ? 8 : 12;

  useEffect(() => {
    setItems(null);
    setReady(false);
    setSkeletonVisible(false);
    setTotalSlots(PAGE_SIZE);
    setAnimKey(k => k + 1);

    let cancelled        = false;
    let skeletonShownAt: number | null = null;
    let resolvedItems:   any[] | null  = null;
    let resolvedCount                  = false;
    let minDisplayTimer: ReturnType<typeof setTimeout> | null = null;

    // Called once both fetches have landed. Decides whether to flip ready
    // immediately or wait out the skeleton minimum display time.
    const tryCommit = () => {
      if (!resolvedItems || !resolvedCount) return;

      if (skeletonShownAt === null) {
        // Fast path — data arrived before show delay fired.
        // Skeleton was never shown; go straight to cards.
        clearTimeout(showTimer);
        if (!cancelled) setReady(true);
      } else {
        // Skeleton is (or was) visible — enforce minimum display time.
        const elapsed   = Date.now() - skeletonShownAt;
        const remaining = SKELETON_MIN_DISPLAY_MS - elapsed;
        if (remaining <= 0) {
          if (!cancelled) setReady(true);
        } else {
          minDisplayTimer = setTimeout(() => {
            if (!cancelled) setReady(true);
          }, remaining);
        }
      }
    };

    // ── Show delay ────────────────────────────────────────────────────────
    // If this fires before data arrives, show the skeleton. If data is already
    // here by now, tryCommit will have cleared this timer already (fast path).
    const showTimer = setTimeout(() => {
      if (cancelled || resolvedItems) return; // data already committed
      skeletonShownAt = Date.now();
      setSkeletonVisible(true);
    }, SKELETON_SHOW_DELAY_MS);

    // ── Count fetch ───────────────────────────────────────────────────────
    getNewsCountByEvent(event.slug, page, PAGE_SIZE).then(({ pageCount, totalPages: tp }) => {
      if (cancelled) return;
      const isLastPage   = page === tp;
      const remainder    = pageCount % COLUMNS;
      const placeholders = remainder !== 0 && isLastPage ? COLUMNS - remainder : 0;
      setTotalSlots(pageCount + placeholders);
      setTotalPages(tp);
      resolvedCount = true;
      tryCommit();
    });

    // ── Items fetch ───────────────────────────────────────────────────────
    getNewsByEvent(event.slug, page, PAGE_SIZE).then(({ items: newItems }) => {
      if (cancelled) return;
      setItems(newItems);
      resolvedItems = newItems;
      tryCommit();
    });

    return () => {
      cancelled = true;
      clearTimeout(showTimer);
      if (minDisplayTimer) clearTimeout(minDisplayTimer);
    };
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

  const isEmpty    = ready && items !== null && items.length === 0;
  const showGrid   = skeletonVisible || ready; // don't render anything until needed

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

        {!isEmpty && showGrid && (
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
                    showSkeleton={skeletonVisible}
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