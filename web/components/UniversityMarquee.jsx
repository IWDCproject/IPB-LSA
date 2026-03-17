"use client";

const CONFIG = {
  speed: 35,
  itemGap: 15,
  logoHeight: 35,
  logoOpacity: 0.8,
  copies: 4,
  fade: {
    start: 150,    // kalo mau sesuai margin 150
    end: 200,      // yg ini 200
  },
};

const UNIVERSITIES = [
  { abbr: "UI",    name: ["Universitas", "Indonesia"],               logo: "/universities/ui.png" },
  { abbr: "UGM",   name: ["Universitas", "Gadjah Mada"],             logo: "/universities/ugm.png" },
  { abbr: "ITS",   name: ["Institut Teknologi", "Sepuluh Nopember"], logo: "/universities/its.png" },
  { abbr: "UNPAD", name: ["Universitas", "Padjadjaran"],             logo: "/universities/unpad.png" },
  { abbr: "IPB",   name: ["Institut Pertanian", "Bogor"],            logo: "/universities/ipb.png" },
];

const ITEMS = Array.from({ length: CONFIG.copies }, () => UNIVERSITIES).flat();

export default function UniversityMarquee() {
  const { start, end } = CONFIG.fade;
  const mask = `linear-gradient(to right,
    transparent ${start}px,
    black ${end}px,
    black calc(100% - ${end}px),
    transparent calc(100% - ${start}px)
  )`;

  return (
    <div
      className="w-full overflow-hidden py-4"
      style={{
        maskImage: mask,
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
            className="flex items-center gap-3 shrink-0"
            style={{ marginInline: CONFIG.itemGap }}
          >
            <img
              src={uni.logo}
              alt={uni.name.join(" ")}
              style={{
                height: CONFIG.logoHeight,
                width: "auto",
                filter: "brightness(0) invert(1)",
                opacity: CONFIG.logoOpacity,
              }}
            />
            <span
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: "0.65rem",
                fontWeight: 600,
                color: "rgba(255,255,255,0.5)",
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