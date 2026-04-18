"use client";

// Paste this export into your existing /components/NewsCard.tsx
// right above the default export, replacing the old NewsCardSkeleton.
//
// Matches NewsCard exactly:
//   - Outer: borderRadius 8, boxShadow "0 0 0 2px #FFFFFF"
//   - Inner white box: borderRadius 6, bg #fff
//   - Image area: height 200, bg #E5E7EB
//   - Body padding: "20px 22px 22px"
//   - Date bone:    12px tall, 30% wide,  marginBottom 8
//   - Title bones:  20px tall, 90%+55%,   marginBottom 12
//   - Excerpt bones: 13px tall, 100%+75%, marginBottom 16
//   - Divider:      1px #F3F4F6, marginTop auto
//   - Read more:    14px tall, 28% wide,  paddingTop 16

function Bone({ width, height, delay = "0s", radius = 4 }: {
  width: string | number;
  height: number;
  delay?: string;
  radius?: number;
}) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: "#E5E7EB",
      position: "relative", overflow: "hidden", flexShrink: 0,
    }}>
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.7) 50%, transparent 100%)",
        animation: `news-shimmer 1.6s ease-in-out ${delay} infinite`,
      }} />
    </div>
  );
}

export function NewsCardSkeleton() {
  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%",
      borderRadius: 8, overflow: "hidden",
      // Identical to the real card's default (non-hovered) boxShadow
      boxShadow: "0 0 0 2px #FFFFFF",
    }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes news-shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}} />

      {/* Mirrors the real card's inner white rounded box */}
      <div style={{
        background: "#fff", borderRadius: 6, overflow: "hidden",
        flex: 1, display: "flex", flexDirection: "column",
      }}>

        {/* Image — height 200, #E5E7EB is the real card's backgroundColor fallback */}
        <div style={{ height: 200, background: "#E5E7EB", flexShrink: 0, position: "relative", overflow: "hidden" }}>
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)",
            animation: "news-shimmer 1.6s ease-in-out infinite",
          }} />
        </div>

        {/* Body — exact same padding as the real card */}
        <div style={{ padding: "20px 22px 22px", flex: 1, display: "flex", flexDirection: "column" }}>

          {/* Date row — fontSize 12, marginBottom 8 */}
          <Bone width="30%" height={12} delay="0s" />

          {/* Title — fontSize 18 * lineHeight 1.3 ≈ 23px, two lines, marginBottom 12 */}
          <div style={{ marginTop: 8, marginBottom: 12, display: "flex", flexDirection: "column", gap: 7 }}>
            <Bone width="90%" height={20} delay="0.05s" />
            <Bone width="55%" height={20} delay="0.1s"  />
          </div>

          {/* Excerpt — fontSize 14, lineClamp 2, marginBottom 16 */}
          <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            <Bone width="100%" height={13} delay="0.12s" />
            <Bone width="75%"  height={13} delay="0.17s" />
          </div>

          {/* Divider — exact match: 1px, #F3F4F6, marginTop auto */}
          <div style={{ height: 1, background: "#F3F4F6", width: "100%", marginTop: "auto" }} />

          {/* Read more — paddingTop 16, matches real card's bottom strip */}
          <div style={{ paddingTop: 16 }}>
            <Bone width="28%" height={14} delay="0.2s" />
          </div>
        </div>
      </div>
    </div>
  );
}