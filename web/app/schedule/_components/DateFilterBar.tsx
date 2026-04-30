"use client";

// Renders the four date filter pills:
//   [Today]  [This Week]  [This Month]  [Pick range +]
//
// When a range is applied, [Pick range +] collapses to "19 Apr – 30 Apr ×".
// Clicking the label re-opens the picker with previous values.
// Clicking × clears to null.

import { useState, useRef, useEffect } from "react";
import { CalendarRange, X } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { DateRangePicker } from "./DateRangePicker";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- DateFilter type (also exported for parent to use) ----------------------

export type DatePreset = "today" | "week" | "month";
export type DateFilter = DatePreset | { start: Date; end: Date } | null;

export function isRangeFilter(v: DateFilter): v is { start: Date; end: Date } {
  return typeof v === "object" && v !== null && "start" in v;
}

// --- Helpers ----------------------------------------------------------------

function fmtRangeLabel(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `${start.toLocaleDateString("en-GB", opts)} – ${end.toLocaleDateString("en-GB", opts)}`;
}

// --- Component --------------------------------------------------------------

interface DateFilterBarProps {
  value:    DateFilter;
  onChange: (v: DateFilter) => void;
}

const PRESETS: { id: DatePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week",  label: "This Week" },
  { id: "month", label: "This Month" },
];

// h-9 matches ScheduleToolbar tab height (h-9 inside p-1 container)
const pillBase   = "h-11 px-5 rounded-lg text-sm font-bold whitespace-nowrap transition-all border";
const pillActive = "bg-yellow-400 text-black border-yellow-400 shadow-md";
const pillIdle   = "bg-[#11194C] text-white border-blue-800/40 hover:bg-[#1A266B]";

export function DateFilterBar({ value, onChange }: DateFilterBarProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isRange      = isRangeFilter(value);
  const activePreset = typeof value === "string" ? value : null;

  // Close picker on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  function handlePresetClick(id: DatePreset) {
    onChange(activePreset === id ? null : id);
  }

  function handleApply(start: Date, end: Date) {
    onChange({ start, end });
    setPickerOpen(false);
  }

  function clearRange(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(null);
    setPickerOpen(false);
  }

  return (
    <div className="flex items-center gap-1 shrink-0">

      {/* Preset pills */}
      {PRESETS.map(p => (
        <button
          key={p.id}
          onClick={() => handlePresetClick(p.id)}
          className={cn(pillBase, activePreset === p.id ? pillActive : pillIdle)}
        >
          {p.label}
        </button>
      ))}

      {/* Range picker pill + dropdown */}
      <div className="relative" ref={containerRef}>

        {isRange ? (
          // Collapsed applied-range pill
          <div className={cn(pillBase, pillActive, "flex items-center gap-2 pr-3")}>
            <button
              onClick={() => setPickerOpen(open => !open)}
              className="flex items-center gap-1.5"
            >
              <CalendarRange size={14} />
              <span>{fmtRangeLabel(value.start, value.end)}</span>
            </button>
            <button
              onClick={clearRange}
              className="ml-0.5 hover:opacity-70 transition-opacity"
              aria-label="Clear date range"
            >
              <X size={13} />
            </button>
          </div>
        ) : (
          // "Pick range" button
          <button
            onClick={() => setPickerOpen(open => !open)}
            className={cn(pillBase, pickerOpen ? pillActive : pillIdle, "flex items-center gap-2")}
          >
            <CalendarRange size={14} />
            Pick range
          </button>
        )}

        {/* Dropdown calendar — anchors to the right edge on larger screens */}
        {pickerOpen && (
          <div className="absolute right-0 top-full mt-2 z-50">
            <DateRangePicker
              initialStart={isRange ? value.start : null}
              initialEnd={isRange ? value.end   : null}
              onApply={handleApply}
              onClose={() => setPickerOpen(false)}
            />
          </div>
        )}

      </div>

    </div>
  );
}