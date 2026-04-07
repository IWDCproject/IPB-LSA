// blurWorker.js
// worker terpadu — proses semua jenis gambar dalam satu batch
// hasilnya dikirim satu-satu lewat postMessage biar main thread bisa update progress

const PAD_FACTOR = 3;

// ─── helpers ─────────────────────────────────────────────────────────────────

async function coverCrop(blob, W, H) {
  const img   = await createImageBitmap(blob);
  const imgAR = img.width / img.height;
  const conAR = W / H;

  let sx, sy, sw, sh;
  if (imgAR > conAR) {
    // image lebih lebar — crop kiri-kanan
    sh = img.height;
    sw = img.height * conAR;
    sx = (img.width - sw) / 2;
    sy = 0;
  } else {
    // image lebih tinggi — crop atas-bawah
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

async function blurBitmap(source, blurPx, W, H, srcX = 0, srcY = 0, srcW = W, srcH = H) {
  const pad = Math.ceil(blurPx * PAD_FACTOR);
  const pw  = W + pad * 2;
  const ph  = H + pad * 2;

  const expanded = new OffscreenCanvas(pw, ph);
  const ectx     = expanded.getContext("2d");
  ectx.filter    = `blur(${blurPx}px)`;
  ectx.drawImage(source, srcX, srcY, srcW, srcH, pad, pad, W, H);

  const cropped = new OffscreenCanvas(W, H);
  const cctx    = cropped.getContext("2d");
  cctx.drawImage(expanded, pad, pad, W, H, 0, 0, W, H);
  return cropped;
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

function applyLayer(destCtx, W, H, blurredCanvas, maskCanvas) {
  const tmp  = new OffscreenCanvas(W, H);
  const tctx = tmp.getContext("2d");
  tctx.drawImage(blurredCanvas, 0, 0);
  tctx.globalCompositeOperation = "destination-in";
  tctx.drawImage(maskCanvas, 0, 0);
  destCtx.globalCompositeOperation = "source-over";
  destCtx.drawImage(tmp, 0, 0);
}

// ─── processors ──────────────────────────────────────────────────────────────

async function processHero({ id, url, width: W, height: H }) {
  const res    = await fetch(url);
  const blob   = await res.blob();
  const sharp  = await coverCrop(blob, W, H);
  const source = await coverCrop(blob, W, H);

  // BOTTOM_LAYERS — pull the fade stops down so blur doesn't climb so high
  const BOTTOM_LAYERS = [
      { blurPx: 2,  stops: [{ pos: 0, alpha: 1 }, { pos: 0.18, alpha: 1 }, { pos: 0.35, alpha: 0 }] },
      { blurPx: 8,  stops: [{ pos: 0, alpha: 1 }, { pos: 0.10, alpha: 1 }, { pos: 0.26, alpha: 0 }] },
      { blurPx: 18, stops: [{ pos: 0, alpha: 1 }, { pos: 0.06, alpha: 1 }, { pos: 0.18, alpha: 0 }] },
      { blurPx: 32, stops: [{ pos: 0, alpha: 1 }, { pos: 0.03, alpha: 1 }, { pos: 0.12, alpha: 0 }] },
  ];

  const LEFT_LAYERS = [
      { blurPx: 2,  stops: [{ pos: 0, alpha: 1 }, { pos: 0.08, alpha: 1 }, { pos: 0.18, alpha: 0 }] },
      { blurPx: 6,  stops: [{ pos: 0, alpha: 1 }, { pos: 0.04, alpha: 1 }, { pos: 0.12, alpha: 0 }] },
  ];

  const RIGHT_LAYERS = [
      { blurPx: 2,  stops: [{ pos: 0, alpha: 1 }, { pos: 0.04, alpha: 1 }, { pos: 0.12, alpha: 0 }] },
  ];

  const result = new OffscreenCanvas(W, H);
  const rctx   = result.getContext("2d");

  for (const { blurPx, stops } of BOTTOM_LAYERS) {
    const blurred = await blurBitmap(source, blurPx, W, H);
    const mask    = makeMask(W, H, stops, "up");
    applyLayer(rctx, W, H, blurred, mask);
  }

  for (const { blurPx, stops } of LEFT_LAYERS) {
    const blurred = await blurBitmap(source, blurPx, W, H);
    const mask    = makeMask(W, H, stops, "right");
    applyLayer(rctx, W, H, blurred, mask);
  }

  for (const { blurPx, stops } of RIGHT_LAYERS) {
    const blurred = await blurBitmap(source, blurPx, W, H);
    const mask    = makeMask(W, H, stops, "left");
    applyLayer(rctx, W, H, blurred, mask);
  }

  const blurred = await createImageBitmap(result);
  source.close();
  return { id, url, type: "hero", sharp, blurred };
}

async function processEventcard({ id, url, width: W, height: H }) {
  const res    = await fetch(url);
  const blob   = await res.blob();
  const source = await coverCrop(blob, W, H);

  const LAYERS = [
    { blurPx: 2,  stops: [{ pos: 0, alpha: 1 }, { pos: 0.20, alpha: 1 }, { pos: 0.55, alpha: 0 }] },
    { blurPx: 4,  stops: [{ pos: 0, alpha: 1 }, { pos: 0.12, alpha: 1 }, { pos: 0.42, alpha: 0 }] },
    { blurPx: 8,  stops: [{ pos: 0, alpha: 1 }, { pos: 0.08, alpha: 1 }, { pos: 0.30, alpha: 0 }] },
    { blurPx: 16, stops: [{ pos: 0, alpha: 1 }, { pos: 0.05, alpha: 1 }, { pos: 0.20, alpha: 0 }] },
  ];

  const result = new OffscreenCanvas(W, H);
  const rctx   = result.getContext("2d");

  for (const { blurPx, stops } of LAYERS) {
    const blurred = await blurBitmap(source, blurPx, W, H);
    const mask    = makeMask(W, H, stops, "up");
    applyLayer(rctx, W, H, blurred, mask);
  }

  const bitmap = await createImageBitmap(result);
  source.close();
  return { id, url, type: "eventcard", bitmap };
}

async function processNewscard({ id, url, width: W, height: H }) {
  const res    = await fetch(url);
  const blob   = await res.blob();
  const source = await coverCrop(blob, W, H);

  const CONT_TOP = 0.45;
  const CONT_H   = 0.55;
  const outH     = Math.round(H * CONT_H);
  const srcY     = Math.round(H * CONT_TOP);
  const srcH     = H - srcY;

  const LAYERS = [
    { blurPx: 1,  stops: [{ pos: 0, alpha: 0 }, { pos: 0.15, alpha: 1 }, { pos: 0.40, alpha: 1 }, { pos: 0.58, alpha: 0 }] },
    { blurPx: 3,  stops: [{ pos: 0, alpha: 0 }, { pos: 0.25, alpha: 0 }, { pos: 0.42, alpha: 1 }, { pos: 0.62, alpha: 1 }, { pos: 0.76, alpha: 0 }] },
    { blurPx: 6,  stops: [{ pos: 0, alpha: 0 }, { pos: 0.50, alpha: 0 }, { pos: 0.64, alpha: 1 }, { pos: 0.80, alpha: 1 }, { pos: 0.90, alpha: 0 }] },
    { blurPx: 10, stops: [{ pos: 0, alpha: 0 }, { pos: 0.68, alpha: 0 }, { pos: 0.82, alpha: 1 }, { pos: 1.0,  alpha: 1 }] },
  ];

  const result = new OffscreenCanvas(W, outH);
  const rctx   = result.getContext("2d");

  for (const { blurPx, stops } of LAYERS) {
    const blurred = await blurBitmap(source, blurPx, W, outH, 0, srcY, W, srcH);
    const mask    = makeMask(W, outH, stops, "down");
    applyLayer(rctx, W, outH, blurred, mask);
  }

  const bitmap = await createImageBitmap(result);
  source.close();
  return { id, url, type: "newscard", bitmap };
}

async function processMatchcard({ id, url, width: W, height: H }) {
  const res    = await fetch(url);
  const blob   = await res.blob();
  const source = await coverCrop(blob, W, H);

  const blurCanvas = await blurBitmap(source, 6, W, H);
  const bitmap     = await createImageBitmap(blurCanvas);
  source.close();
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