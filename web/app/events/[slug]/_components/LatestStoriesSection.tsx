"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { gsap } from "gsap";

const JK = { fontFamily: "'Plus Jakarta Sans', sans-serif" } as const;

// Animation Constants
const STAGGER = 18;
const DUR = "0.5s";
const EASE = "cubic-bezier(0, 1, 0.2, 1)";
const YELLOW = "#FFC936";
const BLUE = "#0D26C2";

/**
 * Slot Text Flip Animation
 * Keeps color BLUE for readability.
 */
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

function NewsCard({ item }: { item: any }) {
  const [isHovered, setIsHovered] = useState(false);
  const arrowRef = useRef<SVGSVGElement>(null);

  // SVG Draw Animation Logic using GSAP
  useEffect(() => {
    const paths = arrowRef.current?.querySelectorAll("path, line, polyline");
    if (!paths) return;

    if (isHovered) {
      paths.forEach((path: any) => {
        const length = path.getTotalLength?.() ?? 50;
        gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
        gsap.to(path, {
          strokeDashoffset: 0,
          duration: 0.4,
          ease: "power2.out",
          delay: 0.05
        });
      });
    }
  }, [isHovered]);

  return (
    <Link
      href={`/berita/${item.slug}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        textDecoration: "none",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        borderRadius: 8,
        transition: "box-shadow 0.3s ease",
        // Consistent 2px thickness for both states
        boxShadow: isHovered 
          ? `0 0 0 2px ${YELLOW}, 0 0 20px rgba(255, 201, 54, 0.35)` 
          : "0 0 0 2px #FFFFFF", 
      }}
    >
      <div style={{ 
        background: "#fff", 
        borderRadius: 6, // Slightly smaller to sit inside the 2px ring
        overflow: "hidden", 
        flex: 1, 
        display: "flex", 
        flexDirection: "column" 
      }}>
        {/* Thumbnail */}
        <div style={{
          height: 200, position: "relative",
          backgroundImage: item.thumbnail_url ? `url(${item.thumbnail_url})` : "none",
          backgroundColor: "#E5E7EB",
          backgroundSize: "cover", backgroundPosition: "center",
          flexShrink: 0,
        }}>
          {/* Badge: Uppercase, No Emoji, Black Text on White */}
          <span style={{
            ...JK, position: "absolute", top: 12, left: 12,
            fontSize: 11, fontWeight: 800, letterSpacing: "0.05em",
            padding: "5px 10px", borderRadius: 4,
            background: "#FFFFFF",
            color: "#06125C",
            textTransform: "uppercase",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
          }}>
            {item.event_name ?? item.category}
          </span>
        </div>

        {/* Content Body */}
        <div style={{ padding: "20px 22px 22px", flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ ...JK, fontSize: 12, color: "#9CA3AF", fontWeight: 600, marginBottom: 8 }}>
            {new Date(item.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </div>
          
          <div style={{ ...JK, fontSize: 18, fontWeight: 800, color: "#06125C", lineHeight: 1.3, marginBottom: 12 }}>
            {item.title}
          </div>

          {item.excerpt && (
            <div style={{
              ...JK, fontSize: 14, color: "#6B7280", lineHeight: 1.6,
              overflow: "hidden", display: "-webkit-box",
              WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
              marginBottom: 16
            } as React.CSSProperties}>
              {item.excerpt}
            </div>
          )}

          {/* Soft Line Divider */}
          <div style={{ height: "1px", background: "#F3F4F6", width: "100%", marginTop: "auto" }} />

          {/* Footer Section */}
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            paddingTop: 16 
          }}>
            <div style={{ ...JK, fontSize: 15, fontWeight: 800 }}>
              <SlotText isHovered={isHovered}>Read more</SlotText>
            </div>

            {/* Simple Blue Arrow: Hidden when not hovered, Draw animation when hovered */}
            <div style={{ 
              opacity: isHovered ? 1 : 0, 
              visibility: isHovered ? "visible" : "hidden",
              transition: "opacity 0.2s ease, visibility 0.2s ease",
              display: "flex",
              alignItems: "center"
            }}>
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
                style={{
                  transform: isHovered ? "translate(2px, -2px)" : "none",
                  transition: "transform 0.3s ease",
                }}
              >
                <line x1="7" y1="17" x2="17" y2="7"></line>
                <polyline points="7 7 17 7 17 17"></polyline>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function LatestStoriesSection({ news, eventSlug }: { news: any[]; eventSlug: string }) {
  return (
    <div style={{ paddingBottom: 60 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 30, marginTop: 60 }}>
        <span style={{ ...JK, fontSize: 22, fontWeight: 800, color: "#fff" }}>
          Latest Stories
        </span>
        <div style={{ flex: 1, height: 2, background: "rgba(255,255,255,0.2)" }} />
        
        <Link 
          href={`/berita?event=${eventSlug}`}
          style={{
            ...JK, fontSize: 12, fontWeight: 800, color: "#fff", textTransform: "uppercase",
            padding: "8px 16px", border: "1.5px solid rgba(255,255,255,0.7)", 
            borderRadius: 5, textDecoration: "none"
          }}
        >
          see more
        </Link>
      </div>

      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", 
        gap: 20, 
        alignItems: "stretch" 
      }}>
        {news.map((item) => <NewsCard key={item.id} item={item} />)}
      </div>
    </div>
  );
}