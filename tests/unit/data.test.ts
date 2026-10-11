import { describe, expect, it } from 'vitest';

import {
  CELESTIAL_OBJECTS,
  WORLD,
  breadcrumbPath,
  compressPeriod,
  focusDistanceFor,
  getChildren,
  getObject,
  minDistanceFor,
  relatedObjects,
} from '../../src/data/celestialObjects';
import { SOURCES } from '../../src/data/sources';

describe('catalogue integrity', () => {
  it('has unique ids', () => {
    const ids = CELESTIAL_OBJECTS.map((object) => object.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('contains the Sun, eight planets and the Milky Way', () => {
    expect(getObject('sol')).toBeDefined();
    expect(getObject('milky-way')).toBeDefined();
    const planets = CELESTIAL_OBJECTS.filter((object) => object.category === 'planet');
    expect(planets).toHaveLength(8);
  });

  it('every parent reference resolves', () => {
    for (const object of CELESTIAL_OBJECTS) {
      if (object.parent) expect(getObject(object.parent), `${object.id} parent`).toBeDefined();
    }
  });

  it('every source id is known', () => {
    for (const object of CELESTIAL_OBJECTS) {
      for (const sourceId of object.sources) expect(SOURCES[sourceId], `${object.id} source`).toBeDefined();
      for (const fact of object.facts) expect(SOURCES[fact.source], fact.label).toBeDefined();
    }
  });

  it('every fact carries a precision label', () => {
    for (const object of CELESTIAL_OBJECTS) {
      for (const fact of object.facts) {
        expect(['measured', 'approximate', 'illustrative', 'procedural']).toContain(fact.precision);
      }
    }
  });
});

describe('navigation helpers', () => {
  it('focus and min distances are positive and ordered', () => {
    for (const object of CELESTIAL_OBJECTS) {
      const focus = focusDistanceFor(object);
      const min = minDistanceFor(object);
      expect(focus).toBeGreaterThan(0);
      expect(min).toBeGreaterThan(0);
      expect(min).toBeLessThan(focus);
    }
  });

  it('breadcrumbs walk up to the galaxy', () => {
    const crumbs = breadcrumbPath('luna').map((object) => object.id);
    expect(crumbs).toEqual(['milky-way', 'solar-system', 'earth', 'luna']);
  });

  it('children and related lookups are consistent', () => {
    expect(getChildren('earth').map((object) => object.id)).toContain('luna');
    expect(relatedObjects('mars').length).toBeGreaterThan(0);
  });
});

describe('compressPeriod', () => {
  it('is monotonic and compresses long periods', () => {
    const mercury = compressPeriod(87.97);
    const earth = compressPeriod(365.25);
    const neptune = compressPeriod(60_195);
    expect(mercury).toBeLessThan(earth);
    expect(earth).toBeLessThan(neptune);
    expect(neptune).toBeLessThan(60_195);
  });
});

describe('WORLD scale constants', () => {
  it('keeps the system inside the galaxy radius', () => {
    const [x, y, z] = WORLD.systemPosition;
    const distance = Math.hypot(x, y, z);
    expect(distance).toBeLessThan(WORLD.galaxyRadius);
    expect(WORLD.lyPerGalaxyUnit).toBeGreaterThan(0);
  });
});
