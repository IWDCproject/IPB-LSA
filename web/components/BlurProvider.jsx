"use client";
// ─── BlurProvider ───────────────────────────────────────────────────────────
//
// Global provider. Place once in layout.jsx — wraps the entire app.
// Does NOT accept a manifest. Pages register their own images via useBlurImages().
//
// Worker lifecycle:
//   - Spawned lazily on the first register() call (zero cost on pages that don't use blur)
//   - Shared across all pages for the lifetime of the session
//   - Bitmaps persist in memory as a cross-page cache — if two pages share an
//     image URL + type, it is only ever processed once
//
// Usage in layout.jsx:
//   import BlurProvider from "@/components/BlurProvider";
//   export default function RootLayout({ children }) {
//     return <html><body><BlurProvider>{children}</BlurProvider></body></html>;
//   }

import { useState, useRef, useCallback } from "react";
import { BlurContext }                   from "../contexts/BlurContext";

export default function BlurProvider({ children }) {
  const [bitmaps, setBitmaps] = useState({});

  // Ref — not state — so register() never re-renders the tree
  const workerRef    = useRef(null);
  const submittedRef = useRef(new Set()); // all keys ever sent to the worker

  // ── Lazy worker init ──────────────────────────────────────────────────────
  function getWorker() {
    if (workerRef.current) return workerRef.current;

    const worker = new Worker("/blurWorker.js");

    worker.onmessage = ({ data }) => {
      if (data.error) {
        console.warn(`[BlurProvider] worker error for ${data.type} ${data.url}:`, data.error);
        return;
      }

      setBitmaps((prev) => ({
        ...prev,
        [data.url]: {
          ...(prev[data.url] ?? {}),
          [data.type]: data.type === "hero"
            ? { sharp: data.sharp, blurred: data.blurred }
            : { bitmap: data.bitmap },
        },
      }));
    };

    worker.onerror = (e) => {
      console.warn("[BlurProvider] uncaught worker error:", e.message);
    };

    workerRef.current = worker;
    return worker;
  }

  // ── register ──────────────────────────────────────────────────────────────
  // Filters out already-submitted images before sending to the worker.
  // Safe to call multiple times with overlapping manifests.
  const register = useCallback((images) => {
    const toProcess = images.filter((img) => {
      if (!img?.url) return false;
      const key = `${img.url}_${img.type}`;
      if (submittedRef.current.has(key)) return false;
      submittedRef.current.add(key);
      return true;
    });

    if (!toProcess.length) return;

    getWorker().postMessage({
      images: toProcess.map((img) => ({
        ...img,
        id: `${img.url}_${img.type}`,
      })),
    });
  }, []);

  // ── unregister ────────────────────────────────────────────────────────────
  // Intentional no-op. Bitmaps are kept as a permanent cache so that navigating
  // back to a page never re-processes images that were already blurred.
  // The memory footprint is bounded by the number of unique images in the app.
  const unregister = useCallback((_ids) => {}, []);

  return (
    <BlurContext.Provider value={{ bitmaps, register, unregister }}>
      {children}
    </BlurContext.Provider>
  );
}