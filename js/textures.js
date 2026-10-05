import * as THREE from 'three';

// Procedural, licence-free planet textures generated on canvas at boot.
// Noise lattice wraps in X so equirectangular maps have no visible seam.

function hash(x, y, seed) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function wrap(i, period) {
  return ((i % period) + period) % period;
}

function valueNoise(x, y, seed, period) {
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

function fbm(x, y, seed, octaves = 4, period = 8) {
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

const cache = new Map();

function paint(width, height, fn, key) {
  if (cache.has(key)) return cache.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(width, height);
  fn(image.data, width, height);
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  cache.set(key, texture);
  return texture;
}

const mix = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

function bands(u, v, count, warp, seed) {
  const w = (fbm(u * 6, v * 3, seed, 3, 6) - 0.5) * warp;
  return Math.sin((v + w) * Math.PI * count);
}

function craterShade(px, py, craters) {
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

function rocky(seed, base, width, height, key, craterCount, maria) {
  return paint(width, height, (data, w, h) => {
    const craters = [];
    let s = seed;
    const rand = () => {
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
        data[i] = clamp01(base[0] / 255 * (0.55 + n)) * 255;
        data[i + 1] = clamp01(base[1] / 255 * (0.55 + n)) * 255;
        data[i + 2] = clamp01(base[2] / 255 * (0.55 + n)) * 255;
        data[i + 3] = 255;
      }
    }
  }, key);
}

function gasGiant(seed, palette, count, warp, spot, width, height, key) {
  return paint(width, height, (data, w, h) => {
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
  }, key);
}

function earthMaps() {
  const day = paint(1024, 512, (data, w, h) => {
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const u = x / w;
        const v = y / h;
        const land = fbm(u * 5.2, v * 3.4, 4242, 6, 5);
        const detail = fbm(u * 16, v * 10, 777, 4, 16);
        const lat = Math.abs(v - 0.5) * 2;
        const ice = clamp01((lat - 0.82) * 7);
        const i = (y * w + x) * 4;
        let r;
        let g;
        let b;
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
  }, 'earth-day');

  const night = paint(512, 256, (data, w, h) => {
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const u = x / w;
        const v = y / h;
        const land = fbm(u * 5.2, v * 3.4, 4242, 6, 5);
        const city = fbm(u * 40, v * 26, 5150, 4, 40);
        const lit = land > 0.54 && city > 0.6 ? clamp01((city - 0.6) * 6) : 0;
        const i = (y * w + x) * 4;
        data[i] = lit * 255;
        data[i + 1] = lit * 196;
        data[i + 2] = lit * 118;
        data[i + 3] = 255;
      }
    }
  }, 'earth-night');

  const clouds = paint(512, 256, (data, w, h) => {
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
        data[i + 3] = alpha * 235;
      }
    }
  }, 'earth-clouds');

  return { day, night, clouds };
}

function ringTexture(color, faint) {
  const key = `ring-${color}-${faint}`;
  if (cache.has(key)) return cache.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 4;
  const ctx = canvas.getContext('2d');
  const rgb = new THREE.Color(color);
  const r = Math.round(rgb.r * 255);
  const g = Math.round(rgb.g * 255);
  const b = Math.round(rgb.b * 255);
  for (let x = 0; x < 512; x += 1) {
    const t = x / 512;
    let alpha = 0.55 + Math.sin(t * 47) * 0.2 + Math.sin(t * 133) * 0.12;
    if (t < 0.12 || t > 0.96) alpha *= t < 0.12 ? t / 0.12 : (1 - t) / 0.04;
    if (Math.abs(t - 0.62) < 0.035) alpha *= 0.12; // Cassini-style division
    if (faint) alpha *= 0.35;
    const shade = 0.8 + Math.sin(t * 61) * 0.2;
    ctx.fillStyle = `rgba(${Math.round(r * shade)},${Math.round(g * shade)},${Math.round(b * shade)},${clamp01(alpha)})`;
    ctx.fillRect(x, 0, 1, 4);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, texture);
  return texture;
}

export function getPlanetTexture(kind) {
  switch (kind) {
    case 'rocky-grey':
      return rocky(1010, [156, 142, 130], 512, 256, 'mercury', 46, false);
    case 'moon':
      return rocky(2020, [184, 180, 173], 512, 256, 'moon', 60, true);
    case 'mars': {
      return paint(512, 256, (data, w, h) => {
        for (let y = 0; y < h; y += 1) {
          for (let x = 0; x < w; x += 1) {
            const u = x / w;
            const v = y / h;
            const n = fbm(u * 7, v * 5, 3131, 5, 7);
            const dark = fbm(u * 4, v * 3, 6161, 4, 4) > 0.62 ? -34 : 0;
            const lat = Math.abs(v - 0.5) * 2;
            const cap = clamp01((lat - 0.88) * 9);
            const canyon = Math.abs(v - 0.52) < 0.035 && fbm(u * 3, v * 8, 99, 2, 3) > 0.45 ? -46 : 0;
            const i = (y * w + x) * 4;
            const shade = 0.62 + n * 0.66;
            let r = clamp01(((176 + dark + canyon) / 255) * shade) * 255;
            let g = clamp01(((94 + dark * 0.6 + canyon) / 255) * shade) * 255;
            let b = clamp01(((62 + canyon * 0.5) / 255) * shade) * 255;
            r = mix(r, 242, cap);
            g = mix(g, 246, cap);
            b = mix(b, 250, cap);
            data[i] = r;
            data[i + 1] = g;
            data[i + 2] = b;
            data[i + 3] = 255;
          }
        }
      }, 'mars');
    }
    case 'venus':
      return gasGiant(
        555,
        [[236, 205, 150], [214, 172, 106], [236, 214, 168], [198, 152, 92]],
        7,
        1.6,
        null,
        512,
        256,
        'venus',
      );
    case 'jupiter':
      return gasGiant(
        666,
        [[232, 210, 176], [186, 138, 96], [222, 192, 152], [156, 110, 76], [236, 220, 194]],
        14,
        2.4,
        { u: 0.32, v: 0.62, color: [193, 79, 47] },
        512,
        256,
        'jupiter',
      );
    case 'saturn':
      return gasGiant(777, [[238, 220, 180], [210, 182, 132], [244, 232, 204], [196, 164, 116]], 10, 1.4, null, 512, 256, 'saturn');
    case 'uranus':
      return gasGiant(888, [[146, 214, 220], [128, 200, 210], [160, 224, 228]], 4, 0.7, null, 512, 256, 'uranus');
    case 'neptune':
      return gasGiant(
        999,
        [[52, 88, 214], [38, 66, 176], [74, 116, 232], [30, 54, 150]],
        6,
        1.1,
        { u: 0.62, v: 0.58, color: [18, 32, 110] },
        512,
        256,
        'neptune',
      );
    case 'io':
      return paint(512, 256, (data, w, h) => {
        for (let y = 0; y < h; y += 1) {
          for (let x = 0; x < w; x += 1) {
            const u = x / w;
            const v = y / h;
            const n = fbm(u * 8, v * 6, 4711, 5, 8);
            const sulfur = fbm(u * 4, v * 3, 5757, 4, 4);
            const i = (y * w + x) * 4;
            data[i] = clamp01((214 + n * 60 - (sulfur > 0.6 ? 70 : 0)) / 255) * 255;
            data[i + 1] = clamp01((200 + n * 44 - (sulfur > 0.6 ? 90 : 0)) / 255) * 255;
            data[i + 2] = clamp01((96 + n * 66 - (sulfur > 0.6 ? 40 : 0)) / 255) * 255;
            data[i + 3] = 255;
          }
        }
      }, 'io');
    case 'titan':
      return paint(512, 256, (data, w, h) => {
        for (let y = 0; y < h; y += 1) {
          for (let x = 0; x < w; x += 1) {
            const u = x / w;
            const v = y / h;
            const n = fbm(u * 5, v * 4, 6161, 4, 5);
            const i = (y * w + x) * 4;
            data[i] = clamp01((210 + n * 44) / 255) * 255;
            data[i + 1] = clamp01((164 + n * 40) / 255) * 255;
            data[i + 2] = clamp01((78 + n * 34) / 255) * 255;
            data[i + 3] = 255;
          }
        }
      }, 'titan');
    default:
      return rocky(1010, [156, 142, 130], 512, 256, 'mercury', 46, false);
  }
}

export function getEarthMaps() {
  return earthMaps();
}

export function getRingTexture(color, faint = false) {
  return ringTexture(color, faint);
}
