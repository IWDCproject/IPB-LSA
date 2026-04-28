"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { MappedMatch } from "../_types";

// ─── Config ───────────────────────────────────────────────────────────────────

/** REST fallback poll interval (ms). Only used when WS is unavailable. */
const POLL_INTERVAL_MS   = 10_000;
/** Max consecutive REST failures before giving up. */
const POLL_MAX_RETRIES   = 5;
/** Max WS reconnect attempts before falling back to REST polling. */
const WS_MAX_RECONNECTS  = 5;
/** Base delay for WS reconnect backoff (doubles each attempt, capped at 30s). */
const WS_BASE_DELAY_MS   = 1_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert http(s):// → ws(s):// so we never need a second env var. */
function getWsUrl(): string {
  const base  = process.env.NEXT_PUBLIC_DIRECTUS_URL ?? "http://localhost:7777";
  const token = process.env.NEXT_PUBLIC_DIRECTUS_TOKEN ?? "";
  const ws    = base.replace(/^http/, "ws") + "/websocket";
  return token ? `${ws}?access_token=${token}` : ws;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface UseMatchStateResult {
  matches:     MappedMatch[];
  lastUpdated: Date | null;
  isPolling:   boolean;
}

/** Minimal shape of a WS update — only the fields we subscribe to. */
interface WsMatchUpdate {
  id:          string;
  live_state?: MappedMatch["live_state"];
  status?:     string;
}

/**
 * Keeps match data fresh for the current event.
 *
 * PRIMARY — Directus WebSocket:
 *   Subscribes to `matches` for this event slug, fields [id, live_state, status].
 *   On `init`: merges initial live_state/status into the server-rendered matches.
 *   On `update`: patches only the changed matches by ID — no remapping needed.
 *   Handles Directus heartbeat (ping → pong).
 *   Reconnects with exponential backoff on disconnect.
 *
 * FALLBACK — REST polling:
 *   Activated after WS_MAX_RECONNECTS consecutive failures.
 *   Polls /api/events/[slug]/matches every POLL_INTERVAL_MS.
 *   Restores WS attempt when tab becomes visible again after a fallback period.
 *
 * @param slug           - event slug (used for WS filter + REST URL)
 * @param initialMatches - server-rendered matches from EventDetailClient
 */
export function useMatchState(
  slug:           string,
  initialMatches: MappedMatch[],
): UseMatchStateResult {
  const [matches,     setMatches]     = useState<MappedMatch[]>(initialMatches);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isPolling,   setIsPolling]   = useState(false);

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // ─── Shared merge: patch live_state + status into existing mapped matches ──
  // We subscribe to only [id, live_state, status] — never the full row —
  // so the static participant/category data from the server render is preserved.
  const applyUpdates = useCallback((updates: WsMatchUpdate[]) => {
    if (!isMounted.current || !updates.length) return;
    setMatches(prev => prev.map(m => {
      const u = updates.find(x => x.id === m.id);
      if (!u) return m;
      return {
        ...m,
        ...(u.status     !== undefined && { status:     u.status }),
        ...(u.live_state !== undefined && { live_state: u.live_state }),
      };
    }));
    setLastUpdated(new Date());
  }, []);

  // ─── REST fallback ─────────────────────────────────────────────────────────
  const pollRetries = useRef(0);
  const pollAbort   = useRef<AbortController | null>(null);

  const fetchOnce = useCallback(async () => {
    if (pollRetries.current >= POLL_MAX_RETRIES) return;
    pollAbort.current?.abort();
    const ctrl = new AbortController();
    pollAbort.current = ctrl;
    try {
      if (isMounted.current) setIsPolling(true);
      const res = await fetch(`/api/events/${slug}/matches`, {
        signal: ctrl.signal,
        cache:  "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: MappedMatch[] = await res.json();
      pollRetries.current = 0;
      if (isMounted.current) {
        setMatches(data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      pollRetries.current++;
      console.warn(`[useMatchState] REST poll failed (${pollRetries.current}/${POLL_MAX_RETRIES}):`, err);
    } finally {
      if (isMounted.current) setIsPolling(false);
    }
  }, [slug]);

  // ─── Main effect: WebSocket with REST fallback ─────────────────────────────
  useEffect(() => {
    let ws:              WebSocket | null = null;
    let reconnectCount                    = 0;
    let reconnectTimer:  ReturnType<typeof setTimeout> | null = null;
    let pollInterval:    ReturnType<typeof setInterval> | null = null;
    let usingFallback                     = false;

    // ── REST fallback ────────────────────────────────────────────────────────
    const startFallback = () => {
      if (usingFallback) return;
      usingFallback = true;
      console.warn("[useMatchState] WS unavailable after max retries — falling back to REST polling");
      void fetchOnce();
      pollInterval = setInterval(() => {
        if (document.visibilityState === "visible") void fetchOnce();
      }, POLL_INTERVAL_MS);
    };

    const stopFallback = () => {
      if (!usingFallback) return;
      usingFallback = false;
      if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
      pollAbort.current?.abort();
      pollRetries.current = 0;
      setIsPolling(false);
    };

    // ── WebSocket ────────────────────────────────────────────────────────────
    const log = (...args: unknown[]) => console.log("[WS]", ...args);

    const sendSubscribe = () => {
      const msg = {
        type:       "subscribe",
        collection: "matches",
        uid:        `matches-${slug}`,
        query: {
          filter: { competition_category_id: { event_id: { slug: { _eq: slug } } } },
          fields: ["id", "live_state", "status"],
        },
      };
      log("→ SEND subscribe", msg);
      ws!.send(JSON.stringify(msg));
    };

    const connect = () => {
      if (!isMounted.current) return;
      const url = getWsUrl();
      log(`connecting (attempt ${reconnectCount + 1}) → ${url}`);
      try {
        ws = new WebSocket(url);
      } catch (err) {
        log("WebSocket constructor threw:", err);
        handleDisconnect();
        return;
      }

      ws.onopen = () => {
        log("onopen — readyState:", ws?.readyState);
        reconnectCount = 0;
        stopFallback();
        // Optimistic subscribe. If Directus needs auth first it will send
        // { type:"auth", status:"required" } via onmessage, which re-subscribes
        // after auth.ok. Same uid → Directus deduplicates.
        sendSubscribe();
      };

      ws.onmessage = (ev: MessageEvent) => {
        let msg: Record<string, unknown>;
        try { msg = JSON.parse(ev.data as string); } catch { return; }

        // auth is done via URL token — ignore any stray auth frames
        if (msg.type === "auth") return;

        if (msg.type === "ping") {
          ws!.send(JSON.stringify({ type: "pong" }));
          return;
        }

        if (
          msg.type === "subscription" &&
          (msg.event === "init" || msg.event === "update")
        ) {
          const raw     = msg.data;
          const updates = (Array.isArray(raw) ? raw : [raw]) as WsMatchUpdate[];
          applyUpdates(updates);
        }
      };

      ws.onerror = (ev) => {
        log("onerror — event:", ev);
        ws?.close();
      };

      ws.onclose = (ev) => {
        log(`onclose — code: ${ev.code}, reason: "${ev.reason}", wasClean: ${ev.wasClean}`);
        handleDisconnect();
      };
    };

    const handleDisconnect = () => {
      if (!isMounted.current) return;
      ws = null;
      if (reconnectCount >= WS_MAX_RECONNECTS) {
        startFallback();
        return;
      }
      const delay = Math.min(WS_BASE_DELAY_MS * 2 ** reconnectCount, 30_000);
      reconnectCount++;
      log(`reconnecting in ${delay}ms (${reconnectCount}/${WS_MAX_RECONNECTS})`);
      reconnectTimer = setTimeout(connect, delay);
    };

    // ── Visibility: restore WS when tab comes back into focus ────────────────
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      if (usingFallback) {
        // Try WS again — network may have recovered.
        pollRetries.current = 0;
        reconnectCount      = 0;
        stopFallback();
        connect();
      } else if (!ws || ws.readyState === WebSocket.CLOSED) {
        reconnectCount = 0;
        connect();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    connect();

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (pollInterval)   clearInterval(pollInterval);
      pollAbort.current?.abort();
      ws?.close();
    };
  }, [slug, fetchOnce, applyUpdates]);

  return { matches, lastUpdated, isPolling };
}