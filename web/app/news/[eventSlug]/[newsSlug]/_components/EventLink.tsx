"use client";
import { useRef } from "react";
import Link from "next/link";
import ArrowIcon from "@/app/icons/arrow-up-right.svg";

const STAGGER = 18;
const DUR = "0.5s";
const EASE = "cubic-bezier(0, 1, 0.2, 1)";

function useSlotHover() {
  const ref = useRef<any>(null);
  const onMouseEnter = () => {
    if (!ref.current) return;
    const slots = ref.current.querySelectorAll(".el-slot-inner");
    slots.forEach((slot: any, i: number) => {
      slot.style.transitionDelay = `${i * STAGGER}ms`;
      slot.style.transform = "translateY(-50%)";
    });
  };
  const onMouseLeave = () => {
    if (!ref.current) return;
    const slots = ref.current.querySelectorAll(".el-slot-inner");
    slots.forEach((slot: any, i: number) => {
      slot.style.transitionDelay = `${(slots.length - 1 - i) * STAGGER}ms`;
      slot.style.transform = "translateY(0%)";
    });
  };
  return { ref, onMouseEnter, onMouseLeave };
}

function SlotText({ children }: { children: string }) {
  const chars = children.split("");
  return (
    <span style={{ display: "inline-flex", alignItems: "center" }}>
      {chars.map((char, i) => (
        <span key={i} style={{
          display: "inline-block", overflow: "hidden",
          height: "1.1em", width: char === " " ? "0.25em" : "auto",
          whiteSpace: "pre", position: "relative",
        }}>
          <span
            className="el-slot-inner"
            style={{
              display: "flex", flexDirection: "column",
              transform: "translateY(0%)",
              transition: `transform ${DUR} ${EASE}`,
            }}
          >
            <span style={{ display: "flex", height: "1.1em", alignItems: "center", justifyContent: "center", whiteSpace: "pre", transform: "translateY(0)" }}>{char}</span>
            <span style={{ display: "flex", height: "1.1em", alignItems: "center", justifyContent: "center", whiteSpace: "pre", transform: "translateY(0)" }} aria-hidden="true">{char}</span>
          </span>
        </span>
      ))}
    </span>
  );
}

export default function EventLink({ href, name }: { href: string; name: string }) {
  const { ref, onMouseEnter, onMouseLeave } = useSlotHover();
  return (
    <Link
      href={href}
      ref={ref}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 14, fontWeight: 700,
        color: "#374151",
        textDecoration: "none",
        display: "inline-flex", alignItems: "center",
        lineHeight: 1, gap: 6,
      }}
    >
      <SlotText>{name}</SlotText>
      <ArrowIcon style={{ width: 14, height: 14, flexShrink: 0, marginTop: 2 }} strokeWidth={30} />
    </Link>
  );
}