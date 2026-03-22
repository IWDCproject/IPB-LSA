"use client";
import { useEffect, useRef } from "react";

export default function FightBackground({ visible = false }) {
  const videoRef = useRef(null);

  useEffect(() => {
    // Jalankan video dari awal saat props visible jadi true
    if (visible && videoRef.current) {
      videoRef.current.currentTime = 0;
	  videoRef.current.playbackRate = 2.8;
      videoRef.current.play();
    }
  }, [visible]);

  return (
    <div
      className="absolute z-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
      style={{
        inset: 0,
        height: "100%",
        // Gradient mask bawaanmu tetap dipakai biar bawahnya pudar natural
        maskImage: "linear-gradient(to bottom, black 40%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to bottom, black 40%, transparent 100%)",
      }}
    >
      <video
        ref={videoRef}
        // Ganti dengan lokasi file mp4 kamu di folder public
        src="/videos/Smooth_Handwriting_Animation_Request.mp4" 
        // opacity-20 tetap dipakai sesuai desain awalmu
        className="w-full h-auto opacity-15" 
        style={{
          transform: "scale(1.5)", // Atur scale-nya di sini seperti biasa
          mixBlendMode: "screen",  // INI MAGIC-NYA: Hilangin background hitam!
        }}
        muted
        playsInline
        // loop // Aktifkan (hilangkan //) kalau mau animasinya ngulang terus-terusan
      />
    </div>
  );
}