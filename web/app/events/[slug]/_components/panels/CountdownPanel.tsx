"use client";
import React, { useState, useEffect, Fragment, memo } from "react";
import { PanelCard } from "./Panel";

// --- Helpers ------------------------------------------------------------------

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

// --- SecondsDisplay -----------------------------------------------------------
// Isolated into its own memo'd component so only this node re-renders every
// second. Days/hours/minutes tiles update only once per minute via the coarse
// state in the parent.
interface SecondsProps {
  deadline: string;
}

const SecondsDisplay = memo(function SecondsDisplay({ deadline }: SecondsProps) {
  const [seconds, setSeconds] = useState(() => calcSeconds(deadline));

  useEffect(() => {
    const id = setInterval(() => setSeconds(calcSeconds(deadline)), 1000);
    return () => clearInterval(id);
  }, [deadline]);

  return (
    <div className="flex-1 text-center min-w-0">
      {/* clamp() font-size can't be expressed as a static Tailwind class */}
      <div
        className="border-2 border-[#0D26C2] rounded-lg bg-white"
        style={{ padding: "clamp(8px,2vw,16px) clamp(4px,1.5vw,10px)", marginBottom: "clamp(4px,1vw,8px)" }}
      >
        <div
          className="font-bebas text-[#0D26C2] leading-none tabular-nums"
          style={{ fontSize: "clamp(42px,11vw,56px)" }}
        >
          {String(seconds).padStart(2, "0")}
        </div>
      </div>
      <div
        className="font-jakarta font-medium text-gray-500"
        style={{ fontSize: "clamp(9px,2vw,12px)" }}
      >
        seconds
      </div>
    </div>
  );
});

// --- CoarseUnit ---------------------------------------------------------------
interface CoarseUnitProps {
  label: string;
  value: number;
}

const CoarseUnit = memo(function CoarseUnit({ label, value }: CoarseUnitProps) {
  return (
    <div className="flex-1 text-center min-w-0">
      <div
        className="border-2 border-[#0D26C2] rounded-lg bg-white"
        style={{ padding: "clamp(8px,2vw,16px) clamp(4px,1.5vw,10px)", marginBottom: "clamp(4px,1vw,8px)" }}
      >
        <div
          className="font-bebas text-[#0D26C2] leading-none tabular-nums"
          style={{ fontSize: "clamp(42px,11vw,56px)" }}
        >
          {String(value).padStart(2, "0")}
        </div>
      </div>
      <div
        className="font-jakarta font-medium text-gray-500"
        style={{ fontSize: "clamp(9px,2vw,12px)" }}
      >
        {label}
      </div>
    </div>
  );
});

// --- SquareDotSeparator -------------------------------------------------------
const SquareDotSeparator = () => (
  <div
    className="flex flex-col justify-center"
    style={{
      gap:          "clamp(4px,1vw,8px)",
      paddingBottom:"clamp(14px,4vw,22px)",
    }}
  >
    <div
      className="bg-[#0D26C2] shrink-0"
      style={{ width: "clamp(4px,1vw,6px)", height: "clamp(4px,1vw,6px)" }}
    />
    <div
      className="bg-[#0D26C2] shrink-0"
      style={{ width: "clamp(4px,1vw,6px)", height: "clamp(4px,1vw,6px)" }}
    />
  </div>
);

// --- CountdownPanel -----------------------------------------------------------
interface Props {
  deadline:          string;
  registrationUrl?:  string | null;
  isMobile?:         boolean;
}

export default function CountdownPanel({ deadline, registrationUrl, isMobile = false }: Props) {
  const [coarse, setCoarse] = useState(() => calcCoarse(deadline));

  useEffect(() => {
    const id = setInterval(() => setCoarse(calcCoarse(deadline)), 60_000);
    return () => clearInterval(id);
  }, [deadline]);

  const coarseUnits = [
    { label: "days",    value: coarse.days    },
    { label: "hours",   value: coarse.hours   },
    { label: "minutes", value: coarse.minutes },
  ];

  const titleContent = (
    <div className="font-jakarta text-sm font-extrabold text-navy">
      Register Countdown
    </div>
  );

  return (
    <PanelCard>
      <div className={`flex justify-between items-baseline ${isMobile ? "mb-0.5" : "mb-1"}`}>
        {registrationUrl ? (
          <a href={registrationUrl} target="_blank" rel="noopener noreferrer" className="no-underline">
            {titleContent}
          </a>
        ) : titleContent}
        <span className="font-jakarta text-xs font-bold text-gray-400">Why Wait?</span>
      </div>

      <div className={`font-jakarta text-xs font-medium text-gray-500 ${isMobile ? "mb-4" : "mb-6"}`}>
        Regist until {fmtDeadline(deadline)}
      </div>

      <div
        className="flex items-center"
        style={{ gap: "clamp(4px,1.5vw,12px)" }}
      >
        {coarseUnits.map((u, i) => (
          <Fragment key={u.label}>
            <CoarseUnit label={u.label} value={u.value} />
            <SquareDotSeparator />
          </Fragment>
        ))}
        <SecondsDisplay deadline={deadline} />
      </div>
    </PanelCard>
  );
}