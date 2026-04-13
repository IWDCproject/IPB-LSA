// web/app/api/blur/route.js
//
// On-demand blur API with persistent disk cache.
//
// HOW IT WORKS
// ─────────────────────────────────────────────────────────────────────────
// • First request for an image → runs Sharp, saves result to disk, responds.
// • Subsequent requests        → reads from disk, checks TTL, responds.
// • TTL exceeded               → treated as MISS, Sharp reruns, file replaced.
// • Image replaced in Directus → uploaded_on changes → ?v= param changes
//                                → new MD5 → old file becomes orphan
//                                → orphan expires via TTL automatically.
// • Image deleted in Directus  → POST /api/blur-invalidate → files deleted
//                                immediately by asset ID prefix.
// • Dev mode                   → cache bypassed entirely for zero friction.
//
// CACHE FILENAME
// ─────────────────────────────────────────────────────────────────────────
// {assetId}_{md5(url+blur+w+h)}.webp
//
// The assetId prefix allows /api/blur-invalidate to find and delete all
// blur variants for a given asset in O(n) without a metadata store.
// The MD5 suffix ensures uniqueness per blur/size combination.
//
// TTL
// ─────────────────────────────────────────────────────────────────────────
// TTL (seconds) is passed by the worker via &ttl= query param.
// Each processor in blurWorker.js owns its own TTL — the route just
// enforces it. Adding a new blur type requires zero changes here.
//
// Default fallback TTL if none is passed: 7 days.
//

import sharp  from "sharp";
import crypto from "crypto";
import fs     from "fs/promises";
import path   from "path";

// ─── Config ────────────────────────────────────────────────────────────────
const IS_DEV         = process.env.NODE_ENV === "development";
const CACHE_DIR      = process.env.BLUR_CACHE_DIR ?? path.join(process.cwd(), ".blur-cache");
const DEFAULT_TTL_S  = 7 * 24 * 60 * 60; // 7 days fallback

// In-flight dedup: prevents duplicate Sharp processes when two requests
// hit the same uncached image simultaneously. key → Promise<Buffer>
const IN_FLIGHT = new Map();

if (!IS_DEV) {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

// ─── Helpers ───────────────────────────────────────────────────────────────

// Extracts the Directus asset UUID from a URL like:
//   http://localhost:6767/assets/db3d4282-a4e8-46d4-879a-d9fbf0ef629a?v=...
// Returns the UUID string, or "unknown" for non-Directus / external URLs.
function extractAssetId(url) {
  const match = url.match(/\/assets\/([a-f0-9-]{36})/i);
  return match ? match[1] : "unknown";
}

// Cache filename: {assetId}_{md5}.webp
// assetId prefix → fast lookup by asset for invalidation
// md5 suffix     → unique per (url, blur, w, h) combination
function cacheFilename(url, blur, w, h) {
  const assetId = extractAssetId(url);
  const hash    = crypto.createHash("md5").update(`${url}|${blur}|${w}|${h}`).digest("hex");
  return `${assetId}_${hash}.webp`;
}

// Atomic write: write to .tmp first, then rename.
// rename() is atomic on Linux — a crash mid-write never leaves a corrupt file.
async function writeCacheAtomic(filePath, buf) {
  const tmp = `${filePath}.tmp`;
  try {
    await fs.writeFile(tmp, buf);
    await fs.rename(tmp, filePath);
  } catch (err) {
    await fs.unlink(tmp).catch(() => {});
    console.warn("[blur] cache write skipped:", err.message);
  }
}

// Safe read with TTL check.
// Returns the buffer if the file exists, is non-empty, and is within TTL.
// Deletes the file and returns null if corrupt, empty, or expired.
async function readCacheSafe(filePath, ttlSeconds) {
  try {
    const [buf, stat] = await Promise.all([
      fs.readFile(filePath),
      fs.stat(filePath),
    ]);

    if (buf.length === 0) throw new Error("empty");

    const ageSeconds = (Date.now() - stat.mtimeMs) / 1000;
    if (ageSeconds > ttlSeconds) {
      await fs.unlink(filePath).catch(() => {});
      return null; // expired → treat as MISS, regenerate
    }

    return buf;
  } catch {
    await fs.unlink(filePath).catch(() => {});
    return null;
  }
}

async function runSharp(url, blur, w, h) {
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });

  if (res.status === 404) {
    throw Object.assign(new Error("Image not found"), { status: 404 });
  }
  if (!res.ok) {
    throw Object.assign(new Error(`Upstream error ${res.status}`), { status: 502 });
  }

  return sharp(Buffer.from(await res.arrayBuffer()))
    .resize(w, h, { fit: "inside", withoutEnlargement: true })
    .blur(blur)
    .webp({ quality: 80 })
    .toBuffer();
}

// ─── Route handler ─────────────────────────────────────────────────────────

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  // Clamp params to sane ranges so the endpoint cannot be abused
  const blur = Math.min(100,  Math.max(0.3, Number(searchParams.get("blur") || 8)));
  const w    = Math.min(3000, Math.max(1,   Number(searchParams.get("w")    || 800)));
  const h    = Math.min(3000, Math.max(1,   Number(searchParams.get("h")    || 600)));
  const ttl  = Math.min(90 * 24 * 60 * 60,  // cap at 90 days max
               Math.max(60,                   // minimum 60 seconds
               Number(searchParams.get("ttl") || DEFAULT_TTL_S)));

  if (!url) {
    return new Response("Missing url param", { status: 400 });
  }

  // Block open-proxy abuse — only serve images from your own Directus instance
  const allowed = process.env.NEXT_PUBLIC_DIRECTUS_URL;
  if (allowed && !url.startsWith(allowed)) {
    return new Response("Forbidden", { status: 403 });
  }

  // ── Dev mode ─────────────────────────────────────────────────────────────
  if (IS_DEV) {
    try {
      const buf = await runSharp(url, blur, w, h);
      return new Response(buf, {
        headers: { "Content-Type": "image/webp", "X-Cache": "DEV-BYPASS" },
      });
    } catch (err) {
      return new Response(err.message, { status: err.status ?? 500 });
    }
  }

  // ── Prod: check disk cache ────────────────────────────────────────────────
  const filename = cacheFilename(url, blur, w, h);
  const filePath = path.join(CACHE_DIR, filename);
  const cached   = await readCacheSafe(filePath, ttl);

  if (cached) {
    return new Response(cached, {
      headers: {
        "Content-Type":  "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Cache":       "HIT",
      },
    });
  }

  // ── Dedup concurrent misses ───────────────────────────────────────────────
  const key = filename; // filename is already unique per (url, blur, w, h)
  if (IN_FLIGHT.has(key)) {
    try {
      const buf = await IN_FLIGHT.get(key);
      return new Response(buf, {
        headers: {
          "Content-Type":  "image/webp",
          "Cache-Control": "public, max-age=31536000, immutable",
          "X-Cache":       "DEDUP",
        },
      });
    } catch (err) {
      return new Response(err.message, { status: err.status ?? 500 });
    }
  }

  // ── Generate ──────────────────────────────────────────────────────────────
  const promise = runSharp(url, blur, w, h);
  IN_FLIGHT.set(key, promise);

  try {
    const buf = await promise;
    writeCacheAtomic(filePath, buf); // fire-and-forget — response not blocked
    return new Response(buf, {
      headers: {
        "Content-Type":  "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Cache":       "MISS",
      },
    });
  } catch (err) {
    return new Response(err.message, { status: err.status ?? 500 });
  } finally {
    IN_FLIGHT.delete(key);
  }
}