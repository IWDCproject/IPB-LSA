"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";

import HeroSection     from "./sections/HeroSection";
import NewsSection     from "./sections/NewsSection";
import StatSection     from "./sections/StatSection";
import MatchSection    from "./sections/MatchSection";
import TimelineSection from "./sections/TimelineSection";

const HEADER_HEIGHT  = 65;
const PARALLAX_SPEED = 0.4;

// ─────────────────────────────────────────────────────────────────────────────
// CORRECT MOTION PATTERN (from motion.dev docs + olivierlarose.com tutorials)
//
// useScroll({ target, offset }) gives scrollYProgress 0→1 over the element's
// range. The offset describes WHEN the animation starts and ends using
// intersection syntax: "start end" = element's start meets viewport's end.
//
// HERO parallax:
//   target: heroSpacerRef (the element in normal flow behind the fixed hero)
//   offset: ["start start", "end start"]
//     start start = spacer top hits viewport top  (scroll=0, y=0)
//     end start   = spacer bottom hits viewport top (scroll=sectionH, y=-sectionH*0.4)
//   No spring → 1:1 at 0.4× speed, no lag
//
// TIMELINE parallax:
//   target: newsSectionRef (the section SLIDING OVER the timeline)
//   offset: ["start end", "start start"]
//     start end   = news top hits viewport bottom (news just entering, y=0)
//     start start = news top hits viewport top    (news fully covering, y=-sectionH*0.4)
//   This fires ONLY during the timeline→news curtain transition. Exact.
// ─────────────────────────────────────────────────────────────────────────────

export default function CurtainWrapper() {
  const heroSpacerRef  = useRef(null);
  const newsSectionRef = useRef(null);
  const [heroPaused, setHeroPaused] = useState(false);

  // Store viewport height in a ref — set client-side only (useEffect never
  // runs on the server, so window is safe to access here).
  // Using a ref instead of state means resize updates don't trigger re-renders.
  const viewportH = useRef(0);
  useEffect(() => {
    viewportH.current = window.innerHeight;
    const onResize = () => { viewportH.current = window.innerHeight; };
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ── Hero: track hero spacer scrolling past viewport top ───────────────────
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroSpacerRef,
    offset: ["start start", "end start"],
  });

  // Map 0→1 progress to 0 → -(sectionH × 0.4).
  // Uses viewportH ref (set in useEffect) — safe from SSR, no window on server.
  // No useSpring → zero lag, pure 1:1 at 0.4× rate.
  const heroY = useTransform(() => {
    const sectionH = viewportH.current - HEADER_HEIGHT;
    return -heroProgress.get() * sectionH * PARALLAX_SPEED;
  });

  // ── Timeline: track news section entering viewport ────────────────────────
  const { scrollYProgress: tlProgress } = useScroll({
    target: newsSectionRef,
    offset: ["start end", "start start"],
  });

  const timelineY = useTransform(() => {
    const sectionH = viewportH.current - HEADER_HEIGHT;
    return -tlProgress.get() * sectionH * PARALLAX_SPEED;
  });

  // ── heroPaused ─────────────────────────────────────────────────────────────
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

  const sectionH  = `calc(100vh - ${HEADER_HEIGHT}px)`;
  // parallaxH: outer hero/timeline container is sectionH * 1.4 tall.
  // At max drift (-sectionH × 0.4), the bottom of the container still
  // reaches the viewport bottom → no white gap possible.
  const parallaxH = `calc((100vh - ${HEADER_HEIGHT}px) * ${1 + PARALLAX_SPEED})`;

  return (
    <>
      {/* ── Hero: fixed, z=1 ─────────────────────────────────────────────── */}
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
        }}
      >
        {/*
          Inner div constrains HeroSection to sectionH.
          HeroSection uses h-full — without this it would expand to parallaxH
          (1.4× viewport), pushing cards + marquee 0.4×vh offscreen at scroll=0.
        */}
        <div style={{ height: sectionH, overflow: "hidden" }}>
          <HeroSection paused={heroPaused} />
        </div>
      </motion.div>

      {/*
        Spacer: sectionH in normal flow.
        - Pushes stats/match below the hero
        - Used as useScroll target for heroProgress
        - Used as IntersectionObserver target for heroPaused
      */}
      <div ref={heroSpacerRef} style={{ height: sectionH }} aria-hidden="true" />

      {/* ── Stats + Match: z=2, the curtain sliding over hero ────────────── */}
      <div style={{ position: "relative", zIndex: 2 }}>
        <StatSection />
        <MatchSection />
      </div>

      {/* ── Timeline: sticky z=2, parallaxes as news slides over it ─────── */}
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
          <TimelineSection />
        </motion.div>
      </div>

      {/*
        News: z=3, slides over timeline.
        ref is the useScroll target for tlProgress.
        useScroll tracks this element as it enters the viewport from below.
      */}
      <div
        ref={newsSectionRef}
        style={{ position: "relative", zIndex: 3, height: sectionH }}
      >
        <NewsSection />
      </div>
    </>
  );
}