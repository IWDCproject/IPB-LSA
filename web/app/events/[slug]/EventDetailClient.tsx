"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import EventDetailHeader, { type TabKey } from "./_components/EventDetailHeader";
import OverviewTab from "./_components/OverviewTab";
import UniversityMarquee from "@/components/UniversityMarquee";
import Footer from "@/components/Footer";
import { getAssetUrl } from "@/lib/directus";

// ── Constants — copied verbatim from EventPageClient ──────────────────────
const BG_TOP    = "#0D26C2 30%";
const BG_BOTTOM = "#06125C";

const BG_IMAGE_HEIGHT = "clamp(500px, 65vh, 650px)";
const IMAGE_MASK      = "linear-gradient(to bottom, black 30%, transparent 85%)";
const TINT_COLOR      = "linear-gradient(to top, rgba(13, 38, 194, 0.7) 0%, rgba(13, 38, 194, 0.5) 0%)";

const KEYFRAMES = `
  @keyframes edc-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes edc-marquee-up {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
`;

// ── Shell tabs ────────────────────────────────────────────────────────────
function Shell({ label }: { label: string }) {
  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: "rgba(255,255,255,0.4)", fontSize: 14, paddingTop: 32 }}>
      {label} tab — coming soon
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function EventDetailClient({ event }: { event: any }) {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const activeTab    = (searchParams.get("tab") as TabKey) ?? "overview";

  const mainRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setIsMobile(e.contentRect.width < 1024));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const setTab = (t: TabKey) => router.push(`?tab=${t}`, { scroll: false });

  const bannerUrl = event.banner_image?.id ? getAssetUrl(event.banner_image) : null;

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div ref={mainRef} style={{
        position: "relative",
        minHeight: "100vh",
        background: `linear-gradient(to bottom, ${BG_TOP}, ${BG_BOTTOM})`,
        opacity: 0,
        animation: "edc-fade-in 0.4s ease 0ms forwards",
      }}>

        {/* Batik texture overlay — identical to EventPageClient */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "url(/Batik_Pattern_dark.svg)",
          opacity: 0.4, pointerEvents: "none",
          backgroundSize: "1400px 100%", backgroundRepeat: "repeat-x",
          backgroundPosition: "bottom", transform: "rotate(180deg)",
        }} />

        {/* Static BG image — same layer structure as BgCrossfade, no crossfade */}
        {bannerUrl && (
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0,
            height: BG_IMAGE_HEIGHT, overflow: "hidden",
            WebkitMaskImage: IMAGE_MASK, maskImage: IMAGE_MASK,
          }}>
            <div style={{
              position: "absolute", inset: 0,
              backgroundImage: `url(${bannerUrl})`,
              backgroundSize: "cover", backgroundPosition: "center",
              filter: "blur(3px)", transform: "scale(1.05)",
            }} />
            <div style={{
              position: "absolute", inset: 0,
              background: TINT_COLOR, pointerEvents: "none",
            }} />
          </div>
        )}

        <div style={{ position: "relative", zIndex: 1 }}>
          <EventDetailHeader
            event={event}
            activeTab={activeTab}
            onTabChange={setTab}
            isMobile={isMobile}
          />

          <div style={{ padding: isMobile ? "0 20px 80px" : "0 clamp(20px, 8.33vw, 160px) 100px" }}>
            {activeTab === "overview"     && <OverviewTab event={event} isMobile={isMobile} />}
            {activeTab === "matches"      && <Shell label="Matches" />}
            {activeTab === "participants" && <Shell label="Participants" />}
            {activeTab === "news"         && <Shell label="News" />}
          </div>

          <div style={{ opacity: 0, animation: "edc-marquee-up 0.5s ease 900ms forwards" }}>
            <UniversityMarquee />
          </div>

          <div style={{ height: 120 }} />
          <Footer />
        </div>
      </div>
    </>
  );
}