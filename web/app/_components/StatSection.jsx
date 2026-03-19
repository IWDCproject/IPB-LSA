"use client";
import { useState, useEffect } from "react";

import StatCard from "./stats-stuff/StatCard";
import Button from "@/components/Button";
import UniversityMarquee from "@/components/UniversityMarquee";

import universities from "./stats-stuff/2.jpg";
import athletes     from "./stats-stuff/1.jpg";
import events       from "./stats-stuff/2.jpg";

const BASE_WIDTHS    = [470, 280, 280];
const BASE_GAPS      = 14;
const BASE_MARGIN    = 160;
const BASE_CARDS_W   = BASE_WIDTHS.reduce((s, w) => s + w, 0) + BASE_GAPS * 2; // 1058px
const ROW_GAP        = 14;

// threshold: cards scale 0.6
// sebelum stage 3
const STAGE3_THRESHOLD = 0.6;

export default function StatSection() {
  const [vw, setVw] = useState(1920);

  useEffect(() => {
    const update = () => setVw(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // space yang tersisa buat cards setelah text col, margins, dan gap diklaim
  const availableForCards = vw - BASE_MARGIN * 2 - ROW_GAP;
  const cardScale = availableForCards / BASE_CARDS_W;

  const isStage3 = cardScale < STAGE3_THRESHOLD;

  // stage 1 & 2: cards scale down, cap di 1.0 (jangan lebih gede dari base)
  const activeScale  = Math.min(1, cardScale);

  // stage 3: cards fit viewport width dengan minimal padding
  const stage3Scale  = Math.min(1, (vw - 48) / BASE_CARDS_W);

  const finalScale   = isStage3 ? stage3Scale : activeScale;
  const activeWidths = BASE_WIDTHS.map(w => Math.round(w * finalScale));

  const stats = [
    { image_url: universities.src, main_stat: "4.000+", label_stat: "Participants",    width: activeWidths[0] },
    { image_url: athletes.src,     main_stat: "28+",    label_stat: "Universities",    width: activeWidths[1] },
    { image_url: events.src,       main_stat: "168+",   label_stat: "Official Events", width: activeWidths[2] },
  ];

  return (
    <section
      style={{
        padding: `${isStage3 ? 80 : 150}px 0 0 0`,
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
      }}
    >
      {/* Outer col: row flex utama + marquee */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: isStage3 ? 48 : 100,
          width: "100%",
        }}
      >
        {/* Row flex utama */}
        <div
          style={{
            display: "flex",
            flexDirection: isStage3 ? "column" : "row",
            alignItems: isStage3 ? "center" : "flex-start",
            gap: isStage3 ? 40 : ROW_GAP,
            marginLeft: isStage3 ? 24 : BASE_MARGIN,
            marginRight: isStage3 ? 24 : BASE_MARGIN,
          }}
        >
          {/* Stat cards */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "flex-start",
              gap: BASE_GAPS,
              flexShrink: 0,
            }}
          >
            {stats.map((stat, i) => (
              <StatCard
                key={i}
                image_url={stat.image_url}
                width={stat.width}
                main_stat={stat.main_stat}
                label_stat={stat.label_stat}
              />
            ))}
          </div>

          {/* Text + button col. lebar = sisa ruang, text nempel ke kanan */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: isStage3 ? "center" : "flex-end",
              gap: "24px",
              flex: isStage3 ? "unset" : 1,
              flexShrink: 0,
              paddingLeft: isStage3 ? 0 : 40,
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: "4rem",
                lineHeight: 1,
                textAlign: isStage3 ? "center" : "right",
                color: "#ffffff",
                filter: "drop-shadow(0 4px 4px rgba(0,0,0,0.25))",
                whiteSpace: "nowrap", 
              }}
            >
              <div>Are you ready to</div>
              <div>Prove Yourself?</div>
            </div>
            <Button href="/events" variant="primary" size="md">
              See Events
            </Button>
          </div>
        </div>

        {/* University marquee */}
        <UniversityMarquee />
      </div>
    </section>
  );
}