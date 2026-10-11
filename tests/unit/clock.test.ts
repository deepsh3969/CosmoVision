import { describe, expect, it } from 'vitest';

import { DEFAULT_SPEED, MAX_FRAME_DT, SimulationClock, clampSpeed, isSimSpeed } from '../../src/simulation/clock';

describe('SimulationClock', () => {
  it('advances by speed × dt while playing', () => {
    const clock = new SimulationClock();
    clock.setSpeed(10);
    clock.tick(0.02);
    expect(clock.simDays).toBeCloseTo(0.2, 10);
  });

  it('does not advance while paused', () => {
    const clock = new SimulationClock();
    clock.pause();
    clock.tick(1);
    expect(clock.simDays).toBe(0);
  });

  it('clamps huge frame deltas', () => {
    const clock = new SimulationClock();
    clock.setSpeed(10);
    clock.tick(30);
    expect(clock.simDays).toBeCloseTo(MAX_FRAME_DT * 10, 10);
  });

  it('ignores non-positive or non-finite deltas', () => {
    const clock = new SimulationClock();
    clock.tick(0);
    clock.tick(-5);
    clock.tick(Number.NaN);
    expect(clock.simDays).toBe(0);
  });

  it('resets back to zero', () => {
    const clock = new SimulationClock();
    clock.tick(2);
    expect(clock.reset()).toBe(0);
  });

  it('toggle flips the playing state', () => {
    const clock = new SimulationClock();
    expect(clock.toggle()).toBe(false);
    expect(clock.toggle()).toBe(true);
  });
});

describe('speed helpers', () => {
  it('validates preset speeds', () => {
    expect(isSimSpeed(10)).toBe(true);
    expect(isSimSpeed(7)).toBe(false);
  });

  it('clamps into the preset range and defaults on garbage', () => {
    expect(clampSpeed(5000)).toBe(1000);
    expect(clampSpeed(0.001)).toBe(0.1);
    expect(clampSpeed(Number.NaN)).toBe(DEFAULT_SPEED);
  });
});
