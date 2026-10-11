import { clamp, gaussian, hexToRgb, mixRgb, mulberry32 } from '../lib/math';
import type { GalaxyParams, GalaxyTheme } from '../types';

export interface ParticleBuffers {
  position: Float32Array;
  color: Float32Array;
  size: Float32Array;
  seed: Float32Array;
  radius: Float32Array;
  alpha: Float32Array;
  count: number;
}

const GENERATION_SEED = 20261004;

function createBuffers(count: number): {
  buffers: ParticleBuffers;
  write: (x: number, y: number, z: number, color: { r: number; g: number; b: number }, size: number, radius: number, alpha: number) => void;
} {
  const buffers: ParticleBuffers = {
    position: new Float32Array(count * 3),
    color: new Float32Array(count * 3),
    size: new Float32Array(count),
    seed: new Float32Array(count),
    radius: new Float32Array(count),
    alpha: new Float32Array(count),
    count,
  };
  let index = 0;
  const write = (
    x: number,
    y: number,
    z: number,
    color: { r: number; g: number; b: number },
    size: number,
    radius: number,
    alpha: number,
  ): void => {
    if (index >= count) return;
    const i3 = index * 3;
    buffers.position[i3] = x;
    buffers.position[i3 + 1] = y;
    buffers.position[i3 + 2] = z;
    buffers.color[i3] = color.r / 255;
    buffers.color[i3 + 1] = color.g / 255;
    buffers.color[i3 + 2] = color.b / 255;
    buffers.size[index] = size;
    buffers.seed[index] = (index * 0.6180339887498949) % 1;
    buffers.radius[index] = radius;
    buffers.alpha[index] = alpha;
    index += 1;
    buffers.count = index;
  };
  return { buffers, write };
}

/**
 * Deterministic spiral galaxy: seeded RNG, Gaussian scatter, radial falloff and
 * differential rotation resolved in the vertex shader.
 * Ported from CosmoVision v2 (`js/galaxy.js`) and typed for v3.
 */
export function generateGalaxy(
  params: GalaxyParams,
  theme: GalaxyTheme,
  particleScale = 1,
): ParticleBuffers {
  const random = mulberry32(GENERATION_SEED);
  const total = Math.max(2000, Math.round(clamp(params.particles, 4000, 60000) * particleScale));
  const radius = params.radius;
  const armCount = Math.max(2, Math.round(params.armCount));
  const tightness = params.armTightness;
  const spreadBase = params.armSpread;
  const coreRadius = params.coreRadius;

  const spiralCount = Math.round(total * 0.66);
  const bulgeCount = Math.round(total * 0.11);
  const dustCount = Math.round(total * 0.13);
  const floaterCount = Math.max(0, total - spiralCount - bulgeCount - dustCount);

  const coreColor = hexToRgb(theme.coreColor);
  const armColor = hexToRgb(theme.armColor);
  const edgeColor = hexToRgb(theme.edgeColor);
  const dustColor = hexToRgb(theme.dustColor);

  const { buffers, write } = createBuffers(total);

  const colorForRadius = (t: number) => {
    const warm = mixRgb(coreColor, armColor, clamp(t / 0.3, 0, 1));
    return mixRgb(warm, edgeColor, clamp((t - 0.55) / 0.45, 0, 1));
  };

  const jitter = (color: { r: number; g: number; b: number }, amount: number) => {
    const k = 1 - amount / 2 + random() * amount;
    return {
      r: clamp(color.r * k + (random() - 0.5) * 8, 0, 255),
      g: clamp(color.g * k + (random() - 0.5) * 8, 0, 255),
      b: clamp(color.b * k + (random() - 0.5) * 8, 0, 255),
    };
  };

  for (let i = 0; i < spiralCount; i += 1) {
    const t = Math.pow(random(), 1.35);
    const r = t * radius;
    const arm = i % armCount;
    const branch = (arm / armCount) * Math.PI * 2;
    const spin = r * (0.2 + tightness * 0.75);
    const angle = branch + spin;
    const scatter = spreadBase * (0.25 + t * 0.85);
    const x = Math.cos(angle) * r + gaussian(random) * scatter;
    const z = Math.sin(angle) * r + gaussian(random) * scatter;
    const thickness = (0.34 + t * 0.9) * (1 - t * 0.55);
    const y = gaussian(random) * thickness;
    write(x, y, z, jitter(colorForRadius(t), 0.3), 0.4 + random() * 0.95, r, 1);
  }

  for (let i = 0; i < bulgeCount; i += 1) {
    const t = Math.pow(random(), 2.4);
    const r = t * coreRadius * 1.8;
    const dir = { x: gaussian(random), y: gaussian(random) * 0.55, z: gaussian(random) };
    const len = Math.hypot(dir.x, dir.y, dir.z) || 1;
    write(
      (dir.x / len) * r,
      (dir.y / len) * r,
      (dir.z / len) * r,
      jitter(colorForRadius(t * 0.35), 0.22),
      0.35 + random() * 1.0,
      r,
      0.85,
    );
  }

  for (let i = 0; i < dustCount; i += 1) {
    const t = 0.25 + Math.pow(random(), 1.2) * 0.75;
    const r = t * radius * 1.02;
    const arm = i % armCount;
    const branch = (arm / armCount) * Math.PI * 2 + 0.42;
    const spin = r * (0.2 + tightness * 0.75);
    const angle = branch + spin;
    const scatter = spreadBase * (0.6 + t * 1.5);
    const x = Math.cos(angle) * r + gaussian(random) * scatter;
    const z = Math.sin(angle) * r + gaussian(random) * scatter;
    const y = gaussian(random) * (0.5 + t * 0.7);
    write(x, y, z, jitter(dustColor, 0.35), 1.4 + random() * 2.6, r, 0.2);
  }

  for (let i = 0; i < floaterCount; i += 1) {
    const t = random();
    const r = radius * (0.45 + t * 1.1);
    const angle = random() * Math.PI * 2;
    const x = Math.cos(angle) * r + gaussian(random) * 1.4;
    const z = Math.sin(angle) * r + gaussian(random) * 1.4;
    const y = gaussian(random) * (1.4 + t * 3.2);
    write(x, y, z, jitter(colorForRadius(0.3 + t * 0.6), 0.4), 0.4 + random() * 0.9, r, 0.75);
  }

  return buffers;
}

/** Layered volumetric-looking haze around the galactic disc. */
export function generateNebula(theme: GalaxyTheme, radius: number, densityScale = 1): ParticleBuffers {
  const random = mulberry32(GENERATION_SEED + 7);
  const count = Math.max(64, Math.round(1400 * densityScale));
  const { buffers, write } = createBuffers(count);
  const nebulaColor = hexToRgb(theme.nebulaColor);
  const coreColor = hexToRgb(theme.coreColor);

  for (let i = 0; i < count; i += 1) {
    const t = Math.pow(random(), 1.4);
    const r = t * radius * 1.15;
    const angle = random() * Math.PI * 2;
    const x = Math.cos(angle) * r + gaussian(random) * radius * 0.22;
    const y = gaussian(random) * (1.2 + t * 3.4);
    const z = Math.sin(angle) * r + gaussian(random) * radius * 0.22;
    const tint = mixRgb(nebulaColor, coreColor, clamp(1 - t, 0, 1) * 0.35);
    write(x, y, z, tint, 18 + random() * 54, r, 0.018 + random() * 0.032);
  }
  return buffers;
}

/** Deep-field background: static stars on a giant sphere, colored by a blackbody-ish ramp. */
export function generateStarfield(count: number, seed = 9911): ParticleBuffers {
  const random = mulberry32(seed);
  const { buffers, write } = createBuffers(count);
  const warm = { r: 255, g: 226, b: 190 };
  const mid = { r: 255, g: 246, b: 235 };
  const cool = { r: 176, g: 205, b: 255 };

  for (let i = 0; i < count; i += 1) {
    const u = random() * 2 - 1;
    const theta = random() * Math.PI * 2;
    const s = Math.sqrt(Math.max(0, 1 - u * u));
    const r = 900 + random() * 500;
    const x = s * Math.cos(theta) * r;
    const y = u * r * 0.75;
    const z = s * Math.sin(theta) * r;
    const heat = random();
    const color = heat < 0.3 ? mixRgb(warm, mid, heat / 0.3) : mixRgb(mid, cool, (heat - 0.3) / 0.7);
    const bright = 0.35 + Math.pow(random(), 3) * 0.65;
    write(
      x,
      y,
      z,
      { r: color.r * bright, g: color.g * bright, b: color.b * bright },
      0.6 + random() * 1.8,
      r,
      0.35 + random() * 0.65,
    );
  }
  return buffers;
}

/** Sparse bright glints (foreground stars) rendered as billboards. */
export function generateGlints(count: number, seed = 4242): { positions: Float32Array; colors: Float32Array } {
  const random = mulberry32(seed);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const u = random() * 2 - 1;
    const theta = random() * Math.PI * 2;
    const s = Math.sqrt(Math.max(0, 1 - u * u));
    const r = 700 + random() * 300;
    positions[i * 3] = s * Math.cos(theta) * r;
    positions[i * 3 + 1] = u * r * 0.7;
    positions[i * 3 + 2] = s * Math.sin(theta) * r;
    const heat = random();
    colors[i * 3] = 1;
    colors[i * 3 + 1] = 0.92 + heat * 0.06;
    colors[i * 3 + 2] = 0.82 + heat * 0.18;
  }
  return { positions, colors };
}
