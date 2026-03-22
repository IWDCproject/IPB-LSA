"use client";
// konteks untuk berbagi hasil blur antar semua section
// import useBlur() di mana pun butuh bitmap

import { createContext, useContext } from "react";

export const BlurContext = createContext({
  // bitmaps[url][type] → { sharp, blurred } untuk hero, { bitmap } untuk lainnya
  bitmaps:  {},
  // isReady jadi true setelah overlay selesai fade out
  isReady:  false,
});

export function useBlur() {
  return useContext(BlurContext);
}