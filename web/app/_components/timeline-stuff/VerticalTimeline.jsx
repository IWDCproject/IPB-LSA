'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Button from '@/components/Button';
import EventCard from '@/components/EventCard';

gsap.registerPlugin(ScrollTrigger);

const LINE_COLOR_ACTIVE = '#FFC936';
const LINE_COLOR_BASE   = 'rgba(255,255,255,0.25)';
const HEADER_HEIGHT     = 65; // must match CurtainWrapper

// sectionH = 100vh - 65px
// Header block ≈ 18vh, leaving ≈ 82vh for 4 rows + mascot row
// Each of 4 event rows = ~17vh, mascot row = ~10vh → 78vh total ✓

export default function VerticalTimeline({ events }) {
  const wrapRef   = useRef(null);
  const fillRef   = useRef(null);
  const nodeRefs  = useRef([]);
  const cardRefs  = useRef([]);
  const xFloatRefs = useRef([]);
  const labelRefs = useRef([]);
  const mascotRef = useRef(null);

  const activeIdx = events.findLastIndex(e => e.isActive);

  useEffect(() => {
    const ctx = gsap.context(() => {

      // Line fill
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

      // Per-node entrance + float loops
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
            { opacity: 0, x: isLeft ? -40 : 40, rotate: isLeft ? -6 : 6 },
            {
              opacity: 1, x: 0, rotate: isLeft ? -3 : 3,
              duration: 0.6,
              ease: 'power3.out',
              delay: delay + 0.1,
              scrollTrigger: { trigger: wrapRef.current, start: 'top 85%' },
            }
          );

          gsap.to(card, {
            y: isLeft ? 3 : -3,
            duration: 3 + i * 0.4,
            repeat: -1, yoyo: true, ease: 'sine.inOut',
            delay: delay + 0.5,
          });
          gsap.to(card, {
            // x: isLeft ? -0.5 : 0.5,
            duration: (3 + i * 0.4) * 1.3,
            repeat: -1, yoyo: true, ease: 'sine.inOut',
            delay: delay + 0.8,
          });
          gsap.to(card, {
            rotate: isLeft ? -0.3 : 0.3,
            duration: (3 + i * 0.4) * 1.7,
            repeat: -1, yoyo: true, ease: 'sine.inOut',
            delay: delay + 1.0,
          });
          const xEl = xFloatRefs.current[i];
          if (xEl) gsap.to(xEl, {
            x: isLeft ? -2 : 2,
            duration: (3 + i * 0.4) * 1.3,
            repeat: -1, yoyo: true, ease: 'sine.inOut',
            delay: delay + 0.8,
          });
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

  return (
    <div
      ref={wrapRef}
      style={{
        // Exactly fills sectionH — no overflow, no scroll
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

      {/* ── Header ~18vh ─────────────────────────────────────────────────── */}
      <div style={{
        padding:        '2.5vh 28px 0',
        position:       'relative',
        zIndex:         2,
        textAlign:      'center',
        flexShrink:     0,
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
          Don't miss your registration period!
        </p>
        <div style={{ marginTop: '1vh' }}>
          <Button href="/events" variant="primary" size="sm">SEE EVENTS</Button>
        </div>
      </div>

      {/* ── Timeline: centre line + 4 alternating rows ───────────────────── */}
      <div style={{
        position:   'relative',
        flex:       1,
        minHeight:  0,
        zIndex:     2,
        // Centre line
      }}>
        {/* Track */}
        <div style={{
          position:  'absolute',
          left:      '50%',
          transform: 'translateX(-50%)',
          top:       0, bottom: 0,
          width:     2,
          background: LINE_COLOR_BASE,
          borderRadius: 999,
        }} />

        {/* Fill */}
        <div
          ref={fillRef}
          style={{
            position:  'absolute',
            left:      '50%',
            transform: 'translateX(-50%)',
            top:       0, bottom: 0,
            width:     2,
            borderRadius: 999,
            background: `linear-gradient(to bottom,
              ${LINE_COLOR_ACTIVE} 0%,
              ${LINE_COLOR_ACTIVE} ${((activeIdx + 0.5) / events.length) * 100}%,
              rgba(255,255,255,0.6) ${((activeIdx + 1.2) / events.length) * 100}%,
              rgba(255,255,255,0.08) 100%
            )`,
          }}
        />

        {/* Rows — each takes 1/4 of the flex area using CSS grid rows */}
        <div style={{
          display:             'grid',
          gridTemplateRows:    `repeat(${events.length}, 1fr)`,
          height:              '100%',
          // paddingTop:          '1vh',
          // paddingBottom:       '1vh',
          marginTop:           '-3vh',
        }}>
          {events.map((ev, i) => {
            const isLeft   = i % 2 === 0;
            const isActive = ev.isActive;
            const isPast   = i < activeIdx;
            const dotColor = isActive || isPast ? LINE_COLOR_ACTIVE : '#fff';
            const dotGlow  = isActive || isPast
              ? 'rgba(255,201,54,0.55)'
              : 'rgba(255,255,255,0.3)';
            const dotSize  = isActive ? 16 : 11;

            const label = ev.status === 'active'
              ? 'ONGOING'
              : !ev.start_date ? 'TBA'
              : new Date(ev.start_date)
                  .toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
                  .toUpperCase();

            const cardBorder = isActive || isPast ? LINE_COLOR_ACTIVE : 'rgba(255,255,255,0.35)';
            const cardShadow = isActive
              ? `0 4px 20px rgba(255,201,54,0.35), 0 6px 28px rgba(0,0,0,0.5)`
              : `0 3px 14px rgba(0,0,0,0.55)`;

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
                  paddingLeft:    isLeft ? 0   : 12,
                  paddingRight:   isLeft ? 12  : 0,
                  overflow:       'visible',
                }}>
                  <div ref={el => (xFloatRefs.current[i] = el)} style={{ willChange: 'transform' }}>
                    <div
                      ref={el => (cardRefs.current[i] = el)}
                      style={{
                        opacity:      0,
                        // Card sized relative to viewport height so 4 fit
                        width:  'clamp(90px, 32vw, 160px)',
                        height: 'clamp(150px, 22vh, 260px)',
                        borderRadius: 10,
                        overflow:     'hidden',
                        border:       `2px solid ${cardBorder}`,
                        boxShadow:    cardShadow,
                        cursor:       'pointer',
                        position: 'relative',
                        top: 50,
                        transform: `rotate(${isLeft ? -3 : 3}deg)`,
                        // transition:   'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease',
                        willChange:   'transform',
                        flexShrink:   0,
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'rotate(0deg) scale(1.06)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = `rotate(${isLeft ? -3 : 3}deg)`;
                      }}
                    >
                      <EventCard event={ev} className="w-full h-full" size="lg" />
                    </div>
                  </div>
                </div>

                {/* Centre dot */}
                <div style={{ position: 'relative', zIndex: 3, flexShrink: 0 }}>
                  <div
                    ref={el => (nodeRefs.current[i] = el)}
                    className={isActive ? 'et-pulse' : undefined}
                    style={{
                      width:        dotSize,
                      height:       dotSize,
                      borderRadius: '50%',
                      background:   dotColor,
                      boxShadow:    `0 0 12px ${dotGlow}, 0 0 4px ${dotColor}`,
                      opacity:      0,
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
                      {label}
                    </span>
                    <span style={{
                      fontSize:  'clamp(9px, 2.2vw, 11px)',
                      color:     'rgba(255,255,255,0.65)',
                      lineHeight: 1.35,
                      display:   'block',
                      marginTop: 2,
                    }}>
                      {ev.subLabel.split('\n').map((ln, j) => (
                        <span key={j} style={{ display: 'block' }}>{ln}</span>
                      ))}
                    </span>
                    <span style={{
                      fontSize:   'clamp(8px, 2vw, 10px)',
                      color:      'rgba(255,255,255,0.38)',
                      display:    'block',
                      marginTop:  3,
                      fontStyle:  'italic',
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

      {/* ── Mascot ~10vh ─────────────────────────────────────────────────── */}
      {/* <div style={{
        flexShrink:  0,
        textAlign:   'center',
        height:      '10vh',
        display:     'flex',
        alignItems:  'flex-end',
        justifyContent: 'center',
        position:    'relative',
        zIndex:      2,
        overflow:    'visible',
      }}>
        <img
          ref={mascotRef}
          src="/maskot/maskot1.png"
          alt=""
          aria-hidden="true"
          suppressHydrationWarning
          style={{
            height:   '18vh', // taller than its row so it peeks up
            width:    'auto',
            opacity:  0,
            filter:   'drop-shadow(0 6px 18px rgba(0,0,0,0.5))',
            position: 'relative',
            bottom:   0,
          }}
        />
      </div> */}

    </div>
  );
}