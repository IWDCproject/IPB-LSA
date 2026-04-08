"use client";
// ─── useBlurImages ──────────────────────────────────────────────────────────
//
// The primary API for any component that needs blurred images.
// Registers images with the shared worker on mount, returns bitmaps + ready state.
//
// USAGE
// ──────────────────────────────────────────────────────────────────────────
//   const manifest = useMemo(() => [
//     {
//       url:           getAssetUrl(event.card_image),  // full Directus asset URL
//       type:          "hero",                          // "hero" | "eventcard" | "newscard" | "matchcard"
//       width:         1200,                            // canvas target width
//       height:        800,                             // canvas target height
//       naturalWidth:  event.card_image?.width,         // original pixel width from Directus
//       naturalHeight: event.card_image?.height,        // original pixel height from Directus
//     },
//   ], [event]);
//
//   const { bitmaps, isReady } = useBlurImages(manifest);
//
//   // Access a bitmap:
//   const heroData = bitmaps[url]?.hero;      // { sharp: ImageBitmap, blurred: ImageBitmap }
//   const cardData = bitmaps[url]?.eventcard; // { bitmap: ImageBitmap }
//
// NOTES
// ──────────────────────────────────────────────────────────────────────────
//   - Wrap your manifest in useMemo() to keep it stable across renders.
//     useBlurImages() uses the manifest's content as a dependency, so an
//     unstable reference will re-register on every render.
//
//   - isReady is true only when ALL images in this manifest are done.
//     If you only care about a subset, pass a smaller manifest.
//
//   - Images that were already processed (e.g. on another page) resolve
//     immediately — no re-processing, no extra worker messages.
//
//   - It is safe to call useBlurImages() in multiple components on the same
//     page. Duplicate url+type combos are deduplicated by BlurProvider.

import { useEffect, useMemo } from "react";
import { useBlur }            from "../contexts/BlurContext";

export function useBlurImages(manifest) {
  const { register, unregister, bitmaps } = useBlur();

  // Stable key derived from manifest content — prevents re-registering on
  // re-renders where the manifest array reference changes but content hasn't.
  const manifestKey = useMemo(
    () => manifest?.map((img) => `${img.url}_${img.type}`).join(",") ?? "",
    [manifest],
  );

  useEffect(() => {
    if (!manifest?.length) return;
    register(manifest);
    return () => unregister(manifest.map((img) => `${img.url}_${img.type}`));
    // manifestKey as dep — only re-register when content actually changes
  }, [manifestKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // isReady: all images in this manifest have a bitmap entry in context
  const isReady = useMemo(() => {
    if (!manifest?.length) return true;
    return manifest.every((img) => bitmaps[img.url]?.[img.type] != null);
  }, [manifest, bitmaps]);

  return { bitmaps, isReady };
}