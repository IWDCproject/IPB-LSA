// Renders a responsive grid of MobileMatchRow cards.
//
// Stagger animation: each card fades + slides in with a cascading delay.
// Capped at MAX_STAGGER_INDEX so large lists don't have absurd wait times.
//
// The parent passes a `key` that changes on filter change, which unmounts
// and remounts this component — re-triggering the stagger on every filter update.

import { MobileMatchRow } from "../../events/[slug]/_components/match/MatchRow";

const MAX_STAGGER_INDEX = 15;
const STAGGER_STEP_MS  = 40;
const ANIM_DURATION_MS = 280;

interface MatchGridProps {
  matches: any[]; // MappedMatch[]
}

export function MatchGrid({ matches }: MatchGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {matches.map((match, i) => {
        const delayMs = Math.min(i, MAX_STAGGER_INDEX) * STAGGER_STEP_MS;
        return (
          <div
            key={match.id}
            className="opacity-0"
            style={{
              animation: `match-row-in ${ANIM_DURATION_MS}ms ease ${delayMs}ms forwards`,
            }}
          >
            {/* dark=true so the card reads well against the navy page background */}
            <MobileMatchRow match={match} dark />
          </div>
        );
      })}
    </div>
  );
}