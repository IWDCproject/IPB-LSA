"use client";

import { useState, useEffect, useRef } from "react";
import NewsCard from "../news-stuff/NewsCard";
import Button   from "@/components/Button";

// sama kayak StatSection biar konsisten
const H_MARGIN   = 160;
const MOBILE_PAD = 20;

// di bawah lebar ini switch ke layout mobile
const MOBILE_THRESHOLD = 720;

// =============================================================================
// DB SCHEMA (dari tabel `news` + join ke `events`)
// Nanti tinggal ganti DUMMY_NEWS dengan fetch ke Directus:
//   GET /items/news
//     ?filter[is_published][_eq]=true
//     &fields[]=id,title,slug,excerpt,thumbnail_url,category,published_at
//     &fields[]=event_id.name
//     &sort[]=-published_at
//     &limit=5
//
// Shape response per item:
// {
//   id:            string (UUID)
//   title:         string
//   slug:          string            <- buat link ke /news/[slug]
//   excerpt:       string | null
//   thumbnail_url: string | null
//   category:      "announcement" | "result" | "news" | "update"
//   published_at:  string (ISO 8601)
//   event_id: {
//     name:        string            <- ini yang kita tampilkan sebagai "tag"
//   } | null                        <- null kalau bukan per-event
// }
// =============================================================================

const DUMMY_NEWS = [
  {
    id:            "1",
    title:         "Kini pendaftaran dibuka untuk internasional",
    slug:          "agrinton-cup-2026-pendaftaran-internasional",
    excerpt:       null,
    thumbnail_url: "https://picsum.photos/seed/badminton/800/600",
    category:      "announcement",
    published_at:  "2026-03-20T10:00:00Z",
    event_id:      { name: "Agrinton Cup 2026" },
  },
  {
    id:            "2",
    title:         "Daftar semua karateka internasional",
    slug:          "forki-ipb-cup-karateka-internasional",
    excerpt:       null,
    thumbnail_url: "https://picsum.photos/seed/karate/400/300",
    category:      "news",
    published_at:  "2026-03-19T08:00:00Z",
    event_id:      { name: "Forki x IPB Cup 2026" },
  },
  {
    id:            "3",
    title:         "Rules dan Guidelines Hacktoday 2026",
    slug:          "hacktoday-2026-rules-guidelines",
    excerpt:       null,
    thumbnail_url: "https://picsum.photos/seed/hackathon/400/300",
    category:      "update",
    published_at:  "2026-03-18T12:00:00Z",
    event_id:      { name: "IT-Today HackToday 2026" },
  },
  {
    id:            "4",
    title:         "Team Brackets AgriValorant 2026",
    slug:          "agrivalorant-2026-team-brackets",
    excerpt:       null,
    thumbnail_url: "https://picsum.photos/seed/gaming/400/300",
    category:      "news",
    published_at:  "2026-03-17T09:30:00Z",
    event_id:      { name: "AgriValorant 2026" },
  },
  {
    id:            "5",
    title:         "Daftar tim yang tertanda melakukan kecurangan",
    slug:          "ipb-futsal-2026-tim-kecurangan",
    excerpt:       null,
    thumbnail_url: "https://picsum.photos/seed/futsal/400/300",
    category:      "result",
    published_at:  "2026-03-16T15:00:00Z",
    event_id:      { name: "IPB Futsal Competition 2026" },
  },
];

// copy paste dari StatSection, biar hook-nya konsisten di semua section
function useContainerWidth(ref) {
  const [width, setWidth] = useState(1200);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  return width;
}

// `news` prop = array dari Directus, fallback ke dummy selama belum konek DB
export default function NewsSection({ news = DUMMY_NEWS }) {
  const sectionRef = useRef(null);
  const cw         = useContainerWidth(sectionRef);

  const isMobile = cw < MOBILE_THRESHOLD;
  const pad      = isMobile ? MOBILE_PAD : H_MARGIN;

  const [main, ...rest] = news;

  return (
    <section
      ref={sectionRef}
      style={{
        ...styles.section,
        // mobile gak perlu minHeight 100vh, konten yang nentuin
        minHeight: isMobile ? "auto" : "100vh",
        padding:   isMobile ? "60px 0" : "0",
      }}
    >
      <div
        style={{
          ...styles.inner,
          paddingLeft:   pad,
          paddingRight:  pad,
          paddingBottom: isMobile ? 60 : 100,
        }}
      >
        <h2
          style={{
            ...styles.heading,
            // clamp sama persis kayak CTA di StatSection stage 3,
            // cuma ceiling-nya naik ke 4rem buat desktop
            fontSize:     "clamp(1.8rem, 7vw, 4rem)",
            marginBottom: isMobile ? 12 : 17,
          }}
        >
          Latest Stories
        </h2>

        {isMobile ? (
          // mobile: kartu besar di atas, 4 kecil 2x2 di bawah
          // basically desktop grid dirotasi 90 derajat
          <div style={styles.mobileLayout}>
            <div style={styles.mobileMainCell}>
              <NewsCard
                thumbnail_url={main.thumbnail_url}
                tag={main.event_id?.name ?? null}
                title={main.title}
                isMain
                compact
              />
            </div>
            <div style={styles.mobileSmallGrid}>
              {rest.map((item) => (
                <div key={item.id} style={styles.mobileSmallCell}>
                  <NewsCard
                    thumbnail_url={item.thumbnail_url}
                    tag={item.event_id?.name ?? null}
                    title={item.title}
                    compact
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          // desktop: besar kiri span 2 baris, 2x2 di kanan
          <div style={styles.grid}>
            <div style={styles.mainCell}>
              <NewsCard
                thumbnail_url={main.thumbnail_url}
                tag={main.event_id?.name ?? null}
                title={main.title}
                isMain
              />
            </div>
            {rest.map((item) => (
              <div key={item.id} style={styles.smallCell}>
                <NewsCard
                  thumbnail_url={item.thumbnail_url}
                  tag={item.event_id?.name ?? null}
                  title={item.title}
                />
              </div>
            ))}
          </div>
        )}

        {/* button rata kanan, konsisten desktop maupun mobile */}
        <div style={styles.buttonWrap}>
          <Button href="/news" variant="primary" size="md">
            More News
          </Button>
        </div>
      </div>
    </section>
  );
}

const styles = {
  // sama persis dengan StatSection: zIndex, boxShadow
  // hapus minHeight dari sini karena kita set dinamis di atas
  section: {
    position:       "relative",
    zIndex:         2,
    boxShadow:      "0 -30px 60px rgba(0,0,0,0.5)",
    background:     "#ffffff",
    overflow:       "hidden",
    boxSizing:      "border-box",
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
  },

  inner: {
    boxSizing: "border-box",
    width:     "100%",
  },

  // copy paste dari S.headingBase di StatSection, cuma color disesuaikan ke bg putih
  // textTransform dan letterSpacing sengaja dihapus biar identik
  heading: {
    margin:     0,
    fontFamily: "'Bebas Neue', sans-serif",
    lineHeight: 1,
    color:      "#111111",
    filter:     "drop-shadow(0 4px 4px rgba(0,0,0,0.25))",
  },

  // -- desktop grid --
  grid: {
    display:             "grid",
    gridTemplateColumns: "2fr 1fr 1fr",
    gridTemplateRows:    "260px 260px",
    gap:                 "12px",
  },

  mainCell: {
    gridRow: "1 / 3",
  },

  smallCell: {
    minHeight: 0,
  },

  // -- mobile layout --
  mobileLayout: {
    display:       "flex",
    flexDirection: "column",
    gap:           12,
  },

  // tinggi main card mobile, lebih pendek dari desktop (520px) tapi tetap dominan
  mobileMainCell: {
    width:  "100%",
    height: 280,
  },

  mobileSmallGrid: {
    display:             "grid",
    gridTemplateColumns: "1fr 1fr",
    gridTemplateRows:    "160px 160px",
    gap:                 12,
  },

  mobileSmallCell: {
    minHeight: 0,
  },

  buttonWrap: {
    display:        "flex",
    justifyContent: "flex-end",
    marginTop:      20,
  },
};
