// server component — nggak perlu "use client"
// BlurProvider adalah client boundary pertama di tree ini

import BlurProvider    from "@/components/BlurProvider";
import CurtainWrapper from "./_components/CurtainWrapper";
import { getEvents, getMatches, getStats, getAssetUrl, getNews } from "@/lib/directus";

// Menonaktifkan cache agar data selalu di-fetch ulang dari Directus
export const dynamic = "force-dynamic";

export default async function Page() {
  const [events, matches, stats, news] = await Promise.all([
    getEvents(),
    getMatches(),
    getStats(),
    getNews({ limit: 5 }),
  ]);

  const imageManifest = [
    ...events.filter(ev => ev.is_published).flatMap(ev => [
      { url: getAssetUrl(ev.card_image), type: "hero",      width: 1200, height: 800 },
      { url: getAssetUrl(ev.card_image), type: "eventcard", width: 400,  height: 280 },
    ]),
    ...matches.map(m => {
      const image = m.competition_category?.event_id?.card_image;
      return image ? { url: getAssetUrl(image), type: "matchcard", width: 400, height: 280 } : null;
    }).filter(Boolean),
    // Replace placeholder with real news thumbnails
    ...news.map(n => n.thumbnail_url
      ? { url: n.thumbnail_url, type: "newscard", width: 800, height: 600 }
      : null
    ).filter(Boolean),
  ];

  return (
    <BlurProvider imageManifest={imageManifest}>
      <CurtainWrapper events={events} matches={matches} stats={stats} news={news} />
    </BlurProvider>
  );
}