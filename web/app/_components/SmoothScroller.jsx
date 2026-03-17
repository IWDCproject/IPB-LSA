"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { gsap } from "gsap";

gsap.registerPlugin(ScrollTrigger);

export default function SmoothScroller({ children }) {
  useEffect(() => {
    const lenis = new Lenis({
        lerp: 0.14,  // was 0.1
        smoothTouch: false,
    });

    // Keep ScrollTrigger in sync with Lenis
    lenis.on("scroll", (e) => {
        window.dispatchEvent(new CustomEvent("lenis-scroll", { detail: e }));
    });
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    // Expose lenis globally so CurtainWrapper can subscribe
    window.__lenis = lenis;

    return () => {
      lenis.destroy();
      window.__lenis = null;
    };
  }, []);

  return <>{children}</>;
}