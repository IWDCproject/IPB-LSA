// Purely presentational — category tab pills only.
// Search has moved into the parent row so it can flex-grow between tabs and date filters.

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type CategoryTab = "ALL" | "sport" | "arts";

interface ScheduleToolbarProps {
  activeTab:   CategoryTab;
  onTabChange: (tab: CategoryTab) => void;
}

const TABS: { id: CategoryTab; label: string }[] = [
  { id: "ALL",   label: "ALL" },
  { id: "sport", label: "SPORTS" },
  { id: "arts",  label: "ARTS" },
];

export function ScheduleToolbar({ activeTab, onTabChange }: ScheduleToolbarProps) {
  return (
    <div className="flex bg-[#11194C] p-1 rounded-lg shadow-lg shrink-0 border border-blue-800/40">
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "h-9 px-5 text-sm font-bold uppercase transition-all rounded-md whitespace-nowrap",
            activeTab === tab.id
              ? "bg-yellow-400 text-black shadow-md"
              : "text-white hover:text-yellow-200 hover:bg-white/5"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}