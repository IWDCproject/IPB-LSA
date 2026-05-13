// app/api/blur/route.js
import sharp  from "sharp";
import crypto from "crypto";
import fs     from "fs/promises";
import path   from "path";

const IS_DEV        = process.env.NODE_ENV === "development";
const CACHE_DIR     = process.env.BLUR_CACHE_DIR ?? path.join(process.cwd(), ".blur-cache");
const DEFAULT_TTL_S = 30 * 24 * 60 * 60; // 30 days default
const MAX_CACHE_SIZE_BYTES = 500 * 1024 * 1024; // 500MB limit

const MAX_IN_FLIGHT  = 50;
const IN_FLIGHT      = new Map();

const MAX_BODY_BYTES = 10 * 1024 * 1024;
const MAX_PIXELS = 25_000_000;

// -- Performance Tunings ----------------------------------------------------
const MEM_CACHE = new Map();
const MAX_MEM_CACHE_ITEMS = 100;
const CONCURRENCY_LIMIT = 8; // Max parallel Sharp tasks
let ACTIVE_SHARP_TASKS = 0;
const TASK_QUEUE = [];

function getMemCache(key) {
  const item = MEM_CACHE.get(key);
  if (item) {
    MEM_CACHE.delete(key);
    MEM_CACHE.set(key, item);
    return item;
  }
  return null;
}

function setMemCache(key, buf) {
  if (MEM_CACHE.size >= MAX_MEM_CACHE_ITEMS) {
    const first = MEM_CACHE.keys().next().value;
    MEM_CACHE.delete(first);
  }
  MEM_CACHE.set(key, buf);
}

async function acquireSemaphore() {
  if (ACTIVE_SHARP_TASKS < CONCURRENCY_LIMIT) {
    ACTIVE_SHARP_TASKS++;
    return;
  }
  return new Promise((resolve) => TASK_QUEUE.push(resolve));
}

function releaseSemaphore() {
  ACTIVE_SHARP_TASKS--;
  if (TASK_QUEUE.length > 0) {
    ACTIVE_SHARP_TASKS++;
    const next = TASK_QUEUE.shift();
    next();
  }
}

if (!IS_DEV) {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  sweepExpiredCache();
  setInterval(sweepExpiredCache, 24 * 60 * 60 * 1000);
}

// ---------------------------------------------------------------------------
// Expired cache sweep
// Runs on cold start and every 24h. Cleans up orphaned files left behind
// when images are replaced in Directus (old URL → new URL → old file never
// requested again, so readCacheSafe never gets a chance to delete it).
// ---------------------------------------------------------------------------
async function sweepExpiredCache() {
  try {
    const files = await fs.readdir(CACHE_DIR);
    let totalSize = 0;
    const fileInfos = [];

    for (const f of files) {
      if (!f.endsWith(".webp")) continue;
      const filePath = path.join(CACHE_DIR, f);
      const stat = await fs.stat(filePath).catch(() => null);
      if (!stat) continue;
      
      const ageSeconds = (Date.now() - stat.mtimeMs) / 1000;
      if (ageSeconds > DEFAULT_TTL_S) {
        await fs.unlink(filePath).catch(() => {});
      } else {
        totalSize += stat.size;
        fileInfos.push({ path: filePath, size: stat.size, mtime: stat.mtimeMs });
      }
    }

    // If still over size limit, delete oldest files until under limit
    if (totalSize > MAX_CACHE_SIZE_BYTES) {
      fileInfos.sort((a, b) => a.mtime - b.mtime);
      for (const info of fileInfos) {
        await fs.unlink(info.path).catch(() => {});
        totalSize -= info.size;
        if (totalSize <= MAX_CACHE_SIZE_BYTES * 0.8) break; // Clear down to 80%
      }
    }
  } catch (err) {
    console.warn("[blur] sweep failed:", err.message);
  }
}

// ---------------------------------------------------------------------------
// URL validation
// ---------------------------------------------------------------------------
function validateUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, msg: "Invalid URL" };
  }

  // 1. Protocol check
  if (!["https:", "http:"].includes(parsed.protocol)) {
    return { ok: false, msg: "Forbidden" };
  }

  // 2. Block Credentials (SSRF bypass prevention)
  if (parsed.username || parsed.password) {
    return { ok: false, msg: "Forbidden" };
  }

  // 3. Origin check
  const allowedOrigin = process.env.NEXT_PUBLIC_DIRECTUS_URL;
  if (!allowedOrigin) {
    console.error("[blur] NEXT_PUBLIC_DIRECTUS_URL is not set - all requests blocked");
    return { ok: false, msg: "Forbidden" };
  }

  let allowedUrl;
  try {
    allowedUrl = new URL(allowedOrigin);
  } catch {
    console.error("[blur] NEXT_PUBLIC_DIRECTUS_URL is not a valid URL");
    return { ok: false, msg: "Forbidden" };
  }

  if (parsed.origin !== allowedUrl.origin) {
    return { ok: false, msg: "Forbidden" };
  }

  // 4. Path check (SSRF fix - restrict to assets)
  // Directus assets URLs follow /assets/<uuid>
  const assetRegex = /^\/assets\/[a-f0-9-]{36}(\/.*)?$/i;
  if (!assetRegex.test(parsed.pathname)) {
    return { ok: false, msg: "Forbidden" };
  }

  return { ok: true, url: parsed.toString() };
}

// ---------------------------------------------------------------------------
// Cache helpers
// ---------------------------------------------------------------------------
function extractAssetId(url) {
  const match = url.match(/\/assets\/([a-f0-9-]{36})/i);
  return match ? match[1] : "unknown";
}

function cacheFilename(url, blur, w, h) {
  const assetId = extractAssetId(url);
  const hash    = crypto.createHash("sha256").update(`${url}|${blur}|${w}|${h}`).digest("hex").slice(0, 32);
  return `${assetId}_${hash}.webp`;
}

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

async function readCacheSafe(filePath, ttlSeconds) {
  try {
    const stat       = await fs.stat(filePath);
    const ageSeconds = (Date.now() - stat.mtimeMs) / 1000;
    if (ageSeconds > ttlSeconds) {
      await fs.unlink(filePath).catch(() => {});
      return null;
    }

    const buf = await fs.readFile(filePath);
    if (buf.length === 0) {
      await fs.unlink(filePath).catch(() => {});
      return null;
    }
    return buf;
  } catch {
    await fs.unlink(filePath).catch(() => {});
    return null;
  }
}

// ---------------------------------------------------------------------------
// Image fetch + processing
// ---------------------------------------------------------------------------
async function fetchInput(url) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(10_000),
    redirect: "error",
  });

  if (res.status === 404) throw Object.assign(new Error("Image not found"), { status: 404 });
  if (!res.ok) throw Object.assign(new Error("Upstream error"), { status: 502 });

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    throw Object.assign(new Error("Upstream did not return an image"), { status: 502 });
  }

  const contentLength = Number(res.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    throw Object.assign(new Error("Image too large"), { status: 422 });
  }

  const reader = res.body.getReader();
  const chunks = [];
  let totalRead = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalRead += value.byteLength;
    if (totalRead > MAX_BODY_BYTES) {
      await reader.cancel();
      throw Object.assign(new Error("Image too large"), { status: 422 });
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

async function runSharp(url, blur, w, h) {
  const inputBuf = await fetchInput(url);
  await acquireSemaphore();
  try {
    const meta = await sharp(inputBuf).metadata();
    const inputPixels = (meta.width ?? 0) * (meta.height ?? 0);
    if (inputPixels > MAX_PIXELS) {
      throw Object.assign(new Error("Image dimensions too large"), { status: 422 });
    }

    const safeW = Math.min(w, Math.floor(Math.sqrt(MAX_PIXELS)));
    const safeH = Math.min(h, Math.floor(Math.sqrt(MAX_PIXELS)));

    // Quality optimization for high blur
    const q = blur > 10 ? 50 : 85;

    return sharp(inputBuf)
      .resize(safeW, safeH, {
        fit: "cover",
        withoutEnlargement: true,
        kernel: sharp.kernel.lanczos3,
      })
      .blur(blur)
      .webp({ quality: q })
      .toBuffer();
  } finally {
    releaseSemaphore();
  }
}

async function runSharpBatch(url, blurs, w, h) {
  const inputBuf = await fetchInput(url);
  await acquireSemaphore();
  try {
    const meta = await sharp(inputBuf).metadata();
    const inputPixels = (meta.width ?? 0) * (meta.height ?? 0);
    if (inputPixels > MAX_PIXELS) {
      throw Object.assign(new Error("Image dimensions too large"), { status: 422 });
    }

    const safeW = Math.min(w, Math.floor(Math.sqrt(MAX_PIXELS)));
    const safeH = Math.min(h, Math.floor(Math.sqrt(MAX_PIXELS)));

    // Process all blurs in parallel then tile vertically
    const layers = await Promise.all(
      blurs.map((blur) => {
        const q = blur > 10 ? 50 : 85;
        return sharp(inputBuf)
          .resize(safeW, safeH, {
            fit: "cover",
            withoutEnlargement: true,
            kernel: sharp.kernel.lanczos3,
          })
          .blur(blur)
          .webp({ quality: q })
          .toBuffer();
      })
    );

    // Read back dimensions of first layer
    const firstMeta = await sharp(layers[0]).metadata();
    const layerW = firstMeta.width;
    const layerH = firstMeta.height;

    // Tile vertically
    return sharp({
      create: {
        width: layerW,
        height: layerH * layers.length,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite(
        layers.map((buf, i) => ({
          input: buf,
          top: i * layerH,
          left: 0,
        }))
      )
      .webp({ quality: 90 })
      .toBuffer();
  } finally {
    releaseSemaphore();
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  const blursRaw = searchParams.get("blurs");
  const blur = Math.min(100, Math.max(0.3, Number(searchParams.get("blur") || 8)));
  const w = Math.min(2000, Math.max(1, Number(searchParams.get("w") || 800)));
  const h = Math.min(2000, Math.max(1, Number(searchParams.get("h") || 600)));
  const ttl = Math.min(90 * 24 * 60 * 60, Math.max(60, Number(searchParams.get("ttl") || DEFAULT_TTL_S)));

  if (!url) return new Response("Missing url param", { status: 400 });

  const validation = validateUrl(url);
  if (!validation.ok) return new Response(validation.msg, { status: 403 });
  const safeUrl = validation.url;

  // Key for cache/dedup
  const blurs = blursRaw ? blursRaw.split(",").map(Number).filter(n => !isNaN(n)) : null;
  const key = cacheFilename(safeUrl, blurs ? blurs.join("-") : blur, w, h);

  // 1. In-memory check (Nitro)
  const mem = getMemCache(key);
  if (mem) {
    return new Response(mem, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Cache": "MEMORY",
      },
    });
  }

  if (IS_DEV) {
    try {
      const buf = blurs ? await runSharpBatch(safeUrl, blurs, w, h) : await runSharp(safeUrl, blur, w, h);
      return new Response(buf, { headers: { "Content-Type": "image/webp" } });
    } catch (err) {
      console.error("[blur] dev error:", err);
      return new Response("Internal error", { status: err.status ?? 500 });
    }
  }

  // 2. Disk check
  const filePath = path.join(CACHE_DIR, key);
  const cached = await readCacheSafe(filePath, ttl);
  if (cached) {
    setMemCache(key, cached);
    return new Response(cached, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Cache": "DISK",
      },
    });
  }

  // 3. In-flight dedup
  if (IN_FLIGHT.has(key)) {
    try {
      const buf = await IN_FLIGHT.get(key);
      return new Response(buf, {
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": "public, max-age=31536000, immutable",
          "X-Cache": "DEDUP",
        },
      });
    } catch (err) {
      return new Response("Internal error", { status: err.status ?? 500 });
    }
  }

  // 4. Fresh process
  if (IN_FLIGHT.size >= MAX_IN_FLIGHT) {
    return new Response("Too many requests", { status: 429 });
  }

  const promise = blurs ? runSharpBatch(safeUrl, blurs, w, h) : runSharp(safeUrl, blur, w, h);
  IN_FLIGHT.set(key, promise);
  try {
    const buf = await promise;
    setMemCache(key, buf);
    await writeCacheAtomic(filePath, buf).catch(() => {});
    return new Response(buf, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Cache": "MISS",
      },
    });
  } catch (err) {
    console.error("[blur] processing error:", err);
    return new Response("Internal error", { status: err.status ?? 500 });
  } finally {
    IN_FLIGHT.delete(key);
  }
}
