"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import EventsHeader from "./EventsHeader";
import EventsTable, { type EventListing } from "./EventsTable";
import { getAssetUrl } from "@/lib/directus";
import UniversityMarquee from "@/components/UniversityMarquee";
import Footer from "@/components/Footer";

type FilterType = "all" | "sport" | "arts";

const STATUS_ORDER: Record<string, number> = {
  active: 0, upcoming: 1, finished: 2, cancelled: 3, draft: 4,
};

const PER_PAGE    = 6;
const CYCLE_MS    = 5000;
const FADE_MS     = 700;
const PRELOAD_TTL = 8000; // ms before giving up on a slow/failed image

const BG_TOP    = "#0D26C2 30%";
const BG_BOTTOM = "#06125C";

const BG_IMAGE_HEIGHT = "clamp(500px, 65vh, 650px)";
const IMAGE_MASK      = "linear-gradient(to bottom, black 30%, transparent 85%)";
const TINT_COLOR      = "linear-gradient(to top, rgba(13, 38, 194, 0.7) 0%, rgba(13, 38, 194, 0.5) 0%)";

const PAGE_KEYFRAMES = `
  @keyframes epc-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes epc-marquee-up {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
`;

//  Helpers 

function sortEvents(events: EventListing[]): EventListing[] {
  return [...events].sort((a, b) => {
    const sa = STATUS_ORDER[a.status] ?? 9;
    const sb = STATUS_ORDER[b.status] ?? 9;
    if (sa !== sb) return sa - sb;
    const da = a.start_date ? new Date(a.start_date).getTime() : 0;
    const db = b.start_date ? new Date(b.start_date).getTime() : 0;
    return da - db;
  });
}

function getImageUrl(ev: EventListing): string | null {
  if (ev?.banner_image?.id) return getAssetUrl(ev.banner_image);
  if (ev?.card_image?.id)   return getAssetUrl(ev.card_image);
  return null;
}

function preloadWithTimeout(url: string): Promise<void> {
  return new Promise<void>(res => {
    const img = new Image();
    const t   = setTimeout(res, PRELOAD_TTL);
    img.onload = img.onerror = () => { clearTimeout(t); res(); };
    img.src = url;
  });
}

//  BgCrossfade 

function BgCrossfade({ cycleEvents }: { cycleEvents: EventListing[] }) {
  const [imgA, setImgA]   = useState<string | null>(() => getImageUrl(cycleEvents[0] ?? null as any));
  const [imgB, setImgB]   = useState<string | null>(null);
  const [front, setFront] = useState<"a" | "b">("a");
  const [ready, setReady] = useState(false);
  const indexRef          = useRef(0);
  const frontRef          = useRef<"a" | "b">("a");
  const timerRef          = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (cycleEvents.length === 0) return;
    setImgA(getImageUrl(cycleEvents[0]));

    let cancelled = false;

    const urls = cycleEvents.map(ev => getImageUrl(ev)).filter((u): u is string => !!u);
    Promise.all(urls.map(preloadWithTimeout))
      .then(() => { if (!cancelled) setReady(true); });

    return () => { cancelled = true; };
  }, [cycleEvents]);

  useEffect(() => {
    if (cycleEvents.length <= 1 || !ready) return;

    const schedule = () => {
      timerRef.current = setTimeout(() => {
        const nextIdx = (indexRef.current + 1) % cycleEvents.length;
        const nextUrl = getImageUrl(cycleEvents[nextIdx]);
        indexRef.current = nextIdx;

        const next = frontRef.current === "a" ? "b" : "a";
        frontRef.current = next;
        if (next === "b") setImgB(nextUrl);
        else              setImgA(nextUrl);
        setFront(next);

        schedule();
      }, CYCLE_MS);
    };

    schedule();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [cycleEvents, ready]);

  return (
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0,
      height: BG_IMAGE_HEIGHT, overflow: "hidden",
      WebkitMaskImage: IMAGE_MASK, maskImage: IMAGE_MASK,
      zIndex: 0,
    }}>
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: imgA ? `url(${imgA})` : undefined,
        backgroundSize: "cover", backgroundPosition: "center",
        filter: "blur(3px)", transform: "scale(1.05)",
        opacity: front === "a" ? 1 : 0,
        transition: `opacity ${FADE_MS}ms ease-in-out`,
      }} />
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: imgB ? `url(${imgB})` : undefined,
        backgroundSize: "cover", backgroundPosition: "center",
        filter: "blur(3px)", transform: "scale(1.05)",
        opacity: front === "b" ? 1 : 0,
        transition: `opacity ${FADE_MS}ms ease-in-out`,
      }} />
      <div style={{ position: "absolute", inset: 0, background: TINT_COLOR, pointerEvents: "none" }} />
    </div>
  );
}

//  Main page component 

export default function EventPageClient({ events: rawEvents }: { events: EventListing[] }) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [page, setPage]     = useState(1);

  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  const mainRef = useRef<HTMLElement>(null);
  const [isMobile, setIsMobile]           = useState(false);
  const [containerWidth, setContainerWidth] = useState(1280);
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      setIsMobile(w < 1024);
      setContainerWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const sorted = useMemo(() => sortEvents(rawEvents), [rawEvents]);

  const cycleEvents = useMemo(
    () => sorted.filter(e => e.status === "active" || e.status === "upcoming"),
    [sorted],
  );

  const filtered = useMemo(() => {
    let list = sorted;
    if (filter !== "all") list = list.filter(e => e.type === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(e =>
        e.name.toLowerCase().includes(q) ||
        (e.location ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [sorted, filter, search]);

  const handleFilter = (f: FilterType) => { setFilter(f); setPage(1); };
  const handleSearch = (s: string)      => { setSearch(s); setPage(1); };

  const paginated = useMemo(
    () => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    [filtered, page],
  );

  return (
    <>
      <style>{PAGE_KEYFRAMES}</style>
      <main ref={mainRef} style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: `linear-gradient(to bottom, ${BG_TOP}, ${BG_BOTTOM})`,
      }}>
        {/* batik */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "100%", zIndex: 0, opacity: 0, animation: "epc-fade-in 0.4s ease 0ms forwards" }}>
          <div style={{
            position: "absolute", 
            top: -100, left: 0, right: 0,
            height: 1200, 
            backgroundImage: "url(/Batik_Pattern_dark.svg)",
            opacity: 0.4, 
            pointerEvents: "none",
            backgroundSize: "1400px auto", 
            backgroundRepeat: "repeat-x",
            backgroundPosition: "top center",
            transform: "scaleY(-1)", 
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0px, black 250px)",
            maskImage: "linear-gradient(to bottom, transparent 0px, black 250px)",
          }} />
        </div>

        {/* 2. MIDDLE LAYER: Image Crossfade sits on top of the batik */}
        <div style={{ opacity: 0, animation: "epc-fade-in 0.4s ease 0ms forwards" }}>
          <BgCrossfade cycleEvents={cycleEvents} />
        </div>

        {/* 3. TOP LAYER: Content (Header, Table, etc) */}
        <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column", opacity: 0, animation: "epc-fade-in 0.4s ease 0ms forwards" }}>
          {/* Fills exactly 100% of the visible screen below the navbar */}
          <div style={{ flex: "1 0 auto", minHeight: "calc(100vh - 64px)" }}>
            <EventsHeader
              filter={filter}
              search={search}
              onFilterChange={handleFilter}
              onSearchChange={handleSearch}
              isMobile={isMobile}
            />

            <div style={{ padding: isMobile ? `0 20px 24px` : `0 clamp(20px, 8.33%, 160px) 34px` }}>
              <EventsTable
                events={paginated}
                total={filtered.length}
                page={page}
                perPage={PER_PAGE}
                onPageChange={setPage}
                loading={loading}
                isMobile={isMobile}
                containerWidth={containerWidth}
              />
            </div>

            <div style={{ opacity: 0, animation: "epc-marquee-up 0.5s ease 900ms forwards" }}>
              <UniversityMarquee />
            </div>
          </div>

          <div style={{ height: 120 }} />
          <Footer />
        </div>
      </main>
    </>
  );
}