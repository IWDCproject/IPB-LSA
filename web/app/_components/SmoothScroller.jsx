"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function SmoothScroller({ children }) {
  useEffect(() => {
    // browser nggak boleh restore scroll position, Lenis yang pegang
    window.history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    const lenis = new Lenis({
      lerp:        0.1, 
      smoothTouch: false,
    });

    // stop dulu dari awal
    // HeroSection yang bakal start() pas prerender kelar
    lenis.stop();
    window.__lenis = lenis;

    const dispatchScroll = (e) => {
      window.dispatchEvent(new CustomEvent("lenis-scroll", { detail: e }));
    };

    const tickerFn = (time) => lenis.raf(time * 1000);

    lenis.on("scroll", dispatchScroll);
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(tickerFn);
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.off("scroll", dispatchScroll);
      lenis.off("scroll", ScrollTrigger.update);
      gsap.ticker.remove(tickerFn);
      lenis.destroy();
      window.__lenis = null;
    };
  }, []);

  return <>{children}</>;
}