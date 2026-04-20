"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import NewsCard from "@/components/NewsCard";
import { getNewsByEvent } from "@/lib/directus";
import { TAB_ENTER } from "./Animations";
import type { AnimPhase } from "./UseTabTransition";

const JK = { fontFamily: "'Plus Jakarta Sans', sans-serif" } as const;
const PAGE_SIZE = 12;
const YELLOW = "#FFC936";

// ─── Pagination ───────────────────────────────────────────────────────────────

function PaginationButton({
  label, active, disabled, onClick,
}: {
  label: React.ReactNode; active?: boolean; disabled?: boolean; onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const bg    = active ? YELLOW : hovered && !disabled ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)";
  const color = active ? "#06125C" : disabled ? "rgba(255,255,255,0.25)" : "#fff";
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

// ─── Placeholder Card (fills remainder of last row) ───────────────────────────

function NewsPlaceholder() {
  return (
    <div style={{
      position: "relative", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", borderRadius: 8,
      boxShadow: "0 0 0 2px rgba(255, 255, 255, 0.15)",
      background: "rgba(255, 255, 255, 0.03)", backdropFilter: "blur(8px)",
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

  // outerRef     — always-mounted container; we hard-set its height to lock it
  // innerRef     — wraps actual content so we can measure its natural height
  // lockedHeight — null = free flow; number = locked/transitioning to that px value
  const outerRef     = useRef<HTMLDivElement>(null);
  const innerRef     = useRef<HTMLDivElement>(null);
  const [lockedHeight, setLockedHeight] = useState<number | null>(null);

  useEffect(() => {
    setItems(null);
    let cancelled = false;

    getNewsByEvent(event.slug, page, PAGE_SIZE).then((res) => {
      if (cancelled) return;
      setItems(res.items);
      setTotalPages(res.totalPages);
    });

    return () => { cancelled = true; };
  }, [event.slug, page]);

  // Once new items have painted, measure the inner content's natural height and
  // transition the outer container from its locked height to the new one.
  // useLayoutEffect runs synchronously after DOM mutations, before the browser
  // repaints, so the measurement is always fresh.
  useLayoutEffect(() => {
    if (items === null)        return; // still fetching — keep the lock
    if (lockedHeight === null) return; // no active lock (initial load)
    if (!innerRef.current)     return;

    const newHeight = innerRef.current.offsetHeight;
    setLockedHeight(newHeight); // CSS transition: old locked px → new content px
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const handlePageChange = (p: number) => {
    // Step 1 — snapshot & hard-lock the height so the page stays tall
    if (outerRef.current) {
      setLockedHeight(outerRef.current.offsetHeight);
    }
    // Step 2 — scroll to top while the page is still full height (always works)
    window.scrollTo({ top: 0, behavior: "smooth" });
    // Step 3 — trigger the fetch (items → null, content disappears inside lock)
    setPage(p);
  };

  // After the height transition finishes, release back to auto so the container
  // can reflow naturally (handles viewport resize etc.)
  const handleTransitionEnd = () => setLockedHeight(null);

  const COLUMNS = isMobile ? 2 : 4;
  const GAP     = isMobile ? 12 : 20;
  const isLoading  = items === null;
  const isEmpty    = !isLoading && items!.length === 0;
  const isLastPage = page === totalPages;

  const DUR     = TAB_ENTER.duration;
  const EASE    = TAB_ENTER.easing;
  const BASE    = TAB_ENTER.baseDelay;
  const STAGGER = TAB_ENTER.stagger;

  const remainder        = !isLoading && !isEmpty ? items!.length % COLUMNS : 0;
  const placeholderCount = remainder !== 0 && isLastPage ? COLUMNS - remainder : 0;
  const totalSlots       = !isLoading && !isEmpty ? items!.length + placeholderCount : 0;

  return (
    // Outer div: always mounted. When lockedHeight is set, it holds a hard pixel
    // height with overflow:hidden, then CSS-transitions to the new content height.
    <div
      ref={outerRef}
      onTransitionEnd={handleTransitionEnd}
      style={{
        height:     lockedHeight !== null ? lockedHeight : undefined,
        overflow:   lockedHeight !== null ? "hidden"     : undefined,
        transition: lockedHeight !== null ? "height 0.4s ease" : undefined,
      }}
    >
      {/* Inner div sits at its natural content height — lets us measure it */}
      <div ref={innerRef}>

        {/* Loading: render nothing (outer stays locked at old height) */}
        {isLoading && null}

        {/* Empty */}
        {isEmpty && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 20px" }}>
            <span style={{ ...JK, fontSize: 14, color: "rgba(255,255,255,0.3)" }}>No news yet for this event</span>
          </div>
        )}

        {/* Card grid */}
        {!isLoading && !isEmpty && (
          <>
            <div style={{
              display: "grid",
              gridTemplateColumns: `repeat(${COLUMNS}, 1fr)`,
              gap: GAP, alignItems: "stretch", padding: 2,
            }}>
              {Array.from({ length: totalSlots }).map((_, i) => {
                const item = items![i];
                const isPlaceholder = i >= items!.length;

                if (isPlaceholder) {
                  return (
                    <div
                      key={`placeholder-${i}`}
                      style={{
                        opacity: 0,
                        animation: `anim-slide-up-soft ${DUR}ms ${EASE} ${BASE + i * STAGGER}ms forwards`,
                      }}
                    >
                      <NewsPlaceholder />
                    </div>
                  );
                }

                return (
                  <div
                    key={`card-${item.id}`}
                    style={{
                      opacity: 0,
                      animation: `anim-slide-up-soft ${DUR}ms ${EASE} ${BASE + i * STAGGER}ms forwards`,
                    }}
                  >
                    <NewsCard item={item} />
                  </div>
                );
              })}
            </div>

            {/* Pagination fades in after the last card finishes */}
            <div style={{
              opacity: 0,
              animation: `anim-fade-in ${DUR}ms ${EASE} ${BASE + totalSlots * STAGGER + 60}ms forwards`,
            }}>
              <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
          </>
        )}

      </div>
    </div>
  );
}