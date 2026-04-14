"use client";

const JK = { fontFamily: "'Plus Jakarta Sans', sans-serif" } as const;
const BB = { fontFamily: "'Bebas Neue', sans-serif" }        as const;

type FilterType = "all" | "sport" | "arts";

interface Props {
  filter:         FilterType;
  search:         string;
  onFilterChange: (f: FilterType) => void;
  onSearchChange: (s: string) => void;
  isMobile?:      boolean;
}

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all",   label: "All Events" },
  { key: "sport", label: "Sports" },
  { key: "arts",  label: "Arts" },
];

const KEYFRAMES = `
  @keyframes evh-slide-up {
    from { opacity: 0; transform: translateY(28px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
  @keyframes evh-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  .evh-search::placeholder {
    color: rgba(255, 255, 255, 0.7);
  }
`;

function staggerStyle(delay: number): React.CSSProperties {
  return {
    opacity: 0,
    animation: `evh-slide-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms forwards`,
  };
}

export default function EventsHeader({
  filter, search, onFilterChange, onSearchChange, isMobile = false,
}: Props) {
  return (
    <>
      <style>{KEYFRAMES}</style>
      <div style={{
        position: "relative",
        zIndex: 1,
        height: "clamp(200px, 42vh, 300px)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        padding: isMobile ? "0 20px 36px" : "0 clamp(20px, 8.33vw, 160px) 36px",
        marginBottom: 16,
        gap: 18,
      }}>
        <div>
          {/* Title */}
          <div style={{
            ...BB,
            filter: "drop-shadow(2px 4px 6px rgba(0,0,0,0.2))",
            fontSize: "clamp(3rem, 4.5vw, 4rem)",
            color: "#fff",
            lineHeight: 1,
            textTransform: "uppercase",
            ...staggerStyle(80),
          }}>
            See All Events
          </div>

          {/* Subtitle */}
          <div style={{
            ...JK,
            textWrap: "balance",
            fontSize: "clamp(12px, 1.4vw, 14px)",
            fontWeight: 600,
            color: "rgba(255,255,255,0.7)",
            filter: "drop-shadow(2px 4px 6px rgba(0,0,0,0.2))",
            marginTop: 8,
            maxWidth: 480,
            lineHeight: 1.6,
            ...staggerStyle(200),
          }}>
            Join the most anticipated sports and art events. Prove your skills, compete with the best, and win prestigious awards.
          </div>
        </div>

        {/* Controls row */}
        <div style={{
          display: "flex", flexDirection: isMobile ? "column" : "row",
          alignItems: "flex-start", gap: isMobile ? 8 : 10, flexWrap: "wrap", 
          marginBottom: -20, marginTop: 30,
          ...staggerStyle(320),
        }}>
          <div style={{ display: "flex", gap: 8 }}>
            {FILTERS.map((f, i) => (
              <button
                key={f.key}
                onClick={() => onFilterChange(f.key)}
                style={{
                  ...JK, fontWeight: 700, fontSize: 13,
                  padding: "7px 16px", borderRadius: 999,
                  border: "1.5px solid rgba(255,255,255,0.7)",
                  background: filter === f.key ? "#fff" : "rgba(255,255,255,0.1)",
                  color: filter === f.key ? "#0D26C2" : "#fff",
                  cursor: "pointer", transition: "background 0.2s, color 0.2s",
                  opacity: 0,
                  animation: `evh-slide-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) ${360 + i * 60}ms forwards`,
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={{
            flex: 1, maxWidth: isMobile ? "100%" : 360, minWidth: 200, width: isMobile ? "100%" : undefined, position: "relative",
            ...staggerStyle(540), // Sequential delay after the last filter button
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24"
              fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5"
              style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text" placeholder="Search events..." value={search}
              onChange={e => onSearchChange(e.target.value)}
              className="evh-search"
              style={{
                ...JK, width: "100%", boxSizing: "border-box",
                padding: "8px 14px 8px 34px", borderRadius: 8,
                border: "1.5px solid rgba(255,255,255,0.7)",
                background: "rgba(255,255,255,0.1)", color: "#fff",
                fontSize: 13, fontWeight: 700, outline: "none",
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}