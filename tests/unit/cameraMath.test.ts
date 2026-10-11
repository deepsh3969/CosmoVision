import { describe, expect, it } from 'vitest';

import {
  CLICK_THRESHOLD_PX,
  DEFAULT_LIMITS,
  DEFAULT_PHI,
  DEFAULT_RADIUS,
  clampPan,
  clampPhi,
  clampRadius,
  cameraPosition,
  initialCameraState,
  intentFrom,
  isClick,
  orbitDrag,
  pinchZoom,
  stepCamera,
  wrapAngle,
  zoomBy,
} from '../../src/navigation/cameraMath';

describe('wrapAngle / clampPhi / clampRadius', () => {
  it('wraps into (-π, π]', () => {
    expect(wrapAngle(0)).toBe(0);
    expect(wrapAngle(Math.PI * 3)).toBeCloseTo(Math.PI, 10);
    expect(wrapAngle(-Math.PI * 3)).toBeCloseTo(Math.PI, 10);
  });

  it('clamps phi away from the poles', () => {
    expect(clampPhi(0)).toBeGreaterThan(0);
    expect(clampPhi(Math.PI)).toBeLessThan(Math.PI);
    expect(clampPhi(Number.NaN)).toBe(DEFAULT_PHI);
  });

  it('clamps radius, tolerating NaN', () => {
    expect(clampRadius(50, 1, 20)).toBe(20);
    expect(clampRadius(0.5, 1, 20)).toBe(1);
    expect(clampRadius(Number.NaN, 1, 20)).toBe(1);
  });
});

describe('orbitDrag', () => {
  it('rotates theta with horizontal drag and clamps phi', () => {
    const next = orbitDrag(0, 1, 100, -10_000);
    expect(next.theta).toBeLessThan(0);
    expect(next.phi).toBeLessThanOrEqual(DEFAULT_LIMITS.maxPhi);
    expect(next.phi).toBeGreaterThanOrEqual(DEFAULT_LIMITS.minPhi);
  });
});

describe('zoom / pinch', () => {
  it('zoomBy shrinks the radius for positive notches', () => {
    expect(zoomBy(10, 1, 1, 100)).toBeLessThan(10);
    expect(zoomBy(10, -1, 1, 100)).toBeGreaterThan(10);
  });

  it('respects min/max bounds', () => {
    expect(zoomBy(10, 500, 2, 20)).toBe(2);
    expect(zoomBy(10, -500, 2, 20)).toBe(20);
  });

  it('pinchZoom divides by the scale and survives bad input', () => {
    expect(pinchZoom(10, 2, 1, 100)).toBeCloseTo(5, 10);
    expect(pinchZoom(10, 0, 1, 100)).toBe(10);
  });
});

describe('isClick', () => {
  it('accepts drags under the 6 px threshold only', () => {
    expect(isClick({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(true);
    expect(isClick({ x: 0, y: 0 }, { x: 10, y: 0 })).toBe(false);
    expect(isClick(null, { x: 0, y: 0 })).toBe(false);
    expect(CLICK_THRESHOLD_PX).toBe(6);
  });
});

describe('clampPan', () => {
  it('bounds each axis', () => {
    expect(clampPan([50, -50, 3], 12)).toEqual([12, -12, 3]);
  });
});

describe('stepCamera', () => {
  it('converges toward the intent and respects limits', () => {
    const state = initialCameraState();
    const intent = intentFrom(state, { radius: 4, tx: 3, ty: -1, tz: 2 });
    let current = state;
    for (let i = 0; i < 240; i += 1) {
      current = stepCamera(current, intent, DEFAULT_LIMITS, 1 / 60);
    }
    expect(current.radius).toBeCloseTo(4, 1);
    expect(current.tx).toBeCloseTo(3, 2);
    expect(current.ty).toBeCloseTo(-1, 2);
    expect(current.tz).toBeCloseTo(2, 2);
    expect(current.radius).toBeGreaterThanOrEqual(DEFAULT_LIMITS.minRadius);
  });

  it('is pure — same inputs give the same output', () => {
    const state = initialCameraState();
    const intent = intentFrom(state, { radius: DEFAULT_RADIUS - 2 });
    const a = stepCamera(state, intent, DEFAULT_LIMITS, 1 / 60);
    const b = stepCamera(state, intent, DEFAULT_LIMITS, 1 / 60);
    expect(a).toEqual(b);
  });
});

describe('cameraPosition', () => {
  it('places the camera at the orbit distance from the target', () => {
    const state = { ...initialCameraState(), tx: 1, ty: 2, tz: 3 };
    const [x, y, z] = cameraPosition(state);
    const distance = Math.hypot(x - 1, y - 2, z - 3);
    expect(distance).toBeCloseTo(state.radius, 10);
  });
});
