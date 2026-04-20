"use client";

import { useState, useEffect, useRef } from "react";

export type AnimPhase = "entering" | "idle";

export function useTabTransition<T extends string>(activeTab: T) {
  // The tab currently rendered in the DOM
  const [displayedTab, setDisplayedTab] = useState<T>(activeTab);
  // Animation phase of the currently displayed tab
  const [phase, setPhase] = useState<AnimPhase>("entering");

  const enterTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // First render: mark as entering, then settle to idle
    // (long enough for PAGE_ENTER animations to finish)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      setPhase("entering");
      const t = setTimeout(() => setPhase("idle"), 900);
      return () => clearTimeout(t);
    }

    // Same tab clicked again — ignore
    if (activeTab === displayedTab) return;

    // Cancel any in-flight enter timer
    if (enterTimer.current) clearTimeout(enterTimer.current);

    // Swap immediately — no exit delay
    setDisplayedTab(activeTab);
    setPhase("entering");

    // Settle to idle once TAB_ENTER animations have finished
    // (400ms duration + 30ms baseDelay + a few stagger steps @ 50ms)
    enterTimer.current = setTimeout(() => setPhase("idle"), 800);

    return () => {
      if (enterTimer.current) clearTimeout(enterTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // isExiting is always false — kept in the return value so call-sites
  // don't need to change, but TabContentShell no longer does anything with it.
  return { displayedTab, phase, isExiting: false as const };
}