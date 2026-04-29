"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import StatCard from "../stats-stuff/StatCard";
import Button from "@/components/Button";
import UniversityMarquee from "@/components/UniversityMarquee";
import FightBackground from "../match-stuff/FightBackground";
import universitiesImg from "../stats-stuff/2.jpg";
import athletesImg from "../stats-stuff/1.jpg";
import eventsImg from "../stats-stuff/3.jpg";
import { BlockRevealText } from "@/components/BlockRevealText";


// Types

interface SectionStats {
  participantsCount: number;
  institutionsCount: number;
  eventsCount: number;
}

type AnimFn = (slot: number) => React.CSSProperties;

interface StatCardsProps    { stats: SectionStats | null; anim: AnimFn; }
interface CTAProps           { centered?: boolean; fontSize?: string; ctaGap?: number; anim: AnimFn; }
interface Stage1LayoutProps  { stats: SectionStats | null; anim: AnimFn; }
interface Stage2LayoutProps  { stats: SectionStats | null; scale: number; anim: AnimFn; }
interface Stage3LayoutProps  { stats: SectionStats | null; cw: number; scale: number; anim: AnimFn; }
interface StatSectionProps   { stats: SectionStats | null; }


// Layout constants

const CARD_WIDTHS = [470, 280, 280];
const CARD_IMG_H  = 250;
const CARD_BOTTOM_H = 106;
const CARD_H      = CARD_IMG_H + CARD_BOTTOM_H;
const CARD_GAP    = 14;
const H_MARGIN    = 160;
const TEXT_COL_W  = 480;
const ROW_GAP     = 14;

const CARDS_W      = CARD_WIDTHS.reduce((sum, w) => sum + w, 0) + CARD_GAP * 2;
const STAGE1_NAT_W = H_MARGIN * 2 + CARDS_W + ROW_GAP + TEXT_COL_W;
const S3_PAD       = 24;
const S3_NAT_W     = CARDS_W + S3_PAD * 2;
const S3_GAP       = 40;

// Kept consistent with MatchSection 
// hardcoded sengaja, aneh tapi.
const STAGE3_THRESHOLD = 0.547;


// Animation constants

const STAGGER   = [0, 120, 240, 420, 540, 680];
const ANIM_DUR  = "1s";
const ANIM_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

// Static styles

const S = {
  cardRow:    { display: "flex", flexDirection: "row", alignItems: "flex-start", gap: CARD_GAP, flexShrink: 0 },
  ctaBase:    { display: "flex", flexDirection: "column", gap: 24 },
  headingBase: { fontFamily: "'Bebas Neue', sans-serif", fontSize: "4rem", lineHeight: 1, color: "#ffffff", filter: "drop-shadow(0 4px 4px rgba(0,0,0,0.25))" },
  stage1Row:  { display: "flex", flexDirection: "row", alignItems: "flex-start", paddingLeft: H_MARGIN, paddingRight: H_MARGIN, gap: ROW_GAP, boxSizing: "border-box", width: "100%" },
} as const;

// Hook

function useContainerWidth(ref: React.RefObject<HTMLElement>): number {
  const [width, setWidth] = useState(STAGE1_NAT_W);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    const widthWatcher = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    widthWatcher.observe(container);
    return () => widthWatcher.disconnect();
  }, [ref]);

  return width;
}

// Sub-components

function StatCards({ stats, anim }: StatCardsProps) {
  const cards = useMemo(() => [
    { src: universitiesImg.src, mainStat: `${stats?.participantsCount ?? 0}+`, label: "Participants",    width: CARD_WIDTHS[0] },
    { src: athletesImg.src,     mainStat: `${stats?.institutionsCount ?? 0}+`, label: "Universities",    width: CARD_WIDTHS[1] },
    { src: eventsImg.src,       mainStat: `${stats?.eventsCount ?? 0}+`,       label: "Official Events", width: CARD_WIDTHS[2] },
  ], [stats]);

  return (
    <div style={S.cardRow}>
      {cards.map((card, i) => (
        <div key={card.label} style={anim(i)}>
          <StatCard image_url={card.src} width={card.width} height={CARD_IMG_H} main_stat={card.mainStat} label_stat={card.label} />
        </div>
      ))}
    </div>
  );
}

function CTA({ centered = false, fontSize = "4rem", ctaGap, anim }: CTAProps) {
  const ctaStyle = { ...S.ctaBase, alignItems: centered ? "center" : "flex-end", ...(centered ? {} : { flex: 1 }), ...(ctaGap !== undefined ? { gap: ctaGap } : {}) };
  const headingStyle = { ...S.headingBase, textAlign: centered ? "center" : "right", fontSize } as const;

  return (
    <div style={ctaStyle}>
      <div style={{ ...headingStyle, ...anim(3) }}>
        <div>
          <BlockRevealText delay={0.4} blockColor="#ffffff">Are you ready to</BlockRevealText>
        </div>
        <div>
          <BlockRevealText delay={0.8} blockColor="#ffffff">Prove Yourself?</BlockRevealText>
        </div>
      </div>
      <div style={anim(4)}>
        <Button href="/events" variant="primary" size="md">See Events</Button>
      </div>
    </div>
  );
}

function Stage1Layout({ stats, anim }: Stage1LayoutProps) {
  return (
    <div style={S.stage1Row}>
      <StatCards stats={stats} anim={anim} />
      <CTA anim={anim} />
    </div>
  );
}

function Stage2Layout({ stats, scale, anim }: Stage2LayoutProps) {
  const outerStyle = useMemo((): React.CSSProperties => ({
    position: "relative", width: "100%", height: CARD_H * scale,
  }), [scale]);

  const innerStyle = useMemo((): React.CSSProperties => ({
    ...S.stage1Row, position: "absolute", top: 0, left: 0, width: STAGE1_NAT_W,
    transform: `scale(${scale})`, transformOrigin: "top left",
  }), [scale]);

  return (
    <div style={outerStyle}>
      <div style={innerStyle}>
        <StatCards stats={stats} anim={anim} />
        <CTA anim={anim} />
      </div>
    </div>
  );
}

function Stage3Layout({ stats, cw, anim }: Stage3LayoutProps) {
  // Compute pixel-exact widths from measured container — no scale() transform.
  const availW  = cw - S3_PAD * 2;

  // Row 1 — Participants: stretches full available width, image height capped small.
  const c0W     = availW;
  const c0ImgH  = 90;   // hard cap — proportional scaling (≈182px) ate too much vertical space

  // Row 2 — Universities (3 parts) + Official Events (2 parts).
  // Both share the same image height so the row aligns cleanly.
  const c1W     = Math.round((availW - CARD_GAP) * 0.6);
  const c2W     = availW - CARD_GAP - c1W;
  const c12ImgH = 80;   // same reasoning

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 36, width: "100%" }}>
      {/* 2-row card grid */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: S3_PAD, paddingRight: S3_PAD, boxSizing: "border-box", width: "100%" }}>
        {/* Row 1: Participants full-width */}
        <div style={anim(0)}>
          <StatCard image_url={universitiesImg.src} width={c0W} height={c0ImgH}
            main_stat={`${stats?.participantsCount ?? 0}+`} label_stat="Participants" />
        </div>
        {/* Row 2: Universities + Official Events, 3:2 */}
        <div style={{ display: "flex", gap: 8 }}>
          <div style={anim(1)}>
            <StatCard image_url={athletesImg.src} width={c1W} height={c12ImgH}
              main_stat={`${stats?.institutionsCount ?? 0}+`} label_stat="Universities" />
          </div>
          <div style={anim(2)}>
            <StatCard image_url={eventsImg.src} width={c2W} height={c12ImgH}
              main_stat={`${stats?.eventsCount ?? 0}+`} label_stat="Official Events" />
          </div>
        </div>
      </div>
      <CTA centered fontSize="clamp(1.8rem, 7vw, 3rem)" ctaGap={12} anim={anim} />
    </div>
  );
}

// Main component

export default function StatSection({ stats }: StatSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const cw = useContainerWidth(sectionRef);
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

  const animStyles = useMemo(() =>
    STAGGER.map((delay) =>
      visible
        ? { animation: `stat-intro ${ANIM_DUR} ${ANIM_EASE} ${delay}ms both` }
        : { opacity: 0 }
    ),
  [visible]);

  const anim = useCallback((slot: number) => animStyles[slot], [animStyles]);

  const { stage, scale, s3Scale } = useMemo(() => {
    const scale   = cw / STAGE1_NAT_W;
    const s3Scale = Math.min(1, cw / S3_NAT_W);
    const stage   = scale >= 1 ? 1 : scale < STAGE3_THRESHOLD ? 3 : 2;
    return { stage, scale, s3Scale };
  }, [cw]);

  const sectionStyle = useMemo((): React.CSSProperties => ({
    padding:    stage === 3 ? "20px 0 20px 0" : "150px 0 0px 0",
    minHeight:  stage === 3 ? "auto" : "80vh",
    position: "relative", zIndex: 2, color: "white", overflow: "visible",
    display: "flex", alignItems: "flex-start", justifyContent: "flex-start",
    background: "linear-gradient(to bottom, #06125C 5%, #0D26C2 100%)",
    boxShadow: "0 -30px 60px rgba(0,0,0,0.5)",
  }), [stage]);

  const innerStyle = useMemo((): React.CSSProperties => ({
    display: "flex", flexDirection: "column", gap: stage === 3 ? 48 : 100, width: "100%",
  }), [stage]);

  return (
    <section ref={sectionRef} style={sectionStyle}>
      {/* @keyframes stat-intro lives in globals.css */}
      <FightBackground visible={visible} />
      <div style={innerStyle}>
        {stage === 3 ? (
          <Stage3Layout stats={stats} cw={cw} scale={s3Scale} anim={anim} />
        ) : stage === 2 ? (
          <Stage2Layout stats={stats} scale={scale} anim={anim} />
        ) : (
          <Stage1Layout stats={stats} anim={anim} />
        )}
        <div style={anim(5)}>
          <UniversityMarquee />
        </div>
      </div>
    </section>
  );
}