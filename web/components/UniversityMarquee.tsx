"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";

const NAT_W = 1920; // sama dengan semua section lain

const CONFIG = {
  speed: 35,
  itemGap: 12,
  logoHeight: 35,
  logoOpacity: 0.8,
  copies: 4,
};

interface Unis {
  abbr: string;
  name: [string, string];
  logo: string;
}

const UNIVERSITIES: Unis[] = [
  { abbr: "UI",    name: ["Universitas", "Indonesia"],               logo: "/universities/ui.png" },
  { abbr: "UGM",   name: ["Universitas", "Gadjah Mada"],             logo: "/universities/ugm.png" },
  { abbr: "ITS",   name: ["Institut Teknologi", "Sepuluh Nopember"], logo: "/universities/its.png" },
  { abbr: "UNPAD", name: ["Universitas", "Padjadjaran"],             logo: "/universities/unpad.png" },
  { abbr: "IPB",   name: ["Institut Pertanian", "Bogor"],            logo: "/universities/ipb.png" },
];

const ITEMS = Array.from({ length: CONFIG.copies }, () => UNIVERSITIES).flat();

export default function UniversityMarquee() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [cw, setCw] = useState(NAT_W);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setCw(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isMobile = cw < 1024;

  // ─── Fade edges: smooth clamp on both mobile and desktop ─────────────────
  // Desktop: clamp(40px, 8.33vw, 160px) — unchanged
  // Mobile:  clamp(16px, 6vw, 40px)     — tighter so content isn't over-masked
  const fadeStart = isMobile
    ? Math.round(Math.min(40,  Math.max(16, cw * 0.06)))
    : Math.round(Math.min(160, Math.max(40, cw * 0.0833)));
  const fadeEnd = isMobile
    ? Math.round(Math.min(56,  Math.max(24, cw * 0.085)))
    : Math.round(Math.min(200, Math.max(60, cw * 0.1042)));

  // ─── Token values: desktop unchanged, mobile uses CSS clamp() ────────────
  // logoHeight  — desktop: 35px fixed | mobile: clamp(28px, 7vw, 35px)
  //   375px → 7vw = 26px → clamped to 28px
  //   500px → 7vw = 35px → hits max, stays there until desktop takes over
  const logoHeight: number | string = isMobile
    ? "clamp(28px, 7vw, 35px)"
    : CONFIG.logoHeight;

  // fontSize    — desktop: 10.4px fixed | mobile: clamp(9px, 2.4vw, 10.4px)
  //   375px → 2.4vw = 9px (hits min)
  //   433px → 2.4vw = 10.4px → hits max
  const fontSize: number | string = isMobile
    ? "clamp(9px, 2.4vw, 10.4px)"
    : 10.4;

  // itemGap (marginInline) — desktop: 12px | mobile: clamp(10px, 2.5vw, 12px)
  //   375px → 9.4px → clamped to 10px
  //   480px → 12px  → hits max
  const itemGap: number | string = isMobile
    ? "clamp(10px, 2.5vw, 12px)"
    : CONFIG.itemGap;

  // logo↔text gap (flex gap) — desktop: 12px | mobile: clamp(10px, 2.5vw, 12px)
  const logoTextGap: number | string = isMobile
    ? "clamp(10px, 2.5vw, 12px)"
    : 12;

  const mask = `linear-gradient(to right,
    transparent ${fadeStart}px,
    black ${fadeEnd}px,
    black calc(100% - ${fadeEnd}px),
    transparent calc(100% - ${fadeStart}px)
  )`;

  return (
    <div
      ref={wrapRef}
      className="w-full overflow-hidden"
      style={{
        paddingBlock:    isMobile ? "clamp(2px, 1vw, 6px)" : "16px",
        maskImage:       mask,
        WebkitMaskImage: mask,
      }}
    >
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-${100 / CONFIG.copies}%); }
        }
        .marquee-track {
          display: flex;
          align-items: center;
          width: max-content;
          animation: marquee ${CONFIG.speed}s linear infinite;
        }
      `}</style>

      <div className="marquee-track">
        {ITEMS.map((uni, i) => (
          <div
            key={i}
            className="flex items-center shrink-0"
            style={{
              gap:          logoTextGap,
              marginInline: itemGap,
            }}
          >
            <Image
              src={uni.logo}
              alt={uni.name.join(" ")}
              width={35}
              height={35}
              style={{
                height:  logoHeight,
                width:   "auto",
                filter:  "brightness(0) invert(1)",
                opacity: CONFIG.logoOpacity,
              }}
            />
            <span
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize:   fontSize,
                fontWeight: 600,
                color:      "rgba(255,255,255,0.5)",
                lineHeight: 1.3,
              }}
            >
              {uni.name[0]}<br />{uni.name[1]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}