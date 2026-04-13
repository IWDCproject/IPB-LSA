import { PanelCard, PanelTitle } from "./Panel";

const JK = { fontFamily: "'Plus Jakarta Sans', sans-serif" } as const;

type ContactEntry = { name: string; contact: string };

function parseContacts(raw: unknown): ContactEntry[] {
  if (Array.isArray(raw)) return raw.filter((c) => c?.name && c?.contact);
  return [];
}

export default function AboutPanel({ event }: { event: any }) {
  const contacts = parseContacts(event.contact_person);

  return (
    <PanelCard>
      <PanelTitle>About</PanelTitle>
      {event.description && (
        <p style={{ ...JK, fontSize: 14, color: "#374151", lineHeight: 1.75, margin: 0, whiteSpace: "pre-line" }}>
          {event.description}
        </p>
      )}
      {contacts.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ ...JK, fontSize: 12, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
            Contact Person
          </div>
          {contacts.map((c, i) => (
            <div key={i} style={{ ...JK, fontSize: 13, color: "#374151", marginBottom: 4 }}>
              – {c.name}:{" "}
              <a href={c.contact.startsWith("http") ? c.contact : `https://${c.contact}`} target="_blank" rel="noopener noreferrer" style={{ color: "#0D26C2" }}>
                {c.contact}
              </a>
            </div>
          ))}
        </div>
      )}
    </PanelCard>
  );
}