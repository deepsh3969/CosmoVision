import { clamp, damp, dampAngle, easeInOutQuint, lerp } from '../lib/math';

export const PHI_MIN = 0.08;
export const PHI_MAX = Math.PI - 0.08;
export const DEFAULT_THETA = 0.75;
export const DEFAULT_PHI = 1.15;
export const DEFAULT_RADIUS = 34;
export const MAX_PAN = 12;
export const PAN_LAMBDA = 9;

export interface CameraState {
  theta: number;
  phi: number;
  radius: number;
  /** Damped point the camera orbits around. */
  tx: number;
  ty: number;
  tz: number;
  /** User pan offset from the focus point. */
  panX: number;
  panY: number;
  panZ: number;
}

export interface CameraIntent {
  theta: number;
  phi: number;
  radius: number;
  tx: number;
  ty: number;
  tz: number;
  panX: number;
  panY: number;
  panZ: number;
}

export interface CameraLimits {
  minRadius: number;
  maxRadius: number;
  minPhi: number;
  maxPhi: number;
  targetLambda: number;
  radiusLambda: number;
  angleLambda: number;
}

export const DEFAULT_LIMITS: CameraLimits = {
  minRadius: 0.05,
  maxRadius: 120,
  minPhi: PHI_MIN,
  maxPhi: PHI_MAX,
  targetLambda: 2.6,
  radiusLambda: 2.4,
  angleLambda: 6,
};

export function initialCameraState(): CameraState {
  return {
    theta: DEFAULT_THETA,
    phi: DEFAULT_PHI,
    radius: DEFAULT_RADIUS,
    tx: 0,
    ty: 0,
    tz: 0,
    panX: 0,
    panY: 0,
    panZ: 0,
  };
}

export function clampRadius(radius: number, min: number, max: number): number {
  if (!Number.isFinite(radius)) return min;
  return clamp(radius, Math.min(min, max), Math.max(min, max));
}

export function clampPhi(phi: number, min = PHI_MIN, max = PHI_MAX): number {
  if (!Number.isFinite(phi)) return DEFAULT_PHI;
  return clamp(phi, min, max);
}

/** Wrap an angle into (-π, π]. */
export function wrapAngle(angle: number): number {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a <= -Math.PI) a += Math.PI * 2;
  return a;
}

/** Spherical → cartesian offset from the orbit point. */
export function sphericalOffset(theta: number, phi: number, radius: number): [number, number, number] {
  const sinPhi = Math.sin(phi);
  return [radius * sinPhi * Math.cos(theta), radius * Math.cos(phi), radius * sinPhi * Math.sin(theta)];
}

/** Absolute camera position for a state (orbit point + pan + spherical offset). */
export function cameraPosition(state: CameraState): [number, number, number] {
  const [ox, oy, oz] = sphericalOffset(state.theta, state.phi, state.radius);
  return [state.tx + state.panX + ox, state.ty + state.panY + oy, state.tz + state.panZ + oz];
}

/** Point the camera actually looks at — the focus point plus pan, never the damped copy. */
export function cameraLookTarget(state: CameraState): [number, number, number] {
  return [state.tx + state.panX, state.ty + state.panY, state.tz + state.panZ];
}

/** Orbit drag: horizontal delta rotates azimuth, vertical delta rotates elevation. */
export function orbitDrag(
  theta: number,
  phi: number,
  dx: number,
  dy: number,
  sensitivity = 0.005,
  limits: Pick<CameraLimits, 'minPhi' | 'maxPhi'> = DEFAULT_LIMITS,
): { theta: number; phi: number } {
  return {
    theta: wrapAngle(theta - dx * sensitivity),
    phi: clampPhi(phi - dy * sensitivity, limits.minPhi, limits.maxPhi),
  };
}

/** Exponential wheel zoom — `notches` positive zooms in. */
export function zoomBy(radius: number, notches: number, min: number, max: number): number {
  const factor = Math.pow(0.86, notches);
  return clampRadius(radius * factor, min, max);
}

/** Pinch zoom: `scale` > 1 zooms in. */
export function pinchZoom(radius: number, scale: number, min: number, max: number): number {
  if (!Number.isFinite(scale) || scale <= 0) return clampRadius(radius, min, max);
  return clampRadius(radius / scale, min, max);
}

/**
 * One frame of camera integration. Pure: same inputs + dt produce the same output,
 * so transitions are frame-rate independent and safe to retarget mid-flight.
 */
export function stepCamera(state: CameraState, intent: CameraIntent, limits: CameraLimits, dt: number): CameraState {
  const step = clamp(dt, 0, 0.1);
  const radius = clampRadius(damp(state.radius, intent.radius, limits.radiusLambda, step), limits.minRadius, limits.maxRadius);
  return {
    theta: dampAngle(state.theta, intent.theta, limits.angleLambda, step),
    phi: clampPhi(damp(state.phi, intent.phi, limits.angleLambda, step), limits.minPhi, limits.maxPhi),
    radius,
    tx: damp(state.tx, intent.tx, limits.targetLambda, step),
    ty: damp(state.ty, intent.ty, limits.targetLambda, step),
    tz: damp(state.tz, intent.tz, limits.targetLambda, step),
    panX: clamp(damp(state.panX, intent.panX, PAN_LAMBDA, step), -MAX_PAN, MAX_PAN),
    panY: clamp(damp(state.panY, intent.panY, PAN_LAMBDA, step), -MAX_PAN, MAX_PAN),
    panZ: clamp(damp(state.panZ, intent.panZ, PAN_LAMBDA, step), -MAX_PAN, MAX_PAN),
  };
}

/** Build an intent from a state, letting callers override a subset of fields. */
export function intentFrom(state: CameraState, overrides: Partial<CameraIntent> = {}): CameraIntent {
  return {
    theta: state.theta,
    phi: state.phi,
    radius: state.radius,
    tx: state.tx,
    ty: state.ty,
    tz: state.tz,
    panX: state.panX,
    panY: state.panY,
    panZ: state.panZ,
    ...overrides,
  };
}

/** One-shot 0→1 framing progress used for HUD "transition" indicators. */
export function transitionProgress(elapsed: number, duration: number): number {
  if (duration <= 0) return 1;
  return easeInOutQuint(clamp(elapsed / duration, 0, 1));
}

/** Linear interpolation helper exposed for tests and HUD readouts. */
export function interpolateRadius(from: number, to: number, t: number): number {
  return lerp(from, to, clamp(t, 0, 1));
}

/** Drag threshold that separates a click (select) from an orbit drag. */
export const CLICK_THRESHOLD_PX = 6;

export function isClick(
  down: { x: number; y: number } | null,
  up: { x: number; y: number } | null,
  threshold = CLICK_THRESHOLD_PX,
): boolean {
  if (!down || !up) return false;
  return Math.hypot(up.x - down.x, up.y - down.y) <= threshold;
}

/** Pan bounds stop the user from getting lost far from any focus object. */
export function clampPan(pan: [number, number, number], max = MAX_PAN): [number, number, number] {
  return [clamp(pan[0], -max, max), clamp(pan[1], -max, max), clamp(pan[2], -max, max)];
}
