"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { MapPin, Clock, Search, ChevronDown, ChevronUp, Calendar } from "lucide-react";
import { getAssetUrl } from "@/lib/directus";
import bgLogo from "./Background/download (1) 2.png";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Compact Score Component ---
function CompactScoreSets({ live }: { live: any }) {
  if (!live || !live.setLog) return null;
  
  const sets = [0, 1, 2].map(idx => {
    const log = live.setLog[idx];
    const current = live.setIdx === idx && live.matchStatus === 'live';
    return {
      home: log ? log.home : (current ? live.setScore[0] : "-"),
      away: log ? log.away : (current ? live.setScore[1] : "-"),
      active: current
    };
  });

  return (
    <div className="flex gap-1.5 justify-center">
      {sets.map((s, i) => (
        <div key={i} className={cn(
          "flex flex-col items-center justify-center w-6 py-0.5 rounded text-[10px] font-bold shadow-inner",
          s.active ? "bg-yellow-400 text-black" : "bg-[#06125C] text-white border border-blue-800/30"
        )}>
          <span>{s.home}</span>
          <span className="opacity-40 h-px w-3 bg-current my-0.5" />
          <span>{s.away}</span>
        </div>
      ))}
    </div>
  );
}

// --- Compact Match Card ---
function CompactMatchCard({ match }: { match: any }) {
  const live = match.live_state;
  const format = match.competition_category?.format_id;
  const isSets = format?.match_type === 'head_to_head' && format?.modules?.some((m: any) => m.type === 'score_sets');
  const isSolo = format?.match_type === 'solo';
  const isOpen = format?.match_type === 'open';

  const status = match.status;
  const imageUrl = getAssetUrl(match.competition_category?.event_id?.card_image);
  
  const getBadgeStyle = (status: string) => {
    switch (status) {
      case 'live': return 'bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.5)] border border-red-400';
      case 'upcoming': return 'bg-[#14225D] text-blue-200 border border-blue-700/50';
      case 'finished': return 'bg-emerald-600 text-white border border-emerald-500';
      default: return 'bg-[#14225D] text-gray-300 border border-blue-700/50';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'live': return 'LIVE';
      case 'upcoming': return 'UPCOMING';
      case 'finished': return 'FINISHED';
      default: return 'UPCOMING';
    }
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-[#091340]/80 backdrop-blur-sm border border-blue-800/40 hover:border-yellow-400/40 rounded-2xl p-4 flex flex-col gap-3 transition-all group shadow-lg"
    >
      {/* Header: Category & Status */}
      <div className="flex justify-between items-start gap-2">
        <div className="flex flex-col items-start">
          <span className="text-[9px] md:text-[10px] text-yellow-400 font-bold tracking-wider uppercase bg-blue-900/30 px-2 py-0.5 rounded border border-yellow-400/20">
            {match.competition_category?.name || "Kategori"}
          </span>
          <h3 className="text-white font-bold text-sm leading-tight mt-1.5 line-clamp-1 group-hover:text-yellow-200 transition-colors">
            {match.match_name || "Match Event"}
          </h3>
        </div>
        <span className={cn(
          "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shrink-0",
          getBadgeStyle(status)
        )}>
          {getStatusLabel(status)}
        </span>
      </div>

      {/* Main Body: Participants & Score */}
      <div className="flex-1 flex flex-col justify-center bg-black/25 rounded-xl p-3 border border-white/5 relative overflow-x-hidden">
        {/* Subtle background glow for live matches */}
        {status === 'live' && <div className="absolute inset-0 bg-red-500/5 animate-pulse pointer-events-none" />}

        {isSolo || isOpen ? (
           <div className="flex flex-col items-center text-center py-2">
             <span className="text-white font-bold text-sm uppercase">
               {match.home_participant?.name || match.match_name}
             </span>
             {match.home_participant?.members && (
               <span className="text-blue-300 text-[10px] mt-1 line-clamp-2 max-w-[90%]">
                 {Array.isArray(match.home_participant.members)
                   ? match.home_participant.members.join(", ")
                   : (() => {
                       try {
                         const parsed = JSON.parse(match.home_participant.members);
                         return Array.isArray(parsed) ? parsed.join(", ") : String(parsed);
                       } catch (e) {
                         return String(match.home_participant.members);
                       }
                     })()}
               </span>
             )}
           </div>
        ) : (
          <div className="flex items-center justify-between w-full z-10 relative">
            {/* Team A */}
            <div className="flex flex-col items-center gap-2 w-[35%]">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-full flex items-center justify-center p-1.5 shadow-md">
                {match.home_participant?.institution?.logo_url ? (
                  <img src={match.home_participant.institution.logo_url} alt="" className="w-full h-full object-contain" />
                ) : <div className="w-full h-full bg-slate-200 rounded-full" />}
              </div>
              <span className="text-white font-bold text-[10px] md:text-xs uppercase text-center line-clamp-2 leading-tight">
                {match.home_participant?.name || "TBA"}
              </span>
            </div>

            {/* Score Center */}
            <div className="flex flex-col items-center justify-center w-[30%]">
              {isSets ? (
                <CompactScoreSets live={live} />
              ) : (
                <div className="text-white font-black text-2xl md:text-3xl text-center flex items-center gap-2">
                  {status === 'upcoming' ? (
                    <span className="text-sm md:text-base text-blue-400 italic font-bold">VS</span>
                  ) : (
                    <>
                      <span>{live?.homeScore ?? 0}</span>
                      <span className="text-blue-500/50 text-sm">-</span>
                      <span>{live?.awayScore ?? 0}</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Team B */}
            <div className="flex flex-col items-center gap-2 w-[35%]">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-full flex items-center justify-center p-1.5 shadow-md">
                {match.away_participant?.institution?.logo_url ? (
                  <img src={match.away_participant.institution.logo_url} alt="" className="w-full h-full object-contain" />
                ) : <div className="w-full h-full bg-slate-200 rounded-full" />}
              </div>
              <span className="text-white font-bold text-[10px] md:text-xs uppercase text-center line-clamp-2 leading-tight">
                {match.away_participant?.name || "TBA"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer: Time & Venue */}
      <div className="flex items-center justify-between text-[10px] md:text-xs mt-1">
        <span className="flex items-center gap-1.5 bg-blue-950/60 px-2 py-1 rounded text-blue-200 font-medium">
          <Clock size={12} className="text-yellow-500" />
          {match.scheduled_at ? new Date(match.scheduled_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : "--:--"}
        </span>
        <span className="flex items-center gap-1.5 text-blue-300 max-w-[55%] justify-end">
          <MapPin size={12} className="text-yellow-500 shrink-0" />
          <span className="truncate">{match.venue || "TBD"}</span>
        </span>
      </div>
    </motion.div>
  );
}

// --- Event Group Accordion ---
function EventGroup({ eventName, cardImage, matches }: { eventName: string, cardImage: string | null, matches: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const imageUrl = getAssetUrl(cardImage);

  return (
    <motion.div layout className="flex flex-col gap-3 mb-8">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-between w-full bg-[#11194C] border border-blue-800/40 p-4 md:p-6 rounded-2xl hover:bg-[#162162] transition-colors shadow-lg group overflow-hidden"
      >
        {imageUrl && (
          <div 
            className="absolute right-0 top-0 bottom-0 w-[70%] md:w-[50%] pointer-events-none transition-opacity opacity-50 group-hover:opacity-75"
            style={{
              backgroundImage: `url(${imageUrl})`,
              backgroundPosition: 'center',
              backgroundSize: 'cover',
              backgroundRepeat: 'no-repeat',
              WebkitMaskImage: 'linear-gradient(to left, black 0%, transparent 100%)',
              maskImage: 'linear-gradient(to left, black 0%, transparent 100%)',
            }}
          />
        )}
        <div className="relative z-10 flex flex-wrap md:flex-nowrap items-center gap-3 md:gap-4 text-left">
          <h2 className="text-lg md:text-2xl font-bold text-white uppercase tracking-wide group-hover:text-yellow-400 transition-colors drop-shadow-md">
            {eventName}
          </h2>
          <span className="bg-[#1D3282] text-white text-[10px] md:text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap shadow-inner border border-blue-600/30">
            {matches.length} PERTANDINGAN
          </span>
        </div>
        <div className="relative z-10 bg-[#091340]/50 p-2 rounded-full text-blue-300 group-hover:text-yellow-400 group-hover:bg-[#091340]/80 transition-colors shrink-0 ml-4 border border-blue-800/30">
          {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {/* CSS Grid for compact match display */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-2 pb-4 px-1">
              <AnimatePresence mode="popLayout">
                {matches.map(match => (
                  <CompactMatchCard key={match.id} match={match} />
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}


export default function SchedulePageClient({ initialMatches }: { initialMatches: any[] }) {
  const [activeTab, setActiveTab] = useState<"ALL" | "sport" | "arts">("ALL");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Derive unique dates
  const uniqueDates = useMemo(() => {
    const datesMap = new Map<string, Date>();
    initialMatches.forEach(m => {
      if (m.scheduled_at) {
        const d = new Date(m.scheduled_at);
        const label = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        if (!datesMap.has(label)) {
          datesMap.set(label, d);
        }
      }
    });
    
    const sorted = Array.from(datesMap.entries())
      .sort((a, b) => a[1].getTime() - b[1].getTime())
      .map(([label]) => label);

    return sorted;
  }, [initialMatches]);

  // Set initial selected date if not set
  useMemo(() => {
    if (!selectedDate && uniqueDates.length > 0) {
      setSelectedDate(uniqueDates[0]);
    }
  }, [uniqueDates, selectedDate]);

  const filteredMatches = useMemo(() => {
    let result = initialMatches;
    
    // 1. Filter by Tab (Sport/Art)
    if (activeTab !== "ALL") {
      result = result.filter(m => m.competition_category?.event_id?.type?.toLowerCase() === activeTab.toLowerCase());
    }
    
    // 2. Filter by Date
    if (selectedDate) {
      result = result.filter(m => {
        if (!m.scheduled_at) return false;
        const d = new Date(m.scheduled_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        return d === selectedDate;
      });
    }

    // 3. Search Filter
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      result = result.filter(m => {
        const matchName = m.match_name?.toLowerCase() || "";
        const categoryName = m.competition_category?.name?.toLowerCase() || "";
        const venue = m.venue?.toLowerCase() || "";
        const homeName = m.home_participant?.name?.toLowerCase() || "";
        const awayName = m.away_participant?.name?.toLowerCase() || "";
        const eventName = m.competition_category?.event_id?.name?.toLowerCase() || "";
        
        return (
          matchName.includes(q) ||
          categoryName.includes(q) ||
          venue.includes(q) ||
          homeName.includes(q) ||
          awayName.includes(q) ||
          eventName.includes(q)
        );
      });
    }

    return result;
  }, [initialMatches, activeTab, selectedDate, searchQuery]);

  const groupedByEvent = useMemo(() => {
    const groups: Record<string, { eventName: string; cardImage: string | null; matches: any[] }> = {};
    filteredMatches.forEach(m => {
      const eventName = m.competition_category?.event_id?.name || "Other Events";
      const cardImage = m.competition_category?.event_id?.card_image || null;
      if (!groups[eventName]) groups[eventName] = { eventName, cardImage, matches: [] };
      groups[eventName].matches.push(m);
    });
    return groups;
  }, [filteredMatches]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#0D26C2] from-30% to-[#06125C] pt-6 pb-24 font-sans selection:bg-yellow-500 selection:text-blue-900 relative overflow-hidden">
      
      {/* Background Logo Watermark */}
      <div className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden">
        <img 
          src={bgLogo.src} 
          alt="Background Logo" 
          className="w-[150%] md:w-[80%] max-w-none opacity-[0.15] mix-blend-overlay object-contain -translate-y-10"
        />
      </div>

      <div className="max-w-[1400px] mx-auto px-4 md:px-8 relative z-10">
        
        {/* --- Redesigned Compact Hero Section --- */}
        <div className="relative bg-[#091340]/60 p-6 md:p-10 rounded-3xl border border-blue-800/30 overflow-hidden shadow-2xl backdrop-blur-md mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-yellow-500/10 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4 pointer-events-none" />
          
          {/* Left: Titles & Mascots */}
          <div className="relative z-10 flex items-center gap-6 w-full md:w-auto">
            <div className="hidden sm:block shrink-0">
               <img src="/maskot/Cowok%20Suka.png" alt="Mascot" className="w-24 h-24 md:w-32 md:h-32 object-contain drop-shadow-2xl" />
            </div>
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-5xl md:text-[80px] font-display font-normal uppercase tracking-wide leading-[0.9] text-white drop-shadow-md">
                MATCH & EVENT <br className="hidden md:block"/>
                <span className="text-yellow-400">SCHEDULES</span>
              </h1>
              <p className="text-blue-200 text-sm md:text-base mt-3 font-medium tracking-wide bg-blue-900/40 w-fit sm:mx-0 mx-auto px-4 py-1.5 rounded-full border border-blue-400/20">
                Pantau jadwal & skor pertandingan secara real-time.
              </p>
            </div>
          </div>
          
          {/* Right: Secondary Mascot */}
          <div className="hidden md:block relative z-10 shrink-0">
             <img src="/maskot/Cewek%20Semangat.png" alt="Mascot" className="w-24 h-24 md:w-32 md:h-32 object-contain drop-shadow-2xl scale-x-[-1]" />
          </div>
        </div>

        {/* --- Toolbar: Search, Tabs, Dates (Sticky) --- */}
        <div className="sticky top-20 md:top-24 z-40 bg-[#06125C]/85 backdrop-blur-xl border border-blue-600/30 shadow-[0_20px_40px_rgba(0,0,0,0.4)] rounded-2xl p-4 flex  │ flex-col xl:flex-row gap-4 items-center justify-between mb-10 transition-all">
          {/* Search Input */}
          <div className="relative w-full xl:w-[350px] shrink-0 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400 group-focus-within:text-yellow-400 transition-colors" size={18} />
            <input 
              type="text"
              placeholder="Cari tim, kategori, venue..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#091340]/80 border border-blue-800/80 text-white rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-all placeholder:text-blue-500 shadow-inner"
            />
          </div>

          <div className="flex flex-col lg:flex-row items-center gap-4 w-full xl:w-auto justify-end overflow-hidden">
            {/* Tabs */}
            <div className="flex bg-[#091340] p-1.5 rounded-xl border border-blue-800/50 shrink-0 w-full lg:w-auto overflow-x-auto scrollbar-hide shadow-inner">
              {(["ALL", "sport", "arts"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex-1 lg:flex-none px-6 py-2 text-xs md:text-sm font-bold uppercase transition-all rounded-lg whitespace-nowrap",
                    activeTab === tab ? "bg-yellow-400 text-black shadow-md" : "text-gray-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  {tab === "sport" ? "SPORTS" : tab === "arts" ? "ARTS" : "SEMUA KATEGORI"}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="hidden lg:block w-px h-10 bg-blue-800/50 mx-2" />

            {/* Date Selector */}
            <div className="w-full lg:w-auto flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide shrink-0 px-2">
              <Calendar className="text-blue-400 hidden lg:block mr-2 shrink-0" size={18} />
              {uniqueDates.map(date => {
                const isToday = date === new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                return (
                  <button
                    key={date}
                    onClick={() => setSelectedDate(date)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs md:text-sm font-bold whitespace-nowrap transition-all border",
                      selectedDate === date 
                        ? "bg-blue-600 text-white border-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.5)]" 
                        : "bg-[#091340]/50 text-blue-300 border-blue-800/50 hover:border-blue-500 hover:bg-blue-900/30"
                    )}
                  >
                    {date} {isToday && <span className="text-yellow-400 ml-1">(Hari ini)</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* --- Schedule Content Grid --- */}
        <div className="flex flex-col gap-6">
          <AnimatePresence mode="wait">
            {Object.keys(groupedByEvent).length > 0 ? (
              <motion.div 
                key="event-list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {Object.values(groupedByEvent).map(({ eventName, cardImage, matches }) => (
                  <EventGroup key={eventName} eventName={eventName} cardImage={cardImage} matches={matches} />
                ))}
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="py-32 text-center bg-[#091340]/40 rounded-3xl border border-blue-800/30 backdrop-blur-md flex flex-col items-center justify-center shadow-xl"
              >
                <div className="w-20 h-20 bg-blue-900/50 rounded-full flex items-center justify-center mb-6 shadow-inner border border-blue-700/50">
                  <Search className="text-blue-400" size={32} />
                </div>
                <h3 className="text-2xl font-bold text-white uppercase tracking-widest mb-2">Tidak ada pertandingan</h3>
                <p className="text-blue-300 text-sm max-w-md mx-auto">
                  Kami tidak dapat menemukan pertandingan yang sesuai dengan filter atau pencarian Anda. Coba ubah tanggal, kategori, atau kata kunci pencarian.
                </p>
                <button 
                  onClick={() => { setSearchQuery(""); setActiveTab("ALL"); }}
                  className="mt-6 px-6 py-2 bg-yellow-400 text-black font-bold rounded-full hover:bg-yellow-300 transition-colors"
                >
                  Reset Filter
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}