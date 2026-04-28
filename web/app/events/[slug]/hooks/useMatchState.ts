"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { MappedMatch } from "../_types";

/** How often to re-fetch live match data (ms). */
const POLL_INTERVAL_MS = 10_000;

interface UseMatchStateResult {
  matches:     MappedMatch[];
  lastUpdated: Date | null;
  isPolling:   boolean;
}

/**
 * Keeps match data fresh for the current event.
 *
 * TODAY — polling via REST:
 *   Re-fetches /api/events/[slug]/matches every POLL_INTERVAL_MS.
 *   Only polls when the browser tab is visible to avoid wasted requests.
 *
 * LATER — WebSocket swap:
 *   Replace the useEffect body with a socket.io / native WebSocket
 *   subscription. The returned `matches` shape never changes, so none of
 *   MatchesTab, MatchesPanels, or EventDetailClient need to know.
 *
 * @param slug          - event slug used to build the API URL
 * @param initialMatches - server-rendered matches passed from EventDetailClient
 */
export function useMatchState(
  slug:           string,
  initialMatches: MappedMatch[],
): UseMatchStateResult {
  const [matches,     setMatches]     = useState<MappedMatch[]>(initialMatches);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isPolling,   setIsPolling]   = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchMatches = useCallback(async () => {
    // Cancel any in-flight request before starting a new one
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      setIsPolling(true);
      const res = await fetch(`/api/events/${slug}/matches`, {
        signal: ctrl.signal,
        // Bypass Next.js cache so we always get fresh data
        cache: "no-store",
      });
      if (!res.ok) return;
      const data: MappedMatch[] = await res.json();
      setMatches(data);
      setLastUpdated(new Date());
    } catch (err) {
      if ((err as Error).name === "AbortError") return; // expected — ignore
      console.warn("[useMatchState] fetch failed:", err);
    } finally {
      setIsPolling(false);
    }
  }, [slug]);

  useEffect(() => {
    // ── Don't poll if the page is hidden (saves requests on background tabs) ──
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void fetchMatches();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    // Initial fetch + interval
    void fetchMatches();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void fetchMatches();
    }, POLL_INTERVAL_MS);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      abortRef.current?.abort();
    };
  }, [fetchMatches]);

  return { matches, lastUpdated, isPolling };
}