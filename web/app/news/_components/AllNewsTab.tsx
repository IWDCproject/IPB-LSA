"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { useRouter } from "nextjs-toploader/app";
import { CardSlot, Pagination } from "./NewsCardSlot";
import { MobileFilterBar } from "./MobileFilterBar";
import { JK, BB, BLUE, DUR, EASE, BASE, STAGGER } from "./_newsConstants";
import { buildNewsFilter, STATUS_RAW_MAP } from "./_newsQueries";
import { useDebounce } from "@/hooks/useDebounce";
import type { EventStatus, SortValue, EventOption, NewsItem } from "./_newsTypes";

export type { EventStatus, SortValue, EventOption, NewsItem } from "./_newsTypes";

// --- Types --------------------------------------------------------------------

interface Props {
  events:   EventOption[];
  isMobile: boolean;
}

// --- Constants ----------------------------------------------------------------

const PAGE_SIZE = 24;

const SKELETON_SHOW_DELAY_MS  = 200;
const SKELETON_MIN_DISPLAY_MS = 200;

// --- Main component -----------------------------------------------------------

export default function AllNewsTab({ events, isMobile }: Props) {
  const router = useRouter();

  // -- Filter state ----------------------------------------------------------
  const [searchInput,      setSearchInput]      = useState("");
  const [activeStatuses,   setActiveStatuses]   = useState<Set<EventStatus>>(new Set());
  const [activeEventSlugs, setActiveEventSlugs] = useState<Set<string>>(new Set());
  const [sort,             setSort]             = useState<SortValue>("-published_at");
  const [page,             setPage]             = useState(1);

  // -- Data state ------------------------------------------------------------
  const [items,           setItems]           = useState<NewsItem[] | null>(null);
  const [total,           setTotal]           = useState(0);
  const [totalPages,      setTotalPages]      = useState(0);
  const [ready,           setReady]           = useState(false);
  const [skeletonVisible, setSkeletonVisible] = useState(false);
  const [animKey,         setAnimKey]         = useState(0);

  const topRef        = useRef<HTMLDivElement>(null);
  const outerRef      = useRef<HTMLDivElement>(null);
  const innerRef      = useRef<HTMLDivElement>(null);
  const scrollTargetY = useRef<number | null>(null);
  const [lockedHeight, setLockedHeight] = useState<number | null>(null);

  const debouncedSearch = useDebounce(searchInput, 350);

  // -- Fetch - with skeleton show-delay + minimum display logic --------------
  // The `cancelled` flag guards against stale updates from rapid filter
  // changes.  The skeleton show/min-display timers are intentionally kept as
  // they are - they implement the perceived-performance UX contract.
  useEffect(() => {
    let cancelled        = false;
    let skeletonShownAt: number | null = null;
    let minDisplayTimer: ReturnType<typeof setTimeout> | null = null;

    setReady(false);
    setSkeletonVisible(false);
    setItems(null);
    setAnimKey(k => k + 1);

    const rawStatuses = Array.from(activeStatuses).flatMap(s => STATUS_RAW_MAP[s]);
    const eventSlugs  = Array.from(activeEventSlugs);
    const filter      = buildNewsFilter({ debouncedSearch, rawStatuses, eventSlugs });

    const commit = (result: { items: NewsItem[]; total: number; totalPages: number }) => {
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);

      if (skeletonShownAt === null) {
        clearTimeout(showTimer);
        if (!cancelled) setReady(true);
      } else {
        const elapsed   = Date.now() - skeletonShownAt;
        const remaining = SKELETON_MIN_DISPLAY_MS - elapsed;
        if (remaining <= 0) {
          if (!cancelled) setReady(true);
        } else {
          minDisplayTimer = setTimeout(() => { if (!cancelled) setReady(true); }, remaining);
        }
      }
    };

    const showTimer = setTimeout(() => {
      if (cancelled) return;
      skeletonShownAt = Date.now();
      setSkeletonVisible(true);
    }, SKELETON_SHOW_DELAY_MS);

    // Dynamic import is intentional: it keeps the directus SDK out of the
    // initial JS bundle for this route, deferring the load until the first
    // filter interaction.  The module is cached by the bundler after the
    // first resolution, so subsequent calls resolve synchronously.
    import("@/lib/directus").then(async ({ getAllNewsFiltered }) => {
      if (cancelled) return;
      try {
        const result = await getAllNewsFiltered({ page, pageSize: PAGE_SIZE, filter, sort });
        if (!cancelled) commit(result);
      } catch {
        if (!cancelled) { setItems([]); setReady(true); }
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(showTimer);
      if (minDisplayTimer) clearTimeout(minDisplayTimer);
    };
  }, [debouncedSearch, activeStatuses, activeEventSlugs, sort, page]);

  // Cache scroll-Y after page fully loads (images above shift the layout until then)
  useEffect(() => {
    const capture = () => {
      if (topRef.current)
        scrollTargetY.current = topRef.current.getBoundingClientRect().top + window.scrollY;
    };
    if (document.readyState === "complete") {
      capture();
    } else {
      window.addEventListener("load", capture, { once: true });
    }
    window.addEventListener("resize", capture);
    return () => window.removeEventListener("resize", capture);
  }, []);

  // Update locked height once new content has painted
  useLayoutEffect(() => {
    if (!ready || lockedHeight === null || !innerRef.current) return;
    setLockedHeight(innerRef.current.offsetHeight);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Reset page on filter change (page is intentionally excluded from the dep
  // array - we only want to react to *filter* changes, not page changes).
  const prevFilters = useRef({ debouncedSearch, activeStatuses, activeEventSlugs, sort });
  useEffect(() => {
    const prev = prevFilters.current;
    if (
      prev.debouncedSearch  !== debouncedSearch  ||
      prev.sort             !== sort             ||
      prev.activeStatuses   !== activeStatuses   ||
      prev.activeEventSlugs !== activeEventSlugs
    ) {
      setPage(1);
      prevFilters.current = { debouncedSearch, activeStatuses, activeEventSlugs, sort };
    }
  }, [debouncedSearch, activeStatuses, activeEventSlugs, sort]);

  // -- Handlers --------------------------------------------------------------
  const toggleStatus = useCallback((s: EventStatus) => {
    setActiveStatuses(prev => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  }, []);

  const toggleEvent = useCallback((slug: string) => {
    setActiveEventSlugs(prev => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });
  }, []);

  const handlePageChange = (p: number) => {
    if (outerRef.current) setLockedHeight(outerRef.current.offsetHeight);
    const y = scrollTargetY.current
      ?? (topRef.current ? topRef.current.getBoundingClientRect().top + window.scrollY : 0);
    window.scrollTo({ top: y - 200, behavior: "smooth" });
    setPage(p);
  };

  const handleTransitionEnd = () => setLockedHeight(null);

  // -- Render ----------------------------------------------------------------

  const cols      = isMobile ? 1 : 4;
  const showGrid  = skeletonVisible || ready;

  const skeletonSlots = isMobile ? PAGE_SIZE : Math.ceil(PAGE_SIZE / 2);
  const totalSlots = (() => {
    if (!ready || !items) return skeletonSlots;
    const remainder    = items.length % cols;
    const placeholders = remainder !== 0 ? cols - remainder : 0;
    return items.length + placeholders;
  })();

  return (
    <div ref={topRef} style={{ paddingBottom: 60 }}>

      {/* -- Header + filters ------------------------------------------------ */}
      <div style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        alignItems: isMobile ? "stretch" : "flex-end",
        justifyContent: "space-between",
        gap: isMobile ? 4 : 32,
        marginBottom: 20,
      }}>

        {/* Left: title + subtitle */}
        <div style={{ flexShrink: 0 }}>
          <div style={{
            ...BB,
            fontSize: isMobile ? "clamp(1.8rem, 7vw, 2.4rem)" : "clamp(2rem, 3.5vw, 3rem)",
            color: "#fff", lineHeight: 1,
            opacity: 0, animation: `np-slide-up ${DUR}ms ${EASE} ${BASE}ms both`,
          }}>
            Semua Berita
          </div>

          <div style={{
            ...JK, margin: "6px 0 0", fontSize: "clamp(12px, 1.4vw, 14px)",
            color: "rgba(255,255,255,0.7)", fontWeight: 600,
            opacity: 0, animation: `np-slide-up ${DUR}ms ${EASE} ${BASE + STAGGER}ms both`,
            transition: "opacity 0.3s ease",
            marginBottom: 14,
          }}>
            {ready && items !== null
              ? `Menampilkan ${Math.min(page * PAGE_SIZE, total)} dari ${total} artikel yang cocok`
              : <span>Menampilkan <span style={{ color: "rgba(255,255,255,0.25)" }}>__</span> dari <span style={{ color: "rgba(255,255,255,0.25)" }}>__</span> artikel yang cocok</span>}
          </div>
        </div>

        {/* Right: search on top, filters below */}
        <div style={{
          display: "flex", flexDirection: "column", gap: 6,
          minWidth: isMobile ? "100%" : 400,
          zIndex: 10,
        }}>
          {/* Search */}
          <div style={{
            position: "relative", display: "flex", alignItems: "center",
            opacity: 0, animation: `np-slide-up ${DUR}ms ${EASE} ${BASE + STAGGER * 2}ms both`,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: "absolute", left: 11, pointerEvents: "none" }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Cari berita..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              style={{
                ...JK, paddingLeft: 34, paddingRight: searchInput ? 30 : 14,
                paddingTop: 8, paddingBottom: 8,
                background: "rgba(255,255,255,0.1)",
                border: "1.5px solid rgba(255,255,255,0.7)",
                borderRadius: 8, color: "#fff", fontSize: 13,
                outline: "none", width: "100%",
                transition: "border 0.2s",
              }}
              onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,1)"; }}
              onBlur={e =>  { (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.7)"; }}
            />
            {searchInput && (
              <button onClick={() => setSearchInput("")} style={{
                position: "absolute", right: 8, background: "none", border: "none",
                cursor: "pointer", color: "rgba(255,255,255,0.4)", lineHeight: 1, fontSize: 16,
              }}>×</button>
            )}
          </div>

          {/* Filter panel */}
          <div style={{ opacity: 0, animation: `np-slide-up ${DUR}ms ${EASE} ${BASE + STAGGER * 3}ms both` }}>
            <MobileFilterBar
              activeStatuses={activeStatuses}   toggleStatus={toggleStatus}     setActiveStatuses={setActiveStatuses}
              activeEventSlugs={activeEventSlugs} toggleEvent={toggleEvent}     setActiveEventSlugs={setActiveEventSlugs}
              events={events} sort={sort} setSort={setSort}
            />
          </div>
        </div>
      </div>

      {/* -- Divider --------------------------------------------------------- */}
      <div style={{
        height: 1, background: "rgba(255,255,255,0.08)", marginBottom: 20,
        opacity: 0, animation: `np-slide-up ${DUR}ms ${EASE} ${BASE + STAGGER * 6}ms both`,
      }} />

      {/* -- Card grid ------------------------------------------------------- */}
      <div
        ref={outerRef}
        onTransitionEnd={handleTransitionEnd}
        style={{
          height:     lockedHeight !== null ? lockedHeight : undefined,
          overflow:   lockedHeight !== null ? "hidden"     : undefined,
          transition: lockedHeight !== null ? "height 1s ease 0.5s" : undefined,
          minHeight:  320,
        }}
      >
        <div ref={innerRef}>

          {/* Empty state */}
          {ready && items !== null && items.length === 0 && (
            <div style={{ textAlign: "center", padding: "80px 20px", animation: "np-in 0.4s ease both" }}>
              <p style={{ ...JK, fontSize: 14, color: "rgba(255,255,255,0.3)", margin: 0, fontWeight: 600 }}>
                Tidak ada artikel yang cocok dengan filter ini.
              </p>
            </div>
          )}

          {showGrid && !(ready && items !== null && items.length === 0) && (
            <>
              <div style={{
                display: "grid",
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gap: isMobile ? 8 : 12, padding: 2,
                alignItems: "stretch",
              }}>
                {Array.from({ length: totalSlots }).map((_, i) => {
                  const isPlaceholder = ready && items !== null && i >= items.length;
                  const item          = ready && items && !isPlaceholder ? (items[i] ?? null) : null;
                  return (
                    <CardSlot
                      key={`${animKey}-${i}`}
                      index={i}
                      item={item}
                      isPlaceholder={isPlaceholder}
                      ready={ready}
                      showSkeleton={skeletonVisible}
                      isMobile={isMobile}
                      onClick={item ? () => router.push(`/news/${item.event_id?.slug || 'official'}/${item.slug}`) : undefined}
                    />
                  );
                })}
              </div>

              {ready && (
                <div style={{
                  opacity: 0,
                  animation: `np-slide-up ${DUR}ms ${EASE} ${BASE + totalSlots * STAGGER + 60}ms both`,
                }}>
                  <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
                </div>
              )}
            </>
          )}

        </div>
      </div>

    </div>
  );
}