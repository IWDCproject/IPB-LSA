// app/api/blur/route.js
import sharp  from "sharp";
import crypto from "crypto";
import fs     from "fs/promises";
import path   from "path";

const IS_DEV         = process.env.NODE_ENV === "development";
const CACHE_DIR      = process.env.BLUR_CACHE_DIR ?? path.join(process.cwd(), ".blur-cache");
const DEFAULT_TTL_S  = 7 * 24 * 60 * 60;

const IN_FLIGHT = new Map();
if (!IS_DEV) {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

function extractAssetId(url) {
  const match = url.match(/\/assets\/([a-f0-9-]{36})/i);
  return match ? match[1] : "unknown";
}

function cacheFilename(url, blur, w, h) {
  const assetId = extractAssetId(url);
  const hash    = crypto.createHash("md5").update(`${url}|${blur}|${w}|${h}`).digest("hex");
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
    const [buf, stat] = await Promise.all([
      fs.readFile(filePath),
      fs.stat(filePath),
    ]);
    if (buf.length === 0) throw new Error("empty");
    const ageSeconds = (Date.now() - stat.mtimeMs) / 1000;
    if (ageSeconds > ttlSeconds) {
      await fs.unlink(filePath).catch(() => {});
      return null;
    }
    return buf;
  } catch {
    await fs.unlink(filePath).catch(() => {});
    return null;
  }
}

async function runSharp(url, blur, w, h) {
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (res.status === 404) throw Object.assign(new Error("Image not found"), { status: 404 });
  if (!res.ok) throw Object.assign(new Error(`Upstream error ${res.status}`), { status: 502 });

  return sharp(Buffer.from(await res.arrayBuffer()))
    .resize(w, h, { 
      fit: "inside", 
      withoutEnlargement: true,
      kernel: sharp.kernel.lanczos3 // FIX: Better downscaling kernel
    })
    .blur(blur)
    .webp({ quality: 85 }) // FIX: Higher quality for smoother gradients
    .toBuffer();
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  const blur = Math.min(100,  Math.max(0.3, Number(searchParams.get("blur") || 8)));
  const w    = Math.min(3000, Math.max(1,   Number(searchParams.get("w")    || 800)));
  const h    = Math.min(3000, Math.max(1,   Number(searchParams.get("h")    || 600)));
  const ttl  = Math.min(90 * 24 * 60 * 60, Math.max(60, Number(searchParams.get("ttl") || DEFAULT_TTL_S)));

  if (!url) return new Response("Missing url param", { status: 400 });

  const allowed = process.env.NEXT_PUBLIC_DIRECTUS_URL;
  if (allowed && !url.startsWith(allowed)) return new Response("Forbidden", { status: 403 });

  if (IS_DEV) {
    try {
      const buf = await runSharp(url, blur, w, h);
      return new Response(buf, { headers: { "Content-Type": "image/webp", "X-Cache": "DEV-BYPASS" } });
    } catch (err) {
      return new Response(err.message, { status: err.status ?? 500 });
    }
  }

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
      return new Response(err.message, { status: err.status ?? 500 });
    }
  }

  const promise = runSharp(url, blur, w, h);
  IN_FLIGHT.set(key, promise);
  try {
    const buf = await promise;
    writeCacheAtomic(filePath, buf);
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