"use client";

import { useRef, useEffect, useState } from "react";
import HeroSection from "./sections/HeroSection";
import NewsSection from "./sections/NewsSection";
import StatSection from "./sections/StatSection";
import MatchSection from "./sections/MatchSection";
import TimelineSection from "./sections/TimelineSection";

const HEADER_HEIGHT  = 65;
const PARALLAX_SPEED = 0.4;

export default function CurtainWrapper() {
  const heroRef          = useRef(null);
  const timelineStickyRef = useRef(null);
  const timelineInnerRef  = useRef(null);
  const [heroPaused, setHeroPaused] = useState(false);

  useEffect(() => {
    const sectionH = window.innerHeight - HEADER_HEIGHT;
    // snapshot sekali setelah layout, sebelum scroll apapun
    const timelineStart = (timelineStickyRef.current?.offsetTop ?? 0) - HEADER_HEIGHT;

    const onScroll = (e) => {
      const { scroll } = e.detail;

      // parallax hero
      if (scroll <= sectionH) {
        heroRef.current.style.transform = `translate3d(0, -${scroll * PARALLAX_SPEED}px, 0)`;
      }
      const isPaused = scroll > sectionH;
      setHeroPaused((prev) => (prev === isPaused ? prev : isPaused));

      // parallax timeline, pakai nilai yang dicache
      const timelineScroll = scroll - timelineStart;
      timelineInnerRef.current.style.transform = timelineScroll > 0
        ? `translate3d(0, -${timelineScroll * PARALLAX_SPEED}px, 0)`
        : `translate3d(0, 0px, 0)`;
    };

    window.addEventListener("lenis-scroll", onScroll);
    return () => window.removeEventListener("lenis-scroll", onScroll);
  }, []);

  const sectionH = `calc(100vh - ${HEADER_HEIGHT}px)`;

  return (
    <>
      {/* hero: fixed z=1 */}
      <div
        ref={heroRef}
        style={{
          position:           "fixed",
          top:                HEADER_HEIGHT,
          left:               0,
          right:              0,
          height:             sectionH,
          zIndex:             1,
          willChange:         "transform",
          backfaceVisibility: "hidden",
        }}
      >
        <HeroSection paused={heroPaused} />
      </div>
      <div style={{ height: sectionH }} aria-hidden="true" />

      {/* stat + match: normal flow z=2 */}
      <div style={{ position: "relative", zIndex: 2 }}>
        <StatSection />
        <MatchSection />
      </div>

      {/* timeline: sticky z=2 */}
      <div
        ref={timelineStickyRef}
        style={{
          position: "sticky",
          top:      HEADER_HEIGHT,
          height:   sectionH,
          zIndex:   2,
          // overflow: "hidden",
        }}
      >
        <div ref={timelineInnerRef} style={{ willChange: "transform" }}>
          <TimelineSection />
        </div>
      </div>

      {/* kasih ruang buat timeline keliatan full sebelum news naik */}
      <div style={{ height: "15vh" }} aria-hidden="true" />

      {/* news: normal flow z=3 */}
      <div style={{ position: "relative", zIndex: 3, height: sectionH }}>
        <NewsSection />
      </div>
    </>
  );
}