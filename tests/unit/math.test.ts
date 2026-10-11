import { describe, expect, it } from 'vitest';

import {
  clamp,
  clamp01,
  damp,
  dampAngle,
  degToRad,
  gaussian,
  hexToRgb,
  lerp,
  mixRgb,
  mulberry32,
  smoothstep,
} from '../../src/lib/math';

describe('clamp family', () => {
  it('clamps into range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
    expect(clamp01(1.4)).toBe(1);
  });
});

describe('lerp / damp', () => {
  it('lerps linearly', () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
  });

  it('damp approaches the target without overshooting', () => {
    let value = 0;
    for (let i = 0; i < 200; i += 1) value = damp(value, 10, 5, 1 / 60);
    expect(value).toBeGreaterThan(9.9);
    expect(value).toBeLessThanOrEqual(10);
  });

  it('dampAngle takes the short way around', () => {
    const next = dampAngle(Math.PI - 0.1, -Math.PI + 0.1, 8, 1 / 60);
    expect(next).toBeGreaterThan(Math.PI - 0.1);
    expect(next).toBeLessThanOrEqual(Math.PI);
  });
});

describe('smoothstep', () => {
  it('is 0 below edge0 and 1 above edge1', () => {
    expect(smoothstep(0, 1, -1)).toBe(0);
    expect(smoothstep(0, 1, 2)).toBe(1);
    expect(smoothstep(0, 1, 0.5)).toBeCloseTo(0.5, 6);
  });
});

describe('mulberry32', () => {
  it('is deterministic for a given seed', () => {
    const a = mulberry32(123);
    const b = mulberry32(123);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('produces different streams for different seeds', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });

  it('stays in [0, 1)', () => {
    const random = mulberry32(999);
    for (let i = 0; i < 500; i += 1) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('gaussian', () => {
  it('has roughly zero mean over many samples', () => {
    const random = mulberry32(42);
    let sum = 0;
    const n = 4000;
    for (let i = 0; i < n; i += 1) sum += gaussian(random);
    expect(Math.abs(sum / n)).toBeLessThan(0.08);
  });
});

describe('color helpers', () => {
  it('parses hex colors', () => {
    expect(hexToRgb('#ff8000')).toEqual({ r: 255, g: 128, b: 0 });
  });

  it('mixes rgb channels', () => {
    expect(mixRgb({ r: 0, g: 0, b: 0 }, { r: 10, g: 20, b: 30 }, 0.5)).toEqual({ r: 5, g: 10, b: 15 });
  });
});

describe('degToRad', () => {
  it('converts degrees', () => {
    expect(degToRad(180)).toBeCloseTo(Math.PI, 10);
  });
});
