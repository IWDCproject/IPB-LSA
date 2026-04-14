"use client";
import { useState, useEffect } from "react";
import { PanelCard, PanelTitle } from "./Panel";

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
  return new Date(deadline).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
}

export default function CountdownPanel({ deadline, registrationUrl }: { deadline: string; registrationUrl?: string | null }) {
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

  return (
    <PanelCard>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <PanelTitle>Register Countdown</PanelTitle>
        {registrationUrl && (
          <a href={registrationUrl} target="_blank" rel="noopener noreferrer" style={{ ...JK, fontSize: 12, fontWeight: 600, color: "#0D26C2", textDecoration: "none", flexShrink: 0 }}>
            Why Wait? →
          </a>
        )}
      </div>
      <div style={{ ...JK, fontSize: 12, color: "#9CA3AF", marginBottom: 18 }}>
        Register until {fmtDeadline(deadline)}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {units.map((u) => (
          <div key={u.label} style={{ flex: 1, textAlign: "center", border: "2px solid #E5E7EB", borderRadius: 8, padding: "12px 6px" }}>
            <div style={{ ...BB, fontSize: 34, color: "#06125C", lineHeight: 1 }} suppressHydrationWarning>
              {String(u.value).padStart(2, "0")}
            </div>
            <div style={{ ...JK, fontSize: 9, fontWeight: 700, color: "#9CA3AF", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {u.label}
            </div>
          </div>
        ))}
      </div>
    </PanelCard>
  );
}