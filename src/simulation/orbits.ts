import { degToRad } from '../lib/math';

/**
 * Orbital motion model.
 *
 * Orbits are treated as circles in the object's own plane, advanced from a deterministic
 * schedule (see `visualPeriodDays`). Inclination is applied as a fixed plane tilt and
 * eccentricity is used only for display (orbit-line styling), not for position integration.
 * This is a scripted, physically-informed animation — not an N-body gravity simulation.
 */

/** Deterministic starting phase so bodies are not artificially aligned. */
export function phaseFor(id: string): number {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 3600) / 3600 * Math.PI * 2;
}

export function orbitAngle(simDays: number, periodDays: number, phase = 0): number {
  if (!Number.isFinite(periodDays) || periodDays <= 0) return phase;
  return phase + (Math.PI * 2 * simDays) / periodDays;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export function orbitPosition(radius: number, angle: number, inclinationDeg = 0): Vec3 {
  const incl = degToRad(inclinationDeg);
  const x = Math.cos(angle) * radius;
  const plane = Math.sin(angle) * radius;
  return {
    x,
    y: plane * Math.sin(incl),
    z: plane * Math.cos(incl),
  };
}

/** Combined parent offset + local orbit for a satellite. */
export function satellitePosition(
  parent: Vec3,
  radius: number,
  angle: number,
  inclinationDeg = 0,
): Vec3 {
  const local = orbitPosition(radius, angle, inclinationDeg);
  return { x: parent.x + local.x, y: parent.y + local.y, z: parent.z + local.z };
}

/** Axial rotation in radians — `visualSpinRate` is radians per simulated day (animation only). */
export function spinAngle(simDays: number, visualSpinRate = 0.2, phase = 0): number {
  return phase + simDays * visualSpinRate;
}

export interface TrailArc {
  /** World radius of the arc. */
  radius: number;
  /** Arc start angle in radians. */
  start: number;
  /** Arc sweep in radians (positive = counter-clockwise). */
  sweep: number;
}

/** A trailing arc sits *behind* the body along its orbital direction. */
export function trailArc(radius: number, angle: number, sweep = Math.PI * 0.55): TrailArc {
  return { radius, start: angle - sweep, sweep };
}

/** Frames an arc as a strip of points (used to build the trail geometry). */
export function arcPoints(arc: TrailArc, segments = 48): number[] {
  const points: number[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const a = arc.start + arc.sweep * t;
    points.push(Math.cos(a) * arc.radius, 0, Math.sin(a) * arc.radius);
  }
  return points;
}
