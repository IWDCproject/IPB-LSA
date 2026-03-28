"use client";
import Image from "next/image";
import Link from "next/link";
import { useRef, useEffect, useState } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const DESKTOP_BP = 720;
const SLOT_STAGGER = 18;
const SLOT_DUR = "0.4s";
const SLOT_EASE = "cubic-bezier(0.76, 0, 0.24, 1)";

const NAV_LINKS = [
  { href: "/",         label: "Beranda"  },
  { href: "/events",   label: "Event"    },
  { href: "/schedule", label: "Schedule" },
  { href: "/news",     label: "Stories"  },
];

const FONTS = {
  display: "'Bebas Neue', sans-serif",
  body:    "'Plus Jakarta Sans', sans-serif",
};

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useContainerWidth(ref) {
  const [width, setWidth] = useState(1200);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

function useSlotHover() {
  const ref = useRef(null);
  const animate = (dir) => {
    if (!ref.current) return;
    const slots = ref.current.querySelectorAll(".slot-inner");
    const n = slots.length;
    slots.forEach((slot, i) => {
      slot.style.transitionDelay = `${(dir === "in" ? i : n - 1 - i) * SLOT_STAGGER}ms`;
      slot.style.transform = dir === "in" ? "translateY(-50%)" : "translateY(0%)";
    });
  };
  return { ref, onMouseEnter: () => animate("in"), onMouseLeave: () => animate("out") };
}

// ─── Slot Text ────────────────────────────────────────────────────────────────
function SlotText({ children }) {
  return (
    <span style={{ display: "inline-flex", lineHeight: 1 }}>
      {String(children).split("").map((char, i) => (
        <span key={i} style={{ display: "inline-block", overflow: "hidden", height: "1em", whiteSpace: char === " " ? "pre" : "normal" }}>
          <span className="slot-inner" style={{ display: "flex", flexDirection: "column", transform: "translateY(0%)", transition: `transform ${SLOT_DUR} ${SLOT_EASE}` }}>
            <span style={{ display: "block", lineHeight: 1 }}>{char}</span>
            <span style={{ display: "block", lineHeight: 1 }} aria-hidden="true">{char}</span>
          </span>
        </span>
      ))}
    </span>
  );
}

// ─── UI Atoms ─────────────────────────────────────────────────────────────────
function NavLink({ href, label }) {
  const { ref, onMouseEnter, onMouseLeave } = useSlotHover();
  return (
    <Link ref={ref} href={href} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}
      className="block text-white/60 hover:text-white transition-colors"
      style={{ fontFamily: FONTS.body, fontSize: 15, fontWeight: 500, letterSpacing: "0.01em" }}>
      <SlotText>{label}</SlotText>
    </Link>
  );
}

function SectionHeading({ children, size = 22 }) {
  return (
    <h3 className="text-white" style={{ fontFamily: FONTS.display, fontSize: size, letterSpacing: "0.06em", lineHeight: 1, marginBottom: 10 }}>
      {children}
    </h3>
  );
}

function Label({ children }) {
  return <p className="text-white/60" style={{ fontFamily: FONTS.body, fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{children}</p>;
}

function BodyText({ children, size = 15, ...props }) {
  return <p className="text-white/60" style={{ fontFamily: FONTS.body, fontSize: size, fontWeight: 500 }} {...props}>{children}</p>;
}

function Divider() {
  return <div style={{ height: 1, background: "rgba(255,255,255,0.12)" }} />;
}

// ─── Shared Blocks ────────────────────────────────────────────────────────────
function BrandingBlock({ compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <Image src="/IWDC-logo.svg" alt="IWDC Logo" width={compact ? 52 : 80} height={compact ? 52 : 80} className="object-contain flex-shrink-0" />
      <div>
        <p className="text-white leading-none" style={{ fontFamily: FONTS.display, fontSize: compact ? 26 : 34, letterSpacing: "0.06em" }}>IWDC</p>
        <p className="text-white/60 leading-snug" style={{ fontFamily: FONTS.body, fontSize: compact ? 11 : 13, fontWeight: 600 }}>
          IPB Web Dev<br />Community
        </p>
      </div>
    </div>
  );
}

function CollabNote({ centered = false }) {
  return (
    <p className="text-white/40" style={{ fontFamily: FONTS.body, fontSize: 13, fontStyle: "italic", lineHeight: 1.5, textAlign: centered ? "center" : "left" }}>
      In collaboration by<br /><span className="text-white/70">Ditmawa IPB x IWDC</span>
    </p>
  );
}

function NavBlock({ headingSize = 22, gap = 12 }) {
  return (
    <div>
      <SectionHeading size={headingSize}>Navigasi</SectionHeading>
      <nav style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap }}>
        {NAV_LINKS.map(({ href, label }) => <NavLink key={href} href={href} label={label} />)}
      </nav>
    </div>
  );
}

function ContactBlock({ compact = false }) {
  const size = compact ? 13 : 15;
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <SectionHeading size={compact ? 17 : 22}>Contact</SectionHeading>
      <address className="not-italic text-white/60" style={{ fontFamily: FONTS.body, fontSize: size, fontWeight: 500, lineHeight: 1.6 }}>
        <span style={{ display: "block" }}>Email:</span>
        <a href="mailto:ditmawa@apps.ipc.ac.id" className="hover:text-white transition-colors break-all" style={{ display: "block", marginBottom: "0.4em" }}>
          ditmawa@apps.ipc.ac.id
        </a>
        <span style={{ display: "block" }}>Whatsapp:</span>
        <a href="https://wa.me/081761761712" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" style={{ display: "block" }}>
          wa.me/081761761712
        </a>
      </address>
    </div>
  );
}

function LocationBlock({ compact = false }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <SectionHeading size={compact ? 17 : 22}>Location</SectionHeading>
      <address className="not-italic text-white/60" style={{ fontFamily: FONTS.body, fontSize: compact ? 13 : 15, fontWeight: 500, lineHeight: 1.6 }}>
        IPB University, Gedung Rektorat Andi Hakim Nasution, Lt 1, Babakan, Dramaga, Bogor Regency, West Java 16680
      </address>
    </div>
  );
}

// ─── Batik Overlay ────────────────────────────────────────────────────────────
function BatikOverlay({ opacity = 1 }) {
  const base = { backgroundImage: "url('/Batik_Pattern_dark.svg')", backgroundRepeat: "repeat", backgroundSize: "auto", transform: "rotate(180deg)" };
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0" style={{ ...base, opacity }} />
      <div className="absolute inset-0" style={{ ...base, opacity: opacity * 0.7 }} />
    </div>
  );
}

// ─── Layouts ──────────────────────────────────────────────────────────────────
function DesktopFooter() {
  return (
    <div className="relative z-10 flex items-stretch justify-between"
      style={{ paddingInline: "clamp(40px, 8.33vw, 160px)", paddingBlock: 60, gap: "clamp(24px, 4vw, 64px)" }}>
      <div className="flex flex-col justify-between" style={{ minWidth: 200, maxWidth: 280 }}>
        <BrandingBlock />
        <CollabNote />
      </div>

      <div style={{ flexShrink: 0, width: 380, position: "relative" }}>
        <Image src="/maskot/maskot2.png" width={800} height={1000} quality={100}
          style={{ position: "absolute", top: -50, left: -100, width: "100%", height: "auto" }} />
      </div>

      <NavBlock />
      <div style={{ minWidth: 200 }}><ContactBlock /></div>
      <div style={{ maxWidth: 260 }}><LocationBlock /></div>
    </div>
  );
}

function MobileFooter() {
  return (
    <div className="relative z-10 flex flex-col" style={{ paddingInline: 24, paddingTop: 36, paddingBottom: 48, gap: 20 }}>

      {/* Row 1: Branding + Nav */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
        <div className="flex flex-col gap-4">
          <BrandingBlock compact />
          <CollabNote />
        </div>
        <NavBlock headingSize={17} gap={10} />
      </div>

      <Divider />

      {/* Row 2: Contact + Location */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <ContactBlock compact />
        <LocationBlock compact />
      </div>

      <p style={{ fontFamily: FONTS.body, fontSize: 11, color: "rgba(255,255,255,0.30)", textAlign: "center", letterSpacing: "0.04em" }}>
        © 2025 IWDC · Ditmawa IPB x IWDC
      </p>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function Footer() {
  const ref      = useRef(null);
  const cw       = useContainerWidth(ref);
  const isMobile = cw < DESKTOP_BP;

  return (
    <footer ref={ref} style={{ position: "relative", zIndex: 10, background: "linear-gradient(to bottom, #0D26C2, #06125C)", overflow: isMobile ? "visible" : "hidden" }}>
      <BatikOverlay opacity={isMobile ? 0.5 : 1} />
      {isMobile ? <MobileFooter /> : <DesktopFooter />}
    </footer>
  );
}