'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import Button from '@/components/Button';
import EventCard from '@/components/EventCard';
import VerticalTimeline from '../timeline-stuff/VerticalTimeline';

const THEME = {
  path: {
    base: '#ffffff',
    active: '#FFC936',
    gradFrom: '#FFC936',
    gradTo: '#ffffff',
  },
  bg: {
    container: 'linear-gradient(to top, #06125C 5%, #0D26C2 100%)',
  },
};

const CP = [
  { pctX: -0.060, pctY: 0.290, hIn: { dx: -0.100, dy:  0.000 }, hOut: { dx:  0.100, dy:  0.180 } },
  { pctX:  0.290, pctY: 0.098, hIn: { dx: -0.089, dy: -0.123 }, hOut: { dx:  0.092, dy:  0.158 } },
  { pctX:  0.341, pctY: 0.692, hIn: { dx: -0.080, dy: -0.085 }, hOut: { dx:  0.115, dy:  0.124 } },
  { pctX:  0.670, pctY: 0.200, hIn: { dx: -0.122, dy: -0.126 }, hOut: { dx:  0.087, dy:  0.087 } },
  { pctX:  0.770, pctY: 0.640, hIn: { dx: -0.054, dy: -0.071 }, hOut: { dx:  0.114, dy:  0.103 } },
  { pctX:  1.060, pctY: 0.320, hIn: { dx: -0.208, dy: -0.010 }, hOut: { dx:  0.100, dy:  0.000 } },
];

const SLOTS = [
  {
    cardOffset: { x: -255, y: -10  },
    labelOffset: { x: 22,  y: -45  },
    tilt: 9,
    dotSize: 25,
    floatY: 20,  floatX:  12, floatDur: 5,   floatDelay: 0,
    palette: {
      border: '#FFC936', shadow: 'rgba(240,165,0,0.4)',
      dotColor: '#FFC936', dotGlow: '#FFC936',
      labelColor: '#FFC936', labelGlow: 'rgba(240,165,0,0.6)',
    },
  },
  {
    cardOffset: { x: 0,    y: -330 },
    labelOffset: { x: -80, y:  22  },
    tilt: -7,
    dotSize: 20,
    floatY: 25,  floatX: -16, floatDur: 4,   floatDelay: 0.8,
    palette: {
      border: '#fff', shadow: null,
      dotColor: '#fff', dotGlow: 'rgba(255,255,255,0.4)',
      labelColor: '#fff', labelGlow: 'rgba(255,255,255,0.3)',
    },
  },
  {
    cardOffset: { x: -240, y:  0   },
    labelOffset: { x: 22,  y: -46  },
    tilt: 5,
    dotSize: 20,
    floatY: 17,  floatX:  18, floatDur: 6,   floatDelay: 1.4,
    palette: {
      border: '#fff', shadow: null,
      dotColor: '#fff', dotGlow: 'rgba(255,255,255,0.4)',
      labelColor: '#fff', labelGlow: 'rgba(255,255,255,0.3)',
    },
  },
  {
    cardOffset: { x: 0,    y: -335 },
    labelOffset: { x: -80, y:  20  },
    tilt: -9,
    dotSize: 20,
    floatY: 13,  floatX: -12, floatDur: 3.5, floatDelay: 0.3,
    palette: {
      border: '#fff', shadow: null,
      dotColor: '#fff', dotGlow: 'rgba(255,255,255,0.4)',
      labelColor: '#fff', labelGlow: 'rgba(255,255,255,0.3)',
    },
  },
];

const MOCK_EVENTS = [
  {
    id: 'evt-001',
    name: 'Open Charity Golf Tournament',
    slug: 'golf-tournament-2026',
    status: 'active',
    start_date: '2026-03-01',
    card_image_url: 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=300&q=80',
    user_created: { organisation_name: 'IPB Golf Community' },
    registration_closes: '15 of March',
  },
  {
    id: 'evt-002',
    name: 'FORKI X IPB CUP 2026',
    slug: 'forki-ipb-cup-2026',
    status: 'upcoming',
    start_date: '2026-02-28',
    card_image_url: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=300&q=80',
    user_created: { organisation_name: 'UKM Karate IPB' },
    registration_closes: '30 of March',
  },
  {
    id: 'evt-003',
    name: 'IT-TODAY HACKTODAY',
    slug: 'it-today-hacktoday-2026',
    status: 'upcoming',
    start_date: '2026-03-20',
    card_image_url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=300&q=80',
    user_created: { organisation_name: 'Himalkom' },
    registration_closes: '1 of April',
  },
  {
    id: 'evt-004',
    name: 'GEMASTIK 2026',
    slug: 'gemastik-2026',
    status: 'upcoming',
    start_date: '2026-04-10',
    card_image_url: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=300&q=80',
    user_created: { organisation_name: 'BEM KM IPB' },
    registration_closes: '31 of April',
  },
];

function buildEvents(rawEvents) {
  const baseData = (rawEvents && rawEvents.length > 0) ? rawEvents : MOCK_EVENTS;
  return baseData.slice(0, 4).map((ev, i) => {
    const label =
      ev.status === 'active' || ev.status === 'live' ? 'ONGOING'
      : !ev.start_date      ? 'TBA'
      : new Date(ev.start_date)
          .toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
          .toUpperCase();

    return {
      ...ev,
      slot: SLOTS[i % SLOTS.length],
      label,
      isActive: ev.status === 'active' || ev.status === 'live',
      subLabel: ev.registration_closes ? `Regist Until\n${ev.registration_closes}` : `Date\n${ev.start_date || 'TBA'}`,
    };
  });
}

function svgPath(pts) {
  if (!pts || pts.length < 2) return '';
  const d = [`M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    d.push(
      `C ${(a.x + a.hOut.dx).toFixed(1)} ${(a.y + a.hOut.dy).toFixed(1)}, ` +
      `${(b.x + b.hIn.dx).toFixed(1)} ${(b.y + b.hIn.dy).toFixed(1)}, ` +
      `${b.x.toFixed(1)} ${b.y.toFixed(1)}`
    );
  }
  return d.join(' ');
}

function subLen(pts, endIdx) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  el.setAttribute('d', svgPath(pts.slice(0, endIdx + 1)));
  return el.getTotalLength();
}

function strokePath(ctx, pts) {
  if (!pts || pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    ctx.bezierCurveTo(
      a.x + a.hOut.dx, a.y + a.hOut.dy,
      b.x + b.hIn.dx,  b.y + b.hIn.dy,
      b.x, b.y,
    );
  }
  ctx.stroke();
}

function evalCubic(pts, si, t) {
  const p0 = pts[si];
  const p1 = pts[si + 1];
  const c0x = p0.x + p0.hOut.dx, c0y = p0.y + p0.hOut.dy;
  const c1x = p1.x + p1.hIn.dx,  c1y = p1.y + p1.hIn.dy;
  const mt = 1 - t, mt2 = mt * mt, t2 = t * t;
  return {
    x: mt2 * mt * p0.x + 3 * mt2 * t * c0x + 3 * mt * t2 * c1x + t2 * t * p1.x,
    y: mt2 * mt * p0.y + 3 * mt2 * t * c0y + 3 * mt * t2 * c1y + t2 * t * p1.y,
  };
}

function buildArcLUT(pts, steps = 400) {
  const segCount = pts.length - 1;
  const data = new Float32Array((steps + 1) * 3);
  let cumLen = 0, px = pts[0].x, py = pts[0].y;
  data[0] = 0; data[1] = px; data[2] = py;
  for (let i = 1; i <= steps; i++) {
    const tScaled = (i / steps) * segCount;
    const si = Math.min(segCount - 1, Math.floor(tScaled));
    const { x, y } = evalCubic(pts, si, tScaled - si);
    cumLen += Math.hypot(x - px, y - py);
    const b = i * 3;
    data[b] = cumLen; data[b + 1] = x; data[b + 2] = y;
    px = x; py = y;
  }
  return { data, totalLen: cumLen, steps };
}

function getPointFromLUT({ data, totalLen, steps }, targetLen) {
  if (targetLen <= 0)        return { x: data[1],               y: data[2]               };
  if (targetLen >= totalLen) return { x: data[steps * 3 + 1],   y: data[steps * 3 + 2]   };
  let lo = 0, hi = steps;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (data[mid * 3] < targetLen) lo = mid;
    else hi = mid;
  }
  const a    = lo * 3;
  const bIdx = hi * 3;
  const frac = (targetLen - data[a]) / (data[bIdx] - data[a]);
  return {
    x: data[a + 1] + frac * (data[bIdx + 1] - data[a + 1]),
    y: data[a + 2] + frac * (data[bIdx + 2] - data[a + 2]),
  };
}

const _dashW  = new Float32Array(2);
const _dashY  = new Float32Array(2);
const _dashG  = new Float32Array(2);
const _NODASH = [];

const H_MARGIN = 160;
const POST_MS  = 1000 / 30;
const CTA_FRAC = 0.40;


// Minimum card scale — prevents cards from becoming too small on narrow
// desktop viewports (e.g. 900 px wide → raw ratio ≈ 0.47 without this floor).
const MIN_CARD_SCALE = 0.8;

export default function EventTimeline({ events: rawEvents }) {
  const events      = buildEvents(rawEvents);
  const activeIdx   = events.findLastIndex(e => e.isActive);
  const inactiveIdx = activeIdx + 1;

  const [isMobile, setIsMobile] = useState(false);
  const [scaleF, setScaleF]     = useState(1);

  const containerRef = useRef(null);
  const canvasRef    = useRef(null);
  const ctxRef       = useRef(null);
  const gradCacheRef = useRef(null);

  const pathWRef = useRef(null);
  const pathYRef = useRef(null);
  const pathGRef = useRef(null);

  const arcLUTRef  = useRef(null);
  const segLen     = useRef({ w: 0, y: 0, g: 0 });
  const curveRef   = useRef([]);
  const sizeRef    = useRef({ W: 0, H: 0 });
  const basePosRef = useRef([
    { x: 0, y: 0 }, { x: 0, y: 0 },
    { x: 0, y: 0 }, { x: 0, y: 0 },
  ]);

  const yPtsRef = useRef([]);
  const gPtsRef = useRef([]);

  const introStarted = useRef(false);
  const introProg    = useRef(0);
  const travelRef    = useRef({ drawn: 0, total: 0, active: false });
  const visibleRef   = useRef(false);
  const postCapMs    = useRef(0);
  const prevPts = useRef([
    { x: -1, y: -1 }, { x: -1, y: -1 },
    { x: -1, y: -1 }, { x: -1, y: -1 },
  ]);
  const prevPtsValid = useRef(false);

  const ctaRef      = useRef(null);
  const mascotRef   = useRef(null);
  const nodeRefs    = useRef([]);
  const rotateRefs  = useRef([]);

  const floatTlRef = useRef(null);
  const tabVisRef  = useRef(true);

  const wasMobileRef = useRef(false);

  const { contextSafe } = useGSAP({ scope: containerRef });

  const initCurve = () => {
    const el = containerRef.current;
    if (!el) return;

    const { width: W, height: H } = el.getBoundingClientRect();

    // ── Scale factor ────────────────────────────────────────────────────────
    // Raw ratio relative to the design width, clamped so cards never shrink
    // below MIN_CARD_SCALE on the narrowest supported desktop viewport (~900 px).
    const sf        = Math.min(1, Math.max(MIN_CARD_SCALE, W / 1920));
    const nowMobile = W < 900;

    sizeRef.current = { W, H, scaleF: sf };
    setScaleF(sf);
    setIsMobile(nowMobile);

    if (wasMobileRef.current && !nowMobile) {
      introStarted.current = false;
      introProg.current    = 0;
      travelRef.current    = { drawn: 0, total: 0, active: false };
      segLen.current       = { w: 0, y: 0, g: 0 };
      prevPtsValid.current = false;

      if (floatTlRef.current) {
        floatTlRef.current.kill();
        floatTlRef.current = null;
      }
    }
    wasMobileRef.current = nowMobile;

    const canvas = canvasRef.current;
    if (canvas) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width  = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);

      if (!ctxRef.current) {
        ctxRef.current = canvas.getContext('2d', { alpha: true, desynchronized: true });
      }
      ctxRef.current.setTransform(dpr, 0, 0, dpr, 0, 0);
      gradCacheRef.current = null;
    }

    curveRef.current = CP.map(p => ({
      x: p.pctX * W,
      y: p.pctY * H,
      hIn:  { dx: p.hIn.dx  * W, dy: p.hIn.dy  * H },
      hOut: { dx: p.hOut.dx * W, dy: p.hOut.dy * H },
    }));

    prevPtsValid.current = false;

    const pts = curveRef.current;
    yPtsRef.current = pts.slice(0, activeIdx + 2);
    gPtsRef.current = pts.slice(activeIdx + 1, inactiveIdx + 2);

    if (introStarted.current) {
      CP.slice(1, 5).forEach((cp, i) => {
        basePosRef.current[i].x = cp.pctX * W;
        basePosRef.current[i].y = cp.pctY * H;
      });
      draw(curveRef.current, introProg.current);
    }

    if (wasMobileRef.current === false && !introStarted.current && visibleRef.current) {
      playIntro();
    }
  };

  useEffect(() => {
    initCurve();

    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => initCurve());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let introFired = false;

    const io = new IntersectionObserver(
      ([entry]) => {
        const inView = entry.isIntersecting;
        visibleRef.current = inView;

        if (floatTlRef.current) {
          if (inView && !document.hidden) {
            floatTlRef.current.resume();
          } else {
            floatTlRef.current.pause();
          }
        }

        if (inView && entry.intersectionRatio >= 0.15 && (!introFired || !introStarted.current)) {
          introFired = true;
          playIntro();
        }
      },
      { threshold: [0, 0.15] },
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => {
      tabVisRef.current = !document.hidden;
      if (floatTlRef.current) {
        if (!document.hidden && visibleRef.current) {
          floatTlRef.current.resume();
        } else {
          floatTlRef.current.pause();
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  useEffect(() => {
    const tick = () => {
      if (!visibleRef.current || !tabVisRef.current || !introStarted.current) return;

      const progress = introProg.current;
      const now      = performance.now();

      if (progress >= 1) {
        if (now - postCapMs.current < POST_MS) return;
        postCapMs.current = now;
      }

      const { W, H } = sizeRef.current;
      if (!W || !H) return;

      let changed = false;
      const prev  = prevPts.current;
      const valid = prevPtsValid.current;

      nodeRefs.current.forEach((node, i) => {
        if (!node || !basePosRef.current[i]) return;
        const nx = basePosRef.current[i].x + (gsap.getProperty(node, 'x') || 0);
        const ny = basePosRef.current[i].y + (gsap.getProperty(node, 'y') || 0);

        if (!valid || Math.abs(nx - prev[i].x) > 0.5 || Math.abs(ny - prev[i].y) > 0.5) {
          changed = true;
        }
        curveRef.current[i + 1].x = nx;
        curveRef.current[i + 1].y = ny;
      });

      if (progress < 1 || changed) {
        if (changed) {
          const pts = curveRef.current;
          yPtsRef.current = pts.slice(0, activeIdx + 2);
          gPtsRef.current = pts.slice(activeIdx + 1, inactiveIdx + 2);
          for (let i = 0; i < 4; i++) {
            prev[i].x = pts[i + 1].x;
            prev[i].y = pts[i + 1].y;
          }
          prevPtsValid.current = true;
        }
        draw(curveRef.current, progress);
      }
    };

    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  function draw(pts, progress) {
    const ctx = ctxRef.current;
    if (!ctx) return;

    const { W, H } = sizeRef.current;
    if (!W || !H) return;

    const { w: wLen, y: yLen, g: gLen } = segLen.current;
    if (!wLen) return;

    ctx.clearRect(0, 0, W, H);
    if (progress <= 0) return;

    const yPts    = yPtsRef.current;
    const gPts    = gPtsRef.current;
    const isIntro = progress < 1;
    const drawn   = progress * wLen;

    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 5;

    ctx.strokeStyle = THEME.path.base;
    if (isIntro) {
      _dashW[0] = Math.min(drawn, wLen); _dashW[1] = wLen + 1;
      ctx.setLineDash(_dashW);
    } else {
      ctx.setLineDash(_NODASH);
    }
    strokePath(ctx, pts);

    const yDrawn = Math.min(drawn, yLen);
    if (yDrawn > 0) {
      ctx.strokeStyle = THEME.path.active;
      if (isIntro) {
        _dashY[0] = yDrawn; _dashY[1] = yLen + 1;
        ctx.setLineDash(_dashY);
      }
      strokePath(ctx, yPts);
    }

    if (gPts.length >= 2) {
      const gDrawn = isIntro ? Math.max(0, drawn - yLen) : gLen;

      if (gDrawn > 0 && gLen > 0) {
        if (isIntro) {
          ctx.strokeStyle = THEME.path.gradFrom;
          _dashG[0] = Math.min(gDrawn, gLen); _dashG[1] = gLen + 1;
          ctx.setLineDash(_dashG);
        } else {
          ctx.setLineDash(_NODASH);

          const p0  = gPts[0];
          const p1  = gPts[gPts.length - 1];
          const key = `${p0.x | 0},${p0.y | 0},${p1.x | 0},${p1.y | 0}`;
          if (!gradCacheRef.current || gradCacheRef.current.key !== key) {
            const g = ctx.createLinearGradient(p0.x, p0.y, p1.x, p1.y);
            g.addColorStop(0, THEME.path.gradFrom);
            g.addColorStop(1, THEME.path.gradTo);
            gradCacheRef.current = { key, gradient: g };
          }
          ctx.strokeStyle = gradCacheRef.current.gradient;
        }
        strokePath(ctx, gPts);
      }
    }

    ctx.setLineDash(_NODASH);

    const { drawn: td, total: tt, active: ta } = travelRef.current;
    if (ta && tt > 0 && td > 0 && td < tt && arcLUTRef.current) {
      const pt = getPointFromLUT(arcLUTRef.current, td);
      ctx.beginPath(); ctx.arc(pt.x, pt.y, 16, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,201,54,0.08)'; ctx.fill();
      ctx.beginPath(); ctx.arc(pt.x, pt.y,  9, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,201,54,0.22)'; ctx.fill();
      ctx.beginPath(); ctx.arc(pt.x, pt.y,  4, 0, Math.PI * 2); ctx.fillStyle = '#FFC936';               ctx.fill();
    }
  }

  const playIntro = contextSafe(function playIntro() {
    if (introStarted.current) return;

    requestAnimationFrame(() => requestAnimationFrame(() => {
      const white  = pathWRef.current;
      const yellow = pathYRef.current;
      const grad   = pathGRef.current;
      if (!white || !yellow || !grad) return;

      const pts  = curveRef.current;
      const yPts = pts.slice(0, activeIdx + 2);
      const gPts = pts.slice(activeIdx + 1, inactiveIdx + 2);

      yPtsRef.current = yPts;
      gPtsRef.current = gPts;

      white.setAttribute( 'd', svgPath(pts));
      yellow.setAttribute('d', svgPath(yPts));
      grad.setAttribute(  'd', svgPath(gPts));

      const wLen = white.getTotalLength();
      const yLen = yellow.getTotalLength();
      const gLen = grad.getTotalLength();
      segLen.current = { w: wLen, y: yLen, g: gLen };

      arcLUTRef.current = buildArcLUT(pts, 400);

      const subLengths = events.map((_, i) => subLen(pts, i + 1));

      const { W, H } = sizeRef.current;
      CP.slice(1, 5).forEach((cp, i) => {
        basePosRef.current[i].x = cp.pctX * W;
        basePosRef.current[i].y = cp.pctY * H;
      });

      nodeRefs.current.forEach(n => n && gsap.set(n, { opacity: 0, scale: 0, transformOrigin: '0px 0px' }));
      if (ctaRef.current)    gsap.set(ctaRef.current,    { opacity: 0, y: 40 });
      if (mascotRef.current) gsap.set(mascotRef.current, { opacity: 0, y: 40 });

      const tl = gsap.timeline();
      floatTlRef.current = tl;

      nodeRefs.current.forEach((node, i) => {
        if (!node) return;
        const { floatY, floatX, floatDur, floatDelay } = events[i].slot;
        const rot = rotateRefs.current[i];
        const sf  = sizeRef.current.scaleF ?? 1;

        tl.to(node, { y: floatY * sf, duration: floatDur, repeat: -1, yoyo: true, ease: 'sine.inOut' }, floatDelay);
        tl.to(node, { x: floatX * sf, duration: floatDur * 1.3, repeat: -1, yoyo: true, ease: 'sine.inOut' }, floatDelay + 0.5);
        if (rot) {
          tl.to(rot, {
            rotation: i % 2 === 0 ? 2.5 : -2.5,
            duration: floatDur * 1.7,
            repeat: -1, yoyo: true, ease: 'sine.inOut',
          }, floatDelay + 1);
        }
      });

      const revealed     = events.map(() => false);
      let ctaRevealed    = false;
      let mascotRevealed = false;

      const proxy = { drawn: 0 };
      introStarted.current = true;
      introProg.current    = 0;
      travelRef.current    = { drawn: 0, total: wLen, active: true };

      gsap.to(proxy, {
        drawn: wLen,
        duration: 1.6,
        ease: 'power1.inOut',
        delay: 0.1,
        onUpdate() {
          const d = proxy.drawn;
          introProg.current       = d / wLen;
          travelRef.current.drawn = d;

          if (!ctaRevealed && d >= wLen * CTA_FRAC) {
            ctaRevealed = true;
            ctaRef.current && gsap.to(ctaRef.current, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' });
          }

          if (!mascotRevealed && d >= subLengths[1]) {
            mascotRevealed = true;
            mascotRef.current && gsap.to(mascotRef.current, { opacity: 1, y: 0, duration: 0.8, ease: 'back.out(1.2)' });
          }

          subLengths.forEach((sl, i) => {
            if (!revealed[i] && d >= sl) {
              revealed[i] = true;
              const node = nodeRefs.current[i];
              node && gsap.to(node, { opacity: 1, scale: 1, duration: 0.55, ease: 'back.out(1.4)', transformOrigin: '50% 50%' });
            }
          });
        },
        onComplete() {
          introProg.current = 1;
          travelRef.current = { drawn: 0, total: 0, active: false };
        },
      });
    }));
  });

  if (isMobile) return <VerticalTimeline events={events} />;

  return (
    <>
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width: '100%',
          height: 'calc(100vh - 65px)',
          minHeight: 600,
          overflow: 'hidden',
          fontFamily: "'Outfit', sans-serif",
          background: THEME.bg.container,
          zIndex: 2,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'url(/Batik_Pattern_dark.svg)',
            backgroundSize: 'cover', backgroundPosition: 'center',
            pointerEvents: 'none', zIndex: 0, opacity: 0.4,
          }}
        />

        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}
        />

        <svg aria-hidden="true" style={{ position: 'absolute', width: 0, height: 0, opacity: 0, overflow: 'visible' }}>
          <path ref={pathWRef} fill="none" />
          <path ref={pathYRef} fill="none" />
          <path ref={pathGRef} fill="none" />
        </svg>

        <img
          ref={mascotRef}
          src="/maskot/maskot1.png"
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '57%',
            bottom: '2%',
            width: Math.round(420 * scaleF),
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
            zIndex: 50,
            filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.5))',
          }}
        />

        <div
          ref={ctaRef}
          style={{
            position: 'absolute',
            left: Math.round(H_MARGIN * scaleF),
            top: '55%',
            transform: 'translateY(-50%)',
            zIndex: 5,
            maxWidth: Math.round(300 * scaleF),
          }}
        >
          <h2 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: `${3.8 * scaleF}rem`, color: '#fff', lineHeight: 1, margin: 0, textShadow: '0 0 40px rgba(255,255,255,0.15)' }}>
            WHY WAIT?
          </h2>
          <p style={{ fontFamily: 'Plus Jakarta Sans', color: '#fff', fontSize: `${Math.round(22 * scaleF)}px`, marginTop: 5, lineHeight: 1.2, fontWeight: 500 }}>
            Make sure to not miss your registration period!
          </p>
          <div style={{ marginTop: 18 }}>
            <Button href="/events" variant="primary" size="md">SEE EVENTS</Button>
          </div>
        </div>

        {events.map((ev, i) => {
          const { slot } = ev;
          const shadowBase  = slot.palette.shadow
            ? `0 4px 16px rgba(0,0,0,0.7), 0 0 2px ${slot.palette.shadow}`
            : '0 4px 16px rgba(0,0,0,0.7)';
          const shadowHover = slot.palette.shadow
            ? `0 8px 28px rgba(0,0,0,0.85), 0 0 2px ${slot.palette.shadow}`
            : '0 8px 28px rgba(0,0,0,0.85)';

          return (
            <div
              key={ev.id || i}
              style={{
                position: 'absolute',
                left: `${CP[i + 1].pctX * 100}%`,
                top: `${CP[i + 1].pctY * 100}%`,
                zIndex: 10, width: 0, height: 0,
              }}
            >
              <div ref={el => (nodeRefs.current[i] = el)} style={{ willChange: 'transform', opacity: 0 }}>

                <div style={{ position: 'absolute', left: slot.labelOffset.x * scaleF, top: slot.labelOffset.y * scaleF, whiteSpace: 'nowrap', pointerEvents: 'none' }}>
                  <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: `${Math.round(36 * scaleF)}px`, lineHeight: 1, color: slot.palette.labelColor, textShadow: `0 0 20px ${slot.palette.labelGlow}` }}>
                    {ev.label}
                  </div>
                  <div style={{ fontSize: `${Math.round(18 * scaleF)}px`, color: '#fff', lineHeight: 1.45, marginTop: 3, letterSpacing: '0.3px', marginLeft: Math.round(40 * scaleF) }}>
                    {ev.subLabel.split('\n').map((ln, j) => <div key={j}>{ln}</div>)}
                  </div>
                </div>

                <div ref={el => (rotateRefs.current[i] = el)}>
                  <div
                    className={ev.isActive ? 'et-pulse' : undefined}
                    style={{
                      position: 'absolute',
                      width: Math.round(slot.dotSize * scaleF), height: Math.round(slot.dotSize * scaleF),
                      borderRadius: '50%',
                      background: slot.palette.dotColor,
                      boxShadow: `0 0 14px ${slot.palette.dotGlow}, 0 0 4px ${slot.palette.dotColor}`,
                      color: slot.palette.dotColor,
                      zIndex: 2,
                      transform: 'translate(-50%,-50%)',
                    }}
                  />

                  <div
                    style={{
                      position: 'absolute',
                      left: Math.round(slot.cardOffset.x * scaleF), top: Math.round(slot.cardOffset.y * scaleF),
                      width: Math.round(210 * scaleF), height: Math.round(300 * scaleF),
                      borderRadius: 10, overflow: 'hidden',
                      border: `2px solid ${slot.palette.border}`,
                      boxShadow: shadowBase,
                      transform: `rotate(${slot.tilt}deg)`,
                      transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'rotate(0deg) scale(1.07)';
                      e.currentTarget.style.boxShadow = shadowHover;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = `rotate(${slot.tilt}deg)`;
                      e.currentTarget.style.boxShadow = shadowBase;
                    }}
                  >
                    <EventCard event={ev} className="w-full h-full" size="lg" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}