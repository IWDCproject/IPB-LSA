"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CardSlot, Pagination } from "./NewsCardSlot";
import { MobileFilterBar } from "./MobileFilterBar";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EventStatus = "upcoming" | "ongoing" | "concluded";
export type SortValue   = "-published_at" | "published_at";

export interface EventOption {
  id:     string;
  name:   string;
  slug:   string;
  status: EventStatus;
}

export interface NewsItem {
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

// ─── Constants ────────────────────────────────────────────────────────────────

const JK     = { fontFamily: "'Plus Jakarta Sans', sans-serif" } as const;
const BB     = { fontFamily: "'Bebas Neue', sans-serif"        } as const;
const YELLOW = "#FFC936";
const BLUE   = "#0D26C2";
const NAVY   = "#06125C";
const PAGE_SIZE = 24;

const DUR                     = 420;
const EASE                    = "cubic-bezier(0.22, 1, 0.36, 1)";
const BASE                    = 40;
const STAGGER                 = 28;
const SKELETON_SHOW_DELAY_MS  = 200;
const SKELETON_MIN_DISPLAY_MS = 200;

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
}

// ─── Desktop filter atoms (only used here, not worth their own file) ──────────

function RowLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      ...JK, fontSize: 12, fontWeight: 800, letterSpacing: "0.1em",
      color: "rgba(255,255,255,0.35)", textTransform: "uppercase",
      whiteSpace: "nowrap", minWidth: 80, textAlign: "right", flexShrink: 0,
    }}>{children}</span>
  );
}

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
        justifyContent: "center", alignItems: "center",
      }}>×</button>
    </span>
  );
}

const DROPDOWN_KEYFRAMES = `
  @keyframes mob-panel-in {
    from { opacity: 0; transform: scaleY(0.88) translateY(-6px); }
    to   { opacity: 1; transform: scaleY(1)    translateY(0);    }
  }
  @keyframes mob-item-in {
    from { opacity: 0; transform: translateY(-5px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
`;

function EventDropdown({
  events, selected, onToggle, onClear, onClose,
}: {
  events: EventOption[]; selected: Set<string>;
  onToggle: (slug: string) => void; onClear: () => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const hasSelected = selected.size > 0;

  return (
    <div ref={ref} style={{
      position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 1000,
      background: "rgba(6, 18, 92, 0.55)",
      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 10, boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
      minWidth: 240, maxHeight: 300, overflowY: "auto", overflow: "hidden",
      transformOrigin: "top",
      animation: "mob-panel-in 240ms cubic-bezier(0.22, 1, 0.36, 1) both",
    }}>
      <style>{DROPDOWN_KEYFRAMES}</style>

      {/* Clear button */}
      {hasSelected && (
        <button
          onClick={onClear}
          style={{
            ...JK, width: "100%", padding: "9px 16px", background: "none", border: "none",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            cursor: "pointer", textAlign: "center", fontSize: 11, fontWeight: 700,
            color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", textTransform: "uppercase",
            opacity: 0,
            animation: "mob-item-in 220ms ease 0ms forwards",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.75)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.4)"; }}
        >
          Hapus filter
        </button>
      )}

      {events.length === 0 && (
        <div style={{ ...JK, padding: "16px", textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
          Tidak ada event
        </div>
      )}

      {events.map((ev, i) => {
        const checked     = selected.has(ev.slug);
        const statusColor = ev.status === "ongoing" ? "#dc2626" : ev.status === "upcoming" ? YELLOW : "rgba(255,255,255,0.4)";
        const animIndex   = hasSelected ? i + 1 : i;
        return (
          <button
            key={ev.slug} onClick={() => onToggle(ev.slug)}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 12,
              padding: "9px 14px", background: "none", border: "none",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
              cursor: "pointer", textAlign: "left",
              opacity: 0,
              animation: `mob-item-in 220ms ease ${animIndex * 38}ms forwards`,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "none"; }}
          >
            {/* Checkbox */}
            <span style={{
              width: 18, height: 18, borderRadius: 5, flexShrink: 0,
              border: checked ? `2px solid ${YELLOW}` : "2px solid rgba(255,255,255,0.25)",
              background: checked ? YELLOW : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
            }}>
              {checked && (
                <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                  <polyline points="1 4.5 4 7.5 10 1" stroke={NAVY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </span>
            <span style={{ ...JK, fontSize: 14, fontWeight: 600, color: checked ? "#fff" : "rgba(255,255,255,0.75)", flex: 1, lineHeight: 1.3 }}>
              {ev.name}
            </span>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: statusColor, flexShrink: 0 }} />
          </button>
        );
      })}
    </div>
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

  const topRef        = useRef<HTMLDivElement>(null);
  const outerRef      = useRef<HTMLDivElement>(null);
  const innerRef      = useRef<HTMLDivElement>(null);
  const scrollTargetY = useRef<number | null>(null);
  const [lockedHeight, setLockedHeight] = useState<number | null>(null);

  const debouncedSearch = useDebounce(searchInput, 350);

  // ── Fetch — with skeleton show-delay + minimum display logic ──────────────
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
    const filter: any = { is_published: { _eq: true } };
    if (debouncedSearch) filter.title     = { _icontains: debouncedSearch };
    if (rawStatuses.length) filter.event_id = { ...(filter.event_id ?? {}), status: { _in: rawStatuses } };
    if (eventSlugs.length)  filter.event_id = { ...(filter.event_id ?? {}), slug:   { _in: eventSlugs  } };

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

  const handlePageChange = (p: number) => {
    if (outerRef.current) setLockedHeight(outerRef.current.offsetHeight);
    const y = scrollTargetY.current
      ?? (topRef.current ? topRef.current.getBoundingClientRect().top + window.scrollY : 0);
    window.scrollTo({ top: y - 200, behavior: "smooth" });
    setPage(p);
  };

  const handleTransitionEnd = () => setLockedHeight(null);

  // ── Render ────────────────────────────────────────────────────────────────

  const cols      = isMobile ? 1 : 4;
  const showGrid  = skeletonVisible || ready;

  const skeletonSlots = isMobile ? PAGE_SIZE : Math.ceil(PAGE_SIZE / 2);
  const totalSlots = (() => {
    if (!ready || !items) return skeletonSlots;
    const remainder    = items.length % cols;
    const placeholders = remainder !== 0 ? cols - remainder : 0;
    return items.length + placeholders;
  })();

  const pillBase: React.CSSProperties = {
    ...JK, padding: "5px 16px", borderRadius: 8,
    border: "1.5px solid rgba(255,255,255,0.7)",
    fontSize: 13, fontWeight: 700, cursor: "pointer",
    whiteSpace: "nowrap", transition: "background 0.2s, color 0.2s",
  };

  return (
    <div ref={topRef} style={{ paddingBottom: 60 }}>

      {/* ── Header + filters ──────────────────────────────────────────────── */}
      <div style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        alignItems: "stretch",
        justifyContent: "space-between",
        gap: isMobile ? 4 : 32,
        marginBottom: 20,
        height: isMobile ? "auto" : 130,
      }}>

        {/* Left: title + subtitle + search */}
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
            ...JK, margin: "6px 0 14px", fontSize: "clamp(12px, 1.4vw, 14px)",
            color: "rgba(255,255,255,0.7)", fontWeight: 600,
            opacity: 0, animation: `np-slide-up ${DUR}ms ${EASE} ${BASE + STAGGER}ms both`,
            transition: "opacity 0.3s ease",
          }}>
            {ready && items !== null
              ? `Menampilkan ${Math.min(page * PAGE_SIZE, total)} dari ${total} artikel yang cocok`
              : <span>Menampilkan <span style={{ color: "rgba(255,255,255,0.25)" }}>__</span> dari <span style={{ color: "rgba(255,255,255,0.25)" }}>__</span> artikel yang cocok</span>}
          </div>

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
        {isMobile ? (
          <MobileFilterBar
            activeStatuses={activeStatuses}   toggleStatus={toggleStatus}     setActiveStatuses={setActiveStatuses}
            activeEventSlugs={activeEventSlugs} toggleEvent={toggleEvent}     setActiveEventSlugs={setActiveEventSlugs}
            events={events} sort={sort} setSort={setSort}
          />
        ) : (
          <div style={{
            display: "flex", flexDirection: "column",
            gap: 6, alignItems: "flex-end", flexShrink: 0,
          }}>

            {/* STATUS row */}
            <div style={{
              display: "flex", alignItems: "center", width: "100%", justifyContent: "flex-end",
              opacity: 0, animation: `np-slide-up ${DUR}ms ${EASE} ${BASE + STAGGER * 3}ms both`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                {STATUS_OPTIONS.map(s => {
                  const isActive = activeStatuses.has(s.key);
                  return (
                    <button key={s.key} onClick={() => toggleStatus(s.key)} style={{
                      ...pillBase, display: "flex", alignItems: "center", gap: 5,
                      background: isActive ? "#fff" : "rgba(255,255,255,0.1)",
                      color:      isActive ? BLUE  : "#fff",
                    }}>
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
              </div>
              <RowLabel>Status</RowLabel>
            </div>

            {/* EVENT row */}
            <div style={{
              display: "flex", alignItems: "center", width: "100%", justifyContent: "flex-end",
              opacity: 0, animation: `np-slide-up ${DUR}ms ${EASE} ${BASE + STAGGER * 4}ms both`,
              position: "relative", zIndex: 10,
            }}>
              {/* Chips — flow freely to the left */}
              <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                {Array.from(activeEventSlugs).map(slug => {
                  const ev = events.find(e => e.slug === slug);
                  return <EventChip key={slug} label={ev?.name ?? slug} onRemove={() => toggleEvent(slug)} />;
                })}

                {/* Button — pinned with chips */}
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
                      onToggle={toggleEvent} onClear={() => setActiveEventSlugs(new Set())} onClose={() => setShowEventDrop(false)}
                    />
                  )}
                </div>
              </div>
              <RowLabel>Event</RowLabel>
            </div>

            {/* URUTKAN row */}
            <div style={{
              display: "flex", alignItems: "center", width: "100%", justifyContent: "flex-end",
              opacity: 0, animation: `np-slide-up ${DUR}ms ${EASE} ${BASE + STAGGER * 5}ms both`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {([ ["-published_at", "Terbaru"], ["published_at", "Terlama"] ] as [SortValue, string][]).map(([val, label]) => (
                  <button key={val} onClick={() => setSort(val)} style={{
                    ...pillBase,
                    background: sort === val ? "#fff" : "rgba(255,255,255,0.1)",
                    color:      sort === val ? BLUE  : "#fff",
                  }}>{label}</button>
                ))}
              </div>
              <RowLabel>Urutkan</RowLabel>
            </div>

          </div>
        )}
      </div>

      {/* ── Divider ───────────────────────────────────────────────────────── */}
      <div style={{
        height: 1, background: "rgba(255,255,255,0.08)", marginBottom: 20,
        opacity: 0, animation: `np-slide-up ${DUR}ms ${EASE} ${BASE + STAGGER * 6}ms both`,
      }} />

      {/* ── Card grid ─────────────────────────────────────────────────────── */}
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