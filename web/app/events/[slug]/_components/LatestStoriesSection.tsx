import Button from "@/components/Button";

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
        {/* Thumbnail - INCREASED HEIGHT from 160 to 200 */}
        <div style={{
          height: 200, position: "relative",
          background: item.thumbnail_url ? undefined : "#E5E7EB",
          backgroundImage: item.thumbnail_url ? `url(${item.thumbnail_url})` : undefined,
          backgroundSize: "cover", backgroundPosition: "center",
          flexShrink: 0,
        }}>
          <span style={{
            ...JK, position: "absolute", top: 12, left: 12,
            fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase",
            padding: "4px 10px", borderRadius: 4,
            background: CATEGORY_COLOR[item.category] ?? "#6B7280",
            color: "#fff",
          }}>
            {item.event_name ?? item.category}
          </span>
        </div>

        {/* Body - INCREASED FONT SIZES */}
        <div style={{ padding: "20px 22px 22px", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ ...JK, fontSize: 12, color: "#9CA3AF", fontWeight: 500 }}>{fmtDate(item.published_at)}</div>
          
          {/* Title: 14px -> 18px */}
          <div style={{ ...JK, fontSize: 18, fontWeight: 800, color: "#06125C", lineHeight: 1.3 }}>
            {item.title}
          </div>

          {item.excerpt && (
            <div style={{
              ...JK, fontSize: 14, color: "#6B7280", lineHeight: 1.6,
              overflow: "hidden", display: "-webkit-box",
              WebkitLineClamp: 3, WebkitBoxOrient: "vertical",
            } as React.CSSProperties}>
              {item.excerpt}
            </div>
          )}

          <div style={{ ...JK, fontSize: 14, fontWeight: 700, color: "#0D26C2", marginTop: "auto", paddingTop: 12 }}>
            Read more
          </div>
        </div>
      </div>
    </a>
  );
}

export default function LatestStoriesSection({ news, eventSlug }: { news: any[]; eventSlug: string }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 30 , marginTop: 60}}>
        <span style={{ ...JK, fontSize: 22, fontWeight: 800, color: "#fff", whiteSpace: "nowrap" }}>
          Latest Stories
        </span>
        <div style={{ flex: 1, height: 2, background: "rgba(255,255,255,0.8)" }} />
        <Button 
          variant="header-outline" 
          size="sm" 
          href={`/berita?event=${eventSlug}`}
          showShadow={false}
        >
          see more
        </Button>
      </div>

      {/* cards */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", 
        gap: 20, 
        alignItems: "stretch" 
      }}>
        {news.map((item) => <NewsCard key={item.id} item={item} />)}
      </div>
    </div>
  );
}