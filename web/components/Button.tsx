"use client";
import { useRef } from "react";
import Link from "next/link";
import ArrowIcon from "@/app/icons/arrow-up-right.svg";

// ... (keep ButtonProps and variants/sizes the same)
interface ButtonProps {
    variant?: "primary" | "outline" | "ghost" | "secondary" | "secondary-filled" | "header-outline" | "header-solid";
    size?: "sm" | "md" | "lg";
    href?: string;
    onClick?: (e: React.MouseEvent) => void;
    disabled?: boolean;
    className?: string;
    fixedWidth?: string;
    external?: boolean;
    showIcon?: boolean;
    showShadow?: boolean;
    children: React.ReactNode;
}

const variants = {
  primary:           "bg-[#FFC936] text-zinc-900 border-transparent hover:bg-[#FFC936] font-bold",
  outline:           "bg-transparent text-white border-white hover:bg-white/10 font-semibold",
  ghost:             "bg-transparent text-white/70 border-transparent hover:text-white font-semibold",
  secondary:         "bg-white text-[#0D26C2] border-[#0D26C2] hover:bg-[#0D26C2] hover:text-white font-bold",
  "secondary-filled":"bg-[#0D26C2] text-white border-[#0D26C2] hover:bg-[#0a1faa] font-bold",
  "header-outline":  "border-[1.5px] border-white/70 bg-white/10 text-white hover:bg-white/20 font-bold",
  "header-solid":    "border-[1.5px] border-white bg-white text-[#0D26C2] hover:bg-white/90 font-bold",
};

const sizes = {
  sm: "text-sm px-4 py-[11px] gap-2", // Increased gap slightly
  md: "text-lg px-6 py-3 gap-2",
  lg: "text-lg px-8 py-4 gap-2.5",
};

const base = "inline-flex items-center justify-center border rounded-[5px] uppercase transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";

const STAGGER = 18;
const DUR = "0.5s";
const EASE = "cubic-bezier(0, 1, 0.2, 1)";

function SlotText({ children, isBebas }: { children: React.ReactNode, isBebas: boolean }) {
  const label = typeof children === "string" ? children : "";
  const chars = label.split("");

  return (
    <span style={{ display: "inline-flex", alignItems: "center" }}>
      {chars.map((char, i) => (
        <span
          key={i}
          style={{
            display: "inline-block",
            overflow: "hidden",
            height: "1.1em", // Reduced from 1.2 to tighten the box
            width: char === " " ? "0.25em" : "auto",
            whiteSpace: "pre",
            position: "relative"
          }}
        >
          <span
            className="btn-slot-inner"
            style={{
              display: "flex",
              flexDirection: "column",
              transform: "translateY(0%)",
              transition: `transform ${DUR} ${EASE}`,
            }}
          >
            {/* The translateY corrects for font baseline offset */}
            <span style={{ 
                display: "flex", height: "1.1em", alignItems: "center", justifyContent: "center", whiteSpace: "pre",
                transform: isBebas ? "translateY(0.05em)" : "translateY(0)" 
            }}>{char}</span>
            <span style={{ 
                display: "flex", height: "1.1em", alignItems: "center", justifyContent: "center", whiteSpace: "pre",
                transform: isBebas ? "translateY(0.05em)" : "translateY(0)" 
            }} aria-hidden="true">{char}</span>
          </span>
        </span>
      ))}
    </span>
  );
}

function useSlotHover() {
  const ref = useRef<any>(null);
  const onMouseEnter = () => {
    if (!ref.current) return;
    const slots = ref.current.querySelectorAll(".btn-slot-inner");
    slots.forEach((slot: any, i: number) => {
      slot.style.transitionDelay = `${i * STAGGER}ms`;
      slot.style.transform = "translateY(-50%)";
    });
  };
  const onMouseLeave = () => {
    if (!ref.current) return;
    const slots = ref.current.querySelectorAll(".btn-slot-inner");
    slots.forEach((slot: any, i: number) => {
      slot.style.transitionDelay = `${(slots.length - 1 - i) * STAGGER}ms`;
      slot.style.transform = "translateY(0%)";
    });
  };
  return { ref, onMouseEnter, onMouseLeave };
}

export default function Button({ variant = "primary", size = "md", href, onClick, disabled = false, className = "", fixedWidth, external = false, showIcon = true, showShadow = true, children }: ButtonProps) {
  const classes = `${base} ${variants[variant]} ${sizes[size]} ${className}`;
  const { ref, onMouseEnter, onMouseLeave } = useSlotHover();
  const isHeader = variant.startsWith("header");

  const sharedStyle = {
    fontFamily: isHeader ? "'Plus Jakarta Sans', sans-serif" : "'Bebas Neue', sans-serif",
    textTransform: isHeader ? "none" : "uppercase",
    fontSize: isHeader ? 13 : undefined,
    lineHeight: 1, // Force consistent line height
    ...(showShadow ? { filter: "drop-shadow(0 4px 4px rgba(0,0,0,0.25))" } : {}),
    ...(fixedWidth ? { width: fixedWidth } : {}),
  } as React.CSSProperties;

  const content = (
    <>
      <SlotText isBebas={!isHeader}>{children}</SlotText>
      {showIcon && (
        <ArrowIcon 
          style={{ 
            width: isHeader ? 14 : 16, 
            height: isHeader ? 14 : 16, 
            flexShrink: 0,
            // Visually align icon with text center
            marginTop: isHeader ? "1px" : "0px" 
          }} 
          strokeWidth={30} 
        />
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} ref={ref} className={classes} style={sharedStyle} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
        {content}
      </Link>
    );
  }

  return (
    <button ref={ref} onClick={onClick} disabled={disabled} className={classes} style={sharedStyle} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {content}
    </button>
  );
}