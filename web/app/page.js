// server component — nggak perlu "use client"
// BlurProvider adalah client boundary pertama di tree ini

import BlurProvider    from "@/components/BlurProvider";
import CurtainWrapper from "./_components/CurtainWrapper";
import SmoothScroller  from "./_components/SmoothScroller";

export default function Page() {
  return (
    <SmoothScroller>
      <BlurProvider>
        <CurtainWrapper />
      </BlurProvider>
    </SmoothScroller>
  );
}