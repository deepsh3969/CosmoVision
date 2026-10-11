import { describe, expect, it } from 'vitest';

import {
  formatAu,
  formatDays,
  formatInt,
  formatKm,
  formatLightYears,
  formatSceneDistance,
  formatSimDate,
  formatYears,
} from '../../src/lib/format';

describe('formatAu', () => {
  it('scales decimal places by magnitude', () => {
    expect(formatAu(0.0039)).toBe('0.0039 AU');
    expect(formatAu(1)).toBe('1.00 AU');
    expect(formatAu(30.07)).toBe('30.1 AU');
    expect(formatAu(Number.NaN)).toBe('—');
  });
});

describe('formatKm', () => {
  it('handles thousands, millions and billions', () => {
    expect(formatKm(4879)).toBe('4,879 km');
    expect(formatKm(12_742_000)).toBe('12.7 million km');
    expect(formatKm(1.392e9)).toBe('1.39 billion km');
  });
});

describe('formatLightYears / formatSceneDistance', () => {
  it('converts galaxy units to light years', () => {
    expect(formatLightYears(1)).toBe('4.2 kly');
    expect(formatSceneDistance(6.24, 'galaxy')).toBe('26.0 kly');
    expect(formatSceneDistance(1, 'system')).toBe('1.00 AU');
  });
});

describe('time formatting', () => {
  it('formats days and years', () => {
    expect(formatDays(0.5)).toBe('0.50 d');
    expect(formatDays(365.25)).toBe('365.3 d');
    expect(formatYears(365.25)).toBe('1.0 years');
    expect(formatYears(100)).toBe('100.0 days');
  });

  it('formats the simulation date from the J2000 epoch', () => {
    expect(formatSimDate(0)).toBe('2000-01-01');
    expect(formatSimDate(Number.NaN)).toBe('—');
  });
});

describe('formatInt', () => {
  it('rounds and groups', () => {
    expect(formatInt(1234.6)).toBe('1,235');
  });
});
