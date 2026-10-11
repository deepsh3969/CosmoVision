# Changelog

## 3.0.0 — Full rewrite (React + Three.js)

CosmoVision was rebuilt from a vanilla-JS prototype into a typed React
application with a single continuous galaxy → solar-system scene.

### Added

- Procedural Milky Way (seeded spiral generator, differential rotation in the
  vertex shader, nebula haze, core glow) with the Solar System embedded in the
  disc and distance-based fade between scale regimes.
- Solar System: Sun, 8 planets (procedural textures, Earth clouds + atmosphere,
  Saturn/Uranus rings with radial UVs), 5 moons, instanced main/Kuiper belts,
  orbit paths and optional trails — all driven by a deterministic simulation
  clock (0.1–1000 d/s).
- Frame-rate-independent camera: spherical orbit, damped focus transitions that
  can never enter a body, pan clamping, 6 px click-vs-drag threshold, pinch
  zoom.
- Source-backed catalogue (17 objects) with precision labels
  (measured/approximate/illustrative/procedural) and NASA/IAU citations; Science
  mode surfaces provenance per fact.
- Search (`/`), breadcrumbs, navigation history (Back/Home), category filters,
  Discovery tours, object comparison (Recharts), journal with bookmarks/notes,
  galaxy parameter explorer (10 sliders, 6 presets, 6 themes), performance
  panel (real FPS/draw calls), settings (quality tiers, labels, trails, reduced
  motion).
- Full keyboard control set, ARIA roles, live-region announcements, WebGL
  fallback data view, `<noscript>` object table.
- Persistence of settings/journal/recents/galaxy params in localStorage.
- 77 Vitest unit tests (math, orbits, camera integration, history, search,
  catalogue integrity, clock, formatting, generator determinism) and a
  Puppeteer e2e suite that boots the production build headless and captures
  screenshots.

### Changed

- Build: Vite 8 + strict TypeScript; production bundle split into
  three/charts/app chunks.
- Dev server on port 4173; `npm run verify` runs typecheck + tests + build.

### Removed (legacy v2 features, preserved on branch `legacy/v2`)

- MediaPipe hand-gesture control and webcam tracking.
- Procedural WebAudio ambience and music-reactive effects.
- Spacecraft flight mode, wormholes, space stations, minimap, post-processing
  stack (bloom/DoF), and the old multi-file HUD.
- The vanilla-JS module tree (`js/`), import-map index and `scripts/build.mjs`
  pipeline.

### Data honesty

No AI generation is used anywhere. Measurements cite NASA Planetary Fact
Sheets, NASA Solar System Exploration, NASA/STScI Hubble heritage and the IAU;
orbit compression and procedural rendering are documented in `docs/SCIENCE.md`.
