"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import NewsCard, { NewsCardSkeleton } from "@/components/NewsCard";

const JK     = { fontFamily: "'Plus Jakarta Sans', sans-serif" } as const;
const BB     = { fontFamily: "'Bebas Neue', sans-serif"        } as const;
const YELLOW = "#FFC936";
const BLUE   = "#0D26C2";
const NAVY   = "#06125C";
const PAGE_SIZE = 24;

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
      position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 50,
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
      fontSize: 13, fontWeight: 700, padding: "7px 16px", borderRadius: 999,
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
  const [items,      setItems]      = useState<NewsItem[] | null>(null);
  const [total,      setTotal]      = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading,    setLoading]    = useState(false);

  const debouncedSearch = useDebounce(searchInput, 350);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const rawStatuses = Array.from(activeStatuses).flatMap(s => STATUS_RAW_MAP[s]);
    const eventSlugs  = Array.from(activeEventSlugs);
    const filter: any = { is_published: { _eq: true } };
    if (debouncedSearch) filter.title = { _icontains: debouncedSearch };
    if (rawStatuses.length) filter.event_id = { ...(filter.event_id ?? {}), status: { _in: rawStatuses } };
    if (eventSlugs.length)  filter.event_id = { ...(filter.event_id ?? {}), slug:   { _in: eventSlugs  } };

    import("@/lib/directus").then(async ({ default: _, getAllNewsFiltered }) => {
      if (cancelled) return;
      try {
        const result = await getAllNewsFiltered({ page, pageSize: PAGE_SIZE, filter, sort });
        if (!cancelled) {
          setItems(result.items);
          setTotal(result.total);
          setTotalPages(result.totalPages);
          setLoading(false);
        }
      } catch {
        if (!cancelled) { setItems([]); setLoading(false); }
      }
    });
    return () => { cancelled = true; };
  }, [debouncedSearch, activeStatuses, activeEventSlugs, sort, page]);

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

  const cols = isMobile ? 2 : 4;

  // ─── Shared pill style (matches EventDetailHeader) ────────────────────────
  const pillBase: React.CSSProperties = {
    ...JK,
    padding: "7px 16px",
    borderRadius: 999,
    border: "1.5px solid rgba(255,255,255,0.7)",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "background 0.2s, color 0.2s",
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ paddingBottom: 60 }}>

      {/* ── Header + filters ────────────────────────────────────────────── */}
      <div style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        alignItems: isMobile ? "stretch" : "stretch",
        justifyContent: "space-between",
        gap: isMobile ? 20 : 32,
        marginBottom: 20,
      }}>

        {/* Left: title + subtitle + search */}
        <div style={{ flexShrink: 0 }}>
          <div style={{
            ...BB,
            fontSize: isMobile ? "clamp(1.8rem, 7vw, 2.4rem)" : "clamp(2rem, 3.5vw, 3rem)",
            color: "#fff", lineHeight: 1,
          }}>
            Semua Berita
          </div>

          {items !== null && !loading && (
            <div style={{ ...JK, margin: "6px 0 14px", fontSize: "clamp(12px, 1.4vw, 14px)", color: "rgba(255,255,255,0.7)", filter: "drop-shadow(2px 4px 6px rgba(0,0,0,0.2))", fontWeight: 600 }}>
              Menampilkan {Math.min(page * PAGE_SIZE, total)} dari {total} artikel yang cocok
            </div>
          )}

          {/* Search bar */}
          <div style={{ position: "relative", display: "flex", alignItems: "center", marginTop: items !== null && !loading ? 0 : 14 }}>
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

        {/* Right: filter panel — labels anchored RIGHT, buttons grow LEFT */}
        <div style={{
          display: "flex", flexDirection: "column",
          justifyContent: "space-between",
          alignItems: isMobile ? "flex-start" : "flex-end",
          flexShrink: 0,
        }}>

          {/* STATUS row */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            flexWrap: "wrap",
            justifyContent: isMobile ? "flex-start" : "flex-end",
          }}>
            {STATUS_OPTIONS.map(s => {
              const isActive = activeStatuses.has(s.key);
              return (
                <button
                  key={s.key} onClick={() => toggleStatus(s.key)}
                  style={{
                    ...pillBase,
                    display: "flex", alignItems: "center", gap: 5,
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
            {/* Semua — rightmost before label */}
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

          {/* EVENT row — chips grow leftward from label */}
          <div style={{
            display: "flex", alignItems: "center",
            gap: 6, flexWrap: "wrap",
            justifyContent: isMobile ? "flex-start" : "flex-end",
          }}>
            {/* Add event button */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowEventDrop(v => !v)}
                style={{
                  ...JK, display: "flex", alignItems: "center", gap: 6,
                  padding: "7px 16px", borderRadius: 999, fontSize: 13, fontWeight: 700,
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
                  events={events}
                  selected={activeEventSlugs}
                  onToggle={toggleEvent}
                  onClose={() => setShowEventDrop(false)}
                />
              )}
            </div>

            {/* Inline chips for selected events */}
            {Array.from(activeEventSlugs).map(slug => {
              const ev = events.find(e => e.slug === slug);
              return (
                <EventChip
                  key={slug}
                  label={ev?.name ?? slug}
                  onRemove={() => toggleEvent(slug)}
                />
              );
            })}

            <RowLabel>Event</RowLabel>
          </div>

          {/* URUTKAN row */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            justifyContent: isMobile ? "flex-start" : "flex-end",
          }}>
            {([ ["-published_at", "Terbaru"], ["published_at", "Terlama"] ] as [SortValue, string][]).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setSort(val)}
                style={{
                  ...pillBase,
                  background: sort === val ? "#fff" : "rgba(255,255,255,0.1)",
                  color:      sort === val ? BLUE  : "#fff",
                }}
              >{label}</button>
            ))}
            <RowLabel>Urutkan</RowLabel>
          </div>

        </div>
      </div>

      {/* ── Divider ──────────────────────────────────────────────────────── */}
      <div style={{ height: 1, background: "rgba(255,255,255,0.08)", marginBottom: 20 }} />

      {/* ── Card grid ────────────────────────────────────────────────────── */}
      {loading && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, padding: 2 }}>
          {Array.from({ length: PAGE_SIZE / 2 }).map((_, i) => (
            <NewsCardSkeleton key={i} isMobile={isMobile} />
          ))}
        </div>
      )}

      {!loading && items !== null && items.length === 0 && (
        <div style={{ textAlign: "center", padding: "80px 20px" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" style={{ marginBottom: 12 }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <p style={{ ...JK, fontSize: 14, color: "rgba(255,255,255,0.3)", margin: 0 }}>
            Tidak ada artikel yang cocok dengan filter ini.
          </p>
        </div>
      )}

      {!loading && items !== null && items.length > 0 && (
        <>
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: isMobile ? 8 : 12, padding: 2,
          }}>
            {items.map(item => (
              <div key={item.id} onClick={() => router.push(`/news/${item.slug}`)} style={{ cursor: "pointer", borderRadius: 8 }}>
                <NewsCard item={item} isMobile={isMobile} />
              </div>
            ))}
          </div>

          <Pagination page={page} totalPages={totalPages} onPageChange={p => {
            window.scrollTo({ top: 0, behavior: "smooth" });
            setPage(p);
          }} />
        </>
      )}

    </div>
  );
}