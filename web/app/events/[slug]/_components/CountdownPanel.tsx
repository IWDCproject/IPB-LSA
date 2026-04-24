"use client";
import { useState, useEffect, Fragment } from "react";
import { PanelCard } from "./Panel";

const JK = { fontFamily: "'Plus Jakarta Sans', sans-serif" } as const;
const BB = { fontFamily: "'Bebas Neue', sans-serif" } as const;

function calcRemaining(deadline: string) {
  const diff = Math.max(0, new Date(deadline).getTime() - Date.now());
  return {
    days:    Math.floor(diff / 86_400_000),
    hours:   Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1_000),
  };
}

function fmtDeadline(deadline: string) {
  const d = new Date(deadline);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) + " at " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export default function CountdownPanel({ deadline, registrationUrl, isMobile = false }: { deadline: string; registrationUrl?: string | null; isMobile?: boolean }) {
  const [remaining, setRemaining] = useState(() => calcRemaining(deadline));

  useEffect(() => {
    const id = setInterval(() => setRemaining(calcRemaining(deadline)), 1000);
    return () => clearInterval(id);
  }, [deadline]);

  const units = [
    { label: "days",    value: remaining.days },
    { label: "hours",   value: remaining.hours },
    { label: "minutes", value: remaining.minutes },
    { label: "seconds", value: remaining.seconds },
  ];

  // Fluid sizing via clamp() — scales smoothly from 320px → desktop
  // No isMobile branching needed for proportions
  const numFontSize   = "clamp(42px, 11vw, 56px)";
  const boxPadding    = "clamp(8px, 2vw, 16px) clamp(4px, 1.5vw, 10px)";
  const boxGap        = "clamp(4px, 1.5vw, 12px)";
  const boxMB         = "clamp(4px, 1vw, 8px)";
  const labelFontSize = "clamp(9px, 2vw, 12px)";
  const headerMB      = isMobile ? 2 : 4;
  const subtitleMB    = isMobile ? 16 : 24;

  const SquareDotSeparator = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "clamp(4px, 1vw, 8px)", justifyContent: "center", paddingBottom: "clamp(14px, 4vw, 22px)" }}>
      <div style={{ width: "clamp(4px, 1vw, 6px)", height: "clamp(4px, 1vw, 6px)", background: "#0D26C2", flexShrink: 0 }} />
      <div style={{ width: "clamp(4px, 1vw, 6px)", height: "clamp(4px, 1vw, 6px)", background: "#0D26C2", flexShrink: 0 }} />
    </div>
  );

  return (
    <PanelCard>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: headerMB }}>
        <div style={{ ...JK, fontSize: "14px", fontWeight: 800, color: "#06125C" }}>
          Register Countdown
        </div>
        <span style={{ ...JK, fontSize: 12, fontWeight: 700, color: "#9CA3AF" }}>Why Wait?</span>
      </div>

      <div style={{ ...JK, fontSize: "12px", fontWeight: 500, color: "#6B7280", marginBottom: subtitleMB }}>
        Regist until {fmtDeadline(deadline)}
      </div>

      <div style={{ display: "flex", gap: boxGap, alignItems: "center" }}>
        {units.map((u, i) => (
          <Fragment key={u.label}>
            <div style={{ flex: 1, textAlign: "center", minWidth: 0 }}>
              <div style={{ border: "2px solid #0D26C2", borderRadius: 8, padding: boxPadding, marginBottom: boxMB, background: "#fff" }}>
                <div style={{
                  ...BB,
                  fontSize: numFontSize,
                  color: "#0D26C2",
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                }} suppressHydrationWarning>
                  {String(u.value).padStart(2, "0")}
                </div>
              </div>
              <div style={{ ...JK, fontSize: labelFontSize, fontWeight: 500, color: "#6B7280" }}>{u.label}</div>
            </div>
            {i < units.length - 1 && <SquareDotSeparator />}
          </Fragment>
        ))}
      </div>
    </PanelCard>
  );
}