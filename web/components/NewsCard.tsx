"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { gsap } from "gsap";

const JK = { fontFamily: "'Plus Jakarta Sans', sans-serif" } as const;
const STAGGER = 18;
const DUR = "0.5s";
const EASE = "cubic-bezier(0, 1, 0.2, 1)";
const YELLOW = "#FFC936";
const BLUE = "#0D26C2";

function SlotText({ children, isHovered }: { children: string; isHovered: boolean }) {
  const chars = children.split("");
  return (
    <span style={{ display: "inline-flex", alignItems: "center" }}>
      {chars.map((char, i) => (
        <span
          key={i}
          style={{
            display: "inline-block",
            overflow: "hidden",
            height: "1.2em",
            width: char === " " ? "0.25em" : "auto",
            whiteSpace: "pre",
            position: "relative",
          }}
        >
          <span
            style={{
              display: "flex",
              flexDirection: "column",
              transition: `transform ${DUR} ${EASE}`,
              transitionDelay: isHovered
                ? `${i * STAGGER}ms`
                : `${(chars.length - 1 - i) * STAGGER}ms`,
              transform: isHovered ? "translateY(-50%)" : "translateY(0%)",
              color: BLUE,
            }}
          >
            <span style={{ display: "flex", height: "1.2em", alignItems: "center" }}>{char}</span>
            <span style={{ display: "flex", height: "1.2em", alignItems: "center" }} aria-hidden="true">{char}</span>
          </span>
        </span>
      ))}
    </span>
  );
}

export function NewsCardSkeleton() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 380,
        borderRadius: 8,
        overflow: "hidden",
        boxShadow: "0 0 0 2px rgba(255,255,255,0.1)",
      }}
    >
      <style>{`
        @keyframes news-shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>

      {/* Thumbnail */}
      <div style={{ height: 200, background: "rgba(255,255,255,0.07)", flexShrink: 0, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.07) 50%, transparent 100%)", animation: "news-shimmer 1.6s ease-in-out infinite" }} />
      </div>

      {/* Body */}
      <div style={{ padding: "20px 22px 22px", flex: 1, display: "flex", flexDirection: "column", gap: 10, background: "rgba(255,255,255,0.04)" }}>
        {/* Date */}
        <Bone width="30%" height={12} delay="0s" />
        {/* Title lines */}
        <Bone width="90%" height={20} delay="0.05s" />
        <Bone width="65%" height={20} delay="0.1s" />
        {/* Excerpt lines */}
        <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 8 }}>
          <Bone width="100%" height={13} delay="0.12s" />
          <Bone width="80%" height={13} delay="0.17s" />
        </div>
        {/* Divider */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.06)", marginTop: "auto" }} />
        {/* Read more */}
        <div style={{ paddingTop: 16 }}>
          <Bone width="28%" height={14} delay="0.2s" />
        </div>
      </div>
    </div>
  );
}

function Bone({ width, height, delay }: { width: string; height: number; delay: string }) {
  return (
    <div style={{ width, height, borderRadius: 4, background: "rgba(255,255,255,0.08)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.07) 50%, transparent 100%)", animation: `news-shimmer 1.6s ease-in-out ${delay} infinite` }} />
    </div>
  );
}

export default function NewsCard({ item }: { item: any }) {
  const [isHovered, setIsHovered] = useState(false);
  const arrowRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const paths = arrowRef.current?.querySelectorAll("path, line, polyline");
    if (!paths) return;
    if (isHovered) {
      paths.forEach((path: any) => {
        const length = path.getTotalLength?.() ?? 50;
        gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
        gsap.to(path, { strokeDashoffset: 0, duration: 0.4, ease: "power2.out", delay: 0.05 });
      });
    }
  }, [isHovered]);

  // event_id is expanded to an object when fetched with event_id.name
  const badge = item.event_id?.name ?? item.category;

  return (
    <Link
      href={`/news/${item.slug}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        textDecoration: "none",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        borderRadius: 8,
        transition: "box-shadow 0.3s ease",
        boxShadow: isHovered
          ? `0 0 0 2px ${YELLOW}, 0 0 20px rgba(255, 201, 54, 0.35)`
          : "0 0 0 2px #FFFFFF",
      }}
    >
      <div style={{ background: "#fff", borderRadius: 6, overflow: "hidden", flex: 1, display: "flex", flexDirection: "column" }}>
        <div
          style={{
            height: 200,
            position: "relative",
            backgroundImage: item.thumbnail_url ? `url(${item.thumbnail_url})` : "none",
            backgroundColor: "#E5E7EB",
            backgroundSize: "cover",
            backgroundPosition: "center",
            flexShrink: 0,
          }}
        >
          {badge && (
            <span
              style={{
                ...JK,
                position: "absolute",
                top: 12,
                left: 12,
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.05em",
                padding: "5px 10px",
                borderRadius: 4,
                background: isHovered ? YELLOW : "#FFFFFF",
                color: isHovered ? "#000" : "#06125C",
                textTransform: "uppercase",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                transition: "all 0.3s ease",
              }}
            >
              {badge}
            </span>
          )}
        </div>

        <div style={{ padding: "20px 22px 22px", flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ ...JK, fontSize: 12, color: "#9CA3AF", fontWeight: 600, marginBottom: 8 }}>
            {item.published_at
              ? new Date(item.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
              : "—"}
          </div>
          <div style={{ ...JK, fontSize: 18, fontWeight: 800, color: "#06125C", lineHeight: 1.3, marginBottom: 12 }}>
            {item.title}
          </div>
          {item.excerpt && (
            <div
              style={{
                ...JK,
                fontSize: 14,
                color: "#6B7280",
                lineHeight: 1.6,
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                marginBottom: 16,
              } as React.CSSProperties}
            >
              {item.excerpt}
            </div>
          )}
          <div style={{ height: "1px", background: "#F3F4F6", width: "100%", marginTop: "auto" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 16 }}>
            <div style={{ ...JK, fontSize: 15, fontWeight: 800 }}>
              <SlotText isHovered={isHovered}>Read more</SlotText>
            </div>
            <div
              style={{
                opacity: isHovered ? 1 : 0,
                visibility: isHovered ? "visible" : "hidden",
                transition: "opacity 0.2s ease",
                display: "flex",
              }}
            >
              <svg
                ref={arrowRef}
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke={BLUE}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ transform: isHovered ? "translate(2px, -2px)" : "none", transition: "transform 0.3s ease" }}
              >
                <line x1="7" y1="17" x2="17" y2="7" />
                <polyline points="7 7 17 7 17 17" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}