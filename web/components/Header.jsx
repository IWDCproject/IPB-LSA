"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname   = usePathname();
  const headerRef  = useRef(null);
  const [cw, setCw] = useState(1440);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setCw(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isMobile = cw < 768;
  const scale    = Math.min(1, cw / 1440);
  const padding  = isMobile ? 24 : Math.round(160 * scale);

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
        style={{ paddingLeft: padding, paddingRight: padding }}
      >
        <Link href="/">
          <Image src="/ipb-logo.png" alt="IPB University" height={64} width={200} className="h-12 w-auto" />
        </Link>
        <nav className="flex items-center" style={{ gap: Math.round(32 * scale) }}>
          {links.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`font-bold tracking-widest uppercase transition-colors
                  ${active ? "text-blue-900" : "text-gray-500 hover:text-blue-900"}`}
                style={{ fontSize: Math.max(11, Math.round(14 * scale)) }}
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