"use client";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

// ── Slot animation (mirrored from Header) ─────────────────────────────────────
const STAGGER = 18;
const DUR     = "0.4s";
const EASE    = "cubic-bezier(0.76, 0, 0.24, 1)";

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

// ── Column heading (Bebas Neue) ───────────────────────────────────────────────
function ColHeading({ children }) {
  return (
    <h3
      className="text-white mb-4"
      style={{
        fontFamily:    "'Bebas Neue', sans-serif",
        fontSize:      22,
        letterSpacing: "0.06em",
        lineHeight:    1,
      }}
    >
      {children}
    </h3>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
export default function Footer() {
  const navLinks = [
    { href: "/",         label: "Beranda"  },
    { href: "/events",   label: "Event"    },
    { href: "/schedule", label: "Schedule" },
    { href: "/news",     label: "Stories"  },
  ];

  return (
    <>

      <footer
        style={{
          position:   "relative",
          zIndex:     10,
          background: "linear-gradient(to bottom, #0D26C2, #06125C)",
          overflow:   "hidden",
        }}
      >
        {/* Batik pattern overlay */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:   "url('/Batik_Pattern_dark.svg')",
            backgroundRepeat:  "repeat",
            backgroundSize:    "auto",
            opacity:           1,
            transform:         "rotate(180deg)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:   "url('/Batik_Pattern_dark.svg')",
            backgroundRepeat:  "repeat",
            backgroundSize:    "auto",
            opacity:           0.7,
            transform:         "rotate(180deg)",
          }}
        />
        

        {/* Content */}
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
          {/* ── Col 1: Branding ─────────────────────────────── */}
          <div className="flex flex-col justify-between" style={{ minWidth: 200, maxWidth: 280 }}>
            <div>
              {/* Logo row */}
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
                      fontFamily: "'Bebas Neue', sans-serif",
                      fontSize:   34,
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

            {/* Collab note at the bottom */}
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

          {/* ── Col 2: Mascot ───────────────────────────────── */}
        <div style={{ flexShrink: 0, width: 380, position: "relative" }}>
        <Image
            src="/maskot/maskot2.png"
            width={800}
            height={1000}
            quality={100}
            style={{ position: "absolute", top: -50, left: -100, width: "100%", height: "auto" }}
        />
        </div>

          {/* ── Col 3: Navigasi ─────────────────────────────── */}
          <div style={{ minWidth: 120 }}>
            <ColHeading>Navigasi</ColHeading>
            <nav className="flex flex-col gap-3">
              {navLinks.map(({ href, label }) => (
                <FooterNavLink key={href} href={href} label={label} />
              ))}
            </nav>
          </div>

          {/* ── Col 4: Contact ──────────────────────────────── */}
          <div style={{ minWidth: 200 }}>
            <ColHeading>Contact</ColHeading>
            <div className="flex flex-col gap-4">
              <div>
                <p
                  className="text-white/60 mb-0.5 tracking-wide"
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize:   14,
                    fontWeight: 600,
                  }}
                >
                  Email:
                </p>
                <a
                  href="mailto:ditmawa@apps.ipc.ac.id"
                  className="text-white/60 hover:text-white transition-colors break-all"
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize:   15,
                    fontWeight: 500,
                  }}
                >
                  ditmawa@apps.ipc.ac.id
                </a>
              </div>
              <div>
                <p
                  className="text-white/60 mb-0.5"
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize:   14,
                    fontWeight: 600,
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
                    fontSize:   15,
                    fontWeight: 500,
                  }}
                >
                  wa.me/081761761712
                </a>
              </div>
            </div>
          </div>

          {/* ── Col 5: Location ─────────────────────────────── */}
          <div style={{ maxWidth: 260 }}>
            <ColHeading>Location</ColHeading>
            <address
              className="not-italic text-white/60 leading-relaxed"
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize:   15,
                fontWeight: 500,
              }}
            >
              IPB University, Gedung Rektorat Andi Hakim Nasution, Lt 1, Babakan,
              Dramaga, Bogor Regency, West Java 16680
            </address>
          </div>
        </div>
      </footer>
    </>
  );
}