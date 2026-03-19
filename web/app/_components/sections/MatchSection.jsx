"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { MatchCard } from "../match-stuff/MatchCard";

// data mock, ganti dengan fetch Directus:
// readItems("matches", {
//   filter: { status: { _eq: "live" } },
//   fields: ["*",
//     "competition_category.name", "competition_category.participant_type",
//     "format.match_type", "format.modules",
//     "home_participant.name", "home_participant.institution.*",
//     "away_participant.name", "away_participant.institution.*",
//     "event.name", "event.card_image_url"],
// })
const MOCK_MATCHES = [
  {
    id: "m1", status: "live", match_name: null, round: "Final", venue: "Lapangan B Gor Utama",
    competition_category: { name: "Kumite -60kg Putra", participant_type: "individual" },
    event: { name: "Forkix IPB Cup 2026", card_image_url: "https://images.unsplash.com/photo-1555597673-b21d5c935865?w=400&q=80" },
    format: { match_type: "head_to_head", modules: [{ type: "score_timed", config: {} }, { type: "timer", config: { mode: "countdown", duration: 300 } }] },
    home_participant: { name: "Gilang M.", institution: { name: "IPB University", logo_url: "https://upload.wikimedia.org/wikipedia/id/f/f9/IPB_University_Logo.svg", color: "#1D4ED8" } },
    away_participant: { name: "Alzabur I.", institution: { name: "UPNVYK", logo_url: "https://upload.wikimedia.org/wikipedia/commons/8/8f/UPNVY_logo.png", color: "#DC2626" } },
    live_state: { homeScore: 3, awayScore: 4, timerSecs: 242, timerRunning: true, timerLastStarted: new Date(Date.now() - 30000).toISOString() },
  },
  {
    id: "m2", status: "live", match_name: "IT-Today HackToday", round: null, venue: "Auditorium AHN",
    competition_category: { name: "Hackathon", participant_type: "team" },
    event: { name: "HackToday", card_image_url: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&q=80" },
    format: { match_type: "open", modules: [{ type: "manual_pick", config: { top_n: 3 } }, { type: "timer", config: { mode: "countdown", duration: 1800 } }] },
    participant_ids: Array.from({ length: 12 }, (_, i) => `hp${i}`),
    live_state: { winner: null, timerSecs: 1560, timerRunning: true, timerLastStarted: new Date(Date.now() - 120000).toISOString() },
  },
  {
    id: "m3", status: "live", match_name: null, round: "1/2", venue: "AgriValo Tournament",
    competition_category: { name: "AgriValo Esports", participant_type: "team" },
    event: { name: "AgriValo Cup", card_image_url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&q=80" },
    format: { match_type: "head_to_head", modules: [{ type: "score_sets", config: { max_sets: 5, sets_to_win: 3 } }] },
    home_participant: { name: "Paper Rex", institution: { name: "IPB University", logo_url: "https://upload.wikimedia.org/wikipedia/id/f/f9/IPB_University_Logo.svg", color: "#0891B2" } },
    away_participant: { name: "Rex Regum Qeon", institution: { name: "Labkom Hall B", logo_url: null, color: "#7C3AED" } },
    live_state: { setsWon: [1, 1], setScore: [12, 5], setLog: [{ home: 21, away: 17 }, { home: 13, away: 21 }] },
  },
  {
    id: "m4", status: "live", match_name: "Open Charity Golf Tournament", round: null, venue: "Sawah Belakang IPB",
    competition_category: { name: "Golf Open", participant_type: "individual" },
    event: { name: "IPB Golf Open", card_image_url: "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=400&q=80" },
    format: { match_type: "open", modules: [{ type: "finish_time", config: { unit: "min" } }, { type: "timer", config: { mode: "countdown", duration: 1800 } }] },
    participant_ids: Array.from({ length: 5 }, (_, i) => `gp${i}`),
    live_state: { timeLog: [{ name: "Reza A.", time: "1:02.4" }, { name: "Bambang S.", time: "1:08.1" }], timerSecs: 660, timerRunning: true, timerLastStarted: new Date(Date.now() - 600000).toISOString() },
  },
  {
    id: "m5", status: "live", match_name: null, round: "Babak Penyisihan", venue: "Panggung A",
    competition_category: { name: "Solo Vocal", participant_type: "individual" },
    event: { name: "Seni IPB 2026", card_image_url: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400&q=80" },
    format: { match_type: "solo", modules: [{ type: "judge_scores", config: { num_judges: 5, method: "avg" } }] },
    home_participant: { name: "Gilang Muhamad", institution: { name: "IPB University", logo_url: "https://upload.wikimedia.org/wikipedia/id/f/f9/IPB_University_Logo.svg", color: "#1D4ED8" } },
    live_state: { judgeScores: [7.5, 8.2, 7.8, 8.0, 7.9] },
  },
  {
    id: "m6", status: "live", match_name: null, round: "Semifinal", venue: "Lapangan Futsal GOR",
    competition_category: { name: "Futsal Putra", participant_type: "team" },
    event: { name: "IPB Sports Week", card_image_url: "https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=400&q=80" },
    format: { match_type: "head_to_head", modules: [{ type: "score_timed", config: {} }, { type: "timer", config: { mode: "countdown", duration: 2700 } }] },
    home_participant: { name: "FAPERTA FC", institution: { name: "Fak. Pertanian", logo_url: "https://upload.wikimedia.org/wikipedia/id/f/f9/IPB_University_Logo.svg", color: "#16A34A" } },
    away_participant: { name: "FASILKOM XI", institution: { name: "Fak. Ilkom", logo_url: null, color: "#EA580C" } },
    live_state: { homeScore: 2, awayScore: 1, timerSecs: 1260, timerRunning: true, timerLastStarted: new Date(Date.now() - 420000).toISOString() },
  },
];

// delay stagger per slot, tambahin sesuai kebutuhan
const STAGGER   = [0, 120, 240, 360];
const ANIM_DUR  = "1s";
const ANIM_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

// pantau lebar kontainer
function useContainerWidth(ref) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

export default function LiveMatchesSection() {
  const sectionRef = useRef(null);
  const cw = useContainerWidth(sectionRef);

  // visible jadi true sekali waktu section masuk viewport, ga balik lagi
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // balik style animasi atau opacity 0 kalau belum visible
  const anim = (slot) => visible
    ? { animation: `section-intro ${ANIM_DUR} ${ANIM_EASE} ${STAGGER[slot]}ms both` }
    : { opacity: 0 };

  const sectionStyle = useMemo(() => ({
    // padding: `${stage === 3 ? 80 : 150}px 0 0 0`,
    minHeight: "100vh",
    position: "relative",
    zIndex: 2,
    background: "#0D26C2",
    // boxShadow: "0 -30px 60px rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    color: "white",
    overflow: "hidden",
  }), []);

  return (
    <section ref={sectionRef} style={sectionStyle}>
      <style>{`
        @keyframes section-intro {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* heading */}
      <div style={anim(0)}>
        {/* tulis heading kamu di sini */}
      </div>

      {/* card strip */}
      <div style={anim(1)}>
        {MOCK_MATCHES.map((match) => (
          <MatchCard key={match.id} match={match}>
            {(card) => (
              // semua data ada di card:
              // card.match, card.live, card.event, card.cat
              // card.isH2H, card.isSolo, card.isOpen
              // card.engineType, card.label
              // card.home, card.away, card.homeInst, card.awayInst
              //
              // card.Timer pakai render prop:
              //   <card.Timer>{({ secs, formatted, isRunning, isStopwatch }) => ...}</card.Timer>
              //
              // card.Score pakai render props:
              //   <card.Score
              //     renderScoreTimed={({ home, away }) => ...}
              //     renderScoreSets={({ setsWon, setScore, setLog }) => ...}
              //     renderJudgeScore={({ scores, result, method }) => ...}
              //     renderFinishTime={({ timeLog }) => ...}
              //     renderManualPick={({ winner, count, rankings }) => ...}
              //   />
              <div key={match.id}>
                {/* tulis layout card kamu di sini */}
              </div>
            )}
          </MatchCard>
        ))}
      </div>
    </section>
  );
}