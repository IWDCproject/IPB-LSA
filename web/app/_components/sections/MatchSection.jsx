"use client";
import { useState, useEffect, useRef } from "react";
import { MatchCard } from "../match-stuff/MatchCard";
import { MatchTable } from "../match-stuff/MatchTable";
import Button from "@/components/Button";

import ipbLogo from "@/public/mock-data/ipblogo.png";
import upnLogo from "@/public/mock-data/upnlogo.png";
import uiLogo  from "@/public/mock-data/uilogo.png";
import ugmLogo from "@/public/mock-data/ugmlogo.png";
import itbLogo from "@/public/mock-data/itblogo.png";

const BB = { fontFamily: "'Bebas Neue', sans-serif" };
const JK = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

const CARD_H   = 280;
const CARD_GAP = 10;
const CTA_W    = 240;
const H_MARGIN = 160;
const SHOW_MAX = 5;

const STAGGER_MS = 80;


// institusi shorthand buat mock
const IPB = { name: "IPB University",        logo_url: ipbLogo.src, color: "#1D4ED8" };
const UPN = { name: "UPNVYK",                logo_url: upnLogo.src, color: "#DC2626" };
const UI  = { name: "Universitas Indonesia", logo_url: uiLogo.src,  color: "#7C3AED" };
const UGM = { name: "UGM",                   logo_url: ugmLogo.src, color: "#059669" };
const ITB = { name: "ITB",                   logo_url: itbLogo.src, color: "#EA580C" };

// bikin junction rows match_participants dari array peserta biasa
// bentuk yang direturn Directus: [{ id, position, participant_id: { id, name, institution } }]
function mkParticipants(list) {
  return list.map((p, i) => ({
    id:             `mp-${p.id}`,
    position:       i,
    participant_id: p,
  }));
}

// TODO: ganti dengan fetch Directus GET /items/matches?filter[status][_eq]=live
const LIVE_MATCHES = [
  {
    id: "m1", status: "live", round: "Final", venue: "Lapangan B GOR Utama",
    competition_category: { name: "Kumite -60kg Putra" },
    event: { name: "Forkix IPB Cup 2026", card_image_url: "https://images.unsplash.com/photo-1555597673-b21d5c935865?w=400&q=80" },
    format: { match_type: "head_to_head", modules: [{ type: "score_timed", config: {} }, { type: "timer", config: { mode: "countdown", duration: 300 } }] },
    home_participant: { name: "Gilang M.", institution: IPB },
    away_participant: { name: "Alzabur I.", institution: UPN },
    live_state: { homeScore: 3, awayScore: 4, timerSecs: 242, timerRunning: true, timerLastStarted: new Date(Date.now() - 30000).toISOString() },
  },
  {
    id: "m2", status: "live", round: "1/2", venue: "Lapangan Badminton A",
    competition_category: { name: "Badminton Ganda Putra" },
    event: { name: "IPB Sports Week", card_image_url: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=400&q=80" },
    format: { match_type: "head_to_head", modules: [{ type: "score_sets", config: { max_sets: 5, sets_to_win: 3 } }] },
    home_participant: { name: "FAPERTA A", institution: IPB },
    away_participant: { name: "RRQ Bogor", institution: UGM },
    live_state: { setsWon: [1, 1], setScore: [12, 5], setLog: [{ home: 21, away: 17 }, { home: 13, away: 21 }] },
  },
  {
    id: "m3", status: "live", round: "Babak Penyisihan", venue: "Panggung A",
    competition_category: { name: "Solo Vocal" },
    event: { name: "Seni IPB 2026", card_image_url: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400&q=80" },
    format: { match_type: "solo", modules: [{ type: "judge_scores", config: { num_judges: 5, method: "avg" } }] },
    home_participant: { name: "Gilang Muhamad", institution: IPB },
    live_state: { judgeScores: [7.5, 8.2, 7.8, 8.0, 7.9] },
  },
  {
    id: "m4", status: "live", match_name: "Open Charity Golf Tournament", venue: "Sawah Belakang IPB",
    competition_category: { name: "Golf Open" },
    event: { name: "IPB Golf Open", card_image_url: "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=400&q=80" },
    format: { match_type: "open", modules: [{ type: "finish_time", config: { unit: "min" } }, { type: "timer", config: { mode: "countdown", duration: 1800 } }] },
    participants: mkParticipants([
      { id: "gp1", name: "Reza A.",    institution: IPB },
      { id: "gp2", name: "Bambang S.", institution: UPN },
      { id: "gp3", name: "Candra W.",  institution: UI  },
      { id: "gp4", name: "Dani R.",    institution: UGM },
      { id: "gp5", name: "Eko P.",     institution: ITB },
    ]),
    live_state: {
      timeLog: [
        { name: "Reza A.",    time: "1:02.4", institution: IPB },
        { name: "Bambang S.", time: "1:08.1", institution: UPN },
      ],
      timerSecs: 660, timerRunning: true, timerLastStarted: new Date(Date.now() - 600000).toISOString(),
    },
  },
  {
    id: "m5", status: "live", round: "Heat 1", venue: "Kolam Renang IPB",
    competition_category: { name: "Renang 100m Gaya Bebas" },
    event: { name: "IPB Swimming Championship", card_image_url: "https://images.unsplash.com/photo-1560090995-01632a28895b?w=400&q=80" },
    format: { match_type: "solo", modules: [{ type: "finish_time", config: { unit: "s" } }, { type: "timer", config: { mode: "stopwatch", duration: 0 } }] },
    home_participant: { name: "Arya Faiz", institution: IPB },
    live_state: { timeLog: [], timerSecs: 0, timerRunning: true, timerLastStarted: new Date(Date.now() - 45000).toISOString() },
  },
  {
    id: "m6", status: "live", round: "Semifinal", venue: "Lapangan B",
    competition_category: { name: "Kata Perorang Putra" },
    event: { name: "Forkix IPB Cup 2026", card_image_url: "https://images.unsplash.com/photo-1555597673-b21d5c935865?w=400&q=80" },
    format: { match_type: "head_to_head", modules: [{ type: "manual_pick", config: { allow_draw: false } }, { type: "timer", config: { mode: "countdown", duration: 180 } }] },
    home_participant: { name: "Dimas K.", institution: UI  },
    away_participant: { name: "Agus M.",  institution: UPN },
    live_state: { winner: null, timerSecs: 95, timerRunning: true, timerLastStarted: new Date(Date.now() - 40000).toISOString() },
  },
  {
    id: "m7", status: "live", match_name: "IT-Today HackToday", venue: "Auditorium AHN",
    competition_category: { name: "Hackathon" },
    event: { name: "HackToday", card_image_url: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&q=80" },
    format: { match_type: "open", modules: [{ type: "manual_pick", config: { top_n: 3, ranked_order: true } }, { type: "timer", config: { mode: "countdown", duration: 1800 } }] },
    participants: mkParticipants([
      { id: "ht01", name: "Team Garuda",    institution: IPB },
      { id: "ht02", name: "Team Nusantara", institution: UGM },
      { id: "ht03", name: "Team Langit",    institution: UI  },
      { id: "ht04", name: "Team Bumi",      institution: ITB },
      { id: "ht05", name: "Team Bahari",    institution: UPN },
      { id: "ht06", name: "Team Cakrawala", institution: IPB },
      { id: "ht07", name: "Team Delta",     institution: UGM },
      { id: "ht08", name: "Team Elang",     institution: UI  },
      { id: "ht09", name: "Team Fajar",     institution: ITB },
      { id: "ht10", name: "Team Gema",      institution: UPN },
      { id: "ht11", name: "Team Halo",      institution: IPB },
      { id: "ht12", name: "Team Indigo",    institution: UGM },
    ]),
    live_state: { winner: null, timerSecs: 1560, timerRunning: true, timerLastStarted: new Date(Date.now() - 120000).toISOString() },
  },
];

// TODO: ganti dengan fetch Directus GET /items/matches?filter[status][_eq]=upcoming
const UPCOMING_MATCHES = [
  {
    id: "u1", status: "upcoming", round: "Final", venue: "Lapangan B GOR Utama",
    scheduled_at: new Date(Date.now() + 3600000).toISOString(),
    competition_category: { name: "Kumite -60kg Putra" },
    event: { name: "Forkix IPB Cup 2026" },
    format: { match_type: "head_to_head", modules: [{ type: "score_timed", config: {} }] },
    home_participant: { name: "Gilang M.", institution: IPB },
    away_participant: { name: "Alzabur I.", institution: UPN },
    live_state: {},
  },
  {
    id: "u2", status: "upcoming", round: "Semifinal", venue: "Lapangan Badminton A",
    scheduled_at: new Date(Date.now() + 5400000).toISOString(),
    competition_category: { name: "Badminton Ganda Putra" },
    event: { name: "IPB Sports Week" },
    format: { match_type: "head_to_head", modules: [{ type: "score_sets", config: { max_sets: 5, sets_to_win: 3 } }] },
    home_participant: { name: "FAPERTA A", institution: IPB },
    away_participant: { name: "RRQ Bogor", institution: UGM },
    live_state: {},
  },
  {
    id: "u3", status: "upcoming", round: "Babak 8 Besar", venue: "Panggung A",
    scheduled_at: new Date(Date.now() + 7200000).toISOString(),
    competition_category: { name: "Solo Vocal" },
    event: { name: "Seni IPB 2026" },
    format: { match_type: "solo", modules: [{ type: "judge_scores", config: { num_judges: 5, method: "avg" } }] },
    home_participant: { name: "Nadia R.", institution: IPB },
    live_state: {},
  },
  {
    id: "u4", status: "upcoming", match_name: "Open Charity Golf Tournament", venue: "Sawah Belakang IPB",
    scheduled_at: new Date(Date.now() + 9000000).toISOString(),
    competition_category: { name: "Golf Open" },
    event: { name: "IPB Golf Open" },
    format: { match_type: "open", modules: [{ type: "finish_time", config: { unit: "min" } }] },
    participants: mkParticipants([
      { id: "gp1", name: "Reza A.",    institution: IPB },
      { id: "gp2", name: "Bambang S.", institution: UPN },
      { id: "gp3", name: "Candra W.",  institution: UI  },
      { id: "gp4", name: "Dani R.",    institution: UGM },
      { id: "gp5", name: "Eko P.",     institution: ITB },
    ]),
    live_state: {},
  },
  {
    id: "u5", status: "upcoming", round: "Heat 2", venue: "Kolam Renang IPB",
    scheduled_at: new Date(Date.now() + 10800000).toISOString(),
    competition_category: { name: "Renang 100m Gaya Bebas" },
    event: { name: "IPB Swimming Championship" },
    format: { match_type: "solo", modules: [{ type: "finish_time", config: { unit: "s" } }] },
    home_participant: { name: "Bima S.", institution: ITB },
    live_state: {},
  },
  {
    id: "u6", status: "upcoming", round: "Final", venue: "Lapangan B",
    scheduled_at: new Date(Date.now() + 12600000).toISOString(),
    competition_category: { name: "Kata Perorang Putra" },
    event: { name: "Forkix IPB Cup 2026" },
    format: { match_type: "head_to_head", modules: [{ type: "manual_pick", config: { allow_draw: false } }] },
    home_participant: { name: "Dimas K.", institution: UI  },
    away_participant: { name: "Agus M.",  institution: UPN },
    live_state: {},
  },
  {
    id: "u7", status: "upcoming", match_name: "IT-Today HackToday Grand Final", venue: "Auditorium AHN",
    scheduled_at: new Date(Date.now() + 14400000).toISOString(),
    competition_category: { name: "Hackathon" },
    event: { name: "HackToday" },
    format: { match_type: "open", modules: [{ type: "manual_pick", config: { top_n: 3 } }] },
    participants: mkParticipants([
      { id: "ht01", name: "Team Garuda",    institution: IPB },
      { id: "ht02", name: "Team Nusantara", institution: UGM },
      { id: "ht03", name: "Team Langit",    institution: UI  },
      { id: "ht04", name: "Team Bumi",      institution: ITB },
      { id: "ht05", name: "Team Bahari",    institution: UPN },
      { id: "ht06", name: "Team Cakrawala", institution: IPB },
      { id: "ht07", name: "Team Delta",     institution: UGM },
      { id: "ht08", name: "Team Elang",     institution: UI  },
      { id: "ht09", name: "Team Fajar",     institution: ITB },
      { id: "ht10", name: "Team Gema",      institution: UPN },
      { id: "ht11", name: "Team Halo",      institution: IPB },
      { id: "ht12", name: "Team Indigo",    institution: UGM },
    ]),
    live_state: {},
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
    ? { animation: `live-intro 1s cubic-bezier(0.22, 1, 0.36, 1) ${slot * STAGGER_MS}ms both` }
    : { opacity: 0 };

  const cardMatches = LIVE_MATCHES.slice(0, SHOW_MAX);
  const scale       = Math.min(1, cw / 1440);
  const margin      = Math.round(H_MARGIN * scale);

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
        gap: 20,
      }}>
        <div style={anim(0)}>
          <div style={{ ...BB, fontSize: "4rem", lineHeight: 1, color: "#fff", filter: "drop-shadow(0 4px 4px rgba(0,0,0,0.25))" }}>
            Live Matches
          </div>
        </div>

        <div style={{ ...anim(1), display: "flex", flexDirection: "row", gap: CARD_GAP }}>
          {cardMatches.map((match, i) => (
            <div key={match.id} style={{ ...anim(i + 2), flex: 1, minWidth: 0 }}>
              <div style={{ width: "100%", height: CARD_H, overflow: "hidden", borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.35)" }}>
                <MatchCard match={match} />
              </div>
            </div>
          ))}

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

        <div style={anim(cardMatches.length + 3)}>
          <MatchTable matches={UPCOMING_MATCHES.slice(0, 5)} groupBy="event" title="Upcoming Matches" />
        </div>

        <div style={{ ...anim(cardMatches.length + 4), display: "flex", justifyContent: "flex-end" }}>
          <Button href="/schedule" variant="primary" size="md">See More</Button>
        </div>
      </div>
    </section>
  );
}