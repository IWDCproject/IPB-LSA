import React from "react";
import Image from "next/image";

interface StatCardProps {
    image_url: string | { src: string };
    width?: number | string;
    height?: number | string;
    main_stat?: string;
    label_stat?: string;
}

export default function StatCard({
    image_url,
    width = 320,
    height = 250,
    main_stat = "28+",
    label_stat = "Universities",
}: StatCardProps) {

  const cardWidth: string = typeof width === "number" ? `${width}px` : width as string;
  const imgHeight: string = typeof height === "number" ? `${height}px` : height as string;
  const imgSrc: string | undefined = typeof image_url === "string" ? image_url : image_url?.src;

  return (
    <div
      style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        width: cardWidth,
        display: "inline-flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      {/* Top: foto stat*/}
      <div style={{ position: "relative", width: "100%", height: imgHeight }}>
        <Image
          src={imgSrc ?? ""}
          alt={label_stat}
          fill
          style={{ objectFit: "cover", borderRadius: "10px 10px 0 0", display: "block" }}
        />
      </div>

      {/* Bottom: gradient stat*/}
      <div
        style={{
          borderRadius: "0 0 5px 5px",
          background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.15) 100%)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          padding: "clamp(10px, 2.5vw, 18px) clamp(12px, 3.5vw, 22px) clamp(12px, 3vw, 22px)",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        <span
          style={{
            fontSize: "clamp(1.4rem, 5.5vw, 2.9rem)",
            fontWeight: 900,
            color: "#ffffff",
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}
        >
          {main_stat}
        </span>
        <span
          style={{
            fontSize: "clamp(0.75rem, 2.2vw, 1rem)",
            fontWeight: 400,
            color: "#ffffff",
            letterSpacing: "0.07em",
          }}
        >
          {label_stat}
        </span>
      </div>
    </div>
  );
}