"use client";
import React, { useState, useEffect, Fragment, memo } from "react";
import { PanelCard } from "./Panel";
import { JK, BB } from "../shared/tokens";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcCoarse(deadline: string) {
  const diff = Math.max(0, new Date(deadline).getTime() - Date.now());
  return {
    days:    Math.floor(diff / 86_400_000),
    hours:   Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
  };
}

function calcSeconds(deadline: string) {
  const diff = Math.max(0, new Date(deadline).getTime() - Date.now());
  return Math.floor((diff % 60_000) / 1_000);
}

function fmtDeadline(deadline: string) {
  const d = new Date(deadline);
  return (
    d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) +
    " at " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })
  );
}

// ─── SecondsDisplay ───────────────────────────────────────────────────────────
// Isolated into its own memo'd component so only this node re-renders every
// second. Days/hours/minutes tiles update only once per minute via the coarse
// state in the parent, so they never re-render during a seconds tick.
interface SecondsProps {
  deadline:    string;
  numFontSize: string;
  boxPadding:  string;
  boxMB:       string;
  labelSize:   string;
}

const SecondsDisplay = memo(function SecondsDisplay({
  deadline,
  numFontSize,
  boxPadding,
  boxMB,
  labelSize,
}: SecondsProps) {
  const [seconds, setSeconds] = useState(() => calcSeconds(deadline));

  useEffect(() => {
    const id = setInterval(() => setSeconds(calcSeconds(deadline)), 1000);
    return () => clearInterval(id);
  }, [deadline]);

  return (
    <div style={{ flex: 1, textAlign: "center", minWidth: 0 }}>
      <div style={{
        border:       "2px solid #0D26C2",
        borderRadius: 8,
        padding:      boxPadding,
        marginBottom: boxMB,
        background:   "#fff",
      }}>
        <div style={{
          ...BB,
          fontSize:           numFontSize,
          color:              "#0D26C2",
          lineHeight:         1,
          fontVariantNumeric: "tabular-nums",
        }}>
          {String(seconds).padStart(2, "0")}
        </div>
      </div>
      <div style={{ ...JK, fontSize: labelSize, fontWeight: 500, color: "#6B7280" }}>
        seconds
      </div>
    </div>
  );
});

// ─── CoarseUnit ───────────────────────────────────────────────────────────────
// Renders a single days/hours/minutes tile. Wrapped in memo so it bails out
// on every seconds tick — it only re-renders when its value prop changes.
interface CoarseUnitProps {
  label:      string;
  value:      number;
  numFontSize:string;
  boxPadding: string;
  boxMB:      string;
  labelSize:  string;
}

const CoarseUnit = memo(function CoarseUnit({
  label,
  value,
  numFontSize,
  boxPadding,
  boxMB,
  labelSize,
}: CoarseUnitProps) {
  return (
    <div style={{ flex: 1, textAlign: "center", minWidth: 0 }}>
      <div style={{
        border:       "2px solid #0D26C2",
        borderRadius: 8,
        padding:      boxPadding,
        marginBottom: boxMB,
        background:   "#fff",
      }}>
        <div style={{
          ...BB,
          fontSize:           numFontSize,
          color:              "#0D26C2",
          lineHeight:         1,
          fontVariantNumeric: "tabular-nums",
        }}>
          {String(value).padStart(2, "0")}
        </div>
      </div>
      <div style={{ ...JK, fontSize: labelSize, fontWeight: 500, color: "#6B7280" }}>
        {label}
      </div>
    </div>
  );
});

// ─── SquareDotSeparator ───────────────────────────────────────────────────────
const SquareDotSeparator = () => (
  <div style={{
    display:       "flex",
    flexDirection: "column",
    gap:           "clamp(4px, 1vw, 8px)",
    justifyContent:"center",
    paddingBottom: "clamp(14px, 4vw, 22px)",
  }}>
    <div style={{ width: "clamp(4px, 1vw, 6px)", height: "clamp(4px, 1vw, 6px)", background: "#0D26C2", flexShrink: 0 }} />
    <div style={{ width: "clamp(4px, 1vw, 6px)", height: "clamp(4px, 1vw, 6px)", background: "#0D26C2", flexShrink: 0 }} />
  </div>
);

// ─── CountdownPanel ───────────────────────────────────────────────────────────
interface Props {
  deadline:         string;
  /** When provided, the panel title becomes a link to the registration form. */
  registrationUrl?: string | null;
  isMobile?:        boolean;
}

export default function CountdownPanel({ deadline, registrationUrl, isMobile = false }: Props) {
  // Coarse state: updates once per minute — drives days/hours/minutes tiles.
  // SecondsDisplay manages its own fine state independently.
  const [coarse, setCoarse] = useState(() => calcCoarse(deadline));

  useEffect(() => {
    const id = setInterval(() => setCoarse(calcCoarse(deadline)), 60_000);
    return () => clearInterval(id);
  }, [deadline]);

  const numFontSize = "clamp(42px, 11vw, 56px)";
  const boxPadding  = "clamp(8px, 2vw, 16px) clamp(4px, 1.5vw, 10px)";
  const boxGap      = "clamp(4px, 1.5vw, 12px)";
  const boxMB       = "clamp(4px, 1vw, 8px)";
  const labelSize   = "clamp(9px, 2vw, 12px)";
  const headerMB    = isMobile ? 2 : 4;
  const subtitleMB  = isMobile ? 16 : 24;

  const coarseUnits = [
    { label: "days",    value: coarse.days    },
    { label: "hours",   value: coarse.hours   },
    { label: "minutes", value: coarse.minutes },
  ];

  const titleContent = (
    <div style={{ ...JK, fontSize: "14px", fontWeight: 800, color: "#06125C" }}>
      Register Countdown
    </div>
  );

  return (
    <PanelCard>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: headerMB }}>
        {registrationUrl ? (
          <a href={registrationUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
            {titleContent}
          </a>
        ) : titleContent}
        <span style={{ ...JK, fontSize: 12, fontWeight: 700, color: "#9CA3AF" }}>Why Wait?</span>
      </div>

      <div style={{ ...JK, fontSize: "12px", fontWeight: 500, color: "#6B7280", marginBottom: subtitleMB }}>
        Regist until {fmtDeadline(deadline)}
      </div>

      <div style={{ display: "flex", gap: boxGap, alignItems: "center" }}>
        {coarseUnits.map((u, i) => (
          <Fragment key={u.label}>
            <CoarseUnit
              label={u.label}
              value={u.value}
              numFontSize={numFontSize}
              boxPadding={boxPadding}
              boxMB={boxMB}
              labelSize={labelSize}
            />
            <SquareDotSeparator />
          </Fragment>
        ))}

        {/* SecondsDisplay manages its own 1s interval in isolation.
            Changing the second does NOT cause days/hours/minutes to re-render. */}
        <SecondsDisplay
          deadline={deadline}
          numFontSize={numFontSize}
          boxPadding={boxPadding}
          boxMB={boxMB}
          labelSize={labelSize}
        />
      </div>
    </PanelCard>
  );
}