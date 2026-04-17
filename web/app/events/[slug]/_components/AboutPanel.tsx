"use client";
import { PanelCard, PanelTitle } from "./Panel";

const JK = { fontFamily: "'Plus Jakarta Sans', sans-serif" } as const;

// AboutPanel is the "stretch recipient" in the Negotiated Greedy Growth layout.
//
// When the right column grows taller than the natural left-column height
// (because the greedy rule added an extra match row), CSS `align-items: stretch`
// on the parent grid makes the left column div match that taller height.
// This component must then fill that div completely so the white card background
// stays flush with the bottom of the right column.
//
// Key CSS properties that enable this:
//   PanelCard  → height: "100%"              (fills the left-column div)
//   inner div  → flex: 1, display: "flex"    (description text grows to fill card)

export default function AboutPanel({ event }: { event: any }) {
  const contacts = Array.isArray(event.contact_person) ? event.contact_person : [];

  return (
    <PanelCard
      style={{
        // Step 5 — Mutual Compensation:
        // height 100% ensures this card fills whatever height the grid column
        // is stretched to after the greedy row expands the right column.
        height:        "100%",
        flex:           1,
        display:       "flex",
        flexDirection: "column",
        // Prevent the card from collapsing when it has little text content
        boxSizing:     "border-box",
      }}
    >
      <PanelTitle>About</PanelTitle>

      {/* flex: 1 here makes the content area grow to fill extra card height */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {event.description && (
          <p style={{
            ...JK,
            fontSize:   14,
            color:      "#374151",
            lineHeight: 1.75,
            margin:     0,
            whiteSpace: "pre-line",
          }}>
            {event.description}
          </p>
        )}

        {contacts.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{
              ...JK,
              fontSize:      12,
              fontWeight:    600,
              color:         "#9CA3AF",
              textTransform: "uppercase",
              marginBottom:  8,
            }}>
              Contact Person
            </div>
            {contacts.map((c: any, i: number) => (
              <div key={i} style={{ ...JK, fontSize: 13, color: "#374151", marginBottom: 4 }}>
                – {c.name}: <span style={{ color: "#0D26C2" }}>{c.contact}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </PanelCard>
  );
}