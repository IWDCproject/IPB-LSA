"use client";

const BB = { fontFamily: "'Bebas Neue', sans-serif" }        as const;
const JK = { fontFamily: "'Plus Jakarta Sans', sans-serif" } as const;

export type TabKey = "overview" | "matches" | "participants" | "news";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview",     label: "Overview" },
  { key: "matches",      label: "Matches" },
  { key: "participants", label: "Participants" },
  { key: "news",         label: "News" },
];

const STATUS_LABEL: Record<string, string> = {
  upcoming:  "Upcoming",
  active:    "On Going",
  finished:  "Finished",
  cancelled: "Cancelled",
};
const STATUS_COLOR: Record<string, string> = {
  upcoming:  "rgb(219, 219, 219, 0.2)",
  active:    "rgb(255, 201, 54, 0.2)",
  finished:  "rgb(107, 114, 128, 0.2)",
  cancelled: "rgb(239, 68, 68, 0.2)",
};
const STATUS_COLOR_OPAQUE: Record<string, string> = {
  upcoming:  "rgb(219, 219, 219, 1)",
  active:    "rgb(255, 201, 54, 1)",
  finished:  "rgb(107, 114, 128, 1)",
  cancelled: "rgb(239, 68, 68, 1)",
};

const KEYFRAMES = `
  @keyframes edh-slide-up {
    from { opacity: 0; transform: translateY(28px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
  @keyframes edh-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
`;

function staggerStyle(delay: number): React.CSSProperties {
  return {
    opacity: 0,
    animation: `edh-slide-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms forwards`,
  };
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

interface Props {
  event:       any;
  activeTab:   TabKey;
  onTabChange: (t: TabKey) => void;
  isMobile:    boolean;
}

export default function EventDetailHeader({ event, activeTab, onTabChange, isMobile }: Props) {
  const NAVBAR_HEIGHT = 300; // TODO: this is fucking stupid, please change later
  const PAD = isMobile
    ? `${NAVBAR_HEIGHT}px 20px 36px`
    : `${NAVBAR_HEIGHT}px clamp(20px, 8.33vw, 160px) 36px`;
  const HERO_HEIGHT = isMobile
    ? "clamp(280px, 52vh, 420px)"
    : "clamp(200px, 42vh, 300px)";

  const meta = [
    { label: "Registration", value: event.registration_end_date ? `Until ${fmtDate(event.registration_end_date)}` : "—" },
    { label: "Dates",        value: event.start_date ? `${fmtDate(event.start_date)} – ${fmtDate(event.end_date)}` : "—" },
    { label: "Location",     value: event.location ?? "—" },
  ];


  return (
    <>
      <style>{KEYFRAMES}</style>
      <div style={{
        position: "relative",
        zIndex: 1,
        height: HERO_HEIGHT,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        padding: PAD,
        marginBottom: 16,
        gap: 18,
      }}>

        {/* Status badge + title + organiser */}
        <div style={staggerStyle(80)}>
          <span style={{
            ...JK,
            display: "inline-block",
            padding: "4px 12px", borderRadius: 8,
            background: STATUS_COLOR[event.status] ?? "rgba(107, 114, 128, 0.2)",
            borderColor: STATUS_COLOR_OPAQUE[event.status] ?? "rgba(107, 114, 128, 1)",
            borderWidth: 1.8, borderStyle: "solid",
            color: STATUS_COLOR_OPAQUE[event.status] ?? "rgba(107, 114, 128, 1)", fontSize: 11, fontWeight: 800,
            textTransform: "uppercase", letterSpacing: "0.06em",
            marginBottom: 20,
          }}>
            {STATUS_LABEL[event.status] ?? event.status}
          </span>

          <div style={{
            ...BB,
            filter: "drop-shadow(2px 4px 6px rgba(0,0,0,0.2))",
            fontSize: "clamp(3rem, 4.5vw, 4rem)",
            color: "#fff", lineHeight: 1, textTransform: "uppercase",
          }}>
            {event.name}
          </div>

          <div
            style={{
              ...JK,
              fontSize: "clamp(14px, 1.4vw, 16px)",
              fontWeight: 600,
              color: "rgba(255,255,255,0.7)",
              filter: "drop-shadow(2px 4px 6px rgba(0,0,0,0.2))",
              marginTop: 0,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontStyle: "italic" }}>by</span>
            <span style={{ fontWeight: 700 }}>{event.organiser}</span>
          </div>
        </div>

        {/* Meta row */}
        <div style={{
          display: "flex", gap: isMobile ? 20 : 36, flexWrap: "wrap",
          ...staggerStyle(200),
        }}>
          {meta.map((m) => (
            <div key={m.label}>
              <div style={{ ...JK, fontSize: 12, color: "#fff", fontWeight: 800, marginTop: 8 }}>
                {m.label}
              </div>
              <div style={{ ...JK, fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: 800, marginTop: 2 }}>
                {m.value}
              </div>
            </div>
          ))}
        </div>

        {/* Controls row — tabs + action buttons, same structure as EventsHeader filter pills */}
        <div style={{
          display: "flex", flexDirection: isMobile ? "column" : "row",
          alignItems: "flex-start", gap: isMobile ? 8 : 10, flexWrap: "wrap",
          marginBottom: -20, marginTop: 30,
          ...staggerStyle(320),
        }}>

          {/* Tab pills */}
          <div style={{ display: "flex", gap: 8 }}>
            {TABS.map((t, i) => (
              <button
                key={t.key}
                onClick={() => onTabChange(t.key)}
                style={{
                  ...JK, fontWeight: 700, fontSize: 13,
                  padding: "7px 16px", borderRadius: 999,
                  border: "1.5px solid rgba(255,255,255,0.7)",
                  background: activeTab === t.key ? "#fff" : "rgba(255,255,255,0.1)",
                  color: activeTab === t.key ? "#0D26C2" : "#fff",
                  cursor: "pointer", transition: "background 0.2s, color 0.2s",
                  opacity: 0,
                  animation: `edh-slide-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) ${360 + i * 60}ms forwards`,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Action buttons — same pill style, pushed to the right */}
          <div style={{
            display: "flex", gap: 8, flexWrap: "wrap",
            marginLeft: isMobile ? 0 : "auto",
            opacity: 0,
            animation: `edh-fade-in 0.5s ease 620ms forwards`,
          }}>
            {event.guidebook_url && (
              <a href={event.guidebook_url} target="_blank" rel="noopener noreferrer" style={{
                ...JK, fontWeight: 700, fontSize: 13,
                padding: "7px 16px", borderRadius: 8, whiteSpace: "nowrap",
                border: "1.5px solid rgba(255,255,255,0.7)",
                background: "rgba(255,255,255,0.1)", color: "#fff",
                textDecoration: "none", cursor: "pointer",
              }}>
                Guidebook
              </a>
            )}
            {event.is_registration_open && event.registration_url && (
              <a href={event.registration_url} target="_blank" rel="noopener noreferrer" style={{
                ...JK, fontWeight: 700, fontSize: 13,
                padding: "7px 16px", borderRadius: 8, whiteSpace: "nowrap",
                border: "1.5px solid #fff",
                background: "#fff", color: "#0D26C2",
                textDecoration: "none", cursor: "pointer",
              }}>
                Register
              </a>
            )}
            {event.instagram_url && (
              <a href={event.instagram_url} target="_blank" rel="noopener noreferrer" style={{
                ...JK, fontWeight: 700, fontSize: 13,
                padding: "7px 16px", borderRadius: 8, whiteSpace: "nowrap",
                border: "1.5px solid rgba(255,255,255,0.7)",
                background: "rgba(255,255,255,0.1)", color: "#fff",
                textDecoration: "none", cursor: "pointer",
              }}>
                Instagram
              </a>
            )}
          </div>
        </div>
      </div>
    </>
  );
}