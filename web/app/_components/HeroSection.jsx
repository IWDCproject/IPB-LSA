"use client";

import { useState, useEffect, useRef } from "react";
import Button from "@/components/Button";
import EventCard from "@/components/EventCard";

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

export default function HeroSection() {
    const [activeIdx, setActiveIdx] = useState(0);
    const [progress, setProgress] = useState(0);
    const [phase, setPhase] = useState("fill");
    const [animating, setAnimating] = useState(false);

    const progressRef = useRef(null);
    const startRef = useRef(Date.now());
    const activeEvent = EVENTS[activeIdx];

    const select = (idx) => {
        if (idx === activeIdx || animating) return;
        setAnimating(true);
        setPhase("fill");
        setProgress(0);
        setActiveIdx(idx);
        setTimeout(() => setAnimating(false), 400);
    };

    // Fill left→right, then shrink left→right, then advance slide
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
                // bar fully filled — kick off the shrink phase
                setPhase("shrink");
            } else {
                // shrink done — reset progress first to avoid full-bar flash
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

    // Derive bar position from phase + progress:
    //   fill phase:   left=0,        width=progress%
    //   shrink phase: left=progress%, width=(100-progress)%
    // ease-out cubic for the shrink wipeout: fast start, slows to a stop
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);

    const barLeft = phase === "shrink" ? `${easeOut(progress / 100) * 100}%` : "0%";
    const barWidth = phase === "fill" ? `${progress}%` : `${100 - easeOut(progress / 100) * 100}%`;

    return (
        <section className="relative w-full flex-1 flex flex-col overflow-hidden bg-black">
            <style>{`
                @keyframes fade-up {
                    from { opacity: 0; transform: translateY(10px); }
                    to     { opacity: 1; transform: translateY(0); }
                }
                @keyframes bgFadeIn {
                    from { opacity: 0; }
                    to     { opacity: 1; }
                }
            `}</style>

            {/* background foto event yang lagi aktif */}
            <div className="absolute inset-0 z-0">
                <img
                    key={activeEvent.id}
                    src={activeEvent.card_image_url}
                    alt={activeEvent.name}
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{
                        objectPosition: "right center",
                        animation: "bgFadeIn 0.8s ease forwards",
                    }}
                />
            </div>

            {/* gradient overlay biar teks keliatan, warna biru IPB */}
            <div
                className="absolute inset-0 z-[1]"
                style={{
                    background:
                        "linear-gradient(to right, rgba(6,18,92,0.7) 0%, rgba(6,18,92,0.3) 35%, transparent 60%)",
                }}
            />
            <div
                className="absolute inset-0 z-[1]"
                style={{
                    background:
                        "linear-gradient(to left, rgba(6,18,92,0.5) 0%, transparent 30%)",
                }}
            />
            <div
                className="absolute inset-0 z-[2]"
                style={{
                    background:
                        "linear-gradient(to top, rgba(6,18,92,0.7) 10%, transparent 50%)",
                }}
            />

            {/* progressive blur, dari bawah dan dari kiri */}
            <div className="absolute inset-0 z-[3] pointer-events-none">
                <div style={{ position: "absolute", inset: 0, backdropFilter: "blur(2px)",    WebkitBackdropFilter: "blur(2px)",    maskImage: "linear-gradient(to top, black 0%, transparent 100%)" }} />
                <div style={{ position: "absolute", inset: 0, backdropFilter: "blur(4px)",    WebkitBackdropFilter: "blur(4px)",    maskImage: "linear-gradient(to top, black 0%, transparent 75%)"    }} />
                <div style={{ position: "absolute", inset: 0, backdropFilter: "blur(8px)",    WebkitBackdropFilter: "blur(8px)",    maskImage: "linear-gradient(to top, black 0%, transparent 50%)"    }} />
                <div style={{ position: "absolute", inset: 0, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", maskImage: "linear-gradient(to top, black 0%, transparent 25%)"    }} />
                <div style={{ position: "absolute", inset: 0, backdropFilter: "blur(2px)",    WebkitBackdropFilter: "blur(2px)",    maskImage: "linear-gradient(to right, black 0%, transparent 50%)" }} />
                <div style={{ position: "absolute", inset: 0, backdropFilter: "blur(4px)",    WebkitBackdropFilter: "blur(4px)",    maskImage: "linear-gradient(to right, black 0%, transparent 37%)"    }} />
                <div style={{ position: "absolute", inset: 0, backdropFilter: "blur(8px)",    WebkitBackdropFilter: "blur(8px)",    maskImage: "linear-gradient(to right, black 0%, transparent 25%)"    }} />
                <div style={{ position: "absolute", inset: 0, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", maskImage: "linear-gradient(to right, black 0%, transparent 12%)"    }} />
            </div>

            {/* progress bar di atas */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 z-30">
                <div
                    className="absolute top-0 h-full bg-yellow-400"
                    style={{
                        left: barLeft,
                        width: barWidth,
                    }}
                />
            </div>

            {/* teks info event, posisi kiri atas */}
            <div className="absolute z-10 left-[160px] max-w-lg" style={{ top: "80px" }}>
                <p
                    className="text-yellow-400 text-xs font-bold uppercase mb-3"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: "0.2em" }}
                >
                    {activeEvent.status === "active" ? "⬤ Ongoing" : "Coming Soon"}
                </p>
                <h1
                    key={activeEvent.id + "-t"}
                    className="text-white uppercase leading-none mb-3"
                    style={{
                        fontFamily: "'Bebas Neue', sans-serif",
                        fontSize: "clamp(2.8rem, 5vw, 5rem)",
                        animation: "fade-up 0.4s ease forwards",
                    }}
                >
                    {activeEvent.name}
                </h1>
                <p
                    key={activeEvent.id + "-d"}
                    className="text-white text-base leading-relaxed mb-6 font-medium"
                    style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        animation: "fade-up 0.4s ease 0.07s both",
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                    }}
                >
                    {activeEvent.description}
                </p>
                <Button href={`/events/${activeEvent.slug}`} variant="primary" size="md">
                    More Details
                </Button>
            </div>

            {/* kartu event di bagian bawah */}
            <div className="absolute z-10 bottom-20 left-0 right-0 px-[160px] pb-10">
                <p
                    className="text-white text-sm font-bold uppercase mb-5"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: "0.15em" }}
                >
                    {">"}{">"}{">"} Featured Events
                </p>
                <div className="flex gap-3" style={{ height: 240 }}>
                    {[...EVENTS, ...Array(Math.max(0, 8 - EVENTS.length)).fill(null)].map((ev, idx) => {
                        const isActive = ev && idx === activeIdx;
                        return (
                            <div
                                key={ev ? ev.id : `placeholder-${idx}`}
                                onClick={ev ? (e) => { e.preventDefault(); select(idx); } : undefined}
                                className={`flex-1 relative ${ev ? "cursor-pointer" : "cursor-default"}`}
                                style={{
                                    height: 240,
                                    borderRadius: "8px",
                                    overflow: "hidden",
                                    outline: isActive
                                        ? "2px solid rgba(234,179,8,0.9)"
                                        : "2px solid transparent",
                                    transition: "outline 0.2s ease",
                                }}
                            >
                                {ev ? (
                                    <EventCard event={ev} />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center gap-2"
                                        style={{ background: "#111827" }}>
                                        <div className="absolute inset-0" style={{
                                            backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 1px, transparent 1px, transparent 14px)",
                                        }} />
                                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round">
                                            <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
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
                        );
                    })}
                </div>
            </div>
        </section>
    );
}