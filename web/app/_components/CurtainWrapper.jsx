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

export default function CurtainWrapper({ events, matches, stats }) {
  const heroSpacerRef  = useRef(null);
  const newsSectionRef = useRef(null);
  const [heroPaused, setHeroPaused] = useState(false);

  const viewportH = useRef(0);
  useEffect(() => {
    viewportH.current = window.innerHeight;
    const onResize = () => { viewportH.current = window.innerHeight; };
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const { scrollYProgress: heroProgress } = useScroll({
    target: heroSpacerRef,
    offset: ["start start", "end start"],
  });

  const heroY = useTransform(() => {
    const sectionH = viewportH.current - HEADER_HEIGHT;
    return -heroProgress.get() * sectionH * PARALLAX_SPEED;
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

  const sectionH  = `calc(100vh - ${HEADER_HEIGHT}px)`;
  const parallaxH = `calc((100vh - ${HEADER_HEIGHT}px) * ${1 + PARALLAX_SPEED})`;

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
        }}
      >
        <div style={{ height: sectionH, overflow: "hidden" }}>
          <HeroSection paused={heroPaused} events={events} />
        </div>
      </motion.div>

      <div ref={heroSpacerRef} style={{ height: sectionH }} aria-hidden="true" />

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
        style={{ position: "relative", zIndex: 3, minHeight: sectionH }}  // ← min-height
      >
        <NewsSection />
        <Footer />
      </div>
    </>
  );
}