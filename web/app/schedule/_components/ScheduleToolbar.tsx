// Purely presentational — receives state & handlers from the parent.
// Renders: [ALL] [SPORTS] [ARTS]   [Search input]

import { Search } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type CategoryTab = "ALL" | "sport" | "arts";

interface ScheduleToolbarProps {
  activeTab:      CategoryTab;
  searchQuery:    string;
  onTabChange:    (tab: CategoryTab) => void;
  onSearchChange: (query: string) => void;
}

const TABS: { id: CategoryTab; label: string }[] = [
  { id: "ALL",   label: "ALL" },
  { id: "sport", label: "SPORTS" },
  { id: "arts",  label: "ARTS" },
];

export function ScheduleToolbar({ activeTab, searchQuery, onTabChange, onSearchChange }: ScheduleToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 w-full">

      {/* Category pill tabs */}
      <div className="flex bg-[#11194C] p-1.5 rounded-full shadow-lg w-full sm:w-auto shrink-0 border border-blue-800/40">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex-1 sm:flex-none px-6 py-2.5 text-xs md:text-sm font-bold uppercase transition-all rounded-full whitespace-nowrap",
              activeTab === tab.id
                ? "bg-yellow-400 text-black shadow-md"
                : "text-white hover:text-yellow-200 hover:bg-white/5"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search input */}
      <div className="relative w-full sm:w-64 lg:w-72 shrink-0 group">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300 group-focus-within:text-yellow-400 transition-colors"
          size={18}
        />
        <input
          type="text"
          placeholder="Cari tim, kategori, venue..."
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          className="w-full bg-[#11194C] border border-blue-800/40 text-white rounded-full pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-all placeholder:text-blue-300 shadow-lg"
        />
      </div>

    </div>
  );
}