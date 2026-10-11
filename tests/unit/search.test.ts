import { describe, expect, it } from 'vitest';

import { filterByCategories, relatedByTag, searchObjects } from '../../src/lib/search';

describe('searchObjects', () => {
  it('finds exact names first', () => {
    const results = searchObjects('earth');
    expect(results[0].id).toBe('earth');
  });

  it('matches tags and type labels', () => {
    const gasGiants = searchObjects('gas giant');
    expect(gasGiants.map((object) => object.id)).toContain('jupiter');
  });

  it('returns everything (limited) for an empty query', () => {
    const results = searchObjects('', { limit: 5 });
    expect(results).toHaveLength(5);
  });

  it('respects the category filter', () => {
    const moons = searchObjects('a', { categories: ['moon'], limit: 50 });
    expect(moons.every((object) => object.category === 'moon')).toBe(true);
  });

  it('returns an empty list for nonsense', () => {
    expect(searchObjects('zzzzqqqqxxx')).toHaveLength(0);
  });
});

describe('filterByCategories', () => {
  it('keeps everything when no filter is active', () => {
    const all = filterByCategories(
      [{ category: 'planet' }, { category: 'moon' }] as never[],
      [],
    );
    expect(all).toHaveLength(2);
  });
});

describe('relatedByTag', () => {
  it('never includes the object itself', () => {
    const related = relatedByTag('earth');
    expect(related.every((object) => object.id !== 'earth')).toBe(true);
  });

  it('links Luna to Earth via shared tags', () => {
    const related = relatedByTag('earth', 12).map((object) => object.id);
    expect(related).toContain('luna');
  });
});
