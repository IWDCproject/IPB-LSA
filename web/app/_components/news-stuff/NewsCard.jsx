"use client";

import { useRef, useEffect } from "react";
import { gsap }              from "gsap";
import ArrowIcon             from "@/app/icons/arrow-up-right.svg";

// Props map 1:1 ke kolom DB
// thumbnail_url  <- news.thumbnail_url
// tag            <- events.name (via join)
// title          <- news.title
// isMain         <- frontend-only, nentuin layout besar/kecil
// compact        <- frontend-only, nentuin ukuran konten (mobile mode)
// bitmap         <- opsional, dari BlurProvider — pre-rendered blur overlay

const BLUR_LAYERS = [
  { blur: "1px",  mask: "linear-gradient(rgba(0,0,0,0), rgba(0,0,0,1) 15%, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 58%)" },
  { blur: "3px",  mask: "linear-gradient(rgba(0,0,0,0) 25%, rgba(0,0,0,1) 42%, rgba(0,0,0,1) 62%, rgba(0,0,0,0) 76%)" },
  { blur: "6px",  mask: "linear-gradient(rgba(0,0,0,0) 50%, rgba(0,0,0,1) 64%, rgba(0,0,0,1) 80%, rgba(0,0,0,0) 90%)" },
  { blur: "10px", mask: "linear-gradient(rgba(0,0,0,0) 68%, rgba(0,0,0,1) 82%, rgba(0,0,0,1) 100%)" },
];

const SIZE = {
  mainTitle:    35,
  mainTag:      18,
  mainArrow:    28,
  mainPad:      45,
  mainStroke:   3,

  mainCompactTitle: 20,
  mainCompactTag:   14,
  mainCompactArrow: 20,
  mainCompactPad:   20,
  mainCompactStroke: 2,

  smallTitle:   25,
  smallTag:     12,
  smallArrow:   20,
  smallPad:     30,
  smallStroke:  2,

  smallCompactTitle: 14,
  smallCompactTag:   10,
  smallCompactArrow: 16,
  smallCompactPad:   14,
  smallCompactStroke: 2,
};

function getSizes(isMain, compact) {
  if (isMain && !compact) return {
    title:  SIZE.mainTitle,
    tag:    SIZE.mainTag,
    arrow:  SIZE.mainArrow,
    pad:    SIZE.mainPad,
    stroke: SIZE.mainStroke,
  };
  if (isMain && compact) return {
    title:  SIZE.mainCompactTitle,
    tag:    SIZE.mainCompactTag,
    arrow:  SIZE.mainCompactArrow,
    pad:    SIZE.mainCompactPad,
    stroke: SIZE.mainCompactStroke,
  };
  if (!isMain && !compact) return {
    title:  SIZE.smallTitle,
    tag:    SIZE.smallTag,
    arrow:  SIZE.smallArrow,
    pad:    SIZE.smallPad,
    stroke: SIZE.smallStroke,
  };
  return {
    title:  SIZE.smallCompactTitle,
    tag:    SIZE.smallCompactTag,
    arrow:  SIZE.smallCompactArrow,
    pad:    SIZE.smallCompactPad,
    stroke: SIZE.smallCompactStroke,
  };
}

// canvas yang nge-scale bitmap ke ukuran container via ResizeObserver
// dipasang di dalam blurContainer — menggantikan 4× backdropFilter div
// kalau bitmap null, komponen ini nggak di-render (fallback ke CSS)
function BitmapBlurCanvas() {
  const canvasRef = useRef(null);

  // bitmap disimpan di ref biar ResizeObserver bisa akses tanpa closure masalah
  const bitmapRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;


    function draw() {
      if (!bitmapRef.current) return;
      const dpr = window.devicePixelRatio || 1;
      const w   = canvas.offsetWidth  || 1;
      const h   = canvas.offsetHeight || 1;
      canvas.width        = Math.round(w * dpr);
      canvas.height       = Math.round(h * dpr);
      canvas.style.width  = w + "px";
      canvas.style.height = h + "px";
      const ctx = canvas.getContext("2d");
      ctx.scale(dpr, dpr);
      ctx.drawImage(bitmapRef.current, 0, 0, w, h);
    }






    const ro = new ResizeObserver(draw);
    ro.observe(canvas);

    return () => ro.disconnect();
  }, []);

  // expose ref setter buat parent
  return { canvasRef, bitmapRef };
}

export default function NewsCard({ thumbnail_url, tag, title, isMain = false, compact = false, bitmap = null }) {
  const sz = getSizes(isMain, compact);

  const wrapRef  = useRef(null);
  const arrowRef = useRef(null);
  // canvas untuk blur bitmap — dipakai hanya kalau bitmap ada
  const canvasRef  = useRef(null);
  const bitmapRef  = useRef(null);

  // setup ResizeObserver untuk canvas bitmap
  useEffect(() => {
    if (!bitmap || !canvasRef.current) return;

    bitmapRef.current = bitmap;
    const canvas = canvasRef.current;

    function draw() {
      if (!bitmapRef.current) return;
      const dpr = window.devicePixelRatio || 1;
      const w   = canvas.offsetWidth  || 1;
      const h   = canvas.offsetHeight || 1;
      canvas.width        = Math.round(w * dpr);
      canvas.height       = Math.round(h * dpr);
      canvas.style.width  = w + "px";
      canvas.style.height = h + "px";
      const ctx = canvas.getContext("2d");
      ctx.scale(dpr, dpr);
      ctx.drawImage(bitmapRef.current, 0, 0, w, h);
    }

    const ro = new ResizeObserver(draw);
    ro.observe(canvas);

    return () => ro.disconnect();
  }, [bitmap]);

  useEffect(() => {
    const paths = arrowRef.current?.querySelectorAll("path, line, polyline");
    if (!paths?.length) return;
    paths.forEach((el) => {
      const len = el.getTotalLength?.() ?? 100;
      gsap.set(el, { strokeDasharray: len, strokeDashoffset: len, opacity: 1 });
    });
  }, []);

  function onEnter() {
    const paths = arrowRef.current?.querySelectorAll("path, line, polyline");

    gsap.killTweensOf(wrapRef.current);
    gsap.to(wrapRef.current, {
      boxShadow: `0 0 0 ${sz.stroke}px #F5C400, 0 4px 20px rgba(0,0,0,0.12)`,
      duration:  0.25,
      ease:      "power2.out",
    });

    paths?.forEach((el) => {
      gsap.killTweensOf(el);
      gsap.to(el, { strokeDashoffset: 0, duration: 0.35, ease: "power2.out" });
    });
  }

  function onLeave() {
    const paths = arrowRef.current?.querySelectorAll("path, line, polyline");

    gsap.killTweensOf(wrapRef.current);
    gsap.to(wrapRef.current, {
      boxShadow: "0 0 0 0px #F5C400, 0 4px 20px rgba(0,0,0,0.12)",
      duration:  0.2,
      ease:      "power2.in",
    });

    paths?.forEach((el) => {
      const len = el.getTotalLength?.() ?? 100;
      gsap.killTweensOf(el);
      gsap.to(el, { strokeDashoffset: len, duration: 0.2, ease: "power2.in" });
    });
  }

  return (
    <div
      ref={wrapRef}
      style={styles.wrap(compact)}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <div style={styles.card(thumbnail_url, compact)}>

        <div ref={arrowRef} style={styles.arrowWrap}>
          <ArrowIcon
            style={{ display: "block", width: sz.arrow, height: sz.arrow, color: "currentColor" }}
            color="currentColor"
            stroke="currentColor"
            fill="none"
          />
        </div>

        <div style={styles.blurContainer}>
          {bitmap ? (
            // path A: canvas pre-rendered dari worker — nggak ada CSS filter
            <canvas
              ref={canvasRef}
              style={{
                position:      "absolute",
                inset:         0,
                width:         "100%",
                height:        "100%",
                pointerEvents: "none",
              }}
            />
          ) : (
            // path B: CSS backdrop-filter fallback — dipakai kalau bitmap belum siap
            BLUR_LAYERS.map(({ blur, mask }) => (
              <div key={blur} style={styles.blurLayer(blur, mask)} />
            ))
          )}
          {/* colorOverlay tetap di sini di kedua path — ini bukan backdrop-filter */}
          <div style={styles.colorOverlay} />
        </div>

        <div style={styles.content(sz.pad)}>
          <p style={styles.title(sz.title)}>{title}</p>
          {tag && <span style={styles.tag(sz.tag)}>{tag}</span>}
        </div>

      </div>
    </div>
  );
}

const styles = {
  wrap: (compact) => ({
    position:     "relative",
    width:        "100%",
    height:       "100%",
    borderRadius: compact ? "6px" : "12px",
    cursor:       "pointer",
    boxShadow:    "0 0 0 0px #F5C400, 0 4px 4px rgba(0,0,0,0.25)",
  }),

  card: (thumbnail_url, compact) => ({
    position:           "relative",
    width:              "100%",
    height:             "100%",
    backgroundImage:    `url(${thumbnail_url})`,
    backgroundSize:     "cover",
    backgroundPosition: "center",
    borderRadius: compact ? "6px" : "12px",
    overflow:           "hidden",
  }),

  arrowWrap: {
    position:      "absolute",
    top:           14,
    right:         14,
    zIndex:        2,
    pointerEvents: "none",
    color:         "#F5C400",
    filter:        "drop-shadow(0 0 5px rgba(245, 196, 0, 0.9))",
  },

  blurContainer: {
    position:      "absolute",
    left:          0,
    bottom:        0,
    right:         0,
    width:         "100%",
    height:        "55%",
    pointerEvents: "none",
  },

  blurLayer: (blur, mask) => ({
    position:             "absolute",
    top:                  0,
    left:                 0,
    bottom:               0,
    right:                0,
    backdropFilter:       `blur(${blur})`,
    WebkitBackdropFilter: `blur(${blur})`,
    maskImage:            mask,
    WebkitMaskImage:      mask,
  }),

  colorOverlay: {
    position:   "absolute",
    inset:      0,
    background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 68%)",
  },

  content: (pad) => ({
    position: "absolute",
    bottom:   pad,
    left:     pad,
    right:    pad,
    zIndex:   1,
  }),

  tag: (fontSize) => ({
    display:       "block",
    fontSize:      fontSize,
    fontWeight:    "500",
    color:         "rgba(255,255,255,0.72)",
    marginTop:     "6px",
    letterSpacing: "0.04em",
  }),

  title: (fontSize) => ({
    margin:          0,
    fontFamily:      "'Plus Jakarta Sans', sans-serif",
    fontSize:        fontSize,
    fontWeight:      "700",
    lineHeight:      1.1,
    color:           "#fff",
    display:         "-webkit-box",
    filter:          "drop-shadow(0 2px 8px rgba(0,0,0,0.6))",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
  }),
};