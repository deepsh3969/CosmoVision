import { describe, expect, it } from 'vitest';

import { DEFAULT_GALAXY, THEMES } from '../../src/data/galaxyPresets';
import { generateGalaxy, generateNebula, generateStarfield } from '../../src/scene/galaxyGenerator';

const theme = THEMES[0];

describe('generateGalaxy', () => {
  it('fills every particle slot', () => {
    const buffers = generateGalaxy({ ...DEFAULT_GALAXY, particles: 4000 }, theme, 1);
    expect(buffers.count).toBe(4000);
    expect(buffers.position.length).toBe(4000 * 3);
    expect(buffers.color.length).toBe(4000 * 3);
  });

  it('is deterministic for identical parameters', () => {
    const a = generateGalaxy(DEFAULT_GALAXY, theme, 0.05);
    const b = generateGalaxy(DEFAULT_GALAXY, theme, 0.05);
    expect(Array.from(a.position)).toEqual(Array.from(b.position));
    expect(Array.from(a.color)).toEqual(Array.from(b.color));
  });

  it('scales the particle count with the quality profile', () => {
    const buffers = generateGalaxy(DEFAULT_GALAXY, theme, 0.5);
    expect(buffers.count).toBe(Math.round(DEFAULT_GALAXY.particles * 0.5));
  });

  it('keeps colors normalized', () => {
    const buffers = generateGalaxy({ ...DEFAULT_GALAXY, particles: 2000 }, theme, 1);
    for (let i = 0; i < buffers.color.length; i += 1) {
      expect(buffers.color[i]).toBeGreaterThanOrEqual(0);
      expect(buffers.color[i]).toBeLessThanOrEqual(1);
    }
  });
});

describe('generateNebula', () => {
  it('produces a smaller, dimmer haze layer', () => {
    const buffers = generateNebula(theme, 12, 1);
    expect(buffers.count).toBe(1400);
    for (let i = 0; i < buffers.count; i += 1) {
      expect(buffers.alpha[i]).toBeLessThan(0.1);
    }
  });

  it('respects the density scale', () => {
    expect(generateNebula(theme, 12, 0.4).count).toBe(560);
  });
});

describe('generateStarfield', () => {
  it('places stars on a distant shell', () => {
    const buffers = generateStarfield(200);
    expect(buffers.count).toBe(200);
    for (let i = 0; i < 200; i += 1) {
      const radius = Math.hypot(buffers.position[i * 3], buffers.position[i * 3 + 1], buffers.position[i * 3 + 2]);
      expect(radius).toBeGreaterThan(500);
    }
  });

  it('is deterministic per seed', () => {
    const a = generateStarfield(50, 7);
    const b = generateStarfield(50, 7);
    expect(Array.from(a.position)).toEqual(Array.from(b.position));
  });
});
