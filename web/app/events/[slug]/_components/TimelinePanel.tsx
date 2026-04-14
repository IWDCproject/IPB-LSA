import { useEffect, useMemo, useRef, useState, Fragment } from "react";
import { PanelCard, PanelTitle } from "./Panel";

const JK = { fontFamily: "'Plus Jakarta Sans', sans-serif" } as const;

const ACCENT = "#FFC936";
const DOT_GRAY = "#D1D5DB";
const TEXT_DARK = "#06125C";
const TEXT_MUTED = "#6B7280";

const DOT_SIZE = 14;
const DOT_R = DOT_SIZE / 2;

const LINE_Y = 60; 
const GAP = 28; 

const LABEL_W_MIN = 110;
const LABEL_W_MAX = 160;

function fmtPhaseDate(phase: any) {
  if (!phase?.date_start) return "";
  const iso = `${phase.date_start}T${phase.time_start ?? "00:00"}`;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function status(value: string) {
  return String(value ?? "").toLowerCase();
}

function isYellow(value: string) {
  const s = status(value);
  return ["active", "current", "done", "finished", "over"].includes(s);
}

function isCurrent(value: string) {
  const s = status(value);
  return ["active", "current"].includes(s);
}

function splitLabel(label: string) {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return [label];
  const mid = Math.ceil(words.length / 2);
  const first = words.slice(0, mid).join(" ");
  const second = words.slice(mid).join(" ");
  return second ? [first, second] : [first];
}

function getLabelStyle(
  index: number,
  total: number,
  x: number,
  zone: "top" | "bottom",
  labelWidth: number,
  selected: boolean,
): React.CSSProperties {
  const first = index === 0;
  const last = index === total - 1;
  const isTop = zone === "top";

  let translateX = "-50%";
  let left: string | number = x;
  let right: string | number = "auto";
  let textAlign: any = "center";

  if (first) {
    translateX = "0";
    left = 0;
    textAlign = "left";
  } else if (last) {
    translateX = "0";
    left = "auto";
    right = 0;
    textAlign = "right";
  }

  return {
    position: "absolute",
    top: isTop ? LINE_Y - GAP : LINE_Y + GAP,
    left,
    right,
    transform: `translate(${translateX}, ${isTop ? "-100%" : "0"})`,
    width: labelWidth,
    textAlign,
    ...JK,
    fontSize: 12,
    lineHeight: 1.15,
    fontWeight: selected ? 800 : 500,
    color: selected ? TEXT_DARK : TEXT_MUTED,
    overflow: "visible",
  };
}

export default function TimelinePanel({ phases }: { phases: any[] }) {
  const railRef = useRef<HTMLDivElement>(null);
  const [railWidth, setRailWidth] = useState(0);
  const [selectedId, setSelectedId] = useState<string | number | null>(null);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const update = () => setRailWidth(el.getBoundingClientRect().width);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const selectedPhase = useMemo(() => {
    if (!phases?.length) return null;
    return phases.find((p) => p.id === selectedId) ?? phases.find((p) => isCurrent(p.status)) ?? phases[0];
  }, [phases, selectedId]);

  useEffect(() => {
    if (!selectedPhase) return;
    setSelectedId(selectedPhase.id);
  }, [selectedPhase?.id]);

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

  const labelWidth = useMemo(() => {
    if (!railWidth) return 140;
    const approx = railWidth / Math.max(phases.length, 3) - 12;
    return Math.max(LABEL_W_MIN, Math.min(LABEL_W_MAX, approx));
  }, [railWidth, phases.length]);

  const positions = useMemo(() => {
    if (!railWidth) return phases.map((_, i) => DOT_R + i * 120);
    if (phases.length === 1) return [railWidth / 2];
    const usable = railWidth - DOT_SIZE;
    return phases.map((_, i) => DOT_R + (usable * i) / (phases.length - 1));
  }, [railWidth, phases]);

  return (
    <PanelCard>
      <PanelTitle>Event Timeline</PanelTitle>

      <div style={{ marginBottom: selectedPhase ? 32 : 0 }}>
        <div
          ref={railRef}
          style={{
            position: "relative",
            width: "100%",
            minHeight: 120,
            overflow: "visible",
          }}
        >
          {phases.map((phase, i) => {
            if (i === phases.length - 1) return null;
            const x1 = positions[i];
            const x2 = positions[i + 1];
            return (
              <div
                key={`line-${phase.id}`}
                style={{
                  position: "absolute",
                  left: x1,
                  top: LINE_Y,
                  transform: "translateY(-50%)",
                  width: Math.max(0, x2 - x1),
                  height: 3,
                  zIndex: 1,
                  borderRadius: 999,
                  background:
                    isYellow(phase.status) && isYellow(phases[i + 1].status)
                      ? ACCENT
                      : !isYellow(phase.status) && !isYellow(phases[i + 1].status)
                        ? DOT_GRAY
                        : isYellow(phase.status)
                          ? `linear-gradient(to right, ${ACCENT}, ${DOT_GRAY})`
                          : `linear-gradient(to right, ${DOT_GRAY}, ${ACCENT})`,
                }}
              />
            );
          })}

          {phases.map((phase, i) => {
            const x = positions[i];
            const above = i % 2 === 0;
            const selected = selectedPhase?.id === phase.id;
            const label = splitLabel(phase.label);
            return (
              <Fragment key={phase.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(phase.id)}
                  style={{
                    ...getLabelStyle(i, phases.length, x, above ? "top" : "bottom", labelWidth, selected),
                    display: "block",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    outline: "none",
                  }}
                >
                  {label.length === 1 ? label[0] : <>{label[0]}<br />{label[1]}</>}
                </button>

                <button
                  type="button"
                  aria-label={`Select phase ${phase.label}`}
                  onClick={() => setSelectedId(phase.id)}
                  style={{
                    position: "absolute",
                    left: x,
                    top: LINE_Y,
                    boxSizing: "border-box",
                    transform: "translate(-50%, -50%)",
                    width: DOT_SIZE,
                    height: DOT_SIZE,
                    borderRadius: "50%",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    background: isYellow(phase.status) ? ACCENT : DOT_GRAY,
                    boxShadow: isYellow(phase.status)
                      ? `0 0 12px 3px rgba(255, 201, 54, 0.45)`
                      : `0 0 8px rgba(209, 213, 219, 0.4)`,
                    zIndex: 3,
                  }}
                />

                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: x,
                    top: LINE_Y,
                    boxSizing: "border-box",
                    transform: `translate(-50%, -50%) scale(${selected ? 1 : 0})`,
                    opacity: selected ? 1 : 0,
                    transition: "transform 0.3s cubic-bezier(0.1, 1, 0.2, 1), opacity 0.2s ease-out",
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    border: `3px solid ${ACCENT}`,
                    boxShadow: `0 0 10px 2px rgba(255, 201, 54, 0.3)`,
                    pointerEvents: "none",
                    zIndex: 2,
                  }}
                />
              </Fragment>
            );
          })}
        </div>
      </div>

      {selectedPhase && (
        <div>
          <div style={{ display: "flex", alignItems: "center", marginBottom: selectedPhase.description ? 12 : 0 }}>
            <div style={{ ...JK, fontSize: 14, fontWeight: 800, color: TEXT_DARK, whiteSpace: "nowrap" }}>
              {selectedPhase.label}
            </div>
            <div style={{ flexGrow: 1, height: 1, background: "#E5E7EB", margin: "0 16px" }} />
            <div style={{ ...JK, fontSize: 13, fontWeight: 500, color: TEXT_MUTED, whiteSpace: "nowrap" }}>
              {fmtPhaseDate(selectedPhase)}
            </div>
          </div>
          {selectedPhase.description && (
            <p style={{ ...JK, fontSize: 13, color: "#4B5563", lineHeight: 1.6, margin: 0 }}>
              {selectedPhase.description}
            </p>
          )}
        </div>
      )}
    </PanelCard>
  );
}