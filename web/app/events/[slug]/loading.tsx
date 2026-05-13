// web/app/events/[slug]/loading.tsx
"use client";

import { useEffect, useState } from "react";
import EventDetailHeader from "./_components/EventDetailHeader";
import OverviewTab from "./_components/tabs/OverviewTab";

export default function Loading() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Padding should exactly match EventDetailClient's logic
  const SIDE_PAD = isMobile ? "20px" : "clamp(20px, 8.33vw, 160px)";
  const PAD = `0 \${SIDE_PAD} 40px`;

  return (
    <div className="flex-1 flex flex-col">
      {/* Header handles its own skeleton internally */}
      <EventDetailHeader isMobile={isMobile} loading />
      
      <div className="pb-10" style={{ padding: PAD }}>
        {/* OverviewTab handles its own skeleton internally */}
        <OverviewTab isMobile={isMobile} loading />
      </div>
    </div>
  );
}
