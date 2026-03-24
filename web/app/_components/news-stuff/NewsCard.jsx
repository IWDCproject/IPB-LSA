"use client";

import { useState, useEffect, useRef } from "react";
import { gsap }    from "gsap";
import ArrowIcon   from "@/app/icons/arrow-up-right.svg";

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

// Base sizes — designed for the reference width of each variant.
// getSizes multiplies these by the card's observed scale factor.
const BASE = {
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

// Reference widths: the card width each variant was designed for.
// The card observes its own rendered width and scales relative to this.
const REF_W = {
  main:         800,
  mainCompact:  350,
  small:        400,
  smallCompact: 175,
};

function getVariant(isMain, compact) {
  if (isMain && !compact) return "main";
  if (isMain &&  compact) return "mainCompact";
  if (!isMain && !compact) return "small";
  return "smallCompact";
}

function getSizes(isMain, compact, scale) {
  const v = getVariant(isMain, compact);
  const pfx = v === "main"         ? "main"
             : v === "mainCompact" ? "mainCompact"
             : v === "small"       ? "small"
             :                       "smallCompact";

  // Scale everything proportionally; keep stroke at a sensible minimum.
  return {
    title:  BASE[`${pfx}Title`]  * scale,
    tag:    BASE[`${pfx}Tag`]    * scale,
    arrow:  BASE[`${pfx}Arrow`]  * scale,
    pad:    BASE[`${pfx}Pad`]    * scale,
    stroke: Math.max(1.5, BASE[`${pfx}Stroke`] * scale),
  };
}

export default function NewsCard({ thumbnail_url, tag, title, isMain = false, compact = false, bitmap = null }) {
  const wrapRef  = useRef(null);
  const arrowRef = useRef(null);
  const canvasRef  = useRef(null);
  const bitmapRef  = useRef(null);

  // ── Self-sizing: observe this card's rendered width ──────────────────────
  const variant = getVariant(isMain, compact);
  const [cardW, setCardW] = useState(REF_W[variant]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setCardW(entry.contentRect.width));
    ro.observe(el);
    setCardW(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  // Scale is capped at 1 so sizes never exceed the designed base.
  const scale = Math.min(1, cardW / (REF_W[variant] ?? 400));
  const sz    = getSizes(isMain, compact, scale);

  // ── Bitmap blur canvas ────────────────────────────────────────────────────
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

  // ── Arrow animation setup ─────────────────────────────────────────────────
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

        <div ref={arrowRef} style={styles.arrowWrap(sz.arrow)}>
          <ArrowIcon
            style={{ display: "block", width: sz.arrow, height: sz.arrow, color: "currentColor" }}
            color="currentColor"
            stroke="currentColor"
            fill="none"
          />
        </div>

        <div style={styles.blurContainer}>
          {bitmap ? (
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
            BLUR_LAYERS.map(({ blur, mask }) => (
              <div key={blur} style={styles.blurLayer(blur, mask)} />
            ))
          )}
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

  // Arrow wrapper size is now driven by sz.arrow (already scaled).
  arrowWrap: (arrowSize) => ({
    position:      "absolute",
    top:           14,
    right:         14,
    zIndex:        2,
    pointerEvents: "none",
    color:         "#F5C400",
    filter:        "drop-shadow(0 0 5px rgba(245, 196, 0, 0.9))",
    width:         arrowSize,
    height:        arrowSize,
  }),

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