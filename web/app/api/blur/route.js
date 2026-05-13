// app/api/blur/route.js
import sharp  from "sharp";
import crypto from "crypto";
import fs     from "fs/promises";
import path   from "path";

const IS_DEV        = process.env.NODE_ENV === "development";
const CACHE_DIR     = process.env.BLUR_CACHE_DIR ?? path.join(process.cwd(), ".blur-cache");
const DEFAULT_TTL_S = 7 * 24 * 60 * 60;

const MAX_IN_FLIGHT  = 50;
const IN_FLIGHT      = new Map();

const MAX_BODY_BYTES = 10 * 1024 * 1024;
const MAX_PIXELS = 25_000_000;

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
    await Promise.all(files.map(async (f) => {
      if (!f.endsWith(".webp")) return;
      const filePath = path.join(CACHE_DIR, f);
      const stat = await fs.stat(filePath).catch(() => null);
      if (!stat) return;
      const ageSeconds = (Date.now() - stat.mtimeMs) / 1000;
      if (ageSeconds > DEFAULT_TTL_S) {
        await fs.unlink(filePath).catch(() => {});
      }
    }));
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

  if (!["https:", "http:"].includes(parsed.protocol)) {
    return { ok: false, msg: "Forbidden" };
  }

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
async function runSharp(url, blur, w, h) {
  const res = await fetch(url, {
    signal:   AbortSignal.timeout(10_000),
    redirect: "error",
  });

  if (res.status === 404) {
    throw Object.assign(new Error("Image not found"), { status: 404 });
  }
  if (!res.ok) {
    throw Object.assign(new Error("Upstream error"), { status: 502 });
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    throw Object.assign(new Error("Upstream did not return an image"), { status: 502 });
  }

  const contentLength = Number(res.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    throw Object.assign(new Error("Image too large"), { status: 422 });
  }

  const reader  = res.body.getReader();
  const chunks  = [];
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

  const inputBuf = Buffer.concat(chunks);

  const meta        = await sharp(inputBuf).metadata();
  const inputPixels = (meta.width ?? 0) * (meta.height ?? 0);
  if (inputPixels > MAX_PIXELS) {
    throw Object.assign(new Error("Image dimensions too large"), { status: 422 });
  }

  const safeW = Math.min(w, Math.floor(Math.sqrt(MAX_PIXELS)));
  const safeH = Math.min(h, Math.floor(Math.sqrt(MAX_PIXELS)));

  return sharp(inputBuf)
    .resize(safeW, safeH, {
      fit:                "inside",
      withoutEnlargement: true,
      kernel:             sharp.kernel.lanczos3,
    })
    .blur(blur)
    .webp({ quality: 85 })
    .toBuffer();
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const url  = searchParams.get("url");
  const blur = Math.min(100,  Math.max(0.3, Number(searchParams.get("blur") || 8)));
  const w    = Math.min(2000, Math.max(1,   Number(searchParams.get("w")    || 800)));
  const h    = Math.min(2000, Math.max(1,   Number(searchParams.get("h")    || 600)));
  const ttl  = Math.min(90 * 24 * 60 * 60, Math.max(60, Number(searchParams.get("ttl") || DEFAULT_TTL_S)));

  if (!url) return new Response("Missing url param", { status: 400 });

  const validation = validateUrl(url);
  if (!validation.ok) return new Response(validation.msg, { status: 403 });
  const safeUrl = validation.url ?? new URL(url).toString();

  if (IS_DEV) {
    try {
      const buf = await runSharp(safeUrl, blur, w, h);
      return new Response(buf, { headers: { "Content-Type": "image/webp" } });
    } catch (err) {
      console.error("[blur] dev error:", err);
      return new Response("Internal error", { status: err.status ?? 500 });
    }
  }

  const filename = cacheFilename(safeUrl, blur, w, h);
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

  if (IN_FLIGHT.size >= MAX_IN_FLIGHT) {
    return new Response("Too many requests", { status: 429 });
  }

  const key = filename;
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
      console.error("[blur] dedup error:", err);
      return new Response("Internal error", { status: err.status ?? 500 });
    }
  }

  const promise = runSharp(safeUrl, blur, w, h);
  IN_FLIGHT.set(key, promise);
  try {
    const buf = await promise;
    await writeCacheAtomic(filePath, buf).catch((e) =>
      console.warn("[blur] cache write failed:", e.message)
    );
    return new Response(buf, {
      headers: {
        "Content-Type":  "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Cache":       "MISS",
      },
    });
  } catch (err) {
    console.error("[blur] processing error:", err);
    return new Response("Internal error", { status: err.status ?? 500 });
  } finally {
    IN_FLIGHT.delete(key);
  }
}