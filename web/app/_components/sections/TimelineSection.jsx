"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import Button from "@/components/Button";
import EventCard from "@/components/EventCard";
import VerticalTimeline from "../timeline-stuff/VerticalTimeline";

const BG  = "linear-gradient(to top, #06125C 5%, #0D26C2 100%)";
const YEL = "#FFC936";
const WHT = "#ffffff";


// Modular Notch Config for future-proofing
const NOTCH_CONFIG = {
  height: 16,
  width: 80,
  path: "M 2 0 L 78 0 L 70 12 Q 68.5 16 66 16 L 14 16 Q 11.5 16 10 12 L 2 0 Z",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: "0.44rem",
  fontWeight: 900,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  marginTop: -1,
};

const CP_DEF = [
  [-0.06, 0.29,  -0.1,   0.0,   0.1,  0.18 ],
  [ 0.29, 0.098, -0.089,-0.123, 0.092, 0.158],
  [ 0.341,0.692, -0.08, -0.085, 0.115, 0.124],
  [ 0.67, 0.2,  -0.122, -0.126, 0.087, 0.087],
  [ 0.77, 0.64,  -0.054,-0.071, 0.114, 0.103],
  [ 1.06, 0.32,  -0.208,-0.01,  0.1,   0.0  ],
];


// Slot layout templates (for up to 4 events, can be extended)
const SLOT_LAYOUTS = [
  { co: { x: -255, y: -10 }, lo: { x: 22, y: -45 }, tilt: 9,  fy: 20, fx: 12,  fd: 5,   fDl: 0,   subLabelOffset: { x: 40, y: -10 } },
  { co: { x: 0,    y: -330 }, lo: { x: -80, y: 22 }, tilt: -7, fy: 25, fx: -16, fd: 4,   fDl: 0.8, subLabelOffset: { x: 40, y: -10 } },
  { co: { x: -240, y: 0 },   lo: { x: 22, y: -60 }, tilt: 5,  fy: 17, fx: 18,  fd: 6,   fDl: 1.4, subLabelOffset: { x: 40, y: -10 } },
  { co: { x: 0,    y: -335 }, lo: { x: -80, y: 20 }, tilt: -9, fy: 13, fx: -12, fd: 3.5, fDl: 0.3, subLabelOffset: { x: 40, y: -10 } },
];

// Helper to get color settings based on activation
function getSlotColors(isActive) {
  return isActive
    ? {
        border: YEL,
        shadow: "rgba(240,165,0,0.4)",
        dot: YEL,
        glow: YEL,
        lc: YEL,
        lg: "rgba(240,165,0,0.6)",
        ds: 25,
      }
    : {
        border: WHT,
        shadow: null,
        dot: WHT,
        glow: "rgba(255,255,255,0.4)",
        lc: WHT,
        lg: "rgba(255,255,255,0.3)",
        ds: 20,
      };
}

const MOCK = [
  { id:"e1", name:"Open Charity Golf Tournament", slug:"golf-tournament-2026",   status:"active",   start_date:"2026-03-01", card_image_url:"https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=300&q=80", user_created:{organisation_name:"IPB Golf Community"}, registration_closes:"15 of March" },
  { id:"e2", name:"FORKI X IPB CUP 2026",         slug:"forki-ipb-cup-2026",     status:"upcoming", start_date:"2026-02-28", card_image_url:"https://images.unsplash.com/photo-1555597673-b21d5c935865?w=300&q=80", user_created:{organisation_name:"UKM Karate IPB"},   registration_closes:"30 of March" },
  { id:"e3", name:"IT-TODAY HACKTODAY",            slug:"it-today-hacktoday-2026",status:"upcoming", start_date:"2026-03-20", card_image_url:"https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=300&q=80", user_created:{organisation_name:"Himalkom"},        registration_closes:"1 of April"  },
  { id:"e4", name:"GEMASTIK 2026",                 slug:"gemastik-2026",          status:"upcoming", start_date:"2026-04-10", card_image_url:"https://images.unsplash.com/photo-1546519638-68e109498ffc?w=300&q=80", user_created:{organisation_name:"BEM KM IPB"},       registration_closes:"31 of April" },
];

// ─── Canvas helpers ────────────────────────────────────────────────────────────

const bez = (p0, p1, t) => {
  const mt = 1 - t, mt2 = mt * mt, t2 = t * t;
  return {
    x: mt2*mt*p0.x + 3*mt2*t*(p0.x+p0.hox) + 3*mt*t2*(p1.x+p1.hix) + t2*t*p1.x,
    y: mt2*mt*p0.y + 3*mt2*t*(p0.y+p0.hoy) + 3*mt*t2*(p1.y+p1.hiy) + t2*t*p1.y,
  };
};

const strokePath = (ctx, pts) => {
  if (!pts.length) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i+1];
    ctx.bezierCurveTo(a.x+a.hox, a.y+a.hoy, b.x+b.hix, b.y+b.hiy, b.x, b.y);
  }
  ctx.stroke();
};

const buildCache = (pts) => {
  const STEPS = 28, LUT = 48;
  const segLens = [0];
  const lut = [{ x:pts[0].x, y:pts[0].y, len:0 }];
  for (let i = 0; i < pts.length - 1; i++) {
    let px = pts[i].x, py = pts[i].y, seg = 0;
    for (let s = 1; s <= STEPS; s++) {
      const p = bez(pts[i], pts[i+1], s/STEPS);
      seg += Math.hypot(p.x-px, p.y-py); px = p.x; py = p.y;
    }
    segLens.push(segLens[i] + seg);
    px = pts[i].x; py = pts[i].y;
    let cum = segLens[i];
    for (let s = 1; s <= LUT; s++) {
      const p = bez(pts[i], pts[i+1], s/LUT);
      cum += Math.hypot(p.x-px, p.y-py);
      lut.push({ x:p.x, y:p.y, len:cum }); px = p.x; py = p.y;
    }
  }
  return { totalLen: segLens.at(-1) || 1, segLens, lut };
};

const pointAtLen = (lut, d) => {
  let lo = 0, hi = lut.length - 1;
  while (lo < hi - 1) { const mid = (lo+hi)>>1; if (lut[mid].len < d) lo=mid; else hi=mid; }
  const t = (lut[hi].len - lut[lo].len) ? (d-lut[lo].len)/(lut[hi].len-lut[lo].len) : 0;
  return { x: lut[lo].x + t*(lut[hi].x-lut[lo].x), y: lut[lo].y + t*(lut[hi].y-lut[lo].y) };
};

const buildBasePoints = (W, H) =>
  CP_DEF.map(([px,py,hix,hiy,hox,hoy]) => ({ x:px*W, y:py*H, hix:hix*W, hiy:hiy*H, hox:hox*W, hoy:hoy*H }));

const drawCanvas = (ctx, pts, cache, progress, activeIdx, W, H) => {
  if (!ctx || !pts.length || !W || !H) return;
  const totalLen = cache.totalLen || 1;
  const drawnLen = Math.max(0, Math.min(progress, 1)) * totalLen;

  ctx.clearRect(0, 0, W, H);
  ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.lineJoin = "round";

  ctx.strokeStyle = WHT;
  ctx.setLineDash(progress < 1 ? [drawnLen, totalLen] : []);
  strokePath(ctx, pts);

  if (activeIdx >= 0) {
    const activeLen = cache.segLens[activeIdx + 1] || 0;
    ctx.strokeStyle = YEL;
    ctx.setLineDash(progress < 1 ? [Math.min(drawnLen, activeLen), totalLen] : []);
    strokePath(ctx, pts.slice(0, activeIdx + 2));

    const gStart  = cache.segLens[activeIdx + 1] || 0;
    const gEnd    = cache.segLens[activeIdx + 2] || gStart;
    const visible = progress < 1
      ? Math.min(Math.max(0, drawnLen - gStart), gEnd - gStart)
      : gEnd - gStart;

    if (pts.length > activeIdx + 2 && visible > 0) {
      const gPts = pts.slice(activeIdx + 1, activeIdx + 3);
      const grad = ctx.createLinearGradient(gPts[0].x, gPts[0].y, gPts[1].x, gPts[1].y);
      grad.addColorStop(0, YEL); grad.addColorStop(1, WHT);
      ctx.strokeStyle = grad;
      ctx.setLineDash(progress < 1 ? [visible, totalLen] : []);
      strokePath(ctx, gPts);
    }
  }

  if (progress > 0 && progress < 1) {
    ctx.setLineDash([]);
    const pt = pointAtLen(cache.lut, drawnLen);
    ctx.fillStyle = YEL;
    ctx.beginPath(); ctx.arc(pt.x, pt.y, 4, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "rgba(255,201,54,0.2)";
    ctx.beginPath(); ctx.arc(pt.x, pt.y, 12, 0, Math.PI*2); ctx.fill();
  }

  ctx.setLineDash([]);
};

// ─── Component ─────────────────────────────────────────────────────────────────

function CardNotch({ color, textColor, label, config = NOTCH_CONFIG }) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: -config.height,
        left: "25%",
        zIndex: 20,
        width: config.width,
        height: config.height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "notch-pop 0.28s cubic-bezier(0.34,1.56,0.64,1) forwards",
        transformOrigin: "50% 0%",
        transform: "scaleY(0)",
      }}
    >
      <svg
        width={config.width}
        height={config.height}
        viewBox={`0 0 ${config.width} ${config.height}`}
        fill="none"
        style={{ position: "absolute", inset: 0 }}
      >
        <path d={config.path} fill={color} />
      </svg>
      <span
        style={{
          position: "relative",
          fontFamily: config.fontFamily,
          fontSize: config.fontSize,
          fontWeight: config.fontWeight,
          letterSpacing: config.letterSpacing,
          color: textColor,
          textTransform: config.textTransform,
          marginTop: config.marginTop,
        }}
      >
        {label}
      </span>
    </div>
  );
}

export default function EventTimeline({ events: rawEvents }) {
  const events = useMemo(() => {
    const base = (rawEvents?.length ? rawEvents : MOCK).slice(0, SLOT_LAYOUTS.length);
    // Find the last active event index
    let lastActiveIdx = -1;
    base.forEach((ev, i) => {
      if (ev.status === "active" || ev.status === "live") lastActiveIdx = i;
    });
    return base.map((ev, i) => {
      const isActive = i <= lastActiveIdx && lastActiveIdx !== -1;
      const slotLayout = SLOT_LAYOUTS[i] || SLOT_LAYOUTS[SLOT_LAYOUTS.length - 1];
      return {
        ...ev,
        slot: { ...slotLayout, ...getSlotColors(isActive) },
        isActive,
        label: isActive
          ? "ONGOING"
          : ev.start_date
            ? new Date(ev.start_date).toLocaleDateString("en-US", { month: "short", day: "2-digit" }).toUpperCase()
            : "TBA",
        subLabel: ev.registration_closes
          ? `Regist Until\n${ev.registration_closes}`
          : `Date\n${ev.start_date ?? "TBA"}`,
      };
    });
  }, [rawEvents]);

  const activeIdx = useMemo(() => {
    let idx = -1;
    events.forEach((ev, i) => { if (ev.isActive) idx = i; });
    return idx;
  }, [events]);

  const [isMobile, setIsMobile] = useState(false);
  const [scaleF,   setScaleF]   = useState(1);
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const containerRef  = useRef(null);
  const canvasRef     = useRef(null);
  const ctxRef        = useRef(null);
  const nodeRefs      = useRef([]);
  const mascotRef     = useRef(null);
  const ctaRef        = useRef(null);

  const introStarted  = useRef(false);
  const rafRef        = useRef(0);
  const loopRunning   = useRef(false);
  const progressRef   = useRef({ v: 0 });
  const motionRefs    = useRef([]);
  const sizeRef       = useRef({ W: 0, H: 0 });
  const basePtsRef    = useRef([]);
  const curPtsRef     = useRef([]);
  const cacheRef      = useRef({ totalLen:1, segLens:[0], lut:[] });
  const activeIdxRef  = useRef(activeIdx);
  activeIdxRef.current = activeIdx;

  const renderFrame = useCallback(() => {
    const { W, H }  = sizeRef.current;
    const basePts   = basePtsRef.current;
    const curPts    = curPtsRef.current;
    const motions   = motionRefs.current;
    const nodes     = nodeRefs.current;

    for (let i = 0; i < events.length; i++) {
      const m    = motions[i];
      const base = basePts[i + 1];
      const cur  = curPts[i + 1];
      const node = nodes[i];

      if (m && base && cur) { cur.x = base.x + m.x; cur.y = base.y + m.y; }
      if (m && node)        node.style.transform = `translate3d(${m.x}px,${m.y}px,0)`;
    }

    drawCanvas(ctxRef.current, curPts, cacheRef.current, progressRef.current.v, activeIdxRef.current, W, H);
  }, [events.length]);

  const startLoop = useCallback(() => {
    if (loopRunning.current) return;
    loopRunning.current = true;

    let lastCanvas = 0;
    const tick = () => {
      const { W, H }  = sizeRef.current;
      const basePts   = basePtsRef.current;
      const curPts    = curPtsRef.current;
      const motions   = motionRefs.current;
      const nodes     = nodeRefs.current;

      const now = performance.now();

      for (let i = 0; i < events.length; i++) {
        const m    = motions[i];
        const base = basePts[i + 1];
        const cur  = curPts[i + 1];
        const node = nodes[i];
        if (m && base && cur) { cur.x = base.x + m.x; cur.y = base.y + m.y; }
        if (m && node)        node.style.transform = `translate3d(${m.x}px,${m.y}px,0)`;
      }

      if (now - lastCanvas >= 33) {
        drawCanvas(ctxRef.current, curPts, cacheRef.current, progressRef.current.v, activeIdxRef.current, W, H);
        lastCanvas = now;
      }

      if (loopRunning.current) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [events.length]);

  const initLayout = useCallback(() => {
    const el = containerRef.current, canvas = canvasRef.current;
    if (!el || !canvas) return;
    const { width: W, height: H } = el.getBoundingClientRect();
    if (!W || !H) return;

    sizeRef.current = { W, H };
    setScaleF(Math.min(1, Math.max(0.8, W / 1920)));
    setIsMobile(W < 900);

    if (!motionRefs.current.length) motionRefs.current = events.map(() => ({ x:0, y:0 }));

    const dpr = window.devicePixelRatio || 1;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";

    const ctx = canvas.getContext("2d", { alpha: true });
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctxRef.current = ctx;
    }

    basePtsRef.current = buildBasePoints(W, H);
    curPtsRef.current  = basePtsRef.current.map(p => ({ ...p }));
    cacheRef.current   = buildCache(curPtsRef.current);

    if (!loopRunning.current) renderFrame();
  }, [events.length, renderFrame]);

  const playIntro = useCallback(() => {
    if (introStarted.current) return;
    introStarted.current = true;

    nodeRefs.current.forEach(n => n && gsap.set(n, { opacity:0 }));
    gsap.set([ctaRef.current, mascotRef.current], { opacity:0, y:40 });

    gsap.to(progressRef.current, { v:1, duration:2.2, ease:"power2.inOut" });

    events.forEach((ev, i) => {
      const motion = motionRefs.current[i];
      const node   = nodeRefs.current[i];
      const { fy, fx, fd, fDl } = ev.slot;

      if (motion) {
        gsap.to(motion, { y:fy, duration:fd,     repeat:-1, yoyo:true, ease:"sine.inOut", delay:fDl       });
        gsap.to(motion, { x:fx, duration:fd*1.3, repeat:-1, yoyo:true, ease:"sine.inOut", delay:fDl + 0.5 });
      }
      if (node) gsap.to(node, { opacity:1, duration:0.55, delay:0.65 + i*0.18, ease:"power2.out" });
    });

    gsap.timeline()
      .to(ctaRef.current,    { opacity:1, y:0, duration:0.8, ease:"power2.out" }, 0.8)
      .to(mascotRef.current, { opacity:1, y:0, duration:0.8, ease:"power2.out" }, 1.0);

    startLoop();
  }, [events, startLoop]);

  useEffect(() => {
    initLayout();
    const ro = new ResizeObserver(initLayout);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [initLayout]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !introStarted.current) playIntro(); },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [playIntro]);

  useEffect(() => () => {
    loopRunning.current = false;
    cancelAnimationFrame(rafRef.current);
    gsap.killTweensOf(progressRef.current);
    motionRefs.current.forEach(m => m && gsap.killTweensOf(m));
    nodeRefs.current.forEach(n => n && gsap.killTweensOf(n));
    if (ctaRef.current)    gsap.killTweensOf(ctaRef.current);
    if (mascotRef.current) gsap.killTweensOf(mascotRef.current);
  }, []);

  if (isMobile) return <VerticalTimeline events={events} />;

  return (
    <div
      ref={containerRef}
      style={{
        display: "block",
        margin: 0,
        marginTop: -1,
        position: "relative",
        width: "100%",
        height: "calc(100vh - 65px)",
        minHeight: 600,
        overflow: "hidden",
        background: BG,
        zIndex: 2,
        fontFamily: "'Outfit', sans-serif",
      }}
    >
      <div style={{ position:"absolute", inset:0, backgroundImage:"url(/Batik_Pattern_dark.svg)",
                    backgroundSize:"cover", opacity:0.4, pointerEvents:"none" }} />

      <canvas ref={canvasRef} style={{ position:"absolute", inset:0, display:"block",
                                       width:"100%", height:"100%", pointerEvents:"none", zIndex:1 }} />

      <img ref={mascotRef} src="/maskot/maskot1.png" alt=""
        style={{ position:"absolute", left:"57%", bottom:"2%", width:Math.round(420*scaleF),
                 transform:"translateX(-50%)", pointerEvents:"none", zIndex:50,
                 filter:"drop-shadow(0 8px 24px rgba(0,0,0,0.5))" }} />

      <div ref={ctaRef} style={{ position:"absolute", left:Math.round(160*scaleF), top:"65%",
                                 transform:"translateY(-50%)", zIndex:5, maxWidth:Math.round(300*scaleF) }}>
        <h2 style={{ fontFamily:"'Bebas Neue', cursive", fontSize:`${3.8*scaleF}rem`,
                     color:"#fff", lineHeight:1, margin:0 }}>
          WHY WAIT?
        </h2>
        <p style={{ color:"#fff", fontSize:`${Math.round(22*scaleF)}px`, marginTop:5, fontWeight:500 }}>
          Make sure to not miss your registration period!
        </p>
        <div style={{ marginTop:18 }}>
          <Button href="/events" variant="primary" size="md">SEE EVENTS</Button>
        </div>
      </div>

      {events.map((ev, i) => {
        const s = ev.slot;

        const isHovered = hoveredIdx === i;

        const shadow = s.shadow
          ? `0 4px 16px rgba(0,0,0,0.7), 0 0 2px ${s.shadow}`
          : `0 4px 16px rgba(0,0,0,0.7)`;

        // Ring is always visible — active cards get gold, others dim white → full white on hover.
        const ringColor = ev.isActive
          ? "rgba(234,179,8,0.9)"
          : isHovered
            ? "rgba(255,255,255,1)"
            : "rgba(255,255,255,0.45)";

        return (
          <div key={ev.id ?? i}
            style={{ position:"absolute", left:`${CP_DEF[i+1][0]*100}%`, top:`${CP_DEF[i+1][1]*100}%`, zIndex:10 }}>
            <div ref={el => { nodeRefs.current[i] = el; }}
              style={{ position:"relative", willChange:"transform", opacity:0 }}>

              <div style={{ position:"absolute", left:s.lo.x*scaleF, top:s.lo.y*scaleF,
                            whiteSpace:"nowrap", pointerEvents:"none" }}>
                <div style={{ fontFamily:"'Bebas Neue', cursive", fontSize:`${Math.round(36*scaleF)}px`,
                              color:s.lc, textShadow:`0 0 20px ${s.lg}` }}>
                  {ev.label}
                </div>
                <div
                  style={{
                    fontSize: `${Math.round(18 * scaleF)}px`,
                    color: "#fff",
                    marginTop: Math.round((s.subLabelOffset?.y ?? 3) * scaleF),
                    marginLeft: Math.round((s.subLabelOffset?.x ?? 40) * scaleF),
                  }}
                >
                  {ev.subLabel.split("\n").map((ln, j) => <div key={j}>{ln}</div>)}
                </div>
              </div>

              {/* Outer wrapper: rotated, overflow visible so notch can peek out below */}
              <div
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{ position:"absolute", left:Math.round(s.co.x*scaleF), top:Math.round(s.co.y*scaleF),
                         width:Math.round(210*scaleF), height:Math.round(300*scaleF),
                         transform:`rotate(${s.tilt}deg)`, cursor:"pointer",
                         outline:"none" /* ← prevents browser focus ring */ }}>
                {/* Card with always-visible border ring */}
                <div style={{ position:"absolute", inset:0, borderRadius:10, overflow:"hidden",
                              boxShadow:shadow }}>
                  <EventCard event={ev} className="w-full h-full" size="lg" />
                </div>
                {/* Ring overlay: always visible, sits above card content, transitions on hover */}
                <div style={{ position:"absolute", inset:0, borderRadius:10, pointerEvents:"none",
                              zIndex:5, boxShadow:`0 0 0 2px ${ringColor}`,
                              transition:"box-shadow 0.18s ease" }} />
                {/* Notch sits below the card, outside overflow:hidden */}
                {isHovered && <CardNotch color="rgba(255,255,255,0.92)" textColor="rgba(0,0,0,0.6)" label="see more" />}
                {ev.isActive && !isHovered && <CardNotch color="rgb(234,179,8)" textColor="rgba(0,0,0,0.75)" label="ongoing" />}
              </div>

              <div
                className={ev.isActive ? "etl-dot-pulse" : ""}
                style={{ position:"absolute", width:Math.round(s.ds*scaleF), height:Math.round(s.ds*scaleF),
                         borderRadius:"50%", background:s.dot,
                         boxShadow: ev.isActive ? "none" : `0 0 14px ${s.glow}`,
                         transform:"translate(-50%,-50%)", zIndex:2 }}
              />
            </div>
          </div>
        );
      })}

      <style jsx>{`
        /* Static glow + ripple ring, unique name avoids styled-jsx global collision */
        .etl-dot-pulse { animation: etl-dot-pulse 2s ease-out infinite; }
        @keyframes etl-dot-pulse {
          0%   { box-shadow: 0 0 14px 4px rgba(255,201,54,0.6), 0 0 0 0    rgba(255,201,54,0.7); }
          70%  { box-shadow: 0 0 14px 4px rgba(255,201,54,0.6), 0 0 0 10px rgba(255,201,54,0);   }
          100% { box-shadow: 0 0 14px 4px rgba(255,201,54,0.6), 0 0 0 0    rgba(255,201,54,0);   }
        }

        @keyframes notch-pop {
          0%   { transform: translateX(-50%) scaleY(0);    opacity: 0; }
          60%  { transform: translateX(-50%) scaleY(1.15); opacity: 1; }
          100% { transform: translateX(-50%) scaleY(1);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}