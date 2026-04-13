"use client";
import Image from "next/image";
import Link from "next/link";
import { useRef, useEffect, useState } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const DESKTOP_BP   = 1024;
const SLOT_STAGGER = 18;
const SLOT_DUR     = "0.5s";
const SLOT_EASE = "cubic-bezier(0, 1, 0.2, 1)";

// Aligned to other sections (StatSection / NewsSection)
const SCALE_START = 1440;
const SCALE_FLOOR = 0.78;

const NAV_LINKS = [
  { href: "/",         label: "Beranda"  },
  { href: "/events",   label: "Event"    },
  { href: "/schedule", label: "Schedule" },
  { href: "/news",     label: "Stories"  },
];

const F = {
  display: "'Bebas Neue', sans-serif",
  body:    "'Plus Jakarta Sans', sans-serif",
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
function useContainerWidth(ref) {
  const [width, setWidth] = useState(SCALE_START);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function update(w) {
      setWidth(w);
      // On mobile, keep --s: 1 so compact blocks render at natural size.
      // On desktop, scale shrinks from 1→SCALE_FLOOR as viewport narrows.
      const s = w < DESKTOP_BP ? 1 : Math.max(SCALE_FLOOR, Math.min(1, w / SCALE_START));
      el.style.setProperty("--s", String(s));
    }

    // Measure immediately to avoid a flash of wrong layout
    update(el.getBoundingClientRect().width);

    const ro = new ResizeObserver(([e]) => update(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  return width;
}

// ─── Slot hover ───────────────────────────────────────────────────────────────
function useSlotHover() {
  const ref = useRef(null);
  const animate = (dir) => {
    if (!ref.current) return;
    const slots = ref.current.querySelectorAll(".slot-inner");
    slots.forEach((slot, i) => {
      slot.style.transitionDelay = `${(dir === "in" ? i : slots.length - 1 - i) * SLOT_STAGGER}ms`;
      slot.style.transform = dir === "in" ? "translateY(-50%)" : "translateY(0%)";
    });
  };
  return { ref, onMouseEnter: () => animate("in"), onMouseLeave: () => animate("out") };
}

// ─── Primitives ───────────────────────────────────────────────────────────────
function SlotText({ children }) {
  return (
    <span style={{ display: "inline-flex", lineHeight: 1 }}>
      {String(children).split("").map((char, i) => (
        <span
          key={i}
          style={{ display: "inline-block", overflow: "hidden", height: "1em", whiteSpace: char === " " ? "pre" : "normal" }}
        >
          <span
            className="slot-inner"
            style={{ display: "flex", flexDirection: "column", transform: "translateY(0%)", transition: `transform ${SLOT_DUR} ${SLOT_EASE}` }}
          >
            <span style={{ display: "block", lineHeight: 1 }}>{char}</span>
            <span style={{ display: "block", lineHeight: 1 }} aria-hidden="true">{char}</span>
          </span>
        </span>
      ))}
    </span>
  );
}

function NavLink({ href, label }) {
  const { ref, onMouseEnter, onMouseLeave } = useSlotHover();
  return (
    <Link
      ref={ref} href={href}
      onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}
      className="block text-white/60 hover:text-white transition-colors"
      style={{ fontFamily: F.body, fontSize: "calc(15px * var(--s))", fontWeight: 500, letterSpacing: "0.01em" }}
    >
      <SlotText>{label}</SlotText>
    </Link>
  );
}

// size: number → mobile (React auto-adds "px"), string → desktop CSS expression
function SectionHeading({ children, size }) {
  const isCompact = typeof size === "number";
  return (
    <h3
      className="text-white"
      style={{
        fontFamily:    F.display,
        fontSize:      size ?? "calc(22px * var(--s))",
        letterSpacing: "0.06em",
        lineHeight:    1,
        marginBottom:  isCompact ? 10 : "calc(10px * var(--s))",
      }}
    >
      {children}
    </h3>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "rgba(255,255,255,0.12)" }} />;
}

// ─── Blocks ───────────────────────────────────────────────────────────────────
function BrandingBlock({ compact = false }) {
  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <Image src="/IWDC-logo.svg" alt="IWDC Logo" width={52} height={52} className="object-contain flex-shrink-0" />
        <div>
          <p className="text-white leading-none" style={{ fontFamily: F.display, fontSize: 26, letterSpacing: "0.06em" }}>IWDC</p>
          <p className="text-white/60 leading-snug" style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600 }}>
            IPB Web Dev<br />Community
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center" style={{ gap: "calc(12px * var(--s))" }}>
      <Image
        src="/IWDC-logo.svg" alt="IWDC Logo" width={80} height={80}
        style={{ width: "calc(72px * var(--s))", height: "calc(72px * var(--s))" }}
        className="object-contain flex-shrink-0"
      />
      <div>
        <p className="text-white leading-none" style={{ fontFamily: F.display, fontSize: "calc(34px * var(--s))", letterSpacing: "0.06em" }}>IWDC</p>
        <p className="text-white/60 leading-snug" style={{ fontFamily: F.body, fontSize: "calc(13px * var(--s))", fontWeight: 600 }}>
          IPB Web Dev<br />Community
        </p>
      </div>
    </div>
  );
}

function CollabNote({ centered = false }) {
  return (
    <p
      className="text-white/40"
      style={{ fontFamily: F.body, fontSize: "calc(13px * var(--s))", fontStyle: "italic", lineHeight: 1.5, textAlign: centered ? "center" : "left" }}
    >
      In collaboration by<br /><span className="text-white/70">Ditmawa IPB x IWDC</span>
    </p>
  );
}

function NavBlock({ headingSize, gap, columns = 1 }) {
  return (
    <div>
      <SectionHeading size={headingSize}>Navigasi</SectionHeading>
      <nav style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: gap ?? "calc(12px * var(--s))" }}>
        {NAV_LINKS.map(({ href, label }) => <NavLink key={href} href={href} label={label} />)}
      </nav>
    </div>
  );
}

function ContactBlock({ compact = false }) {
  return (
    <div>
      <SectionHeading size={compact ? 17 : undefined}>Contact</SectionHeading>
      <address
        className="not-italic text-white/60"
        style={{ fontFamily: F.body, fontSize: compact ? 13 : "calc(14px * var(--s))", fontWeight: 500, lineHeight: 1.6 }}
      >
        <span style={{ display: "block" }}>Email:</span>
        <a href="mailto:ditmawa@apps.ipc.ac.id" className="hover:text-white transition-colors" style={{ display: "block", marginBottom: "0.4em", whiteSpace: "nowrap" }}>
          ditmawa@apps.ipc.ac.id
        </a>
        <span style={{ display: "block" }}>Whatsapp:</span>
        <a href="https://wa.me/081761761712" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" style={{ display: "block", whiteSpace: "nowrap" }}>
          wa.me/081761761712
        </a>
      </address>
    </div>
  );
}

function LocationBlock({ compact = false }) {
  return (
    <div style={{ maxWidth: compact ? undefined : "calc(200px * var(--s))" }}>
      <SectionHeading size={compact ? 17 : undefined}>Location</SectionHeading>
      <address
        className="not-italic text-white/60"
        style={{ fontFamily: F.body, fontSize: compact ? 13 : "calc(14px * var(--s))", fontWeight: 500, lineHeight: 1.6 }}
      >
        IPB University, Gedung Rektorat Andi Hakim Nasution, Lt 1, Babakan, Dramaga, Bogor Regency, West Java 16680
      </address>
    </div>
  );
}

// ─── Batik Overlay ────────────────────────────────────────────────────────────
function BatikOverlay({ opacity = 1 }) {
  const base = {
    backgroundImage:    "url('/Batik_Pattern_dark.svg')",
    backgroundRepeat:   "repeat",
    backgroundSize:     "auto",
    transform:          "rotate(180deg)",
  };
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0" style={{ ...base, opacity }} />
      <div className="absolute inset-0" style={{ ...base, opacity: opacity * 0.7 }} />
    </div>
  );
}

// ─── Desktop Layout ───────────────────────────────────────────────────────────
//
//  Footer is `position: relative, overflow: visible` so the mascot can poke
//  up above the footer edge.
//
//  Mascot is absolutely positioned: pinned to bottom of the footer,
//  left-offset relative to hPad so it sits naturally between branding and
//  the right columns. Width/height are JS-computed from `s` so they never
//  drift from each other.
//
//  Left column: branding on top, CollabNote directly below — no flex tricks.
//  Right group: Nav + Contact + Location, top-aligned, proportional gap.
//
function DesktopFooter({ cw }) {
  const s = Math.max(SCALE_FLOOR, Math.min(1, cw / SCALE_START));

  const hPad   = Math.min(160, Math.max(32, cw * 0.0833));
  const colGap = Math.min(56,  Math.max(20, cw * 0.033));
  const vPad   = Math.round(60 * s);

  // Mascot: grows/shrinks 1:1 with the scale factor
  const mascotW = Math.round(380 * s);
  const mascotH = Math.round(mascotW * 1.25); // natural aspect 800×1000

  // Horizontal centre of the mascot: just to the right of the branding block
  // (~260px wide at s=1). Clamp so it never overlaps the right columns.
  const mascotLeft = Math.round(hPad + 120 * s);

  return (
    // `overflow: visible` so mascot overflows upward out of the footer
    <div
      className="relative z-10"
      style={{
        display:        "flex",
        alignItems:     "flex-start",
        justifyContent: "space-between",
        paddingInline:  hPad,
        paddingTop:     vPad,
        paddingBottom:  vPad,
        // Give the footer enough height that the mascot doesn't look cramped.
        // The mascot overflows upward, so bottom padding is what matters here.
        minHeight:      Math.round(160 * s),
      }}
    >
      {/* ── LEFT: branding + collab, stacked normally ────────────────────── */}
      <div style={{
        display:       "flex",
        flexDirection: "column",
        gap:           "calc(16px * var(--s))",
        flexShrink:    0,
      }}>
        <BrandingBlock />
        <CollabNote />
      </div>

      {/* ── MASCOT: absolutely placed, overflows upward ───────────────────── */}
      <Image
        src="/maskot/maskot2.png"
        width={800}
        height={1000}
        quality={100}
        style={{
          position: "absolute",
          bottom:   -100,
          left:     mascotLeft,
          width:    mascotW,
          height:   "auto",
          zIndex:   3,
          pointerEvents: "none",
        }}
      />

      {/* ── RIGHT: nav + contact + location ─────────────────────────────── */}
      <div style={{
        display:    "flex",
        alignItems: "flex-start",
        gap:        colGap,
      }}>
        <NavBlock />
        <ContactBlock />
        <LocationBlock />
      </div>
    </div>
  );
}

// ─── Mobile Layout ────────────────────────────────────────────────────────────
function MobileFooter() {
  return (
    <div className="relative z-10 flex flex-col" style={{ paddingInline: 24, paddingTop: 36, paddingBottom: 48, gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
        <div className="flex flex-col gap-4">
          <BrandingBlock compact />
          <CollabNote />
        </div>
        <NavBlock headingSize={17} gap={10} columns={2} />
      </div>

      <Divider />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <ContactBlock compact />
        <LocationBlock compact />
      </div>

      <p style={{ fontFamily: F.body, fontSize: 11, color: "rgba(255,255,255,0.30)", textAlign: "center", letterSpacing: "0.04em" }}>
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
    <footer
      ref={ref}
      style={{
        position:   "relative",
        zIndex:     10,
        background: "linear-gradient(to bottom, #0D26C2, #06125C)",
        overflow:   isMobile ? "hidden" : "hidden",
      }}
    >
      <BatikOverlay opacity={isMobile ? 0.5 : 1} />
      {isMobile ? <MobileFooter /> : <DesktopFooter cw={cw} />}
    </footer>
  );
}