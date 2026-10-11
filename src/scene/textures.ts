import * as THREE from 'three';

import type { TextureKind } from '../types';

/**
 * Procedural, licence-free planet textures painted on canvas at boot.
 * The noise lattice wraps in X so equirectangular maps have no seam.
 * Origin: written for CosmoVision (ported from the v2 vanilla build). License: MIT (project).
 */

function hash(x: number, y: number, seed: number): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

const wrap = (i: number, period: number): number => ((i % period) + period) % period;

function valueNoise(x: number, y: number, seed: number, period: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const x0 = wrap(ix, period);
  const x1 = wrap(ix + 1, period);
  const a = hash(x0, iy, seed);
  const b = hash(x1, iy, seed);
  const c = hash(x0, iy + 1, seed);
  const d = hash(x1, iy + 1, seed);
  return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
}

function fbm(x: number, y: number, seed: number, octaves = 4, period = 8): number {
  let value = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o += 1) {
    value += amp * valueNoise(x * freq, y * freq, seed + o * 131, period * freq);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return value / norm;
}

const textureCache = new Map<string, THREE.CanvasTexture>();
const liveTextures = new Set<THREE.CanvasTexture>();

function paint(
  width: number,
  height: number,
  fill: (data: Uint8ClampedArray, w: number, h: number) => void,
  key: string,
): THREE.CanvasTexture {
  const cached = textureCache.get(key);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable — procedural textures cannot be generated.');
  const image = ctx.createImageData(width, height);
  fill(image.data, width, height);
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  textureCache.set(key, texture);
  liveTextures.add(texture);
  return texture;
}

const mix = (a: number, b: number, t: number): number => a + (b - a) * t;
const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

function bands(u: number, v: number, count: number, warp: number, seed: number): number {
  const w = (fbm(u * 6, v * 3, seed, 3, 6) - 0.5) * warp;
  return Math.sin((v + w) * Math.PI * count);
}

type Crater = [number, number, number, number];

function craterShade(px: number, py: number, craters: Crater[]): number {
  let shade = 0;
  for (const [cx, cy, r, depth] of craters) {
    const d = Math.hypot(px - cx, py - cy) / r;
    if (d < 1.18) {
      if (d < 0.78) shade -= depth * (1 - d / 0.78);
      else if (d < 1.02) shade += depth * 0.85 * (1 - Math.abs(d - 0.9) / 0.12);
    }
  }
  return shade;
}

function rocky(
  seed: number,
  base: [number, number, number],
  width: number,
  height: number,
  key: string,
  craterCount: number,
  maria: boolean,
): THREE.CanvasTexture {
  return paint(
    width,
    height,
    (data, w, h) => {
      const craters: Crater[] = [];
      let s = seed;
      const rand = (): number => {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        return s / 4294967296;
      };
      for (let i = 0; i < craterCount; i += 1) {
        craters.push([rand() * w, rand() * h, 2 + rand() * rand() * 16, 0.1 + rand() * 0.22]);
      }
      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
          const u = x / w;
          const v = y / h;
          let n = fbm(u * 8, v * 6, seed, 5, 8);
          if (maria) {
            const dark = fbm(u * 3, v * 2.2, seed + 999, 3, 3);
            if (dark > 0.58) n -= (dark - 0.58) * 1.6;
          }
          n += craterShade(x, y, craters);
          const i = (y * w + x) * 4;
          data[i] = clamp01((base[0] / 255) * (0.55 + n)) * 255;
          data[i + 1] = clamp01((base[1] / 255) * (0.55 + n)) * 255;
          data[i + 2] = clamp01((base[2] / 255) * (0.55 + n)) * 255;
          data[i + 3] = 255;
        }
      }
    },
    key,
  );
}

type RGB = [number, number, number];

function gasGiant(
  seed: number,
  palette: RGB[],
  count: number,
  warp: number,
  spot: { u: number; v: number; color: RGB } | null,
  width: number,
  height: number,
  key: string,
): THREE.CanvasTexture {
  return paint(
    width,
    height,
    (data, w, h) => {
      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
          const u = x / w;
          const v = y / h;
          const t = bands(u, v, count, warp, seed);
          const idx = clamp01(t * 0.5 + 0.5) * (palette.length - 1);
          const i0 = Math.floor(idx);
          const f = idx - i0;
          const c0 = palette[i0];
          const c1 = palette[Math.min(i0 + 1, palette.length - 1)];
          let r = mix(c0[0], c1[0], f);
          let g = mix(c0[1], c1[1], f);
          let b = mix(c0[2], c1[2], f);
          const grain = (fbm(u * 18, v * 24, seed + 7, 3, 18) - 0.5) * 26;
          r += grain;
          g += grain;
          b += grain;
          if (spot) {
            const dx = Math.abs(((u - spot.u + 1.5) % 1) - 0.5) * 2.4;
            const dy = (v - spot.v) * 4.2;
            const d = dx * dx + dy * dy;
            if (d < 1) {
              const k = (1 - d) * 0.9;
              r = mix(r, spot.color[0], k);
              g = mix(g, spot.color[1], k);
              b = mix(b, spot.color[2], k);
            }
          }
          const i = (y * w + x) * 4;
          data[i] = clamp01(r / 255) * 255;
          data[i + 1] = clamp01(g / 255) * 255;
          data[i + 2] = clamp01(b / 255) * 255;
          data[i + 3] = 255;
        }
      }
    },
    key,
  );
}

function earthDay(): THREE.CanvasTexture {
  return paint(
    768,
    384,
    (data, w, h) => {
      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
          const u = x / w;
          const v = y / h;
          const land = fbm(u * 5.2, v * 3.4, 4242, 6, 5);
          const detail = fbm(u * 16, v * 10, 777, 4, 16);
          const lat = Math.abs(v - 0.5) * 2;
          const ice = clamp01((lat - 0.82) * 7);
          const i = (y * w + x) * 4;
          let r: number;
          let g: number;
          let b: number;
          const isLand = land + detail * 0.18 > 0.52;
          if (isLand) {
            const dry = fbm(u * 9, v * 6, 313, 4, 9);
            const veg = clamp01(1.15 - lat * 1.4 - dry * 0.7);
            r = mix(126, 66, veg);
            g = mix(112, 108, veg);
            b = mix(74, 52, veg);
            const coast = (land + detail * 0.18 - 0.52) * 6;
            if (coast < 0.12) {
              r = mix(r, 186, (0.12 - coast) * 5);
              g = mix(g, 170, (0.12 - coast) * 5);
              b = mix(b, 122, (0.12 - coast) * 5);
            }
          } else {
            const depth = clamp01((0.52 - land - detail * 0.18) * 3.2);
            r = mix(24, 8, depth);
            g = mix(86, 34, depth);
            b = mix(140, 78, depth);
          }
          r = mix(r, 238, ice);
          g = mix(g, 244, ice);
          b = mix(b, 250, ice);
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
          data[i + 3] = 255;
        }
      }
    },
    'earth-day',
  );
}

function earthClouds(): THREE.CanvasTexture {
  return paint(
    384,
    192,
    (data, w, h) => {
      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
          const u = x / w;
          const v = y / h;
          const swirl = fbm(u * 3, v * 2, 8080, 3, 3) - 0.5;
          const n = fbm(u * 7 + swirl * 2.2, v * 5 + swirl, 9090, 5, 7);
          const alpha = clamp01((n - 0.46) * 3.1);
          const i = (y * w + x) * 4;
          data[i] = 255;
          data[i + 1] = 255;
          data[i + 2] = 255;
          data[i + 3] = alpha * 225;
        }
      }
    },
    'earth-clouds',
  );
}

function surfacePaint(
  key: string,
  width: number,
  height: number,
  fn: (u: number, v: number) => RGB,
): THREE.CanvasTexture {
  return paint(
    width,
    height,
    (data, w, h) => {
      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
          const [r, g, b] = fn(x / w, y / h);
          const i = (y * w + x) * 4;
          data[i] = clamp01(r / 255) * 255;
          data[i + 1] = clamp01(g / 255) * 255;
          data[i + 2] = clamp01(b / 255) * 255;
          data[i + 3] = 255;
        }
      }
    },
    key,
  );
}

const moonSize: [number, number] = [320, 160];
const planetSize: [number, number] = [512, 256];

const BUILDERS: Record<TextureKind, () => THREE.CanvasTexture> = {
  'rocky-grey': () => rocky(1010, [156, 142, 130], planetSize[0], planetSize[1], 'mercury', 46, false),
  moon: () => rocky(2020, [184, 180, 173], moonSize[0], moonSize[1], 'luna', 54, true),
  mars: () =>
    surfacePaint('mars', planetSize[0], planetSize[1], (u, v) => {
      const n = fbm(u * 7, v * 5, 3131, 5, 7);
      const dark = fbm(u * 4, v * 3, 6161, 4, 4) > 0.62 ? -34 : 0;
      const lat = Math.abs(v - 0.5) * 2;
      const cap = clamp01((lat - 0.88) * 9);
      const canyon = Math.abs(v - 0.52) < 0.035 && fbm(u * 3, v * 8, 99, 2, 3) > 0.45 ? -46 : 0;
      const shade = 0.62 + n * 0.66;
      const r = clamp01(((176 + dark + canyon) / 255) * shade) * 255;
      const g = clamp01(((94 + dark * 0.6 + canyon) / 255) * shade) * 255;
      const b = clamp01(((62 + canyon * 0.5) / 255) * shade) * 255;
      return [mix(r, 242, cap), mix(g, 246, cap), mix(b, 250, cap)];
    }),
  venus: () =>
    gasGiant(
      555,
      [
        [236, 205, 150],
        [214, 172, 106],
        [236, 214, 168],
        [198, 152, 92],
      ],
      7,
      1.6,
      null,
      planetSize[0],
      planetSize[1],
      'venus',
    ),
  earth: () => earthDay(),
  jupiter: () =>
    gasGiant(
      666,
      [
        [232, 210, 176],
        [186, 138, 96],
        [222, 192, 152],
        [156, 110, 76],
        [236, 220, 194],
      ],
      14,
      2.4,
      { u: 0.32, v: 0.62, color: [193, 79, 47] },
      planetSize[0],
      planetSize[1],
      'jupiter',
    ),
  saturn: () =>
    gasGiant(
      777,
      [
        [238, 220, 180],
        [210, 182, 132],
        [244, 232, 204],
        [196, 164, 116],
      ],
      10,
      1.4,
      null,
      planetSize[0],
      planetSize[1],
      'saturn',
    ),
  uranus: () =>
    gasGiant(
      888,
      [
        [146, 214, 220],
        [128, 200, 210],
        [160, 224, 228],
      ],
      4,
      0.7,
      null,
      planetSize[0],
      planetSize[1],
      'uranus',
    ),
  neptune: () =>
    gasGiant(
      999,
      [
        [52, 88, 214],
        [38, 66, 176],
        [74, 116, 232],
        [30, 54, 150],
      ],
      6,
      1.1,
      { u: 0.62, v: 0.58, color: [18, 32, 110] },
      planetSize[0],
      planetSize[1],
      'neptune',
    ),
  io: () =>
    surfacePaint('io', 320, 160, (u, v) => {
      const n = fbm(u * 8, v * 6, 4711, 5, 8);
      const sulfur = fbm(u * 4, v * 3, 5757, 4, 4);
      const dip = sulfur > 0.6 ? 1 : 0;
      return [214 + n * 60 - dip * 70, 200 + n * 44 - dip * 90, 96 + n * 66 - dip * 40];
    }),
  europa: () =>
    surfacePaint('europa', 320, 160, (u, v) => {
      const n = fbm(u * 6, v * 4, 7171, 5, 6);
      const cracks = Math.abs(fbm(u * 10, v * 7, 3131, 3, 10) - 0.5);
      const rust = cracks < 0.045 ? 1 - cracks / 0.045 : 0;
      const base = 208 + n * 44;
      return [base + rust * 40, base + rust * 6, base - rust * 30];
    }),
  titan: () =>
    surfacePaint('titan', 320, 160, (u, v) => {
      const n = fbm(u * 5, v * 4, 6161, 4, 5);
      return [210 + n * 44, 164 + n * 40, 78 + n * 34];
    }),
};

export function getPlanetTexture(kind: TextureKind): THREE.CanvasTexture {
  const builder = BUILDERS[kind] ?? BUILDERS['rocky-grey'];
  return builder();
}

export function getEarthCloudTexture(): THREE.CanvasTexture {
  return earthClouds();
}

const ringCache = new Map<string, THREE.CanvasTexture>();

export function getRingTexture(color: string, faint = false): THREE.CanvasTexture {
  const key = `ring-${color}-${faint}`;
  const cached = ringCache.get(key);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 4;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable — ring texture cannot be generated.');
  const rgb = new THREE.Color(color);
  const r = Math.round(rgb.r * 255);
  const g = Math.round(rgb.g * 255);
  const b = Math.round(rgb.b * 255);
  for (let x = 0; x < 512; x += 1) {
    const t = x / 512;
    let alpha = 0.55 + Math.sin(t * 47) * 0.2 + Math.sin(t * 133) * 0.12;
    if (t < 0.12 || t > 0.96) alpha *= t < 0.12 ? t / 0.12 : (1 - t) / 0.04;
    if (Math.abs(t - 0.62) < 0.035) alpha *= 0.12;
    if (faint) alpha *= 0.35;
    const shade = 0.8 + Math.sin(t * 61) * 0.2;
    ctx.fillStyle = `rgba(${Math.round(r * shade)},${Math.round(g * shade)},${Math.round(b * shade)},${clamp01(alpha)})`;
    ctx.fillRect(x, 0, 1, 4);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  ringCache.set(key, texture);
  liveTextures.add(texture);
  return texture;
}

/** Soft radial glow used for sun corona, star glints and nebula sprites. */
export function createGlowTexture(
  size = 128,
  inner = 'rgba(255,255,255,1)',
  outer = 'rgba(255,255,255,0)',
): THREE.CanvasTexture {
  const key = `glow-${size}-${inner}-${outer}`;
  const cached = textureCache.get(key);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable — glow texture cannot be generated.');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, inner);
  gradient.addColorStop(0.22, inner.replace(/[\d.]+\)$/, '0.5)'));
  gradient.addColorStop(0.55, inner.replace(/[\d.]+\)$/, '0.1)'));
  gradient.addColorStop(1, outer);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(key, texture);
  liveTextures.add(texture);
  return texture;
}

export const TEXTURE_KINDS: TextureKind[] = [
  'rocky-grey',
  'moon',
  'mars',
  'venus',
  'earth',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'io',
  'europa',
  'titan',
];

export function cachedTextureCount(): number {
  return liveTextures.size;
}

/** Free every GPU texture this module created. */
export function disposeAllTextures(): void {
  for (const texture of liveTextures) texture.dispose();
  liveTextures.clear();
  textureCache.clear();
  ringCache.clear();
}
