"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { PanelCard, PanelTitle } from "../panels/Panel";
import { staggerSlideUp, TAB_ENTER } from "../shared/Animations";
import type { AnimPhase } from "../shared/UseTabTransition";
import { getParticipantsByEvent } from "@/lib/directus";
import { NAVY, MUTED, BORDER_GRAY as BORDER } from "../shared/tokens";
import type { MappedEvent, CategoryWithParticipants, MappedParticipant } from "../../_types";

const GROUP_STAGGER    = 80;
const GROUP_HEADER_DUR = 80;
const CARD_STAGGER     = 40;

interface Props {
  event:    MappedEvent;
  isMobile: boolean;
  phase:    AnimPhase;
}

// --- SkeletonRows ---------------------------------------------

function SkeletonRows({ isMobile }: { isMobile: boolean }) {
  return (
    <>
      {[5, 3].map((n, gi) => (
        <div key={gi} className={gi === 1 ? "" : "pb-6 mb-6"}>
          <div className="flex items-center gap-[10px] mb-[14px]">
            <div className="w-[14px] h-[14px] bg-[#E5E7EB] rounded-[3px]" />
            <div className="w-[130px] h-[13px] bg-[#E5E7EB] rounded" />
            <div className="flex-1 h-px" style={{ background: BORDER }} />
            <div className="w-20 h-[13px] bg-[#E5E7EB] rounded" />
          </div>
          <div
            className={`grid ${isMobile ? "gap-2" : "gap-3"}`}
            style={{ gridTemplateColumns: isMobile ? "repeat(auto-fill, minmax(150px, 1fr))" : "repeat(auto-fill, minmax(210px, 1fr))" }}
          >
            {Array.from({ length: n }).map((_, i) => (
              <div key={i} className="h-[58px] rounded-[10px] bg-[#F3F4F6]" style={{ border: `1.5px solid ${BORDER}` }} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

// --- MemberDropdown -------------------------------------------
// Di-render lewat portal supaya nggak ke-clip sama overflow parent

type DropdownPos = { top: number; left: number; width: number };

function MemberDropdown({ members, pos, isClosing, onMouseEnter, onMouseLeave }: {
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
      className="fixed z-[9999]"
      style={{ top: pos.top, left: pos.left, width: pos.width, pointerEvents: isClosing ? "none" : "auto" }}
    >
      {/* Jembatan hover biar pointer nggak "keluar" saat pindah dari card ke panel */}
      <div className="absolute -top-3 left-0 right-0 h-3 bg-transparent" />

      <div
        className="bg-white rounded-[10px] overflow-hidden"
        style={{
          boxShadow: "0 12px 32px rgba(6,18,92,0.15), 0 4px 8px rgba(6,18,92,0.05)",
          border:    `1px solid ${BORDER}`,
          animation: `${isClosing ? "dropdownHide" : "dropdownReveal"} 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
        }}
      >
        <div
          className="absolute -top-[5px] left-[18px] w-[9px] h-[9px] bg-white rotate-45"
          style={{ border: `1px solid ${BORDER}`, borderBottom: "none", borderRight: "none" }}
        />

        <div className="p-[10px_12px_8px]">
          <div className="font-jakarta text-[10px] font-extrabold uppercase tracking-[0.1em] mb-[6px]" style={{ color: MUTED }}>
            Members · {members.length}
          </div>

          {members.map((m, i) => {
            const name = typeof m === "string" ? m : (m.name ?? "?");
            const role = typeof m === "object" ? (m.role ?? m.position ?? null) : null;
            return (
              <div
                key={i}
                className="flex items-center justify-between gap-3 py-[5px]"
                style={{
                  borderTop:      i > 0 ? `1px solid ${BORDER}` : "none",
                  animation:      !isClosing ? "memberSlide 0.3s ease both" : "none",
                  animationDelay: `${60 + i * 30}ms`,
                }}
              >
                <span className="font-jakarta text-xs font-semibold" style={{ color: NAVY }}>{name}</span>
                {role && (
                  <span className="font-jakarta text-[10px] font-semibold bg-[#F3F4F6] rounded px-[6px] py-[2px]" style={{ color: MUTED }}>
                    {role}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return createPortal(el, document.body);
}

// --- ParticipantCard ------------------------------------------

function ParticipantCard({ participant, animDelay }: { participant: MappedParticipant; animDelay: number }) {
  const [open,      setOpen]      = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [hovered,   setHovered]   = useState(false);
  const [pos,       setPos]       = useState<DropdownPos | null>(null);
  const buttonRef                 = useRef<HTMLButtonElement>(null);
  const closeTimer                = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleClose = () => {
    setIsClosing(true);
    closeTimer.current = setTimeout(() => {
      setOpen(false); setIsClosing(false); setHovered(false);
    }, 180);
  };

  const cancelClose = () => {
    setIsClosing(false);
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

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
  const members     = Array.isArray(participant.members) ? participant.members.filter(Boolean) : [];
  const hasMembers  = members.length > 0;

  const primary   = institution?.name ?? participant.name ?? "?";
  const secondary =
    institution?.name && participant.name && institution.name !== participant.name ? participant.name
    : hasMembers ? `${members.length} member${members.length !== 1 ? "s" : ""}`
    : null;

  return (
    <div className="relative" style={{ animation: "anim-slide-up 0.35s ease both", animationDelay: `${animDelay}ms` }}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        onMouseEnter={() => { cancelClose(); setHovered(true); }}
        onMouseLeave={() => { setHovered(false); if (open) scheduleClose(); }}
        className="flex items-center gap-[10px] w-full p-[10px_12px] rounded-[10px] text-left transition-[border-color,background,box-shadow] duration-150"
        style={{
          cursor:    hasMembers ? "pointer" : "default",
          background: open ? "#EEF2FF" : hovered ? "#FAFBFF" : "#fff",
          border:    `1.5px solid ${open ? "#0D26C2" : hovered ? "rgba(13,38,194,0.35)" : BORDER}`,
          boxShadow: open ? "0 0 0 3px rgba(13,38,194,0.09)" : hovered ? "0 2px 10px rgba(6,18,92,0.09)" : "none",
        }}
      >
        <div className="w-9 h-9 rounded shrink-0 overflow-hidden flex items-center justify-center relative">
          {logoUrl ? (
            <Image src={logoUrl} alt="" fill style={{ objectFit: "contain" }} />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BORDER} strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <path d="M3 9h18M9 21V9" />
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-jakarta text-[13px] font-bold whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: NAVY }}>
            {primary}
          </div>
          {secondary && (
            <div className="font-jakarta text-[11px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis mt-[1px]" style={{ color: MUTED }}>
              {secondary}
            </div>
          )}
        </div>

        {hasMembers && (
          <svg
            width="12" height="12" viewBox="0 0 24 24"
            fill="none" stroke={MUTED} strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
            className="shrink-0 transition-transform duration-200"
            style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
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

// --- CategoryGroup --------------------------------------------

function CategoryGroup({ group, isMobile, isLast, groupDelay }: {
  group:      CategoryWithParticipants;
  isMobile:   boolean;
  isLast:     boolean;
  groupDelay: number;
}) {
  const [open,    setOpen]    = useState(true);
  const [animKey, setAnimKey] = useState(0);

  // animKey naik tiap group dibuka ulang biar animasi kartu muter ulang dari awal
  const handleToggle = () => setOpen(o => { if (!o) setAnimKey(k => k + 1); return !o; });

  const participants = group.participants ?? [];
  const count        = participants.length;
  const hasTeams     = participants.some((p: MappedParticipant) => Array.isArray(p.members) && p.members.length > 1);
  const unitLabel    = hasTeams ? (count === 1 ? "Team" : "Teams") : (count === 1 ? "Individual" : "Individuals");
  const cardBaseDelay = animKey === 0 ? groupDelay + GROUP_HEADER_DUR : 0;

  return (
    <div
      className={isLast ? "" : "pb-6 mb-6"}
      style={{ animation: "anim-slide-up 0.4s ease both", animationDelay: `${groupDelay}ms` }}
    >
      <button
        type="button"
        onClick={handleToggle}
        className="flex items-center w-full gap-[10px] bg-transparent border-0 cursor-pointer p-[2px_0] transition-[margin-bottom] duration-300"
        style={{ marginBottom: open && participants.length > 0 ? 14 : 0 }}
      >
        <svg
          width="14" height="14" viewBox="0 0 24 24"
          fill="none" stroke={MUTED} strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
          className="shrink-0 transition-transform duration-[250ms]"
          style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>

        <span className="font-jakarta text-[13px] font-bold whitespace-nowrap" style={{ color: NAVY }}>
          {group.category.name}
        </span>

        <div className="flex-1 h-px" style={{ background: BORDER }} />

        <span className="font-jakarta text-xs font-semibold whitespace-nowrap" style={{ color: MUTED }}>
          {count} {unitLabel}
        </span>
      </button>

      <div className="transition-[grid-template-rows] duration-300" style={{ display: "grid", gridTemplateRows: open ? "1fr" : "0fr" }}>
        <div className="overflow-hidden p-[0px_1px]">
          <div className={`grid ${isMobile ? "gap-2" : "gap-3"}`} style={{ gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))" }}>
            {participants.length === 0 ? (
              <div className="col-span-full font-jakarta text-[13px] text-[#9CA3AF] py-3">No participants yet.</div>
            ) : (
              participants.map((p: MappedParticipant, i: number) => (
                <div key={`${animKey}-${p.id}`} className="min-w-0">
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

// --- ParticipantsTab ------------------------------------------

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

  const base     = TAB_ENTER.baseDelay ?? 0;
  const nonEmpty = groups ? groups.filter(g => (g.participants ?? []).length > 0) : [];

  return (
    <div style={phase === "entering" ? staggerSlideUp(base, TAB_ENTER) : {}}>
      <PanelCard>
        <PanelTitle>Participants</PanelTitle>

        <div className="relative">
          {/* Skeleton nempatin ruang pas loading, fade out begitu data masuk */}
          <div
            className="pointer-events-none"
            style={{
              ...(fading ? { position: "absolute", top: 0, left: 0, right: 0, zIndex: 1 } : {}),
              opacity:    fading ? 0 : 1,
              transition: fading ? "opacity 0.3s ease" : "none",
            }}
          >
            <SkeletonRows isMobile={isMobile} />
          </div>

          <div style={{ opacity: fading ? 1 : 0, transition: fading ? "opacity 0.3s ease" : "none" }}>
            {groups !== null && nonEmpty.length === 0 ? (
              <div className="font-jakarta text-[13px] text-[#9CA3AF] text-center py-8">
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

        <div className="h-5" />
      </PanelCard>
    </div>
  );
}