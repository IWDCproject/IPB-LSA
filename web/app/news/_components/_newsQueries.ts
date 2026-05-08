/**
 * Query-construction helpers for the News page.
 *
 * UI components import from here instead of building raw Directus filter
 * objects inline.  This is the single place where canonical EventStatus values
 * map to raw Directus status aliases.  The inverse direction (raw → canonical)
 * lives in directus.js's STATUS_MAP and is used when data arrives from the API.
 */

import type { EventStatus, DirectusNewsFilter } from "./_newsTypes";

// --- Status alias map ---------------------------------------------------------

/**
 * Maps each canonical EventStatus to the raw Directus status strings that
 * represent it.  Directus data may include legacy aliases ("active", "past" …)
 * which STATUS_MAP in directus.js normalises on the way *in*; this map is
 * used on the way *out* when building `_in` filters so queries match all
 * equivalent records.
 */
export const STATUS_RAW_MAP: Record<EventStatus, readonly string[]> = {
  ongoing:   ["ongoing",   "active"],
  upcoming:  ["upcoming"],
  concluded: ["concluded", "finished", "past"],
} as const;

// --- Filter params type -------------------------------------------------------

export interface NewsFilterParams {
  debouncedSearch: string;
  /** Already-expanded raw status strings — pass through STATUS_RAW_MAP first. */
  rawStatuses:     string[];
  eventSlugs:      string[];
}

// --- Filter builder -----------------------------------------------------------

/**
 * Builds a Directus filter object for published news articles.
 *
 * Centralised here so the exact shape never diverges between AllNewsTab and
 * any future server-side usage (e.g. RSS feeds, sitemaps).
 */
export function buildNewsFilter({
  debouncedSearch,
  rawStatuses,
  eventSlugs,
}: NewsFilterParams): DirectusNewsFilter {
  const eventIdFilter: NonNullable<DirectusNewsFilter["event_id"]> = {};

  if (rawStatuses.length) eventIdFilter.status = { _in: rawStatuses };
  if (eventSlugs.length)  eventIdFilter.slug   = { _in: eventSlugs  };

  return {
    is_published: { _eq: true },
    ...(debouncedSearch                       && { title:    { _icontains: debouncedSearch } }),
    ...(Object.keys(eventIdFilter).length > 0 && { event_id: eventIdFilter                 }),
  };
}