"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getAssetUrl } from "@/lib/directus";
import Button from "@/components/Button";

const JK = { fontFamily: "'Plus Jakarta Sans', sans-serif" } as const;

const BTN_WIDTH = "100px";

interface Props {
  events:       any[];
  total:        number;
  page:         number;
  perPage:      number;
  onPageChange: (p: number) => void;
}

function formatDate(start: string | null, end: string | null): string {
  if (!start) return "-";
  const s    = new Date(start);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
  if (!end || end === start) return s.toLocaleDateString("en-GB", opts);
  const e = new Date(end);
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${s.getDate()} - ${e.toLocaleDateString("en-GB", opts)}`;
  }
  return `${s.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} - ${e.toLocaleDateString("en-GB", opts)}`;
}

type BadgeKey = "ongoing" | "upcoming_open" | "upcoming_closed" | "finished" | "cancelled";

const STATUS_BADGES: Record<BadgeKey, { bg: string; color: string; label: string }> = {
  ongoing:          { bg: "#e6f9f0", color: "#1a8a50", label: "Ongoing"      },
  upcoming_open:    { bg: "#fef9e7", color: "#b7860b", label: "Registering"  },
  upcoming_closed:  { bg: "#e8eaf6", color: "#3949ab", label: "Upcoming"     },
  finished:         { bg: "#f5f5f5", color: "#999",    label: "Finished"     },
  cancelled:        { bg: "#fdecea", color: "#c0392b", label: "Cancelled"    },
};

function getBadgeKey(ev: any): BadgeKey {
  if (ev.status === "finished")  return "finished";
  if (ev.status === "cancelled") return "cancelled";
  if (ev.status === "active")    return "ongoing";
  if (ev.status === "upcoming")  return ev.is_registration_open ? "upcoming_open" : "upcoming_closed";
  return "finished";
}

function StatusBadge({ ev }: { ev: any }) {
  const key = getBadgeKey(ev);
  const s   = STATUS_BADGES[key];
  return (
    <span style={{
      ...JK,
      fontWeight: 600,
      fontSize: 11,
      letterSpacing: 0.5,
      padding: "3px 10px",
      borderRadius: 4,
      background: s.bg,
      color: s.color,
      textTransform: "uppercase",
      whiteSpace: "nowrap",
    }}>
      {s.label}
    </span>
  );
}

function CtaButton({ ev }: { ev: any }) {
  const isFinished = ev.status === "finished" || ev.status === "cancelled";
  if (isFinished) return null;

  const isActive = ev.status === "active";
  const href = ev.registration_url || `/event/${ev.slug}`;

  return (
    <Button
      variant={isActive ? "primary" : "secondary"}
      size="sm"
      href={href}
      fixedWidth={BTN_WIDTH}
      external={isActive && !!ev.registration_url}
      showShadow={false}
      showIcon={true}
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
    >
      Open
    </Button>
  );
}

function PageBtn({ children, onClick, disabled, active }: {
  children: React.ReactNode;
  onClick:  () => void;
  disabled?: boolean;
  active?:   boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...JK,
        fontWeight: active ? 700 : 500,
        fontSize: 13,
        width: 32, height: 32,
        borderRadius: 6,
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

function EventRow({ ev, isLast }: { ev: any; isLast: boolean }) {
  const router  = useRouter();
  const [hovered, setHovered] = useState(false);

  const imgUrl = ev.card_image?.id ? getAssetUrl(ev.card_image) : null;

  function handleRowClick() {
    const isActive = ev.status === "active";
    if (isActive && ev.registration_url) {
      window.open(ev.registration_url, "_blank", "noopener noreferrer");
    } else {
      router.push(`/event/${ev.slug}`);
    }
  }

  return (
    <tr
      onClick={handleRowClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderBottom: isLast ? "none" : "1px solid #f5f5f5",
        background: hovered ? "linear-gradient(to right, rgb(13, 38, 194, 0.03), transparent 100%)" : "linear-gradient(to right, rgba(255, 201, 54, 0), transparent 100%)",
        cursor: "pointer",
        transition: "background 0.2s ease-in-out",
      }}
    >
      {/* Event */}
      <td style={{ padding: "14px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 104, height: 68, flexShrink: 0,
            borderRadius: 4, overflow: "hidden",
            background: "#e8eaf6",
          }}>
            {imgUrl && (
              <img src={imgUrl} alt={ev.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            )}
          </div>
          <div>
            <div style={{ ...JK, fontWeight: 700, fontSize: 14, color: "#111", lineHeight: 1.3 }}>
              {ev.name}
            </div>
            {ev.user_created?.organisation_name && (
              <div style={{ ...JK, fontSize: 12, color: "#999", marginTop: 3 }}>
                {ev.user_created.organisation_name}
              </div>
            )}
          </div>
        </div>
      </td>

      {/* Category */}
      <td style={{ padding: "14px 20px", whiteSpace: "nowrap" }}>
        <span style={{
          ...JK, fontWeight: 600, fontSize: 12,
          padding: "3px 10px", borderRadius: 4,
          background: ev.type === "sport" ? "#e8f1fd" : "#fdf2e8",
          color:      ev.type === "sport" ? "#1a6fc4" : "#c47a1a",
        }}>
          {ev.type === "sport" ? "Sports" : "Arts"}
        </span>
      </td>

      {/* Date */}
      <td style={{ ...JK, fontSize: 13, color: "#555", padding: "14px 20px", whiteSpace: "nowrap" }}>
        {formatDate(ev.start_date, ev.end_date)}
      </td>

      {/* Location */}
      <td style={{ ...JK, fontSize: 13, color: "#555", padding: "14px 20px", maxWidth: 220 }}>
        {ev.location ?? "-"}
      </td>

      {/* Status */}
      <td style={{ padding: "14px 20px", whiteSpace: "nowrap" }}>
        <StatusBadge ev={ev} />
      </td>

      {/* CTA */}
      <td style={{ padding: "14px 20px", whiteSpace: "nowrap" }}>
        <CtaButton ev={ev} />
      </td>
    </tr>
  );
}

const COLS = ["EVENT", "CATEGORY", "DATE", "LOCATION", "STATUS", "PAGE DETAILS"];

export default function EventsTable({ events, total, page, perPage, onPageChange }: Props) {
  const totalPages = Math.ceil(total / perPage);
  const from       = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to         = Math.min(page * perPage, total);

  function getStatusPriority(ev: any): number {
    if (ev.status === "active") return 0;
    if (ev.status === "upcoming" && ev.is_registration_open) return 1;
    if (ev.status === "upcoming") return 2;
    return 3; // finished, cancelled
  }

  const sortedEvents = [...events].sort((a, b) => {
    const priorityDiff = getStatusPriority(a) - getStatusPriority(b);
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(a.start_date || 0).getTime() - new Date(b.start_date || 0).getTime();
  });

  function pageNums(): (number | "...")[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const nums: (number | "...")[] = [1];
    if (page > 3)              nums.push("...");
    for (let p = Math.max(2, page - 1); p <= Math.min(totalPages - 1, page + 1); p++) nums.push(p);
    if (page < totalPages - 2) nums.push("...");
    nums.push(totalPages);
    return nums;
  }

  return (
    <div style={{ background: "#fff", borderRadius: 8, overflow: "hidden", boxShadow: "0 4px 32px rgba(0,0,0,0.12)" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
          <thead>
            <tr style={{ borderBottom: "1.5px solid #f0f0f0" }}>
              {COLS.map((col, i) => (
                <th key={i} style={{
                  ...JK, fontWeight: 900, fontSize: 12,
                  color: "#676767", textAlign: "left",
                  padding: "14px 20px",
                  letterSpacing: 0.8,
                  whiteSpace: "nowrap",
                }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedEvents.length === 0 && (
              <tr>
                <td colSpan={COLS.length} style={{
                  ...JK, textAlign: "center",
                  padding: "56px 20px", color: "#bbb", fontSize: 14,
                }}>
                  No events found.
                </td>
              </tr>
            )}
            {sortedEvents.map((ev, i) => (
              <EventRow key={ev.id} ev={ev} isLast={i === sortedEvents.length - 1} />
            ))}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <div style={{
          ...JK,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 20px",
          borderTop: "1px solid #f0f0f0",
          fontSize: 13, color: "#999",
          flexWrap: "wrap", gap: 12,
        }}>
          <span>Showing {from}–{to} of {total} events</span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <PageBtn onClick={() => onPageChange(page - 1)} disabled={page === 1}>{"<"}</PageBtn>
            {pageNums().map((p, i) =>
              p === "..."
                ? <span key={`ellipsis-${i}`} style={{ ...JK, padding: "0 4px", color: "#bbb" }}>...</span>
                : <PageBtn key={p} onClick={() => onPageChange(p as number)} active={p === page}>{p}</PageBtn>
            )}
            <PageBtn onClick={() => onPageChange(page + 1)} disabled={page === totalPages}>{">"}</PageBtn>
          </div>
        </div>
      )}
    </div>
  );
}