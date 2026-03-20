"use client";
import { useState, useEffect, useRef } from "react";
import { MatchCard } from "../match-stuff/MatchCard";
import { MatchTable } from "../match-stuff/MatchTable";
import Button from "@/components/Button";

import ipbLogo from "@/public/mock-data/ipblogo.png";
import upnLogo from "@/public/mock-data/upnlogo.png";
import uiLogo from "@/public/mock-data/uilogo.png";
import ugmLogo from "@/public/mock-data/ugmlogo.png";
import itbLogo from "@/public/mock-data/itblogo.png";

const BB = { fontFamily: "'Bebas Neue', sans-serif" };
const JK = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

// ─── Layout constants ─────────────────────────────────────────────────────────

const CARD_H   = 280;
const CARD_GAP = 14;
const CTA_W    = 240;
const H_MARGIN = 160;
const SHOW_MAX = 4;

const STAGGER   = [0, 80, 160, 240, 320, 400, 480];
const ANIM_DUR  = "1s";
const ANIM_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

// ─── Participants shorthand ───────────────────────────────────────────────────

const IPB  = { name: "IPB University",    logo_url: ipbLogo.src, color: "#1D4ED8" };
const UPN  = { name: "UPNVYK",            logo_url: upnLogo.src, color: "#DC2626" };
const UI   = { name: "Universitas Indonesia", logo_url: uiLogo.src,    color: "#7C3AED" };
const UGM  = { name: "UGM",               logo_url: ugmLogo.src,        color: "#059669" };
const ITB  = { name: "ITB",               logo_url: itbLogo.src,        color: "#EA580C" };

// ─── Mock data — ALL engine × match_type combinations ────────────────────────
// TODO: [DEMO] Remove this entire block and replace with Directus fetch

// score_timed + head_to_head + timer countdown
const M_SCORE_TIMED_H2H = {
  id: "m1", status: "live", match_name: null, round: "Final", venue: "Lapangan B GOR Utama",
  competition_category: { name: "Kumite -60kg Putra", participant_type: "individual" },
  event: { name: "Forkix IPB Cup 2026", card_image_url: "https://images.unsplash.com/photo-1555597673-b21d5c935865?w=400&q=80" },
  format: { match_type: "head_to_head", modules: [{ type: "score_timed", config: {} }, { type: "timer", config: { mode: "countdown", duration: 300 } }] },
  home_participant: { name: "Gilang M.", institution: IPB },
  away_participant: { name: "Alzabur I.", institution: UPN },
  live_state: { homeScore: 3, awayScore: 4, timerSecs: 242, timerRunning: true, timerLastStarted: new Date(Date.now() - 30000).toISOString() },
};

// score_sets + head_to_head (no timer)
const M_SCORE_SETS_H2H = {
  id: "m2", status: "live", match_name: null, round: "1/2", venue: "Lapangan Badminton A",
  competition_category: { name: "Badminton Ganda Putra", participant_type: "team" },
  event: { name: "IPB Sports Week", card_image_url: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=400&q=80" },
  format: { match_type: "head_to_head", modules: [{ type: "score_sets", config: { max_sets: 5, sets_to_win: 3 } }] },
  home_participant: { name: "FAPERTA A", institution: IPB },
  away_participant: { name: "RRQ Bogor", institution: UGM },
  live_state: { setsWon: [1, 1], setScore: [12, 5], setLog: [{ home: 21, away: 17 }, { home: 13, away: 21 }] },
};

// judge_scores + solo
const M_JUDGE_SOLO = {
  id: "m3", status: "live", match_name: null, round: "Babak Penyisihan", venue: "Panggung A",
  competition_category: { name: "Solo Vocal", participant_type: "individual" },
  event: { name: "Seni IPB 2026", card_image_url: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400&q=80" },
  format: { match_type: "solo", modules: [{ type: "judge_scores", config: { num_judges: 5, method: "avg" } }] },
  home_participant: { name: "Gilang Muhamad", institution: IPB },
  live_state: { judgeScores: [7.5, 8.2, 7.8, 8.0, 7.9] },
};

// finish_time + open + timer countdown
const M_FINISH_TIME_OPEN = {
  id: "m4", status: "live", match_name: "Open Charity Golf Tournament", round: null, venue: "Sawah Belakang IPB",
  competition_category: { name: "Golf Open", participant_type: "individual" },
  event: { name: "IPB Golf Open", card_image_url: "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=400&q=80" },
  format: { match_type: "open", modules: [{ type: "finish_time", config: { unit: "min" } }, { type: "timer", config: { mode: "countdown", duration: 1800 } }] },
  participant_ids: Array.from({ length: 5 }, (_, i) => `gp${i}`),
  live_state: { timeLog: [{ name: "Reza A.", time: "1:02.4", institution: IPB }, { name: "Bambang S.", time: "1:08.1", institution: IPB }], timerSecs: 660, timerRunning: true, timerLastStarted: new Date(Date.now() - 600000).toISOString() },
};

// finish_time + solo
const M_FINISH_TIME_SOLO = {
  id: "m5", status: "live", match_name: null, round: "Heat 1", venue: "Kolam Renang IPB",
  competition_category: { name: "Renang 100m Gaya Bebas", participant_type: "individual" },
  event: { name: "IPB Swimming Championship", card_image_url: "https://images.unsplash.com/photo-1560090995-01632a28895b?w=400&q=80" },
  format: { match_type: "solo", modules: [{ type: "finish_time", config: { unit: "s" } }, { type: "timer", config: { mode: "stopwatch", duration: 0 } }] },
  home_participant: { name: "Arya Faiz", institution: IPB },
  live_state: { timeLog: [], timerSecs: 0, timerRunning: true, timerLastStarted: new Date(Date.now() - 45000).toISOString() },
};

// manual_pick + head_to_head + timer countdown
const M_MANUAL_H2H = {
  id: "m6", status: "live", match_name: null, round: "Semifinal", venue: "Lapangan B",
  competition_category: { name: "Kata Perorang Putra", participant_type: "individual" },
  event: { name: "Forkix IPB Cup 2026", card_image_url: "https://images.unsplash.com/photo-1555597673-b21d5c935865?w=400&q=80" },
  format: { match_type: "head_to_head", modules: [{ type: "manual_pick", config: { allow_draw: false } }, { type: "timer", config: { mode: "countdown", duration: 180 } }] },
  home_participant: { name: "Dimas K.", institution: UI },
  away_participant: { name: "Agus M.", institution: UPN },
  live_state: { winner: null, timerSecs: 95, timerRunning: true, timerLastStarted: new Date(Date.now() - 40000).toISOString() },
};

// manual_pick + open + timer countdown
const M_MANUAL_OPEN = {
  id: "m7", status: "live", match_name: "IT-Today HackToday", round: null, venue: "Auditorium AHN",
  competition_category: { name: "Hackathon", participant_type: "team" },
  event: { name: "HackToday", card_image_url: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&q=80" },
  format: { match_type: "open", modules: [{ type: "manual_pick", config: { top_n: 3, ranked_order: true } }, { type: "timer", config: { mode: "countdown", duration: 1800 } }] },
  participant_ids: Array.from({ length: 12 }, (_, i) => `Team ${i + 1}`),
  live_state: { winner: null, timerSecs: 1560, timerRunning: true, timerLastStarted: new Date(Date.now() - 120000).toISOString() },
};

// All 7 live matches
const ALL_LIVE = [M_SCORE_TIMED_H2H, M_SCORE_SETS_H2H, M_JUDGE_SOLO, M_FINISH_TIME_OPEN, M_FINISH_TIME_SOLO, M_MANUAL_H2H, M_MANUAL_OPEN];

// ─── Upcoming versions of the same matches (for table) ───────────────────────
// TODO: [DEMO] Remove this block and replace with Directus fetch: filter: { status: { _eq: "upcoming" } }

const MOCK_UPCOMING = [
  {
    id: "u1", status: "upcoming", round: "Final", venue: "Lapangan B GOR Utama",
    scheduled_at: new Date(Date.now() + 3600000).toISOString(),
    competition_category: { name: "Kumite -60kg Putra", participant_type: "individual" },
    event: { name: "Forkix IPB Cup 2026" },
    format: { match_type: "head_to_head", modules: [{ type: "score_timed", config: {} }] },
    home_participant: { name: "Gilang M.", institution: IPB },
    away_participant: { name: "Alzabur I.", institution: UPN },
    live_state: {},
  },
  {
    id: "u2", status: "upcoming", round: "Semifinal", venue: "Lapangan Badminton A",
    scheduled_at: new Date(Date.now() + 5400000).toISOString(),
    competition_category: { name: "Badminton Ganda Putra", participant_type: "team" },
    event: { name: "IPB Sports Week" },
    format: { match_type: "head_to_head", modules: [{ type: "score_sets", config: { max_sets: 5, sets_to_win: 3 } }] },
    home_participant: { name: "FAPERTA A", institution: IPB },
    away_participant: { name: "RRQ Bogor", institution: UGM },
    live_state: {},
  },
  {
    id: "u3", status: "upcoming", round: "Babak 8 Besar", venue: "Panggung A",
    scheduled_at: new Date(Date.now() + 7200000).toISOString(),
    competition_category: { name: "Solo Vocal", participant_type: "individual" },
    event: { name: "Seni IPB 2026" },
    format: { match_type: "solo", modules: [{ type: "judge_scores", config: { num_judges: 5, method: "avg" } }] },
    home_participant: { name: "Nadia R.", institution: IPB },
    live_state: {},
  },
  {
    id: "u4", status: "upcoming", match_name: "Open Charity Golf Tournament", venue: "Sawah Belakang IPB",
    scheduled_at: new Date(Date.now() + 9000000).toISOString(),
    competition_category: { name: "Golf Open", participant_type: "individual" },
    event: { name: "IPB Golf Open" },
    format: { match_type: "open", modules: [{ type: "finish_time", config: { unit: "min" } }] },
    participant_ids: Array.from({ length: 5 }, (_, i) => `Golfer ${i + 1}`),
    live_state: {},
  },
  {
    id: "u5", status: "upcoming", round: "Heat 2", venue: "Kolam Renang IPB",
    scheduled_at: new Date(Date.now() + 10800000).toISOString(),
    competition_category: { name: "Renang 100m Gaya Bebas", participant_type: "individual" },
    event: { name: "IPB Swimming Championship" },
    format: { match_type: "solo", modules: [{ type: "finish_time", config: { unit: "s" } }] },
    home_participant: { name: "Bima S.", institution: ITB },
    live_state: {},
  },
  {
    id: "u6", status: "upcoming", round: "Final", venue: "Lapangan B",
    scheduled_at: new Date(Date.now() + 12600000).toISOString(),
    competition_category: { name: "Kata Perorang Putra", participant_type: "individual" },
    event: { name: "Forkix IPB Cup 2026" },
    format: { match_type: "head_to_head", modules: [{ type: "manual_pick", config: { allow_draw: false } }] },
    home_participant: { name: "Dimas K.", institution: UI },
    away_participant: { name: "Agus M.", institution: UPN },
    live_state: {},
  },
  {
    id: "u7", status: "upcoming", match_name: "IT-Today HackToday Grand Final", venue: "Auditorium AHN",
    scheduled_at: new Date(Date.now() + 14400000).toISOString(),
    competition_category: { name: "Hackathon", participant_type: "team" },
    event: { name: "HackToday" },
    format: { match_type: "open", modules: [{ type: "manual_pick", config: { top_n: 3 } }] },
    participant_ids: Array.from({ length: 12 }, (_, i) => `Team ${i + 1}`),
    live_state: {},
  },
];

// finished versions — same matches but with results filled in
// TODO: [DEMO] Remove this block
const MOCK_FINISHED = [
  {
    id: "f1", status: "finished", round: "Final", venue: "Lapangan B GOR Utama",
    scheduled_at: new Date(Date.now() - 3600000).toISOString(),
    competition_category: { name: "Kumite -60kg Putra", participant_type: "individual" },
    event: { name: "Forkix IPB Cup 2026" },
    format: { match_type: "head_to_head", modules: [{ type: "score_timed", config: {} }] },
    home_participant: { name: "Gilang M.", institution: IPB },
    away_participant: { name: "Alzabur I.", institution: UPN },
    live_state: { homeScore: 5, awayScore: 3 },
  },
  {
    id: "f2", status: "finished", round: "Semifinal", venue: "Lapangan Badminton A",
    scheduled_at: new Date(Date.now() - 3600000).toISOString(),
    competition_category: { name: "Badminton Ganda Putra", participant_type: "team" },
    event: { name: "IPB Sports Week" },
    format: { match_type: "head_to_head", modules: [{ type: "score_sets", config: { max_sets: 5, sets_to_win: 3 } }] },
    home_participant: { name: "FAPERTA A", institution: IPB },
    away_participant: { name: "RRQ Bogor", institution: UGM },
    live_state: { setsWon: [3, 1], setLog: [{ home: 21, away: 17 }, { home: 13, away: 21 }, { home: 24, away: 22 }, { home: 21, away: 15 }] },
  },
  {
    id: "f3", status: "finished", round: "Babak 8 Besar", venue: "Panggung A",
    scheduled_at: new Date(Date.now() - 3600000).toISOString(),
    competition_category: { name: "Solo Vocal", participant_type: "individual" },
    event: { name: "Seni IPB 2026" },
    format: { match_type: "solo", modules: [{ type: "judge_scores", config: { num_judges: 5, method: "avg" } }] },
    home_participant: { name: "Nadia R.", institution: IPB },
    live_state: { judgeScores: [7.5, 8.2, 7.8, 8.0, 7.9] },
  },
  {
    id: "f4", status: "finished", match_name: "Open Charity Golf Tournament", venue: "Sawah Belakang IPB",
    scheduled_at: new Date(Date.now() - 3600000).toISOString(),
    competition_category: { name: "Golf Open", participant_type: "individual" },
    event: { name: "IPB Golf Open" },
    format: { match_type: "open", modules: [{ type: "finish_time", config: { unit: "min" } }] },
    participant_ids: Array.from({ length: 5 }, (_, i) => `Golfer ${i + 1}`),
    live_state: { timeLog: [
      { name: "Reza A.",    time: "1:02.4", institution: IPB },
      { name: "Bambang S.", time: "1:08.1", institution: IPB },
      { name: "Candra W.",  time: "1:10.3", institution: UPN },
    ] },
  },
  {
    id: "f5", status: "finished", round: "Heat 2", venue: "Kolam Renang IPB",
    scheduled_at: new Date(Date.now() - 3600000).toISOString(),
    competition_category: { name: "Renang 100m Gaya Bebas", participant_type: "individual" },
    event: { name: "IPB Swimming Championship" },
    format: { match_type: "solo", modules: [{ type: "finish_time", config: { unit: "s" } }] },
    home_participant: { name: "Bima S.", institution: ITB },
    live_state: { timeLog: [{ name: "Bima S.", time: "58.4s", institution: ITB }] },
  },
  {
    id: "f6", status: "finished", round: "Final", venue: "Lapangan B",
    scheduled_at: new Date(Date.now() - 3600000).toISOString(),
    competition_category: { name: "Kata Perorang Putra", participant_type: "individual" },
    event: { name: "Forkix IPB Cup 2026" },
    format: { match_type: "head_to_head", modules: [{ type: "manual_pick", config: { allow_draw: false } }] },
    home_participant: { name: "Dimas K.", institution: UI },
    away_participant: { name: "Agus M.", institution: UPN },
    live_state: { winner: "IPB University" },
  },
  {
    id: "f7", status: "finished", match_name: "IT-Today HackToday Grand Final", venue: "Auditorium AHN",
    scheduled_at: new Date(Date.now() - 3600000).toISOString(),
    competition_category: { name: "Hackathon", participant_type: "team" },
    event: { name: "HackToday" },
    format: { match_type: "open", modules: [{ type: "manual_pick", config: { top_n: 3 } }] },
    participant_ids: Array.from({ length: 12 }, (_, i) => `Team ${i + 1}`),
    live_state: { winner: "Team Garuda", rankings: [{ rank: 1, name: "Team Garuda" }, { rank: 2, name: "Team Nusantara" }, { rank: 3, name: "Team Langit" }] },
  },
];

function useContainerWidth(ref) {
  const [width, setWidth] = useState(1440);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

// ─── TODO: [DEMO] Remove DemoSwitch component before production ───────────────
const DEMO_MODES = ["live", "upcoming", "finished"];
function DemoSwitch({ mode, onChange }) {
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      background: "rgba(0,0,0,0.85)", borderRadius: 12,
      padding: "10px 14px", display: "flex", alignItems: "center", gap: 8,
      boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
    }}>
      <span style={{ ...JK, fontSize: 11, fontWeight: 700, color: "#aaa", letterSpacing: 1, textTransform: "uppercase", marginRight: 4 }}>
        Demo
      </span>
      {DEMO_MODES.map((m) => (
        <button key={m} onClick={() => onChange(m)} style={{
          ...JK, fontSize: 12, fontWeight: 700,
          border: "none", borderRadius: 6, cursor: "pointer",
          padding: "5px 10px",
          background: mode === m ? "#EAB308" : "rgba(255,255,255,0.1)",
          color: mode === m ? "#000" : "#fff",
        }}>
          {m}
        </button>
      ))}
    </div>
  );
}
// ─── END DEMO ─────────────────────────────────────────────────────────────────

// ─── Section ─────────────────────────────────────────────────────────────────

export default function LiveMatchesSection() {
  const sectionRef = useRef(null);
  const cw         = useContainerWidth(sectionRef);

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

  const anim = (slot) => visible
    ? { animation: `live-intro ${ANIM_DUR} ${ANIM_EASE} ${STAGGER[slot]}ms both` }
    : { opacity: 0 };

  // TODO: [DEMO] Remove demoMode state and DemoSwitch — replace with real Directus data
  const [demoMode, setDemoMode] = useState("finished");

  // TODO: [DEMO] Always use ALL_LIVE for cards, MOCK_UPCOMING for table — remove branching
  const cardMatches = demoMode === "live"
    ? ALL_LIVE.slice(0, SHOW_MAX)
    : MOCK_UPCOMING.slice(0, SHOW_MAX);

  const tableMatches = demoMode === "live"     ? ALL_LIVE
    : demoMode === "finished"  ? MOCK_FINISHED
    : MOCK_UPCOMING;

  const tableTitle = demoMode === "live"    ? "Live Matches"
    : demoMode === "finished" ? "Finished Matches"
    : "Upcoming Matches";

  const scale  = Math.min(1, cw / 1440);
  const margin = Math.round(H_MARGIN * scale);

  return (
    <section ref={sectionRef} style={{
      minHeight: "100vh",
      position: "relative",
      zIndex: 2,
      background: "#0D26C2",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      color: "white",
      overflow: "hidden",
      padding: "150px 0",
    }}>
      <style>{`
        @keyframes live-intro {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{
        width: "100%",
        paddingLeft: margin,
        paddingRight: margin,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 32,
      }}>

        {/* heading */}
        <div style={anim(0)}>
          <div style={{ ...BB, fontSize: "4rem", lineHeight: 1, color: "#fff", filter: "drop-shadow(0 4px 4px rgba(0,0,0,0.25))" }}>
            Live Matches
          </div>
        </div>

        {/* card strip */}
        <div style={{ ...anim(1), display: "flex", flexDirection: "row", gap: CARD_GAP }}>
          {cardMatches.map((match, i) => (
            <div key={match.id} style={{ ...anim(i + 2), flex: 1, minWidth: 0 }}>
              <div style={{
                width: "100%", height: CARD_H,
                overflow: "hidden", borderRadius: 16,
                opacity: match.status === "upcoming" ? 0.45 : 1,
              }}>
                <MatchCard match={match} />
              </div>
            </div>
          ))}

          {/* CTA card */}
          <div style={anim(cardMatches.length + 2)}>
            <div style={{
              width: CTA_W, height: CARD_H, flexShrink: 0,
              border: "2px dashed rgba(255,255,255,0.4)",
              borderRadius: 16, boxSizing: "border-box",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 16, padding: 24,
            }}>
              <div style={{ ...JK, fontSize: 15, fontWeight: 700, color: "#fff", textAlign: "center", lineHeight: 1.4 }}>
                See real time update scores
              </div>
              <Button href="/matches" variant="primary" size="md">See All Matches</Button>
            </div>
          </div>
        </div>

        {/* table — TODO: [DEMO] always pass MOCK_UPCOMING, remove demoMode branching */}
        <div style={anim(cardMatches.length + 3)}>
          <MatchTable matches={tableMatches} groupBy="event" title={tableTitle} />
        </div>

        {/* see more */}
        <div style={{ ...anim(cardMatches.length + 4), display: "flex", justifyContent: "flex-end" }}>
          <Button href="/schedule" variant="primary" size="md">See More</Button>
        </div>

      </div>

      {/* TODO: [DEMO] Uncomment DemoSwitch to use during demo, remove before production */}
      {/* <DemoSwitch mode={demoMode} onChange={setDemoMode} /> */}
    </section>
  );
}