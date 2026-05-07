"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import Button from "@/components/Button";
import EventCard from "@/components/EventCard";
import VerticalTimeline from "../timeline-stuff/VerticalTimeline";
import { useBlurImages } from "@/hooks/useBlurImages";
import { getAssetUrl } from "@/lib/directus";
import { BlockRevealText } from "@/components/BlockRevealText";
import { CP_DEF, BezierPoint, PathCache, buildBasePoints, buildCache, drawCanvas } from "../timeline-stuff/timeline-canvas";
import { RawEvent, shapeEvents } from "../timeline-stuff/timeline-events";

// --- Konstanta ---------------------------------------------

const BG = "linear-gradient(to top, #06125C 5%, #0D26C2 100%)";
const YEL = "#FFC936";
const WHT = "#ffffff";

const NOTCH_CONFIG = {
  height: 16,
  width: 80,
  path: "M 2 0 L 78 0 L 70 12 Q 68.5 16 66 16 L 14 16 Q 11.5 16 10 12 L 2 0 Z",
  fontSize: "0.44rem",
  fontWeight: 900,
  letterSpacing: "0.06em",
} as const;

// --- Komponen kecil ---------------------------------------------

interface CardNotchProps { color: string; textColor: string; label: string; }

function CardNotch({ color, textColor, label }: CardNotchProps) {
  const { height, width, path, fontSize, fontWeight, letterSpacing } = NOTCH_CONFIG;
  return (
    <div
      className="absolute z-20 flex items-center justify-center"
      style={{
        bottom: -(height - 2), left: "25%", width, height,
        animation: "notch-pop 0.28s cubic-bezier(0.34,1.56,0.64,1) forwards",
        transformOrigin: "50% 0%", transform: "scaleY(0)",
      }}
    >
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none" className="absolute inset-0">
        <path d={path} fill={color} />
      </svg>
      <span className="relative font-jakarta uppercase" style={{ fontSize, fontWeight, letterSpacing, color: textColor, marginTop: -1 }}>
        {label}
      </span>
    </div>
  );
}

function PlaceholderCard() {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center gap-2 bg-[#111827]">
      <div className="absolute inset-0" style={{ backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 1px, transparent 1px, transparent 14px)" }} />
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
      <span className="font-jakarta text-[0.55rem] font-bold tracking-[0.2em] text-white/20 uppercase">Coming Soon</span>
    </div>
  );
}

// --- Default export ---------------------------------------------

export default function EventTimeline({ events: rawEvents }: { events: RawEvent[] }) {
  const events    = useMemo(() => shapeEvents(rawEvents), [rawEvents]);
  const activeIdx = useMemo(() => events.reduce((acc, ev, i) => (ev.isActive ? i : acc), -1), [events]);

  useBlurImages(useMemo(() =>
    (rawEvents ?? []).filter((ev) => ev.card_image).map((ev) => ({
      url: getAssetUrl(ev.card_image), type: "eventcard",
      width: 400, height: 280,
      naturalWidth: ev.card_image?.width, naturalHeight: ev.card_image?.height,
    })),
  [rawEvents]));

  const [isMobile,   setIsMobile]   = useState(false);
  const [scaleF,     setScaleF]     = useState(1);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const ctxRef       = useRef<CanvasRenderingContext2D | null>(null);
  const nodeRefs     = useRef<(HTMLDivElement | null)[]>([]);
  const mascotRef    = useRef<HTMLDivElement>(null);
  const ctaRef       = useRef<HTMLDivElement>(null);

  const introStarted = useRef(false);
  const rafRef       = useRef(0);
  const loopRunning  = useRef(false);
  const progressRef  = useRef({ v: 0 });
  const motionRefs   = useRef<{ x: number; y: number }[]>([]);
  const sizeRef      = useRef({ W: 0, H: 0 });
  const basePtsRef   = useRef<BezierPoint[]>([]);
  const curPtsRef    = useRef<BezierPoint[]>([]);
  const cacheRef     = useRef<PathCache>({ totalLen: 1, segLens: [0], lut: [] });

  // Ref biar closure rAF selalu baca activeIdx yang terbaru
  const activeIdxRef = useRef(activeIdx);
  activeIdxRef.current = activeIdx;

  const applyMotions = useCallback(() => {
    const motions = motionRefs.current;
    const nodes   = nodeRefs.current;
    for (let i = 0; i < events.length; i++) {
      const m = motions[i], base = basePtsRef.current[i + 1], cur = curPtsRef.current[i + 1];
      if (m && base && cur) { cur.x = base.x + m.x; cur.y = base.y + m.y; }
      if (m && nodes[i]) nodes[i]!.style.transform = `translate3d(${m.x}px,${m.y}px,0)`;
    }
  }, [events.length]);

  // Throttle ~30fps biar GPU nggak dibakar di scene yang hampir statis
  const startLoop = useCallback(() => {
    if (loopRunning.current) return;
    loopRunning.current = true;
    let lastCanvas = 0;
    const tick = () => {
      const now = performance.now();
      applyMotions();
      if (now - lastCanvas >= 33) {
        const { W, H } = sizeRef.current;
        drawCanvas(ctxRef.current, curPtsRef.current, cacheRef.current, progressRef.current.v, activeIdxRef.current, W, H);
        lastCanvas = now;
      }
      if (loopRunning.current) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [applyMotions]);

  const initLayout = useCallback(() => {
    const el = containerRef.current, canvas = canvasRef.current;
    if (!el || !canvas) return;
    const { width: W, height: H } = el.getBoundingClientRect();
    if (!W || !H) return;

    sizeRef.current = { W, H };
    setScaleF(Math.min(1, Math.max(0.8, W / 1920)));
    setIsMobile(W < 900);

    if (!motionRefs.current.length) motionRefs.current = events.map(() => ({ x: 0, y: 0 }));

    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (ctx) { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.imageSmoothingEnabled = true; ctxRef.current = ctx; }

    basePtsRef.current = buildBasePoints(W, H);
    curPtsRef.current  = basePtsRef.current.map((p) => ({ ...p }));
    cacheRef.current   = buildCache(curPtsRef.current);

    if (!loopRunning.current) {
      applyMotions();
      drawCanvas(ctxRef.current, curPtsRef.current, cacheRef.current, progressRef.current.v, activeIdxRef.current, W, H);
    }
  }, [events.length, applyMotions]);

  const playIntro = useCallback(() => {
    if (introStarted.current) return;
    introStarted.current = true;

    nodeRefs.current.forEach((n) => n && gsap.set(n, { opacity: 0 }));
    gsap.set([ctaRef.current, mascotRef.current].filter(Boolean), { opacity: 0, y: 40 });
    gsap.to(progressRef.current, { v: 1, duration: 2.2, ease: "power2.inOut" });

    events.forEach((ev, i) => {
      const motion = motionRefs.current[i];
      const node   = nodeRefs.current[i];
      if (motion) {
        gsap.to(motion, { y: ev.slot.fy, duration: ev.slot.fd,       repeat: -1, yoyo: true, ease: "sine.inOut", delay: ev.slot.fDl });
        gsap.to(motion, { x: ev.slot.fx, duration: ev.slot.fd * 1.3, repeat: -1, yoyo: true, ease: "sine.inOut", delay: ev.slot.fDl + 0.5 });
      }
      if (node) gsap.to(node, { opacity: 1, duration: 0.55, delay: 0.65 + i * 0.18, ease: "power2.out" });
    });

    gsap.timeline()
      .to(ctaRef.current,    ctaRef.current    ? { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" } : {}, 0.8)
      .to(mascotRef.current, mascotRef.current ? { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" } : {}, 1.0);

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
    motionRefs.current.forEach((m) => m && gsap.killTweensOf(m));
    nodeRefs.current.forEach((n) => n && gsap.killTweensOf(n));
    if (ctaRef.current)    gsap.killTweensOf(ctaRef.current);
    if (mascotRef.current) gsap.killTweensOf(mascotRef.current);
  }, []);

  if (isMobile) return <VerticalTimeline events={events} />;

  return (
    <div
      ref={containerRef}
      className="block relative w-full overflow-hidden z-[2] -mt-px font-body"
      style={{ height: "calc(100vh - 65px)", minHeight: 600, background: BG }}
    >
      <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ backgroundImage: "url(/Batik_Pattern_dark.svg)", backgroundSize: "1500px auto", backgroundRepeat: "repeat-x", backgroundPosition: "bottom" }} />
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full pointer-events-none z-[1]" />

      <div ref={mascotRef} className="absolute pointer-events-none z-50" style={{ left: "57%", bottom: "2%", width: Math.round(420 * scaleF), transform: "translateX(-50%)" }}>
        <Image src="/maskot/maskot1.png" alt="" width={420} height={560} className="w-full h-auto" style={{ filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.5))" }} />
      </div>

      <div ref={ctaRef} className="absolute z-[5]" style={{ left: Math.round(160 * scaleF), top: "65%", transform: "translateY(-50%)", maxWidth: Math.round(300 * scaleF) }}>
        <h2 className="font-bebas text-white leading-none m-0" style={{ fontSize: `${3.8 * scaleF}rem` }}>
          <BlockRevealText delay={0.2} blockColor="#ffffff">WHY WAIT?</BlockRevealText>
        </h2>
        <div className="text-white mt-[5px] font-medium" style={{ fontSize: `${Math.round(22 * scaleF)}px` }}>
          <BlockRevealText delay={0.4} blockColor="#ffffff">Make sure to not miss your registration period!</BlockRevealText>
        </div>
        <div className="mt-[18px]">
          <Button href="/events" variant="primary" size="md">SEE EVENTS</Button>
        </div>
      </div>

      {events.map((ev, i) => {
        const s = ev.slot;
        const isHovered = hoveredIdx === i;
        const shadow = s.shadow ? `0 4px 16px rgba(0,0,0,0.7), 0 0 2px ${s.shadow}` : `0 4px 16px rgba(0,0,0,0.7)`;

        // Outer div = gradient border (bg + 2px padding), inner div = card face dengan clip.
        // Lebih reliable dari background-clip: border-box di atas konten kompleks.
        const ringGradient = isHovered && !ev.isPlaceholder
          ? `linear-gradient(to bottom, ${YEL}, ${WHT})`
          : ev.isActive
            ? "linear-gradient(to bottom, rgba(234,179,8,0.9), rgba(234,179,8,0.9))"
            : "linear-gradient(to bottom, rgba(255,255,255,0.45), rgba(255,255,255,0.45))";

        return (
          <div key={ev.id} className="absolute z-10" style={{ left: `${CP_DEF[i + 1][0] * 100}%`, top: `${CP_DEF[i + 1][1] * 100}%` }}>
            <div ref={(el) => { nodeRefs.current[i] = el; }} className="relative will-change-transform opacity-0">

              <div className="absolute whitespace-nowrap pointer-events-none" style={{ left: s.lo.x * scaleF, top: s.lo.y * scaleF }}>
                <div className="font-bebas" style={{ fontSize: `${Math.round(36 * scaleF)}px`, color: s.lc, textShadow: `0 0 20px ${s.lg}` }}>
                  {ev.label}
                </div>
                <div className="text-white" style={{ fontSize: `${Math.round(18 * scaleF)}px`, marginTop: Math.round((s.subLabelOffset?.y ?? 3) * scaleF), marginLeft: Math.round((s.subLabelOffset?.x ?? 40) * scaleF) }}>
                  {ev.subLabel.split("\n").map((ln, j) => <div key={j}>{ln}</div>)}
                </div>
              </div>

              <div
                onMouseEnter={() => !ev.isPlaceholder && setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="absolute rounded-[11px] p-[2px] transition-[background] duration-[180ms] ease-[ease]"
                style={{ left: Math.round(s.co.x * scaleF), top: Math.round(s.co.y * scaleF), width: Math.round(210 * scaleF), height: Math.round(300 * scaleF), transform: `rotate(${s.tilt}deg)`, cursor: ev.isPlaceholder ? "default" : "pointer", background: ringGradient, boxShadow: shadow }}
              >
                <div className="w-full h-full rounded-[9px] overflow-hidden relative">
                  {ev.isPlaceholder ? <PlaceholderCard /> : <EventCard event={ev} className="w-full h-full" size="lg" />}
                </div>
                {isHovered && !ev.isPlaceholder && <CardNotch color="rgba(255,255,255,0.92)" textColor="rgba(0,0,0,0.6)" label="see more" />}
                {ev.isActive && !isHovered && <CardNotch color="rgb(234,179,8)" textColor="rgba(0,0,0,0.75)" label="ongoing" />}
              </div>

              <div
                className={`absolute rounded-full z-[2] ${ev.isActive ? "etl-dot-pulse" : ""}`}
                style={{ width: Math.round(s.ds * scaleF), height: Math.round(s.ds * scaleF), background: s.dot, boxShadow: ev.isActive ? "none" : `0 0 14px ${s.glow}`, transform: "translate(-50%,-50%)" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}