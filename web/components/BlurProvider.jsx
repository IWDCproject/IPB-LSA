"use client";
// --- BlurProvider -----------------------------------------------------------
//
// Global provider. Place once in layout.jsx - wraps the entire app.
// Does NOT accept a manifest. Pages register their own images via useBlurImages().
//
// Worker lifecycle:
//   - Spawned lazily on the first register() call (zero cost on pages with no blur)
//   - Shared across all pages for the lifetime of the session
//   - Bitmaps persist in memory as a cross-page cache
//   - If the worker crashes, it is automatically respawned and pending keys
//     are cleared from submittedRef so they can be resubmitted.
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

  // Ref - not state - so register() never re-renders the tree
  const workerRef    = useRef(null);
  const submittedRef = useRef(new Set()); // all keys currently sent to the worker

  // -- Lazy worker init ------------------------------------------------------
  function getWorker() {
    if (workerRef.current) return workerRef.current;

    const worker = new Worker("/blurWorker.js");

    worker.onmessage = ({ data }) => {
      if (data.error) {
        console.warn(`[BlurProvider] worker error for ${data.type} ${data.url}:`, data.error);
        if (data.url && data.type) {
          submittedRef.current.delete(`${data.url}_${data.type}`);
        }
        return;
      }

      setBitmaps((prev) => {
        const next = {
          ...prev,
          [data.url]: {
            ...(prev[data.url] ?? {}),
            [data.type]: data.type === "hero"
              ? { sharp: data.sharp, blurred: data.blurred }
              : { bitmap: data.bitmap },
          },
        };

        // --- Memory Guard ---
        // If we have more than 100 unique images, drop the oldest ones.
        // Bitmaps can be large (especially hero sharp/blurred combos).
        const keys = Object.keys(next);
        if (keys.length > 100) {
          const toDelete = keys.slice(0, keys.length - 100);
          for (const k of toDelete) {
            // Important: Explicitly close bitmaps before dropping reference
            // to help the browser GC reclaim GPU memory immediately.
            const entry = next[k];
            if (entry) {
              Object.values(entry).forEach((val) => {
                if (val.bitmap?.close)  val.bitmap.close();
                if (val.sharp?.close)   val.sharp.close();
                if (val.blurred?.close) val.blurred.close();
              });
            }
            delete next[k];
            // Also allow them to be re-registered later if needed
            for (const type of ["hero", "eventcard", "newscard", "matchcard"]) {
              submittedRef.current.delete(`${k}_${type}`);
            }
          }
        }

        return next;
      });
    };

    worker.onerror = (e) => {
      console.warn("[BlurProvider] uncaught worker error:", e.message);

      // FIX: Null out the dead worker so the next getWorker() call spawns a
      // fresh one. Previously workerRef kept pointing at the crashed worker -
      // all subsequent postMessage() calls were silently dropped, and blur
      // stopped working for the rest of the session with no visible error.
      workerRef.current = null;

      // Also clear submittedRef so all pending images can be resubmitted to
      // the new worker. Without this, every image that was "in flight" when
      // the worker crashed would be permanently blacklisted.
      submittedRef.current.clear();
    };

    workerRef.current = worker;
    return worker;
  }

  // -- register --------------------------------------------------------------
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

  // -- unregister ------------------------------------------------------------
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