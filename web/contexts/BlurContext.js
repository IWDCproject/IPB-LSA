"use client";
// --- BlurContext ------------------------------------------------------------
//
// Global context for the blur system. Consumed via useBlur() internally,
// but most components should use the higher-level useBlurImages() hook instead.
//
// Shape:
//   bitmaps    - map of url → { type: bitmapData }
//                hero:      { sharp: ImageBitmap, blurred: ImageBitmap }
//                others:    { bitmap: ImageBitmap }
//
//   register   - submit images to the shared worker for processing
//   unregister - currently a no-op; kept for API symmetry and future use
//                (bitmaps are intentionally kept as a permanent cross-page cache)

import { createContext, useContext } from "react";

export const BlurContext = createContext({
  bitmaps:    {},
  register:   (_images) => {},
  unregister: (_ids)    => {},
});

export function useBlur() {
  return useContext(BlurContext);
}