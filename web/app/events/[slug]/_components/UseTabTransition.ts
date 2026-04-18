"use client";
/**
 * useTabTransition.ts
 *
 * Manages the lifecycle of tab transitions so every tab gets a coordinated
 * enter animation regardless of whether it's a first load or a tab switch.
 *
 * Usage in EventDetailClient:
 *
 *   const { displayedTab, phase } = useTabTransition(activeTab);
 *
 *   // Render displayedTab (not activeTab!) so the old tab stays mounted
 *   // during the exit phase, then swap to the new one.
 *   {displayedTab === "overview" && <OverviewTab phase={phase} ... />}
 *
 * Each tab receives `phase: "entering" | "idle"` and applies its own
 * stagger animations accordingly.
 *
 * Exit is handled here by keeping the old tab visible for EXIT_DURATION ms
 * via a CSS opacity fade (applied by TabContentShell), then swapping.
 */

import { useState, useEffect, useRef } from "react";

export type AnimPhase = "entering" | "idle";

const EXIT_DURATION  = 120; // ms — old tab fades out
const ENTER_DELAY    = 30;  // ms — brief gap before new tab animates in

export function useTabTransition<T extends string>(activeTab: T) {
  // The tab currently rendered in the DOM (may lag behind activeTab during exit)
  const [displayedTab, setDisplayedTab] = useState<T>(activeTab);
  // Animation phase of the currently displayed tab
  const [phase, setPhase] = useState<AnimPhase>("entering");
  // Whether we're in the middle of an exit fade
  const [isExiting, setIsExiting] = useState(false);

  const pendingTab  = useRef<T | null>(null);
  const exitTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enterTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // First render: just mark as entering, no exit needed
    if (isFirstRender.current) {
      isFirstRender.current = false;
      setPhase("entering");
      // After the first tab's animation completes, mark idle
      // (long enough for even PAGE_ENTER animations to finish)
      const t = setTimeout(() => setPhase("idle"), 900);
      return () => clearTimeout(t);
    }

    // Same tab clicked again — ignore
    if (activeTab === displayedTab && !isExiting) return;

    // Cancel any in-flight transitions
    if (exitTimer.current)  clearTimeout(exitTimer.current);
    if (enterTimer.current) clearTimeout(enterTimer.current);

    pendingTab.current = activeTab;
    setIsExiting(true);

    // After EXIT_DURATION, swap to the new tab and start its enter animation
    exitTimer.current = setTimeout(() => {
      const next = pendingTab.current as T;
      setIsExiting(false);
      setDisplayedTab(next);
      setPhase("entering");

      // Short delay so the DOM has time to mount the new tab before animating
      enterTimer.current = setTimeout(() => {
        setPhase("idle");
      }, 600); // covers TAB_ENTER animations (280ms × a few items)
    }, EXIT_DURATION + ENTER_DELAY);

    return () => {
      if (exitTimer.current)  clearTimeout(exitTimer.current);
      if (enterTimer.current) clearTimeout(enterTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  return { displayedTab, phase, isExiting };
}