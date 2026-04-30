"use client";

import {
  useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo,
} from "react";
import { Search } from "lucide-react";
import { useDebounce }                       from "@/hooks/useDebounce";
import { useScheduleMatchState }             from "../../hooks/useScheduleMatchState";
import { ScheduleHero }                      from "./_components/ScheduleHero";
import { ScheduleToolbar, type CategoryTab } from "./_components/ScheduleToolbar";
import { DateFilterBar, type DateFilter, isRangeFilter } from "./_components/DateFilterBar";
import { EventGroup }                        from "./_components/EventGroup";
import type { ScheduleMatchFilter }          from "@/lib/directus";
import Footer from "@/components/Footer";
import UniversityMarquee from "@/components/UniversityMarquee";

// --- Konstanta ----------------------------------------------------------------

const EVENTS_PER_PAGE        = 6;
const SKELETON_SHOW_DELAY_MS = 200;
const SKELETON_MIN_DISP_MS   = 200;

// --- Types --------------------------------------------------------------------

interface EventGroupData {
  eventName: string;
  cardImage: string | null;
  matches:   any[];
  // -1 = ada live, 0 = hari ini, 1 = upcoming, 2 = sudah lewat
  priority:  -1 | 0 | 1 | 2;
  sortDate:  number;
}

// --- Helpers ------------------------------------------------------------------

function buildEventGroups(matches: any[]): EventGroupData[] {
  const map: Record<string, EventGroupData> = {};
  const todayStr = new Date().toDateString();

  for (const m of matches) {
    const name  = m.competition_category?.event_id?.name      ?? "Other Events";
    const image = m.competition_category?.event_id?.card_image ?? null;
    if (!map[name]) {
      map[name] = { eventName: name, cardImage: image, matches: [], priority: 2, sortDate: 0 };
    }
    map[name].matches.push(m);
  }

  const now = Date.now();

  for (const g of Object.values(map)) {
    let hasLive     = false;
    let hasToday    = false;
    let nearestUp   = Infinity;
    let mostRecPast = -Infinity;

    for (const m of g.matches) {
      if (m.status === "live") hasLive = true;
      if (!m.scheduled_at) continue;
      const t = new Date(m.scheduled_at).getTime();
      if (new Date(m.scheduled_at).toDateString() === todayStr) hasToday = true;
      if (t >= now && t < nearestUp)   nearestUp   = t;
      if (t <  now && t > mostRecPast) mostRecPast = t;
    }

    if (hasLive)                     { g.priority = -1; g.sortDate = now; }
    else if (hasToday)               { g.priority =  0; g.sortDate = now; }
    else if (nearestUp !== Infinity) { g.priority =  1; g.sortDate = nearestUp; }
    else { g.priority = 2; g.sortDate = mostRecPast === -Infinity ? 0 : mostRecPast; }
  }

  return Object.values(map).sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    // sudah lewat: paling baru duluan; lainnya: paling dekat duluan
    return a.priority === 2 ? b.sortDate - a.sortDate : a.sortDate - b.sortDate;
  });
}

function dateFilterToRange(f: DateFilter): { dateFrom: string | null; dateTo: string | null } {
  if (!f) return { dateFrom: null, dateTo: null };
  const now = new Date();

  if (f === "today") {
    const s = new Date(now); s.setHours(0,  0,  0,   0);
    const e = new Date(now); e.setHours(23, 59, 59, 999);
    return { dateFrom: s.toISOString(), dateTo: e.toISOString() };
  }
  if (f === "week") {
    const dow = now.getDay();
    const mon = new Date(now); mon.setDate(now.getDate() - ((dow + 6) % 7)); mon.setHours(0,  0,  0,   0);
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);               sun.setHours(23, 59, 59, 999);
    return { dateFrom: mon.toISOString(), dateTo: sun.toISOString() };
  }
  if (f === "month") {
    const s = new Date(now.getFullYear(), now.getMonth(), 1);
    const e = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { dateFrom: s.toISOString(), dateTo: e.toISOString() };
  }
  if (isRangeFilter(f)) {
    const s = new Date(f.start); s.setHours(0,  0,  0,   0);
    const e = new Date(f.end);   e.setHours(23, 59, 59, 999);
    return { dateFrom: s.toISOString(), dateTo: e.toISOString() };
  }
  return { dateFrom: null, dateTo: null };
}

// --- Komponen kecil -----------------------------------------------------------

function SkeletonEventCard({ index }: { index: number }) {
  return (
    <div
      className="h-20 rounded-2xl bg-[#11194C]/80 border border-blue-800/30 animate-pulse"
      style={{ animationDelay: `${index * 60}ms` }}
    />
  );
}

function Pagination({
  page, totalPages, onPageChange,
}: { page: number; totalPages: number; onPageChange: (p: number) => void }) {
  if (totalPages <= 1) return null;

  const pageNumbers: (number | "…")[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1)) {
      pageNumbers.push(p);
    } else if (pageNumbers[pageNumbers.length - 1] !== "…") {
      pageNumbers.push("…");
    }
  }

  const btnBase = "h-9 w-9 rounded-lg text-sm font-bold transition-all border border-blue-800/40 text-white bg-[#11194C] hover:bg-[#1A266B]";

  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <button onClick={() => onPageChange(page - 1)} disabled={page === 1} className={`${btnBase} disabled:opacity-30 disabled:cursor-not-allowed`}>‹</button>

      {pageNumbers.map((p, i) =>
        p === "…"
          ? <span key={`e-${i}`} className="text-blue-400 text-sm px-1">…</span>
          : <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={p === page ? "h-9 w-9 rounded-lg text-sm font-bold bg-yellow-400 text-black shadow-md" : btnBase}
            >{p}</button>
      )}

      <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages} className={`${btnBase} disabled:opacity-30 disabled:cursor-not-allowed`}>›</button>
    </div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div
      className="py-32 text-center bg-[#091340]/40 rounded-3xl border border-blue-800/30 backdrop-blur-md flex flex-col items-center justify-center shadow-xl opacity-0"
      style={{ animation: "match-row-in 340ms ease 60ms forwards" }}
    >
      <h3 className="text-2xl font-bold text-white uppercase tracking-widest mb-2">
        Tidak ada pertandingan
      </h3>
      <p className="text-blue-300 text-sm max-w-md mx-auto">
        Kami tidak dapat menemukan pertandingan yang sesuai dengan filter atau pencarian Anda.
      </p>
      <button
        onClick={onReset}
        className="mt-6 px-6 py-2 bg-yellow-400 text-black font-bold rounded-lg hover:bg-yellow-300 transition-colors"
      >
        Reset Filter
      </button>
    </div>
  );
}

// --- Komponen utama -----------------------------------------------------------

export default function SchedulePageClient() {
  const [activeTab,   setActiveTab]   = useState<CategoryTab>("ALL");
  const [dateFilter,  setDateFilter]  = useState<DateFilter>(null);
  const [searchInput, setSearchInput] = useState("");
  const [page,        setPage]        = useState(1);

  const debouncedSearch = useDebounce(searchInput, 350);

  const [rawMatches,      setRawMatches]      = useState<any[] | null>(null);
  const [ready,           setReady]           = useState(false);
  const [skeletonVisible, setSkeletonVisible] = useState(false);
  const [animKey,         setAnimKey]         = useState(0);

  // rawMatches dipakai SSE hook buat nambal status/live_state tanpa re-fetch
  const stableMatches = useMemo(() => rawMatches ?? [], [rawMatches]);
  const { liveMatches } = useScheduleMatchState(stableMatches);

  const topRef        = useRef<HTMLDivElement>(null);
  const outerRef      = useRef<HTMLDivElement>(null);
  const innerRef      = useRef<HTMLDivElement>(null);
  const scrollTargetY = useRef<number | null>(null);
  const [lockedHeight, setLockedHeight] = useState<number | null>(null);

  const allGroups = useMemo(
    () => (rawMatches !== null ? buildEventGroups(liveMatches) : null),
    [liveMatches, rawMatches],
  );

  const totalPages = allGroups ? Math.max(1, Math.ceil(allGroups.length / EVENTS_PER_PAGE)) : 0;
  const pageGroups = allGroups?.slice((page - 1) * EVENTS_PER_PAGE, page * EVENTS_PER_PAGE) ?? [];
  const gridKey    = `${activeTab}|${JSON.stringify(dateFilter)}|${debouncedSearch}|${page}`;
  const isEmpty    = ready && (allGroups?.length ?? 0) === 0;

  useEffect(() => {
    let cancelled        = false;
    let skeletonShownAt: number | null = null;
    let minDisplayTimer: ReturnType<typeof setTimeout> | null = null;

    setReady(false);
    setSkeletonVisible(false);
    setRawMatches(null);
    setAnimKey(k => k + 1);

    const { dateFrom, dateTo } = dateFilterToRange(dateFilter);
    const fetchFilter: ScheduleMatchFilter = {
      dateFrom,
      dateTo,
      category: activeTab !== "ALL" ? activeTab : null,
      search:   debouncedSearch || null,
    };

    const commit = (items: any[]) => {
      setRawMatches(items);
      if (skeletonShownAt === null) {
        clearTimeout(showTimer);
        if (!cancelled) setReady(true);
      } else {
        const remaining = SKELETON_MIN_DISP_MS - (Date.now() - skeletonShownAt);
        if (remaining <= 0) {
          if (!cancelled) setReady(true);
        } else {
          minDisplayTimer = setTimeout(() => { if (!cancelled) setReady(true); }, remaining);
        }
      }
    };

    const showTimer = setTimeout(() => {
      if (cancelled) return;
      skeletonShownAt = Date.now();
      setSkeletonVisible(true);
    }, SKELETON_SHOW_DELAY_MS);

    import("@/lib/directus").then(async ({ getMatchesSchedule }) => {
      if (cancelled) return;
      try {
        const { items } = await getMatchesSchedule(fetchFilter);
        if (!cancelled) commit(items);
      } catch {
        if (!cancelled) { setRawMatches([]); setReady(true); }
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(showTimer);
      if (minDisplayTimer) clearTimeout(minDisplayTimer);
    };
  }, [activeTab, dateFilter, debouncedSearch]);

  useEffect(() => {
    const capture = () => {
      if (topRef.current)
        scrollTargetY.current = topRef.current.getBoundingClientRect().top + window.scrollY;
    };
    if (document.readyState === "complete") capture();
    else window.addEventListener("load", capture, { once: true });
    window.addEventListener("resize", capture);
    return () => window.removeEventListener("resize", capture);
  }, []);

  useLayoutEffect(() => {
    if (!ready || lockedHeight === null || !innerRef.current) return;
    setLockedHeight(innerRef.current.offsetHeight);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const prevFilters = useRef({ debouncedSearch, activeTab, dateFilter });
  useEffect(() => {
    const prev = prevFilters.current;
    if (
      prev.debouncedSearch !== debouncedSearch ||
      prev.activeTab       !== activeTab       ||
      prev.dateFilter      !== dateFilter
    ) {
      setPage(1);
      prevFilters.current = { debouncedSearch, activeTab, dateFilter };
    }
  }, [debouncedSearch, activeTab, dateFilter]);

  const handlePageChange = useCallback((p: number) => {
    if (outerRef.current) setLockedHeight(outerRef.current.offsetHeight);
    const y = scrollTargetY.current
      ?? (topRef.current ? topRef.current.getBoundingClientRect().top + window.scrollY : 0);
    window.scrollTo({ top: y - 120, behavior: "smooth" });
    setPage(p);
  }, []);

  const handleTransitionEnd = () => setLockedHeight(null);

  const resetFilters = useCallback(() => {
    setSearchInput(""); setActiveTab("ALL"); setDateFilter(null); setPage(1);
  }, []);

  const showContent = skeletonVisible || ready;

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#0D26C2] from-30% to-[#06125C] font-sans selection:bg-yellow-500 selection:text-blue-900 relative overflow-x-hidden">

      <div
        className="fixed top-0 left-0 right-0 pointer-events-none z-0"
        style={{
          height: "600px",
          backgroundImage: "url(/Batik_Pattern_dark.svg)",
          backgroundSize: "1400px auto",
          backgroundPosition: "top center",
          backgroundRepeat: "repeat-x",
          opacity: 0.7,
          WebkitMaskImage: "linear-gradient(to bottom, black 40%, transparent 100%)",
          maskImage: "linear-gradient(to bottom, black 40%, transparent 100%)",
        }}
      />

      <div className="relative z-10" style={{ padding: "24px clamp(20px, 8.33vw, 160px) 20px" }}>

        <ScheduleHero />

        {ready && allGroups !== null && allGroups.length > 0 && (
          <p
            className="font-jakarta text-xs text-center -mt-14 mb-6"
            style={{ color: "rgba(255,255,255,0.45)", fontWeight: 600 }}
          >
            {allGroups.length} event &middot; halaman {page} dari {totalPages}
          </p>
        )}

        <div ref={topRef} className="flex flex-wrap md:flex-nowrap items-center gap-3 mb-6">
          <ScheduleToolbar activeTab={activeTab} onTabChange={setActiveTab} />

          <div className="relative flex-1 min-w-[200px] group order-last md:order-none w-full md:w-auto">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300 group-focus-within:text-yellow-400 transition-colors pointer-events-none"
              size={16}
            />
            <input
              type="text"
              placeholder="Cari tim, kategori, venue..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="w-full h-11 bg-[#11194C] border border-blue-800/40 text-white rounded-lg pl-10 pr-4 text-sm focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-all placeholder:text-blue-300 shadow-lg"
            />
          </div>

          <DateFilterBar value={dateFilter} onChange={setDateFilter} />
        </div>

        <div
          ref={outerRef}
          onTransitionEnd={handleTransitionEnd}
          style={{
            height:     lockedHeight !== null ? lockedHeight : undefined,
            overflow:   lockedHeight !== null ? "hidden"     : undefined,
            transition: lockedHeight !== null ? "height 0.8s ease 0.4s" : undefined,
            minHeight:  280,
          }}
        >
          <div ref={innerRef}>

            {showContent && !ready && (
              <div className="flex flex-col gap-2">
                {Array.from({ length: EVENTS_PER_PAGE }).map((_, i) => (
                  <SkeletonEventCard key={i} index={i} />
                ))}
              </div>
            )}

            {isEmpty && <EmptyState onReset={resetFilters} />}

            {ready && !isEmpty && (
              <>
                <div key={animKey} className="flex flex-col gap-0">
                  {pageGroups.map(({ eventName, cardImage, matches }, i) => (
                    <EventGroup
                      key={eventName}
                      eventName={eventName}
                      cardImage={cardImage}
                      matches={matches}
                      gridKey={gridKey}
                      index={i}
                    />
                  ))}
                </div>

                <div style={{ opacity: 0, animation: `match-row-in 280ms ease ${EVENTS_PER_PAGE * 60 + 100}ms forwards` }}>
                  <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
                </div>
              </>
            )}

          </div>
        </div>

      </div>

      <UniversityMarquee />
      <div style={{ height: 80 }} />
      <Footer />
    </div>
  );
}