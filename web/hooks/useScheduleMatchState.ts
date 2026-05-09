/**
 * useScheduleMatchState
 *
 * Subscribes to /api/matches/stream (SSE) and patches the provided match list
 * whenever Directus pushes status/live_state updates.
 *
 * Usage
 * -----
 * const { liveMatches, sseStatus } = useScheduleMatchState(rawMatches);
 *
 * `rawMatches`  – the full match objects from the initial SSR / client fetch
 *                 (all display fields intact).
 * `liveMatches` – same objects but with status / live_state kept in sync.
 * `sseStatus`   – 'connecting' | 'connected' | 'disconnected'
 *
 * The hook only patches matches it already knows about (by id).
 * Unknown ids from the stream are silently ignored - no extra data is fetched.
 * Re-connect is handled automatically by the browser's EventSource.
 */

"use client";

import { useState, useEffect, useRef } from "react";

// --- Types --------------------------------------------------------------------

export type SseStatus = "connecting" | "connected" | "disconnected";

// --- Patch helper -------------------------------------------------------------

/**
 * Apply a batch of partial updates (from SSE) onto the current match array.
 * Only `id`, `status`, and `live_state` are patched; all other rich fields
 * (participants, event name, image, …) are preserved from the initial fetch.
 *
 * Returns the same array reference if nothing changed (stable identity →
 * downstream useMemo/render bailouts work correctly).
 */
function applyUpdates(current: any[], updates: { id: number | string; status?: string; live_state?: any }[]): any[] {
  if (!updates?.length) return current;

  const map = new Map(updates.map(u => [String(u.id), u]));
  let changed = false;

  const next = current.map(m => {
    const patch = map.get(String(m.id));
    if (!patch) return m;
    changed = true;
    return { ...m, ...patch };
  });

  return changed ? next : current;
}

// --- Hook ---------------------------------------------------------------------

export function useScheduleMatchState(rawMatches: any[]) {
  const [liveMatches, setLiveMatches] = useState<any[]>(rawMatches);
  const [sseStatus,   setSseStatus]   = useState<SseStatus>("connecting");

  // Sync liveMatches whenever the parent re-fetches (filter / page change)
  useEffect(() => {
    setLiveMatches(rawMatches);
  }, [rawMatches]);

  // SSE subscription - single effect, one EventSource for the component lifetime
  useEffect(() => {
    // Skip on SSR
    if (typeof window === "undefined") return;

    const es = new EventSource("/api/matches/stream");

    es.onopen = () => setSseStatus("connected");

    es.onmessage = (event) => {
      try {
        const updates = JSON.parse(event.data);
        if (Array.isArray(updates) && updates.length > 0) {
          setLiveMatches(prev => applyUpdates(prev, updates));
        }
      } catch {
        // Malformed frame - ignore
      }
    };

    es.onerror = () => {
      setSseStatus("disconnected");
      // EventSource will auto-reconnect; update status on next onopen
    };

    return () => {
      es.close();
    };
  }, []); // Intentionally empty - one persistent connection

  return { liveMatches, sseStatus };
}