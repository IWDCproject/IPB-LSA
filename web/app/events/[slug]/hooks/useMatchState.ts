"use client";

import { useState, useEffect, useCallback } from "react";
import type { MappedMatch } from "../_types";

interface UseMatchStateResult {
  matches:     MappedMatch[];
  lastUpdated: Date | null;
  isPolling:   boolean;
  wsStatus:    "connected" | "reconnecting" | "polling";
}

interface MatchPatch {
  id:          string;
  status?:     string;
  live_state?: MappedMatch["live_state"];
}

/**
 * Keeps match data fresh via the shared SSE stream at /api/matches/stream.
 *
 * The stream broadcasts ALL match updates (id, status, live_state only).
 * applyUpdates ignores any IDs not in this event's match list, so no
 * server-side slug filtering is needed.
 *
 * Return shape is identical to the old WS-based hook - nothing downstream
 * (EventDetailClient, MatchesTab) needs to change.
 */
export function useMatchState(
  _slug:          string,       // kept for API compatibility, not used
  initialMatches: MappedMatch[],
): UseMatchStateResult {
  const [matches,     setMatches]     = useState<MappedMatch[]>(initialMatches);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [wsStatus,    setWsStatus]    = useState<"connected" | "reconnecting" | "polling">("reconnecting");

  const applyUpdates = useCallback((patches: MatchPatch[]) => {
    if (!patches.length) return;
    setMatches(prev => prev.map(m => {
      const p = patches.find(x => x.id === m.id);
      if (!p) return m;
      return {
        ...m,
        ...(p.status     !== undefined && { status:     p.status }),
        ...(p.live_state !== undefined && { live_state: p.live_state }),
      };
    }));
    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const es = new EventSource("/api/matches/stream");

    es.onopen = () => setWsStatus("connected");

    es.onmessage = (event) => {
      try {
        const patches: MatchPatch[] = JSON.parse(event.data);
        if (Array.isArray(patches) && patches.length > 0) applyUpdates(patches);
      } catch {
        // malformed frame - ignore
      }
    };

    es.onerror = () => setWsStatus("reconnecting");
    // EventSource auto-reconnects; status updates back to "connected" on next onopen

    return () => es.close();
  }, []); // one persistent connection for the component lifetime

  return { matches, lastUpdated, isPolling: false, wsStatus };
}