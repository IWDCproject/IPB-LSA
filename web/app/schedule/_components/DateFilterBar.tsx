"use client";

import { useState, useRef, useEffect } from "react";
import { CalendarRange, X } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { DateRangePicker } from "./DateRangePicker";

// --- Konstanta ----------------------------------------------------------------

const PRESETS: { id: DatePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week",  label: "This Week" },
  { id: "month", label: "This Month" },
];

const pillBase   = "h-11 px-5 rounded-lg text-sm font-bold whitespace-nowrap transition-all border";
const pillActive = "bg-yellow-400 text-black border-yellow-400 shadow-md";
const pillIdle   = "bg-[#11194C] text-white border-blue-800/40 hover:bg-[#1A266B]";

// --- Types --------------------------------------------------------------------

export type DatePreset = "today" | "week" | "month";
export type DateFilter = DatePreset | { start: Date; end: Date } | null;

export function isRangeFilter(v: DateFilter): v is { start: Date; end: Date } {
  return typeof v === "object" && v !== null && "start" in v;
}

// --- Helpers ------------------------------------------------------------------

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function fmtRangeLabel(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `${start.toLocaleDateString("en-GB", opts)} – ${end.toLocaleDateString("en-GB", opts)}`;
}

// --- Komponen -----------------------------------------------------------------

interface DateFilterBarProps {
  value:    DateFilter;
  onChange: (v: DateFilter) => void;
}

export function DateFilterBar({ value, onChange }: DateFilterBarProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isRange      = isRangeFilter(value);
  const activePreset = typeof value === "string" ? value : null;

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

      {PRESETS.map(p => (
        <button
          key={p.id}
          onClick={() => handlePresetClick(p.id)}
          className={cn(pillBase, activePreset === p.id ? pillActive : pillIdle)}
        >
          {p.label}
        </button>
      ))}

      <div className="relative" ref={containerRef}>
        {isRange ? (
          <div className={cn(pillBase, pillActive, "flex items-center gap-2 pr-3")}>
            <button onClick={() => setPickerOpen(open => !open)} className="flex items-center gap-1.5">
              <CalendarRange size={14} />
              <span>{fmtRangeLabel(value.start, value.end)}</span>
            </button>
            <button onClick={clearRange} className="ml-0.5 hover:opacity-70 transition-opacity" aria-label="Clear date range">
              <X size={13} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setPickerOpen(open => !open)}
            className={cn(pillBase, pickerOpen ? pillActive : pillIdle, "flex items-center gap-2")}
          >
            <CalendarRange size={14} />
            Pick range
          </button>
        )}

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