// blurWorker.js
// Unified blur worker — processes all image types in a single batch.
// Blur computation is offloaded to /api/blur (Sharp, server-side).
// Worker handles: natural-AR sizing, masking, and compositing.


// =============================================================================
// Constants
// =============================================================================

const HERO_BOTTOM_LAYERS = [
  { blurPx: 2,  stops: [{ pos: 0, alpha: 1 }, { pos: 0.18, alpha: 1 }, { pos: 0.35, alpha: 0 }] },
  { blurPx: 8,  stops: [{ pos: 0, alpha: 1 }, { pos: 0.10, alpha: 1 }, { pos: 0.26, alpha: 0 }] },
  { blurPx: 18, stops: [{ pos: 0, alpha: 1 }, { pos: 0.06, alpha: 1 }, { pos: 0.18, alpha: 0 }] },
  { blurPx: 32, stops: [{ pos: 0, alpha: 1 }, { pos: 0.03, alpha: 1 }, { pos: 0.12, alpha: 0 }] },
];

const HERO_LEFT_LAYERS = [
  { blurPx: 2, stops: [{ pos: 0, alpha: 1 }, { pos: 0.08, alpha: 1 }, { pos: 0.18, alpha: 0 }] },
  { blurPx: 6, stops: [{ pos: 0, alpha: 1 }, { pos: 0.04, alpha: 1 }, { pos: 0.12, alpha: 0 }] },
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

// Gradient positions are relative to the bottom container (bottom 55% of card).
// remap() converts them to full-card coordinates so the mask aligns with the
// CSS background-size: cover crop, which always operates on the full card height.
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


// =============================================================================
// Sizing helpers
// =============================================================================

// Fetches the original image and returns its natural pixel dimensions.
// Uses the browser cache, so if the image is already on-page this is effectively free.
async function getNaturalSize(url) {
  const blob = await fetch(url).then((r) => r.blob());
  const bmp  = await createImageBitmap(blob);
  const size = { w: bmp.width, h: bmp.height };
  bmp.close();
  return size;
}

// Scales natural dimensions to fit within the manifest W x H box,
// preserving the original aspect ratio (equivalent to sharp's fit: "inside").
//
// Using the original AR for the OffscreenCanvas ensures that BitmapBlurLayer's
// cover-fit and CSS background-size: cover both start from the same source AR,
// producing identical crops and eliminating subject-position misalignment.
function insideDims(naturalW, naturalH, maxW, maxH) {
  const scale = Math.min(maxW / naturalW, maxH / naturalH);
  return {
    canW: Math.round(naturalW * scale),
    canH: Math.round(naturalH * scale),
  };
}


// =============================================================================
// Fetch helpers
// =============================================================================

// Requests a server-side blurred bitmap via /api/blur.
// Sharp blurs at canW x canH; result is immutably cached by the CDN/browser.
async function fetchBlurred(imageUrl, blurPx, canW, canH) {
  const endpoint =
    `${self.location.origin}/api/blur` +
    `?url=${encodeURIComponent(imageUrl)}` +
    `&blur=${blurPx}` +
    `&w=${canW}` +
    `&h=${canH}`;

  const res = await fetch(endpoint);
  if (!res.ok) throw new Error(`blur API ${res.status} for blurPx=${blurPx}`);

  const blob = await res.blob();
  return createImageBitmap(blob);
}

// Fetches all unique blur levels in parallel and returns a blurPx -> bitmap map.
async function fetchBlurMap(url, layers, canW, canH) {
  const uniquePxs   = [...new Set(layers.map((l) => l.blurPx))];
  const blurBitmaps = await Promise.all(uniquePxs.map((px) => fetchBlurred(url, px, canW, canH)));
  return Object.fromEntries(uniquePxs.map((px, i) => [px, blurBitmaps[i]]));
}


// =============================================================================
// Compositing helpers
// =============================================================================

// Creates a gradient mask canvas used to control where a blur layer is visible.
// dir: "down" top->bottom | "up" bottom->top | "right" left->right | "left" right->left
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

// Composites a masked blur layer onto the destination context.
function applyLayer(destCtx, W, H, blurredBitmap, maskCanvas) {
  const tmp  = new OffscreenCanvas(W, H);
  const tctx = tmp.getContext("2d");

  tctx.drawImage(blurredBitmap, 0, 0, W, H);
  tctx.globalCompositeOperation = "destination-in";
  tctx.drawImage(maskCanvas, 0, 0);

  destCtx.globalCompositeOperation = "source-over";
  destCtx.drawImage(tmp, 0, 0);
}

// Composites a list of layers onto a new OffscreenCanvas and returns the bitmap.
// Cleans up all intermediate blur bitmaps after compositing.
async function compositeLayers(layers, blurMap, canW, canH, maskDir) {
  const result = new OffscreenCanvas(canW, canH);
  const rctx   = result.getContext("2d");

  for (const { blurPx, stops } of layers) {
    const mask = makeMask(canW, canH, stops, maskDir);
    applyLayer(rctx, canW, canH, blurMap[blurPx], mask);
  }

  Object.values(blurMap).forEach((b) => b.close());

  return createImageBitmap(result);
}


// =============================================================================
// Processors
// =============================================================================

async function processHero({ id, url, width: W, height: H }) {
  const allLayers = [...HERO_BOTTOM_LAYERS, ...HERO_LEFT_LAYERS, ...HERO_RIGHT_LAYERS];

  const { w: nw, h: nh } = await getNaturalSize(url);
  const { canW, canH }   = insideDims(nw, nh, W, H);

  const [sharpBlob, blurMap] = await Promise.all([
    fetch(url).then((r) => r.blob()),
    fetchBlurMap(url, allLayers, canW, canH),
  ]);

  const sharp = await createImageBitmap(sharpBlob, {
    resizeWidth:   canW,
    resizeHeight:  canH,
    resizeQuality: "medium",
  });

  const result = new OffscreenCanvas(canW, canH);
  const rctx   = result.getContext("2d");

  for (const { blurPx, stops } of HERO_BOTTOM_LAYERS) {
    applyLayer(rctx, canW, canH, blurMap[blurPx], makeMask(canW, canH, stops, "up"));
  }
  for (const { blurPx, stops } of HERO_LEFT_LAYERS) {
    applyLayer(rctx, canW, canH, blurMap[blurPx], makeMask(canW, canH, stops, "right"));
  }
  for (const { blurPx, stops } of HERO_RIGHT_LAYERS) {
    applyLayer(rctx, canW, canH, blurMap[blurPx], makeMask(canW, canH, stops, "left"));
  }

  Object.values(blurMap).forEach((b) => b.close());

  const blurred = await createImageBitmap(result);
  return { id, url, type: "hero", sharp, blurred };
}

async function processEventcard({ id, url, width: W, height: H }) {
  const { w: nw, h: nh } = await getNaturalSize(url);
  const { canW, canH }   = insideDims(nw, nh, W, H);

  const blurMap = await fetchBlurMap(url, EVENTCARD_LAYERS, canW, canH);
  const bitmap  = await compositeLayers(EVENTCARD_LAYERS, blurMap, canW, canH, "up");

  return { id, url, type: "eventcard", bitmap };
}

async function processNewscard({ id, url, width: W, height: H }) {
  const { w: nw, h: nh } = await getNaturalSize(url);
  const { canW, canH }   = insideDims(nw, nh, W, H);

  const blurMap = await fetchBlurMap(url, NEWSCARD_LAYERS, canW, canH);
  const bitmap  = await compositeLayers(NEWSCARD_LAYERS, blurMap, canW, canH, "down");

  return { id, url, type: "newscard", bitmap };
}

async function processMatchcard({ id, url, width: W, height: H }) {
  const { w: nw, h: nh } = await getNaturalSize(url);
  const { canW, canH }   = insideDims(nw, nh, W, H);

  const bitmap = await fetchBlurred(url, 6, canW, canH);
  return { id, url, type: "matchcard", bitmap };
}


// =============================================================================
// Dispatch
// =============================================================================

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