"use client";

import { useState, useEffect, useRef } from "react";
import Button from "@/components/Button";
import EventCard from "@/components/EventCard";
import UniversityMarquee from "@/components/UniversityMarquee";

const EVENTS = [
    {
        id: 1,
        slug: "ipb-futsal-competition-2026",
        name: "IPB Futsal Competition",
        description:
            "Deskripsi singkat tentang acaranya tuh kayak gimana gitu. Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
        status: "upcoming",
        card_image_url:
            "https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?w=1200",
        user_created: { organisation_name: "UKM Futsal IPB" },
    },
    {
        id: 2,
        slug: "forki-x-ipb-cup-2026",
        name: "Forki x IPB Cup 2026",
        description:
            "Kejuaraan karate terbuka antar universitas se-Indonesia. Diselenggarakan bersama FORKI dalam rangka memperingati hari olahraga nasional.",
        status: "active",
        card_image_url:
            "https://images.unsplash.com/photo-1555597673-b21d5c935865?w=1200",
        user_created: { organisation_name: "UKM Karate IPB" },
    },
    {
        id: 3,
        slug: "open-charity-golf-tournament",
        name: "Open Charity Golf Tournament",
        description:
            "Turnabmen golf amal terbuka untuk sivitas akademika IPB. Hasil disumbangkan untuk easiswa mahasiswa.",
        status: "upcoming",
        card_image_url:
            "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=1200",
        user_created: { organisation_name: "IPB Golf Community" },
    },
    {
        id: 4,
        slug: "it-today-hacktoday",
        name: "IT-Today Hacktoday",
        description:
            "Hackathon 48 jam bertemakan inovasi teknologi untuk pertanian dan lingkungan. Terbuka untuk mahasiswa seluruh Indonesia.",
        status: "active",
        card_image_url:
            "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200",
        user_created: { organisation_name: "Himalkom" },
    },
    {
        id: 5,
        slug: "gemastik-xvi-2026",
        name: "Gemastik XVI 2026",
        description:
            "Gelaran Mahasiswa Teknologi dan Informasi tingkat nasional. IPB University menjadi tuan rumah.",
        status: "upcoming",
        card_image_url:
            "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1200",
        user_created: { organisation_name: "BEM KM IPB" },
    },
    {
        id: 6,
        slug: "ipb-badminton-open",
        name: "IPB Badminton Open",
        description: "Turnamen bulu tangkis antar fakultas dan UKM se-IPB University.",
        status: "upcoming",
        card_image_url:
            "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=1200",
        user_created: { organisation_name: "UKM Badminton IPB" },
    },
    {
        id: 7,
        slug: "ipb-swimming-championship",
        name: "IPB Swimming Championship",
        description:
            "Kejuaraan renang tahunan antar fakultas se-IPB University. Kategori gaya bebas, gaya punggung, dan gaya kupu-kupu.",
        status: "upcoming",
        card_image_url:
            "https://images.unsplash.com/photo-1560090995-01632a28895b?w=1200",
        user_created: { organisation_name: "UKM Renang IPB" },
    },
    {
        id: 8,
        slug: "ipb-esports-tournament",
        name: "IPB Esports Tournament",
        description:
            "Turnamen esports terbesar di IPB University. Kategori Mobile Legends, VALORANT, dan FIFA.",
        status: "active",
        card_image_url:
            "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200",
        user_created: { organisation_name: "UKM Esports IPB" },
    },
];

const INTERVAL_MS = 10000;
const SHRINK_MS   = 600;

const OVERLAY_FADE_MS = 600;

const NOTCH_PATH = "M 2 0 L 66 0 L 60 10 Q 58.5 13 56 13 L 12 13 Q 9.5 13 8 10 L 2 0 Z";

function CardNotch({ color, textColor, label }) {
    return (
        <div
            style={{
                position: "absolute",
                bottom: -13,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 20,
                width: 68,
                height: 13,
                animation: "notch-pop 0.2s ease forwards",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <svg
                width="68"
                height="13"
                viewBox="0 0 68 13"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ position: "absolute", inset: 0 }}
            >
                <path d={NOTCH_PATH} fill={color} />
            </svg>
            <span
                style={{
                    position: "relative",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: "0.42rem",
                    fontWeight: 900,
                    letterSpacing: "0.13em",
                    color: textColor,
                    textTransform: "uppercase",
                    marginTop: -2,
                }}
            >
                {label}
            </span>
        </div>
    );
}

function introStyle(delayMs) {
    return { animation: `hero-intro 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${delayMs}ms both` };
}

const EXIT_DELAYS  = [150, 100, 50, 0];
const ENTER_DELAYS = [0, 70, 140, 210];
const INTRO_DELAYS = [160, 240, 320, 400];

// paused dikasih dari CurtainWrapper lewat prop, bukan IO
export default function HeroSection({ paused = false }) {
    const [activeIdx, setActiveIdx]     = useState(0);
    const [hoveredIdx, setHoveredIdx]   = useState(null);
    const [animating, setAnimating]     = useState(false);
    const [mounted, setMounted]         = useState(false);
    const [displayIdx, setDisplayIdx]   = useState(0);
    const [transPhase, setTransPhase]   = useState("idle");
    const [introPlayed, setIntroPlayed] = useState(false);

    const barRef     = useRef(null);
    const canvasRefs = useRef({});
    const [readyIds, setReadyIds] = useState(new Set());
    const sectionRef = useRef(null);
    const [cw, setCw] = useState(1440);

    useEffect(() => {
        const el = sectionRef.current;
        if (!el) return;
        const ro = new ResizeObserver(([e]) => setCw(e.contentRect.width));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const isMobile = cw < 768;
    const scale    = isMobile ? 1 : Math.min(1, cw / 1440);
    const margin   = Math.round(160 * scale);
    const cardH    = Math.round(240 * scale);

    useEffect(() => {
        const worker = new Worker("/blurWorker.js");

        worker.onmessage = ({ data: { id, sharp, blurred, error } }) => {
            if (error) { console.warn("blur worker error:", error); return; }

            const sharpCanvas = canvasRefs.current[`${id}_sharp`];
            if (sharpCanvas) {
                sharpCanvas.width  = sharp.width;
                sharpCanvas.height = sharp.height;
                sharpCanvas.getContext("bitmaprenderer").transferFromImageBitmap(sharp);
            }

            const blurCanvas = canvasRefs.current[`${id}_blur`];
            if (blurCanvas) {
                blurCanvas.width  = blurred.width;
                blurCanvas.height = blurred.height;
                blurCanvas.getContext("bitmaprenderer").transferFromImageBitmap(blurred);
            }

            setReadyIds((prev) => new Set([...prev, id]));
        };

        worker.postMessage({
            images: EVENTS.map((ev) => ({ id: ev.id, url: ev.card_image_url })),
        });

        return () => worker.terminate();
    }, []);

    useEffect(() => {
        if (readyIds.size !== EVENTS.length) return;

        const t = setTimeout(() => {
            window.__lenis?.start();
            setMounted(true);
        }, OVERLAY_FADE_MS);

        return () => clearTimeout(t);
    }, [readyIds]);

    const displayEvent = EVENTS[displayIdx];

    const infoAnimStyle = (slot) => {
        if (!mounted) return { opacity: 0 };
        if (transPhase === "exit")
            return { animation: `info-exit 0.22s ease ${EXIT_DELAYS[slot]}ms both` };
        if (transPhase === "enter")
            return { animation: `info-enter 0.35s cubic-bezier(0.22, 1, 0.36, 1) ${ENTER_DELAYS[slot]}ms both` };
        if (!introPlayed) return introStyle(INTRO_DELAYS[slot]);
        return { opacity: 1 };
    };

    useEffect(() => {
        if (!mounted || activeIdx === displayIdx) return;
        setIntroPlayed(true);
        setTransPhase("exit");
        const swapAt = 150 + 220 + 20;
        const idleAt = swapAt + 210 + 350 + 20;
        const t1 = setTimeout(() => {
            setDisplayIdx(activeIdx);
            setTransPhase("enter");
        }, swapAt);
        const t2 = setTimeout(() => setTransPhase("idle"), idleAt);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, [activeIdx, mounted]);

    const select = (idx) => {
        if (idx === activeIdx || animating) return;
        setAnimating(true);
        setActiveIdx(idx);
        setTimeout(() => setAnimating(false), 400);
    };

    // RAF mati total kalau paused, startTime direset biar progress bar ga loncat pas resume
    useEffect(() => {
        if (animating || paused) return;

        let startTime    = null;
        let rafId;
        let currentPhase = "fill";

        const easeOut = (t) => 1 - Math.pow(1 - t, 3);

        const tick = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;

            const duration = currentPhase === "fill" ? INTERVAL_MS : SHRINK_MS;
            const t = Math.min(elapsed / duration, 1);

            if (barRef.current) {
                if (currentPhase === "fill") {
                    barRef.current.style.left  = "0%";
                    barRef.current.style.width = `${t * 100}%`;
                } else {
                    const e = easeOut(t);
                    barRef.current.style.left  = `${e * 100}%`;
                    barRef.current.style.width = `${(1 - e) * 100}%`;
                }
            }

            if (t < 1) {
                rafId = requestAnimationFrame(tick);
            } else if (currentPhase === "fill") {
                currentPhase = "shrink";
                startTime    = null;
                rafId        = requestAnimationFrame(tick);
            } else {
                const next = (activeIdx + 1) % visibleCountRef.current;
                setAnimating(true);
                setActiveIdx(next);
                setTimeout(() => setAnimating(false), 400);
            }
        };

        rafId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafId);
    }, [activeIdx, animating, paused]);

    const mobileCards     = EVENTS.slice(0, 4);
    const visibleCount    = isMobile ? mobileCards.length : EVENTS.length;
    const visibleCountRef = useRef(visibleCount);
    useEffect(() => { visibleCountRef.current = visibleCount; }, [visibleCount]);

    useEffect(() => {
        if (isMobile && activeIdx >= mobileCards.length) {
            setActiveIdx(0);
            setDisplayIdx(0);
        }
    }, [isMobile]);

    return (
        <section ref={sectionRef} className="relative w-full h-full flex flex-col overflow-hidden bg-black">
            <style>{`
                @keyframes bgFadeIn {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                @keyframes notch-pop {
                    from { opacity: 0; transform: translateX(-50%) scaleX(0.5); }
                    to   { opacity: 1; transform: translateX(-50%) scaleX(1); }
                }
                @keyframes info-exit {
                    from { opacity: 1; transform: translateY(0); }
                    to   { opacity: 0; transform: translateY(-10px); }
                }
                @keyframes info-enter {
                    from { opacity: 0; transform: translateY(-12px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes hero-intro {
                    from { opacity: 0; transform: translateY(18px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes hero-bar-intro {
                    from { opacity: 0; transform: scaleX(0); transform-origin: left; }
                    to   { opacity: 1; transform: scaleX(1); transform-origin: left; }
                }
                @keyframes hero-cards-intro {
                    from { opacity: 0; transform: translateY(28px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes hero-marquee-intro {
                    from { opacity: 0; transform: translateY(12px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>

            <div
                className="absolute inset-0 z-50 flex items-center justify-center bg-black"
                style={{
                    opacity:       readyIds.size === EVENTS.length ? 0 : 1,
                    pointerEvents: readyIds.size === EVENTS.length ? "none" : "all",
                    transition:    `opacity ${OVERLAY_FADE_MS}ms ease`,
                }}
            >
                <div style={{
                    width:        20,
                    height:       20,
                    borderRadius: "50%",
                    border:       "2px solid rgba(255,255,255,0.1)",
                    borderTop:    "2px solid rgba(234,179,8,0.9)",
                    animation:    "spin 0.8s linear infinite",
                }} />
            </div>

            <div className="absolute inset-0 z-0">
                {EVENTS.map((ev, idx) => (
                    <div
                        key={ev.id}
                        className="absolute inset-0"
                        style={{
                            opacity:    idx === activeIdx ? 1 : 0,
                            // skip compositor work kalau hero lagi ketutupan
                            transition: paused ? "none" : "opacity 0.8s ease",
                        }}
                    >
                        <canvas
                            ref={(el) => { if (el) canvasRefs.current[`${ev.id}_sharp`] = el; }}
                            className="absolute inset-0 w-full h-full"
                            style={{ objectFit: "cover" }}
                        />

                        <canvas
                            ref={(el) => { if (el) canvasRefs.current[`${ev.id}_blur`] = el; }}
                            className="absolute inset-0 w-full h-full"
                            style={{
                                objectFit: "cover",
                                filter: "blur(24px)",
                                maskImage: `
                                    linear-gradient(to top,   black 0%, transparent 35%),
                                    linear-gradient(to right, black 0%, transparent 40%),
                                    linear-gradient(to left,  black 0%, transparent 35%)
                                `,
                                WebkitMaskImage: `
                                    linear-gradient(to top,   black 0%, transparent 35%),
                                    linear-gradient(to right, black 0%, transparent 40%),
                                    linear-gradient(to left,  black 0%, transparent 35%)
                                `,
                                maskComposite:       "add",
                                WebkitMaskComposite: "source-over",
                            }}
                        />
                    </div>
                ))}
            </div>

            <div className="absolute inset-0 z-[1]" style={{ background: "linear-gradient(to right, rgba(6,18,92,0.7) 0%, rgba(6,18,92,0.3) 35%, transparent 60%)" }} />
            <div className="absolute inset-0 z-[1]" style={{ background: "linear-gradient(to left, rgba(6,18,92,0.5) 0%, transparent 30%)" }} />
            <div className="absolute inset-0 z-[2]" style={{ background: "linear-gradient(to top, rgba(6,18,92,0.7) 10%, transparent 50%)" }} />

            <div
                className="absolute top-0 left-0 right-0 h-1 bg-white/10 z-30"
                style={mounted ? {
                    animation: "hero-bar-intro 0.5s cubic-bezier(0.22, 1, 0.36, 1) 80ms both",
                } : { opacity: 0 }}
            >
                <div ref={barRef} className="absolute top-0 h-full bg-yellow-400" />
            </div>

            <div
                className="absolute z-10"
                style={{
                    top:      isMobile ? 48 : Math.round(80 * scale),
                    left:     isMobile ? 24 : margin,
                    right:    isMobile ? 24 : undefined,
                    maxWidth: isMobile ? undefined : Math.round(512 * scale),
                }}
            >
                <p
                    className="text-yellow-400 text-xs font-bold uppercase mb-3"
                    style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        letterSpacing: "0.2em",
                        ...infoAnimStyle(0),
                    }}
                >
                    {displayEvent.status === "active" ? ">>> Ongoing" : ">>> Coming Soon"}
                </p>

                <h1
                    className="text-white uppercase leading-none mb-3"
                    style={{
                        fontFamily: "'Bebas Neue', sans-serif",
                        fontSize: "clamp(2.8rem, 5vw, 5rem)",
                        textWrap: "balance",
                        filter: "drop-shadow(0 4px 4px rgba(0,0,0,0.25))",
                        ...infoAnimStyle(1),
                    }}
                >
                    {displayEvent.name}
                </h1>

                <p
                    className="text-white text-base leading-relaxed mb-6 font-medium"
                    style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        textWrap: "balance",
                        ...infoAnimStyle(2),
                    }}
                >
                    {displayEvent.description}
                </p>

                <div style={infoAnimStyle(3)}>
                    <Button href={`/events/${displayEvent.slug}`} variant="primary" size="md">
                        More Details
                    </Button>
                </div>
            </div>

            <div
                className="absolute z-10"
                style={{
                    bottom:        isMobile ? 80 : Math.round(80 * scale),
                    left:          isMobile ? 24 : margin,
                    right:         isMobile ? 24 : margin,
                    paddingBottom: isMobile ? 0 : Math.round(40 * scale),
                }}
            >
                <p
                    className="text-white text-sm font-bold uppercase mb-5"
                    style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        letterSpacing: "0.15em",
                        ...(mounted ? introStyle(480) : { opacity: 0 }),
                    }}
                >
                    {">>>"} Featured Events
                </p>

                <div
                    className="flex"
                    style={{
                        height: isMobile ? 160 : cardH,
                        gap:    Math.round(4 * scale),
                        ...(mounted ? {
                            animation: "hero-cards-intro 0.7s cubic-bezier(0.22, 1, 0.36, 1) 560ms both",
                        } : { opacity: 0 }),
                    }}
                >
                    {(isMobile ? mobileCards : [...EVENTS, ...Array(Math.max(0, 8 - EVENTS.length)).fill(null)]).map((ev, idx) => {
                        const isActive  = ev && idx === activeIdx;
                        const isHovered = ev && !isActive && hoveredIdx === idx;
                        return (
                            <div
                                key={ev ? ev.id : `placeholder-${idx}`}
                                onClick={ev ? (e) => { e.preventDefault(); select(idx); } : undefined}
                                onMouseEnter={() => ev && !isActive && setHoveredIdx(idx)}
                                onMouseLeave={() => setHoveredIdx(null)}
                                className={`flex-1 relative ${ev ? "cursor-pointer" : "cursor-default"}`}
                                style={{
                                    height:       isMobile ? 160 : cardH,
                                    borderRadius: "8px",
                                    overflow:     "visible",
                                    outline: isActive
                                        ? "2px solid rgba(234,179,8,0.9)"
                                        : isHovered
                                        ? "2px solid rgba(255,255,255,0.5)"
                                        : "2px solid transparent",
                                    transition: "outline 0.2s ease",
                                }}
                            >
                                <div style={{ position: "absolute", inset: 0, borderRadius: "8px", overflow: "hidden", boxShadow: "0 4px 4px rgba(0,0,0,0.25)" }}>
                                    {ev ? (
                                        <EventCard event={ev} size="md" />
                                    ) : (
                                        <div
                                            className="w-full h-full flex flex-col items-center justify-center gap-2"
                                            style={{ background: "#111827" }}
                                        >
                                            <div className="absolute inset-0" style={{
                                                backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 1px, transparent 1px, transparent 14px)",
                                            }} />
                                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round">
                                                <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                                            </svg>
                                            <span style={{
                                                fontFamily: "'Plus Jakarta Sans', sans-serif",
                                                fontSize: "0.55rem",
                                                fontWeight: 700,
                                                letterSpacing: "0.2em",
                                                color: "rgba(255,255,255,0.2)",
                                                textTransform: "uppercase",
                                            }}>
                                                Coming Soon
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {isActive && (
                                    <CardNotch
                                        color="rgb(234,179,8)"
                                        textColor="rgba(0,0,0,0.75)"
                                        label="this"
                                    />
                                )}

                                {isHovered && (
                                    <CardNotch
                                        color="rgba(255,255,255,0.92)"
                                        textColor="rgba(0,0,0,0.6)"
                                        label="see more"
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div
                className="absolute z-10 left-0 right-0"
                style={{
                    bottom: isMobile ? 6 : Math.round(24 * scale),
                    ...(mounted ? {
                        animation: "hero-marquee-intro 0.6s cubic-bezier(0.22, 1, 0.36, 1) 680ms both",
                    } : { opacity: 0 }),
                }}
            >
                <UniversityMarquee />
            </div>
        </section>
    );
}