// server component — nggak perlu "use client"
// BlurProvider adalah client boundary pertama di tree ini

import BlurProvider    from "@/components/BlurProvider";
import CurtainWrapper from "./_components/CurtainWrapper";
import SmoothScroller  from "./_components/SmoothScroller";
import { getEvents, getMatches } from "@/lib/directus";

// Menonaktifkan cache agar data selalu di-fetch ulang dari Directus
export const dynamic = "force-dynamic";

// Menonaktifkan cache agar data selalu di-fetch ulang dari Directus
export const dynamic = "force-dynamic";

export default async function Page() {
  const [events, matches] = await Promise.all([
    getEvents(),
    getMatches(),
  ]);

  return (
    <SmoothScroller>
      <BlurProvider>
        <CurtainWrapper events={events} matches={matches} />
      </BlurProvider>
    </SmoothScroller>
  );
}