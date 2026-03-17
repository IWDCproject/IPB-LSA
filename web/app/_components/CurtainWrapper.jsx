"use client";

import { useRef, useEffect } from "react";
import HeroSection from "./HeroSection";
import StatSection from "./StatSection";

const HEADER_HEIGHT = 65;
const PARALLAX_SPEED = 0.4; // 0 = no movement, 1 = full scroll speed

export default function CurtainWrapper() {
  const heroRef = useRef(null);

  useEffect(() => {
  const heroHeight = window.innerHeight - HEADER_HEIGHT;

  const onScroll = (e) => {
    const { scroll } = e.detail;
    if (scroll > heroHeight) return;
    heroRef.current.style.transform = `translate3d(0, -${scroll * PARALLAX_SPEED}px, 0)`;
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
          willChange: "transform", // hints browser to GPU-composite this layer
          backfaceVisibility: "hidden",
        }}
      >
        <HeroSection />
      </div>

      <div style={{ height: `calc(100vh - ${HEADER_HEIGHT}px)` }} aria-hidden="true" />

      <StatSection />
    </>
  );
}