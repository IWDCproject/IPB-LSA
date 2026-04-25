"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import NewsCard, { NewsCardSkeleton } from "@/components/NewsCard";

const JK     = { fontFamily: "'Plus Jakarta Sans', sans-serif" } as const;
const BB     = { fontFamily: "'Bebas Neue', sans-serif"        } as const;
const YELLOW = "#FFC936";
const BLUE   = "#0D26C2";
const NAVY   = "#06125C";
const PAGE_SIZE = 24;

// ─── Animation constants (mirrors EventDetail NewsTab) ────────────────────────
const DUR             = 420;
const EASE            = "cubic-bezier(0.22, 1, 0.36, 1)";
const BASE            = 40;   // ms before first card starts
const STAGGER         = 28;   // ms between cards
const SKELETON_SHOW_DELAY_MS  = 200;
const SKELETON_MIN_DISPLAY_MS = 200;

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
        <span style={{ ...JK, fontSize: "11px", fontWeight: 800, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.12em", textAlign: "center" }}>
          Coming Soon
        </span>
      </div>
    </div>
  );
}

// ─── Card slot — skeleton/card crossfade + staggered slide-up ─────────────────
// Mirrors the CardSlot from the event detail NewsTab.
// Each slot is absolutely positioned in a CSS grid stack (gridArea: "1/1") so
// the skeleton and real card occupy the same space and crossfade cleanly.

interface SlotProps {
  index:        number;
  item:         NewsItem | null;
  isPlaceholder: boolean;
  ready:        boolean;
  showSkeleton: boolean;
  isMobile:     boolean;
  onClick?:     () => void;
}

function CardSlot({ index, item, isPlaceholder, ready, showSkeleton, isMobile, onClick }: SlotProps) {
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
      {/* Skeleton layer */}
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

      {/* Real card layer */}
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

type EventStatus = "upcoming" | "ongoing" | "concluded";
type SortValue   = "-published_at" | "published_at";

export interface EventOption {
  id:     string;
  name:   string;
  slug:   string;
  status: EventStatus;
}

interface NewsItem {
  id:            string;
  title:         string;
  slug:          string;
  excerpt:       string | null;
  thumbnail_url: string | null;
  category:      string;
  published_at:  string;
  event_id:      { name: string; slug?: string } | null;
}

interface Props {
  events:   EventOption[];
  isMobile: boolean;
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { key: EventStatus; label: string; color: string; symbol?: string }[] = [
  { key: "ongoing",   label: "Berlangsung", color: "#dc2626", symbol: "●" },
  { key: "upcoming",  label: "Akan Datang", color: YELLOW,    symbol: "◆" },
  { key: "concluded", label: "Selesai",     color: "rgba(255,255,255,0.5)" },
];

const STATUS_RAW_MAP: Record<EventStatus, string[]> = {
  ongoing:   ["ongoing", "active"],
  upcoming:  ["upcoming"],
  concluded: ["concluded", "finished", "past"],
};

// ─── Debounce ─────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
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

// ─── Event dropdown ───────────────────────────────────────────────────────────

function EventDropdown({
  events, selected, onToggle, onClose,
}: {
  events: EventOption[]; selected: Set<string>;
  onToggle: (slug: string) => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div ref={ref} style={{
      position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 1000,
      background: "#0e1f6e", border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 8, boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      minWidth: 240, maxHeight: 280, overflowY: "auto", padding: "6px 0",
    }}>
      {events.map(ev => {
        const checked = selected.has(ev.slug);
        const statusColor = ev.status === "ongoing" ? "#dc2626" : ev.status === "upcoming" ? YELLOW : "rgba(255,255,255,0.4)";
        return (
          <button
            key={ev.slug} onClick={() => onToggle(ev.slug)}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "9px 14px", background: "none", border: "none",
              cursor: "pointer", transition: "background 0.15s", textAlign: "left",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "none"; }}
          >
            <span style={{
              width: 16, height: 16, borderRadius: 4, flexShrink: 0,
              border: checked ? `2px solid ${YELLOW}` : "2px solid rgba(255,255,255,0.25)",
              background: checked ? YELLOW : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
            }}>
              {checked && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <polyline points="1 4 3.5 6.5 9 1" stroke={NAVY} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </span>
            <span style={{ ...JK, fontSize: 13, fontWeight: 600, color: "#fff", flex: 1, lineHeight: 1.3 }}>{ev.name}</span>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor, flexShrink: 0 }} />
          </button>
        );
      })}
    </div>
  );
}

// ─── Active filter chip ───────────────────────────────────────────────────────

function Chip({ label, color, onRemove }: { label: string; color?: string; onRemove: () => void }) {
  return (
    <span style={{
      ...JK, display: "inline-flex", alignItems: "center", gap: 6,
      fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 99,
      background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
      color: color ?? "rgba(255,255,255,0.7)", whiteSpace: "nowrap",
    }}>
      {label}
      <button onClick={onRemove} style={{
        background: "none", border: "none", cursor: "pointer",
        padding: 0, display: "flex", color: "rgba(255,255,255,0.5)", lineHeight: 1,
      }}>×</button>
    </span>
  );
}

// ─── Event inline chip (in filter row) ───────────────────────────────────────

function EventChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span style={{
      ...JK, display: "inline-flex", alignItems: "center", gap: 6,
      fontSize: 13, fontWeight: 700, padding: "7px 16px", borderRadius: 8,
      background: "#fff", border: "1.5px solid rgba(255,255,255,0.7)",
      color: BLUE, whiteSpace: "nowrap",
    }}>
      {label}
      <button onClick={onRemove} style={{
        background: "none", border: "none", cursor: "pointer",
        padding: 0, display: "flex", color: `${BLUE}99`, lineHeight: 1, fontSize: 14,
      }}>×</button>
    </span>
  );
}

// ─── Filter row label ─────────────────────────────────────────────────────────

function RowLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      ...JK, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em",
      color: "rgba(255,255,255,0.35)", textTransform: "uppercase",
      whiteSpace: "nowrap", minWidth: 60, textAlign: "right",
    }}>{children}</span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AllNewsTab({ events, isMobile }: Props) {
  const router = useRouter();

  // ── Filter state ──────────────────────────────────────────────────────────
  const [searchInput,      setSearchInput]      = useState("");
  const [activeStatuses,   setActiveStatuses]   = useState<Set<EventStatus>>(new Set());
  const [activeEventSlugs, setActiveEventSlugs] = useState<Set<string>>(new Set());
  const [sort,             setSort]             = useState<SortValue>("-published_at");
  const [showEventDrop,    setShowEventDrop]    = useState(false);
  const [page,             setPage]             = useState(1);

  // ── Data state ────────────────────────────────────────────────────────────
  const [items,           setItems]           = useState<NewsItem[] | null>(null);
  const [total,           setTotal]           = useState(0);
  const [totalPages,      setTotalPages]      = useState(0);
  const [ready,           setReady]           = useState(false);
  const [skeletonVisible, setSkeletonVisible] = useState(false);
  const [animKey,         setAnimKey]         = useState(0);

  const topRef         = useRef<HTMLDivElement>(null);
  const outerRef       = useRef<HTMLDivElement>(null);
  const innerRef       = useRef<HTMLDivElement>(null);
  const scrollTargetY  = useRef<number | null>(null);
  const [lockedHeight, setLockedHeight] = useState<number | null>(null);

  const debouncedSearch = useDebounce(searchInput, 350);

  // ── Fetch — with skeleton show-delay + minimum display logic ──────────────
  useEffect(() => {
    let cancelled = false;
    let skeletonShownAt: number | null = null;
    let minDisplayTimer: ReturnType<typeof setTimeout> | null = null;

    setReady(false);
    setSkeletonVisible(false);
    setItems(null);
    setAnimKey(k => k + 1);

    const rawStatuses = Array.from(activeStatuses).flatMap(s => STATUS_RAW_MAP[s]);
    const eventSlugs  = Array.from(activeEventSlugs);
    const filter: any = { is_published: { _eq: true } };
    if (debouncedSearch) filter.title = { _icontains: debouncedSearch };
    if (rawStatuses.length) filter.event_id = { ...(filter.event_id ?? {}), status: { _in: rawStatuses } };
    if (eventSlugs.length)  filter.event_id = { ...(filter.event_id ?? {}), slug:   { _in: eventSlugs  } };

    const commit = (result: { items: NewsItem[]; total: number; totalPages: number }) => {
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);

      if (skeletonShownAt === null) {
        // Fast path — data arrived before show-delay fired. Cards animate in directly.
        clearTimeout(showTimer);
        if (!cancelled) setReady(true);
      } else {
        // Skeleton is visible — enforce minimum display time to avoid flash.
        const elapsed   = Date.now() - skeletonShownAt;
        const remaining = SKELETON_MIN_DISPLAY_MS - elapsed;
        if (remaining <= 0) {
          if (!cancelled) setReady(true);
        } else {
          minDisplayTimer = setTimeout(() => { if (!cancelled) setReady(true); }, remaining);
        }
      }
    };

    // If this fires before data arrives, show skeleton slots.
    const showTimer = setTimeout(() => {
      if (cancelled) return;
      skeletonShownAt = Date.now();
      setSkeletonVisible(true);
    }, SKELETON_SHOW_DELAY_MS);

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

  // Cache the absolute scroll-Y of this component once the full page has
  // loaded (images in sections above have settled, np-up animations done).
  // Using window.load rather than a rAF/font-ready because LatestStoriesSection
  // images above us shift the layout until they're fully loaded.
  useEffect(() => {
    const capture = () => {
      if (topRef.current) {
        scrollTargetY.current = topRef.current.getBoundingClientRect().top + window.scrollY;
      }
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
    if (!ready)                return;
    if (lockedHeight === null) return;
    if (!innerRef.current)     return;
    setLockedHeight(innerRef.current.offsetHeight);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const handlePageChange = (p: number) => {
    if (outerRef.current) setLockedHeight(outerRef.current.offsetHeight);
    const y = scrollTargetY.current
      ?? (topRef.current ? topRef.current.getBoundingClientRect().top + window.scrollY : 0);
    window.scrollTo({ top: y - 200, behavior: "smooth" });
    setPage(p);
  };

  const handleTransitionEnd = () => setLockedHeight(null);

  // Reset page on filter change
  const prevFilters = useRef({ debouncedSearch, activeStatuses, activeEventSlugs, sort });
  useEffect(() => {
    const prev = prevFilters.current;
    if (
      prev.debouncedSearch !== debouncedSearch ||
      prev.sort !== sort ||
      prev.activeStatuses !== activeStatuses ||
      prev.activeEventSlugs !== activeEventSlugs
    ) {
      setPage(1);
      prevFilters.current = { debouncedSearch, activeStatuses, activeEventSlugs, sort };
    }
  }, [debouncedSearch, activeStatuses, activeEventSlugs, sort]);

  // ── Handlers ──────────────────────────────────────────────────────────────
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

  // ─── Render ───────────────────────────────────────────────────────────────

  const cols     = isMobile ? 2 : 4;
  const showGrid = skeletonVisible || ready;

  // When ready, pad the last row with placeholder cards so it always fills the grid width.
  const skeletonSlots = Math.ceil(PAGE_SIZE / 2);
  const totalSlots = (() => {
    if (!ready || !items) return skeletonSlots;
    const remainder    = items.length % cols;
    const placeholders = remainder !== 0 ? cols - remainder : 0;
    return items.length + placeholders;
  })();

  const pillBase: React.CSSProperties = {
    ...JK, padding: "7px 16px", borderRadius: 8,
    border: "1.5px solid rgba(255,255,255,0.7)",
    fontSize: 13, fontWeight: 700, cursor: "pointer",
    whiteSpace: "nowrap", transition: "background 0.2s, color 0.2s",
  };

  return (
    <div ref={topRef} style={{ paddingBottom: 60 }}>

      {/* ── Header + filters (stagger in once on mount) ──────────────────── */}
      <div style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        alignItems: isMobile ? "stretch" : "stretch",
        justifyContent: "space-between",
        gap: isMobile ? 20 : 32,
        marginBottom: 20,
        height: isMobile ? 240 : 130,
      }}>

        {/* Left: title + subtitle + search */}
        <div style={{ flexShrink: 0 }}>
          {/* Title */}
          <div style={{
            ...BB,
            fontSize: isMobile ? "clamp(1.8rem, 7vw, 2.4rem)" : "clamp(2rem, 3.5vw, 3rem)",
            color: "#fff", lineHeight: 1,
            opacity: 0, animation: `np-slide-up ${DUR}ms ${EASE} ${BASE}ms both`,
          }}>
            Semua Berita
          </div>

          {/* Subtitle — fades in when ready */}
          <div style={{
            ...JK, margin: "6px 0 14px", fontSize: "clamp(12px, 1.4vw, 14px)",
            color: "rgba(255,255,255,0.7)", fontWeight: 600,
            minHeight: "1.4em",
            opacity: 0, animation: `np-slide-up ${DUR}ms ${EASE} ${BASE + STAGGER}ms both`,
            transition: "opacity 0.3s ease",
          }}>
            {ready && items !== null
              ? `Menampilkan ${Math.min(page * PAGE_SIZE, total)} dari ${total} artikel yang cocok`
              : ""}
          </div>

          {/* Search bar */}
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
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 8, color: "#fff", fontSize: 13,
                outline: "none", width: isMobile ? "100%" : 240,
                transition: "border 0.2s",
              }}
              onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,201,54,0.5)"; }}
              onBlur={e =>  { (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.15)"; }}
            />
            {searchInput && (
              <button onClick={() => setSearchInput("")} style={{
                position: "absolute", right: 8, background: "none", border: "none",
                cursor: "pointer", color: "rgba(255,255,255,0.4)", lineHeight: 1, fontSize: 16,
              }}>×</button>
            )}
          </div>
        </div>

        {/* Right: filter panel */}
        <div style={{
          display: "flex", flexDirection: "column",
          justifyContent: "space-between",
          alignItems: isMobile ? "flex-start" : "flex-end",
          flexShrink: 0,
        }}>

          {/* STATUS row */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
            justifyContent: isMobile ? "flex-start" : "flex-end",
            opacity: 0, animation: `np-slide-up ${DUR}ms ${EASE} ${BASE + STAGGER * 3}ms both`,
          }}>
            {STATUS_OPTIONS.map(s => {
              const isActive = activeStatuses.has(s.key);
              return (
                <button
                  key={s.key} onClick={() => toggleStatus(s.key)}
                  style={{
                    ...pillBase, display: "flex", alignItems: "center", gap: 5,
                    background: isActive ? "#fff" : "rgba(255,255,255,0.1)",
                    color:      isActive ? BLUE  : "#fff",
                  }}
                >
                  {s.symbol && (
                    <span style={{ fontSize: 8, color: isActive ? s.color : "rgba(255,255,255,0.4)" }}>
                      {s.symbol}
                    </span>
                  )}
                  {s.label}
                </button>
              );
            })}
            <button
              onClick={() => setActiveStatuses(new Set())}
              style={{
                ...pillBase,
                background: activeStatuses.size === 0 ? "#fff" : "rgba(255,255,255,0.1)",
                color:      activeStatuses.size === 0 ? BLUE   : "#fff",
              }}
            >Semua</button>
            <RowLabel>Status</RowLabel>
          </div>

          {/* EVENT row */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
            justifyContent: isMobile ? "flex-start" : "flex-end",
            opacity: 0, animation: `np-slide-up ${DUR}ms ${EASE} ${BASE + STAGGER * 4}ms both`,
            position: "relative", zIndex: 10,
          }}>
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowEventDrop(v => !v)}
                style={{
                  ...JK, display: "flex", alignItems: "center", gap: 6,
                  padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700,
                  cursor: "pointer", whiteSpace: "nowrap", transition: "background 0.2s, color 0.2s",
                  border: "1.5px solid rgba(255,255,255,0.7)",
                  background: showEventDrop ? "#fff" : "rgba(255,255,255,0.1)",
                  color: showEventDrop ? BLUE : "#fff",
                }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Tambah event
              </button>
              {showEventDrop && (
                <EventDropdown
                  events={events} selected={activeEventSlugs}
                  onToggle={toggleEvent} onClose={() => setShowEventDrop(false)}
                />
              )}
            </div>
            {Array.from(activeEventSlugs).map(slug => {
              const ev = events.find(e => e.slug === slug);
              return <EventChip key={slug} label={ev?.name ?? slug} onRemove={() => toggleEvent(slug)} />;
            })}
            <RowLabel>Event</RowLabel>
          </div>

          {/* URUTKAN row */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            justifyContent: isMobile ? "flex-start" : "flex-end",
            opacity: 0, animation: `np-slide-up ${DUR}ms ${EASE} ${BASE + STAGGER * 5}ms both`,
          }}>
            {([ ["-published_at", "Terbaru"], ["published_at", "Terlama"] ] as [SortValue, string][]).map(([val, label]) => (
              <button key={val} onClick={() => setSort(val)} style={{
                ...pillBase,
                background: sort === val ? "#fff" : "rgba(255,255,255,0.1)",
                color:      sort === val ? BLUE  : "#fff",
              }}>{label}</button>
            ))}
            <RowLabel>Urutkan</RowLabel>
          </div>

        </div>
      </div>

      {/* ── Divider ──────────────────────────────────────────────────────── */}
      <div style={{
        height: 1, background: "rgba(255,255,255,0.08)", marginBottom: 20,
        opacity: 0, animation: `np-slide-up ${DUR}ms ${EASE} ${BASE + STAGGER * 6}ms both`,
      }} />

      {/* ── Card grid ────────────────────────────────────────────────────── */}
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
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" style={{ marginBottom: 12 }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <p style={{ ...JK, fontSize: 14, color: "rgba(255,255,255,0.3)", margin: 0 }}>
                Tidak ada artikel yang cocok dengan filter ini.
              </p>
            </div>
          )}

          {/* Staggered card grid — mounts when skeleton is ready or data arrives */}
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
                      onClick={item ? () => router.push(`/news/${item.slug}`) : undefined}
                    />
                  );
                })}
              </div>

              {/* Pagination fades in after the last card stagger completes */}
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