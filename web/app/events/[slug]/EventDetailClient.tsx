"use client";

import NProgress from "nprogress";
import { useRef, useState, useEffect } from "react";
import EventDetailHeader from "./_components/EventDetailHeader";
import OverviewTab       from "./_components/tabs/OverviewTab";
import NewsTab           from "./_components/tabs/NewsTab";
import MatchesTab        from "./_components/tabs/MatchesTab";
import ParticipantsTab   from "./_components/tabs/ParticipantsTab";
import UniversityMarquee from "@/components/UniversityMarquee";
import Footer            from "@/components/Footer";
import { getAssetUrl }   from "@/lib/directus";
import { useTabTransition } from "./_components/shared/UseTabTransition";
import { KEYFRAMES }        from "./_components/shared/Animations";
import { ErrorBoundary }    from "./_components/shared/ErrorBoundary";
import { useMatchState }    from "./hooks/useMatchState";
import type { MappedEvent, TabKey } from "./_types";

export default function EventDetailClient({ event }: { event: MappedEvent }) {
  const initialTab = (
    typeof window !== "undefined"
      ? (new URLSearchParams(window.location.search).get("tab") as TabKey)
      : null
  ) ?? "overview";
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const mainRef      = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  const [spinnerPhase,  setSpinnerPhase]  = useState<"hidden" | "showing" | "fading">("hidden");
  const showTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstTab = useRef(true);

  const { matches, lastUpdated, isPolling, wsStatus } = useMatchState(event.slug, event.matches);

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

  const { displayedTab, phase } = useTabTransition(activeTab);

  const setTab = (t: TabKey) => {
    NProgress.start();
    setActiveTab(t);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", t);
    window.history.replaceState(null, "", url.toString());
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    NProgress.done();
  }, [activeTab]);

  const liveEvent: MappedEvent = { ...event, matches };
  const bannerUrl = event.banner_image?.id ? getAssetUrl(event.banner_image) : null;

  const IMAGE_MASK = "linear-gradient(to bottom, black 30%, transparent 85%)";
  const TINT_COLOR = "linear-gradient(to top, rgba(13,38,194,0.7) 0%, rgba(13,38,194,0.5) 0%)";

  return (
    <>
      {/* KEYFRAMES from Animations.ts - can't go in Tailwind config as they use
          template strings. All other keyframes live in tailwind.config.js. */}
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

      <div
        ref={mainRef}
        className="relative min-h-[calc(100vh-64px)] flex flex-col overflow-x-hidden"
        style={{ background: "linear-gradient(to bottom, #0D26C2 30%, #06125C)" }}
      >
        {/* Batik pattern overlay */}
        <div className="absolute top-0 left-0 right-0 h-full z-0 opacity-0 animate-edc-fade-in">
          <div
            className="absolute left-0 right-0 max-h-[1200px] opacity-40 pointer-events-none bg-repeat-x"
            style={{
              top: -100, height: "100%",
              backgroundImage: "url(/Batik_Pattern_dark.svg)",
              backgroundSize: "1400px auto",
              backgroundPosition: "top center",
              transform: "scaleY(-1)",
              WebkitMaskImage: "linear-gradient(to bottom, transparent 0px, black 250px)",
              maskImage:        "linear-gradient(to bottom, transparent 0px, black 250px)",
            }}
          />
        </div>

        {/* Banner image */}
        {bannerUrl && (
          <div
            className="absolute top-0 left-0 right-0 overflow-hidden z-0 opacity-0 animate-edc-fade-in"
            style={{
              height: "clamp(500px, 65vh, 650px)",
              WebkitMaskImage: IMAGE_MASK,
              maskImage:        IMAGE_MASK,
            }}
          >
            <div
              className="absolute inset-0 bg-cover bg-center blur-lg scale-[1.05]"
              style={{ backgroundImage: `url(${bannerUrl})` }}
            />
            <div className="absolute inset-0 pointer-events-none" style={{ background: TINT_COLOR }} />
          </div>
        )}

        {/* Main content */}
        <div className="relative z-10 flex-1 flex flex-col opacity-0 animate-edc-fade-in">
          <div className="flex-[1_0_auto] min-h-[calc(100vh-64px)]">
            <EventDetailHeader
              event={event}
              activeTab={activeTab}
              onTabChange={setTab}
              isMobile={isMobile}
              spinnerPhase={spinnerPhase}
            />

            <div
              className="pb-10"
              style={{ padding: isMobile ? "0 20px 40px" : "0 clamp(20px, 8.33vw, 160px) 40px" }}
            >
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
                      wsStatus={wsStatus}
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

            <div className="opacity-0 animate-edc-marquee-up">
              <UniversityMarquee />
            </div>
          </div>

          <div className="h-[120px]" />
          <Footer />
        </div>
      </div>
    </>
  );
}