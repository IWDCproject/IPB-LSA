"use client";
import { useEffect, useRef, useState } from "react";

export default function FightBackground({ visible = false }) {
  const videoRef     = useRef(null);
  const containerRef = useRef(null);
  const [fadeStart, setFadeStart] = useState(20);

  useEffect(() => {
    if (visible && videoRef.current) {
      videoRef.current.currentTime = 0;
	    videoRef.current.playbackRate = 1.1;
      videoRef.current.play();
    }
  }, [visible]);

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

  const mask = `linear-gradient(to bottom, black 20%, transparent ${fadeStart + 10}%)`;

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
        src="/videos/0323(1).mp4" 

        className="w-full h-auto opacity-15" 
        style={{
          transform: "scale(1.5)", // Atur scale-nya di sini seperti biasa
          mixBlendMode: "screen",  
        }}
        muted
        playsInline
        // loop // Aktifkan (hilangkan //) kalau mau animasinya ngulang terus-terusan
      />
    </div>
  );
}