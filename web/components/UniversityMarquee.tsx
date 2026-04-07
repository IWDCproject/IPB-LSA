"use client";
import { useState, useEffect, useRef } from "react";

const NAT_W = 1920; 

const CONFIG = {
  speed: 50,
  itemGap: -500,
  logoHeight: 40,
  logoOpacity: 1,
  copies: 5,
};

<<<<<<< HEAD:web/components/UniversityMarquee.jsx
const UNIVERSITIES = [
  { name: "Universitas Indonesia",               logo: "/universities/ui.png" },
  { name: "Universitas Gadjah Mada",             logo: "/universities/ugm.png" },
  { name: "Institut Teknologi Sepuluh Nopember", logo: "/universities/its.png" },
  { name: "Universitas Padjadjaran",             logo: "/universities/unpad.png" },
  { name: "IPB University",                     logo: "/universities/ipb.png" },
=======
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
>>>>>>> 39312ad2e9d2c24321a7a31f41d71ab1d01d9922:web/components/UniversityMarquee.tsx
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

  const fadeEnd    = isMobile ? 32 : Math.round(Math.min(220, Math.max(80, cw * 0.0833)));
  const logoHeight = isMobile ? 22 : 28;
  const fontSize   = isMobile ? 8.5 : 10;
  const itemGap    = 3; // Sangat rapat sesuai permintaan

  const mask = `linear-gradient(to right,
    transparent 0px,
    black ${fadeEnd}px,
    black calc(100% - ${fadeEnd}px),
    transparent 100%
  )`;

  return (
    <div
      ref={wrapRef}
      className="w-full overflow-hidden py-4"
      style={{
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
          will-change: transform;
        }
        `}</style>

        <div className="marquee-track">
        {ITEMS.map((uni, i) => (
          <div
            key={i}
            className="flex items-center shrink-0"
            style={{ 
              gap: "5px",
              paddingRight: "50px" // Konsisten di setiap item, termasuk yang terakhir dalam grup
            }}
          >
            <img
              src={uni.logo}
              alt={uni.name}
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
                fontWeight: 700,
                color:      "rgba(255,255,255,0.4)",
                letterSpacing: "0.04em",
                lineHeight: 1.1,
                maxWidth:   isMobile ? "80px" : "110px",
                textTransform: "uppercase",
                display: "block"
              }}
            >
              {uni.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}