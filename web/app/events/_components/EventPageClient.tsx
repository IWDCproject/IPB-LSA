"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import EventsHeader from "./EventsHeader";
import EventsTable from "./EventsTable";
import { getAssetUrl } from "@/lib/directus";
import UniversityMarquee from "@/components/UniversityMarquee";
import Footer from "@/components/Footer";

type FilterType = "all" | "sport" | "arts";

const STATUS_ORDER: Record<string, number> = {
  active: 0, upcoming: 1, finished: 2, cancelled: 3, draft: 4,
};

const PER_PAGE = 6;
const CYCLE_MS = 5000;
const FADE_MS  = 700;

//  Palette 
const BG_TOP    = "#0D26C2 30%";
const BG_BOTTOM = "#06125C";

//  Hero image settings 
const BG_IMAGE_HEIGHT = "clamp(500px, 65vh, 650px)";

// Mask: image (+ tint) fade to transparent so they dissolve into the gradient bg
const IMAGE_MASK = "linear-gradient(to bottom, black 30%, transparent 85%)";

// Blue tint overlaid on top of the image — tune opacity to taste (0 = no tint, 1 = full)
const TINT_COLOR = "linear-gradient(to top, rgba(13, 38, 194, 0.7) 0%, rgba(13, 38, 194, 0.5) 0%)";



function sortEvents(events: any[]) {
  return [...events].sort((a, b) => {
    const sa = STATUS_ORDER[a.status] ?? 9;
    const sb = STATUS_ORDER[b.status] ?? 9;
    if (sa !== sb) return sa - sb;
    const da = a.start_date ? new Date(a.start_date).getTime() : 0;
    const db = b.start_date ? new Date(b.start_date).getTime() : 0;
    return da - db;
  });
}

function getImageUrl(ev: any): string | null {
  if (ev?.banner_image?.id) return getAssetUrl(ev.banner_image);
  if (ev?.card_image?.id)   return getAssetUrl(ev.card_image);
  return null;
}

function BgCrossfade({ cycleEvents }: { cycleEvents: any[] }) {
  const [imgA, setImgA]   = useState<string | null>(() => getImageUrl(cycleEvents[0] ?? null));
  const [imgB, setImgB]   = useState<string | null>(null);
  const [front, setFront] = useState<"a" | "b">("a");
  const [ready, setReady] = useState(false);
  const indexRef          = useRef(0);
  const timerRef          = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (cycleEvents.length === 0) return;
    setImgA(getImageUrl(cycleEvents[0]));
    const urls = cycleEvents.map(ev => getImageUrl(ev)).filter(Boolean) as string[];
    Promise.all(
      urls.map(url => new Promise<void>(res => {
        const img = new Image();
        img.onload = img.onerror = () => res();
        img.src = url;
      }))
    ).then(() => setReady(true));
  }, [cycleEvents]);

  useEffect(() => {
    if (cycleEvents.length <= 1 || !ready) return;

    const schedule = () => {
      timerRef.current = setTimeout(() => {
        const nextIdx = (indexRef.current + 1) % cycleEvents.length;
        const nextUrl = getImageUrl(cycleEvents[nextIdx]);
        indexRef.current = nextIdx;

        setFront(prev => {
          if (prev === "a") { setImgB(nextUrl); return "b"; }
          else              { setImgA(nextUrl); return "a"; }
        });

        schedule();
      }, CYCLE_MS);
    };

    schedule();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [cycleEvents, ready]);

  return (
    <div style={{
      position: "absolute",
      top: 0, left: 0, right: 0,
      height: BG_IMAGE_HEIGHT,
      overflow: "hidden",
      WebkitMaskImage: IMAGE_MASK,
      maskImage: IMAGE_MASK,
    }}>
      {/* Layer A */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: imgA ? `url(${imgA})` : undefined,
        backgroundSize: "cover", backgroundPosition: "center",
        filter: "blur(3px)", transform: "scale(1.05)",
        opacity: front === "a" ? 1 : 0,
        transition: `opacity ${FADE_MS}ms ease-in-out`,
        willChange: "opacity",
      }} />
      {/* Layer B */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: imgB ? `url(${imgB})` : undefined,
        backgroundSize: "cover", backgroundPosition: "center",
        filter: "blur(3px)", transform: "scale(1.05)",
        opacity: front === "b" ? 1 : 0,
        transition: `opacity ${FADE_MS}ms ease-in-out`,
        willChange: "opacity",
      }} />

      <div style={{
        position: "absolute", inset: 0,
        background: TINT_COLOR,
        pointerEvents: "none",
      }} />
    </div>
  );
}

export default function EventPageClient({ events: rawEvents }: { events: any[] }) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [page, setPage]     = useState(1);

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
    <main style={{
      position: "relative",
      minHeight: "100vh",
      // Single gradient, full page — the masked image dissolves into this
      background: `linear-gradient(to bottom, ${BG_TOP}, ${BG_BOTTOM})`,
    }}>
      {/* Batik texture overlay */}
      <div style={{
				position: "absolute", inset: 0, backgroundImage: "url(/Batik_Pattern_dark.svg)",
        opacity: 0.4, pointerEvents: "none",
        backgroundSize: "1400px 100%",
				backgroundRepeat: "repeat-x",
				backgroundPosition: "bottom",
				transform: "rotate(180deg)",
      }} />

			<BgCrossfade cycleEvents={cycleEvents} />

      <div style={{ position: "relative", zIndex: 1 }}>
        <EventsHeader
          filter={filter}
          search={search}
          onFilterChange={handleFilter}
          onSearchChange={handleSearch}
        />

        <div style={{ padding: `0 clamp(20px, 8.33vw, 160px) 34px` }}>
          <EventsTable
            events={paginated}
            total={filtered.length}
            page={page}
            perPage={PER_PAGE}
            onPageChange={setPage}
          />
        </div>
        <UniversityMarquee />
        <div style={{ height: 120 }} /> {/* spacer bottom margin gitu */}
        <Footer />
      </div>
    </main>
  );
}