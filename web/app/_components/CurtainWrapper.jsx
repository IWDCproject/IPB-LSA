"use client";

import { useRef, useEffect, useState } from "react";
import HeroSection from "./sections/HeroSection";
import StatSection from "./sections/StatSection";

const HEADER_HEIGHT = 65;
const PARALLAX_SPEED = 0.4;

export default function CurtainWrapper() {
  const heroRef = useRef(null);

  // paused dikontrol scroll, bukan IO, karena hero selalu fixed di viewport
  const [heroPaused, setHeroPaused] = useState(false);

  useEffect(() => {
    const heroHeight = window.innerHeight - HEADER_HEIGHT;

    const onScroll = (e) => {
      const { scroll } = e.detail;

      if (scroll <= heroHeight) {
        heroRef.current.style.transform = `translate3d(0, -${scroll * PARALLAX_SPEED}px, 0)`;
      }

      // hero ketutupan StatSection kalau udah lewat heroHeight
      setHeroPaused(scroll > heroHeight);
    };

    window.addEventListener("lenis-scroll", onScroll);
    return () => window.removeEventListener("lenis-scroll", onScroll);
  }, []);

  return (
    <>
      <div
        ref={heroRef}
        style={{
          position: "fixed",
          top: HEADER_HEIGHT,
          left: 0,
          right: 0,
          height: `calc(100vh - ${HEADER_HEIGHT}px)`,
          zIndex: 1,
          willChange: "transform",
          backfaceVisibility: "hidden",
        }}
      >
        <HeroSection paused={heroPaused} />
      </div>

      <div style={{ height: `calc(100vh - ${HEADER_HEIGHT}px)` }} aria-hidden="true" />

      <StatSection />
    </>
  );
}