'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import Button from '@/components/Button';
import EventCard from '@/components/EventCard';

// Warna utama untuk jalur kurva dan background section
const THEME = {
  path: {
    base: '#ffffff',
    active: '#FFC936',
    gradFrom: '#FFC936',
    gradTo: '#ffffff',
  },
  bg: {
    container: 'linear-gradient(to top, #06125C 5%, #0D26C2 100%)',
  },
};

// Control points untuk kurva bezier. Urutan: [phantom-kiri, slot-0..3, phantom-kanan]
// phantom kiri/kanan itu titik fiktif supaya kurva masuk/keluar layar dengan mulus
// pctX/pctY = posisi relatif terhadap lebar/tinggi container
// hIn/hOut = handle bezier masuk dan keluar (juga relatif)
const CP = [
  { pctX: -0.060, pctY: 0.350, hIn: { dx: -0.100, dy:  0.000 }, hOut: { dx:  0.100, dy:  0.180 } },
  { pctX:  0.290, pctY: 0.158, hIn: { dx: -0.089, dy: -0.123 }, hOut: { dx:  0.092, dy:  0.158 } },
  { pctX:  0.341, pctY: 0.752, hIn: { dx: -0.080, dy: -0.085 }, hOut: { dx:  0.115, dy:  0.124 } },
  { pctX:  0.670, pctY: 0.304, hIn: { dx: -0.122, dy: -0.126 }, hOut: { dx:  0.087, dy:  0.087 } },
  { pctX:  0.770, pctY: 0.714, hIn: { dx: -0.054, dy: -0.071 }, hOut: { dx:  0.114, dy:  0.103 } },
  { pctX:  1.060, pctY: 0.380, hIn: { dx: -0.208, dy: -0.010 }, hOut: { dx:  0.100, dy:  0.000 } },
];

// Konfigurasi tiap slot event: posisi kartu, label, animasi float, dan warna
// cardOffset = jarak kartu dari titik dot (piksel)
// labelOffset = jarak label tanggal dari titik dot
// floatY/floatX/floatDur/floatDelay = parameter animasi melayang (gsap)
const SLOTS = [
  {
    cardOffset: { x: -255, y: -10  },
    labelOffset: { x: 22,  y: -45  },
    tilt: 9,
    dotSize: 25,
    floatY: 20,  floatX:  12, floatDur: 5,   floatDelay: 0,
    palette: {
      border: '#FFC936', shadow: 'rgba(240,165,0,0.4)',
      dotColor: '#FFC936', dotGlow: '#FFC936',
      labelColor: '#FFC936', labelGlow: 'rgba(240,165,0,0.6)',
    },
  },
  {
    cardOffset: { x: 0,    y: -330 },
    labelOffset: { x: -80, y:  22  },
    tilt: -7,
    dotSize: 20,
    floatY: 25,  floatX: -16, floatDur: 4,   floatDelay: 0.8,
    palette: {
      border: '#fff', shadow: null,
      dotColor: '#fff', dotGlow: 'rgba(255,255,255,0.4)',
      labelColor: '#fff', labelGlow: 'rgba(255,255,255,0.3)',
    },
  },
  {
    cardOffset: { x: -240, y:  0   },
    labelOffset: { x: 22,  y: -46  },
    tilt: 5,
    dotSize: 20,
    floatY: 17,  floatX:  18, floatDur: 6,   floatDelay: 1.4,
    palette: {
      border: '#fff', shadow: null,
      dotColor: '#fff', dotGlow: 'rgba(255,255,255,0.4)',
      labelColor: '#fff', labelGlow: 'rgba(255,255,255,0.3)',
    },
  },
  {
    cardOffset: { x: 0,    y: -335 },
    labelOffset: { x: -80, y:  20  },
    tilt: -9,
    dotSize: 20,
    floatY: 13,  floatX: -12, floatDur: 3.5, floatDelay: 0.3,
    palette: {
      border: '#fff', shadow: null,
      dotColor: '#fff', dotGlow: 'rgba(255,255,255,0.4)',
      labelColor: '#fff', labelGlow: 'rgba(255,255,255,0.3)',
    },
  },
];

// Data event dummy. Ganti dengan fetch dari API kalau sudah ada data real.
const MOCK_EVENTS = [
  {
    id: 'evt-001',
    name: 'Open Charity Golf Tournament',
    slug: 'golf-tournament-2026',
    status: 'active',
    start_date: '2026-03-01',
    card_image_url: 'https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=300&q=80',
    user_created: { organisation_name: 'IPB Golf Community' },
    registration_closes: '15 of March',
  },
  {
    id: 'evt-002',
    name: 'FORKI X IPB CUP 2026',
    slug: 'forki-ipb-cup-2026',
    status: 'upcoming',
    start_date: '2026-02-28',
    card_image_url: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=300&q=80',
    user_created: { organisation_name: 'UKM Karate IPB' },
    registration_closes: '30 of March',
  },
  {
    id: 'evt-003',
    name: 'IT-TODAY HACKTODAY',
    slug: 'it-today-hacktoday-2026',
    status: 'upcoming',
    start_date: '2026-03-20',
    card_image_url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=300&q=80',
    user_created: { organisation_name: 'Himalkom' },
    registration_closes: '1 of April',
  },
  {
    id: 'evt-004',
    name: 'GEMASTIK 2026',
    slug: 'gemastik-2026',
    status: 'upcoming',
    start_date: '2026-04-10',
    card_image_url: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=300&q=80',
    user_created: { organisation_name: 'BEM KM IPB' },
    registration_closes: '31 of April',
  },
];

// Tambahkan field turunan ke tiap event: slot, label tanggal, dan sublabel registrasi
function buildEvents() {
  return MOCK_EVENTS.map((ev, i) => {
    const label =
      ev.status === 'active' ? 'ONGOING'
      : !ev.start_date      ? 'TBA'
      : new Date(ev.start_date)
          .toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
          .toUpperCase();

    return {
      ...ev,
      slot: SLOTS[i],
      label,
      isActive: ev.status === 'active',
      subLabel: `Regist Until\n${ev.registration_closes}`,
    };
  });
}

// Konversi array control points ke string path SVG (format cubic bezier)
// Dipakai sekali di playIntro untuk ngukur panjang jalur via getTotalLength()
function svgPath(pts) {
  if (!pts || pts.length < 2) return '';

  const d = [`M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    d.push(
      `C ${(a.x + a.hOut.dx).toFixed(1)} ${(a.y + a.hOut.dy).toFixed(1)}, ` +
      `${(b.x + b.hIn.dx).toFixed(1)} ${(b.y + b.hIn.dy).toFixed(1)}, ` +
      `${b.x.toFixed(1)} ${b.y.toFixed(1)}`
    );
  }
  return d.join(' ');
}

// Hitung panjang sub-kurva sampai index titik tertentu
// Dipakai untuk tau kapan setiap dot harus muncul saat animasi intro
function subLen(pts, endIdx) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  el.setAttribute('d', svgPath(pts.slice(0, endIdx + 1)));
  return el.getTotalLength();
}

// Gambar semua segmen kurva ke canvas. Ini hot path, jadi hindari alokasi di sini.
function strokePath(ctx, pts) {
  if (!pts || pts.length < 2) return;

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    ctx.bezierCurveTo(
      a.x + a.hOut.dx, a.y + a.hOut.dy,
      b.x + b.hIn.dx,  b.y + b.hIn.dy,
      b.x, b.y,
    );
  }
  ctx.stroke();
}

// Evaluasi posisi di segmen bezier ke-si pada parameter t (0..1)
function evalCubic(pts, si, t) {
  const p0 = pts[si];
  const p1 = pts[si + 1];
  const c0x = p0.x + p0.hOut.dx, c0y = p0.y + p0.hOut.dy;
  const c1x = p1.x + p1.hIn.dx,  c1y = p1.y + p1.hIn.dy;
  const mt = 1 - t, mt2 = mt * mt, t2 = t * t;
  return {
    x: mt2 * mt * p0.x + 3 * mt2 * t * c0x + 3 * mt * t2 * c1x + t2 * t * p1.x,
    y: mt2 * mt * p0.y + 3 * mt2 * t * c0y + 3 * mt * t2 * c1y + t2 * t * p1.y,
  };
}

// Bangun lookup table arc-length supaya bisa cari posisi di kurva tanpa DOM.
// Jauh lebih cepat dari getPointAtLength() karena zero DOM dan O(log n) lookup.
// steps = jumlah sampel; makin besar makin akurat tapi makin lambat build-nya.
function buildArcLUT(pts, steps = 400) {
  const segCount = pts.length - 1;
  // Setiap entri simpan: [cumLen, x, y] -> stride 3
  const data = new Float32Array((steps + 1) * 3);
  let cumLen = 0, px = pts[0].x, py = pts[0].y;
  data[0] = 0; data[1] = px; data[2] = py;

  for (let i = 1; i <= steps; i++) {
    const tScaled = (i / steps) * segCount;
    const si = Math.min(segCount - 1, Math.floor(tScaled));
    const { x, y } = evalCubic(pts, si, tScaled - si);
    cumLen += Math.hypot(x - px, y - py);
    const b = i * 3;
    data[b] = cumLen; data[b + 1] = x; data[b + 2] = y;
    px = x; py = y;
  }

  return { data, totalLen: cumLen, steps };
}

// Cari posisi (x, y) di kurva berdasarkan jarak dari awal (arc-length)
// Pakai binary search di LUT, hasilnya diinterpolasi linear antar sampel
function getPointFromLUT({ data, totalLen, steps }, targetLen) {
  if (targetLen <= 0)        return { x: data[1],           y: data[2]           };
  if (targetLen >= totalLen) return { x: data[steps * 3 + 1], y: data[steps * 3 + 2] };

  let lo = 0, hi = steps;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (data[mid * 3] < targetLen) lo = mid;
    else hi = mid;
  }

  const a    = lo * 3;
  const bIdx = hi * 3;
  const frac = (targetLen - data[a]) / (data[bIdx] - data[a]);
  return {
    x: data[a + 1] + frac * (data[bIdx + 1] - data[a + 1]),
    y: data[a + 2] + frac * (data[bIdx + 2] - data[a + 2]),
  };
}

// Array pre-alokasi untuk setLineDash supaya tidak ada GC pressure tiap frame
const _dashW  = new Float32Array(2);
const _dashY  = new Float32Array(2);
const _dashG  = new Float32Array(2);
const _NODASH = [];

// Margin horizontal section ini, sama dengan StatSection dan HeroSection
const H_MARGIN = 160;

// Throttle post-intro (ms per frame). 1000/16 = 60fps cap setelah animasi selesai.
const POST_MS = 1000 / 16;

// Fraksi jalur total saat CTA mulai muncul (40% dari panjang kurva)
const CTA_FRAC = 0.40;

// CSS untuk efek pulse ring di dot event yang sedang aktif
const STYLES = `
  .et-pulse::after {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    border: 1.5px solid currentColor;
    animation: pulse-ring 2.4s ease-out infinite;
    will-change: transform, opacity;
  }
  @keyframes pulse-ring {
    0%   { transform: scale(1);   opacity: 0.7; }
    100% { transform: scale(2.8); opacity: 0;   }
  }
`;

// ->->-> Komponen utama ->->->->->->->->->->->->->->->->->->->->->->->->->->->->->->->->->
export default function EventTimeline() {
  const events    = buildEvents();
  const activeIdx   = events.findLastIndex(e => e.isActive);
  const inactiveIdx = activeIdx + 1;

  // Ref ke elemen DOM utama
  const containerRef = useRef(null);
  const canvasRef    = useRef(null);
  const ctxRef       = useRef(null);
  const gradCacheRef = useRef(null); // cache gradient supaya tidak dibuat ulang tiap frame

  // Path SVG tersembunyi, hanya dipakai sekali di playIntro untuk ngukur panjang jalur
  const pathWRef = useRef(null); // jalur putih (semua)
  const pathYRef = useRef(null); // jalur kuning (segmen aktif)
  const pathGRef = useRef(null); // jalur gradient (transisi aktif->inaktif)

  // State geometri dan animasi, disimpan di ref agar tidak trigger re-render
  const arcLUTRef  = useRef(null);  // lookup table arc-length
  const segLen     = useRef({ w: 0, y: 0, g: 0 }); // panjang tiap segmen jalur
  const curveRef   = useRef([]);    // posisi titik kurva dalam piksel (diupdate tiap resize)
  const sizeRef    = useRef({ W: 0, H: 0 });
  const basePosRef = useRef([]);    // posisi dasar tiap dot (sebelum animasi float)

  // State animasi intro
  const introStarted = useRef(false);
  const introProg    = useRef(0);   // progress jalur: 0..1
  const travelRef    = useRef({ drawn: 0, total: 0, active: false }); // posisi dot traveler
  const visibleRef   = useRef(false);
  const postCapMs    = useRef(0);   // timestamp frame terakhir (untuk throttle post-intro)
  const prevPts      = useRef(null);

  // Ref ke elemen DOM untuk animasi GSAP
  const ctaRef      = useRef(null);
  const mascotRef   = useRef(null);
  const nodeRefs    = useRef([]); // div float tiap event
  const rotateRefs  = useRef([]); // div rotate tiap event

  // ->-> Inisialisasi ukuran canvas dan posisi kurva ->->->->->->->->->->->->->->->->->->->
  const initCurve = () => {
    const el = containerRef.current;
    if (!el) return;

    const { width: W, height: H } = el.getBoundingClientRect();
    sizeRef.current = { W, H };

    const canvas = canvasRef.current;
    if (canvas) {
      // Cap DPR di 2x supaya tidak mati di layar DPR 3 (9x luas piksel)
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width  = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);

      if (!ctxRef.current) {
        ctxRef.current = canvas.getContext('2d', { alpha: true, desynchronized: true });
      }
      ctxRef.current.setTransform(dpr, 0, 0, dpr, 0, 0);
      gradCacheRef.current = null; // reset cache karena ukuran berubah
    }

    // Konversi CP dari relatif (0..1) ke piksel nyata
    curveRef.current = CP.map(p => ({
      x: p.pctX * W,
      y: p.pctY * H,
      hIn:  { dx: p.hIn.dx  * W, dy: p.hIn.dy  * H },
      hOut: { dx: p.hOut.dx * W, dy: p.hOut.dy * H },
    }));

    prevPts.current = null;
  };

  // Jalankan initCurve saat mount dan saat resize
  useEffect(() => {
    initCurve();
    window.addEventListener('resize', initCurve);
    return () => window.removeEventListener('resize', initCurve);
  }, []);

  // ->-> Pause animasi kalau section tidak terlihat ->->->->->->->->->->
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { visibleRef.current = e.isIntersecting; },
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // ->-> Tick animasi, jalan di setiap frame GSAP ticker ->->->->->->->
  useEffect(() => {
    const tick = () => {
      if (!visibleRef.current || !introStarted.current) return;

      const progress = introProg.current;
      const now      = performance.now();

      // Setelah intro selesai, throttle ke POST_MS supaya tidak boros CPU
      if (progress >= 1) {
        if (now - postCapMs.current < POST_MS) return;
        postCapMs.current = now;
      }

      const { W, H } = sizeRef.current;
      if (!W || !H) return;

      // Update posisi titik kurva berdasarkan animasi float dari GSAP
      let changed = false;
      const prev  = prevPts.current;

      nodeRefs.current.forEach((node, i) => {
        if (!node || !basePosRef.current[i]) return;
        const nx = basePosRef.current[i].x + (gsap.getProperty(node, 'x') || 0);
        const ny = basePosRef.current[i].y + (gsap.getProperty(node, 'y') || 0);

        if (!prev || Math.abs(nx - prev[i].x) > 0.5 || Math.abs(ny - prev[i].y) > 0.5) {
          changed = true;
        }
        curveRef.current[i + 1].x = nx;
        curveRef.current[i + 1].y = ny;
      });

      // Gambar ulang hanya kalau ada yang berubah atau intro belum selesai
      if (progress < 1 || changed) {
        draw(curveRef.current, progress);
        if (changed) {
          prevPts.current = curveRef.current.slice(1, 5).map(p => ({ x: p.x, y: p.y }));
        }
      }
    };

    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ->-> Fungsi gambar utama (dipanggil tiap frame oleh tick) ->->->->->->->->->->->->->->->->->
  function draw(pts, progress) {
    const ctx = ctxRef.current;
    if (!ctx) return;

    const { W, H } = sizeRef.current;
    if (!W || !H) return;

    const { w: wLen, y: yLen, g: gLen } = segLen.current;
    if (!wLen) return;

    ctx.clearRect(0, 0, W, H);
    if (progress <= 0) return;

    // Titik-titik untuk segmen kuning (aktif) dan gradient (transisi)
    const yPts    = pts.slice(0, activeIdx + 2);
    const gPts    = pts.slice(activeIdx + 1, inactiveIdx + 2);
    const isIntro = progress < 1;
    const drawn   = progress * wLen;

    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 5;

    // Jalur putih sebagai dasar (semua titik)
    ctx.strokeStyle = THEME.path.base;
    if (isIntro) {
      _dashW[0] = Math.min(drawn, wLen); _dashW[1] = wLen + 1;
      ctx.setLineDash(_dashW);
    } else {
      ctx.setLineDash(_NODASH);
    }
    strokePath(ctx, pts);

    // Jalur kuning di atas jalur putih untuk segmen event aktif
    const yDrawn = Math.min(drawn, yLen);
    if (yDrawn > 0) {
      ctx.strokeStyle = THEME.path.active;
      if (isIntro) {
        _dashY[0] = yDrawn; _dashY[1] = yLen + 1;
        ctx.setLineDash(_dashY);
      }
      strokePath(ctx, yPts);
    }

    // Segmen gradient dari kuning ke putih (transisi aktif ke inaktif)
    if (gPts.length >= 2) {
      const gDrawn = isIntro ? Math.max(0, drawn - yLen) : gLen;

      if (gDrawn > 0 && gLen > 0) {
        if (isIntro) {
          ctx.strokeStyle = THEME.path.gradFrom;
          _dashG[0] = Math.min(gDrawn, gLen); _dashG[1] = gLen + 1;
          ctx.setLineDash(_dashG);
        } else {
          ctx.setLineDash(_NODASH);

          // Cache gradient supaya tidak dibikin ulang tiap frame
          const p0  = gPts[0];
          const p1  = gPts[gPts.length - 1];
          const key = `${p0.x | 0},${p0.y | 0},${p1.x | 0},${p1.y | 0}`;
          if (!gradCacheRef.current || gradCacheRef.current.key !== key) {
            const g = ctx.createLinearGradient(p0.x, p0.y, p1.x, p1.y);
            g.addColorStop(0, THEME.path.gradFrom);
            g.addColorStop(1, THEME.path.gradTo);
            gradCacheRef.current = { key, gradient: g };
          }
          ctx.strokeStyle = gradCacheRef.current.gradient;
        }
        strokePath(ctx, gPts);
      }
    }

    ctx.setLineDash(_NODASH);

    // Dot traveler yang jalan di sepanjang kurva saat intro (pakai LUT, bukan DOM)
    const { drawn: td, total: tt, active: ta } = travelRef.current;
    if (ta && tt > 0 && td > 0 && td < tt && arcLUTRef.current) {
      const pt = getPointFromLUT(arcLUTRef.current, td);
      ctx.beginPath(); ctx.arc(pt.x, pt.y, 16, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,201,54,0.08)'; ctx.fill();
      ctx.beginPath(); ctx.arc(pt.x, pt.y,  9, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,201,54,0.22)'; ctx.fill();
      ctx.beginPath(); ctx.arc(pt.x, pt.y,  4, 0, Math.PI * 2); ctx.fillStyle = '#FFC936';               ctx.fill();
    }
  }

  // ->-> Trigger intro saat section pertama kali masuk viewport ->->->->->->->->->->->->->->->
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        playIntro();
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ->-> Animasi intro: jalur menggambar diri sendiri, lalu dot dan kartu muncul
  function playIntro() {
    // Tunggu dua frame supaya layout sudah stabil sebelum ngukur
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const white  = pathWRef.current;
      const yellow = pathYRef.current;
      const grad   = pathGRef.current;
      if (!white || !yellow || !grad) return;

      const pts  = curveRef.current;
      const yPts = pts.slice(0, activeIdx + 2);
      const gPts = pts.slice(activeIdx + 1, inactiveIdx + 2);

      // Set path SVG tersembunyi lalu ukur panjangnya via browser
      white.setAttribute( 'd', svgPath(pts));
      yellow.setAttribute('d', svgPath(yPts));
      grad.setAttribute(  'd', svgPath(gPts));

      const wLen = white.getTotalLength();
      const yLen = yellow.getTotalLength();
      const gLen = grad.getTotalLength();
      segLen.current = { w: wLen, y: yLen, g: gLen };

      arcLUTRef.current = buildArcLUT(pts, 400);

      // Panjang sub-kurva sampai tiap dot, untuk tau kapan masing-masing muncul
      const subLengths = events.map((_, i) => subLen(pts, i + 1));

      // Posisi dasar tiap dot (sebelum offset float dari GSAP)
      const { W, H } = sizeRef.current;
      basePosRef.current = CP.slice(1, 5).map(cp => ({ x: cp.pctX * W, y: cp.pctY * H }));

      // Reset semua elemen ke state tersembunyi sebelum animasi mulai
      nodeRefs.current.forEach(n => n && gsap.set(n, { opacity: 0, scale: 0, transformOrigin: '0px 0px' }));
      if (ctaRef.current)    gsap.set(ctaRef.current,    { opacity: 0, y: 40 });
      if (mascotRef.current) gsap.set(mascotRef.current, { opacity: 0, y: 40 });

      // Animasi float tiap kartu (berjalan terus setelah intro selesai)
      const tl = gsap.timeline();
      nodeRefs.current.forEach((node, i) => {
        if (!node) return;
        const { floatY, floatX, floatDur, floatDelay } = events[i].slot;
        const rot = rotateRefs.current[i];

        tl.to(node, { y: floatY, duration: floatDur, repeat: -1, yoyo: true, ease: 'sine.inOut' }, floatDelay);
        tl.to(node, { x: floatX, duration: floatDur * 1.3, repeat: -1, yoyo: true, ease: 'sine.inOut' }, floatDelay + 0.5);
        if (rot) {
          tl.to(rot, {
            rotation: i % 2 === 0 ? 2.5 : -2.5,
            duration: floatDur * 1.7,
            repeat: -1, yoyo: true, ease: 'sine.inOut',
          }, floatDelay + 1);
        }
      });

      // Tracking state untuk reveal selama animasi drawing berjalan
      const revealed      = events.map(() => false);
      let ctaRevealed     = false;
      let mascotRevealed  = false;

      const proxy = { drawn: 0 };
      introStarted.current = true;
      introProg.current    = 0;
      travelRef.current    = { drawn: 0, total: wLen, active: true };

      // Animasi utama: drawing jalur dari kiri ke kanan
      gsap.to(proxy, {
        drawn: wLen,
        duration: 2.8,
        ease: 'power1.inOut',
        delay: 0.2,
        onUpdate() {
          const d = proxy.drawn;
          introProg.current       = d / wLen;
          travelRef.current.drawn = d;

          // CTA muncul setelah jalur mencapai 40%
          if (!ctaRevealed && d >= wLen * CTA_FRAC) {
            ctaRevealed = true;
            ctaRef.current && gsap.to(ctaRef.current, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' });
          }

          // Maskot muncul setelah jalur melewati dot slot ke-1
          if (!mascotRevealed && d >= subLengths[1]) {
            mascotRevealed = true;
            mascotRef.current && gsap.to(mascotRef.current, { opacity: 1, y: 0, duration: 0.8, ease: 'back.out(1.2)' });
          }

          // Tiap kartu muncul saat jalur sampai di dotnya masing-masing
          subLengths.forEach((sl, i) => {
            if (!revealed[i] && d >= sl) {
              revealed[i] = true;
              const node = nodeRefs.current[i];
              node && gsap.to(node, { opacity: 1, scale: 1, duration: 0.55, ease: 'back.out(1.4)', transformOrigin: '50% 50%' });
            }
          });
        },
        onComplete() {
          introProg.current = 1;
          travelRef.current = { drawn: 0, total: 0, active: false };
        },
      });
    }));
  }

  // ->-> Render -->->->->->->->->->->->->->->->->->->->->->->->->->->->->->->->->->->->->->->->->->->->->->->->->->->->->->->->->->->->->->->->
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width: '100%',
          height: '100vh',
          minHeight: 600,
          overflow: 'hidden',
          fontFamily: "'Outfit', sans-serif",
          background: THEME.bg.container,
          zIndex: 2,
        }}
      >
        {/* Background batik pattern */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'url(/Batik_Pattern_dark.svg)',
            backgroundSize: 'cover', backgroundPosition: 'center',
            pointerEvents: 'none', zIndex: 0, opacity: 0.4,
          }}
        />

        {/* Canvas untuk menggambar jalur bezier */}
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}
        />

        {/* Path SVG tersembunyi, hanya untuk pengukuran panjang jalur di playIntro */}
        <svg aria-hidden="true" style={{ position: 'absolute', width: 0, height: 0, opacity: 0, overflow: 'visible' }}>
          <path ref={pathWRef} fill="none" />
          <path ref={pathYRef} fill="none" />
          <path ref={pathGRef} fill="none" />
        </svg>

        {/* Maskot, posisi antara slot 1 dan 2 */}
        <img
          ref={mascotRef}
          src="/maskot/maskot1.png"
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '57%',
            bottom: '-3%',
            width: 420,
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
            zIndex: 8,
            filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.5))',
          }}
        />

        {/* CTA "WHY WAIT?" di sisi kiri */}
        <div
          ref={ctaRef}
          style={{
            position: 'absolute',
            left: H_MARGIN,
            top: '60%',
            transform: 'translateY(-50%)',
            zIndex: 5,
            maxWidth: 300,
          }}
        >
          <h2 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '3.8rem', color: '#fff', lineHeight: 1, margin: 0, textShadow: '0 0 40px rgba(255,255,255,0.15)' }}>
            WHY WAIT?
          </h2>
          <p style={{ fontFamily: 'Plus Jakarta Sans', color: '#fff', fontSize: '22px', marginTop: 5, lineHeight: 1.2, fontWeight: 500 }}>
            Make sure to not miss your registration period!
          </p>
          <div style={{ marginTop: 18 }}>
            <Button href="/events" variant="primary" size="md">SEE EVENTS</Button>
          </div>
        </div>

        {/* Kartu event, dirender di atas tiap dot */}
        {events.map((ev, i) => {
          const { slot } = ev;
          const shadowBase  = slot.palette.shadow
            ? `0 4px 16px rgba(0,0,0,0.7), 0 0 2px ${slot.palette.shadow}`
            : '0 4px 16px rgba(0,0,0,0.7)';
          const shadowHover = slot.palette.shadow
            ? `0 8px 28px rgba(0,0,0,0.85), 0 0 2px ${slot.palette.shadow}`
            : '0 8px 28px rgba(0,0,0,0.85)';

          return (
            // Anchor statis di posisi CP, tidak pernah digerakkan GSAP
            <div
              key={ev.id}
              style={{
                position: 'absolute',
                left: `${CP[i + 1].pctX * 100}%`,
                top: `${CP[i + 1].pctY * 100}%`,
                zIndex: 10, width: 0, height: 0,
              }}
            >
              {/* Float node: GSAP hanya gerakkan x/y/opacity/scale, bukan transform lain */}
              <div ref={el => (nodeRefs.current[i] = el)} style={{ willChange: 'transform', opacity: 0 }}>

                {/* Label tanggal dan info registrasi */}
                <div style={{ position: 'absolute', left: slot.labelOffset.x, top: slot.labelOffset.y, whiteSpace: 'nowrap', pointerEvents: 'none' }}>
                  <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: '36px', lineHeight: 1, color: slot.palette.labelColor, textShadow: `0 0 20px ${slot.palette.labelGlow}` }}>
                    {ev.label}
                  </div>
                  <div style={{ fontSize: '18px', color: '#fff', lineHeight: 1.45, marginTop: 3, letterSpacing: '0.3px', marginLeft: 40 }}>
                    {ev.subLabel.split('\n').map((ln, j) => <div key={j}>{ln}</div>)}
                  </div>
                </div>

                <div ref={el => (rotateRefs.current[i] = el)}>
                  {/* Dot di jalur kurva, dengan pulse ring kalau event sedang aktif */}
                  <div
                    className={ev.isActive ? 'et-pulse' : undefined}
                    style={{
                      position: 'absolute',
                      width: slot.dotSize, height: slot.dotSize,
                      borderRadius: '50%',
                      background: slot.palette.dotColor,
                      boxShadow: `0 0 14px ${slot.palette.dotGlow}, 0 0 4px ${slot.palette.dotColor}`,
                      color: slot.palette.dotColor,
                      zIndex: 2,
                      transform: 'translate(-50%,-50%)',
                    }}
                  />

                  {/* Kartu event dengan efek hover tilt */}
                  <div
                    style={{
                      position: 'absolute',
                      left: slot.cardOffset.x, top: slot.cardOffset.y,
                      width: 210, height: 300,
                      borderRadius: 10, overflow: 'hidden',
                      border: `2px solid ${slot.palette.border}`,
                      boxShadow: shadowBase,
                      transform: `rotate(${slot.tilt}deg)`,
                      transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'rotate(0deg) scale(1.07)';
                      e.currentTarget.style.boxShadow = shadowHover;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = `rotate(${slot.tilt}deg)`;
                      e.currentTarget.style.boxShadow = shadowBase;
                    }}
                  >
                    <EventCard event={ev} className="w-full h-full" size="lg" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}