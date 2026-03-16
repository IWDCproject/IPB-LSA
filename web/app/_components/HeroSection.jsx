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
            "Turnamen golf amal terbuka untuk sivitas akademika IPB. Hasil disumbangkan untuk beasiswa mahasiswa.",
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
const SHRINK_MS = 600;

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

// Intro stagger animation
function introStyle(delayMs) {
    return { animation: `hero-intro 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${delayMs}ms both` };
}

// Per-slot delays for exit (top→bottom) and enter (top→bottom)
const EXIT_DELAYS  = [150, 100, 50, 0];   // status, title, desc, button — bottom to top
const ENTER_DELAYS = [0, 70, 140, 210];
const INTRO_DELAYS = [160, 240, 320, 400];

export default function HeroSection() {
    const [activeIdx, setActiveIdx] = useState(0);
    const [hoveredIdx, setHoveredIdx] = useState(null);
    const [progress, setProgress] = useState(0);
    const [phase, setPhase] = useState("fill");
    const [animating, setAnimating] = useState(false);
    const [mounted, setMounted] = useState(false);
    // Lags behind activeIdx — content swaps only after exit finishes
    const [displayIdx, setDisplayIdx] = useState(0);
    // "idle" | "exit" | "enter"
    const [transPhase, setTransPhase] = useState("idle");
    // Once true, idle state returns opacity:1 instead of re-firing intro
    const [introPlayed, setIntroPlayed] = useState(false);

    const progressRef = useRef(null);
    const startRef = useRef(Date.now());
    const activeEvent  = EVENTS[activeIdx];
    const displayEvent = EVENTS[displayIdx];

    // Returns the right animation style for each info slot based on current phase
    const infoAnimStyle = (slot) => {
        if (!mounted) return { opacity: 0 };
        if (transPhase === "exit")
            return { animation: `info-exit 0.22s ease ${EXIT_DELAYS[slot]}ms both` };
        if (transPhase === "enter")
            return { animation: `info-enter 0.35s cubic-bezier(0.22, 1, 0.36, 1) ${ENTER_DELAYS[slot]}ms both` };
        // idle — play intro once, then just stay visible
        if (!introPlayed) return introStyle(INTRO_DELAYS[slot]);
        return { opacity: 1 };
    };

    // Trigger intro on first paint
    useEffect(() => {
        const rafId = requestAnimationFrame(() => setMounted(true));
        return () => cancelAnimationFrame(rafId);
    }, []);

    // Card transition: exit → swap content → enter
    useEffect(() => {
        if (!mounted || activeIdx === displayIdx) return;
        setIntroPlayed(true);
        setTransPhase("exit");
        // EXIT_DELAYS last slot (150ms) + exit duration (220ms) + buffer
        const swapAt = 150 + 220 + 20;
        // ENTER_DELAYS last slot (210ms) + enter duration (350ms) + buffer
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
        setPhase("fill");
        setProgress(0);
        setActiveIdx(idx);
        setTimeout(() => setAnimating(false), 400);
    };

    useEffect(() => {
        if (animating) return;
        startRef.current = Date.now();
        setProgress(0);

        const duration = phase === "fill" ? INTERVAL_MS : SHRINK_MS;

        const tick = () => {
            const pct = Math.min(
                ((Date.now() - startRef.current) / duration) * 100,
                100
            );
            setProgress(pct);
            if (pct < 100) {
                progressRef.current = requestAnimationFrame(tick);
            } else if (phase === "fill") {
                setPhase("shrink");
            } else {
                setProgress(0);
                setPhase("fill");
                const next = (activeIdx + 1) % EVENTS.length;
                setAnimating(true);
                setActiveIdx(next);
                setTimeout(() => setAnimating(false), 400);
            }
        };

        progressRef.current = requestAnimationFrame(tick);
        return () => {
            if (progressRef.current) cancelAnimationFrame(progressRef.current);
        };
    }, [activeIdx, phase, animating]);

    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    const barLeft = phase === "shrink" ? `${easeOut(progress / 100) * 100}%` : "0%";
    const barWidth = phase === "fill" ? `${progress}%` : `${100 - easeOut(progress / 100) * 100}%`;

    return (
        <section className="relative w-full flex-1 flex flex-col overflow-hidden bg-black">
            <style>{`
                /* ── existing animations ── */
                @keyframes bgFadeIn {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                @keyframes notch-pop {
                    from { opacity: 0; transform: translateX(-50%) scaleX(0.5); }
                    to   { opacity: 1; transform: translateX(-50%) scaleX(1); }
                }

                /* ── card transition ── */
                @keyframes info-exit {
                    from { opacity: 1; transform: translateY(0); }
                    to   { opacity: 0; transform: translateY(-10px); }
                }
                @keyframes info-enter {
                    from { opacity: 0; transform: translateY(-12px); }
                    to   { opacity: 1; transform: translateY(0); }
                }

                /* ── intro stagger ── */
                @keyframes hero-intro {
                    from {
                        opacity: 0;
                        transform: translateY(18px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                /* Progress bar slides in from the left edge */
                @keyframes hero-bar-intro {
                    from {
                        opacity: 0;
                        transform: scaleX(0);
                        transform-origin: left;
                    }
                    to {
                        opacity: 1;
                        transform: scaleX(1);
                        transform-origin: left;
                    }
                }

                /* Cards row fans in slightly from below */
                @keyframes hero-cards-intro {
                    from {
                        opacity: 0;
                        transform: translateY(28px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                /* Marquee fades up last */
                @keyframes hero-marquee-intro {
                    from {
                        opacity: 0;
                        transform: translateY(12px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>

            {/* background */}
            <div className="absolute inset-0 z-0">
                <img
                    key={activeEvent.id}
                    src={activeEvent.card_image_url}
                    alt={activeEvent.name}
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ objectPosition: "right center", animation: "bgFadeIn 0.8s ease forwards" }}
                />
            </div>

            {/* gradient overlays */}
            <div className="absolute inset-0 z-[1]" style={{ background: "linear-gradient(to right, rgba(6,18,92,0.7) 0%, rgba(6,18,92,0.3) 35%, transparent 60%)" }} />
            <div className="absolute inset-0 z-[1]" style={{ background: "linear-gradient(to left, rgba(6,18,92,0.5) 0%, transparent 30%)" }} />
            <div className="absolute inset-0 z-[2]" style={{ background: "linear-gradient(to top, rgba(6,18,92,0.7) 10%, transparent 50%)" }} />

            {/* progressive blur */}
            <div className="absolute inset-0 z-[3] pointer-events-none">
                <div style={{ position: "absolute", inset: 0, backdropFilter: "blur(2px)",  WebkitBackdropFilter: "blur(2px)",  maskImage: "linear-gradient(to top, black 0%, transparent 100%)" }} />
                <div style={{ position: "absolute", inset: 0, backdropFilter: "blur(4px)",  WebkitBackdropFilter: "blur(4px)",  maskImage: "linear-gradient(to top, black 0%, transparent 75%)" }} />
                <div style={{ position: "absolute", inset: 0, backdropFilter: "blur(8px)",  WebkitBackdropFilter: "blur(8px)",  maskImage: "linear-gradient(to top, black 0%, transparent 50%)" }} />
                <div style={{ position: "absolute", inset: 0, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", maskImage: "linear-gradient(to top, black 0%, transparent 25%)" }} />
                <div style={{ position: "absolute", inset: 0, backdropFilter: "blur(2px)",  WebkitBackdropFilter: "blur(2px)",  maskImage: "linear-gradient(to right, black 0%, transparent 50%)" }} />
                <div style={{ position: "absolute", inset: 0, backdropFilter: "blur(4px)",  WebkitBackdropFilter: "blur(4px)",  maskImage: "linear-gradient(to right, black 0%, transparent 37%)" }} />
                <div style={{ position: "absolute", inset: 0, backdropFilter: "blur(8px)",  WebkitBackdropFilter: "blur(8px)",  maskImage: "linear-gradient(to right, black 0%, transparent 25%)" }} />
                <div style={{ position: "absolute", inset: 0, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", maskImage: "linear-gradient(to right, black 0%, transparent 12%)" }} />
            </div>
            <div style={{ position: "absolute", inset: 0, backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)", maskImage: "linear-gradient(to left, black 0%, transparent 30%)" }} />
            <div style={{ position: "absolute", inset: 0, backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", maskImage: "linear-gradient(to left, black 0%, transparent 20%)" }} />
            <div style={{ position: "absolute", inset: 0, backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", maskImage: "linear-gradient(to left, black 0%, transparent 10%)" }} />

            {/* ── progress bar — intro: slides in from left ── */}
            <div
                className="absolute top-0 left-0 right-0 h-1 bg-white/10 z-30"
                style={mounted ? {
                    animation: "hero-bar-intro 0.5s cubic-bezier(0.22, 1, 0.36, 1) 80ms both",
                } : { opacity: 0 }}
            >
                <div className="absolute top-0 h-full bg-yellow-400" style={{ left: barLeft, width: barWidth }} />
            </div>

            {/* ── event info — staggered top-down ── */}
            <div className="absolute z-10 left-[160px] max-w-lg" style={{ top: "80px" }}>

                {/* 1 — status label */}
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

                {/* 2 — title */}
                <h1
                    className="text-white uppercase leading-none mb-3"
                    style={{
                        fontFamily: "'Bebas Neue', sans-serif",
                        fontSize: "clamp(2.8rem, 5vw, 5rem)",
                        ...infoAnimStyle(1),
                    }}
                >
                    {displayEvent.name}
                </h1>

                {/* 3 — description */}
                <p
                    className="text-white text-base leading-relaxed mb-6 font-medium"
                    style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        ...infoAnimStyle(2),
                    }}
                >
                    {displayEvent.description}
                </p>

                {/* 4 — CTA button */}
                <div style={infoAnimStyle(3)}>
                    <Button href={`/events/${displayEvent.slug}`} variant="primary" size="md">
                        More Details
                    </Button>
                </div>
            </div>

            {/* ── event cards ── */}
            <div className="absolute z-10 bottom-20 left-0 right-0 px-[160px] pb-10">

                {/* 5 — "Featured Events" label */}
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

                {/* 6 — cards row */}
                <div
                    className="flex gap-1"
                    style={{
                        height: 240,
                        ...(mounted ? {
                            animation: "hero-cards-intro 0.7s cubic-bezier(0.22, 1, 0.36, 1) 560ms both",
                        } : { opacity: 0 }),
                    }}
                >
                    {[...EVENTS, ...Array(Math.max(0, 8 - EVENTS.length)).fill(null)].map((ev, idx) => {
                        const isActive = ev && idx === activeIdx;
                        const isHovered = ev && !isActive && hoveredIdx === idx;
                        return (
                            <div
                                key={ev ? ev.id : `placeholder-${idx}`}
                                onClick={ev ? (e) => { e.preventDefault(); select(idx); } : undefined}
                                onMouseEnter={() => ev && !isActive && setHoveredIdx(idx)}
                                onMouseLeave={() => setHoveredIdx(null)}
                                className={`flex-1 relative ${ev ? "cursor-pointer" : "cursor-default"}`}
                                style={{
                                    height: 240,
                                    borderRadius: "8px",
                                    overflow: "visible",
                                    outline: isActive
                                        ? "2px solid rgba(234,179,8,0.9)"
                                        : isHovered
                                        ? "2px solid rgba(255,255,255,0.5)"
                                        : "2px solid transparent",
                                    transition: "outline 0.2s ease",
                                }}
                            >
                                {/* inner clip wrapper */}
                                <div style={{ position: "absolute", inset: 0, borderRadius: "8px", overflow: "hidden" }}>
                                    {ev ? (
                                        <EventCard event={ev} />
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

                                {/* yellow notch — active card */}
                                {isActive && (
                                    <CardNotch
                                        color="rgb(234,179,8)"
                                        textColor="rgba(0,0,0,0.75)"
                                        label="this"
                                    />
                                )}

                                {/* white notch — hovered card */}
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

            {/* ── university marquee — last in ── */}
            <div
                className="absolute z-10 bottom-6 left-0 right-0"
                style={mounted ? {
                    animation: "hero-marquee-intro 0.6s cubic-bezier(0.22, 1, 0.36, 1) 680ms both",
                } : { opacity: 0 }}
            >
                <UniversityMarquee />
            </div>
        </section>
    );
}