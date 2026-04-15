"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import Button from "@/components/Button"; 

const JK = { fontFamily: "'Plus Jakarta Sans', sans-serif" } as const;

// Animation Constants
const STAGGER = 18;
const DUR = "0.5s";
const EASE = "cubic-bezier(0, 1, 0.2, 1)";
const YELLOW = "#FFC936";
const BLUE = "#0D26C2";

/**
 * Placeholder Card with updated Batik styling
 */
function NewsPlaceholder() {
  return (
    <div style={{
      position: "relative",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 8,
      boxShadow: "0 0 0 2px rgba(255, 255, 255, 0.15)",
      background: "rgba(255, 255, 255, 0.03)",
      backdropFilter: "blur(4px)",
      padding: "40px",
      height: "100%",
      minHeight: 380,
      overflow: "hidden" 
    }}>
      {/* BATIK LAGI */}
      <div style={{
        position: "absolute",
        inset: 0,
        backgroundImage: "url(/Batik_Pattern_white.svg)",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        opacity: 0.15,
        pointerEvents: "none",
        zIndex: 0,
        filter: "blur(1.5px)",
      }} />

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" style={{ marginBottom: 12 }}>
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span style={{ 
          ...JK,
          fontSize: "11px", 
          fontWeight: 800, 
          color: "rgba(255,255,255,0.4)", 
          textTransform: "uppercase",
          letterSpacing: "0.12em"
        }}>
          Coming Soon
        </span>
      </div>
    </div>
  );
}

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
        // Perfectly consistent 2px stroke thickness
        boxShadow: isHovered 
          ? `0 0 0 2px ${YELLOW}, 0 0 20px rgba(255, 201, 54, 0.35)` 
          : "0 0 0 2px #FFFFFF", 
      }}
    >
      <div style={{ background: "#fff", borderRadius: 6, overflow: "hidden", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{
          height: 200, position: "relative",
          backgroundImage: item.thumbnail_url ? `url(${item.thumbnail_url})` : "none",
          backgroundColor: "#E5E7EB", backgroundSize: "cover", backgroundPosition: "center",
          flexShrink: 0,
        }}>
          <span style={{
            ...JK, position: "absolute", top: 12, left: 12, fontSize: 10, fontWeight: 800, letterSpacing: "0.05em",
            padding: "5px 10px", borderRadius: 4, background: isHovered ? YELLOW : "#FFFFFF", color: isHovered ? "#000" : "#06125C",
            textTransform: "uppercase", boxShadow: "0 2px 4px rgba(0,0,0,0.1)", transition: "all 0.3s ease"
          }}>{item.event_name ?? item.category}</span>
        </div>

        <div style={{ padding: "20px 22px 22px", flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ ...JK, fontSize: 12, color: "#9CA3AF", fontWeight: 600, marginBottom: 8 }}>
            {new Date(item.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </div>
          <div style={{ ...JK, fontSize: 18, fontWeight: 800, color: "#06125C", lineHeight: 1.3, marginBottom: 12 }}>{item.title}</div>
          {item.excerpt && (
            <div style={{ ...JK, fontSize: 14, color: "#6B7280", lineHeight: 1.6, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", marginBottom: 16 } as React.CSSProperties}>
              {item.excerpt}
            </div>
          )}
          <div style={{ height: "1px", background: "#F3F4F6", width: "100%", marginTop: "auto" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 16 }}>
            <div style={{ ...JK, fontSize: 15, fontWeight: 800 }}>
              <SlotText isHovered={isHovered}>Read more</SlotText>
            </div>
            <div style={{ opacity: isHovered ? 1 : 0, visibility: isHovered ? "visible" : "hidden", transition: "opacity 0.2s ease", display: "flex" }}>
              <svg ref={arrowRef} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isHovered ? "translate(2px, -2px)" : "none", transition: "transform 0.3s ease" }}>
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

export default function LatestStoriesSection({ news, eventSlug, isMobile }: { news: any[]; eventSlug: string; isMobile: boolean }) {
  const MIN_ITEMS = 4;
  const placeholders = Array.from({ length: Math.max(0, MIN_ITEMS - news.length) });

  return (
    <div style={{ paddingBottom: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 30, marginTop: 60 }}>
        <span style={{ ...JK, fontSize: 22, fontWeight: 800, color: "#fff", whiteSpace: "nowrap" }}>
          Latest Stories
        </span>
        <div style={{ flex: 1, height: 2, background: "rgba(255,255,255,0.2)" }} />
        
        {/* CTA */}
        <Button 
          variant="header-outline" 
          size="sm" 
          href={`/berita?event=${eventSlug}`}
          showShadow={false}
        >
          see more
        </Button>
      </div>

      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", 
        gap: 20, 
        alignItems: "stretch" 
      }}>
        {news.map((item) => <NewsCard key={item.id} item={item} />)}

        {/* NO PLACEHOLDERS ON MOBILE */}
        {!isMobile && placeholders.map((_, i) => (
          <NewsPlaceholder key={`p-${i}`} />
        ))}
      </div>
    </div>
  );
}