"use client";
import React from "react";
import { PanelTitle } from "./Panel";
import type { MappedEvent } from "../../_types";

export default function AboutPanel({
  event,
  isMobile,
}: {
  event:    MappedEvent;
  isMobile: boolean;
}) {
  const contacts = Array.isArray(event.contact_person) ? event.contact_person : [];

  return (
    <div className="bg-white rounded-xl px-5 py-4 flex flex-col flex-1 min-h-0">
      <PanelTitle>About</PanelTitle>

      <div className="flex flex-col">
        {event.description && (
          <p
            className={`font-jakarta ${isMobile ? "text-xs" : "text-sm"} text-gray-700 m-0 whitespace-pre-line leading-relaxed`}
          >
            {event.description}
          </p>
        )}

        {contacts.length > 0 && (
          <div className="mt-4">
            <div className="font-jakarta text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Contact Person
            </div>
            {contacts.map((c, i) => (
              <div key={i} className="font-jakarta text-[13px] text-gray-700 mb-1">
                – {c.name}:{" "}
                <span className="text-[#0D26C2]">{c.contact}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}