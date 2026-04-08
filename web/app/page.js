// server component — nggak perlu "use client"
// BlurProvider sekarang ada di layout.jsx — halaman ini bersih dari blur logic.
// Setiap section (HeroSection, NewsSection, dll.) mendaftarkan imagenya sendiri
// via useBlurImages() di dalam komponen masing-masing.

import CurtainWrapper from "./_components/CurtainWrapper";
import { getEvents, getMatches, getStats, getNews } from "@/lib/directus";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [events, matches, stats, news] = await Promise.all([
    getEvents(),
    getMatches(),
    getStats(),
    getNews({ limit: 5 }),
  ]);

  return (
    <CurtainWrapper events={events} matches={matches} stats={stats} news={news} />
  );
}