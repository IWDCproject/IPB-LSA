"use client";

import { useEffect, useMemo, useRef, useState, Fragment } from "react";
import { PanelCard, PanelTitle } from "./Panel";
import { JK, ACCENT, DOT_GRAY, TEXT_DARK, TEXT_MUTED } from "../shared/tokens";

// ─── Shared geometry ───────────────────────────────────────────────────────────
const DOT_SIZE  = 14;
const DOT_R     = DOT_SIZE / 2;
const RING_SIZE = 28;
const LINE_Y    = 60;   // vertical centre of the horizontal connector line
const GAP       = 28;   // vertical gap between line and label baseline

// ─── Desktop-specific ──────────────────────────────────────────────────────────
// Desktop dots span the full container width (no edge padding needed — first/last
// labels are flush-aligned so they never overflow).
const DT_LABEL_W_MIN = 100;
const DT_LABEL_W_MAX = 160;

// ─── Mobile-specific ───────────────────────────────────────────────────────────
// Edge padding keeps the selection ring from being clipped by the scroll container.
// Minimum dot spacing must be >= max label width so adjacent above-line labels
// never overlap; 140 comfortably clears the 130 px label cap.
const MOB_EDGE_PAD    = 16;
const MOB_MIN_SPACING = 80;
const MOB_LABEL_W_MIN = 100;
const MOB_LABEL_W_MAX = 130;
const MOB_MAX_FADE_W  = 48;

const MOBILE_BREAKPOINT = 640;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtPhaseDate(phase: any): string {
  if (!phase?.date_start) return "";
  const iso = `${phase.date_start}T${phase.time_start ?? "00:00"}`;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function st(v: string) { return String(v ?? "").toLowerCase(); }
function isYellow(v: string)  { return ["active","current","done","finished","over"].includes(st(v)); }
function isCurrent(v: string) { return ["active","current"].includes(st(v)); }

function splitLabel(label: string): [string, string | null] {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return [label, null];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
}

// ─── Label positioning ─────────────────────────────────────────────────────────
//
// edgePad = 0 on desktop: first/last labels align flush to the container edge.
// edgePad = MOB_EDGE_PAD on mobile: labels stay inset from the scroll wall.

function getLabelStyle(
  index: number,
  total: number,
  x: number,
  zone: "top" | "bottom",
  labelWidth: number,
  selected: boolean,
  edgePad: number,
): React.CSSProperties {
  const first = index === 0;
  const last  = index === total - 1;
  const isTop = zone === "top";

  let translateX = "-50%";
  let left: string | number = x;
  let right: string | number = "auto";
  let textAlign: "left" | "center" | "right" = "center";

  if (first) {
    translateX = "0";
    left = edgePad;
    textAlign = "left";
  } else if (last) {
    translateX = "0";
    left = "auto";
    right = edgePad;
    textAlign = "right";
  }

  return {
    position: "absolute",
    top: isTop ? LINE_Y - GAP : LINE_Y + GAP,
    left, right,
    transform: `translate(${translateX}, ${isTop ? "-100%" : "0"})`,
    width: labelWidth, textAlign,
    ...JK,
    fontSize: 12, lineHeight: 1.3,
    fontWeight: selected ? 800 : 500,
    color: selected ? TEXT_DARK : TEXT_MUTED,
    overflow: "hidden",
  };
}

// ─── Rail markers (shared by both layouts) ─────────────────────────────────────

interface RailMarkersProps {
  phases: any[];
  positions: number[];
  selectedId: any;
  labelWidth: number;
  edgePad: number;
  onSelect: (id: any) => void;
}

function RailMarkers({ phases, positions, selectedId, labelWidth, edgePad, onSelect }: RailMarkersProps) {
  return (
    <>
      {/* Connector lines */}
      {phases.map((phase, i) => {
        if (i === phases.length - 1) return null;
        const x1 = positions[i];
        const x2 = positions[i + 1];
        const leftDone  = isYellow(phase.status);
        const rightDone = isYellow(phases[i + 1].status);
        const bg =
          leftDone && rightDone    ? ACCENT
          : !leftDone && !rightDone ? DOT_GRAY
          : leftDone                ? `linear-gradient(to right, ${ACCENT}, ${DOT_GRAY})`
                                    : `linear-gradient(to right, ${DOT_GRAY}, ${ACCENT})`;
        return (
          <div
            key={`line-${phase.id}`}
            style={{
              position: "absolute", left: x1, top: LINE_Y,
              transform: "translateY(-50%)",
              width: Math.max(0, x2 - x1), height: 3,
              borderRadius: 999, zIndex: 1, background: bg,
            }}
          />
        );
      })}

      {/* Labels, dots, selection rings */}
      {phases.map((phase, i) => {
        const x        = positions[i];
        const above    = i % 2 === 0;
        const selected = selectedId === phase.id;
        const [line1, line2] = splitLabel(phase.label);

        return (
          <Fragment key={phase.id}>
            {/* Label */}
            <button
              type="button"
              onClick={() => onSelect(phase.id)}
              style={{
                ...getLabelStyle(i, phases.length, x, above ? "top" : "bottom", labelWidth, selected, edgePad),
                display: "block", background: "transparent",
                border: "none", cursor: "pointer", padding: 0, outline: "none",
              }}
            >
              {line2 ? <>{line1}<br />{line2}</> : line1}
            </button>

            {/* Dot */}
            <button
              type="button"
              aria-label={`Select phase ${phase.label}`}
              onClick={() => onSelect(phase.id)}
              style={{
                position: "absolute", left: x, top: LINE_Y,
                boxSizing: "border-box", transform: "translate(-50%, -50%)",
                width: DOT_SIZE, height: DOT_SIZE, borderRadius: "50%",
                border: "none", padding: 0, cursor: "pointer", zIndex: 3,
                background: isYellow(phase.status) ? ACCENT : DOT_GRAY,
                boxShadow: isYellow(phase.status)
                  ? "0 0 12px 3px rgba(255,201,54,0.45)"
                  : "0 0 8px rgba(209,213,219,0.4)",
              }}
            />

            {/* Selection ring */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute", left: x, top: LINE_Y,
                boxSizing: "border-box",
                transform: `translate(-50%, -50%) scale(${selected ? 1 : 0})`,
                opacity: selected ? 1 : 0,
                transition: "transform 0.3s cubic-bezier(0.1,1,0.2,1), opacity 0.2s ease-out",
                width: RING_SIZE, height: RING_SIZE, borderRadius: "50%",
                border: `3px solid ${ACCENT}`,
                boxShadow: "0 0 10px 2px rgba(255,201,54,0.3)",
                pointerEvents: "none", zIndex: 2,
              }}
            />
          </Fragment>
        );
      })}
    </>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────────

export default function TimelinePanel({ phases }: { phases: any[] }) {
  // sentinelRef lives on a zero-height div that is ALWAYS rendered, outside both
  // the desktop and mobile branches. The ResizeObserver targets this element only,
  // so it is never left watching a detached DOM node when the layout switches.
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollRef   = useRef<HTMLDivElement>(null);

  const [containerWidth, setContainerWidth] = useState(0);
  const [selectedId,     setSelectedId]     = useState<string | number | null>(null);
  const [scrollEdge,     setScrollEdge]     = useState({ left: 0, right: 0 });

  // ── Stable width measurement ────────────────────────────────────────────────
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.getBoundingClientRect().width);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isMobile = containerWidth > 0 && containerWidth < MOBILE_BREAKPOINT;

  // ── Selected phase ──────────────────────────────────────────────────────────
  const selectedPhase = useMemo(() => {
    if (!phases?.length) return null;
    return (
      phases.find(p => p.id === selectedId)
      ?? phases.find(p => isCurrent(p.status))
      ?? phases[0]
    );
  }, [phases, selectedId]);

  useEffect(() => {
    if (selectedPhase) setSelectedId(selectedPhase.id);
  }, [selectedPhase]);

  // ══════════════════════════════════════════════════════════════════════════════
  // DESKTOP geometry
  // Dots spread from DOT_R → (containerWidth − DOT_R). edgePad=0 so first/last
  // labels are flush with the container edges.
  // ══════════════════════════════════════════════════════════════════════════════
  const dtPositions = useMemo(() => {
    if (!containerWidth || !phases?.length) return [];
    if (phases.length === 1) return [containerWidth / 2];
    const usable = containerWidth - DOT_SIZE;
    return phases.map((_, i) => DOT_R + (usable * i) / (phases.length - 1));
  }, [containerWidth, phases?.length]);

  const dtLabelWidth = useMemo(() => {
    if (!containerWidth || !phases?.length) return 140;
    const perSlot = containerWidth / Math.max(phases.length, 3);
    return Math.max(DT_LABEL_W_MIN, Math.min(DT_LABEL_W_MAX, perSlot - 8));
  }, [containerWidth, phases?.length]);

  // ══════════════════════════════════════════════════════════════════════════════
  // MOBILE geometry
  // Rail expands past containerWidth when phases need more room. The scroll
  // container clips the excess and lets the user pan.
  // MOB_MIN_SPACING (140) >= MOB_LABEL_W_MAX (130) guarantees adjacent above-line
  // labels never overlap.
  // ══════════════════════════════════════════════════════════════════════════════
  const mobRailWidth = useMemo(() => {
    if (!containerWidth || !phases?.length) return 0;
    if (phases.length <= 1) return containerWidth;
    const minNeeded = (phases.length - 1) * MOB_MIN_SPACING + DOT_SIZE + 2 * MOB_EDGE_PAD;
    return Math.max(containerWidth, minNeeded);
  }, [containerWidth, phases?.length]);

  const mobPositions = useMemo(() => {
    if (!mobRailWidth || !phases?.length) return [];
    if (phases.length === 1) return [mobRailWidth / 2];
    const usable = mobRailWidth - DOT_SIZE - 2 * MOB_EDGE_PAD;
    return phases.map((_, i) => MOB_EDGE_PAD + DOT_R + (usable * i) / (phases.length - 1));
  }, [mobRailWidth, phases?.length]);

  const mobLabelWidth = useMemo(() => {
    if (!mobRailWidth || !phases?.length) return 120;
    const perSlot = mobRailWidth / Math.max(phases.length, 3);
    return Math.max(MOB_LABEL_W_MIN, Math.min(MOB_LABEL_W_MAX, perSlot - 8));
  }, [mobRailWidth, phases?.length]);

  // ── Mobile scroll-edge tracking (drives fade masks) ─────────────────────────
  const updateScrollEdge = () => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setScrollEdge({
      left:  scrollLeft,
      right: Math.max(0, scrollWidth - clientWidth - scrollLeft),
    });
  };

  useEffect(() => {
    if (!isMobile) return;
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollEdge, { passive: true });
    updateScrollEdge();
    return () => el.removeEventListener("scroll", updateScrollEdge);
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile) return;
    const id = setTimeout(updateScrollEdge, 50);
    return () => clearTimeout(id);
  }, [containerWidth, phases, isMobile]);

  // ── Mobile: auto-centre selected dot ────────────────────────────────────────
  useEffect(() => {
    if (!isMobile) return;
    const el = scrollRef.current;
    if (!el || !mobPositions.length || selectedId == null) return;
    const idx = phases.findIndex(p => p.id === selectedId);
    if (idx === -1) return;
    el.scrollTo({ left: mobPositions[idx] - el.clientWidth / 2, behavior: "smooth" });
  }, [selectedId, mobPositions, isMobile]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!phases?.length) {
    return (
      <PanelCard>
        <PanelTitle>Event Timeline</PanelTitle>
        <div style={{ ...JK, fontSize: 14, color: TEXT_MUTED, textAlign: "center", padding: "30px 0" }}>
          Event phases not available.
        </div>
      </PanelCard>
    );
  }

  const leftFadeOpacity  = Math.min(scrollEdge.left  / MOB_MAX_FADE_W, 1);
  const rightFadeOpacity = Math.min(scrollEdge.right / MOB_MAX_FADE_W, 1);

  return (
    <PanelCard>
      <PanelTitle>Event Timeline</PanelTitle>

      {/*
        Sentinel — a zero-height, full-width div that always stays in the DOM.
        The ResizeObserver watches only this element, so it never loses its
        target when the desktop/mobile branches swap in and out.
      */}
      <div ref={sentinelRef} style={{ width: "100%", height: 0 }} />

      {/* ════════════════════════════════════════════════════════════════════════
          DESKTOP LAYOUT
          No scrolling. Dots run edge-to-edge (edgePad = 0); first/last labels
          are flush-aligned and stay naturally in bounds.
          ════════════════════════════════════════════════════════════════════════ */}
      {!isMobile && containerWidth > 0 && (
        <div style={{ marginBottom: selectedPhase ? 24 : 0 }}>
          <div style={{ position: "relative", width: "100%", minHeight: 120, overflow: "visible" }}>
            <RailMarkers
              phases={phases}
              positions={dtPositions}
              selectedId={selectedId}
              labelWidth={dtLabelWidth}
              edgePad={0}
              onSelect={setSelectedId}
            />
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          MOBILE LAYOUT
          Horizontally scrollable rail with edge-fade masks.
          Rail expands in JS (never CSS minWidth) when phases need more room.
          MOB_EDGE_PAD keeps rings away from the clip boundary.
          ════════════════════════════════════════════════════════════════════════ */}
      {isMobile && (
        <div style={{ marginBottom: selectedPhase ? 16 : 0 }}>
          <style>{`.tl-scroll::-webkit-scrollbar { display: none; }`}</style>

          {/* overflow:hidden clips the fade overlays cleanly at the edges */}
          <div style={{ position: "relative", overflow: "hidden" }}>

            {/* Left fade */}
            {leftFadeOpacity > 0 && (
              <div aria-hidden="true" style={{
                position: "absolute", left: 0, top: 0, bottom: 0, zIndex: 10,
                pointerEvents: "none",
                width: MOB_MAX_FADE_W * leftFadeOpacity,
                background: `linear-gradient(to right, rgba(255,255,255,${leftFadeOpacity}), transparent)`,
                transition: "width 80ms linear",
              }} />
            )}

            {/* Right fade */}
            {rightFadeOpacity > 0 && (
              <div aria-hidden="true" style={{
                position: "absolute", right: 0, top: 0, bottom: 0, zIndex: 10,
                pointerEvents: "none",
                width: MOB_MAX_FADE_W * rightFadeOpacity,
                background: `linear-gradient(to left, rgba(255,255,255,${rightFadeOpacity}), transparent)`,
                transition: "width 80ms linear",
              }} />
            )}

            {/* Scroll container */}
            <div
              ref={scrollRef}
              className="tl-scroll"
              style={{
                overflowX: "auto",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                WebkitOverflowScrolling: "touch",
              } as React.CSSProperties}
            >
              {/* Rail — explicit JS-computed px width, never CSS minWidth.
                  CSS minWidth propagates as min-content and inflates the
                  parent grid cell on narrow screens. */}
              <div style={{
                position: "relative",
                width: mobRailWidth > 0 ? mobRailWidth : "100%",
                minHeight: 120,
                overflow: "visible",
              }}>
                <RailMarkers
                  phases={phases}
                  positions={mobPositions}
                  selectedId={selectedId}
                  labelWidth={mobLabelWidth}
                  edgePad={MOB_EDGE_PAD}
                  onSelect={setSelectedId}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          SELECTED PHASE DETAIL  (unified — same layout on both breakpoints)
          Title + date stacked tightly, description with no left indent.
          ════════════════════════════════════════════════════════════════════════ */}
      {selectedPhase && (
        <div>
          <div style={{ marginBottom: selectedPhase.description ? 10 : 0 }}>
            <div style={{ ...JK, fontSize: 14, fontWeight: 800, color: TEXT_DARK }}>
              {selectedPhase.label}
            </div>
            <div style={{ ...JK, fontSize: 12, fontWeight: 500, color: TEXT_MUTED, marginTop: 3 }}>
              {fmtPhaseDate(selectedPhase)}
            </div>
          </div>

          {selectedPhase.description && (
            <p style={{ ...JK, fontSize: 12, color: "#4B5563", lineHeight: 1.6, margin: "8px 0 0 0" }}>
              {selectedPhase.description}
            </p>
          )}
        </div>
      )}
    </PanelCard>
  );
}