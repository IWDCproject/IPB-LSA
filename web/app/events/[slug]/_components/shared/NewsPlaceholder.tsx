"use client";

import React from "react";
import { JK } from "./tokens";

/**
 * Decorative "Coming Soon" card — shown when an event has fewer news items
 * than the grid expects. Used in both LatestStoriesSection and NewsTab.
 */
export function NewsPlaceholder() {
  return (
    <div
      style={{
        position:        "relative",
        display:         "flex",
        flexDirection:   "column",
        alignItems:      "center",
        justifyContent:  "center",
        borderRadius:    8,
        boxShadow:       "0 0 0 2px rgba(255, 255, 255, 0.15)",
        background:      "rgba(255, 255, 255, 0.03)",
        backdropFilter:  "blur(8px)",
        padding:         "40px",
        height:          "100%",
        minHeight:       380,
        overflow:        "hidden",
      }}
    >
      <div
        style={{
          position:            "absolute",
          inset:               0,
          backgroundImage:     "url(/Batik_Pattern_white.svg)",
          backgroundSize:      "cover",
          backgroundRepeat:    "no-repeat",
          backgroundPosition:  "center",
          opacity:             0.15,
          pointerEvents:       "none",
          zIndex:              0,
          filter:              "blur(1.5px)",
        }}
      />
      <div style={{
        position:       "relative",
        zIndex:         1,
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        width:          "100%",
        textAlign:      "center",
      }}>
        <svg
          width="18" height="18" viewBox="0 0 24 24"
          fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2"
          style={{ marginBottom: 12 }}
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span style={{
          ...JK,
          fontSize:      "11px",
          fontWeight:    800,
          color:         "rgba(255,255,255,0.4)",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
        }}>
          Coming Soon
        </span>
      </div>
    </div>
  );
}