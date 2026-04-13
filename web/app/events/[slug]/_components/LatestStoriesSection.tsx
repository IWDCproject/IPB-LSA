const JK = { fontFamily: "'Plus Jakarta Sans', sans-serif" } as const;

const CATEGORY_COLOR: Record<string, string> = {
  announcement: "#3B82F6",
  result:       "#10B981",
  news:         "#6B7280",
  update:       "#F59E0B",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function NewsCard({ item }: { item: any }) {
  return (
    <a href={`/berita/${item.slug}`} style={{ textDecoration: "none", display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Thumbnail */}
        <div style={{
          height: 160, position: "relative",
          background: item.thumbnail_url ? undefined : "#E5E7EB",
          backgroundImage: item.thumbnail_url ? `url(${item.thumbnail_url})` : undefined,
          backgroundSize: "cover", backgroundPosition: "center",
          flexShrink: 0,
        }}>
          <span style={{
            ...JK, position: "absolute", top: 10, left: 10,
            fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase",
            padding: "3px 8px", borderRadius: 4,
            background: CATEGORY_COLOR[item.category] ?? "#6B7280",
            color: "#fff",
          }}>
            {item.event_name ?? item.category}
          </span>
        </div>

        {/* Body */}
        <div style={{ padding: "16px 18px 18px", flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ ...JK, fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>{fmtDate(item.published_at)}</div>
          <div style={{ ...JK, fontSize: 14, fontWeight: 800, color: "#06125C", lineHeight: 1.4 }}>{item.title}</div>
          {item.excerpt && (
            <div style={{
              ...JK, fontSize: 12, color: "#6B7280", lineHeight: 1.65,
              overflow: "hidden", display: "-webkit-box",
              WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
            } as React.CSSProperties}>
              {item.excerpt}
            </div>
          )}
          <div style={{ ...JK, fontSize: 12, fontWeight: 700, color: "#0D26C2", marginTop: "auto", paddingTop: 10 }}>
            Read more →
          </div>
        </div>
      </div>
    </a>
  );
}

export default function LatestStoriesSection({ news, eventSlug }: { news: any[]; eventSlug: string }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ ...JK, fontSize: 18, fontWeight: 800, color: "#fff" }}>Latest Stories</span>
          <div style={{ width: 80, height: 1, background: "rgba(255,255,255,0.2)" }} />
        </div>
        <a
          href={`/berita?event=${eventSlug}`}
          style={{ ...JK, fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.6)", textDecoration: "none" }}
        >
          see more ↗
        </a>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14, alignItems: "stretch" }}>
        {news.map((item) => <NewsCard key={item.id} item={item} />)}
      </div>
    </div>
  );
}