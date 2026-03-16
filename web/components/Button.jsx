import Link from "next/link";
import ArrowIcon from "@/app/icons/arrow-up-right.svg";

/**
 * Button
 *
 * Props:
 *   variant: "primary" | "outline" | "ghost"   default: "primary"
 *   size:    "sm" | "md" | "lg"                default: "md"
 *   href:    string (optional — renders as <Link> if provided, <button> otherwise)
 *   onClick: function (optional)
 *   disabled: boolean (optional)
 *   className: string (optional — for overrides)
 *   children: ReactNode
 *
 * Primary = gold/yellow fill (matches Figma hero CTA)
 * Outline  = transparent with border
 * Ghost    = no border, no background
 */

const variants = {
  primary: "bg-yellow-400 text-zinc-900 border-transparent hover:bg-yellow-300 font-bold",
  outline: "bg-transparent text-white border-white hover:bg-white/10 font-semibold",
  ghost:   "bg-transparent text-white/70 border-transparent hover:text-white font-semibold",
};

const sizes = {
  sm: "text-lg px-4 py-2 gap-1.5",
  md: "text-lg px-5 py-1.5 gap-1",
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

  if (href) {
    return (
      <Link href={href} className={classes} style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
        {children}
        <ArrowIcon style={{ width: 16, height: 16, flexShrink: 0 }} strokeWidth={30} />
      </Link>
    );
  }

  return (
    <button onClick={onClick} disabled={disabled} className={classes} style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
      {children}
    </button>
  );
}