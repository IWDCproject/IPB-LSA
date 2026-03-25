"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link  from "next/link";
import { getAssetUrl } from "@/lib/directus";

const BLUR_LAYERS = [
  { blur: "2px",  mask: "linear-gradient(to top, black 0%, black 20%, transparent 55%)" },
  { blur: "4px",  mask: "linear-gradient(to top, black 0%, black 12%, transparent 42%)" },
  { blur: "8px",  mask: "linear-gradient(to top, black 0%, black 8%,  transparent 30%)" },
  { blur: "16px", mask: "linear-gradient(to top, black 0%, black 5%,  transparent 20%)" },
];

function BitmapBlurLayer({ bitmap }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bitmap) return;

    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (!width || !height) return;

      const dpr = window.devicePixelRatio || 1;

      canvas.width  = Math.round(width  * dpr);
      canvas.height = Math.round(height * dpr);

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

const REF_W = { lg: 280, md: 200, sm: 150 };
const BASE_ORG   = { lg: 15, md: 13, sm: 14 };
const BASE_TITLE = { lg: 32, md: 26, sm: 24 };

export default function EventCard({ event, className = "", size = "md", bitmap = null }) {
  const { slug, name, card_image_url, user_created } = event;
  const orgName = user_created?.organisation_name ?? null;

  // Mendapatkan URL gambar yang valid (Directus ID atau URL Luar)
  const imageUrl = getAssetUrl(card_image_url);

  const linkRef = useRef(null);
  const [cardW, setCardW] = useState(REF_W[size] ?? 200);

  useEffect(() => {
    const el = linkRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setCardW(entry.contentRect.width));
    ro.observe(el);
    setCardW(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, [size]);

  const s = Math.min(1, cardW / (REF_W[size] ?? 200));
  const orgFontSize   = Math.max(7,  BASE_ORG[size]   * s);
  const titleFontSize = Math.max(10, BASE_TITLE[size]  * s);
  const pad = `${Math.max(6, Math.round(16 * s))}px`;
  const showOrg = orgName && cardW >= 80;

  return (
    <Link
      ref={linkRef}
      href={`/events/${slug}`}
      className={`relative block overflow-hidden rounded-[0.2rem] h-full group ${className}`}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 50vw, 25vw"
          unoptimized={imageUrl.startsWith('http://localhost')} // Jangan optimasi jika dari localhost untuk menghindari masalah cache/docker
        />
      ) : (
        <div className="absolute inset-0 bg-zinc-800" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

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

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: pad }}>
        {showOrg && (
          <p
            className="text-white/85 tracking-wider font-semibold mb-1 truncate"
            style={{ fontSize: orgFontSize }}
          >
            by {orgName}
          </p>
        )}
        <p
          className="text-white font-display leading-[100%] uppercase tracking-[0.2px] line-clamp-2"
          style={{ fontSize: titleFontSize, textWrap: "balance" }}
        >
          {name}
        </p>
      </div>
    </Link>
  );
}