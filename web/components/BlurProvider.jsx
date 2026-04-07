"use client";
// BlurProvider: satu worker, satu overlay, semua section dapat bitmap dari sini
// Bungkus CurtainWrapper di page.jsx — jangan taruh di dalam CurtainWrapper

import { useEffect, useRef, useState } from "react";
import { BlurContext } from "../contexts/BlurContext";

const MIN_MS  = 1000;  // overlay minimal jalan selama ini
const MAX_MS  = 6500;  // hard cap — overlay angkat meskipun gambar belum selesai
const FADE_MS = 600;   // durasi fade out overlay

// ────────────────────────────────────────────────────────
// URL manifest (hardcode dulu, nanti jadi prop dinamis dari page.jsx)
// key: url, type, width (full card/image), height (full card/image)
//
// Catatan dedup: kalau url+type sama, worker hanya proses sekali.
// Kalau satu url butuh DUA tipe (hero background + eventcard untuk EventCard),
// perlu dua entry dengan type berbeda — bukan duplikat, dua job berbeda.
//
// EventCard (eventcard type) belum disambungkan karena EventCard.jsx belum dimodif.
// MatchCard (matchcard type) belum disambungkan karena URL-nya dari API.
// Tambahkan entry di sini saat section baru disambungkan ke sistem.
// ────────────────────────────────────────────────────────
const DEFAULT_MANIFEST = [
  // hero background images dari HeroSection EVENTS (untuk canvas background)
  { url: "https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?w=1200", type: "hero", width: 1200, height: 800 },
  { url: "https://images.unsplash.com/photo-1555597673-b21d5c935865?w=1200", type: "hero", width: 1200, height: 800 },
  { url: "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=1200", type: "hero", width: 1200, height: 800 },
  { url: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200", type: "hero", width: 1200, height: 800 },
  { url: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1200", type: "hero", width: 1200, height: 800 },
  { url: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=1200", type: "hero", width: 1200, height: 800 },
  { url: "https://images.unsplash.com/photo-1560090995-01632a28895b?w=1200",   type: "hero", width: 1200, height: 800 },
  { url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200",   type: "hero", width: 1200, height: 800 },
  // newscard images dari NewsSection DUMMY_NEWS
  // item pertama = main card (800×600), sisanya = small card (400×300)
  { url: "https://picsum.photos/seed/badminton/800/600", type: "newscard", width: 800, height: 600 },
  { url: "https://picsum.photos/seed/karate/400/300",    type: "newscard", width: 400, height: 300 },
  { url: "https://picsum.photos/seed/hackathon/400/300", type: "newscard", width: 400, height: 300 },
  { url: "https://picsum.photos/seed/gaming/400/300",    type: "newscard", width: 400, height: 300 },
  { url: "https://picsum.photos/seed/futsal/400/300",    type: "newscard", width: 400, height: 300 },
];

export default function BlurProvider({ children, imageManifest }) {
  const manifest = imageManifest ?? DEFAULT_MANIFEST;

  const [bitmaps,  setBitmaps]  = useState({});
  const [isReady,  setIsReady]  = useState(false);

  const overlayRef = useRef(null);

  useEffect(() => {
    // dedup by url+type — satu pekerjaan per kombinasi
    const unique = [
      ...new Map(manifest.map((img) => [`${img.url}_${img.type}`, img])).values(),
    ];

    let readyCount = 0;
    let lifted     = false;
    let cap;

    function liftOverlay() {
      if (lifted) return;
      lifted = true;
      clearTimeout(cap);

      const el = overlayRef.current;
      if (el) {
        el.style.opacity       = "0";
        el.style.pointerEvents = "none";
      }
      // isReady jadi true setelah fade selesai biar hero bisa mulai animasi
      setTimeout(() => setIsReady(true), FADE_MS);
    }

    function onDone() {
      readyCount++;
      if (readyCount < unique.length) return;
      // semua selesai — tunggu sisa waktu minimal sebelum lift
      const elapsed   = Date.now() - startTime;
      const remaining = Math.max(0, MIN_MS - elapsed);
      setTimeout(liftOverlay, remaining);
    }

    if (!unique.length) {
      // nggak ada gambar, angkat overlay setelah MIN_MS
      const t = setTimeout(liftOverlay, MIN_MS);
      return () => clearTimeout(t);
    }

    const startTime = Date.now();
    const worker    = new Worker("/blurWorker.js");

    worker.onmessage = ({ data }) => {
      if (!data.error) {
        // simpan ke context — kunci: url → { type: bitmapData }
        setBitmaps((prev) => ({
          ...prev,
          [data.url]: {
            ...(prev[data.url] ?? {}),
            // hero: { sharp, blurred } | lainnya: { bitmap }
            [data.type]: data.type === "hero"
              ? { sharp: data.sharp, blurred: data.blurred }
              : { bitmap: data.bitmap },
          },
        }));
      }
      onDone();
    };

    worker.onerror = (e) => {
      console.warn("[BlurProvider] worker error:", e.message);
      onDone(); // tetap hitung progress meskipun gagal
    };

    // kirim semua gambar sekaligus — worker proses paralel
    worker.postMessage({
      images: unique.map((img) => ({ ...img, id: `${img.url}_${img.type}` })),
    });

    // hard cap — kalau dalam 6.5 detik belum selesai, angkat overlay paksa
    cap = setTimeout(liftOverlay, MAX_MS);
    

    return () => {
      worker.terminate();
      clearTimeout(cap);
    };
  }, [manifest]); // React to manifest changes

  return (
    <BlurContext.Provider value={{ bitmaps, isReady }}>
      {/* overlay full screen — sama persis dengan spinner HeroSection lama */}
      {/* @keyframes spin harus ada di globals.css (sudah ada dari HeroSection) */}
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
          transition:     `opacity ${FADE_MS}ms ease`,
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

      {children}
    </BlurContext.Provider>
  );
}