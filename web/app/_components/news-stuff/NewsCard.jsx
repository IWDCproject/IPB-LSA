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

// kombinasi isMain + compact ngasih 4 state:
//   isMain=true,  compact=false  -> desktop main  (gede banget)
//   isMain=true,  compact=true   -> mobile main   (sedang)
//   isMain=false, compact=false  -> desktop small (normal)
//   isMain=false, compact=true   -> mobile small  (mungil)

const BLUR_LAYERS = [
  { blur: "1px",  mask: "linear-gradient(rgba(0,0,0,0), rgba(0,0,0,1) 15%, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 58%)" },
  { blur: "3px",  mask: "linear-gradient(rgba(0,0,0,0) 25%, rgba(0,0,0,1) 42%, rgba(0,0,0,1) 62%, rgba(0,0,0,0) 76%)" },
  { blur: "6px",  mask: "linear-gradient(rgba(0,0,0,0) 50%, rgba(0,0,0,1) 64%, rgba(0,0,0,1) 80%, rgba(0,0,0,0) 90%)" },
  { blur: "10px", mask: "linear-gradient(rgba(0,0,0,0) 68%, rgba(0,0,0,1) 82%, rgba(0,0,0,1) 100%)" },
];

// semua nilai ukuran dalam satu tempat, gampang diubah
const SIZE = {
  // desktop main
  mainTitle:    52,
  mainTag:      22,
  mainArrow:    28,
  mainPad:      45,
  mainStroke:   3,

  // mobile main -- sekitar 55% dari desktop main
  mainCompactTitle: 28,
  mainCompactTag:   13,
  mainCompactArrow: 20,
  mainCompactPad:   20,
  mainCompactStroke: 2,

  // desktop small
  smallTitle:   25,
  smallTag:     12,
  smallArrow:   20,
  smallPad:     30,
  smallStroke:  2,

  // mobile small -- mepet banget, prioritasin title keliatan
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
  // !isMain && compact
  return {
    title:  SIZE.smallCompactTitle,
    tag:    SIZE.smallCompactTag,
    arrow:  SIZE.smallCompactArrow,
    pad:    SIZE.smallCompactPad,
    stroke: SIZE.smallCompactStroke,
  };
}

export default function NewsCard({ thumbnail_url, tag, title, isMain = false, compact = false }) {
  const sz = getSizes(isMain, compact);

  // wrapRef yang pegang border -- DI LUAR overflow:hidden
  const wrapRef  = useRef(null);
  const arrowRef = useRef(null);

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
    // wrapper: pegang border-radius, box-shadow, cursor, events
    // TIDAK punya overflow:hidden -- biar stroke di sudut ga kepotong
    <div
      ref={wrapRef}
      style={styles.wrap}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {/* inner: overflow:hidden buat crop image dan blur */}
      <div style={styles.card(thumbnail_url)}>

        <div ref={arrowRef} style={styles.arrowWrap}>
          <ArrowIcon
            style={{ display: "block", width: sz.arrow, height: sz.arrow, color: "currentColor" }}
            color="currentColor"
            stroke="currentColor"
            fill="none"
          />
        </div>

        <div style={styles.blurContainer}>
          {BLUR_LAYERS.map(({ blur, mask }) => (
            <div key={blur} style={styles.blurLayer(blur, mask)} />
          ))}
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
  wrap: {
    position:     "relative",
    width:        "100%",
    height:       "100%",
    borderRadius: "20px",
    cursor:       "pointer",
    boxShadow:    "0 0 0 0px #F5C400, 0 4px 4px rgba(0,0,0,0.25)",
  },

  card: (thumbnail_url) => ({
    position:           "relative",
    width:              "100%",
    height:             "100%",
    backgroundImage:    `url(${thumbnail_url})`,
    backgroundSize:     "cover",
    backgroundPosition: "center",
    borderRadius:       "20px",
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

  // pad dari sz, sama semua sisi biar konsisten
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