"use client";
/**
 * TabContentShell.tsx
 *
 * Wraps each tab's root element and handles:
 *   1. Exit fade (opacity: 0, pointer-events: none) during `isExiting`
 *   2. Provides a stable container so layout doesn't shift during transitions
 *
 * All child stagger animations are driven by the `phase` prop passed down
 * from EventDetailClient → each Tab component. This shell only handles
 * the outer container's visibility.
 */

import React from "react";

interface Props {
  isExiting: boolean;
  children:  React.ReactNode;
}

const EXIT_DURATION = 120; // must match useTabTransition.EXIT_DURATION

export default function TabContentShell({ isExiting, children }: Props) {
  return (
    <div
      style={{
        opacity:         isExiting ? 0 : 1,
        pointerEvents:   isExiting ? "none" : undefined,
        transition:      `opacity ${EXIT_DURATION}ms ease`,
        // Prevent layout collapse while exiting
        willChange:      "opacity",
      }}
    >
      {children}
    </div>
  );
}