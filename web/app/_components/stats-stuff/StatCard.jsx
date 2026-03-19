import React from "react";

export default function StatCard({
  image_url,
  width = 320,
  height = 250,
  main_stat = "28+",
  label_stat = "Universities",
}) {
  const cardWidth = typeof width === "number" ? `${width}px` : width;
  const imgHeight = typeof height === "number" ? `${height}px` : height;
  const imgSrc = typeof image_url === "string" ? image_url : image_url?.src;

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
      <img
        src={imgSrc}
        alt={label_stat}
        style={{
          width: "100%",
          height: imgHeight,
          objectFit: "cover",
          display: "block",
          borderRadius: "10px 10px 0 0",
        }}
      />

      {/* Bottom: gradient stat*/}
      <div
        style={{
          borderRadius: "0 0 5px 5px",
          background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.15) 100%)",
          padding: "18px 22px 22px",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        <span
          style={{
            fontSize: "2.9rem",
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
            fontSize: "1rem",
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