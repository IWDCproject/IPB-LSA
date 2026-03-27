// server component — nggak perlu "use client"
// BlurProvider adalah client boundary pertama di tree ini

import BlurProvider    from "@/components/BlurProvider";
import CurtainWrapper from "./_components/CurtainWrapper";
import SmoothScroller  from "./_components/SmoothScroller";
import { getEvents, getMatches, getStats, getAssetUrl } from "@/lib/directus";

// Menonaktifkan cache agar data selalu di-fetch ulang dari Directus
export const dynamic = "force-dynamic";

export default async function Page() {
  const [events, matches, stats] = await Promise.all([
    getEvents(),
    getMatches(),
    getStats(),
  ]);

  // Bangun image manifest untuk BlurProvider agar worker memproses gambar yang benar
  const imageManifest = [
    // 1. Hero Images dari Events
    ...events.filter(ev => ev.is_published).map(ev => ({
      url: getAssetUrl(ev.card_image_url),
      type: "hero",
      width: 1200,
      height: 800
    })),
    // 2. Match Cards dari Matches (untuk blur background kartu match)
    ...matches.map(m => {
      const imageUrl = m.competition_category?.event_id?.card_image_url;
      return imageUrl ? {
        url: getAssetUrl(imageUrl),
        type: "matchcard",
        width: 400,
        height: 280
      } : null;
    }).filter(Boolean),
    // 3. News Images (Jika ada data news nanti, sementara placeholder atau dummy)
    { url: "https://picsum.photos/seed/badminton/800/600", type: "newscard", width: 800, height: 600 },
  ];

  return (
    // <SmoothScroller>
      <BlurProvider imageManifest={imageManifest}>
        <CurtainWrapper events={events} matches={matches} stats={stats} />
      </BlurProvider>
    // </SmoothScroller>
  );
}