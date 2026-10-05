import * as THREE from 'three';
import { clamp } from './utils.js';

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Owns camera behaviour across modes: orbit, free flight, follow, cinematic,
// plus cinematic focus transitions (no teleports — always interpolated).
export class CameraRig {
  constructor(camera, controls, spacecraft, callbacks = {}) {
    this.camera = camera;
    this.controls = controls;
    this.spacecraft = spacecraft;
    this.callbacks = callbacks;

    this.mode = 'orbit';
    this.focusId = null;
    this.focusResolver = null;
    this.focusDistance = 4;
    this.transition = null;
    this.orbitActive = true;

    this._center = new THREE.Vector3();
    this._offset = new THREE.Vector3();
    this._dir = new THREE.Vector3();
    this._targetPos = new THREE.Vector3();
    this._fromPos = new THREE.Vector3();
    this._fromQuat = new THREE.Quaternion();
    this._lookQuat = new THREE.Quaternion();
    this._m = new THREE.Matrix4();
    this._up = new THREE.Vector3(0, 1, 0);
    this._cinematicDrift = 0;
  }

  get inFocus() {
    return Boolean(this.focusId);
  }

  // Derive orbit spherical parameters that match the camera's current pose.
  syncOrbitFrom(center) {
    this._offset.subVectors(this.camera.position, center);
    const radius = Math.max(this._offset.length(), 0.001);
    const theta = Math.atan2(this._offset.z, this._offset.x);
    const phi = Math.acos(clamp(this._offset.y / radius, -1, 1));
    const c = this.controls;
    c.thetaTarget = theta;
    c.phiTarget = phi;
    c.radiusTarget = radius;
    c.targetGoal.copy(center);
    c.theta = theta;
    c.phi = phi;
    c.radius = radius;
    c.target.copy(center);
    c.lastInteraction = performance.now();
  }

  focusOn(id, resolver, distance, { instant = false } = {}) {
    const center = resolver(this._center);
    if (!center) return false;

    if (this.mode === 'flight') {
      this.spacecraft.exit();
    }
    this.focusId = id;
    this.focusResolver = resolver;
    this.focusDistance = distance;
    this.callbacks.onFocusStart?.(id);

    if (instant) {
      this._dir.set(0.55, 0.3, 1).normalize();
      this._targetPos.copy(center).addScaledVector(this._dir, distance);
      this.camera.position.copy(this._targetPos);
      this.camera.lookAt(center);
      this._settleMode('follow');
      return true;
    }

    this._offset.subVectors(this.camera.position, center);
    if (this._offset.lengthSq() < 1e-8) this._offset.set(0.55, 0.3, 1);
    this._dir.copy(this._offset).normalize();
    this._fromPos.copy(this.camera.position);
    this._fromQuat.copy(this.camera.quaternion);
    this.transition = { t: 0, duration: 1.7, startedAt: performance.now() };
    this.controls.setInputBlocked(true);
    this.orbitActive = false;
    return true;
  }

  cancelTransition() {
    if (!this.transition) return;
    this.transition = null;
    this.controls.setInputBlocked(false);
    this._settleMode(this.focusId ? 'follow' : 'orbit');
  }

  _settleMode(mode) {
    this.mode = mode;
    const center = this.focusResolver ? this.focusResolver(this._center) : this._center.set(0, 0, 0);
    if (center) this.syncOrbitFrom(center);
    this.controls.setActive(true);
    this.controls.setInputBlocked(false);
    this.orbitActive = true;
    this.callbacks.onModeChange?.(mode);
  }

  clearFocus() {
    const hadFocus = Boolean(this.focusId);
    this.focusId = null;
    this.focusResolver = null;
    this.transition = null;
    if (this.mode === 'flight') this.spacecraft.exit();
    this.mode = 'orbit';
    this.controls.setActive(true);
    this.controls.setInputBlocked(false);
    this.orbitActive = true;
    if (hadFocus) this.callbacks.onFocusEnd?.(null);
  }

  setMode(mode) {
    if (mode === this.mode && !this.transition) return;

    if (mode === 'flight') {
      this.transition = null;
      this.mode = 'flight';
      this.controls.setActive(false);
      this.spacecraft.enter();
      this.orbitActive = false;
      this.callbacks.onModeChange?.('flight');
      return;
    }

    const leavingFlight = this.mode === 'flight';
    this.spacecraft.exit();
    this.controls.setActive(true);

    if (mode === 'follow' && this.focusId && this.focusResolver) {
      const center = this.focusResolver(this._center);
      if (center && leavingFlight) this.syncOrbitFrom(center);
      this._settleMode('follow');
      return;
    }

    if (mode === 'cinematic') {
      this.mode = 'cinematic';
      this.controls.setInputBlocked(false);
      this.orbitActive = true;
      this.callbacks.onModeChange?.('cinematic');
      return;
    }

    // Plain orbit
    if (leavingFlight) {
      const center = this.focusId && this.focusResolver ? this.focusResolver(this._center) : this._center.set(0, 0, 0);
      this.syncOrbitFrom(center);
    }
    this._settleMode('orbit');
  }

  update(dt) {
    if (this.transition) {
      const tr = this.transition;
      const center = this.focusResolver ? this.focusResolver(this._center) : null;
      if (!center) {
        this.cancelTransition();
        return;
      }
      // Wall-clock timing keeps focus transitions on schedule at any frame rate.
      tr.t = Math.min((performance.now() - tr.startedAt) / 1000 / tr.duration, 1);
      const ease = easeInOut(tr.t);
      this._targetPos.copy(center).addScaledVector(this._dir, this.focusDistance);
      this.camera.position.lerpVectors(this._fromPos, this._targetPos, ease);
      this._m.lookAt(this.camera.position, center, this._up);
      this._lookQuat.setFromRotationMatrix(this._m);
      this.camera.quaternion.slerpQuaternions(this._fromQuat, this._lookQuat, ease);
      if (tr.t >= 1) {
        this.transition = null;
        this._settleMode('follow');
      }
      return;
    }

    if (this.mode === 'follow' && this.focusId && this.focusResolver) {
      const center = this.focusResolver(this._center);
      if (center) this.controls.targetGoal.copy(center);
    }

    if (this.mode === 'cinematic') {
      this._cinematicDrift += dt;
      this.controls.thetaTarget += dt * 0.06;
      if (this._cinematicDrift > 6) {
        this.controls.phiTarget = clamp(this.controls.phiTarget + Math.sin(this._cinematicDrift * 0.4) * dt * 0.05, 0.2, 1.4);
      }
    }
  }

  // Reframe the current focus from a wider/narrower band (used by view buttons).
  reframe(distance) {
    this.focusDistance = distance;
    if (this.transition) {
      this.transition = null;
    }
    const center = this.focusResolver ? this.focusResolver(this._center) : null;
    if (!center) return;
    this._offset.subVectors(this.camera.position, center);
    if (this._offset.lengthSq() < 1e-8) this._offset.set(0.55, 0.3, 1);
    this._dir.copy(this._offset).normalize();
    this._fromPos.copy(this.camera.position);
    this._fromQuat.copy(this.camera.quaternion);
    this.transition = { t: 0, duration: 1.2, startedAt: performance.now() };
    this.controls.setInputBlocked(true);
    this.orbitActive = false;
  }
}
