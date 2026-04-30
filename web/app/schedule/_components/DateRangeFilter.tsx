"use client";

// Self-contained calendar popup.
// Owns its own internal UI state: which field is active, current month view.
// Calls onApply(start, end) when the user confirms. onClose for outside-click handling.

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DateRangePickerProps {
  initialStart?: Date | null;
  initialEnd?:   Date | null;
  onApply:       (start: Date, end: Date) => void;
  onClose:       () => void;
}

const DAY_LABELS   = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES  = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
  );
}

function fmtField(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

type ActiveField = "start" | "end";

export function DateRangePicker({ initialStart, initialEnd, onApply, onClose }: DateRangePickerProps) {
  const today = new Date();

  const [viewMonth, setViewMonth] = useState<Date>(initialStart ?? today);
  const [start,     setStart]     = useState<Date | null>(initialStart ?? null);
  const [end,       setEnd]       = useState<Date | null>(initialEnd   ?? null);
  const [active,    setActive]    = useState<ActiveField>("start");

  // Calendar layout helpers
  const firstWeekday = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1).getDay();
  const totalDays    = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();

  const prevMonth = () =>
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
  const nextMonth = () =>
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1));

  function handleDayClick(day: number) {
    const clicked = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);

    if (active === "start") {
      setStart(clicked);
      setEnd(null);
      setActive("end");
    } else {
      // If user clicked before the start, reset to a new start
      if (start && clicked < start) {
        setStart(clicked);
        setEnd(null);
        setActive("end");
      } else {
        setEnd(clicked);
      }
    }
  }

  function getDayState(day: number): "start" | "end" | "in-range" | "default" {
    const d = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
    if (start && isSameDay(d, start)) return "start";
    if (end   && isSameDay(d, end))   return "end";
    if (start && end && d > start && d < end) return "in-range";
    return "default";
  }

  const canApply = !!start && !!end;

  return (
    <div className="bg-[#11194C] border border-blue-700/50 rounded-2xl shadow-2xl p-5 w-[320px]">

      {/* Start / End field pills */}
      <div className="flex gap-3 mb-5">
        {(["start", "end"] as ActiveField[]).map(field => {
          const isActive = active === field;
          const value    = field === "start" ? start : end;
          return (
            <button
              key={field}
              onClick={() => setActive(field)}
              className={`flex-1 text-left px-3 py-2 rounded-xl border text-sm font-bold transition-all ${
                isActive
                  ? "border-yellow-400 bg-yellow-400/10 text-yellow-300"
                  : "border-blue-700/40 bg-[#0D1A4A] text-white/70 hover:border-blue-500"
              }`}
            >
              <div className="text-[10px] font-semibold uppercase tracking-wider opacity-60 mb-0.5">
                {field === "start" ? "Start" : "End"}
              </div>
              {fmtField(value)}
            </button>
          );
        })}
      </div>

      {/* Month navigation header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-1.5 rounded-lg text-blue-300 hover:text-white hover:bg-blue-800/50 transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-white font-bold text-sm">
          {MONTH_NAMES[viewMonth.getMonth()]} {viewMonth.getFullYear()}
        </span>
        <button
          onClick={nextMonth}
          className="p-1.5 rounded-lg text-blue-300 hover:text-white hover:bg-blue-800/50 transition-colors"
          aria-label="Next month"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Day-of-week labels */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-blue-400 uppercase py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {/* Offset blank cells so day 1 falls on the right weekday */}
        {Array.from({ length: firstWeekday }, (_, i) => (
          <div key={`blank-${i}`} />
        ))}

        {Array.from({ length: totalDays }, (_, i) => {
          const day   = i + 1;
          const state = getDayState(day);

          return (
            <button
              key={day}
              onClick={() => handleDayClick(day)}
              className={[
                "h-9 w-full text-sm font-bold transition-all",
                state === "start" || state === "end"
                  ? "bg-yellow-400 text-black rounded-lg"
                  : state === "in-range"
                  ? "bg-yellow-400/20 text-yellow-200 rounded-none"
                  : "text-white hover:bg-blue-700/50 rounded-lg",
              ].join(" ")}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Apply */}
      <button
        disabled={!canApply}
        onClick={() => canApply && onApply(start!, end!)}
        className={`mt-5 w-full py-2.5 rounded-xl font-bold text-sm transition-all ${
          canApply
            ? "bg-yellow-400 text-black hover:bg-yellow-300"
            : "bg-blue-900/50 text-blue-600 cursor-not-allowed"
        }`}
      >
        Apply
      </button>

    </div>
  );
}