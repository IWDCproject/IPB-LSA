"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Slot animation
const STAGGER = 18;
const DUR     = "0.5s";
const EASE = "cubic-bezier(0, 1, 0.2, 1)";

// breakpoint where the header starts getting tight and needs to compress
const COMPRESS_W = 900;
const MOBILE_W   = 1024;

function SlotText({ children }) {
  const chars = String(children).split("");
  return (
    <span style={{ display: "inline-flex", lineHeight: 1 }}>
      {chars.map((char, i) => (
        <span
          key={i}
          style={{
            display:    "inline-block",
            overflow:   "hidden",
            height:     "1em",
            whiteSpace: char === " " ? "pre" : "normal",
          }}
        >
          <span
            className="nav-slot-inner"
            style={{
              display:       "flex",
              flexDirection: "column",
              transform:     "translateY(0%)",
              transition:    `transform ${DUR} ${EASE}`,
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
    const slots = ref.current.querySelectorAll(".nav-slot-inner");
    slots.forEach((slot, i) => {
      slot.style.transitionDelay = `${i * STAGGER}ms`;
      slot.style.transform       = "translateY(-50%)";
    });
  };

  const onMouseLeave = () => {
    if (!ref.current) return;
    const slots = ref.current.querySelectorAll(".nav-slot-inner");
    slots.forEach((slot, i) => {
      slot.style.transitionDelay = `${(slots.length - 1 - i) * STAGGER}ms`;
      slot.style.transform       = "translateY(0%)";
    });
  };

  return { ref, onMouseEnter, onMouseLeave };
}

function NavLink({ href, label, active, fontSize }) {
  const { ref, onMouseEnter, onMouseLeave } = useSlotHover();

  return (
    <Link
      ref={ref}
      href={href}
      className={`font-bold tracking-widest uppercase transition-colors
        ${active ? "text-blue-900" : "text-gray-500 hover:text-blue-900"}`}
      style={{ fontSize }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <SlotText>{label}</SlotText>
    </Link>
  );
}

export default function Header() {
  const pathname  = usePathname();
  const headerRef = useRef(null);
  const [cw, setCw] = useState(1920);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const apply = (w) => setCw(w);
    const ro = new ResizeObserver(([e]) => apply(e.contentRect.width));
    ro.observe(el);
    apply(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  const isMobile   = cw < MOBILE_W;
  const isCompress = cw < COMPRESS_W;

  // nav items stay fixed size, only margins/gap shrink with viewport
  const navGap  = isMobile ? 16 : isCompress ? 20 : 32;
  const fontSize = isMobile ? 11 : isCompress ? 12 : 14;

  const links = [
    { href: "/",         label: "Beranda"  },
    { href: "/events",   label: "Event"    },
    { href: "/news",     label: "Berita"   },
    { href: "/schedule", label: "Schedule" },
  ];

  return (
    <header ref={headerRef} className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div
        className="flex items-center justify-between py-2"
        style={{
          paddingLeft:  isMobile ? 20 : "clamp(40px, 8.33vw, 160px)",
          paddingRight: isMobile ? 20 : "clamp(40px, 8.33vw, 160px)",
        }}
      >
        <Link href="/">
          <Image src="/ipb-logo.png" alt="IPB University" height={64} width={200} className="h-12 w-auto" />
        </Link>
        <nav
          className="flex items-center"
          style={{ gap: navGap }}
        >
          {links.map(({ href, label }) => (
            <NavLink
              key={href}
              href={href}
              label={label}
              active={pathname === href}
              fontSize={fontSize}
            />
          ))}
        </nav>
      </div>
    </header>
  );
}