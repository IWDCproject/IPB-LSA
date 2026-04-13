"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { MapPin, Clock } from "lucide-react";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Helper Components ---

function ScoreSets({ live }: { live: any }) {
  if (!live || !live.setLog) return null;
  
  const sets = [0, 1, 2].map(idx => {
    const log = live.setLog[idx];
    const current = live.setIdx === idx && live.matchStatus === 'live';
    return {
      label: `Set ${idx + 1}`,
      home: log ? log.home : (current ? live.setScore[0] : "-"),
      away: log ? log.away : (current ? live.setScore[1] : "-"),
      active: current
    };
  });

  return (
    <div className="flex gap-2 text-center items-center h-full">
      {sets.map((s, i) => (
        <div key={i} className="flex flex-col gap-1 items-center">
          <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">{s.label}</span>
          <div className={cn(
            "w-8 py-1 rounded flex flex-col items-center justify-center font-bold text-sm",
            s.active ? "bg-yellow-500 text-black" : "bg-[#14225D] text-white"
          )}>
            <span>{s.home}</span>
            <span className="text-[10px] opacity-50 my-0.5">-</span>
            <span>{s.away}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function MatchCard({ match }: { match: any }) {
  const live = match.live_state;
  const format = match.competition_category?.format_id;
  const isSets = format?.match_type === 'head_to_head' && format?.modules?.some((m: any) => m.type === 'score_sets');
  const isSolo = format?.match_type === 'solo';
  const isOpen = format?.match_type === 'open';

  const status = match.status; // 'live', 'upcoming', 'finished'
  
  const getBadgeStyle = (status: string) => {
    switch (status) {
      case 'live': return 'bg-red-900/60 text-red-500 border border-red-500/30';
      case 'upcoming': return 'bg-gray-600/60 text-gray-400 border border-gray-500/30';
      case 'finished': return 'bg-green-900/60 text-green-500 border border-green-500/30';
      default: return 'bg-gray-600/60 text-gray-400 border border-gray-500/30';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'live': return 'LIVE NOW';
      case 'upcoming': return 'UPCOMING';
      case 'finished': return 'FINISHED';
      default: return 'UPCOMING';
    }
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="bg-[#091340] rounded-xl p-5 flex flex-col md:flex-row justify-between items-center w-full mb-3 shadow-lg border border-blue-900/30"
    >
      {/* Kolom Kiri: Info Pertandingan */}
      <div className="flex flex-col items-start w-full md:w-[30%] mb-4 md:mb-0">
        <span className="text-[10px] text-yellow-500 font-bold bg-[#14225D] px-2 py-1 rounded mb-2 uppercase border border-blue-800/50">
          {match.competition_category?.name || "Kategori"}
        </span>
        <h3 className="text-white text-xl font-bold uppercase leading-tight">{match.match_name || "Match Event"}</h3>
        <div className="text-gray-400 text-sm mt-2 flex flex-col gap-1">
          <span className="flex items-center gap-2">
            <Clock size={14} className="text-yellow-500" />
            {match.scheduled_at ? new Date(match.scheduled_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : "--:--"} WIB
          </span>
          <span className="flex items-center gap-2">
            <MapPin size={14} className="text-yellow-500" />
            {match.venue || "TBD"}
          </span>
        </div>
      </div>

      {/* Kolom Tengah: Tim & Skor */}
      <div className="flex justify-center items-center w-full md:w-[50%] gap-4">
        {isSolo || isOpen ? (
           <div className="flex flex-col items-center gap-1 w-full">
             <span className="text-white font-bold text-lg uppercase text-center">
               {match.home_participant?.name || match.match_name}
             </span>
             {match.home_participant?.members && (
               <span className="text-slate-400 text-xs font-medium text-center">
                 {JSON.parse(match.home_participant.members).join(", ")}
               </span>
             )}
           </div>
        ) : (
          <>
            {/* Tim A */}
            <div className="flex items-center gap-3 w-[40%] justify-end">
              <span className="text-white font-bold text-base md:text-xl uppercase text-right leading-tight">
                {match.home_participant?.name || "TBA"}
              </span>
              <div className="w-10 h-10 md:w-14 md:h-14 bg-white rounded-full flex items-center justify-center overflow-hidden shrink-0">
                {match.home_participant?.institution?.logo_url ? (
                  <img src={match.home_participant.institution.logo_url} alt="" className="w-full h-full object-contain p-1.5" />
                ) : <div className="w-full h-full bg-slate-200" />}
              </div>
            </div>

            {/* Skor */}
            <div className="flex items-center justify-center shrink-0 w-[20%]">
              {isSets ? (
                <ScoreSets live={live} />
              ) : (
                <div className="text-white font-black text-3xl md:text-5xl text-center flex items-center gap-3">
                  {status === 'upcoming' ? (
                    <span className="text-2xl text-slate-500 font-bold italic">VS</span>
                  ) : (
                    <>
                      <span>{live?.homeScore ?? 0}</span>
                      <span className="text-slate-500 font-medium text-2xl md:text-3xl">-</span>
                      <span>{live?.awayScore ?? 0}</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Tim B */}
            <div className="flex items-center gap-3 w-[40%] justify-start">
              <div className="w-10 h-10 md:w-14 md:h-14 bg-white rounded-full flex items-center justify-center overflow-hidden shrink-0">
                {match.away_participant?.institution?.logo_url ? (
                  <img src={match.away_participant.institution.logo_url} alt="" className="w-full h-full object-contain p-1.5" />
                ) : <div className="w-full h-full bg-slate-200" />}
              </div>
              <span className="text-white font-bold text-base md:text-xl uppercase text-left leading-tight">
                {match.away_participant?.name || "TBA"}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Kolom Kanan: Status Badge */}
      <div className="flex justify-end w-full md:w-[20%] mt-4 md:mt-0">
        <span className={cn(
          "px-4 py-1.5 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-widest",
          getBadgeStyle(status)
        )}>
          {getStatusLabel(status)}
        </span>
      </div>
    </motion.div>
  );
}

export default function SchedulePageClient({ initialMatches }: { initialMatches: any[] }) {
  const [activeTab, setActiveTab] = useState<"ALL" | "sport" | "arts">("ALL");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

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
    
    if (activeTab !== "ALL") {
      result = result.filter(m => m.competition_category?.event_id?.type?.toLowerCase() === activeTab.toLowerCase());
    }
    
    if (selectedDate) {
      result = result.filter(m => {
        if (!m.scheduled_at) return false;
        const d = new Date(m.scheduled_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        return d === selectedDate;
      });
    }

    return result;
  }, [initialMatches, activeTab, selectedDate]);

  const groupedByEvent = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredMatches.forEach(m => {
      const eventName = m.competition_category?.event_id?.name || "Other Events";
      if (!groups[eventName]) groups[eventName] = [];
      groups[eventName].push(m);
    });
    return groups;
  }, [filteredMatches]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#0D26C2] from-40% to-[#06125C] pt-6 pb-24 font-sans selection:bg-yellow-500 selection:text-blue-900">
      <div className="max-w-6xl mx-auto px-4">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 pt-8 relative">
          
          {/* Left Title */}
          <div className="relative z-10 w-full md:w-auto">
            <div className="flex items-end gap-4 relative">
              <h1 className="text-5xl md:text-[70px] font-display font-normal uppercase tracking-wide leading-[1] mt-2">
                <span className="text-white drop-shadow-md">MATCH & EVENT</span> <br />
                <span className="text-yellow-400 drop-shadow-md">SCHEDULES</span>
              </h1>
              
              {/* Mascots for Desktop */}
              <div className="hidden md:flex absolute -right-60 bottom-0 items-end gap-0">
                <img src="/maskot/Cowok%20Suka.png" alt="Mascot" className="w-36 h-36 object-contain relative z-10 hover:scale-105 transition-transform drop-shadow-xl" />
                <img src="/maskot/Cewek%20Semangat.png" alt="Mascot" className="w-36 h-36 object-contain relative z-20 -ml-8 hover:scale-105 transition-transform drop-shadow-xl" />
              </div>
            </div>
            <p className="text-white text-xs md:text-sm mt-3 font-semibold tracking-wide bg-blue-900/30 w-fit px-3 py-1 rounded-full border border-blue-400/20 backdrop-blur-sm">
              PANTAU JADWAL DARI SELURUH KOMPETISI OLAHRAGA DAN SENI.
            </p>
          </div>

          {/* Right Tabs */}
          <div className="mt-8 md:mt-0 flex bg-[#091340] rounded-xl overflow-hidden shadow-lg border border-blue-800/50">
            {(["ALL", "sport", "arts"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-6 py-2 md:py-3 text-xs md:text-sm font-bold uppercase transition-all",
                  activeTab === tab ? "bg-yellow-400 text-black" : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                {tab === "sport" ? "SPORTS" : tab === "arts" ? "ARTS" : "ALL"}
              </button>
            ))}
          </div>
        </div>

        {/* Date Selector */}
        <div className="flex gap-3 mb-10 overflow-x-auto pb-4 scrollbar-hide">
          {uniqueDates.map(date => {
            const isToday = date === new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
            return (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all shadow-md",
                  selectedDate === date 
                    ? "bg-yellow-400 text-black scale-105 transform" 
                    : "bg-[#091340] text-gray-400 hover:text-white border border-blue-800/50 hover:bg-[#0c1a5c]"
                )}
              >
                {date} {isToday && "(Hari ini)"}
              </button>
            );
          })}
        </div>

        {/* Schedule Content */}
        <div className="flex flex-col gap-10">
          <AnimatePresence mode="wait">
            {Object.keys(groupedByEvent).length > 0 ? (
              Object.entries(groupedByEvent).map(([eventName, matches]) => (
                <motion.section 
                  key={eventName}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col gap-4"
                >
                  <div className="flex items-center gap-6 mb-2">
                    <h2 className="text-2xl md:text-3xl font-bold text-white uppercase tracking-wide shrink-0 drop-shadow-lg">
                      {eventName}
                    </h2>
                    <div className="h-px bg-blue-400/30 flex-1 mt-1" />
                  </div>

                  <div className="flex flex-col gap-3">
                    {matches.map(match => (
                      <MatchCard key={match.id} match={match} />
                    ))}
                  </div>
                </motion.section>
              ))
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-24 text-center bg-[#091340]/50 rounded-2xl border border-blue-800/30 backdrop-blur-sm"
              >
                <div className="w-16 h-16 bg-blue-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="text-blue-400" size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-300 uppercase tracking-widest">No matches found</h3>
                <p className="text-slate-500 text-sm mt-2">Try selecting a different date or category.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Mascot Area */}
        {Object.keys(groupedByEvent).length > 0 && (
          <div className="mt-20 relative flex flex-col items-center justify-center pb-10">
             <motion.img 
               initial={{ y: 50, opacity: 0 }}
               whileInView={{ y: 0, opacity: 1 }}
               viewport={{ once: true }}
               src="/maskot/Cowok%20Suka.png" 
               alt="Maskot" 
               className="w-48 h-48 md:w-56 md:h-56 object-contain drop-shadow-2xl hover:scale-105 transition-transform" 
             />
          </div>
        )}
      </div>
    </div>
  );
}
