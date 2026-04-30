"use client";

// Root client shell for /schedule.
// Owns all state and derived data. Passes only what each child needs.
//
// Sub-components live in ./_components/:
//   ScheduleHero    — title + mascots
//   ScheduleToolbar — category tabs + search
//   DateFilterBar   — Today / This Week / This Month / Pick range
//   EventGroup      — accordion per event (owns its own isOpen)
//   MatchGrid       — staggered grid of MobileMatchRow (inside EventGroup)

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { ScheduleHero }                      from "./_components/ScheduleHero";
import { ScheduleToolbar, type CategoryTab } from "./_components/ScheduleToolbar";
import { DateFilterBar, type DateFilter, isRangeFilter } from "./_components/DateFilterBar";
import { EventGroup }                        from "./_components/EventGroup";

// ---------------------------------------------------------------------------
// Date filter logic
// ---------------------------------------------------------------------------

function getThisWeekBounds(now: Date) {
  const dayOfWeek = now.getDay(); // 0 = Sunday
  const monday    = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7)); // shift back to Monday
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

function matchesDateFilter(scheduledAt: string | null, filter: DateFilter): boolean {
  if (!scheduledAt) return true; // no date on match — don't hide it
  if (filter === null) return true;

  const date = new Date(scheduledAt);
  const now  = new Date();

  if (filter === "today") {
    return date.toDateString() === now.toDateString();
  }

  if (filter === "week") {
    const { start, end } = getThisWeekBounds(now);
    return date >= start && date <= end;
  }

  if (filter === "month") {
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth()    === now.getMonth()
    );
  }

  if (isRangeFilter(filter)) {
    const rangeStart = new Date(filter.start); rangeStart.setHours(0, 0, 0, 0);
    const rangeEnd   = new Date(filter.end);   rangeEnd.setHours(23, 59, 59, 999);
    return date >= rangeStart && date <= rangeEnd;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

export default function SchedulePageClient({ initialMatches }: { initialMatches: any[] }) {
  const [activeTab,   setActiveTab]   = useState<CategoryTab>("ALL");
  const [dateFilter,  setDateFilter]  = useState<DateFilter>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // --- Filtered matches -------------------------------------------------------
  const filteredMatches = useMemo(() => {
    let result = initialMatches;

    // 1. Category tab
    if (activeTab !== "ALL") {
      result = result.filter(
        m => m.competition_category?.event_id?.type?.toLowerCase() === activeTab.toLowerCase()
      );
    }

    // 2. Date filter
    if (dateFilter !== null) {
      result = result.filter(m => matchesDateFilter(m.scheduled_at, dateFilter));
    }

    // 3. Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(m =>
        [
          m.match_name,
          m.competition_category?.name,
          m.venue,
          m.home_participant?.name,
          m.away_participant?.name,
          m.competition_category?.event_id?.name,
        ].some(v => v?.toLowerCase().includes(q))
      );
    }

    return result;
  }, [initialMatches, activeTab, dateFilter, searchQuery]);

  // --- Grouped by event -------------------------------------------------------
  const groupedByEvent = useMemo(() => {
    const groups: Record<string, { eventName: string; cardImage: string | null; matches: any[] }> = {};

    filteredMatches.forEach(m => {
      const name  = m.competition_category?.event_id?.name ?? "Other Events";
      const image = m.competition_category?.event_id?.card_image ?? null;
      if (!groups[name]) groups[name] = { eventName: name, cardImage: image, matches: [] };
      groups[name].matches.push(m);
    });

    return groups;
  }, [filteredMatches]);

  // Stable key that changes on every filter change — passed to EventGroup so
  // MatchGrid remounts and the stagger animation replays from scratch.
  const gridKey = `${activeTab}|${JSON.stringify(dateFilter)}|${searchQuery}`;

  function resetFilters() {
    setSearchQuery("");
    setActiveTab("ALL");
    setDateFilter(null);
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#0D26C2] from-30% to-[#06125C] font-sans selection:bg-yellow-500 selection:text-blue-900 relative overflow-x-hidden">

      {/* Batik — fixed to top of viewport, stays put while page scrolls */}
      <div
        className="fixed top-0 left-0 right-0 pointer-events-none z-0"
        style={{
          height:             "600px",
          backgroundImage:    "url(/Batik_Pattern_dark.svg)",
          backgroundSize:     "1400px auto",
          backgroundPosition: "top center",
          backgroundRepeat:   "repeat-x",
          opacity:            0.4,
          WebkitMaskImage:    "linear-gradient(to bottom, black 40%, transparent 100%)",
          maskImage:          "linear-gradient(to bottom, black 40%, transparent 100%)",
        }}
      />

      {/* Main content — scrolls over the fixed batik */}
      <div
        className="relative z-10"
        style={{ padding: "24px clamp(20px, 8.33vw, 160px) 60px" }}
      >

        {/* Hero: mascots + title */}
        <ScheduleHero />

        {/* Toolbar: two rows on mobile, one row on desktop */}
        <div className="flex flex-col gap-4 mb-10">
          <ScheduleToolbar
            activeTab={activeTab}
            searchQuery={searchQuery}
            onTabChange={setActiveTab}
            onSearchChange={setSearchQuery}
          />
          <DateFilterBar value={dateFilter} onChange={setDateFilter} />
        </div>

        {/* Event accordion list */}
        <div className="flex flex-col gap-6">
          {Object.keys(groupedByEvent).length > 0 ? (
            Object.values(groupedByEvent).map(({ eventName, cardImage, matches }) => (
              <EventGroup
                key={eventName}
                eventName={eventName}
                cardImage={cardImage}
                matches={matches}
                gridKey={gridKey}
              />
            ))
          ) : (
            <EmptyState onReset={resetFilters} />
          )}
        </div>

      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state — shown when no matches pass the filters
// ---------------------------------------------------------------------------

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="py-32 text-center bg-[#091340]/40 rounded-3xl border border-blue-800/30 backdrop-blur-md flex flex-col items-center justify-center shadow-xl">
      <div className="w-20 h-20 bg-blue-900/50 rounded-full flex items-center justify-center mb-6 shadow-inner border border-blue-700/50">
        <Search className="text-blue-400" size={32} />
      </div>
      <h3 className="text-2xl font-bold text-white uppercase tracking-widest mb-2">
        Tidak ada pertandingan
      </h3>
      <p className="text-blue-300 text-sm max-w-md mx-auto">
        Kami tidak dapat menemukan pertandingan yang sesuai dengan filter atau pencarian Anda.
        Coba ubah tanggal, kategori, atau kata kunci pencarian.
      </p>
      <button
        onClick={onReset}
        className="mt-6 px-6 py-2 bg-yellow-400 text-black font-bold rounded-full hover:bg-yellow-300 transition-colors"
      >
        Reset Filter
      </button>
    </div>
  );
}