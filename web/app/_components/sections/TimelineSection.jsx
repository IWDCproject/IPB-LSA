'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { gsap } from 'gsap';
import Button from '@/components/Button';
import EventCard from '@/components/EventCard';
import VerticalTimeline from '../timeline-stuff/VerticalTimeline';

// ── Config ─────────────────────────────────────────────────────────────────────
const BG  = 'linear-gradient(to top, #06125C 5%, #0D26C2 100%)';
const YEL = '#FFC936';
const WHT = '#ffffff';

// [anchorX, anchorY, handleInX, handleInY, handleOutX, handleOutY] — viewport fractions
const CP_DEF = [
  [-0.060, 0.290, -0.100,  0.000,  0.100, 0.180],
  [ 0.290, 0.098, -0.089, -0.123,  0.092, 0.158],
  [ 0.341, 0.692, -0.080, -0.085,  0.115, 0.124],
  [ 0.670, 0.200, -0.122, -0.126,  0.087, 0.087],
  [ 0.770, 0.640, -0.054, -0.071,  0.114, 0.103],
  [ 1.060, 0.320, -0.208, -0.010,  0.100, 0.000],
];

// co=cardOffset, lo=labelOffset, ds=dotSize, fy/fx/fd/fDl=float params
const SLOTS = [
  { co:{x:-255,y:-10}, lo:{x: 22,y:-45}, tilt: 9, ds:25, fy:20, fx: 12, fd:5,   fDl:0,   border:YEL, shadow:'rgba(240,165,0,0.4)', dot:YEL, glow:YEL,                     lc:YEL, lg:'rgba(240,165,0,0.6)'   },
  { co:{x:  0,y:-330}, lo:{x:-80,y: 22}, tilt:-7, ds:20, fy:25, fx:-16, fd:4,   fDl:0.8, border:WHT, shadow:null,                  dot:WHT, glow:'rgba(255,255,255,0.4)', lc:WHT, lg:'rgba(255,255,255,0.3)' },
  { co:{x:-240,y:  0}, lo:{x: 22,y:-46}, tilt: 5, ds:20, fy:17, fx: 18, fd:6,   fDl:1.4, border:WHT, shadow:null,                  dot:WHT, glow:'rgba(255,255,255,0.4)', lc:WHT, lg:'rgba(255,255,255,0.3)' },
  { co:{x:  0,y:-335}, lo:{x:-80,y: 20}, tilt:-9, ds:20, fy:13, fx:-12, fd:3.5, fDl:0.3, border:WHT, shadow:null,                  dot:WHT, glow:'rgba(255,255,255,0.4)', lc:WHT, lg:'rgba(255,255,255,0.3)' },
];

const MOCK = [
  { id:'e1', name:'Open Charity Golf Tournament', slug:'golf-tournament-2026',    status:'active',   start_date:'2026-03-01', card_image_url:'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=300&q=80', user_created:{organisation_name:'IPB Golf Community'}, registration_closes:'15 of March' },
  { id:'e2', name:'FORKI X IPB CUP 2026',         slug:'forki-ipb-cup-2026',      status:'upcoming', start_date:'2026-02-28', card_image_url:'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=300&q=80', user_created:{organisation_name:'UKM Karate IPB'},   registration_closes:'30 of March' },
  { id:'e3', name:'IT-TODAY HACKTODAY',            slug:'it-today-hacktoday-2026', status:'upcoming', start_date:'2026-03-20', card_image_url:'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=300&q=80', user_created:{organisation_name:'Himalkom'},         registration_closes:'1 of April'  },
  { id:'e4', name:'GEMASTIK 2026',                 slug:'gemastik-2026',           status:'upcoming', start_date:'2026-04-10', card_image_url:'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=300&q=80', user_created:{organisation_name:'BEM KM IPB'},        registration_closes:'31 of April' },
];

// ── Bezier math ─────────────────────────────────────────────────────────────────
// pt shape: { x, y, hix, hiy, hox, hoy } — flat handle offsets, avoids nested property chains

const bez = (p0, p1, t) => {
  const mt = 1-t, mt2 = mt*mt, t2 = t*t;
  return {
    x: mt2*mt*p0.x + 3*mt2*t*(p0.x+p0.hox) + 3*mt*t2*(p1.x+p1.hix) + t2*t*p1.x,
    y: mt2*mt*p0.y + 3*mt2*t*(p0.y+p0.hoy) + 3*mt*t2*(p1.y+p1.hiy) + t2*t*p1.y,
  };
};

const strokePath = (ctx, pts) => {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 0; i < pts.length-1; i++) {
    const a = pts[i], b = pts[i+1];
    ctx.bezierCurveTo(a.x+a.hox, a.y+a.hoy, b.x+b.hix, b.y+b.hiy, b.x, b.y);
  }
  ctx.stroke();
};

// Build arc-length index once on resize — eliminates all per-frame length calculations.
// Returns segLens[k] = cumulative length of first k segments, and a flat LUT for pointAtLen.
const buildCache = (pts) => {
  const STEPS = 30, LUT_PER_SEG = 60;
  const segLens = [0];
  const lut = [{ x: pts[0].x, y: pts[0].y, len: 0 }];

  for (let i = 0; i < pts.length-1; i++) {
    let px = pts[i].x, py = pts[i].y, seg = 0;
    for (let s = 1; s <= STEPS; s++) {
      const p = bez(pts[i], pts[i+1], s/STEPS);
      seg += Math.hypot(p.x-px, p.y-py); px = p.x; py = p.y;
    }
    segLens.push(segLens[i] + seg);

    px = pts[i].x; py = pts[i].y;
    let cum = segLens[i];
    for (let s = 1; s <= LUT_PER_SEG; s++) {
      const p = bez(pts[i], pts[i+1], s/LUT_PER_SEG);
      cum += Math.hypot(p.x-px, p.y-py);
      lut.push({ x: p.x, y: p.y, len: cum }); px = p.x; py = p.y;
    }
  }

  return { totalLen: segLens.at(-1), segLens, lut };
};

// O(log N) binary search — replaces the original O(segments × 100) linear scan per frame
const pointAtLen = (lut, d) => {
  let lo = 0, hi = lut.length-1;
  while (lo < hi-1) { const mid = (lo+hi)>>1; if (lut[mid].len < d) lo = mid; else hi = mid; }
  const span = lut[hi].len - lut[lo].len;
  const t = span ? (d - lut[lo].len) / span : 0;
  return { x: lut[lo].x + t*(lut[hi].x-lut[lo].x), y: lut[lo].y + t*(lut[hi].y-lut[lo].y) };
};

// ── Component ───────────────────────────────────────────────────────────────────
export default function EventTimeline({ events: rawEvents }) {
  const events = useMemo(() => {
    const base = rawEvents?.length ? rawEvents : MOCK;
    return base.slice(0, 4).map((ev, i) => {
      const isActive = ev.status === 'active' || ev.status === 'live';
      const label = isActive ? 'ONGOING'
        : !ev.start_date ? 'TBA'
        : new Date(ev.start_date).toLocaleDateString('en-US', { month:'short', day:'2-digit' }).toUpperCase();
      return {
        ...ev, slot: SLOTS[i], isActive, label,
        subLabel: ev.registration_closes
          ? `Regist Until\n${ev.registration_closes}`
          : `Date\n${ev.start_date ?? 'TBA'}`,
      };
    });
  }, [rawEvents]);

  const activeIdx = events.findLastIndex(e => e.isActive);

  const [isMobile, setIsMobile] = useState(false);
  const [scaleF, setScaleF]     = useState(1);

  // DOM refs
  const containerRef = useRef(null);
  const canvasRef    = useRef(null);
  const ctxRef       = useRef(null);
  const nodeRefs     = useRef([]);
  const rotateRefs   = useRef([]);
  const mascotRef    = useRef(null);
  const ctaRef       = useRef(null);

  // Animation state — all refs, zero re-renders per frame
  const introStarted = useRef(false);
  const prog         = useRef({ v: 0 });          // tweened by GSAP 0 → 1
  const sizeRef      = useRef({ W: 0, H: 0 });
  const basePts      = useRef([]);                 // pixel-space anchors, updated on resize
  const curPts       = useRef([]);                 // mutated in-place each frame (base + float offsets)
  const cacheRef     = useRef({ totalLen: 1, segLens: [], lut: [] });

  const initLayout = () => {
    const el = containerRef.current;
    if (!el) return;
    const { width: W, height: H } = el.getBoundingClientRect();
    sizeRef.current = { W, H };
    setScaleF(Math.min(1, Math.max(0.8, W / 1920)));
    setIsMobile(W < 900);

    const canvas = canvasRef.current;
    if (canvas) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width  = W * dpr;
      canvas.height = H * dpr;
      ctxRef.current = canvas.getContext('2d', { alpha: true });
      ctxRef.current.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // Compute pixel-space pts with flat handle properties (faster per-frame access than nested objects)
    basePts.current = CP_DEF.map(([px, py, hix, hiy, hox, hoy]) => ({
      x: px*W, y: py*H, hix: hix*W, hiy: hiy*H, hox: hox*W, hoy: hoy*H,
    }));
    curPts.current = basePts.current.map(p => ({ ...p }));
    cacheRef.current = buildCache(curPts.current); // rebuild arc-length index
  };

  useEffect(() => {
    initLayout();
    const ro = new ResizeObserver(initLayout); // ResizeObserver > window resize listener
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting && !introStarted.current) playIntro(); },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Canvas draw loop — runs at rAF cadence via gsap.ticker
  useEffect(() => {
    const tick = () => {
      const ctx = ctxRef.current;
      const { W, H } = sizeRef.current;
      if (!ctx || !W) return;

      // Sync GSAP-driven float offsets into curPts (reads GSAP's internal value cache, not the DOM)
      nodeRefs.current.forEach((node, i) => {
        if (!node) return;
        curPts.current[i+1].x = basePts.current[i+1].x + (gsap.getProperty(node, 'x') || 0);
        curPts.current[i+1].y = basePts.current[i+1].y + (gsap.getProperty(node, 'y') || 0);
      });

      const { totalLen, segLens, lut } = cacheRef.current;
      const p = prog.current.v;

      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';

      // 1. White base path
      ctx.strokeStyle = WHT;
      ctx.setLineDash(p < 1 ? [p * totalLen, totalLen] : []);
      strokePath(ctx, curPts.current);

      // 2. Yellow active path — cached segLens replaces calculatePathLength() call
      const yLen = segLens[activeIdx + 1] ?? 0;
      ctx.strokeStyle = YEL;
      if (p < 1) ctx.setLineDash([Math.min(p * totalLen, yLen), totalLen]);
      strokePath(ctx, curPts.current.slice(0, activeIdx + 2));

      // 3. Yellow→white gradient transition segment
      const gStart = yLen, gEnd = segLens[activeIdx + 2] ?? 0;
      if (curPts.current.length > activeIdx + 2 && p * totalLen > gStart) {
        const gPts = curPts.current.slice(activeIdx + 1, activeIdx + 3);
        const grad = ctx.createLinearGradient(gPts[0].x, gPts[0].y, gPts[1].x, gPts[1].y);
        grad.addColorStop(0, YEL); grad.addColorStop(1, WHT);
        ctx.strokeStyle = grad;
        if (p < 1) ctx.setLineDash([Math.min(p * totalLen - gStart, gEnd - gStart), totalLen]);
        strokePath(ctx, gPts);
      }

      // 4. Travel dot — O(log N) LUT lookup replaces O(500) linear scan
      if (p > 0 && p < 1) {
        ctx.setLineDash([]);
        const pt = pointAtLen(lut, p * totalLen);
        ctx.fillStyle = YEL;
        ctx.beginPath(); ctx.arc(pt.x, pt.y,  4, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = 'rgba(255,201,54,0.2)';
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 12, 0, Math.PI*2); ctx.fill();
      }
    };

    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [activeIdx]);

  const playIntro = () => {
    if (introStarted.current) return;
    introStarted.current = true;

    nodeRefs.current.forEach(n => n && gsap.set(n, { opacity: 0, scale: 0 }));
    gsap.set([mascotRef.current, ctaRef.current], { opacity: 0, y: 40 });

    const { totalLen, segLens } = cacheRef.current;

    // Animate line draw — onUpdate uses cached segLens, no per-frame length recalculation
    gsap.to(prog.current, {
      v: 1,
      duration: 2.2,
      ease: 'power2.inOut',
      onUpdate() {
        const drawn = prog.current.v * totalLen;
        events.forEach((_, i) => {
          const node = nodeRefs.current[i];
          if (node && gsap.getProperty(node, 'opacity') === 0 && drawn >= (segLens[i + 1] ?? 0))
            gsap.to(node, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.4)' });
        });
      },
    });

    // Floating loops — tweening DOM nodes so GSAP tracks x/y for getProperty reads in tick
    events.forEach((ev, i) => {
      const node = nodeRefs.current[i], rot = rotateRefs.current[i];
      const { fy, fx, fd, fDl } = ev.slot;
      gsap.to(node, { y: fy, duration: fd,       repeat:-1, yoyo:true, ease:'sine.inOut', delay: fDl });
      gsap.to(node, { x: fx, duration: fd * 1.3, repeat:-1, yoyo:true, ease:'sine.inOut', delay: fDl + 0.5 });
      if (rot) gsap.to(rot, { rotation: i%2===0 ? 2.5 : -2.5, duration: fd * 1.7, repeat:-1, yoyo:true, ease:'sine.inOut' });
    });

    gsap.timeline()
      .to(ctaRef.current,    { opacity:1, y:0, duration:0.8 }, 0.8)
      .to(mascotRef.current, { opacity:1, y:0, duration:0.8 }, 1.0);
  };

  if (isMobile) return <VerticalTimeline events={events} />;

  return (
    <div ref={containerRef} style={{ position:'relative', width:'100%', height:'calc(100vh - 65px)', minHeight:600, overflow:'hidden', background:BG, zIndex:2, fontFamily:"'Outfit', sans-serif" }}>

      <div style={{ position:'absolute', inset:0, backgroundImage:'url(/Batik_Pattern_dark.svg)', backgroundSize:'cover', opacity:0.4, pointerEvents:'none' }} />

      <canvas ref={canvasRef} style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:1 }} />

      <img ref={mascotRef} src="/maskot/maskot1.png" alt="" style={{ position:'absolute', left:'57%', bottom:'2%', width:Math.round(420*scaleF), transform:'translateX(-50%)', pointerEvents:'none', zIndex:50, filter:'drop-shadow(0 8px 24px rgba(0,0,0,0.5))' }} />

      <div ref={ctaRef} style={{ position:'absolute', left:Math.round(160*scaleF), top:'55%', transform:'translateY(-50%)', zIndex:5, maxWidth:Math.round(300*scaleF) }}>
        <h2 style={{ fontFamily:"'Bebas Neue', cursive", fontSize:`${3.8*scaleF}rem`, color:'#fff', lineHeight:1, margin:0 }}>WHY WAIT?</h2>
        <p style={{ color:'#fff', fontSize:`${Math.round(22*scaleF)}px`, marginTop:5, fontWeight:500 }}>Make sure to not miss your registration period!</p>
        <div style={{ marginTop:18 }}><Button href="/events" variant="primary" size="md">SEE EVENTS</Button></div>
      </div>

      {events.map((ev, i) => {
        const s = ev.slot;
        const shadow = s.shadow ? `0 4px 16px rgba(0,0,0,0.7), 0 0 2px ${s.shadow}` : '0 4px 16px rgba(0,0,0,0.7)';
        return (
          <div key={ev.id ?? i} style={{ position:'absolute', left:`${CP_DEF[i+1][0]*100}%`, top:`${CP_DEF[i+1][1]*100}%`, zIndex:10 }}>
            <div ref={el => nodeRefs.current[i] = el} style={{ willChange:'transform' }}>
              <div style={{ position:'absolute', left:s.lo.x*scaleF, top:s.lo.y*scaleF, whiteSpace:'nowrap', pointerEvents:'none' }}>
                <div style={{ fontFamily:"'Bebas Neue', cursive", fontSize:`${Math.round(36*scaleF)}px`, color:s.lc, textShadow:`0 0 20px ${s.lg}` }}>{ev.label}</div>
                <div style={{ fontSize:`${Math.round(18*scaleF)}px`, color:'#fff', marginTop:3, marginLeft:Math.round(40*scaleF) }}>
                  {ev.subLabel.split('\n').map((ln, j) => <div key={j}>{ln}</div>)}
                </div>
              </div>
              <div ref={el => rotateRefs.current[i] = el}>
                <div className={ev.isActive ? 'et-pulse' : ''} style={{ position:'absolute', width:Math.round(s.ds*scaleF), height:Math.round(s.ds*scaleF), borderRadius:'50%', background:s.dot, boxShadow:`0 0 14px ${s.glow}`, transform:'translate(-50%,-50%)', zIndex:2 }} />
                <div className="et-card" style={{ position:'absolute', left:Math.round(s.co.x*scaleF), top:Math.round(s.co.y*scaleF), width:Math.round(210*scaleF), height:Math.round(300*scaleF), borderRadius:10, overflow:'hidden', border:`2px solid ${s.border}`, boxShadow:shadow, transform:`rotate(${s.tilt}deg)`, cursor:'pointer' }}>
                  <EventCard event={ev} className="w-full h-full" size="lg" />
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <style jsx>{`
        .et-card { transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1); }
        .et-card:hover { transform: rotate(0deg) scale(1.07) !important; z-index: 100; }
        .et-pulse { animation: et-pulse 2s infinite; }
        @keyframes et-pulse {
          0%   { box-shadow: 0 0 0 0    rgba(255,201,54,0.7); }
          70%  { box-shadow: 0 0 0 15px rgba(255,201,54,0);   }
          100% { box-shadow: 0 0 0 0    rgba(255,201,54,0);   }
        }
      `}</style>
    </div>
  );
}