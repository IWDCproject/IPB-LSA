// blurWorker.js
// worker terpadu — proses semua jenis gambar dalam satu batch
// blur computation di-offload ke /api/blur (Sharp, server-side)
// worker hanya handle: coverCrop + masking + compositing

const PAD_FACTOR = 3; // kept for reference, no longer used for blur

// ─── helpers ─────────────────────────────────────────────────────────────────

async function coverCrop(blob, W, H) {
  const img   = await createImageBitmap(blob);
  const imgAR = img.width / img.height;
  const conAR = W / H;

  let sx, sy, sw, sh;
  if (imgAR > conAR) {
    sh = img.height;
    sw = img.height * conAR;
    sx = (img.width - sw) / 2;
    sy = 0;
  } else {
    sw = img.width;
    sh = img.width / conAR;
    sx = 0;
    sy = (img.height - sh) / 2;
  }

  img.close();
  return createImageBitmap(blob, sx, sy, sw, sh, {
    resizeWidth:   W,
    resizeHeight:  H,
    resizeQuality: "medium",
  });
}

// Fetch a server-side blurred bitmap via /api/blur
// Sharp blurs at the server, result is cached immutably by CDN/browser
async function fetchBlurred(imageUrl, blurPx, W, H) {
  const endpoint =
    `${self.location.origin}/api/blur` +
    `?url=${encodeURIComponent(imageUrl)}` +
    `&blur=${blurPx}` +
    `&w=${W}` +
    `&h=${H}`;

  const res = await fetch(endpoint);
  if (!res.ok) throw new Error(`blur API ${res.status} for blurPx=${blurPx}`);
  const blob = await res.blob();
  // Server already applied cover-resize, so createImageBitmap directly
  return createImageBitmap(blob);
}

// stops: [{ pos: 0-1, alpha: 0-1 }, ...]
// dir: "down" top→bottom | "up" bottom→top | "right" left→right | "left" right→left
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

function applyLayer(destCtx, W, H, blurredBitmap, maskCanvas) {
  const tmp  = new OffscreenCanvas(W, H);
  const tctx = tmp.getContext("2d");
  tctx.drawImage(blurredBitmap, 0, 0, W, H);
  tctx.globalCompositeOperation = "destination-in";
  tctx.drawImage(maskCanvas, 0, 0);
  destCtx.globalCompositeOperation = "source-over";
  destCtx.drawImage(tmp, 0, 0);
}

// ─── processors ──────────────────────────────────────────────────────────────

async function processHero({ id, url, width: W, height: H }) {
  const BOTTOM_LAYERS = [
    { blurPx: 2,  stops: [{ pos: 0, alpha: 1 }, { pos: 0.18, alpha: 1 }, { pos: 0.35, alpha: 0 }] },
    { blurPx: 8,  stops: [{ pos: 0, alpha: 1 }, { pos: 0.10, alpha: 1 }, { pos: 0.26, alpha: 0 }] },
    { blurPx: 18, stops: [{ pos: 0, alpha: 1 }, { pos: 0.06, alpha: 1 }, { pos: 0.18, alpha: 0 }] },
    { blurPx: 32, stops: [{ pos: 0, alpha: 1 }, { pos: 0.03, alpha: 1 }, { pos: 0.12, alpha: 0 }] },
  ];

  const LEFT_LAYERS = [
    { blurPx: 2, stops: [{ pos: 0, alpha: 1 }, { pos: 0.08, alpha: 1 }, { pos: 0.18, alpha: 0 }] },
    { blurPx: 6, stops: [{ pos: 0, alpha: 1 }, { pos: 0.04, alpha: 1 }, { pos: 0.12, alpha: 0 }] },
  ];

  const RIGHT_LAYERS = [
    { blurPx: 2, stops: [{ pos: 0, alpha: 1 }, { pos: 0.04, alpha: 1 }, { pos: 0.12, alpha: 0 }] },
  ];

  // Collect unique blur levels across all directions
  const allLayers  = [...BOTTOM_LAYERS, ...LEFT_LAYERS, ...RIGHT_LAYERS];
  const uniquePxs  = [...new Set(allLayers.map((l) => l.blurPx))];

  // Fetch sharp + all blur levels in parallel
  const [sharpBlob, ...blurBitmaps] = await Promise.all([
    fetch(url).then((r) => r.blob()),
    ...uniquePxs.map((px) => fetchBlurred(url, px, W, H)),
  ]);

  const sharp = await coverCrop(sharpBlob, W, H);

  // Map blurPx → bitmap
  const blurMap = Object.fromEntries(uniquePxs.map((px, i) => [px, blurBitmaps[i]]));

  const result = new OffscreenCanvas(W, H);
  const rctx   = result.getContext("2d");

  for (const { blurPx, stops } of BOTTOM_LAYERS) {
    const mask = makeMask(W, H, stops, "up");
    applyLayer(rctx, W, H, blurMap[blurPx], mask);
  }

  for (const { blurPx, stops } of LEFT_LAYERS) {
    const mask = makeMask(W, H, stops, "right");
    applyLayer(rctx, W, H, blurMap[blurPx], mask);
  }

  for (const { blurPx, stops } of RIGHT_LAYERS) {
    const mask = makeMask(W, H, stops, "left");
    applyLayer(rctx, W, H, blurMap[blurPx], mask);
  }

  // Cleanup intermediate bitmaps
  Object.values(blurMap).forEach((b) => b.close());

  const blurred = await createImageBitmap(result);
  return { id, url, type: "hero", sharp, blurred };
}

async function processEventcard({ id, url, width: W, height: H }) {
  const LAYERS = [
    { blurPx: 2,  stops: [{ pos: 0, alpha: 1 }, { pos: 0.20, alpha: 1 }, { pos: 0.55, alpha: 0 }] },
    { blurPx: 4,  stops: [{ pos: 0, alpha: 1 }, { pos: 0.12, alpha: 1 }, { pos: 0.42, alpha: 0 }] },
    { blurPx: 8,  stops: [{ pos: 0, alpha: 1 }, { pos: 0.08, alpha: 1 }, { pos: 0.30, alpha: 0 }] },
    { blurPx: 16, stops: [{ pos: 0, alpha: 1 }, { pos: 0.05, alpha: 1 }, { pos: 0.20, alpha: 0 }] },
  ];

  const uniquePxs   = [...new Set(LAYERS.map((l) => l.blurPx))];
  const blurBitmaps = await Promise.all(uniquePxs.map((px) => fetchBlurred(url, px, W, H)));
  const blurMap     = Object.fromEntries(uniquePxs.map((px, i) => [px, blurBitmaps[i]]));

  const result = new OffscreenCanvas(W, H);
  const rctx   = result.getContext("2d");

  for (const { blurPx, stops } of LAYERS) {
    const mask = makeMask(W, H, stops, "up");
    applyLayer(rctx, W, H, blurMap[blurPx], mask);
  }

  Object.values(blurMap).forEach((b) => b.close());

  const bitmap = await createImageBitmap(result);
  return { id, url, type: "eventcard", bitmap };
}

async function processNewscard({ id, url, width: W, height: H }) {
  // Fetch original to get natural AR — ensures BitmapBlurLayer cover-fit
  // produces the same crop as CSS background-size: cover on the same image.
  // (Browser cache means this is usually free since the img is already on-page.)
  const origBlob = await fetch(url).then(r => r.blob());
  const origBmp  = await createImageBitmap(origBlob);
  const canW     = W;
  const canH     = Math.round(W * origBmp.height / origBmp.width);
  origBmp.close();

  const CONT_TOP = 0.45;
  const CONT_H   = 0.55;
  const remap = (p) => CONT_TOP + p * CONT_H;

  const LAYERS = [
    { blurPx: 1,  stops: [
      { pos: remap(0),    alpha: 0 },
      { pos: remap(0.15), alpha: 1 },
      { pos: remap(0.40), alpha: 1 },
      { pos: remap(0.58), alpha: 0 },
    ]},
    { blurPx: 3,  stops: [
      { pos: remap(0),    alpha: 0 },
      { pos: remap(0.25), alpha: 0 },
      { pos: remap(0.42), alpha: 1 },
      { pos: remap(0.62), alpha: 1 },
      { pos: remap(0.76), alpha: 0 },
    ]},
    { blurPx: 6,  stops: [
      { pos: remap(0),    alpha: 0 },
      { pos: remap(0.50), alpha: 0 },
      { pos: remap(0.64), alpha: 1 },
      { pos: remap(0.80), alpha: 1 },
      { pos: remap(0.90), alpha: 0 },
    ]},
    { blurPx: 10, stops: [
      { pos: remap(0),    alpha: 0 },
      { pos: remap(0.68), alpha: 0 },
      { pos: remap(0.82), alpha: 1 },
      { pos: remap(1.0),  alpha: 1 },
    ]},
  ];

  const uniquePxs   = [...new Set(LAYERS.map(l => l.blurPx))];
  // Fetch blur at canW × canH — same AR as original, fit:cover is a pure resize now
  const blurBitmaps = await Promise.all(uniquePxs.map(px => fetchBlurred(url, px, canW, canH)));
  const blurMap     = Object.fromEntries(uniquePxs.map((px, i) => [px, blurBitmaps[i]]));

  const result = new OffscreenCanvas(canW, canH);
  const rctx   = result.getContext("2d");

  for (const { blurPx, stops } of LAYERS) {
    const mask = makeMask(canW, canH, stops, "down");
    applyLayer(rctx, canW, canH, blurMap[blurPx], mask);
  }

  Object.values(blurMap).forEach(b => b.close());
  const bitmap = await createImageBitmap(result);
  return { id, url, type: "newscard", bitmap };
}

async function processMatchcard({ id, url, width: W, height: H }) {
  const bitmap = await fetchBlurred(url, 6, W, H);
  return { id, url, type: "matchcard", bitmap };
}

// ─── dispatch ────────────────────────────────────────────────────────────────

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