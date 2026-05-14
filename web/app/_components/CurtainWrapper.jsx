"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";

import HeroSection     from "./sections/HeroSection";
import NewsSection     from "./sections/NewsSection";
import StatSection     from "./sections/StatSection";
import MatchSection    from "./sections/MatchSection";
import TimelineSection from "./sections/TimelineSection";
import Footer from "@/components/Footer";

const HEADER_HEIGHT  = 65;
const PARALLAX_SPEED = 0.4;

// Minimum hero content height — prevents internal components from overlapping
// on very short viewports. Acts as a fallback; normally 100vh is used.
const MIN_HERO_H_DESKTOP = 640;
const MIN_HERO_H_MOBILE  = 540;

export default function CurtainWrapper({ events, matches, stats, news }) {
  const heroSpacerRef  = useRef(null);
  const newsSectionRef = useRef(null);
  const [heroPaused, setHeroPaused] = useState(false);

  const viewportH = useRef(0);
  const viewportW = useRef(0);
  const [vh, setVh] = useState(0);
  const [vw, setVw] = useState(0);

  useEffect(() => {
    const update = () => {
      const h = window.visualViewport?.height ?? window.innerHeight;
      const w = window.visualViewport?.width  ?? window.innerWidth;
      viewportH.current = h;
      viewportW.current = w;
      setVh(h);
      setVw(w);
    };
    update();
    window.visualViewport?.addEventListener("resize", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      window.visualViewport?.removeEventListener("resize", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const { scrollYProgress: heroProgress } = useScroll({
    target: heroSpacerRef,
    offset: ["start start", "end start"],
  });

  const heroY = useTransform(() => {
    const availH  = viewportH.current - HEADER_HEIGHT;
    const isMob   = viewportW.current < 1024;
    const floorH  = isMob ? MIN_HERO_H_MOBILE : MIN_HERO_H_DESKTOP;
    const heroH   = Math.max(availH, floorH);
    const overflow = Math.max(0, heroH - availH);
    const curVh   = viewportH.current;

    // Spacer in DOM = overflow > 0 ? (overflow + vh) : heroH
    // heroProgress goes 0→1 over that spacer distance.
    const spacer     = overflow > 0 ? (overflow + curVh) : heroH;
    const scrolledPx = heroProgress.get() * spacer;

    if (overflow > 0) {
      // FLOOR MODE — two phases:
      // Phase 1 – REVEAL: push hero up 1:1 to expose cards/marquee hidden below viewport.
      //   Completes at scrolledPx = overflow, exactly when StatSection enters from below.
      // Phase 2 – PARALLAX: StatSection now covers the viewport bottom (z:2 over z:1),
      //   so the hero can continue its slow upward parallax safely — any gap at the
      //   bottom is hidden by the incoming StatSection curtain.
      const revealY    = -Math.min(scrolledPx, overflow);
      const parallaxPx = Math.max(0, scrolledPx - overflow);
      const parallaxY  = -(parallaxPx / heroH) * availH * PARALLAX_SPEED;
      return revealY + parallaxY;
    } else {
      // NORMAL MODE — original parallax, unchanged.
      return -(scrolledPx / heroH) * availH * PARALLAX_SPEED;
    }
  });

  const { scrollYProgress: tlProgress } = useScroll({
    target: newsSectionRef,
    offset: ["start end", "start start"],
  });

  const timelineY = useTransform(() => {
    const sectionH = viewportH.current - HEADER_HEIGHT;
    return -tlProgress.get() * sectionH * PARALLAX_SPEED;
  });

  useEffect(() => {
    const el = heroSpacerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setHeroPaused(!entry.isIntersecting),
      { threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // ─── Height calculations ───────────────────────────────────────────────────
  const isMobileHero = vw > 0 ? vw < 1024 : false;
  const floorH       = isMobileHero ? MIN_HERO_H_MOBILE : MIN_HERO_H_DESKTOP;
  const availH       = vh ? (vh - HEADER_HEIGHT) : 0;
  const heroHValue   = Math.max(availH, floorH);
  const overflowH    = Math.max(0, heroHValue - availH);

  // FLOOR MODE spacer math:
  //   spacer = overflowH + vh
  //   → StatSection enters at scrollY = spacer - vh = overflowH
  //   → Reveal completes at scrollY = overflowH   (scrolledPx = overflowH)
  //   → Both happen simultaneously: zero gap, seamless curtain.
  //
  // NORMAL MODE spacer = heroHValue (identical to original).
  const spacerHValue = overflowH > 0 ? (overflowH + vh) : heroHValue;

  // parallaxH: outer fixed container must be tall enough so its bottom
  // never leaves the viewport even after heroY shifts it upward.
  // Floor mode: hero is held at y=-overflowH, container bottom = 65 - overflowH + parallaxH ≥ vh
  //   → parallaxH ≥ vh - 65 + overflowH = availH + overflowH = heroHValue ✓
  // Normal mode: original formula.
  const parallaxHVal = overflowH > 0
    ? heroHValue + overflowH          // covers full viewport after reveal shift
    : heroHValue * (1 + PARALLAX_SPEED);

  const sectionH  = vh ? `${heroHValue}px`   : `calc(max(100svh - ${HEADER_HEIGHT}px, ${floorH}px))`;
  const parallaxH = vh ? `${parallaxHVal}px` : `calc(max(100svh - ${HEADER_HEIGHT}px, ${floorH}px) * ${1 + PARALLAX_SPEED})`;
  const spacerH   = vh ? `${spacerHValue}px` : sectionH;

  return (
    <>
      <motion.div
        style={{
          position:           "fixed",
          top:                HEADER_HEIGHT,
          left:               0,
          right:              0,
          height:             parallaxH,
          zIndex:             1,
          y:                  heroY,
          willChange:         "transform",
          backfaceVisibility: "hidden",
          overflow:           "hidden",
          // Prevents white body (#fafafa) from showing through the transparent
          // container in edge cases where inner content scrolls above the viewport.
          backgroundColor:    "#000",
        }}
      >
        <div style={{ height: sectionH, overflow: "hidden" }}>
          <HeroSection paused={heroPaused} events={events} />
        </div>
      </motion.div>

      <div ref={heroSpacerRef} style={{ height: spacerH }} aria-hidden="true" />

      <div style={{ position: "relative", zIndex: 2 }}>
        <StatSection stats={stats} />
        <MatchSection matches={matches} />
      </div>

      <div
        style={{
          position: "sticky",
          top:      HEADER_HEIGHT,
          height:   sectionH,
          zIndex:   2,
          overflow: "hidden",
        }}
      >
        <motion.div
          style={{
            y:          timelineY,
            willChange: "transform",
          }}
        >
          <TimelineSection events={events} />
        </motion.div>
      </div>

      <div
        ref={newsSectionRef}
        style={{ position: "relative", zIndex: 3, minHeight: sectionH }}
      >
        <NewsSection news={news} />
        <Footer />
      </div>
    </>
  );
}