import type { MappedMatch } from "../../_types";

// --- Score calculation --------------------------------------------------------

export function calcAvg(scores: number[] = [], method = "avg"): number {
  if (!scores.length) return 0;
  if (method === "drop_extremes" && scores.length > 2) {
    const sorted = [...scores].sort((a, b) => a - b).slice(1, -1);
    return sorted.reduce((a, b) => a + b, 0) / sorted.length;
  }
  const sum = scores.reduce((a, b) => a + b, 0);
  return method === "sum" ? sum : sum / scores.length;
}

export function getEngine(fmt: any) {
  return fmt?.modules?.[0] ?? null;
}

// --- Date formatting ----------------------------------------------------------

/**
 * Long format - includes weekday. Used for date-group headers in MatchesTab
 * (the full-page tab view).
 * Example: "Sunday, 12 January 2025"
 */
export function fmtDateLong(iso: string | null | undefined): string {
  if (!iso) return "No Date";
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

/**
 * Short format - no weekday. Used for match card/panel rows in MatchesPanels.
 * Example: "12 January 2025"
 */
export function fmtDateShort(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "?";
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta",
  });
}

// --- Grouping -----------------------------------------------------------------

/** Groups matches by their date using `fmtDateLong` - for MatchesTab. */
export function groupByDateLong(matches: MappedMatch[]): Map<string, MappedMatch[]> {
  return matches.reduce((map, m) => {
    const key = fmtDateLong(m.scheduled_at);
    return map.set(key, [...(map.get(key) ?? []), m]);
  }, new Map<string, MappedMatch[]>());
}

/** Groups matches by their date using `fmtDateShort` - for MatchesPanels. */
export function groupByDateShort(matches: MappedMatch[]): Map<string, MappedMatch[]> {
  return matches.reduce((map, m) => {
    const key = m.scheduled_at ? fmtDateShort(m.scheduled_at) : "No Date";
    return map.set(key, [...(map.get(key) ?? []), m]);
  }, new Map<string, MappedMatch[]>());
}

// --- Winner resolution --------------------------------------------------------

/** UUID v4 regex - used to distinguish stored UUIDs from plain-text winner names. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolves the winner's display name from a match object.
 * `live.winner` / `match.winner` may be a raw participant UUID stored in the DB.
 * We look it up against home / away / open participants so the UI always shows
 * the human-readable name.
 *
 * Uses a proper UUID regex instead of a hyphen-presence heuristic so that
 * hyphenated team names like "Team A-1" are not misidentified as UUIDs.
 */
export function resolveWinnerName(match: MappedMatch): string | null {
  const live     = match.live_state ?? {};
  const winnerId = match.winner ?? live.winner;
  if (!winnerId) return null;

  if (match.home_participant?.id === winnerId) return match.home_participant.name;
  if (match.away_participant?.id === winnerId) return match.away_participant.name;

  for (const entry of match.participants ?? []) {
    if (entry.participant_id?.id === winnerId) return entry.participant_id.name;
  }

  // manual_pick may store the name directly - only treat it as a name if it
  // is not a UUID (using the regex, not the fragile hyphen-presence check).
  if (typeof live.winner === "string" && !UUID_RE.test(live.winner)) {
    return live.winner;
  }

  return null;
}