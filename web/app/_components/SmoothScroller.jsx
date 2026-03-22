"use client";

// Lenis removed entirely.
//
// The parallax and smooth feel are now handled by Motion for React
// (useScroll + useTransform + useSpring in CurtainWrapper), which uses
// the browser's native ScrollTimeline API for hardware-accelerated scroll-linked
// animations. Native scroll is never intercepted, so Firefox APZ stays async.
//
// If you imported lenis/dist/lenis.css in this file, you can remove that CSS
// import too. Also ensure globals.css has no `overflow: hidden` on html/body
// that was previously set by Lenis to lock native scroll.

export default function SmoothScroller({ children }) {
  return <>{children}</>;
}