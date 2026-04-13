import { useRef } from "react";
import Link from "next/link";
import ArrowIcon from "@/app/icons/arrow-up-right.svg";

interface ButtonProps {
    variant?: "primary" | "outline" | "ghost" | "secondary" | "secondary-filled";
    size?: "sm" | "md" | "lg";
    href?: string;
    onClick?: (e: React.MouseEvent) => void;
    disabled?: boolean;
    className?: string;
    fixedWidth?: string;   // e.g. "140px" — makes all buttons the same width
    external?: boolean;
    showIcon?: boolean;
    showShadow?: boolean;
    children: React.ReactNode;
}

interface SlotTextProps {
    children: React.ReactNode;
}

const variants = {
  primary:           "bg-[#FFC936] text-zinc-900 border-transparent hover:bg-[#FFC936] font-bold",
  outline:           "bg-transparent text-white border-white hover:bg-white/10 font-semibold",
  ghost:             "bg-transparent text-white/70 border-transparent hover:text-white font-semibold",
  // Blue stroke, white bg — for use on white/light surfaces (table)
  secondary:         "bg-white text-[#0D26C2] border-[#0D26C2] hover:bg-[#0D26C2] hover:text-white font-bold",
  // Solid blue — for active/highlighted states on light surfaces
  "secondary-filled":"bg-[#0D26C2] text-white border-[#0D26C2] hover:bg-[#0a1faa] font-bold",
};

const sizes = {
  sm: "text-lg px-4 py-2 gap-1.5",
  md: "text-lg px-6 py-3 gap-1",
  lg: "text-lg px-8 py-4 gap-2.5",
};

const base = [
  "inline-flex items-center justify-center",
  "border rounded-[5px]",
  "uppercase",
  "transition-colors duration-150",
  "disabled:opacity-50 disabled:pointer-events-none",
  "whitespace-nowrap",
].join(" ");

const STAGGER = 18;
const DUR = "0.5s";
const EASE = "cubic-bezier(0, 1, 0.2, 1)";

function SlotText({ children }: SlotTextProps) {
  const chars = String(children).split("");
  return (
    <span style={{ display: "inline-flex", lineHeight: 1 }}>
      {chars.map((char, i) => (
        <span
          key={i}
          style={{
            display: "inline-block",
            overflow: "hidden",
            height: "1em",
            whiteSpace: char === " " ? "pre" : "normal",
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
            <span style={{ display: "block", lineHeight: 1 }}>{char}</span>
            <span style={{ display: "block", lineHeight: 1 }} aria-hidden="true">{char}</span>
          </span>
        </span>
      ))}
    </span>
  );
}

function useSlotHover() {
  const ref = useRef(null);

  const onMouseEnter = () => {
    if (!ref.current) return;
    const slots = ref.current.querySelectorAll(".btn-slot-inner");
    slots.forEach((slot, i) => {
      slot.style.transitionDelay = `${i * STAGGER}ms`;
      slot.style.transform = "translateY(-50%)";
    });
  };

  const onMouseLeave = () => {
    if (!ref.current) return;
    const slots = ref.current.querySelectorAll(".btn-slot-inner");
    slots.forEach((slot, i) => {
      slot.style.transitionDelay = `${(slots.length - 1 - i) * STAGGER}ms`;
      slot.style.transform = "translateY(0%)";
    });
  };

  return { ref, onMouseEnter, onMouseLeave };
}

export default function Button({
  variant = "primary",
  size = "md",
  href,
  onClick,
  disabled = false,
  className = "",
  fixedWidth,
  external = false,
  showIcon = true,
  showShadow = true,
  children,
}: ButtonProps) {
  const classes = `${base} ${variants[variant]} ${sizes[size]} ${className}`;
  const { ref, onMouseEnter, onMouseLeave } = useSlotHover();

  const sharedStyle = {
    fontFamily: "'Bebas Neue', sans-serif",
    ...(showShadow ? { filter: "drop-shadow(0 4px 4px rgba(0,0,0,0.25))" } : {}),
    ...(fixedWidth ? { width: fixedWidth } : {}),
  };

  if (href) {
    return (
      <Link
        href={href}
        ref={ref}
        className={classes}
        style={sharedStyle}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        <SlotText>{children}</SlotText>
        {showIcon && (
          <ArrowIcon style={{ width: 16, height: 16, flexShrink: 0 }} strokeWidth={30} />
        )}
      </Link>
    );
  }

  return (
    <button
      ref={ref}
      onClick={onClick}
      disabled={disabled}
      className={classes}
      style={sharedStyle}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <SlotText>{children}</SlotText>
      {showIcon && (
        <ArrowIcon style={{ width: 16, height: 16, flexShrink: 0 }} strokeWidth={30} />
      )}
    </button>
  );
}