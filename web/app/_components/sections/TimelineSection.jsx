'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import Button from '@/components/Button';
import EventCard from '@/components/EventCard';

// ==========================================================
// THEME
// ==========================================================

const THEME = {
  path: {
    base:     '#ffffff',
    active:   '#FFC936',
    gradFrom: '#FFC936',
    gradTo:   '#ffffff',
  },
  bg: {
    container: 'linear-gradient(to top, #06125C 5%, #0D26C2 100%)',
    blobLeft:  'radial-gradient(circle, rgba(15,30,130,0.4) 0%, transparent 70%)',
    blobRight: 'radial-gradient(circle, rgba(26,10,80,0.5) 0%, transparent 70%)',
  },
};

// ==========================================================
// KURVA SVG
// titik kontrol kurva dalam persen relatif ke container
// urutan: [phantom kiri, slot 0, slot 1, slot 2, slot 3, phantom kanan]
// ==========================================================

const CURVE_POINTS = [
  { pctX: -0.060, pctY: 0.350, hIn: { dx: -0.100, dy: 0.000 }, hOut: { dx: 0.100, dy: 0.180 } },
  { pctX: 0.310,  pctY: 0.158, hIn: { dx: -0.089, dy: -0.123 }, hOut: { dx: 0.092, dy: 0.158 } },
  { pctX: 0.321,  pctY: 0.742, hIn: { dx: -0.080, dy: -0.085 }, hOut: { dx: 0.115, dy: 0.124 } },
  { pctX: 0.670,  pctY: 0.304, hIn: { dx: -0.122, dy: -0.126 }, hOut: { dx: 0.087, dy: 0.087 } },
  { pctX: 0.756,  pctY: 0.704, hIn: { dx: -0.054, dy: -0.071 }, hOut: { dx: 0.114, dy: 0.103 } },
  { pctX: 1.060,  pctY: 0.380, hIn: { dx: -0.208, dy: -0.010 }, hOut: { dx: 0.100, dy: 0.000 } },
];

// ==========================================================
// VISUAL CONFIG PER SLOT
// ==========================================================

const TIMELINE_SLOTS = [
  {
    cardOffset:  { x: -255, y: -20 },
    labelOffset: { x: 22, y: -45 },
    tilt: 9,
    dotSize: 25,
    floatY: 28, floatX: 12,  floatDur: 3.4, floatDelay: 0,
    palette: {
      border:     '#FFC936',
      shadow:     'rgba(240,165,0,0.4)',
      dotColor:   '#FFC936',
      dotGlow:    '#FFC936',
      labelColor: '#FFC936',
      labelGlow:  'rgba(240,165,0,0.6)',
    },
  },
  {
    cardOffset:  { x: 0, y: -350 },
    labelOffset: { x: -80, y: 22 },
    tilt: -7,
    dotSize: 20,
    floatY: 32, floatX: -16, floatDur: 3.0, floatDelay: 0.8,
    palette: {
      border:     '#ffffff',
      shadow:     null,
      dotColor:   '#ffffff',
      dotGlow:    'rgba(255,255,255,0.4)',
      labelColor: '#ffffff',
      labelGlow:  'rgba(255,255,255,0.3)',
    },
  },
  {
    cardOffset:  { x: -240, y: -10 },
    labelOffset: { x: 22, y: -46 },
    tilt: 5,
    dotSize: 20,
    floatY: 24, floatX: 18,  floatDur: 3.7, floatDelay: 1.4,
    palette: {
      border:     '#ffffff',
      shadow:     null,
      dotColor:   '#ffffff',
      dotGlow:    'rgba(255,255,255,0.4)',
      labelColor: '#ffffff',
      labelGlow:  'rgba(255,255,255,0.3)',
    },
  },
  {
    cardOffset:  { x: 0, y: -350 },
    labelOffset: { x: -80, y: 20 },
    tilt: -9,
    dotSize: 20,
    floatY: 30, floatX: -12, floatDur: 2.8, floatDelay: 0.3,
    palette: {
      border:     '#ffffff',
      shadow:     null,
      dotColor:   '#ffffff',
      dotGlow:    'rgba(255,255,255,0.4)',
      labelColor: '#ffffff',
      labelGlow:  'rgba(255,255,255,0.3)',
    },
  },
];

// ==========================================================
// MOCK DATA
//
// nanti ganti dengan fetch ke:
// GET /items/events
//   ?filter[is_published][_eq]=true
//   &filter[status][_in]=active,upcoming
//   &sort[]=start_date
//   &limit=4
//   &fields[]=id,name,slug,status,start_date,card_image_url
//   &fields[]=user_created.organisation_name
// ==========================================================

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

function getTimelineEvents() {
  return MOCK_EVENTS;
}

// ==========================================================
// HELPERS
// ==========================================================

function getEventLabel(event) {
  if (event.status === 'active') return 'ONGOING';
  if (!event.start_date) return 'TBA';
  const d = new Date(event.start_date);
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase();
}

function buildRenderEvents(dbEvents) {
  return dbEvents.map((event, i) => ({
    ...event,
    slot:     TIMELINE_SLOTS[i],
    label:    getEventLabel(event),
    isActive: event.status === 'active',
    subLabel: `Regist Until\n${event.registration_closes}`,
  }));
}

function buildPath(pts) {
  if (!pts || pts.length < 2) return '';
  const d = [`M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    d.push(
      `C ${(a.x + a.hOut.dx).toFixed(1)} ${(a.y + a.hOut.dy).toFixed(1)},` +
      ` ${(b.x + b.hIn.dx).toFixed(1)} ${(b.y + b.hIn.dy).toFixed(1)},` +
      ` ${b.x.toFixed(1)} ${b.y.toFixed(1)}`
    );
  }
  return d.join(' ');
}

function measureSubLength(pts, endIdx) {
  const sub = pts.slice(0, endIdx + 1);
  if (sub.length < 2) return 0;
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  el.setAttribute('d', buildPath(sub));
  return el.getTotalLength();
}

const CTA_TRIGGER_FRACTION = 0.40;

const COMPONENT_STYLES = `
  .et-pulse::after {
    content: '';
    position: absolute; inset: -4px; border-radius: 50%;
    border: 1.5px solid currentColor;
    animation: pulse-ring 2.4s ease-out infinite;
  }
  @keyframes pulse-ring {
    0%   { transform: scale(1);   opacity: 0.7; }
    100% { transform: scale(2.8); opacity: 0;   }
  }
`;

// ==========================================================
// MAIN COMPONENT
// ==========================================================

export default function EventTimeline() {
  const events = buildRenderEvents(getTimelineEvents());

  const activeIdx   = events.findLastIndex(e => e.isActive);
  const inactiveIdx = activeIdx + 1;

  const containerRef  = useRef(null);
  const pathWhiteRef  = useRef(null);
  const pathYellowRef = useRef(null);
  const pathGradRef   = useRef(null);
  const gradientRef   = useRef(null);

  const travelRef = useRef({ drawn: 0, total: 0, active: false });
  const dotGRef   = useRef(null);

  const ctaRef     = useRef(null);
  const nodeRefs   = useRef([]);
  const rotateRefs = useRef([]);
  const dotRefs    = useRef([]);
  const tweenRefs  = useRef([]);

  const curveRef = useRef([]);

  const initCurve = () => {
    const { width: W, height: H } = containerRef.current.getBoundingClientRect();
    curveRef.current = CURVE_POINTS.map(p => ({
      x:    p.pctX  * W,
      y:    p.pctY  * H,
      hIn:  { dx: p.hIn.dx  * W, dy: p.hIn.dy  * H },
      hOut: { dx: p.hOut.dx * W, dy: p.hOut.dy * H },
    }));
  };

  useEffect(() => {
    initCurve();
    window.addEventListener('resize', initCurve);
    return () => window.removeEventListener('resize', initCurve);
  }, []);

  // ==========================================================
  // MASTER TICK
  // ==========================================================

  useEffect(() => {
    const tick = () => {
      const container = containerRef.current;
      if (!container || !pathWhiteRef.current || !curveRef.current.length) return;

      const cr = container.getBoundingClientRect();
      dotRefs.current.forEach((dot, i) => {
        if (!dot) return;
        const r = dot.getBoundingClientRect();
        curveRef.current[i + 1].x = r.left + r.width  / 2 - cr.left;
        curveRef.current[i + 1].y = r.top  + r.height / 2 - cr.top;
      });

      const pts = curveRef.current;

      pathWhiteRef.current.setAttribute('d', buildPath(pts));
      pathYellowRef.current.setAttribute('d', buildPath(pts.slice(0, activeIdx + 2)));
      pathGradRef.current.setAttribute('d', buildPath(pts.slice(activeIdx + 1, inactiveIdx + 2)));

      const a = pts[activeIdx   + 1];
      const b = pts[inactiveIdx + 1];
      if (gradientRef.current && a && b) {
        gradientRef.current.setAttribute('x1', a.x.toFixed(1));
        gradientRef.current.setAttribute('y1', a.y.toFixed(1));
        gradientRef.current.setAttribute('x2', b.x.toFixed(1));
        gradientRef.current.setAttribute('y2', b.y.toFixed(1));
      }

      const { drawn, total, active } = travelRef.current;
      const dotG = dotGRef.current;
      if (dotG) {
        if (active && total > 0 && drawn > 0 && drawn < total) {
          const pt = pathWhiteRef.current.getPointAtLength(drawn);
          dotG.setAttribute('transform', `translate(${pt.x.toFixed(1)},${pt.y.toFixed(1)})`);
          dotG.setAttribute('opacity', '1');
        } else {
          dotG.setAttribute('opacity', '0');
        }
      }
    };

    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  // ==========================================================
  // INTRO ANIMATION
  // ==========================================================

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        playIntro();
      },
      { threshold: 0.15 }
    );

    io.observe(container);
    return () => io.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function playIntro() {
    requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const white  = pathWhiteRef.current;
      const yellow = pathYellowRef.current;
      const grad   = pathGradRef.current;
      if (!white || !yellow || !grad) return;

      const whiteLen  = white.getTotalLength();
      const yellowLen = yellow.getTotalLength();
      const gradLen   = grad.getTotalLength();

      const subLengths = events.map((_, i) =>
        measureSubLength(curveRef.current, i + 1)
      );

      const arm = (el, len) => {
        el.style.strokeDasharray  = `${len}`;
        el.style.strokeDashoffset = `${len}`;
      };
      arm(white,  whiteLen);
      arm(yellow, yellowLen);
      arm(grad,   gradLen);
      white.style.visibility  = 'visible';
      yellow.style.visibility = 'visible';
      grad.style.visibility   = 'visible';

      nodeRefs.current.forEach(n => n && gsap.set(n, {
        opacity: 0,
        scale: 0,
        xPercent: -50,
        yPercent: -50,
        transformOrigin: '50% 50%',
      }));
      if (ctaRef.current) gsap.set(ctaRef.current, { opacity: 0, y: 40 });

      nodeRefs.current.forEach((node, i) => {
        if (!node) return;
        const { floatY, floatX, floatDur, floatDelay } = events[i].slot;
        const rotateTarget = rotateRefs.current[i];
        tweenRefs.current[i * 3]     = gsap.to(node, { y: floatY, duration: floatDur, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: floatDelay });
        tweenRefs.current[i * 3 + 1] = gsap.to(node, { x: floatX, duration: floatDur * 1.3, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: floatDelay + 0.5 });
        tweenRefs.current[i * 3 + 2] = rotateTarget
          ? gsap.to(rotateTarget, { rotation: i % 2 === 0 ? 2.5 : -2.5, duration: floatDur * 1.7, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: floatDelay + 1 })
          : null;
      });

      const revealed  = events.map(() => false);
      let ctaRevealed = false;
      const proxy     = { drawn: 0 };

      travelRef.current = { drawn: 0, total: whiteLen, active: true };

      gsap.to(proxy, {
        drawn: whiteLen,
        duration: 2.8,
        ease: 'power1.inOut',
        delay: 0.2,
        onUpdate() {
          const d = proxy.drawn;

          white.style.strokeDashoffset  = `${whiteLen - d}`;
          yellow.style.strokeDashoffset = `${yellowLen - Math.min(d, yellowLen)}`;
          const gDrawn = Math.max(0, Math.min(d - yellowLen, gradLen));
          grad.style.strokeDashoffset   = `${gradLen - gDrawn}`;

          travelRef.current.drawn = d;

          if (!ctaRevealed && d >= whiteLen * CTA_TRIGGER_FRACTION) {
            ctaRevealed = true;
            ctaRef.current && gsap.to(ctaRef.current, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' });
          }

          subLengths.forEach((subLen, i) => {
            if (!revealed[i] && d >= subLen) {
              revealed[i] = true;
              const node = nodeRefs.current[i];
              if (!node) return;
              gsap.to(node, { opacity: 1, scale: 1, duration: 0.55, ease: 'back.out(1.4)', transformOrigin: '50% 50%' });
            }
          });
        },
        onComplete() {
          [white, yellow, grad].forEach(el => {
            el.style.strokeDasharray  = '';
            el.style.strokeDashoffset = '';
          });
          travelRef.current = { drawn: 0, total: 0, active: false };
        },
      });
    });
    });
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: COMPONENT_STYLES }} />

      <div
        ref={containerRef}
        style={{
          position: 'relative', width: '100%', height: '100vh', minHeight: 600,
          overflow: 'hidden', fontFamily: "'Outfit', sans-serif",
          background: THEME.bg.container,
          zIndex: 2,
        }}
      >
        {/* background pattern */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'url(/Batik_Pattern_dark.svg)',
            backgroundSize: 'cover', backgroundPosition: 'center',
            pointerEvents: 'none', zIndex: 0, opacity: 0.5,
          }}
        />

        {/* decorative blobs */}
        <div style={{ position: 'absolute', top: '10%', left: '5%', width: 400, height: 400, borderRadius: '50%', pointerEvents: 'none', background: THEME.bg.blobLeft }} />
        <div style={{ position: 'absolute', bottom: '5%', right: '10%', width: 350, height: 350, borderRadius: '50%', pointerEvents: 'none', background: THEME.bg.blobRight }} />

        {/* SVG layer: kurva + travel dot */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1, overflow: 'visible' }}>
          <defs>
            <linearGradient ref={gradientRef} id="seg-grad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={THEME.path.gradFrom} />
              <stop offset="100%" stopColor={THEME.path.gradTo} />
            </linearGradient>
          </defs>

          <path ref={pathWhiteRef}  fill="none" stroke={THEME.path.base}   strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1" strokeDashoffset="1" style={{ visibility: 'hidden' }} />
          <path ref={pathYellowRef} fill="none" stroke={THEME.path.active} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1" strokeDashoffset="1" style={{ visibility: 'hidden' }} />
          <path ref={pathGradRef}   fill="none" stroke="url(#seg-grad)"    strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1" strokeDashoffset="1" style={{ visibility: 'hidden' }} />

          <g ref={dotGRef} opacity="0">
            <circle r="16" fill="rgba(255,201,54,0.08)" />
            <circle r="9"  fill="rgba(255,201,54,0.22)" />
            <circle r="4"  fill="#FFC936" />
          </g>
        </svg>

        {/* CTA section */}
        <div
          ref={ctaRef}
          style={{ position: 'absolute', left: '10%', top: '65%', transform: 'translateY(-50%)', zIndex: 5, maxWidth: 300 }}
        >
          <h2 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '3.8rem', color: '#ffffff', lineHeight: 1, margin: 0, textShadow: '0 0 40px rgba(255,255,255,0.15)' }}>
            WHY WAIT?
          </h2>
          <p style={{ fontFamily: 'Plus Jakarta Sans', color: '#ffffff', fontSize: '22px', marginTop: 5, lineHeight: 1.2, fontWeight: 500 }}>
            Make sure to not miss your registration period!
          </p>
          <div style={{ marginTop: 18 }}>
            <Button href="/events" variant="primary" size="md">SEE EVENTS</Button>
          </div>
        </div>

        {/* event nodes */}
        {events.map((ev, i) => {
          const { slot } = ev;
          const boxShadowBase  = slot.palette.shadow
            ? `0 4px 16px rgba(0,0,0,0.7), 0 0 2px ${slot.palette.shadow}`
            : '0 4px 16px rgba(0,0,0,0.7)';
          const boxShadowHover = slot.palette.shadow
            ? `0 8px 28px rgba(0,0,0,0.85), 0 0 2px ${slot.palette.shadow}`
            : '0 8px 28px rgba(0,0,0,0.85)';

          return (
            <div
              key={ev.id}
              ref={el => (nodeRefs.current[i] = el)}
              style={{
                position: 'absolute',
                left: `${CURVE_POINTS[i + 1].pctX * 100}%`,
                top:  `${CURVE_POINTS[i + 1].pctY * 100}%`,
                // no transform here — GSAP owns centering via xPercent/yPercent
                zIndex: 10,
                opacity: 0,
              }}
            >
              {/* label: date + registration */}
              <div style={{ position: 'absolute', left: slot.labelOffset.x, top: slot.labelOffset.y, whiteSpace: 'nowrap', pointerEvents: 'none' }}>
                <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '36px', lineHeight: 1, color: slot.palette.labelColor, textShadow: `0 0 20px ${slot.palette.labelGlow}` }}>
                  {ev.label}
                </div>
                <div style={{ fontSize: '18px', color: '#ffffff', lineHeight: 1.45, marginTop: 3, letterSpacing: '0.3px', marginLeft: 40 }}>
                  {ev.subLabel.split('\n').map((line, j) => <div key={j}>{line}</div>)}
                </div>
              </div>

              {/* dot + card */}
              <div ref={el => (rotateRefs.current[i] = el)}>
                <div
                  ref={el => (dotRefs.current[i] = el)}
                  className={ev.isActive ? 'et-pulse' : undefined}
                  style={{
                    position: 'relative',
                    width:  slot.dotSize,
                    height: slot.dotSize,
                    borderRadius: '50%',
                    background: slot.palette.dotColor,
                    boxShadow: `0 0 14px ${slot.palette.dotGlow}, 0 0 4px ${slot.palette.dotColor}`,
                    color: slot.palette.dotColor,
                    zIndex: 2,
                    transform: 'translate(-50%, -50%)',
                  }}
                />
                {/* card wrapper: handles tilt, border, hover. EventCard fills it. */}
                <div
                  style={{
                    position: 'absolute',
                    left: slot.cardOffset.x,
                    top:  slot.cardOffset.y,
                    width: 210,
                    height: 300,
                    borderRadius: 10,
                    overflow: 'hidden',
                    border: `2px solid ${slot.palette.border}`,
                    boxShadow: boxShadowBase,
                    transform: `rotate(${slot.tilt}deg)`,
                    transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'rotate(0deg) scale(1.07)';
                    e.currentTarget.style.boxShadow = boxShadowHover;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = `rotate(${slot.tilt}deg)`;
                    e.currentTarget.style.boxShadow = boxShadowBase;
                  }}
                >
                  <EventCard event={ev} className="w-full h-full" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}