"use client";
import { useRouter } from "nextjs-toploader/app";
import { useState } from "react";
import Image from "next/image";
import { getAssetUrl } from "@/lib/directus";
import Button from "@/components/Button";

//  Types 

interface CardImage {
  id:           string;
  uploaded_on?: string;
  width?:       number;
  height?:      number;
}

interface UserCreated {
  organisation_name?: string;
}

type EventStatus = "active" | "upcoming" | "finished" | "cancelled" | "draft";
type EventType   = "sport" | "arts";

export interface EventListing {
  id:                   string;
  name:                 string;
  slug:                 string;
  status:               EventStatus;
  type:                 EventType;
  start_date:           string | null;
  end_date:             string | null;
  location:             string | null;
  is_registration_open: boolean;
  is_published:         boolean;
  card_image:           CardImage | null;
  banner_image:         { id: string; uploaded_on?: string } | null;
  user_created:         UserCreated | null;
}

interface Props {
  events:          EventListing[];
  total:           number;
  page:            number;
  perPage:         number;
  onPageChange:    (p: number) => void;
  loading?:        boolean;
  isMobile?:       boolean;
  containerWidth?: number;
}

//  Helpers 

/** Strip anything that isn't a slug character to prevent path traversal. */
function safeSlug(slug: string | undefined | null): string {
  return (slug ?? "").replace(/[^a-z0-9-]/gi, "");
}

const JK       = { fontFamily: "'Plus Jakarta Sans', sans-serif" } as const;
const BTN_WIDTH = "100px";

//  Keyframes 

const KEYFRAMES = `
  @keyframes evt-shimmer {
    0%   { background-position: -600px 0; }
    100% { background-position:  600px 0; }
  }
  @keyframes evt-fade-up {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
  @keyframes evt-row-in {
    from { opacity: 0; transform: translateX(-8px); }
    to   { opacity: 1; transform: translateX(0);    }
  }
`;

const SHIMMER_BG = `linear-gradient(90deg, #f0f0f0 25%, #e4e4e4 37%, #f0f0f0 63%)`;

//  Skeleton cells 

function SkeletonCell({ width = "80%", height = 14, radius = 4 }: {
  width?: string | number; height?: number; radius?: number;
}) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: SHIMMER_BG, backgroundSize: "600px 100%",
      animation: "evt-shimmer 1.4s ease infinite",
    }} />
  );
}

function DesktopSkeletonRow({ index, cellPad }: { index: number; cellPad: string }) {
  return (
    <tr style={{ borderBottom: "1px solid #f5f5f5", opacity: 0, animation: `evt-fade-up 0.4s ease ${index * 60}ms forwards` }}>
      <td style={{ padding: cellPad }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 104, height: 68, flexShrink: 0, borderRadius: 4, background: SHIMMER_BG, backgroundSize: "600px 100%", animation: "evt-shimmer 1.4s ease infinite" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
            <SkeletonCell width="65%" height={13} />
            <SkeletonCell width="40%" height={11} />
          </div>
        </div>
      </td>
      <td style={{ padding: cellPad }}><SkeletonCell width={56} height={22} radius={4} /></td>
      <td style={{ padding: cellPad }}><SkeletonCell width={110} height={13} /></td>
      <td style={{ padding: cellPad }}><SkeletonCell width="75%" height={13} /></td>
      <td style={{ padding: cellPad }}><SkeletonCell width={70} height={22} radius={4} /></td>
      <td style={{ padding: cellPad }}><SkeletonCell width={80} height={30} radius={6} /></td>
    </tr>
  );
}

function MobileSkeletonRow({ index }: { index: number }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #ECEEF2", borderRadius: 10, overflow: "hidden",
      opacity: 0, animation: `evt-fade-up 0.4s ease ${index * 60}ms forwards`,
    }}>
      {/* Banner */}
      <div style={{ width: "100%", height: 80, background: SHIMMER_BG, backgroundSize: "600px 100%", animation: "evt-shimmer 1.4s ease infinite" }} />
      {/* Body */}
      <div style={{ padding: "10px 12px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
        <SkeletonCell width="75%" height={13} />
        <SkeletonCell width="50%" height={11} />
        <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
          <SkeletonCell width={46} height={18} radius={4} />
          <SkeletonCell width={90} height={11} radius={3} />
        </div>
      </div>
    </div>
  );
}

//  Shared helpers 

function formatDate(start: string | null, end: string | null): string {
  if (!start) return "-";
  const s    = new Date(start);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
  if (!end || end === start) return s.toLocaleDateString("en-GB", opts);
  const e = new Date(end);
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${s.getDate()} – ${e.toLocaleDateString("en-GB", opts)}`;
  }
  return `${s.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${e.toLocaleDateString("en-GB", opts)}`;
}

type BadgeKey = "ongoing" | "upcoming_open" | "upcoming_closed" | "finished" | "cancelled";

const STATUS_BADGES: Record<BadgeKey, { bg: string; color: string; label: string }> = {
  ongoing:         { bg: "#e6f9f0", color: "#1a8a50", label: "Ongoing"     },
  upcoming_open:   { bg: "#fef9e7", color: "#b7860b", label: "Registering" },
  upcoming_closed: { bg: "#e8eaf6", color: "#3949ab", label: "Upcoming"    },
  finished:        { bg: "#f5f5f5", color: "#999",    label: "Finished"    },
  cancelled:       { bg: "#fdecea", color: "#c0392b", label: "Cancelled"   },
};

function getBadgeKey(ev: EventListing): BadgeKey {
  if (ev.status === "finished")  return "finished";
  if (ev.status === "cancelled") return "cancelled";
  if (ev.status === "active")    return "ongoing";
  if (ev.status === "upcoming")  return ev.is_registration_open ? "upcoming_open" : "upcoming_closed";
  return "finished";
}

function StatusBadge({ ev }: { ev: EventListing }) {
  const s = STATUS_BADGES[getBadgeKey(ev)];
  return (
    <span style={{
      ...JK, fontWeight: 600, fontSize: 11, letterSpacing: 0.5,
      padding: "3px 10px", borderRadius: 4,
      background: s.bg, color: s.color,
      textTransform: "uppercase", whiteSpace: "nowrap",
    }}>
      {s.label}
    </span>
  );
}

function CategoryChip({ ev }: { ev: EventListing }) {
  return (
    <span style={{
      ...JK, fontWeight: 600, fontSize: 11,
      padding: "3px 8px", borderRadius: 4,
      background: ev.type === "sport" ? "#e8f1fd" : "#fdf2e8",
      color:      ev.type === "sport" ? "#1a6fc4" : "#c47a1a",
      whiteSpace: "nowrap",
    }}>
      {ev.type === "sport" ? "Sports" : "Arts"}
    </span>
  );
}

function CtaButton({ ev, small = false }: { ev: EventListing; small?: boolean }) {
  if (ev.status === "cancelled") return null;
  // Always navigate to the event detail page — no external registration redirect.
  const href = `/events/${safeSlug(ev.slug)}`;
  return (
    <Button
      variant={"secondary"}
      size="sm"
      href={href}
      fixedWidth={small ? "80px" : BTN_WIDTH}
      showShadow={false}
      showIcon={true}
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
    >
      Open
    </Button>
  );
}

//  Desktop row (<tr>) 

function DesktopEventRow({ ev, isLast, index, cellPad, thumbW, thumbH }: {
  ev: EventListing; isLast: boolean; index: number;
  cellPad: string; thumbW: number; thumbH: number;
}) {
  const router  = useRouter();
  const [hovered, setHovered] = useState(false);
  const imgUrl  = ev.card_image?.id ? getAssetUrl(ev.card_image) : null;

  // Guard: skip malformed rows rather than crash
  if (!ev?.id || !ev?.name || !ev?.status) return null;

  function handleRowClick() {
    router.push(`/events/${safeSlug(ev.slug)}`);
  }

  return (
    <tr
      onClick={handleRowClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderBottom: isLast ? "none" : "1px solid #f5f5f5",
        background: hovered
          ? "linear-gradient(to right, rgba(13,38,194,0.03), transparent)"
          : "transparent",
        cursor: "pointer",
        transition: "background 0.2s ease-in-out",
        opacity: 0,
        animation: `evt-row-in 0.45s cubic-bezier(0.22,1,0.36,1) ${index * 55}ms forwards`,
      }}
    >
      <td style={{ padding: cellPad }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: thumbW, height: thumbH, flexShrink: 0, borderRadius: 4, overflow: "hidden", background: "#e8eaf6", position: "relative" }}>
            {imgUrl && <Image src={imgUrl} alt={ev.name} fill style={{ objectFit: "cover" }} />}
          </div>
          <div>
            <div style={{ ...JK, fontWeight: 700, fontSize: 14, color: "#111", lineHeight: 1.3 }}>{ev.name}</div>
            {ev.user_created?.organisation_name && (
              <div style={{ ...JK, fontWeight: 700, fontSize: 12, color: "#999", marginTop: 3 }}>
                by {ev.user_created.organisation_name}
              </div>
            )}
          </div>
        </div>
      </td>
      <td style={{ padding: cellPad, whiteSpace: "nowrap" }}><CategoryChip ev={ev} /></td>
      <td style={{ ...JK, fontSize: 13, color: "#555", padding: cellPad, whiteSpace: "nowrap" }}>
        {formatDate(ev.start_date, ev.end_date)}
      </td>
      <td style={{ ...JK, fontSize: 13, color: "#555", padding: cellPad, maxWidth: 180, textWrap: "balance", }}>
        {ev.location ?? "-"}
      </td>
      <td style={{ padding: cellPad, whiteSpace: "nowrap" }}><StatusBadge ev={ev} /></td>
      <td style={{ padding: cellPad, whiteSpace: "nowrap" }}><CtaButton ev={ev} /></td>
    </tr>
  );
}

//  Mobile card row

function MobileEventRow({ ev, index }: { ev: EventListing; isLast: boolean; index: number }) {
  const router   = useRouter();
  const [pressed, setPressed] = useState(false);

  // Prefer banner for the wide card image, fall back to card_image
  const bannerUrl = ev.banner_image?.id ? getAssetUrl(ev.banner_image) : null;
  const cardUrl   = ev.card_image?.id   ? getAssetUrl(ev.card_image)   : null;
  const imgUrl    = bannerUrl ?? cardUrl;

  if (!ev?.id || !ev?.name || !ev?.status) return null;

  const truncate1: React.CSSProperties = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
  const truncate2: React.CSSProperties = {
    display: "-webkit-box", WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical", overflow: "hidden",
  } as React.CSSProperties;
  const badge = STATUS_BADGES[getBadgeKey(ev)];

  return (
    <div
      onClick={() => router.push(`/events/${safeSlug(ev.slug)}`)}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        background:    pressed ? "#F0F2FF" : "#fff",
        border:        "1px solid #ECEEF2",
        borderRadius:  10,
        overflow:      "hidden",
        cursor:        "pointer",
        transition:    "background 0.15s",
        opacity:       0,
        animation:     `evt-row-in 0.45s cubic-bezier(0.22,1,0.36,1) ${index * 55}ms forwards`,
        display:       "flex",
        flexDirection: "column",
      }}
    >
      {/* Banner image with status badge overlaid top-right */}
      <div style={{ position: "relative", width: "100%", height: 80, background: "#e8eaf6", flexShrink: 0 }}>
        {imgUrl && (
          <Image src={imgUrl} alt={ev.name} fill style={{ objectFit: "cover" }} />
        )}
        {/* Dark scrim so badge is readable over any image */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.18) 0%, transparent 60%)" }} />
        <span style={{
          position: "absolute", top: 8, right: 8,
          ...JK, fontSize: 10, fontWeight: 700, letterSpacing: 0.4,
          padding: "3px 8px", borderRadius: 4,
          background: badge.bg, color: badge.color,
          textTransform: "uppercase", whiteSpace: "nowrap",
          boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
        }}>
          {badge.label}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: "10px 12px 12px" }}>
        <div style={{ ...JK, ...truncate2, fontSize: 13, fontWeight: 700, color: "#111", lineHeight: 1.35, marginBottom: 6 }}>
          {ev.name}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <CategoryChip ev={ev} />
          {ev.start_date && (
            <span style={{ ...JK, ...truncate1, fontSize: 10, fontWeight: 500, color: "#aaa" }}>
              {formatDate(ev.start_date, ev.end_date)}
            </span>
          )}
        </div>
        {ev.location && (
          <div style={{ ...JK, ...truncate1, fontSize: 10, fontWeight: 500, color: "#aaa", marginTop: 4 }}>
            📍 {ev.location}
          </div>
        )}
      </div>
    </div>
  );
}

//  Pagination button 

function PageBtn({ children, onClick, disabled, active }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean; active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...JK, fontWeight: active ? 700 : 500, fontSize: 13,
        width: 32, height: 32, borderRadius: 6,
        border: active ? "none" : "1.5px solid #e8e8e8",
        background: active ? "#0D26C2" : "transparent",
        color: active ? "#fff" : disabled ? "#ccc" : "#555",
        cursor: disabled ? "default" : "pointer",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        transition: "background 0.15s",
      }}
    >
      {children}
    </button>
  );
}

//  COLS (desktop only) 

const COLS: { label: string; shrink?: boolean }[] = [
  { label: "EVENT" },
  { label: "CATEGORY",     shrink: true },
  { label: "DATE",         shrink: true },
  { label: "LOCATION" },
  { label: "STATUS",       shrink: true },
  { label: "PAGE DETAILS", shrink: true },
];

const SKELETON_ROWS = 6;

//  Main export 

export default function EventsTable({
  events, total, page, perPage, onPageChange,
  loading = false, isMobile = false, containerWidth = 1280,
}: Props) {
  // Tighten horizontal cell padding on narrow desktop to prevent column squeeze
  const cellPx  = containerWidth < 1200 ? 10 : containerWidth < 1380 ? 14 : 20;
  const cellPad = `14px ${cellPx}px`;
  const thumbW  = containerWidth < 1200 ? 72 : 104;
  const thumbH  = containerWidth < 1200 ? 48 : 68;

  const totalPages = Math.ceil(total / perPage);
  const from       = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to         = Math.min(page * perPage, total);

  function getStatusPriority(ev: EventListing): number {
    if (ev.status === "active") return 0;
    if (ev.status === "upcoming" && ev.is_registration_open) return 1;
    if (ev.status === "upcoming") return 2;
    return 3;
  }

  const sortedEvents = [...events].sort((a, b) => {
    const diff = getStatusPriority(a) - getStatusPriority(b);
    if (diff !== 0) return diff;
    return new Date(a.start_date || 0).getTime() - new Date(b.start_date || 0).getTime();
  });

  function pageNums(): (number | "...")[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const nums: (number | "...")[] = [1];
    if (page > 3) nums.push("...");
    for (let p = Math.max(2, page - 1); p <= Math.min(totalPages - 1, page + 1); p++) nums.push(p);
    if (page < totalPages - 2) nums.push("...");
    nums.push(totalPages);
    return nums;
  }

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div style={{
        background: "#fff", borderRadius: 8, overflow: "hidden",
        boxShadow: "0 4px 32px rgba(0,0,0,0.12)",
        opacity: 0,
        animation: `evt-fade-up 0.55s cubic-bezier(0.22,1,0.36,1) 420ms forwards`,
      }}>
        {/*  MOBILE layout  */}
        {isMobile && (
          <>
            <div style={{ padding: "14px 16px 10px" }}>
              <span style={{ ...JK, fontSize: 14, fontWeight: 800, color: "#06125C" }}>
                Event Listing
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(1, 1fr)", gap: 8, padding: "12px 12px 4px" }}>
              {loading && Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                <MobileSkeletonRow key={`msk-${i}`} index={i} />
              ))}
              {!loading && sortedEvents.length === 0 && (
                <div style={{ ...JK, textAlign: "center", padding: "48px 16px", color: "#bbb", fontSize: 14 }}>
                  No events found.
                </div>
              )}
              {!loading && sortedEvents.map((ev, i) => (
                <MobileEventRow key={ev.id} ev={ev} isLast={i === sortedEvents.length - 1} index={i} />
              ))}
            </div>
          </>
        )}

        {/*  DESKTOP layout  */}
        {!isMobile && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
              <thead>
                <tr style={{ borderBottom: "1.5px solid #f0f0f0" }}>
                  {COLS.map((col, i) => (
                    <th key={i} style={{
                      ...JK, fontWeight: 900, fontSize: 12,
                      color: "#06125C", textAlign: "left",
                      padding: cellPad, letterSpacing: 0.8,
                      whiteSpace: "nowrap",
                      width: col.shrink ? "1%" : undefined,
                    }}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                  <DesktopSkeletonRow key={`sk-${i}`} index={i} cellPad={cellPad} />
                ))}
                {!loading && sortedEvents.length === 0 && (
                  <tr>
                    <td colSpan={COLS.length} style={{ ...JK, textAlign: "center", padding: "56px 20px", color: "#bbb", fontSize: 14 }}>
                      No events found.
                    </td>
                  </tr>
                )}
                {!loading && sortedEvents.map((ev, i) => (
                  <DesktopEventRow
                    key={ev.id} ev={ev}
                    isLast={i === sortedEvents.length - 1}
                    index={i} cellPad={cellPad} thumbW={thumbW} thumbH={thumbH}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/*  Pagination  */}
        {!loading && total > 0 && (
          <div style={{
            ...JK,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: isMobile ? "10px 12px" : cellPad,
            borderTop: "1px solid #f0f0f0",
            fontSize: 13, color: "#999",
            flexWrap: "wrap", gap: 10,
          }}>
            <span style={{ fontSize: isMobile ? 12 : 13 }}>Showing {from}–{to} of {total} events</span>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <PageBtn onClick={() => onPageChange(page - 1)} disabled={page === 1}>{"<"}</PageBtn>
              {pageNums().map((p, i) =>
                p === "..."
                  ? <span key={`el-${i}`} style={{ ...JK, padding: "0 4px", color: "#bbb" }}>…</span>
                  : <PageBtn key={p} onClick={() => onPageChange(p as number)} active={p === page}>{p}</PageBtn>
              )}
              <PageBtn onClick={() => onPageChange(page + 1)} disabled={page === totalPages}>{">"}</PageBtn>
            </div>
          </div>
        )}
      </div>
    </>
  );
}