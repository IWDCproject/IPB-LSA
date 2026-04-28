"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { MappedMatch } from "../_types";

// Konfigurasi timing, ubah di sini kalau mau ganti interval atau batas retry
const POLL_INTERVAL_MS  = 10_000; // seberapa sering polling REST (ms)
const POLL_MAX_RETRIES  = 5;      // berapa kali gagal sebelum nyerah polling
const WS_MAX_RECONNECTS = 5;      // berapa kali coba reconnect WS sebelum fallback ke REST
const WS_BASE_DELAY_MS  = 1_000;  // delay awal reconnect, tiap gagal dikali 2 (max 30s)

// Konversi URL Directus dari http ke ws, biar ga perlu env var tambahan
function getWsUrl(): string {
  const base  = process.env.NEXT_PUBLIC_DIRECTUS_URL ?? "http://localhost:7777";
  const token = process.env.NEXT_PUBLIC_DIRECTUS_TOKEN ?? "";
  const ws    = base.replace(/^http/, "ws") + "/websocket";
  return token ? `${ws}?access_token=${token}` : ws;
}

// Tipe data yang dikembalikan hook ini
interface UseMatchStateResult {
  matches:     MappedMatch[];
  lastUpdated: Date | null;
  isPolling:   boolean;
  wsStatus:    "connected" | "reconnecting" | "polling";
}

// Shape minimal update dari WebSocket, cuma field yang kita subscribe
interface WsMatchUpdate {
  id:          string;
  live_state?: MappedMatch["live_state"];
  status?:     string;
}

/**
 * Hook untuk nge-keep data match tetap fresh selama user buka halaman event.
 *
 * Cara kerjanya:
 * 1. Pertama coba connect ke Directus via WebSocket
 * 2. Subscribe ke collection "matches" yang filternya event ini
 * 3. Kalau WebSocket gagal terus (5x), fallback ke polling REST tiap 10 detik
 * 4. Kalau tab di-minimize terus dibuka lagi, otomatis coba reconnect WS
 *
 * @param slug           slug event, dipake buat filter WS dan URL polling
 * @param initialMatches data match dari server render (biar ga blank pas pertama load)
 */
export function useMatchState(
  slug:           string,
  initialMatches: MappedMatch[],
): UseMatchStateResult {
  const [matches,     setMatches]     = useState<MappedMatch[]>(initialMatches);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isPolling,   setIsPolling]   = useState(false);
  const [wsStatus,    setWsStatus]    = useState<"connected" | "reconnecting" | "polling">("reconnecting");

  // isMounted guards React state setters in applyUpdates / fetchOnce so we
  // never call setState after the component truly unmounts.
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // ─── applyUpdates ────────────────────────────────────────────────────────────
  // Patch data match yang berubah berdasarkan ID.
  // Kita cuma subscribe ke [id, live_state, status], jadi data lain (peserta, kategori)
  // tetap dari server render dan ga kena overwrite.
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

  // ─── fetchOnce ───────────────────────────────────────────────────────────────
  // Polling REST, dipanggil kalau WebSocket udah menyerah
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

  // ─── Main WS effect ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled      = false;           // ← local to this invocation; never shared
    let ws:            WebSocket | null = null;
    let reconnectCount                  = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let pollInterval:   ReturnType<typeof setInterval> | null = null;
    let usingFallback                   = false;

    // ── Fallback helpers ──────────────────────────────────────────────────────

    const startFallback = () => {
      if (usingFallback || cancelled) return;
      usingFallback = true;
      setWsStatus("polling");
      console.warn("[useMatchState] WS gagal terus, fallback ke REST polling");
      void fetchOnce();
      pollInterval = setInterval(() => {
        if (!cancelled && document.visibilityState === "visible") void fetchOnce();
      }, POLL_INTERVAL_MS);
    };

    const stopFallback = () => {
      if (!usingFallback) return;
      usingFallback = false;
      if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
      pollAbort.current?.abort();
      pollRetries.current = 0;
      if (!cancelled) setIsPolling(false);
    };

    // ── WebSocket ─────────────────────────────────────────────────────────────

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

    const handleDisconnect = () => {
      if (cancelled) return;
      ws = null;
      if (reconnectCount >= WS_MAX_RECONNECTS) {
        startFallback();
        return;
      }
      const delay = Math.min(WS_BASE_DELAY_MS * 2 ** reconnectCount, 30_000);
      reconnectCount++;
      setWsStatus("reconnecting");
      log(`reconnecting in ${delay}ms (${reconnectCount}/${WS_MAX_RECONNECTS})`);
      reconnectTimer = setTimeout(connect, delay);
    };

    const connect = () => {
      // Guard with `cancelled`, not isMounted.
      if (cancelled) return;
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
        if (cancelled) { ws?.close(); return; }   // stale open after cleanup
        log("onopen — readyState:", ws?.readyState);
        reconnectCount = 0;
        stopFallback();
        setWsStatus("connected");
        sendSubscribe();
      };

      ws.onmessage = (ev: MessageEvent) => {
        if (cancelled) return;
        let msg: Record<string, unknown>;
        try { msg = JSON.parse(ev.data as string); } catch { return; }

        if (msg.type === "auth") return;   // handled via token in URL

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
        if (cancelled) return;
        log("onerror — event:", ev);
        ws?.close();
      };

      ws.onclose = (ev) => {
        log(`onclose — code: ${ev.code}, reason: "${ev.reason}", wasClean: ${ev.wasClean}`);
        handleDisconnect();   // no-op if cancelled
      };
    };

    // ── Visibility handler ────────────────────────────────────────────────────

    const onVisibility = () => {
      if (cancelled || document.visibilityState !== "visible") return;
      if (usingFallback) {
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
      cancelled = true;                                           // ← poisons all stale callbacks
      document.removeEventListener("visibilitychange", onVisibility);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (pollInterval)   clearInterval(pollInterval);
      pollAbort.current?.abort();
      ws?.close();
    };
  }, [slug, fetchOnce, applyUpdates]);

  return { matches, lastUpdated, isPolling, wsStatus };
}