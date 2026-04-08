'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Button from '@/components/Button';
import EventCard from '@/components/EventCard';
import { useBlurImages } from "@/hooks/useBlurImages";

gsap.registerPlugin(ScrollTrigger);

const LINE_COLOR_ACTIVE = '#FFC936';
const LINE_COLOR_BASE   = 'rgba(255,255,255,0.25)';
const HEADER_HEIGHT     = 65;

const NOTCH_H    = 13;
const NOTCH_PATH = "M 2 0 L 66 0 L 60 10 Q 58.5 13 56 13 L 12 13 Q 9.5 13 8 10 L 2 0 Z";

function CardNotch({ isActive, isLeft }) {
  const color     = isActive ? 'rgb(234,179,8)'   : 'rgba(255,255,255,0.92)';
  const textColor = isActive ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.6)';
  const label     = isActive ? 'ongoing'           : 'see more';

  return (
    <div style={{
      position:       'absolute',
      bottom:         -(NOTCH_H - 1),
      ...(isLeft ? { left: 8 } : { right: 8 }),
      transform:      'scaleY(0)',
      transformOrigin:'50% 0%',
      animation:      'notch-pop 0.28s cubic-bezier(0.34,1.56,0.64,1) forwards',
      width:          68,
      height:         NOTCH_H,
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      pointerEvents:  'none',
    }}>
      <svg width="68" height="13" viewBox="0 0 68 13" fill="none"
        style={{ position: 'absolute', inset: 0 }}>
        <path d={NOTCH_PATH} fill={color} />
      </svg>
      <span style={{
        position:      'relative',
        fontFamily:    "'Plus Jakarta Sans', sans-serif",
        fontSize:      '0.42rem',
        fontWeight:    900,
        letterSpacing: '0.13em',
        color:         textColor,
        textTransform: 'uppercase',
        marginTop:     -2,
      }}>
        {label}
      </span>
    </div>
  );
}

export default function VerticalTimeline({ events }) {
  const wrapRef       = useRef(null);
  const fillRef       = useRef(null);
  const nodeRefs      = useRef([]);
  const cardRefs      = useRef([]);
  const floatWrapRefs = useRef([]);
  const xFloatRefs    = useRef([]);
  const labelRefs     = useRef([]);
  const mascotRef     = useRef(null);

  const [hoveredIdx, setHoveredIdx] = useState(null);

  const activeIdx = events.findLastIndex(e => e.isActive);

  const floatTweensRef = useRef([]);
  const tabVisRef      = useRef(true);

  // Register eventcard blur for all events in this timeline.
  // url must match whatever key EventCard uses to look up bitmaps[url]?.eventcard
  const eventcardManifest = useMemo(() =>
    events
      .filter(ev => ev.image_url)
      .map(ev => ({
        url:           ev.image_url,
        type:          'eventcard',
        width:         400,
        height:        280,
        naturalWidth:  ev.card_image?.width,
        naturalHeight: ev.card_image?.height,
      })),
  [events]);

  useBlurImages(eventcardManifest);

  useEffect(() => {
    floatTweensRef.current = [];

    const ctx = gsap.context(() => {

      gsap.fromTo(fillRef.current,
        { scaleY: 0 },
        {
          scaleY: 1,
          transformOrigin: 'top center',
          duration: 2.0,
          ease: 'power2.inOut',
          scrollTrigger: { trigger: wrapRef.current, start: 'top 85%' },
        }
      );

      nodeRefs.current.forEach((node, i) => {
        if (!node) return;
        const card  = cardRefs.current[i];
        const label = labelRefs.current[i];
        const delay  = 0.2 + i * 0.25;
        const isLeft = i % 2 === 0;

        gsap.fromTo(node,
          { scale: 0, opacity: 0 },
          {
            scale: 1, opacity: 1,
            duration: 0.45,
            ease: 'back.out(1.8)',
            delay,
            scrollTrigger: { trigger: wrapRef.current, start: 'top 85%' },
          }
        );

        if (card) {
          gsap.fromTo(card,
            { opacity: 0, x: isLeft ? -40 : 40 },
            {
              opacity: 1, x: 0,
              duration: 0.6,
              ease: 'power3.out',
              delay: delay + 0.1,
              scrollTrigger: { trigger: wrapRef.current, start: 'top 85%' },
            }
          );

          const floatWrap = floatWrapRefs.current[i];
          if (floatWrap) {
            floatTweensRef.current.push(
              gsap.to(floatWrap, {
                y: isLeft ? 3 : -3,
                duration: 3 + i * 0.4,
                repeat: -1, yoyo: true, ease: 'sine.inOut',
                delay: delay + 0.5,
              })
            );
            floatTweensRef.current.push(
              gsap.to(floatWrap, {
                rotate: isLeft ? -0.15 : 0.15,
                duration: (3 + i * 0.4) * 1.7,
                repeat: -1, yoyo: true, ease: 'sine.inOut',
                delay: delay + 1.0,
              })
            );
          }

          floatTweensRef.current.push(
            gsap.to(card, {
              duration: (3 + i * 0.4) * 1.3,
              repeat: -1, yoyo: true, ease: 'sine.inOut',
              delay: delay + 0.8,
            })
          );

          const xEl = xFloatRefs.current[i];
          if (xEl) floatTweensRef.current.push(
            gsap.to(xEl, {
              x: isLeft ? -2 : 2,
              duration: (3 + i * 0.4) * 1.3,
              repeat: -1, yoyo: true, ease: 'sine.inOut',
              delay: delay + 0.8,
            })
          );
        }

        if (label) {
          gsap.fromTo(label,
            { opacity: 0, y: -8 },
            {
              opacity: 1, y: 0,
              duration: 0.45,
              ease: 'power2.out',
              delay: delay + 0.15,
              scrollTrigger: { trigger: wrapRef.current, start: 'top 85%' },
            }
          );
        }
      });

      if (mascotRef.current) {
        gsap.fromTo(mascotRef.current,
          { opacity: 0, y: 20 },
          {
            opacity: 1, y: 0,
            duration: 0.7,
            ease: 'back.out(1.2)',
            delay: 0.2 + events.length * 0.25 + 0.4,
            scrollTrigger: { trigger: wrapRef.current, start: 'top 85%' },
          }
        );
      }

    }, wrapRef);

    return () => ctx.revert();
  }, [events.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const pause  = () => floatTweensRef.current.forEach(t => t.pause());
    const resume = () => floatTweensRef.current.forEach(t => t.resume());
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !document.hidden) resume(); else pause(); },
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => {
      tabVisRef.current = !document.hidden;
      const inView = wrapRef.current
        ? wrapRef.current.getBoundingClientRect().bottom > 0 &&
          wrapRef.current.getBoundingClientRect().top < window.innerHeight
        : false;
      if (!document.hidden && inView) floatTweensRef.current.forEach(t => t.resume());
      else floatTweensRef.current.forEach(t => t.pause());
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  return (
    <div
      ref={wrapRef}
      style={{
        height:        `calc(100vh - ${HEADER_HEIGHT}px)`,
        width:         '100%',
        display:       'flex',
        flexDirection: 'column',
        fontFamily:    "'Outfit', sans-serif",
        background:    'linear-gradient(to top, #06125C 5%, #0D26C2 100%)',
        overflow:      'hidden',
        position:      'relative',
      }}
    >
      {/* Batik pattern */}
      <div
        aria-hidden="true"
        suppressHydrationWarning
        style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(/Batik_Pattern_dark.svg)',
          backgroundSize: 'cover', backgroundPosition: 'center',
          pointerEvents: 'none', opacity: 0.4, zIndex: 0,
        }}
      />

      {/* Header */}
      <div style={{
        padding:    '2.5vh 28px 0',
        position:   'relative',
        zIndex:     2,
        textAlign:  'center',
        flexShrink: 0,
      }}>
        <h2 style={{
          fontFamily: "'Bebas Neue', cursive",
          fontSize:   'clamp(1.8rem, 6vw, 2.8rem)',
          color:      '#fff',
          lineHeight: 1,
          margin:     0,
        }}>
          WHY WAIT?
        </h2>
        <p style={{
          fontFamily: 'Plus Jakarta Sans',
          color:      '#fff',
          fontSize:   'clamp(11px, 3vw, 14px)',
          marginTop:  4,
          lineHeight: 1.2,
          fontWeight: 500,
        }}>
          Don&apos;t miss your registration period!
        </p>
        <div style={{ marginTop: '1vh' }}>
          <Button href="/events" variant="primary" size="sm">SEE EVENTS</Button>
        </div>
      </div>

      {/* Timeline */}
      <div style={{
        position:  'relative',
        flex:      1,
        minHeight: 0,
        zIndex:    2,
      }}>
        {/* Track */}
        <div style={{
          position:     'absolute',
          left:         '50%',
          transform:    'translateX(-50%)',
          top: 0, bottom: 0,
          width:        2,
          background:   LINE_COLOR_BASE,
          borderRadius: 999,
        }} />

        {/* Fill */}
        <div
          ref={fillRef}
          style={{
            position:     'absolute',
            left:         '50%',
            transform:    'translateX(-50%)',
            top: 0, bottom: 0,
            width:        2,
            borderRadius: 999,
            background: `linear-gradient(to bottom,
              ${LINE_COLOR_ACTIVE} 0%,
              ${LINE_COLOR_ACTIVE} ${((activeIdx + 0.5) / events.length) * 100}%,
              rgba(255,255,255,0.6) ${((activeIdx + 1.2) / events.length) * 100}%,
              rgba(255,255,255,0.08) 100%
            )`,
          }}
        />

        <div style={{
          display:          'grid',
          gridTemplateRows: `repeat(${events.length}, 1fr)`,
          height:           '100%',
          marginTop:        '-3vh',
        }}>
          {events.map((ev, i) => {
            const isLeft    = i % 2 === 0;
            const isActive  = ev.isActive;
            const isPast    = i < activeIdx;
            const isHovered = hoveredIdx === i;

            const dotColor = isActive || isPast ? LINE_COLOR_ACTIVE : '#fff';
            const dotGlow  = isActive || isPast
              ? 'rgba(255,201,54,0.55)'
              : 'rgba(255,255,255,0.3)';
            const dotSize  = isActive ? 16 : 11;

            const cardBorder = isActive
              ? LINE_COLOR_ACTIVE
              : isHovered
                ? 'rgba(255,255,255,0.6)'
                : 'rgba(255,255,255,0.35)';
            const cardShadow = isActive
              ? '0 4px 20px rgba(255,201,54,0.35), 0 6px 28px rgba(0,0,0,0.5)'
              : '0 3px 14px rgba(0,0,0,0.55)';

            return (
              <div
                key={ev.id}
                style={{
                  display:       'flex',
                  flexDirection: isLeft ? 'row' : 'row-reverse',
                  alignItems:    'center',
                  overflow:      'visible',
                }}
              >
                {/* Card side */}
                <div style={{
                  flex:           1,
                  display:        'flex',
                  justifyContent: isLeft ? 'flex-end' : 'flex-start',
                  paddingLeft:    isLeft ? 0  : 12,
                  paddingRight:   isLeft ? 12 : 0,
                  overflow:       'visible',
                }}>
                  <div ref={el => (xFloatRefs.current[i] = el)} style={{ willChange: 'transform' }}>
                    <div
                      ref={el => {
                        cardRefs.current[i] = el;
                        floatWrapRefs.current[i] = el;
                      }}
                      onMouseEnter={() => setHoveredIdx(i)}
                      onMouseLeave={() => setHoveredIdx(null)}
                      style={{
                        position:   'relative',
                        opacity:    0,
                        marginTop:  50,
                        width:      'clamp(90px, 32vw, 160px)',
                        transform:  `rotate(${isLeft ? -3 : 3}deg)`,
                        willChange: 'transform',
                        cursor:     'pointer',
                        flexShrink: 0,
                      }}
                    >
                      {/* Card */}
                      <div style={{
                        width:        '100%',
                        height:       'clamp(150px, 22vh, 260px)',
                        borderRadius: 10,
                        overflow:     'hidden',
                        border:       `2px solid ${cardBorder}`,
                        boxShadow:    cardShadow,
                        transition:   'border-color 0.2s ease',
                      }}>
                        <EventCard event={ev} className="w-full h-full" size="sm" />
                      </div>

                      {(isHovered || isActive) && (
                        <CardNotch isActive={isActive} isLeft={isLeft} />
                      )}
                    </div>
                  </div>
                </div>

                {/* Centre dot */}
                <div style={{ position: 'relative', zIndex: 3, flexShrink: 0 }}>
                  <div
                    ref={el => (nodeRefs.current[i] = el)}
                    className={isActive ? 'vt-pulse' : undefined}
                    style={{
                      width:        dotSize,
                      height:       dotSize,
                      borderRadius: '50%',
                      background:   dotColor,
                      boxShadow:    isActive ? 'none' : `0 0 12px ${dotGlow}, 0 0 4px ${dotColor}`,
                      opacity:      0,
                      willChange:   'transform',
                      position:     'relative',
                    }}
                  />
                </div>

                {/* Label side */}
                <div style={{
                  flex:          1,
                  display:       'flex',
                  flexDirection: 'column',
                  alignItems:    isLeft ? 'flex-start' : 'flex-end',
                  paddingLeft:   isLeft ? 12 : 0,
                  paddingRight:  isLeft ? 0  : 12,
                }}>
                  <div
                    ref={el => (labelRefs.current[i] = el)}
                    style={{ opacity: 0, textAlign: isLeft ? 'left' : 'right' }}
                  >
                    <span style={{
                      fontFamily: "'Bebas Neue', cursive",
                      fontSize:   'clamp(14px, 4vw, 20px)',
                      color:      isActive || isPast ? LINE_COLOR_ACTIVE : '#fff',
                      textShadow: `0 0 14px ${dotGlow}`,
                      lineHeight: 1,
                      display:    'block',
                    }}>
                      {ev.label}
                    </span>
                    <span style={{
                      fontSize:   'clamp(9px, 2.2vw, 11px)',
                      color:      'rgba(255,255,255,0.65)',
                      lineHeight: 1.35,
                      display:    'block',
                      marginTop:  2,
                    }}>
                      {ev.subLabel.split('\n').map((ln, j) => (
                        <span key={j} style={{ display: 'block' }}>{ln}</span>
                      ))}
                    </span>
                    <span style={{
                      fontSize:  'clamp(8px, 2vw, 10px)',
                      color:     'rgba(255,255,255,0.38)',
                      display:   'block',
                      marginTop: 3,
                      fontStyle: 'italic',
                    }}>
                      {ev.user_created?.organisation_name}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .vt-pulse { animation: vt-pulse 2s ease-out infinite; }
        @keyframes vt-pulse {
          0%   { box-shadow: 0 0 14px 4px rgba(255,201,54,0.6), 0 0 0 0    rgba(255,201,54,0.7); }
          70%  { box-shadow: 0 0 14px 4px rgba(255,201,54,0.6), 0 0 0 10px rgba(255,201,54,0);   }
          100% { box-shadow: 0 0 14px 4px rgba(255,201,54,0.6), 0 0 0 0    rgba(255,201,54,0);   }
        }
        @keyframes notch-pop {
          0%   { transform: scaleY(0);    opacity: 0; }
          60%  { transform: scaleY(1.15); opacity: 1; }
          100% { transform: scaleY(1);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}