import * as THREE from 'three';

import { getObject, WORLD } from '../data/celestialObjects';
import { orbitAngle, orbitPosition, phaseFor, type Vec3 } from '../simulation/orbits';
import type { CelestialObject } from '../types';

/**
 * Pure positional model — the single source of truth for where an object sits in the
 * visualization space at a given simulation time. Used by the scene, the camera rig
 * (before a node registers itself) and by unit tests.
 */
export function objectLocalPosition(object: CelestialObject, simDays: number): Vec3 {
  if (object.category === 'galaxy') return { x: 0, y: 0, z: 0 };
  if (object.category === 'system') return { x: 0, y: 0, z: 0 };

  if (object.category === 'belt' || object.id === 'sol') {
    return { x: 0, y: 0, z: 0 };
  }

  const parent = getObject(object.parent);
  const orbit = object.orbit;

  if (!parent || !orbit) return { x: 0, y: 0, z: 0 };

  const angle = orbitAngle(simDays, orbit.visualPeriodDays, phaseFor(object.id));
  const local = orbitPosition(orbit.visualRadius, angle, orbit.inclinationDeg);
  const base = objectLocalPosition(parent, simDays);

  // Moon orbits are modelled in the ecliptic plane of its parent for stability.
  return { x: base.x + local.x, y: base.y + local.y, z: base.z + local.z };
}

/** World-space position: system children are offset by the system anchor. */
export function objectWorldPosition(object: CelestialObject, simDays: number, out = new THREE.Vector3()): THREE.Vector3 {
  const local = objectLocalPosition(object, simDays);
  if (object.id === 'milky-way') return out.set(0, 0, 0);
  if (isInsideSystem(object)) {
    return out.set(
      WORLD.systemPosition[0] + local.x,
      WORLD.systemPosition[1] + local.y,
      WORLD.systemPosition[2] + local.z,
    );
  }
  return out.set(local.x, local.y, local.z);
}

export function isInsideSystem(object: CelestialObject): boolean {
  let current: CelestialObject | undefined = object;
  const guard = new Set<string>();
  while (current && !guard.has(current.id)) {
    if (current.id === 'solar-system') return true;
    guard.add(current.id);
    current = getObject(current.parent ?? undefined);
  }
  return false;
}
