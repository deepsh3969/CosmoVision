export type ObjectCategory = 'galaxy' | 'system' | 'star' | 'planet' | 'moon' | 'belt';

export type DataPrecision = 'measured' | 'approximate' | 'illustrative' | 'procedural';

export type SourceId =
  | 'nasa-fact-sheet'
  | 'nasa-solar-system'
  | 'nasa-hubble'
  | 'iau'
  | 'cosmovision-docs';

export type TextureKind =
  | 'rocky-grey'
  | 'moon'
  | 'mars'
  | 'venus'
  | 'earth'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune'
  | 'io'
  | 'europa'
  | 'titan';

export interface Fact {
  label: string;
  value: string;
  precision: DataPrecision;
  source: SourceId;
}

export interface Source {
  id: SourceId;
  name: string;
  url: string;
  note: string;
}

/** Orbital parameters. `real*` fields are physical; `visual*` fields drive the compressed scene. */
export interface OrbitParams {
  realSemiMajorAU: number;
  realPeriodDays: number;
  eccentricity: number;
  inclinationDeg: number;
  /** Orbit radius in scene units (compressed — see docs/SCIENCE.md). */
  visualRadius: number;
  /** Orbital period in simulated days used for animation (non-linear compression). */
  visualPeriodDays: number;
}

export interface RingSpec {
  inner: number;
  outer: number;
  color: string;
  faint?: boolean;
}

export interface CelestialObject {
  id: string;
  name: string;
  category: ObjectCategory;
  typeLabel: string;
  parent: string | null;
  description: string;
  color: string;
  /** Mean geometric / equatorial diameter in km where a solid body exists. */
  diameterKm?: number;
  /** Rendered radius in scene units (visualization, not to scale). */
  visualRadius: number;
  facts: Fact[];
  interesting: string[];
  orbit?: OrbitParams;
  texture?: TextureKind;
  axialTiltDeg?: number;
  /** Real sidereal rotation period in hours (negative = retrograde). */
  rotationPeriodHours?: number;
  /** Visual spin rate (radians per simulated day) — animation only. */
  visualSpinRate?: number;
  ring?: RingSpec;
  /** World-space anchor for objects that do not orbit the Sun (galaxy, system marker). */
  worldPosition?: [number, number, number];
  /** `real-data` = body exists with source-backed measurements. `procedural-representation` = illustration. */
  provenance: 'real-data' | 'procedural-representation';
  sources: SourceId[];
  tags: string[];
}

export type QualityTier = 'low' | 'medium' | 'high';

export type PanelId =
  | 'info'
  | 'search'
  | 'galaxy'
  | 'compare'
  | 'journal'
  | 'tour'
  | 'settings'
  | 'performance'
  | 'help';

export interface TourStep {
  objectId: string;
  title: string;
  blurb: string;
}

export interface Tour {
  id: string;
  name: string;
  subtitle: string;
  steps: TourStep[];
}

export interface JournalEntry {
  objectId: string;
  visitedAt: number;
  note?: string;
  bookmarked: boolean;
}

export interface GalaxyParams {
  particles: number;
  radius: number;
  armCount: number;
  armTightness: number;
  armSpread: number;
  coreRadius: number;
  particleSize: number;
  rotationSpeed: number;
  coreIntensity: number;
  energy: number;
}

export interface GalaxyTheme {
  id: string;
  label: string;
  coreColor: string;
  armColor: string;
  edgeColor: string;
  dustColor: string;
  nebulaColor: string;
}

export interface PerfSnapshot {
  fps: number;
  frameMs: number;
  drawCalls: number;
  triangles: number;
  points: number;
  geometries: number;
  textures: number;
  dpr: number;
}

export type WebGLStatus = 'pending' | 'ok' | 'failed';
