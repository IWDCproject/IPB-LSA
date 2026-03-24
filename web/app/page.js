// server component — nggak perlu "use client"
// BlurProvider adalah client boundary pertama di tree ini

import BlurProvider    from "@/components/BlurProvider";
import CurtainWrapper from "./_components/CurtainWrapper";
import SmoothScroller  from "./_components/SmoothScroller";
import { getEvents }   from "@/lib/directus";

<<<<<<< HEAD
export const dynamic = 'force-dynamic';

=======
>>>>>>> eb0263c401aa85307dadef88c35de9b3464fcf12
export default async function Page() {
  const events = await getEvents();
  console.log("Daftar Event dari Directus:", events);

  return (
    <SmoothScroller>
      <BlurProvider>
        <CurtainWrapper events={events} />
      </BlurProvider>
    </SmoothScroller>
  );
}