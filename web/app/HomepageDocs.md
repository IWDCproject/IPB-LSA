# Homepage System Documentation
**IPB University Sports Event Platform**

> For the `/` route — covers layout, scroll system, blur pipeline, image pipeline, every section component, and live data hooks.

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [File Map](#2-file-map)
3. [Component Tree](#3-component-tree)
4. [Layout & Scroll System](#4-layout--scroll-system)
5. [Blur Pre-render Pipeline](#5-blur-pre-render-pipeline)
6. [Section Breakdown](#6-section-breakdown)
7. [Shared Card Components](#7-shared-card-components)
8. [Performance Rules](#8-performance-rules)
9. [Data & DB Schema](#9-data--db-schema)
10. [Known Constraints & Traps](#10-known-constraints--traps)
11. [Adding a New Section](#11-adding-a-new-section)
12. [Bugs](#12-bugs)

---

## 1. Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14 App Router |
| Rendering | `page.js` is a server component. All sections are `"use client"`. |
| Animation | GSAP (scroll triggers, float tweens, entrance animations) |
| Scroll | Framer Motion `useScroll` + `useTransform` for parallax. Lenis for smooth wheel. |
| Blur pipeline | Web Worker + OffscreenCanvas + ImageBitmap + server-side Sharp + disk cache |
| CMS | Directus (fully connected — no mock data) |
| Fonts | Bebas Neue (display), Plus Jakarta Sans (body) |
| Styling | Inline styles + Tailwind utility classes (mixed) |

---

## 2. File Map

```
app/
  layout.jsx                    ← RootLayout: BlurProvider + SmoothScroller + Header
  page.js                       ← server component, fetches all data, renders CurtainWrapper
  _components/
    CurtainWrapper.jsx          ← parallax + sticky scroll layout (DO NOT TOUCH)
    SmoothScroller.jsx          ← Lenis smooth scroll wrapper
    sections/
      HeroSection.jsx           ← fixed hero with rotating events + event card strip
      StatSection.tsx           ← animated stat cards + CTA + fight video bg
      MatchSection.jsx          ← live match cards + upcoming matches table
      TimelineSection.jsx       ← bezier canvas timeline (desktop) or VerticalTimeline (mobile)
      NewsSection.tsx           ← 1 large + 4 small news cards
    timeline-stuff/
      VerticalTimeline.jsx      ← mobile stacked card timeline
    match-stuff/
      MatchCard.tsx             ← match score card (5 score engine types)
      MatchTable.jsx            ← upcoming matches table
      FightBackground.tsx       ← fight video bg (mixBlendMode screen, plays once)
    news-stuff/
      NewsCard.tsx              ← news article card, animated arrow + blur
    stats-stuff/
      StatCard.tsx              ← stat card (image + bottom gradient panel)
      1.jpg / 2.jpg / 3.jpg    ← static athlete/universities/events images (Next.js imports)

components/
  BlurProvider.jsx              ← global blur context provider, lives in layout.jsx
  BlurOverlay.jsx               ← optional full-screen loading curtain (not used on homepage)
  EventCard.jsx                 ← event card, used in hero strip + both timeline variants
  Header.jsx
  Footer.jsx
  Button.tsx
  UniversityMarquee.tsx

contexts/
  BlurContext.js                ← createContext + useBlur() hook

hooks/
  useBlurImages.js              ← primary developer API for blur registration

lib/
  directus.js                   ← Directus client + getAssetUrl() + all data fetchers

public/
  blurWorker.js                 ← unified image processing Web Worker

app/api/
  blur/route.js                 ← Sharp processor with disk cache + TTL enforcement
  blur-invalidate/route.js      ← Directus webhook for immediate cache invalidation
```

---

## 3. Component Tree

```
layout.jsx (server)
  └── <BlurProvider>                  ← global, lazy worker, in layout forever
        └── <SmoothScroller>          ← Lenis
              ├── <Header />
              └── <main>
                    └── page.js (server) ← fetches events, matches, stats, news
                          └── <CurtainWrapper>
                                ├── <HeroSection />          z-index: 1 (fixed)
                                ├── <StatSection />          z-index: 2
                                ├── <MatchSection />         z-index: 2
                                ├── <TimelineSection />      z-index: 2 (sticky)
                                │     ├── <EventTimeline />  ← desktop (container W ≥ 900)
                                │     └── <VerticalTimeline /> ← mobile (W < 900)
                                └── <NewsSection />          z-index: 3
                                      └── <Footer />
```

---

## 4. Layout & Scroll System

Read carefully before touching anything in `CurtainWrapper`.

### Layer z-index stack

| Layer | z-index | Position |
|---|---|---|
| HeroSection | 1 (inside motion.div) | `position: fixed`, top: 65px |
| heroSpacerRef div | — | Normal flow, reserves scroll height |
| StatSection + MatchSection | 2 | `position: relative` |
| TimelineSection | 2 | `position: sticky, top: 65px` |
| NewsSection | 3 | `position: relative, minHeight: sectionH` |

### Parallax math

Two parallax transforms exist, both using Framer Motion `useScroll` + `useTransform`:

**Hero parallax** — `heroSpacerRef` tracked from `start start` to `end start`. Hero moves UP at `PARALLAX_SPEED = 0.4` as you scroll past it.

**Timeline parallax** — `newsSectionRef` tracked from `start end` to `start start`. `TimelineSection` moves up as NewsSection enters, creating a curtain-pull.

Both use `useTransform(() => ...)` with live `viewportH.current` inside the callback. Never capture viewport height in a closure — it changes on resize.

```js
const sectionH  = `calc(100vh - ${HEADER_HEIGHT}px)`;  // 65px header
const parallaxH = `calc((100vh - ${HEADER_HEIGHT}px) * ${1 + PARALLAX_SPEED})`;
```

The outer `motion.div` wrapping HeroSection uses `parallaxH` for room to translate upward. The inner `div` clips to `sectionH`.

### heroPaused

`CurtainWrapper` attaches an `IntersectionObserver` to `heroSpacerRef`. When the spacer leaves the viewport, `heroPaused = true` is passed to HeroSection, which pauses its GSAP ticker and rotation interval.

> **Why not IO on the hero div itself?** It's `position: fixed` — it never leaves the viewport, so IO always reports intersecting. The spacer in the normal flow is the proxy.

---

## 5. Blur Pre-render Pipeline

See `blur-system-docs.md` for the full blur architecture. This section covers homepage-specific usage.

### Why it exists

CSS `backdrop-filter: blur()` is re-composited every frame. Pre-rendering blur into a static bitmap means the GPU composites a flat image — essentially free.

### Registration map

Every section that uses blur calls `useBlurImages(manifest)` independently. There is no global manifest — `page.js` and `BlurProvider` are clean of blur logic.

| Section | Type registered | How |
|---|---|---|
| `HeroSection` | `hero` | `EVENTS.map(ev => ({ url: ev.image_url, type: "hero", ... }))` |
| `TimelineSection` (EventTimeline) | `eventcard` | `rawEvents.map(ev => ({ url: getAssetUrl(ev.card_image), type: "eventcard", ... }))` |
| `VerticalTimeline` | `eventcard` (no-op in practice — see Bugs) | `events.filter(ev => ev.image_url)...` |
| `MatchSection` | `matchcard` | `rawMatches.filter(m => m.competition_category?.event_id?.card_image)...` |
| `NewsSection` | `newscard` | `news.map((item, i) => ({ url: item.thumbnail_url, ... }))` |

### BlurContext shape

```js
// from useBlur():
{ bitmaps, register, unregister }

// bitmaps structure:
bitmaps[url] = {
  hero:      { sharp: ImageBitmap, blurred: ImageBitmap },  // hero only
  eventcard: { bitmap: ImageBitmap },
  matchcard: { bitmap: ImageBitmap },
  newscard:  { bitmap: ImageBitmap },
}
```

`isReady` is **not** in context. It is returned locally by each `useBlurImages()` call — true when all images in that hook's manifest are done.

### Loading overlay

`BlurOverlay` is an optional component **not currently used on the homepage**. Content on all sections renders immediately on mount. Blur is progressive enhancement.

### DPR-aware canvas draw pattern

All `BitmapBlurLayer` components in `EventCard`, `NewsCard`, and `MatchCard` use this pattern:

```js
const dpr = window.devicePixelRatio || 1;
canvas.width  = Math.round(w * dpr);
canvas.height = Math.round(h * dpr);
const ctx = canvas.getContext("2d");
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
// cover-fit:
const scale = Math.max(w / bitmap.width, h / bitmap.height);
const dw = bitmap.width * scale, dh = bitmap.height * scale;
ctx.drawImage(bitmap, (w - dw) / 2, (h - dh) / 2, dw, dh);
```

**Always use `ctx.drawImage()`, never `bitmaprenderer.transferFromImageBitmap()`** — the latter closes the bitmap after one use. Bitmaps are shared across multiple canvases via context.

---

## 6. Section Breakdown

### 6.1 HeroSection

**What it does:** Rotating showcase of up to 8 published events. Two canvas layers per event (sharp + blurred), event card strip, progress bar, University marquee.

**Key constants:**

| Constant | Value | Meaning |
|---|---|---|
| `INTERVAL_MS` | 10000 | Auto-rotate every 10s |
| `SHRINK_MS` | 600 | Cross-fade transition duration |
| `SCALE_START` | 1600 | Reference width for `--s` CSS variable |
| `SCALE_FLOOR` | 0.875 | Minimum scale factor |
| `DESKTOP_SLOTS_MAX` | 8 | Max event cards in strip |
| `MOBILE_CARD_VW` | 0.26 | Card width as fraction of container on mobile |

**Key refs:**

| Ref | Purpose |
|---|---|
| `canvasRefs` | `{ "${id}_sharp": canvas, "${id}_blur": canvas }` per event |
| `barRef` | Progress bar — written via `.style` directly, never setState |
| `pausedRef` | Mirrors `paused` prop to avoid it in ticker dep array |
| `tabVisRef` | Mirrors `document.hidden` for tab-switch gating |
| `mobileScrollRef` | Horizontal card strip on mobile, programmatically scrolled to `activeIdx` |

**Blur registration:** Only `"hero"` type. `ev.image_url` is pre-computed in the `EVENTS` memo via `getAssetUrl(ev.card_image)`.

**`mounted` state:** Flips `true` immediately on mount (`useEffect(() => setMounted(true), [])`). It is **not** gated on blur readiness. Blur arrives async and draws to canvas as bitmaps come in.

**Canvas draw:** Uses `drawCover()` (cover-fit). See Bugs section — DPR scaling is missing here.

**Mobile:** `isMobile = cw < 1024`. Card strip is a horizontal scroll container.

---

### 6.2 StatSection

**What it does:** Three stat cards + CTA + FightBackground video + UniversityMarquee. Responsive stage system.

**Stage system:**

```
scale = cw / STAGE1_NAT_W

scale ≥ 1              → Stage 1: natural desktop layout
0.547 ≤ scale < 1      → Stage 2: entire row scaled via transform: scale() inside fixed-height wrapper
scale < 0.547          → Stage 3: stacked column, CTA below cards, centered
```

`STAGE3_THRESHOLD = 0.547` (not 0.65 — the old docs were wrong).

Stage 2 uses `transform: scale()` on the inner row inside a `position: relative` wrapper with a height equal to `CARD_H * scale`. This avoids reflow — the layout stays at natural size internally.

**Entrance:** `IntersectionObserver` at `threshold: 0.15`. Fires once, disconnects. 6 slots with `STAGGER = [0, 120, 240, 420, 540, 680]ms`. Keyframe `stat-intro` lives in `globals.css`.

**Images:** Static Next.js imports (`1.jpg`, `2.jpg`, `3.jpg`). Do not add to blur worker.

**FightBackground:** `z-0`, `mixBlendMode: screen`. Plays only when both `visible=true` AND `isFullyVisible` (container at ≥99% intersection ratio). `hasStarted` ref prevents replay. Resets on failed play so it can retry.

---

### 6.3 MatchSection

**What it does:** Live match cards horizontal row + upcoming matches table + CTA.

**Data:** Live from Directus. `rawMatches` split into `liveMatches` and `upcomingMatches` by status. Live cards shown in the row (up to `SHOW_MAX=5`). Upcoming shown in `MatchTable`, capped at 5 rows.

**Blur registration:** `useBlurImages(matchcardManifest)` using `getAssetUrl(img)`. `MatchCard` reads from `useBlur()` context directly.

**Desktop layout:** `fittingCount = floor(availableW / (MIN_CARD_W=240 + CARD_GAP=10))`. A dashed CTA box occupies a fixed slot at the end. Cards height: `calc(280px * var(--s))`.

**Mobile layout (`cw < 1024`):** Horizontal scroll snap, card width `38vw`. Scrollbar styled via `.match-scroll` in `globals.css`.

**Score engines:**

| Engine | Shows |
|---|---|
| `score_timed` | Home vs away score (integer) |
| `score_sets` | Current set score + win dots + historical set log |
| `judge_scores` | avg/sum/drop_extremes of judge score array |
| `finish_time` | Ordered finish time log |
| `manual_pick` | Winner name or ranked participant list |

**Timer:** `useMatchTimerDOM` writes to `ref.current.textContent` every second. Zero React re-renders. Derives time from `timerLastStarted` ISO string so it stays accurate across remounts.

---

### 6.4 TimelineSection

Switches between `EventTimeline` (desktop) and `VerticalTimeline` (mobile) at **container width < 900px**, measured via `ResizeObserver`.

#### Desktop: EventTimeline

**What it does:** Bezier curve on Canvas connecting up to 4 floating EventCards. Curve draws in on scroll entry. Active event gets yellow path segment.

**Bezier system:**
- `CP_DEF`: 6 control points as fractions of `[W, H]`, converted to pixels by `initLayout()` on mount + every resize.
- `basePtsRef`: pixel positions from last `initLayout`.
- `curPtsRef`: base + GSAP float motion offsets. Updated every rAF.
- Canvas redraws throttled to ~30fps (`now - lastCanvas >= 33ms`).

**Events shaped by `shapeEvents()`:** Maps raw events to 4 slots. Fills remaining with `isPlaceholder: true` (renders `PlaceholderCard`). Adds `isActive`, `label`, `subLabel`, `slot` layout data.

**Blur registration:** `EventTimeline` calls `useBlurImages(eventcardManifest)` using `getAssetUrl(ev.card_image)`. `EventCard` children read from context.

**Float animations:** Per-card GSAP tweens (`gsap.to(motionRef, { y/x, repeat: -1, yoyo: true })`), not a shared timeline. Killed on unmount.

**rAF loop:** Runs after intro plays. `loopRunning` ref gates it. `cancelAnimationFrame` on unmount.

**Mascot:** `maskot1.png`, absolutely positioned at `left: 57%`, fades in at 1.0s after intro starts.

#### Mobile: VerticalTimeline

**What it does:** Vertical stacked cards alternating left/right of a center line. Line fill animates on scroll. Cards entrance + float via GSAP.

**Float tweens:** `floatTweensRef` array. Reset to `[]` at top of each effect. IO + `visibilitychange` pause/resume.

**Scroll trigger:** `fillRef` (yellow line) animates `scaleY` 0→1 on scroll via `ScrollTrigger`, starting when wrapper enters `top 85%`.

---

### 6.5 NewsSection

**What it does:** 1 large featured card + 4 smaller cards. Desktop: CSS grid (`2fr 1fr 1fr`, 2 rows with responsive row heights). Mobile: featured card above 2×2 grid.

**Data:** `getNews({ limit: 5 })` from Directus. Real `thumbnail_url` with `?v=` cache-busting.

**Blur registration:** `useBlurImages(newsManifest)`. Featured card uses `800×600`, others use `400×300`. `NewsCard` reads bitmaps directly from `useBlur()` — no prop pass-through.

---

## 7. Shared Card Components

### EventCard

Used in: HeroSection strip, EventTimeline (desktop), VerticalTimeline (mobile).

| Prop | Type | Default | Notes |
|---|---|---|---|
| `event` | object | required | `{ slug, name, card_image: { id, uploaded_on, width, height }, user_created }` |
| `className` | string | `""` | Added to the Link wrapper |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Scales org name and title font sizes |
| `bitmap` | ImageBitmap \| null | `null` | Prop takes precedence over context lookup |

`BitmapBlurLayer` uses DPR-aware ResizeObserver. No CSS `backdrop-filter` fallback path.

### NewsCard

| Prop | Type | Default | Notes |
|---|---|---|---|
| `thumbnail_url` | string \| null | — | CSS background source and bitmap lookup key |
| `tag` | string \| null | `null` | Event name from `event_id.name` join |
| `title` | string | — | |
| `isMain` | bool | `false` | Large vs small variant |
| `compact` | bool | `false` | Mobile size reduction |
| `bitmap` | ImageBitmap \| null | `null` | Prop takes precedence over context |

Blur canvas covers the full card (`inset: 0`). Color overlay (bottom gradient) renders above it.

Arrow icon animates `strokeDashoffset` on hover via GSAP. Box shadow animates yellow glow. Both cleaned up with `gsap.killTweensOf()` on leave.

Self-sizing: ResizeObserver reads actual `cardW`, scales font/padding as `Math.min(1, cardW / REF_W[variant])`.

### MatchCard

**Named export:** `export function MatchCard` — import as `import { MatchCard } from "..."`.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `match` | object | — | Full match object from `getMatches()` |
| `bitmap` | ImageBitmap \| null | `null` | Prop takes precedence over context |

Background layers: CSS `backgroundImage` div (sharp) + `BitmapBlurLayer` canvas (blur) + gradient overlay + `cardInner` with inset border. `contain: "layout paint"` prevents style recalc escaping the card.

Scale via `--s` CSS variable: set by `useLayoutEffect` from `cardRef` width vs `DESIGN_W = 350`.

### StatCard

No blur. Props: `image_url` (string or Next.js static import object), `main_stat`, `label_stat`, `width`, `height`. Image + bottom `backdropFilter: "blur(4px)"` on the stat panel only (not the card background).

---

## 8. Performance Rules

**1. Tickers write to refs, not state.**
Values updated per frame (timer text, canvas draw) must use DOM refs directly. `setState` in a ticker = layout thrash.

**2. Dep arrays on ticker effects must be minimal.**
If `paused` is in the dep array, the effect tears down on every pause toggle, resetting the progress bar. Use `pausedRef.current` inside the ticker callback.

**3. No IO on `position: fixed` elements.**
They never leave the viewport. Use a proxy element in normal flow (`heroSpacerRef`).

**4. GSAP `repeat: -1` tweens in refs.**
Store in a ref array so IO + `visibilitychange` callbacks can pause/resume/kill them.

**5. Reset tween ref arrays at effect top.**
`floatTweensRef.current = []` before rebuilding. Strict Mode double-invokes effects — without reset the second run appends to stale refs.

**6. `ctx.drawImage` not `transferFromImageBitmap`.**
The latter closes the bitmap after one draw. Bitmaps are shared across multiple canvases from context.

**7. `useMemo` on blur manifests.**
Unstable array references cause `useBlurImages` to re-register on every render (manifestKey changes, triggers extra `register()` call). Wrap manifests in `useMemo`.

**8. rAF throttled to ~30fps (EventTimeline).**
Float positions update at native rAF speed. Canvas redraw gated by `now - lastCanvas >= 33ms`.

---

## 9. Data & DB Schema

All data fetched server-side in `page.js` via `Promise.all`. No mock data.

### Events
```js
// getEvents() — for HeroSection + both timeline variants
filter: { is_published: { _eq: true } }
fields: ['*', 'user_created.organisation_name',
         'card_image.id', 'card_image.uploaded_on',
         'card_image.width', 'card_image.height']
sort: ['start_date']
```

### Matches
```js
// getMatches() — for MatchSection
filter: { status: { _in: ['live', 'upcoming'] } }
// full nested: competition_category, format_id (with parsed modules),
//              home/away participants + institution logos
sort: ['status', 'scheduled_at']
```

### Stats
```js
// getStats() — parallel count queries on events, institutions, participants
```

### News
```js
// getNews({ limit: 5 }) — for NewsSection
filter: { is_published: { _eq: true } }
fields: ['id', 'title', 'slug', 'excerpt',
         'thumbnail.id', 'thumbnail.uploaded_on', 'thumbnail.width', 'thumbnail.height',
         'category', 'published_at', 'event_id.name']
sort: ['-published_at']
// Returns: { thumbnail_url, thumbnail_width, thumbnail_height, ... }
```

### Match format schema

```js
competition_category.format_id = {
  match_type: "head_to_head" | "solo" | "open",
  modules: [
    // [0] Score engine:
    { type: "score_timed" | "score_sets" | "judge_scores" | "finish_time" | "manual_pick",
      config: { /* engine-specific */ } },
    // Timer (optional, found by .find(m => m.type === "timer")):
    { type: "timer", config: { mode: "countdown" | "stopwatch", duration: number } }
  ]
}
```

---

## 10. Known Constraints & Traps

**`CurtainWrapper` is sacred.** Do not modify. The parallax math is fragile — one extra wrapper div or changed ref breaks scroll. Verify scrolling after any nearby change.

**`BlurProvider` is in `layout.jsx`, not `page.js`.** `page.js` is a clean server component. Never move blur logic back there.

**`EventCard` is used in 3 places at different sizes.** Check at `size="sm"` (hero strip), `size="md"` (default), and `size="lg"` (timeline cards) after any visual change.

**Timeline mobile breakpoint is `W < 900`, not 768.** Measured on the container via ResizeObserver, not `window.innerWidth`.

**`MatchCard` is a named export.** `import { MatchCard } from "..."`.

**`FightBackground` plays once.** `hasStarted` ref locks playback. Requires both `visible=true` AND `isFullyVisible` (≥99% intersection ratio). Resets on play failure for retry.

**`unregister` in BlurContext is a no-op.** Bitmaps persist for the session as a cross-page cache. Intentional — navigating back never re-processes.

**StatSection images are static imports.** Do not add `1.jpg`, `2.jpg`, `3.jpg` to the blur manifest.

---

## 11. Adding a New Section

1. **Create the component** in `_components/sections/`. Mark `"use client"`. Follow the `useContainerWidth` + ResizeObserver + `isMobile` pattern from `StatSection`/`NewsSection`.

2. **Add to `CurtainWrapper`.** Decide its z-stack position. z-index 2 alongside Stat+Match, or after Timeline (z-3 range), etc.

3. **If the section needs blur:**
   - Call `useBlurImages(manifest)` in the section component. Always wrap manifest in `useMemo`. Include `naturalWidth` / `naturalHeight` from Directus.
   - Card components read from `useBlur()` directly, or accept a `bitmap` prop.
   - Add `BitmapBlurLayer` to card using the DPR-aware ResizeObserver pattern.
   - Add TTL entry and processor function + `PROCESSORS` dispatch entry in `blurWorker.js`. Zero changes to `route.js`.

4. **Entrance animations:**
   - `IntersectionObserver` at `threshold: 0.15`. Fire once, disconnect.
   - Store `repeat: -1` tweens in a ref array. Reset array at effect top. Pause/resume via IO + `visibilitychange`.

5. **Live ticker:**
   - Write to DOM refs, not state.
   - Gate on `visibleRef.current` and `tabVisRef.current`.
   - Minimal dep arrays — use refs for frequently-changing values.

---

## 12. Bugs

**1. `HeroSection.drawToCanvas` — not DPR-aware.**

```js
// current (wrong on retina):
canvas.width  = w;
canvas.height = h;
drawCover(canvas.getContext("2d"), bitmap, w, h);

// fix:
const dpr = window.devicePixelRatio || 1;
canvas.width  = Math.round(w * dpr);
canvas.height = Math.round(h * dpr);
const ctx = canvas.getContext("2d");
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
drawCover(ctx, bitmap, w, h);
```

Hero background canvases appear blurry on retina displays. The same DPR pattern is used correctly in `EventCard`, `NewsCard`, and `MatchCard` — HeroSection was missed.

---

**2. `NewsSection` — unguarded destructure.**

```js
// current:
const [main, ...rest] = news;
// if (!main) return null;  ← commented out

// fix: uncomment the guard, or replace with:
if (!news?.length) return null;
```

If `getNews()` returns an empty array, `main` is `undefined` and `main.thumbnail_url` crashes the render.

---

**3. `VerticalTimeline` — blur manifest always empty.**

```js
// current (VerticalTimeline receives shaped events from shapeEvents(), which has no image_url field):
events.filter(ev => ev.image_url)  // ← always filters to []
  .map(ev => ({ url: ev.image_url, ... }))

// fix:
import { getAssetUrl } from "@/lib/directus";
events.filter(ev => ev.card_image)
  .map(ev => ({
    url: getAssetUrl(ev.card_image),
    type: "eventcard",
    width: 400, height: 280,
    naturalWidth:  ev.card_image?.width,
    naturalHeight: ev.card_image?.height,
  }))
```

The registration is currently a no-op. Blur still works in practice because `EventTimeline` (the desktop path inside the same `TimelineSection`) registers the same images via `getAssetUrl(ev.card_image)`, and `EventCard` uses that same URL as its lookup key. But if `VerticalTimeline` ever renders without `EventTimeline` having run first, eventcard blur will be missing.