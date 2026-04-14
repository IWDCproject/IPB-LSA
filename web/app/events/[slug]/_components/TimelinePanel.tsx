import { useEffect, useMemo, useRef, useState } from "react";
import { PanelCard, PanelTitle } from "./Panel";

const JK = { fontFamily: "'Plus Jakarta Sans', sans-serif" } as const;

const ACCENT = "#FFC936";
const DOT_GRAY = "#D1D5DB";
const TEXT_DARK = "#06125C";
const TEXT_MUTED = "#6B7280";

const DOT_SIZE = 14;
const DOT_R = DOT_SIZE / 2;

const TOP_ZONE = 40;
const RAIL_ZONE = 28;
const BOTTOM_ZONE = 40;

const LABEL_H = 34;
const LABEL_W_MIN = 110;
const LABEL_W_MAX = 160;

const KEYFRAMES = `
  @keyframes timeline-pulse {
    0%   { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
    100% { transform: translate(-50%, -50%) scale(3); opacity: 0; }
  }

  @keyframes timeline-select {
    0%   { transform: translate(-50%, -50%) scale(1); opacity: 0.35; }
    100% { transform: translate(-50%, -50%) scale(1.9); opacity: 0; }
  }
`;

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
  return["active", "current"].includes(s);
}

function splitLabel(label: string) {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return[label];
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

  return {
    position: "absolute",
    top: zone === "top" ? 0 : TOP_ZONE + RAIL_ZONE,
    left: first ? 0 : last ? "auto" : x - labelWidth / 2,
    right: last ? 0 : "auto",
    width: labelWidth,
    height: LABEL_H,
    display: "flex",
    alignItems: zone === "top" ? "flex-end" : "flex-start",
    justifyContent: first ? "flex-start" : last ? "flex-end" : "center",
    textAlign: first ? "left" : last ? "right" : "center",
    ...JK,
    fontSize: 14,
    lineHeight: 1.15,
    fontWeight: selected ? 800 : 500,
    color: selected ? TEXT_DARK : TEXT_MUTED,
    overflow: "hidden",
  };
}

export default function TimelinePanel({ phases }: { phases: any[] }) {
  const railRef = useRef<HTMLDivElement>(null);
  const[railWidth, setRailWidth] = useState(0);
  const [selectedId, setSelectedId] = useState<string | number | null>(null);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;

    const update = () => setRailWidth(el.getBoundingClientRect().width);
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);

    return () => ro.disconnect();
  },[]);

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
      <style>{KEYFRAMES}</style>
      <PanelTitle>Event Timeline</PanelTitle>

      <div style={{ marginBottom: selectedPhase ? 20 : 0 }}>
        <div
          ref={railRef}
          style={{
            position: "relative",
            width: "100%",
            minHeight: TOP_ZONE + RAIL_ZONE + BOTTOM_ZONE,
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
                  left: x1 + DOT_R,
                  top: TOP_ZONE + RAIL_ZONE / 2 - 1.5,
                  width: Math.max(0, x2 - x1 - DOT_SIZE),
                  height: 3,
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
            const current = isCurrent(phase.status);
            const label = splitLabel(phase.label);

            return (
              <div key={phase.id} style={{ position: "absolute", inset: 0 }}>
                <div style={getLabelStyle(i, phases.length, x, above ? "top" : "bottom", labelWidth, selected)}>
                  {label.length === 1 ? (
                    label[0]
                  ) : (
                    <>
                      {label[0]}
                      <br />
                      {label[1]}
                    </>
                  )}
                </div>

                <button
                  type="button"
                  aria-label={`Select phase ${phase.label}`}
                  onClick={() => setSelectedId(phase.id)}
                  style={{
                    position: "absolute",
                    left: x - DOT_R,
                    top: TOP_ZONE + RAIL_ZONE / 2 - DOT_R + 1,
                    width: DOT_SIZE,
                    height: DOT_SIZE,
                    borderRadius: "50%",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    background: isYellow(phase.status) ? ACCENT : DOT_GRAY,
                    boxShadow: isYellow(phase.status)
                      ? `0 0 0 3px rgba(255, 201, 54, 0.16), 0 0 10px rgba(255, 201, 54, 0.55)`
                      : `0 0 8px rgba(255, 201, 54, 0.14)`,
                    zIndex: 3,
                  }}
                />

                {selected && (
                  <div
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      left: x,
                      top: TOP_ZONE + RAIL_ZONE / 2 + 1,
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      border: "2px solid rgba(255, 201, 54, 0.75)",
                      animation: "timeline-select 1.2s ease-out infinite",
                      pointerEvents: "none",
                      zIndex: 2,
                    }}
                  />
                )}

                {current && (
                  <div
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      left: x,
                      top: TOP_ZONE + RAIL_ZONE / 2 + 1,
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      border: "2px solid rgba(255, 201, 54, 0.6)",
                      animation: "timeline-pulse 1.7s ease-out infinite",
                      pointerEvents: "none",
                      zIndex: 1,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selectedPhase && (
        <div style={{ background: "#F9FAFB", borderRadius: 8, padding: "16px 20px" }}>
          <div style={{ ...JK, fontSize: 14, fontWeight: 800, color: TEXT_DARK, marginBottom: 2 }}>
            {selectedPhase.label}
          </div>
          <div style={{ ...JK, fontSize: 12, color: "#9CA3AF", marginBottom: selectedPhase.description ? 10 : 0 }}>
            {fmtPhaseDate(selectedPhase)}
          </div>
          {selectedPhase.description && (
            <p style={{ ...JK, fontSize: 13, color: "#374151", lineHeight: 1.65, margin: 0 }}>
              {selectedPhase.description}
            </p>
          )}
        </div>
      )}
    </PanelCard>
  );
}