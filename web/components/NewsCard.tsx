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

// ─── Skeleton ─────────────────────────────────────────────────────────────────
// Mirrors the exact DOM structure, spacing, and colours of NewsCard so the
// skeleton occupies the same pixel footprint as the real card.

function Bone({ width, height, delay = "0s", radius = 4 }: {
  width: string | number; height: number; delay?: string; radius?: number;
}) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: "#E9EAEC",
      position: "relative", overflow: "hidden", flexShrink: 0,
    }}>
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.75) 50%, transparent 100%)",
        animation: `news-shimmer 1.6s ease-in-out ${delay} infinite`,
      }} />
    </div>
  );
}

export function NewsCardSkeleton() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes news-shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}} />

      {/*
        Outer wrapper: matches <Link> — borderRadius 8, same white ring,
        flex col so inner div stretches to full height.
      */}
      <div style={{
        display: "flex", flexDirection: "column", height: "100%",
        borderRadius: 8,
        boxShadow: "0 0 0 2px #FFFFFF",
      }}>
        {/* Inner white card — matches <div background="#fff" borderRadius=6> */}
        <div style={{
          background: "#fff", borderRadius: 6, overflow: "hidden",
          flex: 1, display: "flex", flexDirection: "column",
        }}>

          {/* Thumbnail — matches height:200, backgroundColor:#E5E7EB */}
          <div style={{
            height: 200, background: "#E5E7EB",
            flexShrink: 0, position: "relative", overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)",
              animation: "news-shimmer 1.6s ease-in-out infinite",
            }} />
          </div>

          {/* Body — matches padding "20px 22px 22px", flex col */}
          <div style={{
            padding: "20px 22px 22px",
            flex: 1, display: "flex", flexDirection: "column",
          }}>

            {/* Date — fontSize:12, marginBottom:8 */}
            <Bone width="30%" height={12} delay="0s" />

            {/* Title — fontSize:18, fontWeight:800, lineHeight:1.3, marginBottom:12 */}
            <div style={{ marginTop: 8, marginBottom: 12, display: "flex", flexDirection: "column", gap: 7 }}>
              <Bone width="92%" height={20} delay="0.05s" />
              <Bone width="60%" height={20} delay="0.09s" />
            </div>

            {/* Excerpt — fontSize:14, lineClamp:2, marginBottom:16 */}
            <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              <Bone width="100%" height={13} delay="0.12s" />
              <Bone width="78%"  height={13} delay="0.16s" />
            </div>

            {/* Divider — matches height:1, background:#F3F4F6, marginTop:auto */}
            <div style={{ height: 1, background: "#F3F4F6", width: "100%", marginTop: "auto" }} />

            {/* Read more row — matches paddingTop:16 */}
            <div style={{ paddingTop: 16 }}>
              <Bone width="28%" height={14} delay="0.20s" />
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

// ─── Slot text animation ──────────────────────────────────────────────────────

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

// ─── Bone helper (used inside NewsCard only, not exported) ────────────────────

function DarkBone({ width, height, delay }: { width: string; height: number; delay: string }) {
  return (
    <div style={{ width, height, borderRadius: 4, background: "rgba(255,255,255,0.08)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.07) 50%, transparent 100%)", animation: `news-shimmer 1.6s ease-in-out ${delay} infinite` }} />
    </div>
  );
}

// ─── News Card ────────────────────────────────────────────────────────────────

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