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
              <div key={i} className="font-jakarta text-[13px] text-gray-700 mb-2">
                <div className="font-bold">– {c.name}</div>
                {c.link && (
                  <div className="pl-4 text-[#0D26C2]">
                    <a href={c.link.startsWith('http') ? c.link : `https://${c.link}`} target="_blank" rel="noopener noreferrer">
                      {c.link}
                    </a>
                  </div>
                )}
                {c.email && (
                  <div className="pl-4 text-[#0D26C2]">
                    <a href={`mailto:${c.email}`}>{c.email}</a>
                  </div>
                )}
                {!c.link && !c.email && c.contact && (
                  <div className="pl-4 text-[#0D26C2]">{c.contact}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}