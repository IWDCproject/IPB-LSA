"use client";
import Image from "next/image";
import Link from "next/link";
import { useRef, useEffect, useState } from "react";

// ── Slot animation ─────────────────────────────────────────────────────────────
const STAGGER = 18;
const DUR     = "0.4s";
const EASE    = "cubic-bezier(0.76, 0, 0.24, 1)";

// ── Layout breakpoint ──────────────────────────────────────────────────────────
const DESKTOP_BP = 720;

// ── useContainerWidth (mirrors StatSection pattern) ───────────────────────────
function useContainerWidth(ref) {
  const [width, setWidth] = useState(1200);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  return width;
}

// ── Slot text animation ────────────────────────────────────────────────────────
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
            className="footer-slot-inner"
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
    const slots = ref.current.querySelectorAll(".footer-slot-inner");
    slots.forEach((slot, i) => {
      slot.style.transitionDelay = `${i * STAGGER}ms`;
      slot.style.transform       = "translateY(-50%)";
    });
  };

  const onMouseLeave = () => {
    if (!ref.current) return;
    const slots = ref.current.querySelectorAll(".footer-slot-inner");
    slots.forEach((slot, i) => {
      slot.style.transitionDelay = `${(slots.length - 1 - i) * STAGGER}ms`;
      slot.style.transform       = "translateY(0%)";
    });
  };

  return { ref, onMouseEnter, onMouseLeave };
}

function FooterNavLink({ href, label }) {
  const { ref, onMouseEnter, onMouseLeave } = useSlotHover();

  return (
    <Link
      ref={ref}
      href={href}
      className="block text-white/60 hover:text-white transition-colors"
      style={{
        fontFamily:    "'Plus Jakarta Sans', sans-serif",
        fontSize:      16,
        fontWeight:    500,
        letterSpacing: "0.01em",
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <SlotText>{label}</SlotText>
    </Link>
  );
}

function ColHeading({ children, fontSize = 22 }) {
  return (
    <h3
      className="text-white"
      style={{
        fontFamily:    "'Bebas Neue', sans-serif",
        fontSize,
        letterSpacing: "0.06em",
        lineHeight:    1,
        marginBottom:  10,
      }}
    >
      {children}
    </h3>
  );
}

// ── Shared sub-blocks ──────────────────────────────────────────────────────────
function BrandingBlock({ compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <Image
        src="/IWDC-logo.svg"
        alt="IWDC Logo"
        width={compact ? 52 : 80}
        height={compact ? 52 : 80}
        className="object-contain"
        style={{ flexShrink: 0 }}
      />
      <div>
        <p
          className="text-white leading-none"
          style={{
            fontFamily:    "'Bebas Neue', sans-serif",
            fontSize:      compact ? 26 : 34,
            letterSpacing: "0.06em",
          }}
        >
          IWDC
        </p>
        <p
          className="text-white/60 leading-snug tracking-wide"
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize:   compact ? 11 : 13,
            fontWeight: 600,
          }}
        >
          IPB Web Dev<br />Community
        </p>
      </div>
    </div>
  );
}

function CollabNote({ centered = false }) {
  return (
    <p
      className="text-white/40 tracking-wide"
      style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize:   13,
        fontStyle:  "italic",
        lineHeight: 1.5,
        textAlign:  centered ? "center" : "left",
      }}
    >
      In collaboration by<br />
      <span className="text-white/70">Ditmawa IPB x IWDC</span>
    </p>
  );
}

function ContactBlock({ compact = false }) {
  return (
    <div>
      <ColHeading fontSize={compact ? 17 : 22}>Contact</ColHeading>
      <div className="flex flex-col" style={{ gap: compact ? 10 : 16 }}>
        <div>
          <p
            className="text-white/60 tracking-wide"
            style={{
              fontFamily:   "'Plus Jakarta Sans', sans-serif",
              fontSize:     13,
              fontWeight:   600,
              marginBottom: 2,
            }}
          >
            Email:
          </p>
          <a
            href="mailto:ditmawa@apps.ipc.ac.id"
            className="text-white/60 hover:text-white transition-colors break-all"
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize:   compact ? 12 : 15,
              fontWeight: 500,
            }}
          >
            ditmawa@apps.ipc.ac.id
          </a>
        </div>
        <div>
          <p
            className="text-white/60"
            style={{
              fontFamily:   "'Plus Jakarta Sans', sans-serif",
              fontSize:     13,
              fontWeight:   600,
              marginBottom: 2,
            }}
          >
            Whatsapp:
          </p>
          <a
            href="https://wa.me/081761761712"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/60 hover:text-white transition-colors"
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize:   compact ? 12 : 15,
              fontWeight: 500,
            }}
          >
            wa.me/081761761712
          </a>
        </div>
      </div>
    </div>
  );
}

function LocationBlock({ compact = false }) {
  return (
    <div>
      <ColHeading fontSize={compact ? 17 : 22}>Location</ColHeading>
      <address
        className="not-italic text-white/60 leading-relaxed"
        style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize:   compact ? 12 : 15,
          fontWeight: 500,
        }}
      >
        IPB University, Gedung Rektorat Andi Hakim Nasution, Lt 1, Babakan,
        Dramaga, Bogor Regency, West Java 16680
      </address>
    </div>
  );
}

// ── Desktop layout (original, untouched) ──────────────────────────────────────
function DesktopFooter({ navLinks }) {
  return (
    <div
      className="relative z-10 flex items-stretch justify-between"
      style={{
        paddingLeft:   "clamp(40px, 8.33vw, 160px)",
        paddingRight:  "clamp(40px, 8.33vw, 160px)",
        paddingTop:    60,
        paddingBottom: 60,
        gap:           "clamp(24px, 4vw, 64px)",
      }}
    >
      {/* Col 1: Branding */}
      <div className="flex flex-col justify-between" style={{ minWidth: 200, maxWidth: 280 }}>
        <div>
          <div className="flex items-center gap-4 mb-5">
            <Image
              src="/IWDC-logo.svg"
              alt="IWDC Logo"
              width={80}
              height={80}
              className="object-contain"
            />
            <div>
              <p
                className="text-white leading-none"
                style={{
                  fontFamily:    "'Bebas Neue', sans-serif",
                  fontSize:      34,
                  letterSpacing: "0.06em",
                }}
              >
                IWDC
              </p>
              <p
                className="text-white/60 leading-snug tracking-wide"
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize:   13,
                  fontWeight: 600,
                }}
              >
                IPB Web Dev<br />Community
              </p>
            </div>
          </div>
        </div>
        <p
          className="text-white/40 mt-6 tracking-wide"
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize:   14,
            fontStyle:  "italic",
            lineHeight: 1.5,
          }}
        >
          In collaboration by<br />
          <span className="text-white/70">Ditmawa IPB x IWDC</span>
        </p>
      </div>

      {/* Col 2: Mascot */}
      <div style={{ flexShrink: 0, width: 380, position: "relative" }}>
        <Image
          src="/maskot/maskot2.png"
          width={800}
          height={1000}
          quality={100}
          style={{ position: "absolute", top: -50, left: -100, width: "100%", height: "auto" }}
        />
      </div>

      {/* Col 3: Nav */}
      <div style={{ minWidth: 120 }}>
        <h3
          className="text-white mb-4"
          style={{
            fontFamily:    "'Bebas Neue', sans-serif",
            fontSize:      22,
            letterSpacing: "0.06em",
            lineHeight:    1,
          }}
        >
          Navigasi
        </h3>
        <nav className="flex flex-col gap-3">
          {navLinks.map(({ href, label }) => (
            <FooterNavLink key={href} href={href} label={label} />
          ))}
        </nav>
      </div>

      {/* Col 4: Contact */}
      <div style={{ minWidth: 200 }}>
        <ContactBlock />
      </div>

      {/* Col 5: Location */}
      <div style={{ maxWidth: 260 }}>
        <LocationBlock />
      </div>
    </div>
  );
}

// ── Mobile layout ─────────────────────────────────────────────────────────────
function MobileFooter({ navLinks }) {
  const PX = 24;

  return (
    <div
      className="relative z-10"
      style={{
        paddingLeft:   PX,
        paddingRight:  PX,
        paddingTop:    36,
        paddingBottom: 24,
        display:       "flex",
        flexDirection: "column",
        gap:           0,
      }}
    >
      {/* ── Row 1: Branding (left) + Mascot (right) ── */}
      {/*
        The row is 140px tall in normal flow.
        The mascot image is absolutely positioned, bottom-anchored to the row,
        and extends upward — overflowing the footer's top edge (footer has overflow:visible on mobile).
      */}
      <div
        style={{
          display:        "flex",
          flexDirection:  "row",
          alignItems:     "flex-end",
          justifyContent: "space-between",
          position:       "relative",
          height:         140,
          marginBottom:   20,
        }}
      >
        {/* Branding top + collab note bottom */}
        <div
          style={{
            display:        "flex",
            flexDirection:  "column",
            justifyContent: "space-between",
            height:         "100%",
            flex:           1,
            minWidth:       0,
            paddingRight:   12,
          }}
        >
          <BrandingBlock compact />
          <CollabNote />
        </div>

        {/* Mascot column — fixed width, image peeks above */}
        <div
          style={{
            position:   "relative",
            width:      150,
            height:     "100%",
            flexShrink: 0,
          }}
        >
          <Image
            src="/maskot/maskot2.png"
            width={400}
            height={500}
            quality={100}
            aria-hidden="true"
            style={{
              position: "absolute",
              bottom:   -12,   // feet bleed a touch below the row
              right:    -PX,   // flush with the right padding edge
              width:    200,
              height:   "auto",
            }}
          />
        </div>
      </div>

      {/* ── Divider ── */}
      <div style={{ height: 1, background: "rgba(255,255,255,0.12)", marginBottom: 20 }} />

      {/* ── Row 2: Nav (left col) | Contact + Location (right col) ── */}
      <div
        style={{
          display:             "grid",
          gridTemplateColumns: "1fr 1fr",
          columnGap:           20,
          rowGap:              20,
          marginBottom:        20,
        }}
      >
        {/* Nav spans both rows on the left */}
        <div style={{ gridRow: "1 / 3" }}>
          <ColHeading fontSize={17}>Navigasi</ColHeading>
          <nav className="flex flex-col" style={{ gap: 10 }}>
            {navLinks.map(({ href, label }) => (
              <FooterNavLink key={href} href={href} label={label} />
            ))}
          </nav>
        </div>

        {/* Contact — top-right cell */}
        <ContactBlock compact />

        {/* Location — bottom-right cell */}
        <LocationBlock compact />
      </div>

      {/* ── Divider + Copyright ── */}
      <div style={{ height: 1, background: "rgba(255,255,255,0.12)", marginBottom: 12 }} />
      <p
        style={{
          fontFamily:    "'Plus Jakarta Sans', sans-serif",
          fontSize:      11,
          color:         "rgba(255,255,255,0.30)",
          textAlign:     "center",
          letterSpacing: "0.04em",
        }}
      >
        © 2025 IWDC · Ditmawa IPB x IWDC
      </p>
    </div>
  );
}

// ── Root Footer ───────────────────────────────────────────────────────────────
export default function Footer() {
  const footerRef = useRef(null);
  const cw        = useContainerWidth(footerRef);
  const isMobile  = cw < DESKTOP_BP;

  const navLinks = [
    { href: "/",         label: "Beranda"  },
    { href: "/events",   label: "Event"    },
    { href: "/schedule", label: "Schedule" },
    { href: "/news",     label: "Stories"  },
  ];

  return (
    <footer
      ref={footerRef}
      style={{
        position:   "relative",
        zIndex:     10,
        background: "linear-gradient(to bottom, #0D26C2, #06125C)",
        // Mascot peeks above the footer on mobile — needs visible overflow
        overflow:   isMobile ? "visible" : "hidden",
      }}
    >
      {/* Batik pattern overlays */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:  "url('/Batik_Pattern_dark.svg')",
          backgroundRepeat: "repeat",
          backgroundSize:   "auto",
          opacity:          1,
          transform:        "rotate(180deg)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:  "url('/Batik_Pattern_dark.svg')",
          backgroundRepeat: "repeat",
          backgroundSize:   "auto",
          opacity:          0.7,
          transform:        "rotate(180deg)",
        }}
      />

      {isMobile ? (
        <MobileFooter navLinks={navLinks} />
      ) : (
        <DesktopFooter navLinks={navLinks} />
      )}
    </footer>
  );
}