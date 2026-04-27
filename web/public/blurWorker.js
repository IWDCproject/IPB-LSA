// blurWorker.js
// Unified blur worker — processes all image types in a single batch.

const TTL = {
  hero:      30 * 24 * 60 * 60,
  eventcard:  7 * 24 * 60 * 60,
  newscard:   2 * 24 * 60 * 60,
  matchcard:  7 * 24 * 60 * 60,
};

const HERO_BOTTOM_LAYERS = [
  { blurPx: 2,  stops: [{ pos: 0, alpha: 1 }, { pos: 0.18, alpha: 1 }, { pos: 0.35, alpha: 0 }] },
  { blurPx: 8,  stops: [{ pos: 0, alpha: 1 }, { pos: 0.10, alpha: 1 }, { pos: 0.26, alpha: 0 }] },
  { blurPx: 18, stops: [{ pos: 0, alpha: 1 }, { pos: 0.06, alpha: 1 }, { pos: 0.18, alpha: 0 }] },
  { blurPx: 32, stops: [{ pos: 0, alpha: 1 }, { pos: 0.03, alpha: 1 }, { pos: 0.12, alpha: 0 }] },
];

const HERO_LEFT_LAYERS = [
  { blurPx: 2,  stops: [{ pos: 0, alpha: 1 }, { pos: 0.22, alpha: 1 }, { pos: 0.45, alpha: 0 }] },
  { blurPx: 8,  stops: [{ pos: 0, alpha: 1 }, { pos: 0.14, alpha: 1 }, { pos: 0.36, alpha: 0 }] },
  { blurPx: 12, stops: [{ pos: 0, alpha: 1 }, { pos: 0.08, alpha: 1 }, { pos: 0.28, alpha: 0 }] },
  { blurPx: 20, stops: [{ pos: 0, alpha: 1 }, { pos: 0.04, alpha: 1 }, { pos: 0.20, alpha: 0 }] },
];

const HERO_RIGHT_LAYERS = [
  { blurPx: 2, stops: [{ pos: 0, alpha: 1 }, { pos: 0.04, alpha: 1 }, { pos: 0.12, alpha: 0 }] },
];

const EVENTCARD_LAYERS = [
  { blurPx: 2,  stops: [{ pos: 0, alpha: 1 }, { pos: 0.20, alpha: 1 }, { pos: 0.55, alpha: 0 }] },
  { blurPx: 4,  stops: [{ pos: 0, alpha: 1 }, { pos: 0.12, alpha: 1 }, { pos: 0.42, alpha: 0 }] },
  { blurPx: 8,  stops: [{ pos: 0, alpha: 1 }, { pos: 0.08, alpha: 1 }, { pos: 0.30, alpha: 0 }] },
  { blurPx: 16, stops: [{ pos: 0, alpha: 1 }, { pos: 0.05, alpha: 1 }, { pos: 0.20, alpha: 0 }] },
];

const NEWSCARD_CONT_TOP = 0.45;
const NEWSCARD_CONT_H   = 0.55;
const remapNewscard     = (p) => NEWSCARD_CONT_TOP + p * NEWSCARD_CONT_H;

const NEWSCARD_LAYERS = [
  { blurPx: 1,  stops: [
    { pos: remapNewscard(0),    alpha: 0 },
    { pos: remapNewscard(0.15), alpha: 1 },
    { pos: remapNewscard(0.40), alpha: 1 },
    { pos: remapNewscard(0.58), alpha: 0 },
  ]},
  { blurPx: 3,  stops: [
    { pos: remapNewscard(0),    alpha: 0 },
    { pos: remapNewscard(0.25), alpha: 0 },
    { pos: remapNewscard(0.42), alpha: 1 },
    { pos: remapNewscard(0.62), alpha: 1 },
    { pos: remapNewscard(0.76), alpha: 0 },
  ]},
  { blurPx: 6,  stops: [
    { pos: remapNewscard(0),    alpha: 0 },
    { pos: remapNewscard(0.50), alpha: 0 },
    { pos: remapNewscard(0.64), alpha: 1 },
    { pos: remapNewscard(0.80), alpha: 1 },
    { pos: remapNewscard(0.90), alpha: 0 },
  ]},
  { blurPx: 10, stops: [
    { pos: remapNewscard(0),    alpha: 0 },
    { pos: remapNewscard(0.68), alpha: 0 },
    { pos: remapNewscard(0.82), alpha: 1 },
    { pos: remapNewscard(1.0),  alpha: 1 },
  ]},
];

function insideDims(naturalW, naturalH, maxW, maxH) {
  const scale = Math.min(maxW / naturalW, maxH / naturalH);
  return {
    canW: Math.round(naturalW * scale),
    canH: Math.round(naturalH * scale),
  };
}

async function fetchBlurred(imageUrl, blurPx, canW, canH, ttl) {
  const endpoint =
    `${self.location.origin}/api/blur` +
    `?url=${encodeURIComponent(imageUrl)}` +
    `&blur=${blurPx}` +
    `&w=${canW}` +
    `&h=${canH}` +
    `&ttl=${ttl}`;

  const res = await fetch(endpoint);
  if (!res.ok) throw new Error(`blur API ${res.status} for blurPx=${blurPx}`);

  const blob = await res.blob();
  return createImageBitmap(blob);
}

async function fetchBlurMap(url, layers, canW, canH, ttl) {
  const uniquePxs   = [...new Set(layers.map((l) => l.blurPx))];
  const blurBitmaps = await Promise.all(uniquePxs.map((px) => fetchBlurred(url, px, canW, canH, ttl)));
  return Object.fromEntries(uniquePxs.map((px, i) => [px, blurBitmaps[i]]));
}

function makeMask(W, H, stops, dir = "down") {
  const oc  = new OffscreenCanvas(W, H);
  const ctx = oc.getContext("2d");

  let grad;
  switch (dir) {
    case "up":    grad = ctx.createLinearGradient(0, H, 0, 0); break;
    case "right": grad = ctx.createLinearGradient(0, 0, W, 0); break;
    case "left":  grad = ctx.createLinearGradient(W, 0, 0, 0); break;
    default:      grad = ctx.createLinearGradient(0, 0, 0, H); break;
  }

  for (const { pos, alpha } of stops) {
    grad.addColorStop(pos, `rgba(0,0,0,${alpha})`);
  }

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  return oc;
}

// ---------------------------------------------------------------------------
// applyLayer
//
// Draws a single blurred+masked layer onto destCtx.
//
// PERF: accepts an optional `tmp` OffscreenCanvas to reuse across calls.
// When provided, the canvas is cleared and its compositing mode is reset
// at the top of each call so it is safe to share between layers.
// Callers that process many layers (eventcard=4, newscard=4, hero=9) save
// N-1 OffscreenCanvas allocations and the associated GC churn.
// ---------------------------------------------------------------------------
function applyLayer(destCtx, W, H, blurredBitmap, maskCanvas, tmp) {
  // Reuse the provided canvas if available, otherwise allocate a fresh one.
  const ownCanvas = !tmp;
  if (ownCanvas) tmp = new OffscreenCanvas(W, H);

  const tctx = tmp.getContext("2d");

  // Reset state before reuse — a reused canvas retains the previous call's
  // destination-in composite mode and its pixel content without this.
  tctx.globalCompositeOperation = "source-over";
  tctx.clearRect(0, 0, W, H);

  const bw = blurredBitmap.width;
  const bh = blurredBitmap.height;
  const s  = Math.max(W / bw, H / bh);
  tctx.drawImage(blurredBitmap, (W - bw * s) / 2, (H - bh * s) / 2, bw * s, bh * s);
  tctx.globalCompositeOperation = "destination-in";
  tctx.drawImage(maskCanvas, 0, 0);

  destCtx.globalCompositeOperation = "source-over";
  destCtx.drawImage(tmp, 0, 0);
}

// ---------------------------------------------------------------------------
// compositeLayers
//
// PERF: one shared tmp canvas for all N layers instead of N allocations.
// ---------------------------------------------------------------------------
async function compositeLayers(layers, blurMap, canW, canH, maskDir) {
  const result = new OffscreenCanvas(canW, canH);
  const rctx   = result.getContext("2d");
  const tmp    = new OffscreenCanvas(canW, canH); // shared across all layers

  for (const { blurPx, stops } of layers) {
    const mask = makeMask(canW, canH, stops, maskDir);
    applyLayer(rctx, canW, canH, blurMap[blurPx], mask, tmp);
  }

  Object.values(blurMap).forEach((b) => b.close());
  return createImageBitmap(result);
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

/**
 * Return the compositing canvas dimensions by reading back the ACTUAL pixel
 * dimensions of the first bitmap the blur API returned.
 *
 * Why: insideDims() uses naturalWidth/naturalHeight to preserve source AR, but
 * those fields can be null (not fetched from Directus) or 0. When they fall
 * back to the manifest's hard-coded W×H (e.g. 400×300 = 4:3), the canvas gets
 * the wrong AR while the CSS background still cover-fits the true natural-AR
 * image → different crop windows → visible misalignment.
 *
 * By reading the bitmap the API actually returned we get the AR the server
 * chose (which honours the image's natural proportions) without needing the
 * caller to supply accurate metadata.
 */
function canvasDimsFromBlurMap(blurMap) {
  const first = Object.values(blurMap)[0];
  return { canW: first.width, canH: first.height };
}

// ---------------------------------------------------------------------------
// PROCESSORS
// ---------------------------------------------------------------------------

async function processHero(img) {
  const { url, width: W, height: H } = img;
  const ttl = TTL.hero;

  // Use || so that 0 (impossible but defensive) also falls back
  const nw = img.naturalWidth  || W;
  const nh = img.naturalHeight || H;

  const allLayers      = [...HERO_BOTTOM_LAYERS, ...HERO_LEFT_LAYERS, ...HERO_RIGHT_LAYERS];
  const { canW, canH } = insideDims(nw, nh, W, H);

  // PERF: Route the sharp image through /api/blur (blur=0.3 = API minimum,
  // visually identical to unblurred) instead of fetching directly from Directus.
  // This gives the sharp image the same server-side disk cache as the blur
  // layers — cold loads hit Directus once per image per server restart, warm
  // loads serve from disk in microseconds.
  //
  // Both calls use identical canW/canH params so the API returns the same
  // pixel dimensions for both, eliminating the need for a browser-side resize
  // step (which previously added a full createImageBitmap decode + scale).
  const [sharpBitmap, blurMap] = await Promise.all([
    fetchBlurred(url, 0.3, canW, canH, ttl),
    fetchBlurMap(url, allLayers, canW, canH, ttl),
  ]);

  // Both sharpBitmap and blurMap were requested with the same w/h params so
  // they have identical dimensions — read realW/realH directly from the bitmap.
  // This also guards against wrong naturalWidth/naturalHeight (same as the
  // canvasDimsFromBlurMap approach used in other processors).
  const realW = sharpBitmap.width;
  const realH = sharpBitmap.height;

  const result = new OffscreenCanvas(realW, realH);
  const rctx   = result.getContext("2d");
  // PERF: one shared tmp canvas reused across all 9 hero applyLayer calls.
  const tmp    = new OffscreenCanvas(realW, realH);

  for (const { blurPx, stops } of HERO_BOTTOM_LAYERS) {
    applyLayer(rctx, realW, realH, blurMap[blurPx], makeMask(realW, realH, stops, "up"), tmp);
  }
  for (const { blurPx, stops } of HERO_LEFT_LAYERS) {
    applyLayer(rctx, realW, realH, blurMap[blurPx], makeMask(realW, realH, stops, "right"), tmp);
  }
  for (const { blurPx, stops } of HERO_RIGHT_LAYERS) {
    applyLayer(rctx, realW, realH, blurMap[blurPx], makeMask(realW, realH, stops, "left"), tmp);
  }

  Object.values(blurMap).forEach((b) => b.close());

  const blurred = await createImageBitmap(result);
  return { id: img.id, url, type: "hero", sharp: sharpBitmap, blurred };
}

async function processEventcard(img) {
  const { url, width: W, height: H } = img;
  const ttl = TTL.eventcard;

  const nw = img.naturalWidth  || W;
  const nh = img.naturalHeight || H;
  const { canW: reqW, canH: reqH } = insideDims(nw, nh, W, H);

  const blurMap = await fetchBlurMap(url, EVENTCARD_LAYERS, reqW, reqH, ttl);

  // FIX: use actual API-returned dimensions so the canvas AR matches the
  // source image — even when naturalWidth/naturalHeight were missing.
  const { canW, canH } = canvasDimsFromBlurMap(blurMap);

  const bitmap = await compositeLayers(EVENTCARD_LAYERS, blurMap, canW, canH, "up");
  return { id: img.id, url, type: "eventcard", bitmap };
}

async function processNewscard(img) {
  const { url, width: W, height: H } = img;
  const ttl = TTL.newscard;

  const nw = img.naturalWidth  || W;
  const nh = img.naturalHeight || H;
  const { canW: reqW, canH: reqH } = insideDims(nw, nh, W, H);

  const blurMap = await fetchBlurMap(url, NEWSCARD_LAYERS, reqW, reqH, ttl);

  // FIX: derive canvas dimensions from the actual blur-API response.
  //
  // The gradient stops (0 → 1) map to the canvas height, which must equal the
  // source image's natural AR for the blur overlay to cover-fit identically to
  // the CSS background image.  When naturalWidth/naturalHeight are null the
  // fallback above uses the manifest's hard-coded W×H (e.g. 400×300 = 4:3),
  // producing a wrong-AR canvas even though the source image might be 16:9.
  // Reading the first returned bitmap's real dimensions bypasses that problem,
  // because the blur API always scales to the image's true AR.
  const { canW, canH } = canvasDimsFromBlurMap(blurMap);

  const bitmap = await compositeLayers(NEWSCARD_LAYERS, blurMap, canW, canH, "down");
  return { id: img.id, url, type: "newscard", bitmap };
}

async function processMatchcard(img) {
  const { url, width: W, height: H } = img;
  const ttl = TTL.matchcard;

  const nw = img.naturalWidth  || W;
  const nh = img.naturalHeight || H;
  const { canW, canH } = insideDims(nw, nh, W, H);

  // fetchBlurred returns the bitmap at whatever AR the API chose — that's fine
  // here because matchcard has no gradient compositing; BitmapBlurLayer will
  // cover-fit it into the card just like the CSS background does.
  const bitmap = await fetchBlurred(url, 6, canW, canH, ttl);
  return { id: img.id, url, type: "matchcard", bitmap };
}

const PROCESSORS = {
  hero:      processHero,
  eventcard: processEventcard,
  newscard:  processNewscard,
  matchcard: processMatchcard,
};

self.onmessage = async ({ data: { images } }) => {
  await Promise.all(
    images.map(async (img) => {
      try {
        const fn = PROCESSORS[img.type];
        if (!fn) throw new Error(`Unknown type: ${img.type}`);
        const result    = await fn(img);
        const transfers = result.type === "hero"
          ? [result.sharp, result.blurred]
          : [result.bitmap];
        self.postMessage(result, transfers);
      } catch (err) {
        self.postMessage({ id: img.id, url: img.url, type: img.type, error: err.message });
      }
    })
  );
};