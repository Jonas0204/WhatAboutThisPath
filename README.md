# WhatAboutThisPath — Faroe Islands Hiking Track Viewer

A static, client-side React app for exploring 32 Faroe Islands hiking GPX tracks (from two separate guidebook collections) on a 3D terrain map, with live geolocation to help plan hikes, plus 211 points of interest.

## Setup

1. Install dependencies: `npm install`
2. Get a free MapTiler API key at https://www.maptiler.com/ (used for the outdoor map style and terrain data).
3. Copy `.env.example` to `.env` and set `VITE_MAPTILER_KEY=<your key>`.
4. `npm run dev`

## GPX data

Two separate guidebook GPX collections feed the track list:

- `Faeroeer-GPS-Tracks-1/` — 27 tracks, one file per hike, descriptive filenames.
- `it-faeroeer-2023-gesamt_gpx/` — a second book's collection: 5 more hikes (generic filenames like `tramps_1.gpx`; a cleaner display name is pulled from each GPX's own `<trk><name>` instead) plus two non-hike waypoint files (`divers.gpx`, `sights.gpx` — practical tips and sights, 211 points total, see "Points of interest" below).

`scripts/convertGpx.mjs` reads both, checks for geographic duplicates between them (bounding-box overlap + start-point distance — since neither collection has internal duplicates, but the two together might), and writes `public/data/` (`tracks-index.json` + one `.geojson` per track + `poi.json`). One duplicate was found and is explicitly excluded: `it-faeroeer-2023-tramps_3.gpx` (99% bbox overlap + ~20m start-point match with `04-wanderung-slaettaratindur-cs` — the same Slættaratindur summit hike, just recorded one-way). Three other partial overlaps (`tramps_1`, `tramps_2`, `tramps_4` — 36-94% bbox overlap with existing tracks, but different total distances) were kept as separate tracks since a different distance suggests a different route variant rather than a true duplicate — re-run the geographic comparison yourself if you add more GPX files and want to check for overlaps.

Re-run the script only if the source GPX files change:

```
node scripts/convertGpx.mjs
```

The generated `public/data/` output is committed to git so `npm run dev` works without a build step.

## Points of interest

`divers.gpx` and `sights.gpx` are waypoint-only files (no track line) — practical tips and sights from the second guidebook, 211 points total. They don't fit the track data model (no distance/duration/elevation), so they're a separate layer: toggle "Show points of interest" in Settings to show them on the map (hidden below zoom 10 to avoid cluttering the whole-archipelago overview), click a point for a popup with its name.

## Trip duration / difficulty data

`src/data/trackMeta.json` holds hand-entered info (title, region, difficulty, duration, description) sourced from a physical hiking guidebook, keyed by track id (see `public/data/tracks-index.json` for the id/sourceFile mapping). Any track missing from this file falls back to a distance/elevation-based duration estimate (Naismith's rule) and a placeholder description.

## Scripts

- `npm run dev` starts the development server
- `npm run build` builds the production bundle
- `npm run preview` serves the production build locally

## Deployment (GitHub Pages)

This is a fully static site, deployed via the included GitHub Actions workflow (`.github/workflows/deploy.yml`), which builds the app and publishes `dist/` to GitHub Pages on every push to `main`.

**One-time repo setup** (do these on github.com — I can't do these steps from here, they require your account):

1. **Repo must be public** (or you're on a paid plan for private Pages). Settings → General → scroll to "Danger Zone" → Change visibility → Public.
2. **Add repo secrets**: Settings → Secrets and variables → Actions → New repository secret:
   - `VITE_MAPTILER_KEY` — your MapTiler key (same value as your local `.env`).
   - `VITE_SITE_PASSWORD_HASH` — optional, see "Password-protecting the site" below. Leave unset for an open site.
3. **Enable Pages via Actions**: Settings → Pages → under "Build and deployment", set Source to **GitHub Actions** (not "Deploy from a branch").
4. Push to `main` (or re-run the workflow manually from the Actions tab) — the site will be live at `https://jonas0204.github.io/WhatAboutThisPath/` a minute or two after the workflow finishes.

The app is already configured for this: `vite.config.js` sets `base: '/WhatAboutThisPath/'` for production builds (so built asset/fetch URLs resolve under the Pages subpath — `npm run dev` still serves from `/` as normal), and all internal `fetch()` calls use `import.meta.env.BASE_URL` instead of hardcoded root paths.

If you ever rename the repo, update `BASE_PATH` in `vite.config.js` to match.

## Password-protecting the site

Optional, off by default. This is a **visitor-friendliness gate, not real security** — because the whole app is static/client-side, the check inevitably ships inside the built JS bundle, so anyone who opens devtools can find or brute-force it. Use it to keep a shared link from being stumbled on by search engines or randoms, not to protect anything sensitive.

1. Generate a hash: `node scripts/hashPassword.mjs "your-password"`
2. Set it as the `VITE_SITE_PASSWORD_HASH` GitHub Actions secret (or in your local `.env` to test a production build locally).
3. Leave the secret unset/empty to disable the gate entirely.

Behavior: disabled automatically in `npm run dev` (never prompts locally). Once someone enters the correct password on the deployed site, it's remembered in that browser's `localStorage` — they won't be asked again unless they clear site data or the password is changed (which invalidates the old cached unlock automatically, since the check compares against the current hash).

## Offline support & caching

The app is a PWA (via `vite-plugin-pwa`). Caching happens at three levels:

1. **Tracks & metadata** (`public/data/*`): precached unconditionally at install time — all 32 tracks, their geometry, and descriptions work offline regardless of what's been viewed.
2. **Map tiles** (MapTiler style/tiles/sprites/glyphs): cached with a `CacheFirst` service-worker route as you browse. Opening a hike once while online caches its area. The Settings panel also has a **"Download whole islands for offline use"** button, which pans the live map through a grid of viewpoints across the whole archipelago (at zoom 8, 10, and 12 — ~336 stops, a few minutes) so tile requests for the entire island chain get cached in one pass — no manual tile z/x/y math needed, it just rides on the same `CacheFirst` route (`src/lib/prefetchTiles.js`). This does use some of MapTiler's free-tier monthly tile quota each time it's run.
   The style's own tile sources (outdoor/contours/terrain-rgb) cap at zoom 14, but z14 alone accounts for ~4,600+ of the total stops (each deeper zoom level roughly quadruples tile density) regardless of what else is included — a ~50-60 minute run. The prefetch deliberately caps at z12 to keep this to a few minutes; **zooming in further than z12, in an area you haven't separately browsed while online, will show blank tiles until you're back online.** Bump `PREFETCH_ZOOMS` in `src/components/MapView.jsx` if you want more offline detail at the cost of a much longer run.
   Note: because it jumps the camera quickly between viewpoints, you may occasionally see a harmless console warning about a service-worker tile request being interrupted — it doesn't stop the download or affect the app.
3. **Weather**: two layers — an in-app `localStorage` cache keyed per-trailhead coordinate with a 30-minute TTL (`src/lib/weatherCache.js`), and a `NetworkFirst` service-worker route as an offline fallback (prefers fresh data online, serves the last-known forecast offline). Weather is cached **per trailhead**, not per-island — the Faroes' weather genuinely varies from one coast to another, so each hike gets its own forecast/cache entry.

An "Offline" badge appears in the top bar when the browser has no connection. Note: the service worker only activates in a production build (`npm run build && npm run preview`), not in `npm run dev`.

## Weather

Trailhead forecasts come from [Open-Meteo](https://open-meteo.com/) (free, no API key). The detail panel shows a 6-day forecast and today's sunrise/sunset for the selected track's starting point, plus a warning if the estimated hike duration is close to or exceeds today's remaining daylight.

## Map-linked track list

The sidebar only lists tracks whose trailhead is within the current map view — zoom or pan and the list updates to match (`src/components/TrackSidebar.jsx`, using MapLibre's `LngLatBounds.contains`). Zoom out to see all 32 again.

## Getting to a trailhead

Each track's detail panel shows the straight-line distance to your current location and a **"Directions & drive time in Google Maps"** link (`src/components/DirectionsToTrailhead.jsx`). We deliberately don't estimate driving time ourselves — Faroese roads wind through fjords and single-lane sub-sea tunnels, so a straight-line-based estimate would be misleading — Google Maps already knows the real road network.

"Your current location" can come from real GPS or a manual override (Settings → Your location): pick a preset hub (airport, Tórshavn, etc.) or "Pick on map" to click a point. This matters if your device's real GPS resolves somewhere irrelevant (e.g. testing from abroad) — override it so distance/directions/sorting are based on wherever you actually mean.

## Mobile

Below 900px width, the layout stacks into top bar / sidebar / map / detail panel. Two mobile-specific fixes worth knowing about if you touch the layout again:

- `#app` uses `100dvh` (with a `100vh` fallback) instead of plain `100vh` — mobile browsers resize their address bar as you scroll, and plain `vh` recalculates against that, causing a jumpy layout. `html, body` also get `overflow: hidden` and `overscroll-behavior: none` so only the intended inner panels (sidebar list, detail panel) scroll — without this, the whole page could scroll/rubber-band behind the fixed layout, which is what caused the reported "glitching while scrolling."
- Grid rows in the mobile media query use explicit `minmax(...)` instead of `auto`, and `.track-sidebar`/`.track-detail`/`.app-layout__main` all get `min-height: 0`. Without this, a scrollable flex child's _content_ height (e.g. all 32 list items) can push the CSS grid row taller than its intended `max-height` clamp — a common grid/flex interaction gotcha.
- The empty-state detail panel (`.track-detail--empty`) collapses to a thin strip on mobile instead of reserving ~34vh for a single placeholder line, so the map gets the space back until a track is actually selected.

Verified with real touch-drag simulation (Chromium's CDP `Input.dispatchTouchEvent`, not just mouse/viewport emulation): a swipe on the sidebar list scrolls the list while the document itself stays at `scrollTop: 0`, and a swipe on the map pans it without any page-level scroll.

## Performance notes

- **Geolocation updates are throttled** (`src/hooks/useGeolocation.js`): a new position is only accepted if ≥3s elapsed or the device moved ≥8m, so GPS jitter doesn't trigger constant re-renders while stationary.
- **Map layers don't thrash on position updates**: `MapView` receives the raw, rarely-changing track list (id/title/startPoint only) for its trailhead/track-line layers, while the distance-to-you figures shown in the sidebar are computed separately (`src/lib/distanceFromUser.js`). This means a geolocation tick only ever moves the "you are here" marker — it never re-writes the trailhead or track-line map sources.
- **`TrackListItem` is memoized** so typing in the search box doesn't re-render the other 26 cards.
- **Checking it yourself**: in a dev build (`npm run dev`), the app exposes two dev-only diagnostics on `window`:
  - `window.__mapSetDataCounts` — how many times each map source (`trailheads`, `all-tracks`, `selected-track`) has been rewritten. This should stay flat while your position updates, and only increase when the track list loads or you change track/settings.
  - `window.__profilerLog` — raw entries from React's `Profiler` API (wrapping `MapView` and `TrackSidebar`, see `src/components/DevProfiler.jsx`), useful for inspecting render counts/durations in the console or via Playwright. Neither of these ships in production builds.
