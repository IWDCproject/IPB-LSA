// StatSection.jsx
"use client";
import { useState, useEffect, useRef, useMemo } from "react";

import StatCard from "./stats-stuff/StatCard";
import Button from "@/components/Button";
import UniversityMarquee from "@/components/UniversityMarquee";

import universitiesImg from "./stats-stuff/2.jpg";
import athletesImg     from "./stats-stuff/1.jpg";
import eventsImg       from "./stats-stuff/3.jpg";

// konstanta layout
const CARD_WIDTHS   = [470, 280, 280];
const CARD_IMG_H    = 250;
const CARD_BOTTOM_H = 106;
const CARD_H        = CARD_IMG_H + CARD_BOTTOM_H; // 356px
const CARD_GAP      = 14;
const H_MARGIN      = 160;
const TEXT_COL_W    = 480;
const ROW_GAP       = 14;

const CARDS_W      = CARD_WIDTHS.reduce((sum, w) => sum + w, 0) + CARD_GAP * 2; // 1058px
const STAGE1_NAT_W = H_MARGIN * 2 + CARDS_W + ROW_GAP + TEXT_COL_W;            // 1872px

const S3_PAD   = 24;
const S3_NAT_W = CARDS_W + S3_PAD * 2;
const S3_GAP   = 40;
const S3_TEXT_H = 128;
const S3_BTN_H  = 52;
const S3_NAT_H  = CARD_H + S3_GAP + S3_TEXT_H + 24 + S3_BTN_H;

// stage 3 masuk kalau lebar kontainer kurang dari 50% lebar natural
const STAGE3_THRESHOLD = 0.5;

// data statis, nggak perlu dibuat ulang tiap render
const STATS = [
  { src: universitiesImg.src, mainStat: "4.000+", label: "Participants",    width: CARD_WIDTHS[0] },
  { src: athletesImg.src,     mainStat: "28+",    label: "Universities",    width: CARD_WIDTHS[1] },
  { src: eventsImg.src,       mainStat: "168+",   label: "Official Events", width: CARD_WIDTHS[2] },
];

// style yang bener-bener statis ditaruh di sini biar nggak bikin object baru tiap render
const S = {
  cardRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: CARD_GAP,
    flexShrink: 0,
  },
  ctaBase: {
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  headingBase: {
    fontFamily: "'Bebas Neue', sans-serif",
    fontSize: "4rem",
    lineHeight: 1,
    color: "#ffffff",
    filter: "drop-shadow(0 4px 4px rgba(0,0,0,0.25))",
  },
  stage1Row: {
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-start",
    paddingLeft: H_MARGIN,
    paddingRight: H_MARGIN,
    gap: ROW_GAP,
    boxSizing: "border-box",
    width: "100%",
  },
};

// hook buat pantau lebar kontainer pakai ResizeObserver
function useContainerWidth(ref) {
  const [width, setWidth] = useState(STAGE1_NAT_W);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  return width;
}

// deretan kartu statistik, nggak nerima props karena datanya statis
function StatCards() {
  return (
    <div style={S.cardRow}>
      {STATS.map((stat) => (
        <StatCard
          key={stat.label}
          image_url={stat.src}
          width={stat.width}
          height={CARD_IMG_H}
          main_stat={stat.mainStat}
          label_stat={stat.label}
        />
      ))}
    </div>
  );
}

// CTA dipakai di stage 1/2 (rata kanan) dan stage 3 (tengah)
function CTA({ centered = false }) {
  const ctaStyle = {
    ...S.ctaBase,
    alignItems: centered ? "center" : "flex-end",
    ...(centered ? {} : { flex: 1 }),
  };
  const headingStyle = {
    ...S.headingBase,
    textAlign: centered ? "center" : "right",
  };

  return (
    <div style={ctaStyle}>
      <div style={headingStyle}>
        <div>Are you ready to</div>
        <div>Prove Yourself?</div>
      </div>
      <Button href="/events" variant="primary" size="md">
        See Events
      </Button>
    </div>
  );
}

// stage 1: lebar penuh, nggak pakai transform sama sekali
function Stage1Layout() {
  return (
    <div style={S.stage1Row}>
      <StatCards />
      <CTA />
    </div>
  );
}

// stage 2: container menyusut, konten di-scale dari pojok kiri atas
function Stage2Layout({ scale }) {
  const outerStyle = useMemo(() => ({
    position: "relative",
    width: "100%",
    height: CARD_H * scale,
  }), [scale]);

  const innerStyle = useMemo(() => ({
    ...S.stage1Row,
    position: "absolute",
    top: 0,
    left: 0,
    width: STAGE1_NAT_W,
    transform: `scale(${scale})`,
    transformOrigin: "top left",
  }), [scale]);

  return (
    <div style={outerStyle}>
      <div style={innerStyle}>
        <StatCards />
        <CTA />
      </div>
    </div>
  );
}

// stage 3: layout berubah jadi kolom, di-scale dari tengah atas
function Stage3Layout({ cw, scale }) {
  const outerStyle = useMemo(() => ({
    position: "relative",
    width: "100%",
    height: S3_NAT_H * scale,
  }), [scale]);

  const innerStyle = useMemo(() => ({
    position: "absolute",
    top: 0,
    left: (cw - S3_NAT_W) / 2,
    width: S3_NAT_W,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: S3_GAP,
    paddingLeft: S3_PAD,
    paddingRight: S3_PAD,
    transform: `scale(${scale})`,
    transformOrigin: "top center",
    boxSizing: "border-box",
  }), [cw, scale]);

  return (
    <div style={outerStyle}>
      <div style={innerStyle}>
        <StatCards />
        <CTA centered />
      </div>
    </div>
  );
}

export default function StatSection() {
  const sectionRef = useRef(null);
  const cw = useContainerWidth(sectionRef);

  // hitung stage dan scale sekaligus, biar nggak ada kalkulasi duplikat
  const { stage, scale, s3Scale } = useMemo(() => {
    const scale   = cw / STAGE1_NAT_W;
    const s3Scale = Math.min(1, cw / S3_NAT_W);
    const stage   = scale >= 1 ? 1 : scale < STAGE3_THRESHOLD ? 3 : 2;
    return { stage, scale, s3Scale };
  }, [cw]);

  const sectionStyle = useMemo(() => ({
    padding: `${stage === 3 ? 80 : 150}px 0 0 0`,
    minHeight: "100vh",
    position: "relative",
    zIndex: 2,
    background: "linear-gradient(to bottom, #06125C 5%, #0D26C2 100%)",
    boxShadow: "0 -30px 60px rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    color: "white",
    overflow: "hidden",
  }), [stage]);

  const innerStyle = useMemo(() => ({
    display: "flex",
    flexDirection: "column",
    gap: stage === 3 ? 48 : 100,
    width: "100%",
  }), [stage]);

  return (
    <section ref={sectionRef} style={sectionStyle}>
      <div style={innerStyle}>
        {stage === 3 ? (
          <Stage3Layout cw={cw} scale={s3Scale} />
        ) : stage === 2 ? (
          <Stage2Layout scale={scale} />
        ) : (
          <Stage1Layout />
        )}
        <UniversityMarquee />
      </div>
    </section>
  );
}