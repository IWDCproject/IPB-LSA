// server component — nggak perlu "use client"
// BlurProvider adalah client boundary pertama di tree ini

import BlurProvider    from "@/components/BlurProvider";
import CurtainWrapper from "./_components/CurtainWrapper";
import SmoothScroller  from "./_components/SmoothScroller";
import { getEvents }   from "@/lib/directus";

export default async function Page() {
  const events = await getEvents();
  console.log("Daftar Event dari Directus:", events);

  return (
    <SmoothScroller>
      <BlurProvider>
        <CurtainWrapper />
      </BlurProvider>
    </SmoothScroller>
  );
}