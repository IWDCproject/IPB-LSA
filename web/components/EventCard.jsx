"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link  from "next/link";

// plateau masks — sama persis kayak stops di blurWorker processEventcard
// biar canvas path dan CSS fallback path identik visualnya
const BLUR_LAYERS = [
  { blur: "2px",  mask: "linear-gradient(to top, black 0%, black 20%, transparent 55%)" },
  { blur: "4px",  mask: "linear-gradient(to top, black 0%, black 12%, transparent 42%)" },
  { blur: "8px",  mask: "linear-gradient(to top, black 0%, black 8%,  transparent 30%)" },
  { blur: "16px", mask: "linear-gradient(to top, black 0%, black 5%,  transparent 20%)" },
];

// canvas path — DPR-aware biar tajam di retina/hidpi
// ResizeObserver udah garansi fire pertama kali pas mount, ga perlu draw manual
function BitmapBlurLayer({ bitmap }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bitmap) return;

    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (!width || !height) return;

      const dpr = window.devicePixelRatio || 1;

      // backing store di physical pixels
      canvas.width  = Math.round(width  * dpr);
      canvas.height = Math.round(height * dpr);

      // CSS size tetap di logical pixels
      canvas.style.width  = width  + "px";
      canvas.style.height = height + "px";

      const ctx = canvas.getContext("2d");
      ctx.scale(dpr, dpr);
      ctx.drawImage(bitmap, 0, 0, width, height);
    });

    ro.observe(canvas);
    return () => ro.disconnect();
  }, [bitmap]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:      "absolute",
        inset:         0,
        width:         "100%",
        height:        "100%",
        pointerEvents: "none",
      }}
    />
  );
}

export default function EventCard({ event, className = "", size = "md", bitmap = null }) {
  const { slug, name, card_image_url, user_created } = event;
  const orgName = user_created?.organisation_name ?? null;

  const orgSize   = size === "lg" ? "text-[15px]" : size === "sm" ? "text-[10px]"  : "text-[12px]";
  const titleSize = size === "lg" ? "text-[32px]" : size === "sm" ? "text-[18px]" : "text-[24px]";

  return (
    <Link
      href={`/events/${slug}`}
      className={`relative block overflow-hidden rounded-[0.2rem] h-full group ${className}`}
    >
      {card_image_url ? (
        <Image
          src={card_image_url}
          alt={name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 50vw, 25vw"
        />
      ) : (
        <div className="absolute inset-0 bg-zinc-800" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

      {/* blur path — canvas kalau bitmap ada, CSS fallback kalau belum */}
      <div className="absolute inset-0 pointer-events-none">
        {bitmap ? (
          <BitmapBlurLayer bitmap={bitmap} />
        ) : (
          BLUR_LAYERS.map(({ blur, mask }) => (
            <div
              key={blur}
              style={{
                position:             "absolute",
                inset:                0,
                backdropFilter:       `blur(${blur})`,
                WebkitBackdropFilter: `blur(${blur})`,
                maskImage:            mask,
                WebkitMaskImage:      mask,
              }}
            />
          ))
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4">
        {orgName && (
          <p className={`text-white/85 ${orgSize} tracking-wider font-semibold mb-1 truncate`}>
            by {orgName}
          </p>
        )}
        <p
          className={`text-white font-display ${titleSize} leading-[100%] uppercase tracking-[0.2px] line-clamp-2`}
          style={{ textWrap: "balance" }}
        >
          {name}
        </p>
      </div>
    </Link>
  );
}