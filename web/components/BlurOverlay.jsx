"use client";
// ─── BlurOverlay ────────────────────────────────────────────────────────────
//
// Optional full-screen loading overlay. Drop into any page or section that
// should block visibility until its blur images are ready.
//
// USAGE
// ──────────────────────────────────────────────────────────────────────────
//   const { isReady } = useBlurImages(manifest);
//   return (
//     <>
//       <BlurOverlay isReady={isReady} />
//       <YourPageContent />
//     </>
//   );
//
// PROPS
// ──────────────────────────────────────────────────────────────────────────
//   isReady   boolean   When true, overlay fades out. Pass directly from useBlurImages().
//   minMs     number    Minimum visible duration in ms. Prevents flash-of-overlay on
//                       fast connections / cached images. Default: 1000.
//   maxMs     number    Hard cap in ms. Overlay lifts even if images aren't ready.
//                       Prevents infinite blocking on slow networks. Default: 6500.
//   fadeMs    number    Fade-out duration in ms. Default: 600.
//
// NOTES
// ──────────────────────────────────────────────────────────────────────────
//   - The overlay unmounts itself from the DOM after fade-out to free memory.
//   - Spinner color uses the project's yellow accent (rgba(234,179,8,0.9)).
//     Adjust to match your brand if needed.
//   - @keyframes spin must be present in globals.css:
//       @keyframes spin { to { transform: rotate(360deg); } }

import { useRef, useEffect, useState, useCallback } from "react";

export default function BlurOverlay({
  isReady,
  minMs  = 1000,
  maxMs  = 6500,
  fadeMs = 600,
}) {
  const overlayRef = useRef(null);
  const startTime  = useRef(Date.now());
  const lifted     = useRef(false);
  const [mounted, setMounted] = useState(true);

  // useCallback so both effects below can list `lift` as a stable dep.
  const lift = useCallback(() => {
    if (lifted.current) return;
    lifted.current = true;

    const el = overlayRef.current;
    if (el) {
      el.style.opacity       = "0";
      el.style.pointerEvents = "none";
    }

    // Unmount after fade completes — frees DOM node and stops animation
    setTimeout(() => setMounted(false), fadeMs);
  }, [fadeMs]);

  // Lift when isReady, respecting minMs floor
  useEffect(() => {
    if (!isReady) return;
    const elapsed   = Date.now() - startTime.current;
    const remaining = Math.max(0, minMs - elapsed);
    const t = setTimeout(lift, remaining);
    return () => clearTimeout(t);
  }, [isReady, minMs, lift]);

  // Hard cap — always lift eventually regardless of isReady
  useEffect(() => {
    const t = setTimeout(lift, maxMs);
    return () => clearTimeout(t);
  }, [maxMs, lift]);

  if (!mounted) return null;

  return (
    <div
      ref={overlayRef}
      style={{
        position:       "fixed",
        inset:          0,
        zIndex:         9999,
        background:     "#000",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        transition:     `opacity ${fadeMs}ms ease`,
        pointerEvents:  "auto",
      }}
    >
      <div
        style={{
          width:        20,
          height:       20,
          borderRadius: "50%",
          border:       "2px solid rgba(255,255,255,0.1)",
          borderTop:    "2px solid rgba(234,179,8,0.9)",
          animation:    "spin 0.8s linear infinite",
        }}
      />
    </div>
  );
}