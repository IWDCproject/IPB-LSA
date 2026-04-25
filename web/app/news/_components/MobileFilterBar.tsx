"use client";

import { useState, useEffect, useRef } from "react";

// ─── Types (subset used here) ─────────────────────────────────────────────────

export type EventStatus = "upcoming" | "ongoing" | "concluded";
export type SortValue   = "-published_at" | "published_at";

export interface EventOption {
  id:     string;
  name:   string;
  slug:   string;
  status: EventStatus;
}

// ─── Constants (subset used here) ────────────────────────────────────────────

const JK     = { fontFamily: "'Plus Jakarta Sans', sans-serif" } as const;
const YELLOW = "#FFC936";
const BLUE   = "#0D26C2";
const NAVY   = "#06125C";
const DUR    = 420;
const EASE   = "cubic-bezier(0.22, 1, 0.36, 1)";
const BASE   = 40;
const STAGGER = 28;

const STATUS_OPTIONS: { key: EventStatus; label: string; color: string; symbol?: string }[] = [
  { key: "ongoing",   label: "Berlangsung", color: "#dc2626", symbol: "●" },
  { key: "upcoming",  label: "Akan Datang", color: YELLOW,    symbol: "◆" },
  { key: "concluded", label: "Selesai",     color: "rgba(255,255,255,0.5)" },
];

// ─── Keyframes — injected once, scoped to this system ─────────────────────────

const KEYFRAMES = `
  @keyframes mob-panel-in {
    from { opacity: 0; transform: scaleY(0.88) translateY(-6px); }
    to   { opacity: 1; transform: scaleY(1)    translateY(0);    }
  }
  @keyframes mob-item-in {
    from { opacity: 0; transform: translateY(-5px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
`;

// ─── Filter drop button ───────────────────────────────────────────────────────

function FilterDropBtn({
  label, count, isOpen, isActive, onClick,
}: {
  label: string; count: number; isOpen: boolean; isActive: boolean; onClick: () => void;
}) {
  const showBadge = count > 0;
  return (
    <button
      onClick={onClick}
      style={{
        ...JK, flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        gap: 5, padding: "9px 6px", borderRadius: 8, fontSize: 13, fontWeight: 700,
        cursor: "pointer", transition: "background 0.2s, color 0.2s, border-color 0.2s",
        border: isActive
          ? "1.5px solid rgba(255,255,255,0.7)"
          : isOpen
            ? "1.5px solid rgba(255,255,255,0.5)"
            : "1.5px solid rgba(255,255,255,0.2)",
        background: isActive ? "#fff" : isOpen ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
        color: isActive ? BLUE : "#fff",
        position: "relative",
      }}
    >
      <span style={{ lineHeight: 1 }}>{label}</span>
      {showBadge && (
        <span style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 16, height: 16, borderRadius: "50%",
          background: isActive ? BLUE : "rgba(255,255,255,0.25)",
          color: "#fff", fontSize: 9, fontWeight: 800, flexShrink: 0, lineHeight: 1,
        }}>{count}</span>
      )}
      <svg
        width="10" height="10" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        style={{ flexShrink: 0, transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "none" }}
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>
  );
}

// ─── Check row ────────────────────────────────────────────────────────────────

function CheckRow({
  label, checked, onClick, symbol, symbolColor, dot, animIndex = 0,
}: {
  label: string; checked: boolean; onClick: () => void;
  symbol?: string; symbolColor?: string; dot?: string; animIndex?: number;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 12,
        padding: "9px 14px", background: "none", border: "none",
        cursor: "pointer", textAlign: "left",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        // Stagger in
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

      {symbol && (
        <span style={{ fontSize: 9, color: checked ? (symbolColor ?? YELLOW) : "rgba(255,255,255,0.35)", flexShrink: 0 }}>
          {symbol}
        </span>
      )}

      <span style={{ ...JK, fontSize: 14, fontWeight: 600, color: checked ? "#fff" : "rgba(255,255,255,0.75)", flex: 1, lineHeight: 1.3 }}>
        {label}
      </span>

      {dot && (
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: dot, flexShrink: 0 }} />
      )}
    </button>
  );
}

// ─── Clear filter button (sits above CheckRows, gets animIndex 0) ─────────────

function ClearBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
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
  );
}

// ─── Mobile filter bar ────────────────────────────────────────────────────────

interface MobileFilterBarProps {
  activeStatuses:    Set<EventStatus>;
  toggleStatus:      (s: EventStatus) => void;
  setActiveStatuses: (v: Set<EventStatus>) => void;
  activeEventSlugs:  Set<string>;
  toggleEvent:       (slug: string) => void;
  setActiveEventSlugs: (v: Set<string>) => void;
  events:            EventOption[];
  sort:              SortValue;
  setSort:           (s: SortValue) => void;
}

export function MobileFilterBar({
  activeStatuses, toggleStatus, setActiveStatuses,
  activeEventSlugs, toggleEvent, setActiveEventSlugs,
  events, sort, setSort,
}: MobileFilterBarProps) {
  const [openPanel, setOpenPanel] = useState<"status" | "event" | "sort" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenPanel(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (panel: "status" | "event" | "sort") =>
    setOpenPanel(v => v === panel ? null : panel);

  const sortLabel = sort === "-published_at" ? "Terbaru" : "Terlama";

  // Re-key the panel on each open so animations re-trigger when switching tabs
  const [panelKey, setPanelKey] = useState(0);
  const prevPanel = useRef(openPanel);
  if (prevPanel.current !== openPanel) {
    if (openPanel !== null) setPanelKey(k => k + 1);
    prevPanel.current = openPanel;
  }

  return (
    <div ref={containerRef} style={{ position: "relative", zIndex: 20 }}>
      <style>{KEYFRAMES}</style>

      {/* Button row */}
      <div style={{
        display: "flex", gap: 6,
        opacity: 0, animation: `np-slide-up ${DUR}ms ${EASE} ${BASE + STAGGER * 3}ms both`,
      }}>
        <FilterDropBtn
          label="Status"   count={activeStatuses.size}   isOpen={openPanel === "status"}
          isActive={activeStatuses.size > 0}              onClick={() => toggle("status")}
        />
        <FilterDropBtn
          label="Event"    count={activeEventSlugs.size}  isOpen={openPanel === "event"}
          isActive={activeEventSlugs.size > 0}            onClick={() => toggle("event")}
        />
        <FilterDropBtn
          label={sortLabel} count={0}                     isOpen={openPanel === "sort"}
          isActive={sort !== "-published_at"}             onClick={() => toggle("sort")}
        />
      </div>

      {/* Dropdown panel */}
      {openPanel !== null && (
        <div
          key={panelKey}
          style={{
            position: "absolute", left: 0, right: 0,
            top: "calc(100% + 5px)", zIndex: 100,
            background: "rgba(6, 18, 92, 0.55)",
            backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10, boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
            overflow: "hidden", maxHeight: 300, overflowY: "auto",
            // Height grow + fade
            transformOrigin: "top",
            animation: "mob-panel-in 240ms cubic-bezier(0.22, 1, 0.36, 1) both",
          }}
        >
          {/* Status panel */}
          {openPanel === "status" && (
            <>
              {activeStatuses.size > 0 && <ClearBtn onClick={() => setActiveStatuses(new Set())} />}
              {STATUS_OPTIONS.map((s, i) => (
                <CheckRow
                  key={s.key}
                  animIndex={activeStatuses.size > 0 ? i + 1 : i}
                  label={s.label}
                  checked={activeStatuses.has(s.key)}
                  onClick={() => toggleStatus(s.key)}
                  symbol={s.symbol}
                  symbolColor={s.color}
                />
              ))}
            </>
          )}

          {/* Event panel */}
          {openPanel === "event" && (
            <>
              {activeEventSlugs.size > 0 && <ClearBtn onClick={() => setActiveEventSlugs(new Set())} />}
              {events.length === 0 && (
                <div style={{ ...JK, padding: "16px", textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
                  Tidak ada event
                </div>
              )}
              {events.map((ev, i) => (
                <CheckRow
                  key={ev.slug}
                  animIndex={activeEventSlugs.size > 0 ? i + 1 : i}
                  label={ev.name}
                  checked={activeEventSlugs.has(ev.slug)}
                  onClick={() => toggleEvent(ev.slug)}
                  dot={ev.status === "ongoing" ? "#dc2626" : ev.status === "upcoming" ? YELLOW : "rgba(255,255,255,0.4)"}
                />
              ))}
            </>
          )}

          {/* Sort panel */}
          {openPanel === "sort" && (
            ([[ "-published_at", "Terbaru"], ["published_at", "Terlama"]] as [SortValue, string][]).map(([val, label], i) => (
              <CheckRow
                key={val}
                animIndex={i}
                label={label}
                checked={sort === val}
                onClick={() => { setSort(val); setOpenPanel(null); }}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}