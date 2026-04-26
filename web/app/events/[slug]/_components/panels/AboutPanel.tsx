"use client";
import React from "react";
import { PanelTitle } from "./Panel";
import { JK } from "../shared/tokens";
import type { MappedEvent } from "../../_types";

const CARD: React.CSSProperties = {
  background:    "#fff",
  borderRadius:  12,
  padding:       "16px 20px",
  display:       "flex",
  flexDirection: "column",
  flex:          1,
  minHeight:     0,
};

export default function AboutPanel({ event, isMobile }: { event: MappedEvent; isMobile: boolean }) {
  const contacts = Array.isArray(event.contact_person) ? event.contact_person : [];

  return (
    <div style={CARD}>
      <PanelTitle>About</PanelTitle>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {event.description && (
          <p style={{
            ...JK,
            fontSize:   isMobile ? 12 : 14,
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
            {contacts.map((c, i) => (
              <div key={i} style={{ ...JK, fontSize: 13, color: "#374151", marginBottom: 4 }}>
                – {c.name}: <span style={{ color: "#0D26C2" }}>{c.contact}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}