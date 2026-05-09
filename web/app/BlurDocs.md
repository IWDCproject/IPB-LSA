# Blur System Documentation
> IPB-LSA Web - `web/` (Next.js 14)

---

## Overview

The blur system generates layered, Sharp-processed blur effects for background images across the site. It is designed as an internal library: **one-time global setup, then a single hook per component** - no boilerplate per page.

---

## Architecture

```
layout.jsx
  └-- <BlurProvider>             ← global, zero config, lives here forever

Any section / component:
  └-- useBlurImages(manifest)    ← the only thing devs ever touch
        ├-- registers images with the shared worker on mount
        ├-- skips images already processed (cross-page bitmap cache)
        └-- returns { bitmaps, isReady }

  └-- <BlurOverlay isReady={isReady} />   ← optional curtain, drop anywhere
```

---

## File Map

| File | Location | Role |
|------|----------|------|
| `BlurProvider.jsx` | `components/BlurProvider.jsx` | Global context provider. Spawns the Worker lazily on first `register()` call. Place once in `layout.jsx`. |
| `BlurContext.js` | `contexts/BlurContext.js` | React context shape: `{ bitmaps, register, unregister }`. `unregister` is an intentional no-op - bitmaps are kept as a permanent cross-page cache. |
| `useBlurImages.js` | `hooks/useBlurImages.js` | **Main dev-facing hook.** Registers manifest on mount, returns `{ bitmaps, isReady }`. |
| `BlurOverlay.jsx` | `components/BlurOverlay.jsx` | Optional full-screen curtain that fades out when `isReady` is true. Has hard `maxMs` cap so it never blocks forever. |
| `blurWorker.js` | `public/blurWorker.js` | Browser Web Worker. Handles image sizing, masking, compositing. Calls `/api/blur` per blur layer. |
| `route.js` | `app/api/blur/route.js` | Server-side Sharp processor with disk cache, TTL enforcement, and in-flight dedup. |
| `blur-invalidate/route.js` | `app/api/blur-invalidate/route.js` | Webhook endpoint for Directus. Deletes specific cache files by asset ID when an image is updated or deleted. |

---

## Data Flow

```
1. Component mounts
   → useBlurImages(manifest) called
   → register(manifest) sent to BlurProvider

2. BlurProvider deduplicates against already-submitted keys
   → spawns Worker if not already running (lazy)
   → posts only new images to blurWorker.js

3. blurWorker.js (browser Web Worker, off main thread)
   → for each image: calls GET /api/blur?url=...&blur=...&w=...&h=...&ttl=...
     (one request per unique blur level per image)
   → receives WebP blob from server
   → draws to OffscreenCanvas, composites blur layers with gradient masks
   → posts { url, type, sharp?, blurred?, bitmap? } back to BlurProvider
     (hero posts ImageBitmaps as transferables)

4. BlurProvider
   → updates bitmaps state: bitmaps[url][type] = { sharp, blurred } or { bitmap }

5. Component re-renders
   → reads bitmaps[url]?.hero  → { sharp: ImageBitmap, blurred: ImageBitmap }
   → reads bitmaps[url]?.eventcard / newscard / matchcard → { bitmap: ImageBitmap }
   → draws to canvas
```

---

## Blur Types

| Type | Target Size | Used In | Layers | TTL |
|------|-------------|---------|--------|-----|
| `hero` | 1200 × 800 | `HeroSection` full-page background | Multi-layer: bottom-up + left-edge + right-edge gradient composites | 30 days |
| `eventcard` | 400 × 280 | `EventCard` in `HeroSection` strips + `VerticalTimeline` | 4-layer composited gradient (bottom-up) | 7 days |
| `matchcard` | 400 × 280 | `MatchCard` in `MatchSection` | **Single flat blur at 6px - no compositing** | 7 days |
| `newscard` | 800 × 600 (featured), 400 × 300 (rest) | `NewsCard` in `NewsSection` | 4-layer composited gradient (top-down, lower half only) | 2 days |

**Hero is special:** it returns both a `sharp` bitmap (pre-scaled original via `&width=1200&fit=inside`) and a `blurred` bitmap (edge composites). All other types return a single `bitmap`.

---

## Bitmap Return Shapes

```js
// hero only
bitmaps[url]?.hero === { sharp: ImageBitmap, blurred: ImageBitmap }

// all others
bitmaps[url]?.eventcard === { bitmap: ImageBitmap }
bitmaps[url]?.matchcard === { bitmap: ImageBitmap }
bitmaps[url]?.newscard  === { bitmap: ImageBitmap }
```

---

## Manifest Entry Shape

```js
{
  url:           string,   // full Directus asset URL incl. ?v= param
  type:          string,   // "hero" | "eventcard" | "matchcard" | "newscard"
  width:         number,   // canvas target width (px)
  height:        number,   // canvas target height (px)
  naturalWidth:  number,   // original image pixel width (from Directus field)
  naturalHeight: number,   // original image pixel height (from Directus field)
}
```

`naturalWidth`/`naturalHeight` come from Directus (`card_image.width`, `card_image.height`). The worker uses them for correct aspect-ratio scaling before compositing. If omitted, the worker falls back to `width`/`height` as the natural size - this will produce incorrect AR scaling if the target canvas dimensions differ from the image's real proportions.

> **URL alignment is critical.** The `url` in the manifest must exactly match the key the consuming card component uses to look up `bitmaps[url]`. `EventCard` calls `getAssetUrl(card_image)` internally and uses that result as the key. Your manifest URL must be that same computed value.

---

## How to Add Blur to a New Component

### 1. Register images (section that owns the data)

```jsx
import { useMemo } from "react";
import { useBlurImages } from "@/hooks/useBlurImages";
import { getAssetUrl } from "@/lib/directus";

export default function MySection({ items }) {
  const manifest = useMemo(() =>
    items.map(item => ({
      url:           getAssetUrl(item.card_image),
      type:          "mytype",
      width:         400,
      height:        280,
      naturalWidth:  item.card_image?.width,
      naturalHeight: item.card_image?.height,
    })),
  [items]);

  const { bitmaps, isReady } = useBlurImages(manifest);
  // pass bitmaps down, or let child components read from context
}
```

### 2. Consume bitmaps (card/display component)

```jsx
import { useBlur } from "@/contexts/BlurContext";

export default function MyCard({ imageUrl }) {
  const { bitmaps } = useBlur();
  const bitmap = bitmaps[imageUrl]?.mytype?.bitmap;

  return (
    <canvas
      ref={canvasRef}
      style={{ opacity: bitmap ? 1 : 0, transition: "opacity 0.4s" }}
    />
  );
}
```

> `EventCard` also accepts a `bitmap` prop directly. The prop takes precedence over context: `bitmapProp ?? bitmaps[imageUrl]?.eventcard?.bitmap`. Use this when you need to pass a bitmap from a parent without relying on context lookup.

### 3. Add your TTL to `blurWorker.js`

```js
const TTL = {
  hero:      30 * 24 * 60 * 60,
  eventcard:  7 * 24 * 60 * 60,
  matchcard:  7 * 24 * 60 * 60,
  newscard:   2 * 24 * 60 * 60,
  mytype:     7 * 24 * 60 * 60,   // ← add this line
};
```

Then add a processor function and register it in the `PROCESSORS` dispatch map at the bottom of `blurWorker.js`. Zero changes to `route.js` or `BlurProvider`.

---

## Caching

### Server-side (`.blur-cache/`)

- Cache files live at `web/.blur-cache/` by default (overrideable via `BLUR_CACHE_DIR`).
- **Filename format:** `{assetId}_{md5(url|blur|w|h)}.webp`
  - `assetId` is extracted from the Directus UUID in the URL path (`/assets/{uuid}`).
  - `md5` ensures uniqueness per (url, blur, w, h) combination.
- **Writes are atomic** - written to `{filename}.tmp`, then renamed. A crash mid-write never leaves a corrupt file.
- On every read, `fs.stat()` checks `mtime` against the type's TTL. Expired → MISS → Sharp reruns.
- **In-flight dedup** - an `IN_FLIGHT` Map prevents duplicate Sharp processes when concurrent requests hit the same uncached image. Second callers await the same Promise and receive `X-Cache: DEDUP`.
- **Open-proxy protection** - only URLs starting with `NEXT_PUBLIC_DIRECTUS_URL` are accepted. Others get `403 Forbidden`.

`X-Cache` response header values:

| Value | Meaning |
|-------|---------|
| `HIT` | Served from disk, Sharp did not run |
| `MISS` | Cache miss, Sharp ran, result written to disk |
| `DEDUP` | Concurrent miss, piggybacked on in-flight Sharp process |
| `DEV-BYPASS` | Development mode, cache skipped entirely |

### Browser-side

Blur images are served with `Cache-Control: public, max-age=31536000, immutable` (1 year). Return visitors never hit the server - the browser serves from local disk/memory cache.

### Cache Freshness

`getAssetUrl()` appends `?v={uploaded_on}` to every Directus asset URL. When an image is updated in Directus, `uploaded_on` changes → URL changes → new MD5 key → new cache file written. The old file becomes an orphan and expires naturally via TTL.

`uploaded_on` updates only when the **file binary is replaced**, not on metadata edits - so cache-busting is content-addressed and automatic.

### Cache Invalidation via Directus Webhook

For immediate invalidation (e.g. a news image is deleted before its TTL expires):

**Endpoint:** `POST /api/blur-invalidate`

**Header:** `x-invalidate-secret: {BLUR_INVALIDATE_SECRET}`

**Body:** `{ "id": "<directus-asset-uuid>" }`

Deletes all `.blur-cache` files whose name starts with that asset ID - all variants, all blur levels, in one pass.

**Directus setup:** Flows → trigger on `directus_files.items.update` and `directus_files.items.delete` → HTTP Webhook → `POST {YOUR_URL}/api/blur-invalidate` with the secret header and body `{ "id": "{{$trigger.keys[0]}}" }`.

---

## `BlurOverlay` Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isReady` | boolean | - | Pass directly from `useBlurImages()`. Starts fade-out after `minMs` once true. |
| `minMs` | number | `1000` | Minimum visible duration in ms. Prevents flash-of-overlay on cached images. |
| `maxMs` | number | `6500` | Hard cap in ms. Lifts even if `isReady` never becomes true. |
| `fadeMs` | number | `600` | Fade-out duration in ms. Component unmounts from DOM after fade completes. |

---

## Development vs Production

| Behaviour | `npm run dev` | `npm run build && npm start` |
|-----------|--------------|------------------------------|
| Cache reads | Skipped | Active |
| Cache writes | Skipped | Active |
| Sharp runs | Every request | Only on MISS |
| `X-Cache` header | `DEV-BYPASS` | `HIT` / `MISS` / `DEDUP` |
| Testing cache | Not possible | Filter `/api/blur` in DevTools → Network tab |

In dev, Sharp runs every request by design so blur changes appear without stale cache. Never benchmark blur performance in dev mode.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_DIRECTUS_URL` | Yes | Directus base URL. Used for asset URLs and as the open-proxy allowlist in `route.js`. |
| `BLUR_INVALIDATE_SECRET` | Yes (prod) | Auth token for the Directus webhook endpoint. Add to `.env.local` and VPS env. |
| `BLUR_CACHE_DIR` | No | Override cache directory path. Defaults to `{cwd}/.blur-cache`. |

---

## Known Quirks

- **`BlurProvider` must be in `layout.jsx`**, not `page.js`. Without it, `useBlur()` returns a no-op context and nothing processes.
- **`page.js` is blur-free** - it's a clean server component that only fetches data and passes it to `CurtainWrapper`. Each section registers its own images.
- **`mounted` in `HeroSection` is decoupled from `isReady`**. Content renders immediately; blur is progressive enhancement. Do not re-gate content rendering on blur readiness - it causes blank pages in dev.
- **`unregister` is a no-op** by design. Bitmaps persist for the session as a cross-page cache. Navigating back never re-processes images. Memory footprint is bounded by unique images in the app.
- **The worker is lazy** - spawned only on the first `register()` call. Pages with no blur images pay zero cost.
- **`VerticalTimeline` uses `ev.image_url`** as the manifest URL key. This must match the URL that `EventCard` computes via `getAssetUrl(card_image)` - both must resolve to the same string for the context lookup to hit.