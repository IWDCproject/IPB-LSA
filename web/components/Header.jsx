"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Beranda" },
    { href: "/events", label: "Event" },
    { href: "/news", label: "Berita" },
    { href: "/schedule", label: "Schedule" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-[160px] py-2">
        <Link href="/">
          <Image src="/ipb-logo.png" alt="IPB University" height={64} width={200} className="h-12 w-auto" />
        </Link>
        <nav className="flex items-center gap-8">
          {links.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href}
                className={`text-sm font-bold tracking-widest uppercase transition-colors
                  ${active ? "text-blue-900" : "text-gray-500 hover:text-blue-900"}`}>
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}