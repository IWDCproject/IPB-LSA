// Shared style tokens for the News page component tree.
// Import from here - never redefine locally.

import type { EventStatus } from "./_newsTypes";

export const JK     = { fontFamily: "'Plus Jakarta Sans', sans-serif" } as const;
export const BB     = { fontFamily: "'Bebas Neue', sans-serif"        } as const;

export const YELLOW = "#FFC936";
export const BLUE   = "#0D26C2";
export const NAVY   = "#06125C";

// Animation
export const DUR     = 420;   // ms, card transition duration
export const EASE    = "cubic-bezier(0.22, 1, 0.36, 1)";
export const BASE    = 40;    // ms, base stagger delay
export const STAGGER = 28;    // ms, per-item stagger increment

// Shared dropdown animation keyframes (used by MobileFilterBar + AllNewsTab EventDropdown)
export const DROPDOWN_KEYFRAMES = `
  @keyframes mob-panel-in {
    from { opacity: 0; transform: scaleY(0.88) translateY(-6px); }
    to   { opacity: 1; transform: scaleY(1)    translateY(0);    }
  }
  @keyframes mob-item-in {
    from { opacity: 0; transform: translateY(-5px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
`;

export const STATUS_OPTIONS = [
  { key: "ongoing"   as const, label: "Berlangsung", color: "#dc2626",                 symbol: "●" },
  { key: "upcoming"  as const, label: "Akan Datang", color: YELLOW,                    symbol: "◆" },
  { key: "concluded" as const, label: "Selesai",     color: "rgba(255,255,255,0.5)"             },
] satisfies { key: EventStatus; label: string; color: string; symbol?: string }[];