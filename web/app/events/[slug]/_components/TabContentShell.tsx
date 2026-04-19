"use client";

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