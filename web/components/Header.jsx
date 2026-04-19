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

  const links =[
    { href: "/",         label: "Beranda"  },
    { href: "/events",   label: "Event"    },
    { href: "/news",     label: "Berita"   },
    { href: "/schedule", label: "Schedule" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      {/* Replaced ResizeObserver with pure Tailwind CSS responsive utilities */}
      <div className="flex items-center justify-between gap-4 py-2 px-5 min-[900px]:px-[clamp(40px,8.33vw,160px)]">
        
        {/* Logo Fix: shrink, min-w-0 wrapper with an object-contain max-w-full image */}
        <Link href="/" className="shrink min-w-0 flex items-center">
          <Image 
            src="/ipb-logo.png" 
            alt="IPB University" 
            height={64} 
            width={200} 
            className="h-12 w-auto max-w-full object-contain" 
            priority
          />
        </Link>
        
        <nav className="flex items-center gap-4 min-[900px]:gap-5 lg:gap-8">
          {links.map(({ href, label }) => {
            // Precise active handling. Exact match for "/", prefix match for the rest.
            const active = href === "/" ? pathname === href : pathname?.startsWith(href);
            
            return (
              <NavLink
                key={href}
                href={href}
                label={label}
                active={active}
              />
            );
          })}
        </nav>
      </div>
    </header>
  );
}