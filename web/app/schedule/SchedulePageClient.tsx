"use client";

import {
  useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo,
} from "react";
import { Search, ChevronDown, ChevronUp, X } from "lucide-react";
import { useDebounce }                       from "@/hooks/useDebounce";
import { useScheduleMatchState }             from "../../hooks/useScheduleMatchState";
import { ScheduleHero }                      from "./_components/ScheduleHero";
import { ScheduleToolbar, type CategoryTab } from "./_components/ScheduleToolbar";
import { DateFilterBar, type DateFilter, isRangeFilter } from "./_components/DateFilterBar";
import { DateRangePicker } from "./_components/DateRangePicker";
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
  organizer: string | null;
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
    const name      = m.competition_category?.event_id?.name                              ?? "Other Events";
    const image     = m.competition_category?.event_id?.card_image                        ?? null;
    const organizer = m.competition_category?.event_id?.user_created?.organisation_name   ?? null;
    if (!map[name]) {
      map[name] = { eventName: name, cardImage: image, organizer, matches: [], priority: 2, sortDate: 0 };
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
      // FIX #4: parse once, reuse for both getTime() and toDateString()
      const d = new Date(m.scheduled_at);
      const t = d.getTime();
      if (d.toDateString() === todayStr) hasToday = true;
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

// FIX #11: error state punya tampilan sendiri, beda dari empty state
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      className="py-32 text-center bg-[#091340]/40 rounded-3xl border border-red-800/30 backdrop-blur-md flex flex-col items-center justify-center shadow-xl opacity-0"
      style={{ animation: "match-row-in 340ms ease 60ms forwards" }}
    >
      <h3 className="text-2xl font-bold text-white uppercase tracking-widest mb-2">
        Gagal memuat data
      </h3>
      <p className="text-blue-300 text-sm max-w-md mx-auto">
        Terjadi kesalahan saat mengambil jadwal. Periksa koneksi internet Anda.
      </p>
      <button
        onClick={onRetry}
        className="mt-6 px-6 py-2 bg-yellow-400 text-black font-bold rounded-lg hover:bg-yellow-300 transition-colors"
      >
        Coba Lagi
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

  const [mobileCategoryOpen, setMobileCategoryOpen] = useState(false);
  const [mobileDateOpen,     setMobileDateOpen]     = useState(false);
  const [mobileRangePicker,  setMobileRangePicker]  = useState(false);

  const debouncedSearch = useDebounce(searchInput, 350);

  const [rawMatches,      setRawMatches]      = useState<any[] | null>(null);
  const [ready,           setReady]           = useState(false);
  const [fetchError,      setFetchError]      = useState(false); 
  const [skeletonVisible, setSkeletonVisible] = useState(false);
  const [animKey,         setAnimKey]         = useState(0);

  // rawMatches dipakai SSE hook buat nambal status/live_state tanpa re-fetch
  const stableMatches = useMemo(() => rawMatches ?? [], [rawMatches]);
  const { liveMatches } = useScheduleMatchState(stableMatches);

  const topRef          = useRef<HTMLDivElement>(null);
  const mobileFilterRef = useRef<HTMLDivElement>(null);
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
  const isEmpty    = ready && !fetchError && (allGroups?.length ?? 0) === 0;

  // null = semua tertutup; string = nama event yang sedang terbuka
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  const handleGroupToggle = useCallback((eventName: string) => {
    setOpenGroup(g => g === eventName ? null : eventName);
  }, []);

  // prevFilters ref pattern replaced with a simple effect
  useEffect(() => { setPage(1); setOpenGroup(null); }, [debouncedSearch, activeTab, dateFilter]);

  useEffect(() => {
    let cancelled        = false;
    let skeletonShownAt: number | null = null;
    let minDisplayTimer: ReturnType<typeof setTimeout> | null = null;

    setReady(false);
    setFetchError(false);
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

    // showTimer declared before commit so the closure is never forward-referencing
    let showTimer: ReturnType<typeof setTimeout>;

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

    

    showTimer = setTimeout(() => {
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
        // set error state instead of silently falling through to empty state
        if (!cancelled) { setFetchError(true); setReady(true); }
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
    // lockedHeight sengaja tidak masuk dep array — kalau dimasukkan akan loop tak terbatas
    // karena effect ini sendiri yang mengubah lockedHeight
    setLockedHeight(innerRef.current.offsetHeight);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const handlePageChange = useCallback((p: number) => {
    if (outerRef.current) setLockedHeight(outerRef.current.offsetHeight);
    const y = scrollTargetY.current
      ?? (topRef.current ? topRef.current.getBoundingClientRect().top + window.scrollY : 0);
    window.scrollTo({ top: y - 120, behavior: "smooth" });
    setPage(p);
  }, []);

  // transitionend bubbles — accordion children juga fire event ini dan bisa clear lockedHeight
  // terlalu cepat. Guard: hanya react kalau event-nya dari outerRef sendiri dan property-nya height.
  const handleTransitionEnd = useCallback((e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.target === outerRef.current && e.propertyName === "height") {
      setLockedHeight(null);
    }
  }, []);

  const resetFilters = useCallback(() => {
    setSearchInput(""); setActiveTab("ALL"); setDateFilter(null); setPage(1);
  }, []);

  // retry bersihkan error state dan trigger re-fetch lewat filter deps
  const retryFetch = useCallback(() => {
    setFetchError(false);
    setRawMatches(null);
    setReady(false);
    setAnimKey(k => k + 1);
  }, []);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (mobileFilterRef.current && !mobileFilterRef.current.contains(e.target as Node)) {
        setMobileCategoryOpen(false);
        setMobileDateOpen(false);
        setMobileRangePicker(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const showContent = skeletonVisible || ready;

  const eventCount =
    allGroups === null
      ? "__"
      : allGroups.length === 0
      ? 0
      : allGroups.length;

  const currentPage = ready ? page : "__";
  const totalPageCount = ready ? totalPages : "__";

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

      <div className="relative z-10 px-4 md:px-[clamp(20px,8.33vw,160px)]" style={{ paddingTop: 24, paddingBottom: 20 }}>

        <ScheduleHero />

        <p
          className="font-jakarta text-xs text-center -mt-8 mb-3 sm:-mt-14 sm:mb-5"
          style={{ color: "rgba(255,255,255,0.45)", fontWeight: 600 }}
        >
          {eventCount} event &middot; halaman {currentPage} dari {totalPageCount}
        </p>

        <div ref={topRef}>

          {/* ── MOBILE TOOLBAR ─────────────────────────────────────────────── */}
          <div ref={mobileFilterRef} className="relative flex flex-col gap-1.5 mb-3 md:hidden">

            {/* Search — full width on top */}
            <div className="relative group">
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

            {/* Two filter buttons + both dropdowns — all in one relative wrapper
                so top-full / left-0 / right-0 anchors to the button row, not the whole bar */}
            <div className="relative">
              <style>{`
                @keyframes mob-panel-in {
                  from { opacity: 0; transform: scaleY(0.92) translateY(-6px); }
                  to   { opacity: 1; transform: none; }
                }
                @keyframes mob-item-in {
                  from { opacity: 0; transform: translateY(-5px); }
                  to   { opacity: 1; transform: none; }
                }
              `}</style>

              {/* Button row */}
              <div className="flex gap-1">

                {/* Category button */}
                <button
                  onClick={() => { setMobileCategoryOpen(v => !v); setMobileDateOpen(false); setMobileRangePicker(false); }}
                  className={`flex-1 h-11 flex items-center justify-between px-4 rounded-lg border text-sm font-bold transition-all ${
                    mobileCategoryOpen || activeTab !== "ALL"
                      ? "bg-yellow-400 text-black border-yellow-400"
                      : "bg-[#11194C] text-white border-blue-800/40"
                  }`}
                >
                  <span>{activeTab === "ALL" ? "Kategori" : activeTab === "sport" ? "Sports" : "Arts"}</span>
                  {mobileCategoryOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {/* Date button */}
                <button
                  onClick={() => { setMobileDateOpen(v => !v); setMobileCategoryOpen(false); setMobileRangePicker(false); }}
                  className={`flex-1 h-11 flex items-center justify-between px-4 rounded-lg border text-sm font-bold transition-all ${
                    mobileDateOpen || dateFilter !== null
                      ? "bg-yellow-400 text-black border-yellow-400"
                      : "bg-[#11194C] text-white border-blue-800/40"
                  }`}
                >
                  <span className="truncate mr-1">
                    {dateFilter === null
                      ? "Tanggal"
                      : dateFilter === "today"  ? "Today"
                      : dateFilter === "week"   ? "This Week"
                      : dateFilter === "month"  ? "This Month"
                      : isRangeFilter(dateFilter)
                        ? `${dateFilter.start.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${dateFilter.end.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
                        : "Tanggal"}
                  </span>
                  {dateFilter !== null && !mobileDateOpen
                    ? <span onClick={e => { e.stopPropagation(); setDateFilter(null); setMobileRangePicker(false); }} className="shrink-0 hover:opacity-70 transition-opacity"><X size={13} /></span>
                    : mobileDateOpen ? <ChevronUp size={14} className="shrink-0" /> : <ChevronDown size={14} className="shrink-0" />
                  }
                </button>

              </div>

              {/* Category dropdown — full width, anchored to button row */}
              {mobileCategoryOpen && (
                <div
                  className="absolute top-full left-0 right-0 z-50 border border-white/10 rounded-xl overflow-hidden"
                  style={{
                    marginTop: 6,
                    background: "rgba(6, 18, 92, 0.55)",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
                    transformOrigin: "top",
                    animation: "mob-panel-in 240ms cubic-bezier(0.22, 1, 0.36, 1) both",
                  }}
                >
                  {([["ALL", "Semua"], ["sport", "Sports"], ["arts", "Arts"]] as [CategoryTab, string][]).map(([id, label], i) => (
                    <button
                      key={id}
                      onClick={() => { setActiveTab(id); setMobileCategoryOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
                      style={{ opacity: 0, animation: `mob-item-in 220ms ease ${i * 38}ms forwards` }}
                    >
                      <span className={`w-[18px] h-[18px] rounded flex-shrink-0 border-2 flex items-center justify-center transition-all ${
                        activeTab === id ? "bg-yellow-400 border-yellow-400" : "border-white/25"
                      }`}>
                        {activeTab === id && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <polyline points="1 4 3.5 6.5 9 1" stroke="#0D1A4A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </span>
                      <span className={`font-semibold ${activeTab === id ? "text-white" : "text-white/70"}`}>{label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Date dropdown — full width, anchored to button row */}
              {mobileDateOpen && (
                <div
                  className="absolute top-full left-0 right-0 z-50 border border-white/10 rounded-xl overflow-hidden"
                  style={{
                    marginTop: 6,
                    background: "rgba(6, 18, 92, 0.55)",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
                    transformOrigin: "top",
                    animation: "mob-panel-in 240ms cubic-bezier(0.22, 1, 0.36, 1) both",
                  }}
                >
                  {(["today", "week", "month"] as const).map((id, i) => {
                    const label = id === "today" ? "Today" : id === "week" ? "This Week" : "This Month";
                    const isActive = dateFilter === id;
                    return (
                      <button
                        key={id}
                        onClick={() => { setDateFilter(isActive ? null : id); setMobileDateOpen(false); setMobileRangePicker(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left border-b border-white/5 hover:bg-white/5 transition-colors"
                        style={{ opacity: 0, animation: `mob-item-in 220ms ease ${i * 38}ms forwards` }}
                      >
                        <span className={`w-[18px] h-[18px] rounded flex-shrink-0 border-2 flex items-center justify-center transition-all ${isActive ? "bg-yellow-400 border-yellow-400" : "border-white/25"}`}>
                          {isActive && (
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                              <polyline points="1 4 3.5 6.5 9 1" stroke="#0D1A4A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </span>
                        <span className={`font-semibold ${isActive ? "text-white" : "text-white/70"}`}>{label}</span>
                      </button>
                    );
                  })}

                  {/* Custom range toggle */}
                  <button
                    onClick={() => setMobileRangePicker(v => !v)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-white/5 transition-colors ${mobileRangePicker ? "bg-white/5" : ""}`}
                    style={{ opacity: 0, animation: `mob-item-in 220ms ease ${3 * 38}ms forwards` }}
                  >
                    <span className={`w-[18px] h-[18px] rounded flex-shrink-0 border-2 flex items-center justify-center transition-all ${isRangeFilter(dateFilter) ? "bg-yellow-400 border-yellow-400" : "border-white/25"}`}>
                      {isRangeFilter(dateFilter) && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <polyline points="1 4 3.5 6.5 9 1" stroke="#0D1A4A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </span>
                    <span className={`font-semibold flex-1 ${isRangeFilter(dateFilter) ? "text-white" : "text-white/70"}`}>Custom Range</span>
                    {mobileRangePicker ? <ChevronUp size={12} className="text-white/40 shrink-0" /> : <ChevronDown size={12} className="text-white/40 shrink-0" />}
                  </button>

                {mobileRangePicker && (
                  <div className="flex justify-center p-3 pt-0">
                    <DateRangePicker
                      initialStart={isRangeFilter(dateFilter) ? dateFilter.start : null}
                      initialEnd={isRangeFilter(dateFilter) ? dateFilter.end   : null}
                      onApply={(start, end) => {
                        setDateFilter({ start, end });
                        setMobileDateOpen(false);
                        setMobileRangePicker(false);
                      }}
                    />
                  </div>
                )}

              </div>
            )}
            </div>{/* end relative wrapper */}
          </div>

          {/* ── DESKTOP TOOLBAR ────────────────────────────────────────────── */}
          <div className="hidden md:flex items-center gap-3 mb-6">
            <ScheduleToolbar activeTab={activeTab} onTabChange={setActiveTab} />

            <div className="relative flex-1 min-w-[200px] group">
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

            {ready && fetchError && <ErrorState onRetry={retryFetch} />}
            {isEmpty && <EmptyState onReset={resetFilters} />}

            {ready && !fetchError && !isEmpty && (
              <>
                <div key={animKey} className="flex flex-col gap-0">
                  {pageGroups.map(({ eventName, cardImage, organizer, matches }, i) => (
                    <EventGroup
                      key={eventName}
                      eventName={eventName}
                      cardImage={cardImage}
                      organizer={organizer}
                      matches={matches}
                      gridKey={gridKey}
                      index={i}
                      isOpen={openGroup === eventName}
                      onToggle={handleGroupToggle}
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