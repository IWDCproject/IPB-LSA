// web/app/api/blur-invalidate/route.js
//
// Webhook endpoint called by Directus when a file is updated or deleted.
// Deletes all .blur-cache files for the given asset ID immediately,
// so the next request regenerates fresh blurs without waiting for TTL.
//
// SETUP - Directus Flow
// -------------------------------------------------------------------------
// 1. In Directus → Flows → Create Flow
// 2. Trigger:    Event Hook → directus_files.items.update (and .delete)
// 3. Operation:  Webhook → POST → {YOUR_SITE}/api/blur-invalidate
//    Headers:    x-invalidate-secret: {your BLUR_INVALIDATE_SECRET value}
//    Body:       { "id": "{{$trigger.keys[0]}}" }
//
// ENV
// -------------------------------------------------------------------------
// BLUR_INVALIDATE_SECRET=some-long-random-string
// Add this to .env.local and your VPS environment.
//

import fs   from "fs/promises";
import path from "path";

const CACHE_DIR = process.env.BLUR_CACHE_DIR ?? path.join(process.cwd(), ".blur-cache");
const SECRET    = process.env.BLUR_INVALIDATE_SECRET;

export async function POST(req) {
  // -- Auth ---------------------------------------------------------------
  if (!SECRET) {
    console.error("[blur-invalidate] BLUR_INVALIDATE_SECRET is not set");
    return new Response("Server misconfiguration", { status: 500 });
  }

  const incoming = req.headers.get("x-invalidate-secret");
  if (incoming !== SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  // -- Parse body ---------------------------------------------------------
  let id;
  try {
    const body = await req.json();
    id = body?.id;
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  if (!id || typeof id !== "string") {
    return new Response("Missing or invalid `id` field", { status: 400 });
  }

  // -- Delete matching cache files ----------------------------------------
  // Filenames are: {assetId}_{md5}.webp
  // So we just find all files whose name starts with the asset ID.
  let deleted = 0;
  try {
    const files = await fs.readdir(CACHE_DIR);
    const prefix = `${id}_`;

    await Promise.all(
      files
        .filter((f) => f.startsWith(prefix) && f.endsWith(".webp"))
        .map(async (f) => {
          await fs.unlink(path.join(CACHE_DIR, f)).catch(() => {});
          deleted++;
        })
    );
  } catch (err) {
    console.error("[blur-invalidate] readdir failed:", err.message);
    return new Response("Cache directory error", { status: 500 });
  }

  console.log(`[blur-invalidate] asset ${id} → deleted ${deleted} cache file(s)`);
  return new Response(JSON.stringify({ ok: true, deleted }), {
    headers: { "Content-Type": "application/json" },
  });
}