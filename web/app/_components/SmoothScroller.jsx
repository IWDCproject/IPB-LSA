"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css"; // ← biar .lenis-stopped { overflow: hidden } works
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function SmoothScroller({ children }) {
  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.2,
      smoothTouch: false,
    });

    // stop dulu dari awal — HeroSection yang bakal start() pas prerender kelar
    lenis.stop();
    window.__lenis = lenis;

    lenis.on("scroll", (e) => {
      window.dispatchEvent(new CustomEvent("lenis-scroll", { detail: e }));
    });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.destroy();
      window.__lenis = null;
    };
  }, []);

  return <>{children}</>;
}