import { describe, expect, it } from 'vitest';

import { arcPoints, orbitAngle, orbitPosition, phaseFor, satellitePosition, spinAngle, trailArc } from '../../src/simulation/orbits';

describe('phaseFor', () => {
  it('is deterministic per id', () => {
    expect(phaseFor('earth')).toBe(phaseFor('earth'));
    expect(phaseFor('earth')).not.toBe(phaseFor('mars'));
  });

  it('stays within one full turn', () => {
    const phase = phaseFor('jupiter');
    expect(phase).toBeGreaterThanOrEqual(0);
    expect(phase).toBeLessThan(Math.PI * 2);
  });
});

describe('orbitAngle', () => {
  it('completes one revolution per period', () => {
    expect(orbitAngle(365.25, 365.25, 0)).toBeCloseTo(Math.PI * 2, 10);
  });

  it('returns the phase for invalid periods', () => {
    expect(orbitAngle(10, 0, 0.5)).toBe(0.5);
    expect(orbitAngle(10, Number.NaN, 0.5)).toBe(0.5);
  });
});

describe('orbitPosition', () => {
  it('keeps points on the circle', () => {
    const position = orbitPosition(2, 0.7, 12);
    const radius = Math.hypot(position.x, position.y, position.z);
    expect(radius).toBeCloseTo(2, 10);
  });
});

describe('satellitePosition', () => {
  it('offsets by the parent position', () => {
    const result = satellitePosition({ x: 5, y: 1, z: -2 }, 1, 0, 0);
    expect(result.x).toBeCloseTo(6, 10);
    expect(result.y).toBeCloseTo(1, 10);
    expect(result.z).toBeCloseTo(-2, 10);
  });
});

describe('spinAngle', () => {
  it('advances linearly with simulated days', () => {
    expect(spinAngle(10, 0.25, 0)).toBeCloseTo(2.5, 10);
    expect(spinAngle(10, 0.25, 1)).toBeCloseTo(3.5, 10);
  });
});

describe('trailArc + arcPoints', () => {
  it('trails behind the body along its direction of travel', () => {
    const arc = trailArc(3, Math.PI / 2, Math.PI / 2);
    expect(arc.radius).toBe(3);
    expect(arc.start).toBeCloseTo(0, 10);
    expect(arc.sweep).toBeCloseTo(Math.PI / 2, 10);
  });

  it('emits segments + 1 points', () => {
    const points = arcPoints({ radius: 1, start: 0, sweep: Math.PI }, 16);
    expect(points.length).toBe((16 + 1) * 3);
    expect(points[0]).toBeCloseTo(1, 10);
    expect(points[points.length - 3]).toBeCloseTo(-1, 6);
    expect(points[points.length - 1]).toBeCloseTo(0, 6);
  });
});
