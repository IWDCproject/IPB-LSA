// Semua math bezier + draw canvas, dipisah biar komponen utama nggak overload.

// --- Types ---------------------------------------------

export interface BezierPoint {
  x: number; y: number;
  hix: number; hiy: number;
  hox: number; hoy: number;
}

export interface LutEntry { x: number; y: number; len: number; }

export interface PathCache {
  totalLen: number;
  segLens: number[];
  lut: LutEntry[];
}

// --- Konstanta ---------------------------------------------

export const YEL = "#FFC936";
export const WHT = "#ffffff";

// Control points sebagai fraksi [W, H]: [px, py, hix, hiy, hox, hoy]
export const CP_DEF = [
  [-0.06, 0.29,  -0.1,   0.0,   0.1,  0.18 ],
  [ 0.29, 0.098, -0.089,-0.123, 0.092, 0.158],
  [ 0.341,0.692, -0.08, -0.085, 0.115, 0.124],
  [ 0.67, 0.2,  -0.122, -0.126, 0.087, 0.087],
  [ 0.77, 0.64,  -0.054,-0.071, 0.114, 0.103],
  [ 1.06, 0.32,  -0.208,-0.01,  0.1,   0.0  ],
] as const;

// --- Helpers ---------------------------------------------

const bez = (p0: BezierPoint, p1: BezierPoint, t: number) => {
  const mt = 1 - t, mt2 = mt * mt, t2 = t * t;
  return {
    x: mt2*mt*p0.x + 3*mt2*t*(p0.x+p0.hox) + 3*mt*t2*(p1.x+p1.hix) + t2*t*p1.x,
    y: mt2*mt*p0.y + 3*mt2*t*(p0.y+p0.hoy) + 3*mt*t2*(p1.y+p1.hiy) + t2*t*p1.y,
  };
};

const strokePath = (ctx: CanvasRenderingContext2D, pts: BezierPoint[]) => {
  if (!pts.length) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    ctx.bezierCurveTo(a.x+a.hox, a.y+a.hoy, b.x+b.hix, b.y+b.hiy, b.x, b.y);
  }
  ctx.stroke();
};

// LUT supaya titik bisa diletakkan di jarak arc yang tepat, bukan jarak parametrik
export const buildCache = (pts: BezierPoint[]): PathCache => {
  const STEPS = 28, LUT = 48;
  const segLens = [0];
  const lut: LutEntry[] = [{ x: pts[0].x, y: pts[0].y, len: 0 }];

  for (let i = 0; i < pts.length - 1; i++) {
    let px = pts[i].x, py = pts[i].y, seg = 0;
    for (let s = 1; s <= STEPS; s++) {
      const p = bez(pts[i], pts[i + 1], s / STEPS);
      seg += Math.hypot(p.x - px, p.y - py); px = p.x; py = p.y;
    }
    segLens.push(segLens[i] + seg);

    px = pts[i].x; py = pts[i].y;
    let cum = segLens[i];
    for (let s = 1; s <= LUT; s++) {
      const p = bez(pts[i], pts[i + 1], s / LUT);
      cum += Math.hypot(p.x - px, p.y - py);
      lut.push({ x: p.x, y: p.y, len: cum }); px = p.x; py = p.y;
    }
  }

  return { totalLen: segLens.at(-1) || 1, segLens, lut };
};

export const pointAtLen = (lut: LutEntry[], d: number) => {
  let lo = 0, hi = lut.length - 1;
  while (lo < hi - 1) { const mid = (lo + hi) >> 1; if (lut[mid].len < d) lo = mid; else hi = mid; }
  const t = (lut[hi].len - lut[lo].len) ? (d - lut[lo].len) / (lut[hi].len - lut[lo].len) : 0;
  return { x: lut[lo].x + t * (lut[hi].x - lut[lo].x), y: lut[lo].y + t * (lut[hi].y - lut[lo].y) };
};

export const buildBasePoints = (W: number, H: number): BezierPoint[] =>
  CP_DEF.map(([px, py, hix, hiy, hox, hoy]) => ({
    x: px * W, y: py * H, hix: hix * W, hiy: hiy * H, hox: hox * W, hoy: hoy * H,
  }));

export const drawCanvas = (
  ctx: CanvasRenderingContext2D | null,
  pts: BezierPoint[],
  cache: PathCache,
  progress: number,
  activeIdx: number,
  W: number,
  H: number,
) => {
  if (!ctx || !pts.length || !W || !H) return;
  const totalLen = cache.totalLen || 1;
  const drawnLen = Math.max(0, Math.min(progress, 1)) * totalLen;

  ctx.clearRect(0, 0, W, H);
  ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.lineJoin = "round";

  ctx.strokeStyle = WHT;
  ctx.setLineDash(progress < 1 ? [drawnLen, totalLen] : []);
  strokePath(ctx, pts);

  if (activeIdx >= 0) {
    const activeLen = cache.segLens[activeIdx + 1] || 0;
    ctx.strokeStyle = YEL;
    ctx.setLineDash(progress < 1 ? [Math.min(drawnLen, activeLen), totalLen] : []);
    strokePath(ctx, pts.slice(0, activeIdx + 2));

    // Gradient handoff kuning ke putih di segmen setelah node aktif
    const gStart  = cache.segLens[activeIdx + 1] || 0;
    const gEnd    = cache.segLens[activeIdx + 2] || gStart;
    const visible = progress < 1
      ? Math.min(Math.max(0, drawnLen - gStart), gEnd - gStart)
      : gEnd - gStart;

    if (pts.length > activeIdx + 2 && visible > 0) {
      const gPts = pts.slice(activeIdx + 1, activeIdx + 3);
      const grad = ctx.createLinearGradient(gPts[0].x, gPts[0].y, gPts[1].x, gPts[1].y);
      grad.addColorStop(0, YEL); grad.addColorStop(1, WHT);
      ctx.strokeStyle = grad;
      ctx.setLineDash(progress < 1 ? [visible, totalLen] : []);
      strokePath(ctx, gPts);
    }
  }

  if (progress > 0 && progress < 1) {
    ctx.setLineDash([]);
    const pt = pointAtLen(cache.lut, drawnLen);
    ctx.fillStyle = YEL;
    ctx.beginPath(); ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,201,54,0.2)";
    ctx.beginPath(); ctx.arc(pt.x, pt.y, 12, 0, Math.PI * 2); ctx.fill();
  }

  ctx.setLineDash([]);
};