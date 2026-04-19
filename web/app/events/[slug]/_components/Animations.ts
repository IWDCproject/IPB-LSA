"use client";

// ─── Keyframe definitions ──────────────────────────────────────────────────────

export const KEYFRAMES = `
  @keyframes anim-slide-up {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
  @keyframes anim-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes anim-slide-down {
    from { opacity: 0; transform: translateY(-10px); }
    to   { opacity: 1; transform: translateY(0);     }
  }
  @keyframes anim-shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position:  400px 0; }
  }
`;

// ─── Easing presets ────────────────────────────────────────────────────────────

const EASE_OUT_EXPO = "cubic-bezier(0.16, 1, 0.3, 1)";
const EASE_OUT_SOFT = "cubic-bezier(0.22, 1, 0.36, 1)";

// ─── Timing tiers ─────────────────────────────────────────────────────────────

/** First-load stagger: elements reveal slowly and gracefully */
export const PAGE_ENTER = {
  duration:  600,
  stagger:   80,
  easing:    EASE_OUT_EXPO,
} as const;

/** Tab-switch stagger: quick, purposeful, not distracting */
export const TAB_ENTER = {
  duration:  280,
  stagger:   40,
  easing:    EASE_OUT_SOFT,
} as const;

// ─── Style factories ───────────────────────────────────────────────────────────

/**
 * Returns an inline style that plays `anim-slide-up` after `delay` ms.
 * Start opacity:0 so the element is invisible before the animation fires.
 */
export function staggerSlideUp(
  delay: number,
  tier: typeof PAGE_ENTER | typeof TAB_ENTER = PAGE_ENTER,
): React.CSSProperties {
  return {
    opacity: 0,
    animation: `anim-slide-up ${tier.duration}ms ${tier.easing} ${delay}ms forwards`,
  };
}

/**
 * Returns an inline style that plays `anim-fade-in` after `delay` ms.
 */
export function staggerFadeIn(
  delay: number,
  tier: typeof PAGE_ENTER | typeof TAB_ENTER = PAGE_ENTER,
): React.CSSProperties {
  return {
    opacity: 0,
    animation: `anim-fade-in ${tier.duration}ms ${tier.easing} ${delay}ms forwards`,
  };
}

/**
 * Convenience: build a stagger sequence for N items.
 * Returns an array of styles, each offset by `tier.stagger` ms.
 *
 * @example
 * const styles = buildStagger(panels.length, TAB_ENTER, "slide-up");
 * panels.map((p, i) => <div style={styles[i]}>{p}</div>)
 */
export function buildStagger(
  count: number,
  tier: typeof PAGE_ENTER | typeof TAB_ENTER = TAB_ENTER,
  variant: "slide-up" | "fade-in" = "slide-up",
  baseDelay = 0,
): React.CSSProperties[] {
  return Array.from({ length: count }, (_, i) => {
    const delay = baseDelay + i * tier.stagger;
    return variant === "slide-up"
      ? staggerSlideUp(delay, tier)
      : staggerFadeIn(delay, tier);
  });
}

/**
 * Shimmer gradient for skeleton loading states.
 * Apply as a `background` shorthand with `backgroundSize` and `animation`.
 */
export const SHIMMER_STYLE: React.CSSProperties = {
  background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
  backgroundSize: "800px 100%",
  animation: "anim-shimmer 1.4s ease-in-out infinite",
};

/**
 * Dark shimmer for components on dark backgrounds (e.g. news tab on dark bg).
 */
export const SHIMMER_DARK_STYLE: React.CSSProperties = {
  background: "linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 75%)",
  backgroundSize: "800px 100%",
  animation: "anim-shimmer 1.4s ease-in-out infinite",
};