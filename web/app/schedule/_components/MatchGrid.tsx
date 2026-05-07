import { memo } from "react";
import { MobileMatchRow } from "../../events/[slug]/_components/match/MatchRow";

// Dibatasi biar kartu ke-16 dst nggak nunggu lama
const MAX_STAGGER_INDEX = 15;
const STAGGER_STEP_MS   = 40;
const ANIM_DURATION_MS  = 280;

interface MatchGridProps {
  matches: any[];
}

export const MatchGrid = memo(function MatchGrid({ matches }: MatchGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 items-stretch">
      {matches.map((match, i) => (
        <div
          key={match.id ?? `match-fallback-${i}`}
          className="opacity-0 flex flex-col"
          style={{
            animation: `match-row-in ${ANIM_DURATION_MS}ms ease ${Math.min(i, MAX_STAGGER_INDEX) * STAGGER_STEP_MS}ms forwards`,
            willChange: "opacity, transform",
          }}
        >
          {/*
            [&>*]:h-full meneruskan height: 100% ke root element MobileMatchRow.
            Ini butuh MobileMatchRow menerima dan meneruskan className ke root-nya.
            Kalau tinggi kartu jadi nggak seragam lagi, periksa apakah MobileMatchRow forward className.
          */}
          <div className="h-full flex flex-col [&>*]:h-full">
            <MobileMatchRow match={match} dark />
          </div>
        </div>
      ))}
    </div>
  );
});