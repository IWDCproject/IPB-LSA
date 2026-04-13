"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { gsap } from "gsap";
import Button from "@/components/Button";
import EventCard from "@/components/EventCard";
import UniversityMarquee from "@/components/UniversityMarquee";
import { useBlurImages } from "@/hooks/useBlurImages";
import { getAssetUrl } from "@/lib/directus";

const INTERVAL_MS        = 10000;
const SHRINK_MS          = 600;
const SCALE_START        = 1600;
const SCALE_FLOOR        = 0.875;
const DESKTOP_CARD_MIN_W = 180;
const DESKTOP_SLOTS_MAX  = 8;
const MOBILE_CARD_VW     = 0.26;
const MOBILE_CARD_REF    = 80;

// Shared notch spec — kept in sync with EventTimeline's NOTCH_CONFIG
const NOTCH_W    = 68;
const NOTCH_H    = 13;
const NOTCH_PATH = "M 2 0 L 66 0 L 60 10 Q 58.5 13 56 13 L 12 13 Q 9.5 13 8 10 L 2 0 Z";

function CardNotch({ color, textColor, label }) {
    return (
        <div style={{
            position: "absolute", bottom: -NOTCH_H, left: "25%", zIndex: 20,
            width: NOTCH_W, height: NOTCH_H,
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "notch-pop 0.28s cubic-bezier(0.34,1.56,0.64,1) forwards",
            transformOrigin: "50% 0%",
        }}>
            <svg width={NOTCH_W} height={NOTCH_H} viewBox={`0 0 ${NOTCH_W} ${NOTCH_H}`}
                fill="none" style={{ position: "absolute", inset: 0 }}>
                <path d={NOTCH_PATH} fill={color} />
            </svg>
            <span style={{
                position: "relative",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: "0.42rem", fontWeight: 900,
                letterSpacing: "0.06em", textTransform: "uppercase",
                color: textColor, marginTop: -2,
            }}>
                {label}
            </span>
        </div>
    );
}

const introStyle = (ms) => ({ animation: `hero-intro 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${ms}ms both` });

const EXIT_DELAYS  = [150, 100, 50, 0];
const ENTER_DELAYS = [0, 70, 140, 210];
const INTRO_DELAYS = [160, 240, 320, 400];

// ─── helper: draw bitmap with object-fit: cover behaviour ────────────────────
const drawCover = (ctx, bitmap, w, h) => {
    const bw = bitmap.width;
    const bh = bitmap.height;
    const scale = Math.max(w / bw, h / bh);
    const dw = bw * scale;
    const dh = bh * scale;
    const dx = (w - dw) / 2;
    const dy = (h - dh) / 2;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(bitmap, dx, dy, dw, dh);
};

const drawToCanvas = (canvas, bitmap) => {
    if (!canvas || !bitmap) return;
    const w = canvas.offsetWidth  || window.innerWidth;
    const h = canvas.offsetHeight || window.innerHeight;
    canvas.width  = w;
    canvas.height = h;
    drawCover(canvas.getContext("2d"), bitmap, w, h);
};

export default function HeroSection({ paused = false, events: rawEvents = [] }) {
    const EVENTS = useMemo(() => {
        return (rawEvents || [])
            .filter(ev => ev.is_published)
            .map(ev => ({ ...ev, image_url: getAssetUrl(ev.card_image) }))
            .slice(0, 8);
    }, [rawEvents]);

    const [activeIdx,   setActiveIdx]   = useState(0);
    const [hoveredIdx,  setHoveredIdx]  = useState(null);
    const [animating,   setAnimating]   = useState(false);
    const [mounted,     setMounted]     = useState(false);
    const [displayIdx,  setDisplayIdx]  = useState(0);
    const [transPhase,  setTransPhase]  = useState("idle");
    const [introPlayed, setIntroPlayed] = useState(false);
    const [cw,          setCw]          = useState(1920);

    const barRef          = useRef(null);
    const canvasRefs      = useRef({});
    const sectionRef      = useRef(null);
    const mobileScrollRef = useRef(null);
    const pausedRef       = useRef(paused);
    const tabVisRef       = useRef(true);

    const heroManifest = useMemo(() =>
        EVENTS.map(ev => ({
            url:           ev.image_url,
            type:          "hero",
            width:         1200,
            height:        800,
            naturalWidth:  ev.card_image?.width,
            naturalHeight: ev.card_image?.height,
        })),
    [EVENTS]);

    const { bitmaps, isReady } = useBlurImages(heroManifest);

    useEffect(() => { pausedRef.current = paused; }, [paused]);

    useEffect(() => {
        const el = sectionRef.current;
        if (!el) return;
        const apply = (w) => {
            el.style.setProperty("--s", Math.max(SCALE_FLOOR, Math.min(1, w / SCALE_START)));
            setCw(w);
        };
        const ro = new ResizeObserver(([e]) => apply(e.contentRect.width));
        ro.observe(el);
        apply(el.getBoundingClientRect().width);
        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        const observers = [];

        EVENTS.forEach((ev) => {
            const pair = bitmaps[ev.image_url]?.hero;
            if (!pair?.sharp || !pair?.blurred) return;

            [
                { key: `${ev.id}_sharp`,  bitmap: pair.sharp   },
                { key: `${ev.id}_blur`,   bitmap: pair.blurred },
            ].forEach(({ key, bitmap }) => {
                const canvas = canvasRefs.current[key];
                if (!canvas) return;

                // Initial draw
                drawToCanvas(canvas, bitmap);

                // Redraw whenever the canvas resizes (window resize, layout shift, etc.)
                const ro = new ResizeObserver(() => drawToCanvas(canvas, bitmap));
                ro.observe(canvas);
                observers.push(ro);
            });
        });

        return () => observers.forEach((ro) => ro.disconnect());
    }, [bitmaps, EVENTS]);

    // Mount immediately — blur is progressive enhancement.
    // Bitmaps arrive asynchronously and get drawn to canvas as they come in.
    useEffect(() => { setMounted(true); }, []);

    const isMobile        = cw < 1024;
    const mobileCardPx    = cw * MOBILE_CARD_VW;
    const mobileCardScale = Math.min(1, mobileCardPx / MOBILE_CARD_REF);
    const mobileCardH     = Math.min(180, Math.round(mobileCardPx * 1.5));

    const scale        = Math.max(SCALE_FLOOR, Math.min(1, cw / SCALE_START));
    const marginPx     = Math.min(160, Math.max(40, cw * 0.0833));
    const scaledGap    = 4 * scale;
    const fittingSlots = Math.max(4, Math.floor(((cw - 2 * marginPx) + scaledGap) / (DESKTOP_CARD_MIN_W * scale + scaledGap)));
    const desktopSlots = isMobile ? 0 : Math.min(fittingSlots, DESKTOP_SLOTS_MAX);

    useEffect(() => {
        if (!isMobile || !mobileScrollRef.current) return;
        mobileScrollRef.current.scrollTo({ left: activeIdx * (mobileCardPx + 8), behavior: "smooth" });
    }, [activeIdx, isMobile, mobileCardPx]);

    const displayEvent = EVENTS[displayIdx];

    const infoAnimStyles = useMemo(() => {
        const make = (slot) => {
            if (!mounted) return { opacity: 0 };
            if (transPhase === "exit")  return { animation: `info-exit 0.22s ease ${EXIT_DELAYS[slot]}ms both` };
            if (transPhase === "enter") return { animation: `info-enter 0.35s cubic-bezier(0.22, 1, 0.36, 1) ${ENTER_DELAYS[slot]}ms both` };
            if (!introPlayed) return introStyle(INTRO_DELAYS[slot]);
            return { opacity: 1 };
        };
        return [0, 1, 2, 3].map(make);
    }, [mounted, transPhase, introPlayed]);

    const infoAnimStyle = useCallback((slot) => infoAnimStyles[slot], [infoAnimStyles]);

    useEffect(() => {
        if (!mounted || activeIdx === displayIdx) return;
        setIntroPlayed(true);
        setTransPhase("exit");
        const t1 = setTimeout(() => { setDisplayIdx(activeIdx); setTransPhase("enter"); }, 390);
        const t2 = setTimeout(() => setTransPhase("idle"), 970);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, [activeIdx, mounted]);

    const select = (idx) => {
        if (idx === activeIdx || animating) return;
        setAnimating(true);
        setActiveIdx(idx);
        setTimeout(() => setAnimating(false), 400);
    };

    useEffect(() => {
        if (animating) return;
        let startTime = null;
        let phase = "fill";
        const easeOut = (t) => 1 - Math.pow(1 - t, 3);
        const tick = () => {
            if (pausedRef.current || !tabVisRef.current) { startTime = null; return; }
            const now = performance.now();
            if (!startTime) startTime = now;
            const t = Math.min((now - startTime) / (phase === "fill" ? INTERVAL_MS : SHRINK_MS), 1);
            if (barRef.current) {
                if (phase === "fill") {
                    barRef.current.style.left  = "0%";
                    barRef.current.style.width = `${t * 100}%`;
                } else {
                    const e = easeOut(t);
                    barRef.current.style.left  = `${e * 100}%`;
                    barRef.current.style.width = `${(1 - e) * 100}%`;
                }
            }
            if (t >= 1) {
                if (phase === "fill") { phase = "shrink"; startTime = null; }
                else {
                    gsap.ticker.remove(tick);
                    const next = (activeIdx + 1) % EVENTS.length;
                    setAnimating(true);
                    setActiveIdx(next);
                    setTimeout(() => setAnimating(false), 400);
                }
            }
        };
        gsap.ticker.add(tick);
        return () => gsap.ticker.remove(tick);
    }, [activeIdx, animating, EVENTS.length]);

    useEffect(() => {
        const fn = () => { tabVisRef.current = !document.hidden; };
        document.addEventListener("visibilitychange", fn);
        return () => document.removeEventListener("visibilitychange", fn);
    }, []);

    return (
        <section ref={sectionRef} className="relative w-full h-full flex flex-col overflow-hidden bg-black">

            <div className="absolute inset-0 z-0">
                {EVENTS.map((ev, idx) => (
                    <div key={ev.id} className="absolute inset-0" style={{ opacity: idx === activeIdx ? 1 : 0, transition: paused ? "none" : "opacity 0.8s ease" }}>
                        <img src={ev.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" aria-hidden="true" />
                        <canvas
                            ref={(el) => { if (el) canvasRefs.current[`${ev.id}_sharp`] = el; }}
                            className="absolute inset-0 w-full h-full"
                        />
                        {/* Progressive blur baked in the worker — no CSS filter here */}
                        <canvas
                            ref={(el) => { if (el) canvasRefs.current[`${ev.id}_blur`] = el; }}
                            className="absolute inset-0 w-full h-full"
                        />
                    </div>
                ))}
            </div>

            <div className="absolute inset-0 z-[1]" style={{ background: "linear-gradient(to right, rgba(6,18,92,0.7) 0%, rgba(6,18,92,0.3) 35%, transparent 60%)" }} />
            <div className="absolute inset-0 z-[1]" style={{ background: "linear-gradient(to left, rgba(6,18,92,0.5) 0%, transparent 30%)" }} />
            <div className="absolute inset-0 z-[2]" style={{ background: "linear-gradient(to top, rgba(6,18,92,0.7) 10%, transparent 50%)" }} />

            <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 z-30" style={mounted ? { animation: "hero-bar-intro 0.5s cubic-bezier(0.22, 1, 0.36, 1) 80ms both" } : { opacity: 0 }}>
                <div ref={barRef} className="absolute top-0 h-full" style={{ background: "#FFC936" }} />
            </div>

            <div className="absolute z-10" style={{ top: isMobile ? "48px" : "clamp(48px, 4.17vw, 80px)", left: isMobile ? "24px" : "clamp(40px, 8.33vw, 160px)", right: isMobile ? "24px" : undefined, maxWidth: isMobile ? "480px" : "calc(512px * var(--s))" }}>
                <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: isMobile ? "11px" : "calc(12px * var(--s))", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#FFC936", marginBottom: isMobile ? "10px" : "calc(12px * var(--s))", ...infoAnimStyle(0) }}>
                    {displayEvent?.status === "active" ? ">>> Ongoing" : ">>> Coming Soon"}
                </p>
                <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: isMobile ? "clamp(2rem, 10vw, 3.5rem)" : "calc(80px * var(--s))", lineHeight: 1, textWrap: "balance", color: "#fff", textTransform: "uppercase", marginBottom: isMobile ? "10px" : "calc(12px * var(--s))", filter: "drop-shadow(0 4px 4px rgba(0,0,0,0.25))", ...infoAnimStyle(1) }}>
                    {displayEvent?.name}
                </h1>
                <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: isMobile ? "14px" : "calc(16px * var(--s))", lineHeight: 1.625, fontWeight: 500, color: "#fff", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", textWrap: "balance", marginBottom: isMobile ? "20px" : "calc(24px * var(--s))", ...infoAnimStyle(2) }}>
                    {displayEvent?.description}
                </p>
                <div style={infoAnimStyle(3)}>
                    {displayEvent && (
                        <Button href={`/events/${displayEvent.slug}`} variant="primary" size="md">More Details</Button>
                    )}
                </div>
            </div>

            {isMobile ? (
                <div className="absolute z-10" style={{ bottom: "88px", left: 0, right: 0 }}>
                    <p style={{ paddingLeft: "24px", fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "11px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#fff", marginBottom: "12px", ...(mounted ? introStyle(480) : { opacity: 0 }) }}>
                        {">>>"} Featured Events
                    </p>
                    <div ref={mobileScrollRef} className="match-scroll" style={{
                        "--s": mobileCardScale,
                        display: "flex", gap: "8px",
                        overflowX: "auto", scrollSnapType: "x mandatory",
                        scrollPaddingLeft: "24px", WebkitOverflowScrolling: "touch",
                        paddingLeft: "24px",
                        ...(mounted ? { animation: "hero-cards-intro 0.7s cubic-bezier(0.22, 1, 0.36, 1) 560ms both" } : { opacity: 0 }),
                    }}>
                        {EVENTS.map((ev, idx) => {
                            const isActive  = idx === activeIdx;
                            const isHovered = !isActive && hoveredIdx === idx;
                            const ringColor = isActive ? "#FFC936" : isHovered ? "rgba(255,255,255,0.5)" : "transparent";
                            return (
                                <div key={ev.id}
                                    onClick={(e) => { e.preventDefault(); select(idx); }}
                                    onMouseEnter={() => !isActive && setHoveredIdx(idx)}
                                    onMouseLeave={() => setHoveredIdx(null)}
                                    style={{
                                        position: "relative", flexShrink: 0,
                                        flex: `0 0 ${mobileCardPx}px`, width: `${mobileCardPx}px`,
                                        height: mobileCardH + NOTCH_H,
                                        scrollSnapAlign: "start", cursor: "pointer",
                                    }}
                                >
                                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: mobileCardH, borderRadius: "8px", overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.35)" }}>
                                        <EventCard 
                                            event={ev} 
                                            size="sm" 
                                        />
                                    </div>
                                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: mobileCardH, borderRadius: "8px", border: `2px solid ${ringColor}`, pointerEvents: "none", zIndex: 10, transition: "border-color 0.2s ease" }} />
                                    {(isActive || isHovered) && (
                                        <CardNotch
                                            color={isActive ? "#FFC936" : "rgba(255,255,255,0.92)"}
                                            textColor={isActive ? "rgba(0,0,0,0.75)" : "rgba(0,0,0,0.6)"}
                                            label={isActive ? "this" : "see more"}
                                        />
                                    )}
                                </div>
                            );
                        })}
                        <div style={{ flexShrink: 0, width: 8 }} />
                    </div>
                </div>
            ) : (
                <div className="absolute z-10" style={{ bottom: "clamp(48px, 4.17vw, 80px)", left: "clamp(40px, 8.33vw, 160px)", right: "clamp(40px, 8.33vw, 160px)", paddingBottom: "clamp(32px, 3.125vw, 60px)" }}>
                    <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "calc(14px * var(--s))", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#fff", marginBottom: "calc(20px * var(--s))", ...(mounted ? introStyle(480) : { opacity: 0 }) }}>
                        {">>>"} Featured Events
                    </p>
                    <div className="flex" style={{ height: "calc(240px * var(--s))", gap: "calc(4px * var(--s))", ...(mounted ? { animation: "hero-cards-intro 0.7s cubic-bezier(0.22, 1, 0.36, 1) 560ms both" } : { opacity: 0 }) }}>
                        {Array.from({ length: desktopSlots }, (_, idx) => {
                            const ev       = EVENTS[idx] ?? null;
                            const isActive = ev && idx === activeIdx;
                            const isHovered = ev && !isActive && hoveredIdx === idx;
                            return (
                                <div key={ev ? ev.id : `placeholder-${idx}`}
                                    onClick={ev ? (e) => { e.preventDefault(); select(idx); } : undefined}
                                    onMouseEnter={() => ev && !isActive && setHoveredIdx(idx)}
                                    onMouseLeave={() => setHoveredIdx(null)}
                                    className={`flex-1 relative ${ev ? "cursor-pointer" : "cursor-default"}`}
                                    style={{ height: "calc(240px * var(--s))", borderRadius: "8px", overflow: "visible", outline: isActive ? `2px solid #FFC936` : isHovered ? "2px solid rgba(255,255,255,0.5)" : "2px solid transparent", transition: "outline 0.2s ease" }}
                                >
                                    <div style={{ position: "absolute", inset: 0, borderRadius: "8px", overflow: "hidden", "--s": "1" }}>
                                        {ev ? (
                                            <EventCard 
                                                event={ev} 
                                                size="sm" 
                                            />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center gap-2" style={{ background: "#111827" }}>
                                                <div className="absolute inset-0" style={{ backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 1px, transparent 1px, transparent 14px)" }} />
                                                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round">
                                                    <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                                                </svg>
                                                <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.2em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase" }}>Coming Soon</span>
                                            </div>
                                        )}
                                    </div>
                                    {isActive  && <CardNotch color="#FFC936"              textColor="rgba(0,0,0,0.75)" label="this"     />}
                                    {isHovered && <CardNotch color="rgba(255,255,255,0.92)" textColor="rgba(0,0,0,0.6)"  label="see more" />}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="absolute z-10 left-0 right-0" style={{ bottom: isMobile ? "6px" : "calc(24px * var(--s))", ...(mounted ? { animation: "hero-marquee-intro 0.6s cubic-bezier(0.22, 1, 0.36, 1) 680ms both" } : { opacity: 0 }) }}>
                <UniversityMarquee />
            </div>
        </section>
    );
}