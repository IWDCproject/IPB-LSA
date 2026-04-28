"use client";
import { useState } from "react";
import Link from "next/link";
import ArrowIcon from "@/app/icons/arrow-up-right.svg";

const STAGGER = 18;
const DUR = "0.5s";
const EASE = "cubic-bezier(0, 1, 0.2, 1)";

function SlotText({ children, isHovered }: { children: string; isHovered: boolean }) {
  const chars = String(children).split("");
  return (
    <>
      <span className="sr-only">{children}</span>
      <span aria-hidden="true" style={{ display: "inline-flex", alignItems: "center" }}>
        {chars.map((char, i) => (
          <span
            key={i}
            style={{
              display: "inline-block",
              overflow: "hidden",
              height: "1.1em",
              whiteSpace: char === " " ? "pre" : "normal",
            }}
          >
            <span
              style={{
                display: "flex",
                flexDirection: "column",
                transform: isHovered ? "translateY(-50%)" : "translateY(0%)",
                transition: `transform ${DUR} ${EASE}`,
                transitionDelay: isHovered ? `${i * STAGGER}ms` : "0ms",
              }}
            >
              <span style={{ display: "block", height: "1.1em", lineHeight: "1.1em" }}>{char}</span>
              <span style={{ display: "block", height: "1.1em", lineHeight: "1.1em" }}>{char}</span>
            </span>
          </span>
        ))}
      </span>
    </>
  );
}

export default function EventLink({ href, name }: { href: string; name: string }) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <Link
      href={href}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 14,
        fontWeight: 700,
        color: "#374151",
        textDecoration: "none",
        display: "inline-flex",
        alignItems: "center",
        lineHeight: 1,
        gap: 6,
      }}
    >
      <SlotText isHovered={isHovered}>{name}</SlotText>
      <ArrowIcon style={{ width: 14, height: 14, flexShrink: 0, marginTop: 2 }} strokeWidth={30} />
    </Link>
  );
}