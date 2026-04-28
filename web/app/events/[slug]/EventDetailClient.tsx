"use client";

import { useSearchParams } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { useRef, useState, useEffect } from "react";
import EventDetailHeader from "./_components/EventDetailHeader";
import OverviewTab       from "./_components/tabs/OverviewTab";
import NewsTab           from "./_components/tabs/NewsTab";
import MatchesTab        from "./_components/tabs/MatchesTab";
import ParticipantsTab   from "./_components/tabs/ParticipantsTab";
import UniversityMarquee from "@/components/UniversityMarquee";
import Footer            from "@/components/Footer";
import { getAssetUrl }   from "@/lib/directus";
import { JK }             from "./_components/shared/tokens";
import { useTabTransition } from "./_components/shared/UseTabTransition";
import { KEYFRAMES }        from "./_components/shared/Animations";
import { ErrorBoundary }    from "./_components/shared/ErrorBoundary";
import { useMatchState }    from "./hooks/useMatchState";
import type { MappedEvent, TabKey } from "./_types";

const BG_TOP    = "#0D26C2 30%";
const BG_BOTTOM = "#06125C";
const BG_IMAGE_HEIGHT = "clamp(500px, 65vh, 650px)";
const IMAGE_MASK      = "linear-gradient(to bottom, black 30%, transparent 85%)";
const TINT_COLOR      = "linear-gradient(to top, rgba(13, 38, 194, 0.7) 0%, rgba(13, 38, 194, 0.5) 0%)";

const LOCAL_KEYFRAMES = `
  @keyframes edc-fade-in    { from { opacity: 0; } to { opacity: 1; } }
  @keyframes edc-marquee-up { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
`;

export default function EventDetailClient({ event }: { event: MappedEvent }) {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const activeTab    = (searchParams.get("tab") as TabKey) ?? "overview";
  const mainRef      = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  // ─── Spinner: "showing" → visible at full opacity for ≥500ms
  //              "fading"  → opacity transitioning to 0 over 500ms
  //              "hidden"  → unmounted
  // The three-state machine guarantees the spinner is visible for at least
  // 500ms so fast tab loads don't produce a distracting flash.
  const [spinnerPhase,  setSpinnerPhase]  = useState<"hidden" | "showing" | "fading">("hidden");
  const showTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstTab = useRef(true);

  // ─── Live match data (polls every 10s; easy WebSocket swap later) ─────────
  const { matches, lastUpdated, isPolling } = useMatchState(event.slug, event.matches);

  // ─── Stale data detection ─────────────────────────────────────────────────
  // If the last successful poll is >60s ago, polling has silently stalled.
  const [isStale, setIsStale] = useState(false);
  useEffect(() => {
    if (!lastUpdated) return;
    const check = () => setIsStale(Date.now() - lastUpdated.getTime() > 60_000);
    check();
    const id = setInterval(check, 5_000);
    return () => clearInterval(id);
  }, [lastUpdated]);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout>;
    const ro = new ResizeObserver(([e]) => {
      clearTimeout(timer);
      timer = setTimeout(() => setIsMobile(e.contentRect.width < 1024), 100);
    });
    ro.observe(el);
    return () => { ro.disconnect(); clearTimeout(timer); };
  }, []);

  useEffect(() => {
    if (isFirstTab.current) { isFirstTab.current = false; return; }

    if (showTimer.current) clearTimeout(showTimer.current);
    if (fadeTimer.current) clearTimeout(fadeTimer.current);

    setSpinnerPhase("showing");

    showTimer.current = setTimeout(() => {
      setSpinnerPhase("fading");
      fadeTimer.current = setTimeout(() => setSpinnerPhase("hidden"), 500);
    }, 500);

    return () => {
      if (showTimer.current) clearTimeout(showTimer.current);
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    };
  }, [activeTab]);

  // ─── Tab transition system ─────────────────────────────────────────────────
  const { displayedTab, phase } = useTabTransition(activeTab);

  const setTab = (t: TabKey) => {
    // router.push keeps the Next.js router in sync (prefetching, middleware,
    // scroll restoration) while { scroll: false } lets us do our own smooth
    // scroll — matching the original UX without bypassing the router.
    router.push(`?tab=${t}`, { scroll: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Merge live match state back into the event object passed to tabs.
  // All other event fields stay server-fresh; only matches update on the client.
  const liveEvent: MappedEvent = { ...event, matches };

  const bannerUrl = event.banner_image?.id ? getAssetUrl(event.banner_image) : null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: LOCAL_KEYFRAMES + KEYFRAMES }} />

      <div
        ref={mainRef}
        style={{
          position:      "relative",
          minHeight:     "calc(100vh - 64px)",
          display:       "flex",
          flexDirection: "column",
          overflowX:     "hidden",
          background:    `linear-gradient(to bottom, ${BG_TOP}, ${BG_BOTTOM})`,
        }}
      >
        {/* Batik pattern overlay */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "100%", zIndex: 0, opacity: 0, animation: "edc-fade-in 0.4s ease 0ms forwards" }}>
          <div style={{
            position: "absolute", top: -100, left: 0, right: 0, height: "100%", maxHeight: 1200,
            backgroundImage: "url(/Batik_Pattern_dark.svg)", opacity: 0.4,
            pointerEvents: "none", backgroundSize: "1400px auto",
            backgroundRepeat: "repeat-x", backgroundPosition: "top center",
            transform: "scaleY(-1)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0px, black 250px)",
            maskImage: "linear-gradient(to bottom, transparent 0px, black 250px)",
          }} />
        </div>

        {/* Banner image */}
        {bannerUrl && (
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0,
            height: BG_IMAGE_HEIGHT, overflow: "hidden",
            WebkitMaskImage: IMAGE_MASK, maskImage: IMAGE_MASK, zIndex: 0,
            opacity: 0, animation: "edc-fade-in 0.4s ease 0ms forwards",
          }}>
            <div style={{
              position: "absolute", inset: 0,
              backgroundImage: `url(${bannerUrl})`,
              backgroundSize: "cover", backgroundPosition: "center",
              filter: "blur(8px)", transform: "scale(1.05)",
            }} />
            <div style={{ position: "absolute", inset: 0, background: TINT_COLOR, pointerEvents: "none" }} />
          </div>
        )}

        <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column", opacity: 0, animation: "edc-fade-in 0.4s ease 0ms forwards" }}>
          <div style={{ flex: "1 0 auto", minHeight: "calc(100vh - 64px)" }}>
            <EventDetailHeader
              event={event}
              activeTab={activeTab}
              onTabChange={setTab}
              isMobile={isMobile}
              spinnerPhase={spinnerPhase}
            />

            <div style={{ padding: isMobile ? "0 20px 40px" : "0 clamp(20px, 8.33vw, 160px) 40px" }}>
              {/* Stale data warning — shown when polling has silently stalled >60s */}
              {isStale && displayedTab === "matches" && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)",
                  borderRadius: 8, padding: "10px 16px", marginBottom: 16,
                }}>
                  <span style={{ fontSize: 16 }}>⚠️</span>
                  <span style={{ ...JK, fontSize: 13, fontWeight: 600, color: "#FCA5A5" }}>
                    Live scores may be outdated — last update was over 60 seconds ago.
                  </span>
                </div>
              )}
              <div>
                {displayedTab === "overview" && (
                  <ErrorBoundary label="Overview">
                    <OverviewTab event={liveEvent} isMobile={isMobile} phase={phase} onTabChange={setTab} />
                  </ErrorBoundary>
                )}
                {displayedTab === "matches" && (
                  <ErrorBoundary label="Matches">
                    <MatchesTab
                      event={liveEvent}
                      isMobile={isMobile}
                      phase={phase}
                      lastUpdated={lastUpdated}
                      isPolling={isPolling}
                    />
                  </ErrorBoundary>
                )}
                {displayedTab === "participants" && (
                  <ErrorBoundary label="Participants">
                    <ParticipantsTab event={liveEvent} isMobile={isMobile} phase={phase} />
                  </ErrorBoundary>
                )}
                {displayedTab === "news" && (
                  <ErrorBoundary label="News">
                    <NewsTab event={liveEvent} isMobile={isMobile} phase={phase} />
                  </ErrorBoundary>
                )}
              </div>
            </div>

            <div style={{ opacity: 0, animation: "edc-marquee-up 0.5s ease 900ms forwards" }}>
              <UniversityMarquee />
            </div>
          </div>

          <div style={{ height: 120 }} />
          <Footer />
        </div>
      </div>
    </>
  );
}