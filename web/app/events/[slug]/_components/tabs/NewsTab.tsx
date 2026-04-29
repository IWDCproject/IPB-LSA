"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import NewsCard from "@/components/NewsCard";
import { NewsCardSkeleton } from "../shared/NewsCardSkeleton";
import { getNewsByEvent, getNewsCountByEvent } from "@/lib/directus";
import { TAB_ENTER } from "../shared/Animations";
import type { AnimPhase } from "../shared/UseTabTransition";
import { NewsPlaceholder } from "../shared/NewsPlaceholder";
import { YELLOW } from "../shared/tokens";
import type { MappedEvent, MappedNews } from "../../_types";

// --- Konstanta ---------------------------------------------------------------

const PAGE_SIZE = 12;

// Delay sebelum skeleton muncul, biar koneksi cepat nggak kedip-kedip
const SKELETON_SHOW_DELAY_MS  = 200;
const SKELETON_MIN_DISPLAY_MS = 200;

// --- Helpers -----------------------------------------------------------------

function getColumns(width: number, isMobile: boolean): number {
  if (isMobile || width < 768) return 1;
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

// --- Pagination --------------------------------------------------------------

function PaginationButton({
  label, active, disabled, onClick,
}: {
  label: React.ReactNode; active?: boolean; disabled?: boolean; onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  // Warna tergantung state hover/active/disabled, harus inline
  const bg     = active ? YELLOW : hovered && !disabled ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)";
  const color  = active ? "#06125C" : disabled ? "rgba(255,255,255,0.25)" : "#fff";
  const border = active ? `1px solid ${YELLOW}` : "1px solid rgba(255,255,255,0.15)";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`font-jakarta min-w-9 h-9 px-2.5 rounded-md text-[13px]
        flex items-center justify-center cursor-pointer disabled:cursor-not-allowed
        transition-[background,border] duration-200
        ${active ? "font-extrabold" : "font-semibold"}`}
      style={{ background: bg, color, border }}
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
    <div className="flex items-center justify-center gap-1.5 mt-10">
      <PaginationButton
        label={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>}
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
      />
      {pages.map((p, i) =>
        p === "…"
          ? <span key={`e-${i}`} className="font-jakarta text-[13px] text-white/30 px-1">…</span>
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

// --- CardSlot ----------------------------------------------------------------
// Grid stacking (grid-area:1/1) bikin tinggi slot = max(skeleton, card),
// tanpa perlu position:absolute.

interface SlotProps {
  index:         number;
  item:          MappedNews | null;
  isPlaceholder: boolean;
  ready:         boolean;
  showSkeleton:  boolean;
  isMobile:      boolean;
  dur:           number;
  ease:          string;
  base:          number;
  stagger:       number;
}

function CardSlot({ index, item, isPlaceholder, ready, showSkeleton, isMobile, dur, ease, base, stagger }: SlotProps) {
  // cardShowing sengaja nunggu satu rAF setelah ready, biar crossfade skeleton bisa jalan
  const [cardShowing, setCardShowing] = useState(false);

  useEffect(() => {
    if (!ready || !showSkeleton) return;
    const raf = requestAnimationFrame(() => setCardShowing(true));
    return () => cancelAnimationFrame(raf);
  }, [ready, showSkeleton]);

  const cardOpacity  = showSkeleton ? (cardShowing ? 1 : 0) : (ready ? 1 : 0);
  const cardInteract = showSkeleton ? cardShowing : ready;

  return (
    // Delay animasi dihitung per-index, harus inline
    <div
      className="grid"
      style={{
        opacity:   0,
        animation: `anim-slide-up-soft ${dur}ms ${ease} ${base + index * stagger}ms forwards`,
      }}
    >
      {showSkeleton && (
        <div
          className="pointer-events-none"
          style={{
            gridArea:   "1/1",
            opacity:    cardShowing ? 0 : 1,
            visibility: cardShowing ? "hidden" : "visible",
            transition: "opacity 0.3s ease, visibility 0s linear 0.3s",
            zIndex:     cardShowing ? 0 : 1,
          }}
        >
          <NewsCardSkeleton isMobile={isMobile} />
        </div>
      )}

      <div
        className={`h-full ${cardInteract ? "pointer-events-auto" : "pointer-events-none"}`}
        style={{
          gridArea:   "1/1",
          opacity:    cardOpacity,
          transition: showSkeleton ? "opacity 0.3s ease" : "none",
          zIndex:     cardInteract ? 1 : 0,
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

// --- NewsTab -----------------------------------------------------------------

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
  const [skeletonVisible, setSkeletonVisible] = useState(false);
  const [animKey,         setAnimKey]         = useState(0);

  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [lockedHeight, setLockedHeight] = useState<number | null>(null);

  const COLUMNS = useColumns(isMobile);
  const GAP     = 8;

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

    const tryCommit = () => {
      if (!resolvedItems || !resolvedCount) return;

      if (skeletonShownAt === null) {
        clearTimeout(showTimer);
        if (!cancelled) setReady(true);
      } else {
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

    const showTimer = setTimeout(() => {
      if (cancelled || resolvedItems) return;
      skeletonShownAt = Date.now();
      setSkeletonVisible(true);
    }, SKELETON_SHOW_DELAY_MS);

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
  }, [event.slug, page, COLUMNS]);

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

  const isEmpty  = ready && items !== null && items.length === 0;
  const showGrid = skeletonVisible || ready;

  return (
    // height, overflow, transition dihitung dari lockedHeight, harus inline
    <div
      ref={outerRef}
      onTransitionEnd={handleTransitionEnd}
      style={{
        height:     lockedHeight !== null ? lockedHeight      : undefined,
        overflow:   lockedHeight !== null ? "hidden"          : undefined,
        transition: lockedHeight !== null ? "height 0.4s ease" : undefined,
      }}
    >
      <div ref={innerRef}>

        {isEmpty && (
          <div className="flex flex-col items-center py-20 px-5">
            <span className="font-jakarta text-sm text-white/30">No news yet for this event</span>
          </div>
        )}

        {!isEmpty && showGrid && (
          <>
            {/* gridTemplateColumns dihitung dari COLUMNS, harus inline */}
            <div
              className="grid items-stretch p-0.5"
              style={{
                gridTemplateColumns: `repeat(${COLUMNS}, 1fr)`,
                gap: GAP,
              }}
            >
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

            {/* Delay animasi dihitung dari totalSlots, harus inline */}
            {ready && (
              <div
                style={{
                  opacity:   0,
                  animation: `anim-fade-in ${DUR}ms ${EASE} ${BASE + totalSlots * STAGGER + 60}ms forwards`,
                }}
              >
                <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}