"use client";
import { useEffect, useRef, useState } from "react";

interface FightBackgroundProps {
    visible: boolean;
}

export default function FightBackground({ visible = false }: FightBackgroundProps) {
  const videoRef     = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fadeStart, setFadeStart] = useState(20);
  const [isFullyVisible, setIsFullyVisible] = useState(false);

  const hasStarted = useRef(false);

  // New IO to check for "Full" visibility (threshold 1.0)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        // threshold 1.0 means the entire element is in the viewport
        if (entry.isIntersecting && entry.intersectionRatio >= 0.99) {
          setIsFullyVisible(true);
        } else {
          setIsFullyVisible(false);
        }
      },
      { threshold: [0, 0.99, 1.0] }
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    // Hanya mulai main (play) jika belum pernah start sebelumnya
    if (visible && isFullyVisible && videoRef.current && !hasStarted.current) {
      hasStarted.current = true; // Kunci agar tidak start ulang
      videoRef.current.currentTime = 0;
      videoRef.current.playbackRate = 1;
      videoRef.current.play().catch(err => {
        console.error("Video play failed:", err);
        hasStarted.current = false; // Reset jika gagal agar bisa coba lagi
      });
    }
  }, [visible, isFullyVisible]);

  useEffect(() => {
    const video     = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    function measure() {
      const videoBottom    = video.getBoundingClientRect().bottom;
      const containerTop   = container.getBoundingClientRect().top;
      const containerH     = container.getBoundingClientRect().height;
      const videoBottomPct = ((videoBottom - containerTop) / containerH) * 100;
      setFadeStart(Math.min(videoBottomPct - 10, 85));
    }

    video.addEventListener("loadedmetadata", measure);
    const ro = new ResizeObserver(measure);
    ro.observe(container);

    return () => {
      video.removeEventListener("loadedmetadata", measure);
      ro.disconnect();
    };
  }, []);

  const mask = `linear-gradient(to bottom, black 10%, transparent ${fadeStart + 10}%)`;

  return (
    <div
      ref={containerRef}
      className="absolute z-0 flex items-start justify-center pointer-events-none select-none overflow-hidden"
      style={{
        inset: 0,
        height: "100%",
        maskImage: mask,
        WebkitMaskImage: mask,
      }}
    >
      <video
        ref={videoRef}
        src="/videos/fight.mp4" 

        className="w-full h-auto opacity-15" 
        style={{
          transform: "scale(1.7) translateY(-8%)", // Atur scale-nya di sini seperti biasa
          mixBlendMode: "screen",  

        }}
        muted
        playsInline
      />
    </div>
  );
}