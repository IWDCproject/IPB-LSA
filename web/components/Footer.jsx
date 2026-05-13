"use client";
import Image from "next/image";
import Link from "next/link";
import { useRef, useEffect, useState } from "react";

// --- Constants ----------------------------------------------------------------
const DESKTOP_BP   = 1024;
const SLOT_STAGGER = 18;
const SLOT_DUR     = "0.5s";
const SLOT_EASE    = "cubic-bezier(0, 1, 0.2, 1)";

const SCALE_START = 1440;
const SCALE_FLOOR = 0.78;

const NAV_LINKS =[
  { href: "/",         label: "Beranda"  },
  { href: "/events",   label: "Event"    },
  { href: "/schedule", label: "Schedule" },
  { href: "/news",     label: "Stories"  },
];

const F = {
  display: "'Bebas Neue', sans-serif",
  body:    "'Plus Jakarta Sans', sans-serif",
};

// --- Hook ---------------------------------------------------------------------
function useContainerWidth(ref) {
  const [width, setWidth] = useState(SCALE_START);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function update(w) {
      setWidth(w);
      // Ensure s is a unitless string so CSS calc() works correctly
      const s = w < DESKTOP_BP ? 1 : Math.max(SCALE_FLOOR, Math.min(1, w / SCALE_START));
      el.style.setProperty("--s", String(s));
    }

    update(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(([e]) => update(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  return width;
}

// --- Primitives ---------------------------------------------------------------
function SlotText({ children, isHovered }) {
  const chars = String(children).split("");
  return (
    <>
      {/* Screen Reader Label */}
      <span className="sr-only">{children}</span>
      
      {/* Visual Animation */}
      <span aria-hidden="true" className="inline-flex leading-none">
        {chars.map((char, i) => (
          <span
            key={i}
            className="inline-block overflow-hidden h-[1em]"
            style={{ whiteSpace: char === " " ? "pre" : "normal" }}
          >
            <span
              className="flex flex-col"
              style={{
                transform: isHovered ? "translateY(-50%)" : "translateY(0%)",
                transition: `transform ${SLOT_DUR} ${SLOT_EASE}`,
                transitionDelay: isHovered
                  ? `${i * SLOT_STAGGER}ms`
                  : `${(chars.length - 1 - i) * SLOT_STAGGER}ms`,
              }}
            >
              <span className="block leading-none">{char}</span>
              <span className="block leading-none">{char}</span>
            </span>
          </span>
        ))}
      </span>
    </>
  );
}

function NavLink({ href, label }) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <Link
      href={href}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="block text-white/60 hover:text-white transition-colors"
      style={{ fontFamily: F.body, fontSize: "calc(15px * var(--s))", fontWeight: 500, letterSpacing: "0.01em" }}
    >
      <SlotText isHovered={isHovered}>{label}</SlotText>
    </Link>
  );
}

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
  return <div className="h-[1px] bg-white/10" />;
}

// --- Blocks -------------------------------------------------------------------
function BrandingBlock({ compact = false }) {
  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <Image src="/IWDC-logo.svg" alt="IWDC Logo" width={52} height={52} className="object-contain shrink-0" />
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
        className="object-contain shrink-0"
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
        <span className="block">Email:</span>
        <a href="mailto:ditmawa@apps.ipb.ac.id" className="block mb-[0.4em] whitespace-nowrap hover:text-white transition-colors">
          ditmawa@apps.ipb.ac.id
        </a>
        <span className="block">Whatsapp:</span>
        <a href="https://wa.me/081761761712" target="_blank" rel="noopener noreferrer" className="block whitespace-nowrap hover:text-white transition-colors">
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

// --- Batik Overlay ------------------------------------------------------------
function BatikOverlay() {
  const base = {
    backgroundImage:    "url('/Batik_Pattern_dark.svg')",
    backgroundRepeat:   "repeat",
    backgroundSize:     "auto",
    transform:          "rotate(180deg)",
  };
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-50 lg:opacity-100">
      <div className="absolute inset-0" style={{ ...base, opacity: 1 }} />
      <div className="absolute inset-0" style={{ ...base, opacity: 0.7 }} />
    </div>
  );
}

// --- Layouts ------------------------------------------------------------------
function DesktopFooter({ cw }) {
  const s = Math.max(SCALE_FLOOR, Math.min(1, cw / SCALE_START));

  const hPad   = Math.min(160, Math.max(32, cw * 0.0833));
  const colGap = Math.min(56,  Math.max(20, cw * 0.033));
  const vPad   = Math.round(60 * s);

  const mascotW = Math.round(380 * s);
  const mascotLeft = Math.round(hPad + 120 * s);

  return (
    <div
      className="relative z-10 flex items-start justify-between w-full"
      style={{
        paddingInline:  hPad,
        paddingTop:     vPad,
        paddingBottom:  vPad,
        minHeight:      Math.round(160 * s),
      }}
    >
      <div className="flex flex-col shrink-0" style={{ gap: "calc(16px * var(--s))" }}>
        <BrandingBlock />
        <CollabNote />
      </div>

      <Image
        src="/maskot/maskot2.png"
        alt="IWDC Mascot"
        width={800}
        height={1000}
        quality={100}
        className="absolute z-[3] pointer-events-none"
        style={{
          bottom: -100,
          left:   mascotLeft,
          width:  mascotW,
          height: "auto",
        }}
      />

      <div className="flex items-start" style={{ gap: colGap }}>
        <NavBlock />
        <ContactBlock />
        <LocationBlock />
      </div>
    </div>
  );
}

function MobileFooter() {
  return (
    <div className="relative z-10 flex flex-col px-6 pt-9 pb-12 gap-5 w-full">
      <div className="grid grid-cols-2 gap-5 items-start">
        <div className="flex flex-col gap-4">
          <BrandingBlock compact />
          <CollabNote />
        </div>
        <NavBlock headingSize={17} gap={10} columns={2} />
      </div>

      <Divider />

      <div className="grid grid-cols-2 gap-5">
        <ContactBlock compact />
        <LocationBlock compact />
      </div>

      <p style={{ fontFamily: F.body, fontSize: 11, color: "rgba(255,255,255,0.30)", textAlign: "center", letterSpacing: "0.04em" }}>
        © {new Date().getFullYear()} IWDC · Ditmawa IPB x IWDC
      </p>
    </div>
  );
}

// --- Root ---------------------------------------------------------------------
export default function Footer() {
  const ref = useRef(null);
  const cw  = useContainerWidth(ref);

  return (
    <footer
      ref={ref}
      className="relative z-10 overflow-hidden bg-gradient-to-b from-[#0D26C2] to-[#06125C]"
      style={{ "--s": "1" }} // Ensure CSS calc doesn't break during SSR hydration
    >
      <BatikOverlay />
      
      <div className="block lg:hidden w-full">
        <MobileFooter />
      </div>
      
      <div className="hidden lg:block w-full">
        <DesktopFooter cw={cw} />
      </div>
    </footer>
  );
}