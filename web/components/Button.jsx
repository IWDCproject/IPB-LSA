import { useRef } from "react";
import Link from "next/link";
import ArrowIcon from "@/app/icons/arrow-up-right.svg";


const variants = {
  primary: "bg-yellow-400 text-zinc-900 border-transparent hover:bg-yellow-300 font-bold",
  outline: "bg-transparent text-white border-white hover:bg-white/10 font-semibold",
  ghost:   "bg-transparent text-white/70 border-transparent hover:text-white font-semibold",
};

const sizes = {
  sm: "text-lg px-4 py-2 gap-1.5",
  md: "text-lg px-5 py-2.5 gap-1",
  lg: "text-lg px-8 py-4 gap-2.5",
};

const base = [
  "inline-flex items-center justify-center",
  "border rounded-[7px]",
  "uppercase",
  "transition-colors duration-150",
  "disabled:opacity-50 disabled:pointer-events-none",
  "whitespace-nowrap",
].join(" ");

const STAGGER = 18;
const DUR = "0.4s";
const EASE = "cubic-bezier(0.76, 0, 0.24, 1)";

function SlotText({ children }) {
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
  children,
}) {
  const classes = `${base} ${variants[variant]} ${sizes[size]} ${className}`;
  const { ref, onMouseEnter, onMouseLeave } = useSlotHover();

  if (href) {
    return (
      <Link
        href={href}
        ref={ref}
        className={classes}
        style={{ fontFamily: "'Bebas Neue', sans-serif" }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <SlotText>{children}</SlotText>
        <ArrowIcon style={{ width: 16, height: 16, flexShrink: 0 }} strokeWidth={30} />
      </Link>
    );
  }

  return (
    <button
      ref={ref}
      onClick={onClick}
      disabled={disabled}
      className={classes}
      style={{ fontFamily: "'Bebas Neue', sans-serif" }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <SlotText>{children}</SlotText>
    </button>
  );
}