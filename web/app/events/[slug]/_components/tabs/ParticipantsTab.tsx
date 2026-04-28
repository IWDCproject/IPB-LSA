"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { PanelCard, PanelTitle } from "../panels/Panel";
import { staggerSlideUp, TAB_ENTER } from "../shared/Animations";
import type { AnimPhase } from "../shared/UseTabTransition";
import { getParticipantsByEvent } from "@/lib/directus";
import { JK, NAVY, MUTED, BORDER_GRAY as BORDER } from "../shared/tokens";
import type { MappedEvent, CategoryWithParticipants, MappedParticipant } from "../../_types";

const GROUP_STAGGER    = 80;   // ms between consecutive group entrances
const GROUP_HEADER_DUR = 80;   // ms before this group's cards start (on initial load)
const CARD_STAGGER     = 40;   // ms between individual cards
const CLOSE_DELAY      = 120;  // ms cursor has to cross the gap to the dropdown

interface Props {
  event:    MappedEvent;
  isMobile: boolean;
  phase:    AnimPhase;
}

// ─── Skeleton rows ────────────────────────────────────────────────────────────

function SkeletonRows({ isMobile }: { isMobile: boolean }) {
  return (
    <>
      {[5, 3].map((n, gi) => (
        <div key={gi} style={{ paddingBottom: gi === 1 ? 0 : 24, marginBottom: gi === 1 ? 0 : 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 14, height: 14, background: "#E5E7EB", borderRadius: 3 }} />
            <div style={{ width: 130, height: 13, background: "#E5E7EB", borderRadius: 4 }} />
            <div style={{ flex: 1, height: 1, background: BORDER }} />
            <div style={{ width: 80, height: 13, background: "#E5E7EB", borderRadius: 4 }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(auto-fill, minmax(150px, 1fr))" : "repeat(auto-fill, minmax(210px, 1fr))", gap: isMobile ? 8 : 12 }}>
            {Array.from({ length: n }).map((_, i) => (
              <div key={i} style={{ height: 58, borderRadius: 10, background: "#F3F4F6", border: `1.5px solid ${BORDER}` }} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

// ─── Member dropdown (portal) ─────────────────────────────────────────────────

type DropdownPos = { top: number; left: number; width: number };

function MemberDropdown({
  members,
  pos,
  isClosing,
  onMouseEnter,
  onMouseLeave,
}: {
  members:      any[];
  pos:          DropdownPos;
  isClosing:    boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const el = (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: "fixed",
        top:      pos.top,
        left:     pos.left,
        width:    pos.width,
        zIndex:   9999,
        pointerEvents: isClosing ? "none" : "auto",
      }}
    >
      <div style={{ position: "absolute", top: -12, left: 0, right: 0, height: 12, background: "transparent" }} />

      <style>{`
        @keyframes dropdownReveal {
          from { clip-path: inset(0 0 100% 0); opacity: 0; transform: translateY(-4px); }
          to   { clip-path: inset(0 0 0% 0); opacity: 1; transform: translateY(0); }
        }
        @keyframes dropdownHide {
          from { clip-path: inset(0 0 0% 0); opacity: 1; transform: translateY(0); }
          to   { clip-path: inset(0 0 100% 0); opacity: 0; transform: translateY(-4px); }
        }
        @keyframes memberSlide {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        style={{
          background: "#fff",
          borderRadius: 10,
          boxShadow: "0 12px 32px rgba(6,18,92,0.15), 0 4px 8px rgba(6,18,92,0.05)",
          border: `1px solid ${BORDER}`,
          overflow: "hidden",
          animation: `${isClosing ? "dropdownHide" : "dropdownReveal"} 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
        }}
      >
        <div style={{ position: "absolute", top: -5, left: 18, width: 9, height: 9, background: "#fff", border: `1px solid ${BORDER}`, borderBottom: "none", borderRight: "none", transform: "rotate(45deg)" }} />
        <div style={{ padding: "10px 12px 8px" }}>
          <div style={{ ...JK, fontSize: 10, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
            Members · {members.length}
          </div>
          {members.map((m, i) => {
            const name = typeof m === "string" ? m : (m.name ?? "—");
            const role = typeof m === "object" ? (m.role ?? m.position ?? null) : null;
            return (
              <div
                key={i}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "5px 0",
                  borderTop: i > 0 ? `1px solid ${BORDER}` : "none",
                  animation: !isClosing ? "memberSlide 0.3s ease both" : "none",
                  animationDelay: `${60 + (i * 30)}ms`
                }}
              >
                <span style={{ ...JK, fontSize: 12, fontWeight: 600, color: NAVY }}>{name}</span>
                {role && <span style={{ ...JK, fontSize: 10, fontWeight: 600, color: MUTED, background: "#F3F4F6", borderRadius: 4, padding: "2px 6px" }}>{role}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return createPortal(el, document.body);
}

// ─── Participant card ─────────────────────────────────────────────────────────

function ParticipantCard({ participant, animDelay }: { participant: MappedParticipant; animDelay: number }) {
  const [open,    setOpen]        = useState(false);
	const [isClosing, setIsClosing] = useState(false);
  const [hovered, setHovered]     = useState(false);
  const [pos,     setPos]         = useState<DropdownPos | null>(null);
  const buttonRef                 = useRef<HTMLButtonElement>(null);
  const closeTimer                = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleClose = () => {
    setIsClosing(true);
    closeTimer.current = setTimeout(() => { 
      setOpen(false); setIsClosing(false); setHovered(false); 
    }, 180); // Matches animation duration
  };

  const cancelClose = () => {
    setIsClosing(false);
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  // Close on scroll so the portal doesn't drift away from its card
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, { passive: true, capture: true });
    return () => window.removeEventListener("scroll", close, { capture: true });
  }, [open]);

  const handleClick = () => {
    if (!hasMembers) return;
    if (open) {
      setIsClosing(true);
      setTimeout(() => { setOpen(false); setIsClosing(false); }, 180);
    } else {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setPos({ top: rect.bottom + 8, left: rect.left, width: rect.width });
      }
      setOpen(true);
    }
  };

  const institution = participant.institution;
  const logoUrl     = institution?.logo_url;
  const teamName    = participant.name;
  const instName    = institution?.name;
  const members     = Array.isArray(participant.members) ? participant.members.filter(Boolean) : [];
  const hasMembers  = members.length > 0;

  const primary   = instName ?? teamName ?? "—";
  const secondary =
    instName && teamName && instName !== teamName ? teamName
    : hasMembers ? `${members.length} member${members.length !== 1 ? "s" : ""}`
    : null;

  return (
    <div style={{ position: "relative", animation: "cardSlideUp 0.35s ease both", animationDelay: `${animDelay}ms` }}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        onMouseEnter={() => { cancelClose(); setHovered(true); }}
        onMouseLeave={() => { setHovered(false); if (open) scheduleClose(); }}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          width: "100%", padding: "10px 12px",
          background: open ? "#EEF2FF" : hovered ? "#FAFBFF" : "#fff",
          border: `1.5px solid ${open ? "#0D26C2" : hovered ? "rgba(13,38,194,0.35)" : BORDER}`,
          borderRadius: 10,
          cursor: hasMembers ? "pointer" : "default",
          textAlign: "left",
          transition: "border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease",
          boxShadow: open ? "0 0 0 3px rgba(13,38,194,0.09)" : hovered ? "0 2px 10px rgba(6,18,92,0.09)" : "none",
        }}
      >
        <div style={{ width: 36, height: 36, borderRadius: 4, flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {logoUrl ? (
            <img src={logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BORDER} strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <path d="M3 9h18M9 21V9" />
            </svg>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...JK, fontSize: 13, fontWeight: 700, color: NAVY, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {primary}
          </div>
          {secondary && (
            <div style={{ ...JK, fontSize: 11, fontWeight: 600, color: MUTED, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 1 }}>
              {secondary}
            </div>
          )}
        </div>

        {hasMembers && (
          <svg
            width="12" height="12" viewBox="0 0 24 24"
            fill="none" stroke={MUTED} strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
            style={{ flexShrink: 0, transition: "transform 0.2s ease", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        )}
      </button>

      {open && hasMembers && pos && (
        <MemberDropdown
          members={members}
          pos={pos}
          isClosing={isClosing}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        />
      )}
    </div>
  );
}

// ─── Category group ───────────────────────────────────────────────────────────

function CategoryGroup({
  group, isMobile, isLast, groupDelay,
}: {
  group: CategoryWithParticipants; isMobile: boolean; isLast: boolean; groupDelay: number;
}) {
  const [open,    setOpen]    = useState(true);
  const [animKey, setAnimKey] = useState(0);

  const handleToggle = () => setOpen(o => { if (!o) setAnimKey(k => k + 1); return !o; });

  const participants = group.participants ?? [];
  const count        = participants.length;
  const hasTeams     = participants.some((p: MappedParticipant) => Array.isArray(p.members) && p.members.length > 1);
  const unitLabel    = hasTeams ? (count === 1 ? "Team" : "Teams") : (count === 1 ? "Individual" : "Individuals");

  // Initial load: cards wait for the group header to animate in first.
  // Reopen (animKey > 0): no inherited delay — cards stagger from 0 immediately.
  const cardBaseDelay = animKey === 0 ? groupDelay + GROUP_HEADER_DUR : 0;

  return (
    <div
      style={{
        paddingBottom: isLast ? 0 : 24,
        marginBottom:  isLast ? 0 : 24,
        animation: "groupSlideUp 0.4s ease both",
        animationDelay: `${groupDelay}ms`,
      }}
    >
      <button
        type="button"
        onClick={handleToggle}
        style={{
          display: "flex", alignItems: "center", width: "100%", gap: 10,
          marginBottom: open && participants.length > 0 ? 14 : 0,
          transition: "margin-bottom 0.3s ease",
          background: "transparent", border: "none", cursor: "pointer", padding: "2px 0",
        }}
      >
        <svg
          width="14" height="14" viewBox="0 0 24 24"
          fill="none" stroke={MUTED} strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0, transition: "transform 0.25s ease", transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
        <span style={{ ...JK, fontSize: 13, fontWeight: 700, color: NAVY, whiteSpace: "nowrap" }}>
          {group.category.name}
        </span>
        <div style={{ flex: 1, height: 1, background: BORDER }} />
        <span style={{ ...JK, fontSize: 12, fontWeight: 600, color: MUTED, whiteSpace: "nowrap" }}>
          {count} {unitLabel}
        </span>
      </button>

      <div style={{ display: "grid", gridTemplateRows: open ? "1fr" : "0fr", transition: "grid-template-rows 0.3s ease" }}>
        <div style={{ overflow: "hidden", padding: "0px 1px" }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(auto-fill, minmax(210px, 1fr))" : "repeat(auto-fill, minmax(210px, 1fr))", gap: isMobile ? 8 : 12 }}>
            {participants.length === 0 ? (
              <div style={{ gridColumn: "1 / -1", ...JK, fontSize: 13, color: "#9CA3AF", padding: "12px 0" }}>No participants yet.</div>
            ) : (
              participants.map((p: MappedParticipant, i: number) => (
                <div key={`${animKey}-${p.id}`} style={{ minWidth: 0 }}>
                  <ParticipantCard participant={p} animDelay={cardBaseDelay + i * CARD_STAGGER} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ParticipantsTab({ event, isMobile, phase }: Props) {
  const [groups, setGroups] = useState<CategoryWithParticipants[] | null>(null);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getParticipantsByEvent(event.slug).then(data => {
      if (!cancelled) {
        setGroups(data);
        requestAnimationFrame(() => { if (!cancelled) setFading(true); });
      }
    });
    return () => { cancelled = true; };
  }, [event.slug]);

  const tier     = TAB_ENTER;
  const base     = tier.baseDelay ?? 0;
  const nonEmpty = groups ? groups.filter(g => (g.participants ?? []).length > 0) : [];

  return (
    <>
      <style>{`
        @keyframes cardSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes groupSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={phase === "entering" ? staggerSlideUp(base, tier) : {}}>
        <PanelCard>
          <PanelTitle>Participants</PanelTitle>

          <div style={{ position: "relative" }}>
            {/* Skeleton — sets height while loading, fades + lifts out when data arrives */}
            <div
              style={{
                ...(fading ? { position: "absolute", top: 0, left: 0, right: 0, zIndex: 1 } : {}),
                opacity:       fading ? 0 : 1,
                transition:    fading ? "opacity 0.3s ease" : "none",
                pointerEvents: "none",
              }}
            >
              <SkeletonRows isMobile={isMobile} />
            </div>

            {/* Real content — fades in as skeleton fades out */}
            <div style={{ opacity: fading ? 1 : 0, transition: fading ? "opacity 0.3s ease" : "none" }}>
              {groups !== null && nonEmpty.length === 0 ? (
                <div style={{ ...JK, fontSize: 13, color: "#9CA3AF", textAlign: "center", padding: "32px 0" }}>
                  No participants registered yet.
                </div>
              ) : (
                nonEmpty.map((group, i) => (
                  <CategoryGroup
                    key={group.category.id}
                    group={group}
                    isMobile={isMobile}
                    isLast={i === nonEmpty.length - 1}
                    groupDelay={base + i * GROUP_STAGGER}
                  />
                ))
              )}
            </div>
          </div>
          {/* spacer di bawah biar ga mepet */}
          <div style={{ height: 20 }} />
        </PanelCard>
      </div>
    </>
  );
}