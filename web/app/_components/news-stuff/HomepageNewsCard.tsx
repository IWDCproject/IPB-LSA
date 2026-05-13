"use client";

import { useState, useEffect, useRef } from "react";
import { gsap }    from "gsap";
import ArrowIcon   from "@/app/icons/arrow-up-right.svg";
import { useBlur } from "@/contexts/BlurContext";

// Base sizes: designed for the reference width of each variant.
// getSizes multiplies these by the card's observed scale factor.
const BASE = {
  mainTitle:    35,
  mainTag:      20,
  mainArrow:    28,
  mainPad:      30,
  mainStroke:   3,

  mainCompactTitle: 14,
  mainCompactTag:   12,
  mainCompactArrow: 20,
  mainCompactPad:   20,
  mainCompactStroke: 2,

  smallTitle:   20,
  smallTag:     14,
  smallArrow:   20,
  smallPad:     30,
  smallStroke:  2,

  smallCompactTitle: 12,
  smallCompactTag:   10,
  smallCompactArrow: 16,
  smallCompactPad:   12,
  smallCompactStroke: 2,
};

// Reference widths: the card width each variant was designed for.
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

  return {
    title:  BASE[`${pfx}Title`]  * scale,
    tag:    BASE[`${pfx}Tag`]    * scale,
    arrow:  BASE[`${pfx}Arrow`]  * scale,
    pad:    BASE[`${pfx}Pad`]    * scale,
    stroke: Math.max(1.5, BASE[`${pfx}Stroke`] * scale),
  };
}

// Always cover-fit - mirrors CSS background-size: cover; background-position: center
// so the blurred image aligns with the background image at any rendered size.
function BitmapBlurLayer({ bitmap }) {
  const canvasRef = useRef(null);
  const bitmapRef = useRef(null);

  useEffect(() => {
    if (!bitmap || !canvasRef.current) return;
    bitmapRef.current = bitmap;
    const canvas = canvasRef.current;

    function draw() {
      if (!bitmapRef.current) return;
      const dpr = window.devicePixelRatio || 1;
      const w   = canvas.offsetWidth  || 1;
      const h   = canvas.offsetHeight || 1;
      canvas.width  = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const bw    = bitmapRef.current.width;
      const bh    = bitmapRef.current.height;
      const scale = Math.max(w / bw, h / bh);
      const dw    = bw * scale;
      const dh    = bh * scale;
      const dx    = (w - dw) / 2;
      const dy    = (h - dh) / 2;
      ctx.drawImage(bitmapRef.current, dx, dy, dw, dh);
    }

    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    draw();
    return () => ro.disconnect();
  }, [bitmap]);

  return (
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
  );
}

interface NewsCardProps {
  thumbnail_url: string | null;
  tag:           string | null;
  title:         string;
  isMain?:       boolean;
  compact?:      boolean;
  bitmap?:       ImageBitmap | null;
}

export default function NewsCard({ thumbnail_url, tag, title, isMain = false, compact = false, bitmap: bitmapProp = null }: NewsCardProps) {
  const wrapRef  = useRef(null);
  const arrowRef = useRef(null);

  // Pull bitmap from BlurContext, fallback to prop
  const { bitmaps } = useBlur();
  const bitmap = bitmapProp ?? bitmaps[thumbnail_url]?.newscard?.bitmap ?? null;

  // -- Self-sizing -----------------------------------------------------------
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

  const scale = Math.min(1, cardW / (REF_W[variant] ?? 400));
  const sz    = getSizes(isMain, compact, scale);

  // -- Arrow animation setup -------------------------------------------------
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

        {/* blurContainer covers the full card so the W×H bitmap aligns with the CSS background */}
        <div style={styles.blurContainer}>
          {bitmap && <BitmapBlurLayer bitmap={bitmap} />}
          <div style={styles.colorOverlay} />
        </div>

        <div style={styles.content(sz.pad)}>
          {tag && <span style={styles.tag(sz.tag)}>{tag}</span>}
          <p style={styles.title(sz.title)}>{title}</p>
        </div>

      </div>
    </div>
  );
}

const styles = {
  wrap: (compact: boolean): React.CSSProperties => ({
    position:     "relative",
    width:        "100%",
    height:       "100%",
    borderRadius: compact ? "4px" : "6px",
    cursor:       "pointer",
    boxShadow:    "0 0 0 0px #F5C400, 0 4px 4px rgba(0,0,0,0.25)",
  }),

  card: (thumbnail_url: string | null, compact: boolean): React.CSSProperties => ({
    position:           "relative",
    width:              "100%",
    height:             "100%",
    backgroundImage:    `url(${thumbnail_url})`,
    backgroundSize:     "cover",
    backgroundPosition: "center",
    borderRadius:       compact ? "4px" : "6px",
    overflow:           "hidden",
  }),

  arrowWrap: (arrowSize: number): React.CSSProperties => ({
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

  // Full-card overlay - bitmap is W×H, aligns with CSS background cover-crop
  blurContainer: {
    position:      "absolute",
    inset:         0,
    pointerEvents: "none",
  } as React.CSSProperties,

  colorOverlay: {
    position:   "absolute",
    inset:      0,
    background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 68%)",
  } as React.CSSProperties,

  content: (pad: number): React.CSSProperties => ({
    position: "absolute",
    bottom:   pad,
    left:     pad,
    right:    pad,
    zIndex:   1,
  }),

  tag: (fontSize: number): React.CSSProperties => ({
    display:       "block",
    fontSize:      fontSize,
    fontWeight:    "700",
    color:         "rgba(255,255,255,0.72)",
    marginTop:     "6px",
    letterSpacing: "0.04em",
  }),

  title: (fontSize: number): React.CSSProperties => ({
    margin:          0,
    fontFamily:      "'Plus Jakarta Sans', sans-serif",
    fontSize:        fontSize,
    fontWeight:      "700",
    lineHeight:      1.1,
    paddingBottom:   "0.2em",
    color:           "#fff",
    display:         "-webkit-box",
    overflow:        "hidden",
    filter:          "drop-shadow(0 2px 8px rgba(0,0,0,0.6))",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    textWrap       : "balance",
  }),
};