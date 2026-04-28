# IPB-LSA Codebase Audit Report

**Date:** April 28, 2026  
**Auditor:** Senior Full-Stack Auditor  
**Scope:** Web app (Next.js), Dashboard (Next.js), Backend (Directus + PostgreSQL)

> **Legend:** Items without a badge are unresolved. ✅ = done. 🔄 = done in Wave 2 (current).

---

## Ranked Findings

### Critical

1. **No Admin Dashboard Implemented**
   - **Severity:** critical
   - **File:** `/dashboard/app/page.js` (entire app is default Next.js template)
   - **What:** Dashboard remains the default "Create Next App" template with no admin functionality
   - **Why it matters:** Administrators cannot manage events, matches, participants, or any content
   - **Fix:** Build full admin dashboard with CRUD operations for all entities

2. **Build Fails Due to ESLint Configuration** *(needs `package.json` + `.eslintrc`)*
   - **Severity:** critical
   - **File:** `/web/lib/directus.ts` (lines 436, 444)
   - **What:** ESLint errors for undefined TypeScript rules `@typescript-eslint/no-explicit-any`
   - **Why it matters:** Build process fails, cannot deploy
   - **Fix:** Install missing ESLint plugins or remove problematic rules

### High

3. **Pervasive Inline Styling Performance Issues**
   - **Severity:** high
   - **File:** `/web/app/events/[slug]/_components/tabs/MatchesTab.tsx` (771 lines, ~80% inline styles)
   - **What:** Massive component uses inline styles and `dangerouslySetInnerHTML` for CSS
   - **Why it matters:** Style recalculations on every render, poor maintainability
   - **Fix:** Convert to Tailwind classes and CSS modules

4. **No Test Coverage**
   - **Severity:** high
   - **Files:** All `.tsx`, `.ts` files
   - **What:** Zero unit, integration, or E2E tests
   - **Fix:** Add Jest/Vitest for unit tests, Playwright for E2E

### Medium

5. **REST Polling Temporary (WebSocket Planned)**
   - **Severity:** medium
   - **File:** `/web/app/events/[slug]/hooks/useMatchState.ts`
   - **What:** Polls every 10 seconds via REST; WebSocket replacement documented but not implemented
   - **Fix:** Implement WebSocket connection (hook design already supports easy swap)

6. **Long Component Files**
   - **Severity:** medium
   - **File:** `/web/app/events/[slug]/_components/tabs/MatchesTab.tsx` (771 lines)
   - **Fix:** Split into smaller components (MatchRow, ScoreDisplay, etc.)

7. **Missing Error Boundaries in Dashboard**
   - **Severity:** medium
   - **File:** `/dashboard/app/` (no ErrorBoundary usage)
   - **Fix:** Add ErrorBoundary components around major sections (blocked by #1)

### Low

8. **No Accessibility Features**
   - **Severity:** low
   - **Files:** All UI components
   - **Fix:** Add ARIA attributes, test with screen readers

9. **No Loading States for API Calls**
   - **Severity:** low
   - **File:** `/web/app/api/events/[slug]/matches/route.ts`
   - **Fix:** Add loading skeletons or spinners on the client

---

## Performance Audit

### Image Optimization

> ✅ **MatchesTab.tsx** — `Logo` and `OpenParticipants` converted (Wave 1)
> 🔄 **Wave 2** — All remaining `<img>` tags converted to `<Image />`:
> `MatchCard.tsx`, `MatchesPanels.tsx`, `ParticipantsTab.tsx`, `EventsTable.tsx`,
> `UniversityMarquee.tsx`, `StatCard.tsx`, `HeroSection.jsx`, `TimelineSection.jsx`

**⚠️ Required action:** Add Directus origin to `next.config.js`:
```js
images: {
  remotePatterns: [{ protocol: "http", hostname: "localhost", port: "6767" }]
}
```
Replace with your production Directus hostname for production builds.

### React Hook Dependency Bugs

> ✅ **MatchesTab.tsx** — `position` sort null guard (Wave 1)
> 🔄 **Wave 2** fixes:
> - **HeroSection.jsx** — `displayIdx` added to `[activeIdx, mounted]` deps
> - **NewsTab.tsx** — `COLUMNS` added to `[event.slug, page]` deps
> - **BlurOverlay.jsx** — `lift` wrapped in `useCallback`, added to both effect deps

### Remaining Performance Issues

10. **No Stale Data Warning**
    - **File:** `EventDetailClient.tsx` (line 48)
    - **What:** `lastUpdated` displayed but not compared to current time; polling can silently stall
    - **Fix:** If `now - lastUpdated > 60s`, show an error banner

11. **No Validation of Competition Category Format**
    - **File:** `directus.ts` (line 133)
    - **What:** `format_id` can be null for a match, breaks scoring silently
    - **Fix:** Require format selection; show validation error in dashboard

12. **Time Off By One Hour During DST Transitions** *(low — Jakarta doesn't observe DST)*
    - **File:** `scoreUtils.ts` (line 43)
    - **Fix:** Use UTC everywhere, format on client with explicit timezone

13. **Very Long Names Cause Layout Overflow**
    - **File:** `MatchesTab.tsx` (line 175)
    - **Fix:** Test with 100–200 char names; add `line-clamp-2`

---

## Resolved Findings (reference)

| Item | Fixed in |
|---|---|
| CORS blocks dashboard (`:3001`) | Wave 1 |
| Hardcoded secrets in docker-compose | Wave 1 |
| Silent API error handling (directus.ts, route.ts) | Wave 1 |
| JSON.parse crash on malformed DB data | Wave 1 |
| setState after unmount (useMatchState) | Wave 1 |
| No polling backoff / network recovery | Wave 1 |
| Position sort NaN when `position` is null | Wave 1 |
| `<img>` → `<Image />` in MatchesTab | Wave 1 |
| `<img>` → `<Image />` in all other components | Wave 2 |
| Hook dep bugs (HeroSection, NewsTab, BlurOverlay) | Wave 2 |
| HeroSection code cleanup | Wave 2 |

---

## Recommended Fix Order (remaining)

**Wave 3 — ESLint build fix**
- Need `package.json` + ESLint config file

**Wave 4 — Polish & Stability**
- `EventDetailClient.tsx` — debounce ResizeObserver thrashing
- `directus.ts` — add `width/height/quality/format=webp` to `getAssetUrl()` query params
- Dynamic imports for `MatchesTab` and `NewsTab`
- Stale data warning (#10 above)
- `format_id` null validation (#11 above)

**Wave 5 — Planned Upgrades**
- Implement WebSocket realtime system (architecture ready in hook)
- Add test suite (unit, integration, E2E)
- Add accessibility features (ARIA, keyboard navigation)
- Build admin dashboard