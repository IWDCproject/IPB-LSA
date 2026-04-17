"use client";

import { useState, useEffect, useRef } from "react";
import NewsCard, { NewsCardSkeleton } from "@/components/NewsCard";
import { getNewsByEvent } from "@/lib/directus";

const JK = { fontFamily: "'Plus Jakarta Sans', sans-serif" } as const;
const PAGE_SIZE = 12;
const BLUE = "#0D26C2";
const YELLOW = "#FFC936";

// ─── Pagination ────────────────────────────────────────────────────────────────

function PaginationButton({
  label,
  active,
  disabled,
  onClick,
}: {
  label: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  const bg = active
    ? YELLOW
    : hovered && !disabled
    ? "rgba(255,255,255,0.12)"
    : "rgba(255,255,255,0.06)";

  const color = active ? "#06125C" : disabled ? "rgba(255,255,255,0.25)" : "#fff";
  const border = active
    ? `1px solid ${YELLOW}`
    : "1px solid rgba(255,255,255,0.15)";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...JK,
        minWidth: 36,
        height: 36,
        padding: "0 10px",
        borderRadius: 6,
        border,
        background: bg,
        color,
        fontSize: 13,
        fontWeight: active ? 800 : 600,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 0.2s ease, border 0.2s ease",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {label}
    </button>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  // Build page number list with ellipsis
  const pages: (number | "…")[] =[];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("…");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push("…");
    pages.push(totalPages);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 40 }}>
      <PaginationButton
        label={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        }
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
      />

      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`ellipsis-${i}`} style={{ ...JK, color: "rgba(255,255,255,0.3)", fontSize: 13, padding: "0 4px" }}>
            …
          </span>
        ) : (
          <PaginationButton
            key={p}
            label={p}
            active={p === page}
            onClick={() => onPageChange(p as number)}
          />
        )
      )}

      <PaginationButton
        label={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        }
        disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}
      />
    </div>
  );
}

// ─── Placeholder Card ──────────────────────────────────────────────────────────

function NewsPlaceholder() {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
        boxShadow: "0 0 0 2px rgba(255, 255, 255, 0.15)",
        background: "rgba(255, 255, 255, 0.03)",
        backdropFilter: "blur(4px)",
        padding: "40px",
        height: "100%",
        minHeight: 380,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "url(/Batik_Pattern_white.svg)",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          opacity: 0.15,
          pointerEvents: "none",
          zIndex: 0,
          filter: "blur(1.5px)",
        }}
      />
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

// ─── Empty State ────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 20px",
        gap: 12,
      }}
    >
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5">
        <path d="M4 4h16v16H4zM4 9h16M9 4v16" />
      </svg>
      <span style={{ ...JK, fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.3)" }}>
        No news yet for this event
      </span>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function NewsTab({ event, isMobile }: { event: any; isMobile: boolean }) {
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(1);

  // Detect actual column count from the rendered grid
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
  }, [isMobile, loading]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getNewsByEvent(event.slug, page, PAGE_SIZE).then((res) => {
      if (cancelled) return;
      setItems(res.items);
      setTotalPages(res.totalPages);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [event.slug, page]);

  const handlePageChange = (p: number) => {
    setPage(p);
    // Scroll to top of tab content smoothly
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Show skeleton grid while loading
  if (loading) {
    return (
      <div> 
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 20,
            alignItems: "stretch",
            padding: 2, // Added 2px padding to absorb the outward stroke without margin offset issues
          }}
        >
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <NewsCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return <EmptyState />;
  }

  const remainder = items.length % columns;
  const isLastPage = page === totalPages;
  
  // Only calculate placeholders if we are actually on the last page
  const placeholderCount = !isMobile && remainder !== 0 && isLastPage ? columns - remainder : 0;

  return (
    <div> {/* Removed paddingTop: 32 here to match OverviewTab */}
      <div
        ref={gridRef}
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 20,
          alignItems: "stretch",
          padding: 2, 
        }}
      >
        {items.map((item) => (
          <NewsCard key={item.id} item={item} />
        ))}

        {/* Decorative placeholders to fill the last row — desktop only */}
        {Array.from({ length: placeholderCount }).map((_, i) => (
          <NewsPlaceholder key={`p-${i}`} />
        ))}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
    </div>
  );
}