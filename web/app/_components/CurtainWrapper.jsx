"use client";

import HeroSection from "./HeroSection";
import StatSection from "./StatSection";

const HEADER_HEIGHT = 65;

export default function CurtainWrapper() {
  return (
    <>
      {/* Hero is fixed — never scrolls, ever */}
      <div style={{
        position: "fixed",
        top: HEADER_HEIGHT,
        left: 0,
        right: 0,
        height: `calc(100vh - ${HEADER_HEIGHT}px)`,
        zIndex: 1,
      }}>
        <HeroSection />
      </div>

      {/* Spacer — gives the page enough height so StatSection starts below the hero */}
      <div style={{ height: `calc(100vh - ${HEADER_HEIGHT}px)` }} aria-hidden="true" />

      {/* Slides over the fixed hero like a curtain */}
      <StatSection />
    </>
  );
}