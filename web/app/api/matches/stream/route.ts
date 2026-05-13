export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import WS from "ws";

type SseController = ReadableStreamDefaultController<Uint8Array>;

// --- Singleton state ----------------------------------------------------------

const clients = new Set<SseController>();
const encoder = new TextEncoder();

let directusWs:   WS | null = null;
let wsConnecting: boolean   = false;

// --- Broadcast ----------------------------------------------------------------

function broadcast(data: unknown) {
  const payload = encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
  clients.forEach(ctrl => {
    try {
      ctrl.enqueue(payload);
    } catch {
      clients.delete(ctrl);
    }
  });
}

// --- Singleton WS to Directus -------------------------------------------------

function connectToDirectus() {
  if (directusWs || wsConnecting) return;
  wsConnecting = true;

  const base  = (process.env.NEXT_PUBLIC_DIRECTUS_URL ?? "").replace(/\/$/, "");
  const token = process.env.DIRECTUS_TOKEN ?? process.env.NEXT_PUBLIC_DIRECTUS_TOKEN ?? "";
  const wsUrl = base.replace(/^https?/, "ws") + "/websocket";

  const ws = new WS(wsUrl);
  directusWs = ws;

  ws.on("open", () => {
    ws.send(JSON.stringify({ type: "auth", access_token: token }));
  });

  ws.on("message", (raw) => {
    let msg: any;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    if (msg.type === "auth" && msg.status === "ok") {
      wsConnecting = false;
      ws.send(JSON.stringify({
        type:       "subscribe",
        collection: "matches",
        uid:        "schedule-all",
        query:      { fields: ["id", "status", "live_state"] },
      }));
      return;
    }

    if (msg.type === "subscription" && msg.event === "update" && Array.isArray(msg.data)) {
      broadcast(msg.data);
    }
  });

  ws.on("close", () => {
    directusWs = null;
    wsConnecting = false;
    setTimeout(connectToDirectus, 4_000);
  });

  ws.on("error", () => ws.terminate());
}

// --- Heartbeat ----------------------------------------------------------------

let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

function ensureHeartbeat() {
  if (heartbeatInterval) return;
  heartbeatInterval = setInterval(() => {
    clients.forEach(ctrl => {
      try {
        ctrl.enqueue(encoder.encode(": ping\n\n"));
      } catch {
        clients.delete(ctrl);
      }
    });
  }, 25_000);
}

// --- Route handler -----------------------------------------------------------

export async function GET(req: Request) {
  connectToDirectus();
  ensureHeartbeat();

  let controller: SseController;

  const stream = new ReadableStream<Uint8Array>({
    start(ctrl) {
      controller = ctrl;
      clients.add(ctrl);
      ctrl.enqueue(encoder.encode(": connected\n\n"));
    },
    cancel() {
      clients.delete(controller);
    },
  });

  req.signal.addEventListener("abort", () => {
    if (controller) clients.delete(controller);
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type":      "text/event-stream",
      "Cache-Control":     "no-cache, no-transform",
      "Connection":        "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}