"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { MappedMatch } from "../_types";

/** How often to re-fetch live match data (ms). */
const POLL_INTERVAL_MS = 10_000;
/** Stop polling after this many consecutive failures. */
const MAX_RETRIES = 5;

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
 *   Stops polling after MAX_RETRIES consecutive failures (exponential backoff
 *   logged per attempt; polling resumes when tab becomes visible again).
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

  const abortRef      = useRef<AbortController | null>(null);
  const isMounted     = useRef(true);
  const retryCount    = useRef(0);

  // Track mounted state so we never call setState after unmount.
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const fetchMatches = useCallback(async () => {
    // Stop retrying after MAX_RETRIES consecutive failures.
    if (retryCount.current >= MAX_RETRIES) return;

    // Cancel any in-flight request before starting a new one.
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      if (isMounted.current) setIsPolling(true);
      const res = await fetch(`/api/events/${slug}/matches`, {
        signal: ctrl.signal,
        // Bypass Next.js cache so we always get fresh data.
        cache: "no-store",
      });
      if (!res.ok) {
        // Server returned an error (e.g. 500) — treat as a failure.
        throw new Error(`HTTP ${res.status}`);
      }
      const data: MappedMatch[] = await res.json();

      // Success — reset retry counter and update state.
      retryCount.current = 0;
      if (isMounted.current) {
        setMatches(data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return; // expected — ignore
      retryCount.current += 1;
      const backoffSec = Math.min(2 ** retryCount.current, 60);
      console.warn(
        `[useMatchState] fetch failed (attempt ${retryCount.current}/${MAX_RETRIES}, ` +
        `next poll in ~${POLL_INTERVAL_MS / 1000}s, backoff noted: ${backoffSec}s):`,
        err,
      );
    } finally {
      // Guard against setState after unmount (e.g. if abort fires mid-finally).
      if (isMounted.current) setIsPolling(false);
    }
  }, [slug]);

  useEffect(() => {
    // ── Don't poll if the page is hidden (saves requests on background tabs) ──
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Tab became visible — reset retry counter so we try again even if
        // we previously hit MAX_RETRIES (network may have recovered).
        retryCount.current = 0;
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