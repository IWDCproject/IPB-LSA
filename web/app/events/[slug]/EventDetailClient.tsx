"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import EventDetailHeader, { type TabKey } from "./_components/EventDetailHeader";
import OverviewTab from "./_components/OverviewTab";
import NewsTab from "./_components/NewsTab";
import MatchesTab from "./_components/MatchesTab";
import TabContentShell from "./_components/TabContentShell";
import UniversityMarquee from "@/components/UniversityMarquee";
import Footer from "@/components/Footer";
import { getAssetUrl } from "@/lib/directus";
import { useTabTransition } from "./_components/UseTabTransition";
import { KEYFRAMES } from "./_components/Animations";

const BG_TOP    = "#0D26C2 30%";
const BG_BOTTOM = "#06125C";
const BG_IMAGE_HEIGHT = "clamp(500px, 65vh, 650px)";
const IMAGE_MASK      = "linear-gradient(to bottom, black 30%, transparent 85%)";
const TINT_COLOR      = "linear-gradient(to top, rgba(13, 38, 194, 0.7) 0%, rgba(13, 38, 194, 0.5) 0%)";

const LOCAL_KEYFRAMES = `
  @keyframes edc-fade-in    { from { opacity: 0; } to { opacity: 1; } }
  @keyframes edc-marquee-up { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
`;

function Shell({ label }: { label: string }) {
  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: "rgba(255,255,255,0.4)", fontSize: 14, paddingTop: 32 }}>
      {label} tab — coming soon
    </div>
  );
}

export default function EventDetailClient({ event }: { event: any }) {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const activeTab    = (searchParams.get("tab") as TabKey) ?? "overview";
  const mainRef      = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setIsMobile(e.contentRect.width < 1024));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ─── Tab transition system ─────────────────────────────────────────────────
  // `displayedTab` lags behind `activeTab` by EXIT_DURATION ms during exit.
  // `phase`        is "entering" when the tab first mounts, "idle" after.
  // `isExiting`    is true during the outgoing fade.
  const { displayedTab, phase, isExiting } = useTabTransition(activeTab);

  const setTab = (t: TabKey) => router.push(`?tab=${t}`, { scroll: false });
  const bannerUrl = event.banner_image?.id ? getAssetUrl(event.banner_image) : null;

  return (
    <>
      {/* Single keyframe injection point for the whole page.
          dangerouslySetInnerHTML prevents React from diffing the text content
          of this <style> tag, which eliminates the SSR hydration mismatch. */}
      <style dangerouslySetInnerHTML={{ __html: LOCAL_KEYFRAMES + KEYFRAMES }} />

      <div
        ref={mainRef}
        style={{
          position: "relative",
          minHeight: "100vh",
          background: `linear-gradient(to bottom, ${BG_TOP}, ${BG_BOTTOM})`,
          opacity: 0,
          animation: "edc-fade-in 0.4s ease 0ms forwards",
        }}
      >
        {/* Batik pattern overlay */}
        <div style={{
          position: "absolute", top: -100, left: 0, right: 0, height: 1200,
          backgroundImage: "url(/Batik_Pattern_dark.svg)", opacity: 0.4,
          pointerEvents: "none", backgroundSize: "1400px auto",
          backgroundRepeat: "repeat-x", backgroundPosition: "top center",
          transform: "scaleY(-1)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0px, black 250px)",
          maskImage: "linear-gradient(to bottom, transparent 0px, black 250px)",
          zIndex: 0,
        }} />

        {/* Banner image */}
        {bannerUrl && (
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0,
            height: BG_IMAGE_HEIGHT, overflow: "hidden",
            WebkitMaskImage: IMAGE_MASK, maskImage: IMAGE_MASK, zIndex: 0,
          }}>
            <div style={{
              position: "absolute", inset: 0,
              backgroundImage: `url(${bannerUrl})`,
              backgroundSize: "cover", backgroundPosition: "center",
              filter: "blur(3px)", transform: "scale(1.05)",
            }} />
            <div style={{ position: "absolute", inset: 0, background: TINT_COLOR, pointerEvents: "none" }} />
          </div>
        )}

        <div style={{ position: "relative", zIndex: 1 }}>
          <EventDetailHeader
            event={event}
            activeTab={activeTab}        // header always tracks real active tab for button highlight
            onTabChange={setTab}
            isMobile={isMobile}
          />

          <div style={{ padding: isMobile ? "0 20px 40px" : "0 clamp(20px, 8.33vw, 160px) 40px" }}>
            {/*
              TabContentShell applies the exit-fade to the outgoing tab.
              Inside, each tab drives its own internal stagger via `phase`.

              We render based on `displayedTab` (not `activeTab`) so the
              old tab stays in the DOM during its exit fade.

              When adding new tabs (Matches, Participants), follow this pattern:
                {displayedTab === "matches" && (
                  <MatchesTab phase={phase} event={event} isMobile={isMobile} />
                )}
            */}
            <TabContentShell isExiting={isExiting}>
              {displayedTab === "overview" && (
                <OverviewTab event={event} isMobile={isMobile} phase={phase} />
              )}
              {displayedTab === "matches" && (
                <MatchesTab event={event} isMobile={isMobile} phase={phase} />
              )}
              {displayedTab === "participants" && (
                <Shell label="Participants" />
              )}
              {displayedTab === "news" && (
                <NewsTab event={event} isMobile={isMobile} phase={phase} />
              )}
            </TabContentShell>
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