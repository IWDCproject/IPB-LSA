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

  const liveMatches = matches.filter(m => m.status === 'live');
  const finishedMatches = matches.filter(m => m.status === 'finished');
  const upcomingMatches = matches.filter(m => m.status !== 'live' && m.status !== 'finished');

  const renderGroup = (title: string, groupMatches: any[], dotColor: string) => {
    if (groupMatches.length === 0) return null;
    return (
      <div className="mb-10 last:mb-4">
        <div className="flex items-center gap-3 mb-4 px-1">
          <div className={cn("w-3 h-3 rounded-full", dotColor)} />
          <h3 className="text-white font-black text-xl uppercase tracking-wider drop-shadow-md">{title}</h3>
          <span className="bg-[#1D3282] text-white text-xs font-bold px-3 py-1 rounded-full border border-blue-600/30 shadow-inner">
            {groupMatches.length}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-1">
          <AnimatePresence mode="popLayout">
            {groupMatches.map(match => (
              <CompactMatchCard key={match.id} match={match} />
            ))}
          </AnimatePresence>
        </div>
      </div>
    );
  };

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
            <div className="pt-2 pb-4">
              {renderGroup("Live", liveMatches, "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]")}
              {renderGroup("Upcoming", upcomingMatches, "bg-blue-400")}
              {renderGroup("Finished", finishedMatches, "bg-emerald-500")}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}


export default function SchedulePageClient({ initialMatches, initialNews = [] }: { initialMatches: any[], initialNews?: any[] }) {
  const [activeTab, setActiveTab] = useState<"ALL" | "sport" | "arts">("ALL");
  const [selectedDate, setSelectedDate] = useState<string>("ALL");
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

  const filteredMatches = useMemo(() => {
    let result = initialMatches;
    
    // 1. Filter by Tab (Sport/Art)
    if (activeTab !== "ALL") {
      result = result.filter(m => m.competition_category?.event_id?.type?.toLowerCase() === activeTab.toLowerCase());
    }
    
    // 2. Filter by Date
    if (selectedDate && selectedDate !== "ALL") {
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
        
        {/* --- Hero Section (Teks Baru, Maskot Posisi Lama) --- */}
        <div className="relative flex flex-col md:flex-row items-center justify-between gap-6 mt-10 mb-16 px-2 md:px-0">
          
          {/* Kiri: Maskot Cowok & Judul */}
          <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6 md:gap-10 w-full md:w-auto">
            <div className="hidden sm:block shrink-0">
               <img src="/maskot/Cowok%20Suka.png" alt="Mascot" className="w-28 h-28 md:w-36 md:h-36 lg:w-44 lg:h-44 object-contain drop-shadow-2xl" />
            </div>
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-5xl md:text-[65px] lg:text-[80px] font-display font-black uppercase tracking-wide leading-[1.05] text-white drop-shadow-lg">
                MATCH & EVENT <br className="hidden md:block"/>
                <span className="text-yellow-400">SCHEDULES</span>
              </h1>
              <p className="text-blue-100 text-sm md:text-base mt-4 font-bold tracking-wide uppercase">
                Pantau jadwal dari seluruh kompetisi olahraga dan seni
              </p>
            </div>
          </div>
          
          {/* Kanan: Maskot Cewek */}
          <div className="hidden md:block relative z-10 shrink-0">
             <img src="/maskot/Cewek%20Semangat.png" alt="Mascot" className="w-28 h-28 md:w-36 md:h-36 lg:w-44 lg:h-44 object-contain drop-shadow-2xl scale-x-[-1]" />
          </div>
        </div>

       {/* --- Toolbar: Tabs, Search, & Dates (Sesuai Referensi) --- */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-12 relative z-20 px-2 md:px-0 w-full">
          
          {/* Kontrol Kiri: Tabs Kategori & Search */}
          {/* Tambahan shrink-0 agar tab dan search tidak mengecil saat tanggal memanjang */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto shrink-0">
            {/* Tabs */}
            <div className="flex bg-[#11194C] p-1.5 rounded-full shadow-lg w-full sm:w-auto shrink-0 border border-blue-800/40">
              {(["ALL", "sport", "arts"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex-1 sm:flex-none px-6 py-2.5 text-xs md:text-sm font-bold uppercase transition-all rounded-full whitespace-nowrap",
                    activeTab === tab ? "bg-yellow-400 text-black shadow-md" : "text-white hover:text-yellow-200 hover:bg-white/5"
                  )}
                >
                  {tab === "sport" ? "SPORTS" : tab === "arts" ? "ARTS" : "ALL"}
                </button>
              ))}
            </div>

            {/* Input Search (Bentuk Pill senada) */}
            <div className="relative w-full sm:w-64 lg:w-72 shrink-0 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300 group-focus-within:text-yellow-400 transition-colors" size={18} />
              <input 
                type="text"
                placeholder="Cari tim, kategori, venue..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#11194C] border border-blue-800/40 text-white rounded-full pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-all placeholder:text-blue-300 shadow-lg"
              />
            </div>
          </div>

          {/* Kontrol Kanan: Tanggal */}
          {/* PERBAIKAN: flex-1 dan min-w-0 ditambahkan agar bisa di-scroll dan tidak tembus ke kanan */}
          <div 
            className="flex items-center gap-3 overflow-x-auto w-full flex-1 min-w-0 pb-3 xl:pb-2
            [&::-webkit-scrollbar]:h-[3px] 
            [&::-webkit-scrollbar-track]:bg-[#091340]/50 
            [&::-webkit-scrollbar-track]:rounded-full
            [&::-webkit-scrollbar-thumb]:bg-blue-600 
            hover:[&::-webkit-scrollbar-thumb]:bg-blue-400
            [&::-webkit-scrollbar-thumb]:rounded-full"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#f7f4f4 transparent' }}
          >
            <button
              onClick={() => setSelectedDate("ALL")}
              className={cn(
                "px-6 py-3 rounded-xl text-xs md:text-sm font-bold whitespace-nowrap transition-all shadow-lg shrink-0 border border-blue-800/40",
                selectedDate === "ALL" 
                  ? "bg-yellow-400 text-black border-yellow-400" 
                  : "bg-[#11194C] text-white hover:bg-[#1A266B]"
              )}
            >
              Semua
            </button>

            {uniqueDates.map(date => {
              const isToday = date === new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
              return (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={cn(
                    "px-6 py-3 rounded-xl text-xs md:text-sm font-bold whitespace-nowrap transition-all shadow-lg shrink-0 border border-blue-800/40",
                    selectedDate === date 
                      ? "bg-yellow-400 text-black border-yellow-400" 
                      : "bg-[#11194C] text-white hover:bg-[#1A266B]"
                  )}
                >
                  {date} 
                  {isToday && (
                    <span className={selectedDate === date ? "text-black/70 ml-1" : "text-yellow-400 ml-1"}>
                      (Hari ini)
                    </span>
                  )}
                </button>
              );
            })}
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

      {/* --- Floating Sidebar: News Widget --- */}
      <aside className="hidden xl:flex absolute right-4 2xl:right-8 top-32 flex-col gap-6 w-[280px] 2xl:w-[340px] z-40">
        <div className="bg-[#091340]/90 backdrop-blur-xl rounded-2xl border border-blue-800/40 p-4 2xl:p-5 shadow-2xl">
           <h2 className="text-xl 2xl:text-2xl font-black text-white uppercase tracking-wider mb-2">
             BERITA
           </h2>

           <div className="flex flex-col gap-0">
             {initialNews.map((item, idx) => (
               <div key={idx} className="group">
                 <a href={`/news/${item.slug}`} className="flex items-center gap-3 2xl:gap-4 py-3 2xl:py-4">
                   {/* Thumbnail */}
                   <div className="w-16 h-16 2xl:w-20 2xl:h-20 shrink-0 bg-[#11194C] rounded-xl overflow-hidden border border-blue-800/30 group-hover:border-yellow-400/50 transition-colors relative">
                     {item.thumbnail_url ? (
                       <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                     ) : (
                       <div className="w-full h-full bg-blue-900/30 flex items-center justify-center">
                         <div className="w-8 h-8 bg-blue-800/50 rounded-full" />
                       </div>
                     )}
                   </div>
                   
                   {/* Text */}
                   <div className="flex flex-col justify-center gap-1 flex-1">
                     {item.event_id?.name && (
                       <span className="text-[9px] 2xl:text-[10px] font-bold text-gray-400 uppercase tracking-wider line-clamp-1">
                         {item.event_id.name}
                       </span>
                     )}
                     <h4 className="text-xs 2xl:text-sm font-bold text-white leading-snug line-clamp-2 group-hover:text-blue-200 transition-colors">
                       {item.title}
                     </h4>
                     <span className="text-[10px] 2xl:text-[11px] text-gray-400 font-medium">
                       {item.published_at ? new Date(item.published_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                     </span>
                   </div>
                 </a>
                 {/* Separator line between items, except the last one */}
                 {idx < initialNews.length - 1 && (
                   <div className="w-full h-[1px] bg-white/10" />
                 )}
               </div>
             ))}
             {initialNews.length === 0 && (
               <p className="text-blue-300 text-sm text-center py-8">Belum ada berita terbaru</p>
             )}
           </div>
           
           {initialNews.length > 0 && (
              <div className="mt-2 pt-4 border-t border-white/10 text-center">
                <a href="/news" className="text-[10px] 2xl:text-xs font-bold text-yellow-400 hover:text-yellow-300 uppercase tracking-wider flex items-center justify-center gap-2">
                  LIHAT SEMUA BERITA
                </a>
              </div>
           )}
        </div>
      </aside>
    </div>
  );
}