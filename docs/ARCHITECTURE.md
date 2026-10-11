# CosmoVision — Architecture

## Stack

React 19 + TypeScript (strict) + Vite 8 · Three.js via React Three Fiber + Drei ·
Zustand (single store) · Recharts (comparison chart) · Vitest + Puppeteer.

No post-processing passes: glow is done with additive sprites and custom point
shaders, which keeps the render loop to one pass and stays smooth on integrated
GPUs.

## Folder map

```
src/
  App.tsx                  UI composition, panels, boot overlay, live region
  main.tsx                 React root; exposes window.__cosmovision for e2e
  types.ts                 Shared domain types (CelestialObject, Fact, Tour…)
  data/
    celestialObjects.ts    17-object catalogue + WORLD scale constants
    sources.ts             Source registry (NASA, IAU…)
    galaxyPresets.ts       Galaxy params, themes, quality profiles
    tours.ts               Discovery Mode tours
  lib/                     Pure helpers: math, search, formatting, storage
  navigation/
    cameraMath.ts          Pure spherical-camera integration (unit-tested)
    history.ts             Location history (past/present) for Back/Home
  scene/                   Everything inside <Canvas>
    SceneRoot.tsx          Canvas, WebGL detection, error boundary
    CameraRig.tsx          Input handling + damped focus springs
    SolarSystem.tsx        Sun, planets, moons, belts, orbits, trails
    MilkyWay.tsx           Galaxy + nebula + core glow, fades near the system
    Starfield.tsx          Background stars + glints
    SimulationDriver.tsx   Ticks the clock; publishes simDays at ~8 Hz
    PerfMonitor.tsx        FPS/draw-call sampling at 2 Hz → store
    registry.ts            id → live world position bridge (no React re-renders)
    textures.ts            Seeded canvas textures (planets, rings, glows)
    galaxyGenerator.ts     Seeded particle buffers (galaxy/nebula/starfield)
    shaders.ts             Point-cloud vertex/fragment shaders + uniforms
  simulation/
    clock.ts               Deterministic SimulationClock (days per second)
    orbits.ts              Angle/position math for the compressed orbits
  store/useAppStore.ts     One Zustand store; localStorage persistence
  styles/global.css        Design system (dark HUD, panels, a11y focus rings)
  ui/                      All DOM overlays (panels, search, help, top bar…)
tests/
  unit/*.test.ts           Vitest, node environment, pure modules only
  e2e/run.mjs              Boots vite preview + headless Chrome (SwiftShader)
```

## The render-loop ↔ React boundary

React state changes are rare; the render loop runs at 60+ Hz. The bridge:

1. **`registry.ts`** — scene nodes register `getPosition(out)` callbacks keyed by
   object id. Camera focus, labels and pick logic read *live* positions without
   re-rendering React.
2. **`cameraCommands`** — UI buttons and keyboard shortcuts ask the camera to
   orbit/zoom/reset through a tiny imperative handle; the rig registers itself.
3. **Store publishes at low rate** — `SimulationDriver` mirrors `simDays` into
   the store ~8× per second (enough for the date readout); `PerfMonitor` samples
   renderer info at 2 Hz. Everything else (positions, uniforms) updates inside
   `useFrame`.

## Camera

Spherical orbit `(theta, phi, radius)` around a **damped focus point** with
separate damping constants for target (2.6), radius (2.4) and angles (6). Focus
transitions are therefore frame-rate independent: a galaxy→planet glide takes
~3 s of smooth travel regardless of FPS. Constraints:

- `phi ∈ [0.08, π−0.08]` — never flips over the poles.
- `radius ≥ minDistanceFor(object)` — the camera can never enter a body.
- Pan is clamped to ±12 units and disabled while focused.
- Click vs. drag is separated by a 6 px pointer-travel threshold.

## Selection & navigation

`Selectable` wraps every body in an invisible raycast target
(`colorWrite=false, depthWrite=false`; belts use a torus band so the hollow
centre stays clickable). Single click selects, double click focuses. Focus goes
through the store: `focusObject` pushes onto the history stack, updates
breadcrumbs, marks the journal entry, and opens the info panel. Search, tours,
related-object chips and breadcrumbs all use the same pipeline, so Back/Home
always work.

## Quality tiers

`low | medium | high` scale device pixel ratio (1 / 1.5 / 2), galaxy particle
count (45% / 75% / 100%), nebula density and belt instance counts. Labels and
trails auto-disable on `low`.

## Persistence

`localStorage` (debounced 400 ms): settings (`cosmovision.settings.v3`), journal
(`…journal.v3`), recent objects, galaxy params + theme. Never leaves the
browser; unavailable storage (private mode) degrades silently.

## Accessibility

- All interactions reachable by keyboard; shortcuts documented in-app (`?`).
- ARIA roles on panels/dialogs, focus-visible outlines, `aria-pressed` toggles.
- Visually-hidden live region announces selection ("Mars selected. Terrestrial
  planet.").
- `<noscript>` table of all objects with source links.
- WebGL failure → `WebGLFallback` data view (same facts, same sources).
- `prefers-reduced-motion` and an in-app reduced-motion toggle.

## Testing

- **Unit (Vitest, node):** math, orbits, camera integration, history, search,
  catalogue integrity (ids, parents, sources, distances), clock, formatting,
  galaxy generator determinism. 77 tests.
- **E2E (Puppeteer + system Chrome/Edge, SwiftShader WebGL):** boots the
  production build, waits for the loading overlay to clear, verifies the canvas,
  searches → focuses Mars, opens the galaxy panel, toggles simulation with Space,
  and captures README screenshots. Runs headless on any machine with Chrome.
