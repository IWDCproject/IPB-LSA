"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Slot animation config
const STAGGER = 18;
const DUR     = "0.5s";
const EASE    = "cubic-bezier(0, 1, 0.2, 1)";

function SlotText({ children, isHovered }) {
  const chars = String(children).split("");
  return (
    <>
      {/* Screen-reader accessible full text */}
      <span className="sr-only">{children}</span>
      
      {/* Visual slot animation hidden from Screen Readers */}
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
                transition: `transform ${DUR} ${EASE}`,
                transitionDelay: isHovered
                  ? `${i * STAGGER}ms`
                  : `${(chars.length - 1 - i) * STAGGER}ms`,
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

function NavLink({ href, label, active }) {
  const[isHovered, setIsHovered] = useState(false);

  return (
    <Link
      href={href}
      className={`font-bold tracking-widest uppercase transition-colors shrink-0
        ${active ? "text-blue-900" : "text-gray-500 hover:text-blue-900"}
        text-[11px] min-[900px]:text-[12px] lg:text-[14px]`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <SlotText isHovered={isHovered}>{label}</SlotText>
    </Link>
  );
}

export default function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const links =[
    { href: "/",         label: "Beranda"  },
    { href: "/events",   label: "Event"    },
    { href: "/news",     label: "Berita"   },
    { href: "/schedule", label: "Schedule" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 relative">
      <div className="flex items-center justify-between gap-4 h-[65px] px-4 min-[900px]:px-[clamp(40px,8.33vw,160px)]">
        
        {/* Logo */}
        <Link href="/" className="shrink min-w-0 flex items-center">
          <Image 
            src="/ipb-logo.png" 
            alt="IPB University" 
            height={64} 
            width={200} 
            className="h-9 min-[900px]:h-12 w-auto max-w-full object-contain" 
            priority
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden min-[900px]:flex items-center gap-5 lg:gap-8">
          {links.map(({ href, label }) => {
            const active = href === "/" ? pathname === href : pathname?.startsWith(href);
            return (
              <NavLink key={href} href={href} label={label} active={active} />
            );
          })}
        </nav>

        {/* Hamburger — mobile only */}
        <button
          className="min-[900px]:hidden flex flex-col justify-center items-center w-9 h-9 gap-[5px] shrink-0"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          <span className={`block h-0.5 w-5 bg-gray-700 transition-transform duration-300 origin-center ${menuOpen ? "translate-y-[7px] rotate-45" : ""}`} />
          <span className={`block h-0.5 w-5 bg-gray-700 transition-opacity duration-300 ${menuOpen ? "opacity-0" : ""}`} />
          <span className={`block h-0.5 w-5 bg-gray-700 transition-transform duration-300 origin-center ${menuOpen ? "-translate-y-[7px] -rotate-45" : ""}`} />
        </button>
      </div>

      {/* Mobile dropdown — absolute so it overlays and never affects document flow or scroll calculations */}
      <div
        className={`min-[900px]:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-md overflow-hidden transition-all duration-300 ease-in-out ${menuOpen ? "max-h-64" : "max-h-0"}`}
      >
        <nav className="flex flex-col border-t border-gray-100 px-4 py-2">
          {links.map(({ href, label }) => {
            const active = href === "/" ? pathname === href : pathname?.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={`font-bold tracking-widest uppercase py-3 text-[11px] border-b border-gray-100 last:border-0 transition-colors
                  ${active ? "text-blue-900" : "text-gray-500"}`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}