import * as THREE from 'three';
import { clamp, damp, dampAngle } from './utils.js';
import { LIMITS } from './config.js';

const HOME = {
  theta: Math.PI * 0.25,
  phi: 0.86,
  radius: 36,
  target: { x: 0, y: 0, z: 0 },
};

export class OrbitController {
  constructor(camera, domElement, callbacks = {}) {
    this.camera = camera;
    this.dom = domElement;
    this.callbacks = callbacks;

    this.enabled = true;
    this.paused = false;
    this.autoRotate = true;
    this.reducedMotion = false;

    this.theta = HOME.theta;
    this.phi = HOME.phi;
    this.radius = HOME.radius;
    this.target = new THREE.Vector3(HOME.target.x, HOME.target.y, HOME.target.z);

    this.thetaTarget = this.theta;
    this.phiTarget = this.phi;
    this.radiusTarget = this.radius;
    this.targetGoal = this.target.clone();

    this.pointers = new Map();
    this.pinchDistance = 0;
    this.isPanning = false;
    this.lastInteraction = 0;
    this.keys = new Set();

    this.gestureSteer = 0;
    this.gestureZoom = 0;
    this.gestureTilt = 0;
    this.gesturePan = 0;

    this._bindEvents();
    this.apply(true);
  }

  _bindEvents() {
    this.onPointerDown = (event) => {
      if (!this.enabled) return;
      this.dom.setPointerCapture?.(event.pointerId);
      this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, button: event.button });
      this.isPanning = event.button === 2 || event.button === 1;
      this.lastInteraction = performance.now();
      if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        this.pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
      }
    };

    this.onPointerMove = (event) => {
      if (!this.enabled) return;
      const previous = this.pointers.get(event.pointerId);
      if (!previous) {
        this.callbacks.onHover?.(event.clientX, event.clientY);
        return;
      }
      const dx = event.clientX - previous.x;
      const dy = event.clientY - previous.y;
      previous.x = event.clientX;
      previous.y = event.clientY;
      this.lastInteraction = performance.now();

      if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (this.pinchDistance > 0) {
          this.radiusTarget = clamp(this.radiusTarget - (distance - this.pinchDistance) * 0.06, LIMITS.zoom.min, LIMITS.zoom.max);
        }
        this.pinchDistance = distance;
        this.thetaTarget -= dx * 0.0016;
        return;
      }

      if (this.isPanning) {
        const offset = new THREE.Vector3().subVectors(this.camera.position, this.target);
        const distance = offset.length();
        const panScale = distance * 0.0012;
        const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 0);
        const up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 1);
        this.targetGoal.addScaledVector(right, -dx * panScale);
        this.targetGoal.addScaledVector(up, dy * panScale);
        this._clampTarget();
        return;
      }

      this.thetaTarget -= dx * 0.005;
      this.phiTarget = clamp(this.phiTarget - dy * 0.005, LIMITS.phi.min, LIMITS.phi.max);
    };

    this.onPointerUp = (event) => {
      this.pointers.delete(event.pointerId);
      this.dom.releasePointerCapture?.(event.pointerId);
      if (this.pointers.size < 2) this.pinchDistance = 0;
      if (this.pointers.size === 0) this.isPanning = false;
    };

    this.onWheel = (event) => {
      if (!this.enabled) return;
      event.preventDefault();
      const delta = clamp(event.deltaY * 0.012, -4, 4);
      this.radiusTarget = clamp(this.radiusTarget * (1 + delta * 0.08), LIMITS.zoom.min, LIMITS.zoom.max);
      this.lastInteraction = performance.now();
    };

    this.onContextMenu = (event) => event.preventDefault();

    this.onKeyDown = (event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      const key = event.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'q', 'e', 'r', ' '].includes(key)) {
        if (key === ' ') {
          event.preventDefault();
          this.callbacks.onTogglePause?.();
          return;
        }
        if (key === 'r') {
          this.reset();
          return;
        }
        this.keys.add(key);
      }
    };

    this.onKeyUp = (event) => this.keys.delete(event.key.toLowerCase());

    this.dom.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove, { passive: true });
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
    this.dom.addEventListener('wheel', this.onWheel, { passive: false });
    this.dom.addEventListener('contextmenu', this.onContextMenu);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', () => this.keys.clear());
  }

  _clampTarget() {
    this.targetGoal.x = clamp(this.targetGoal.x, -8, 8);
    this.targetGoal.y = clamp(this.targetGoal.y, -6, 6);
    this.targetGoal.z = clamp(this.targetGoal.z, -8, 8);
  }

  reset() {
    this.thetaTarget = HOME.theta;
    this.phiTarget = HOME.phi;
    this.radiusTarget = HOME.radius;
    this.targetGoal.set(HOME.target.x, HOME.target.y, HOME.target.z);
    this.lastInteraction = performance.now();
    this.callbacks.onReset?.();
  }

  apply(immediate = false) {
    if (immediate) {
      this.theta = this.thetaTarget;
      this.phi = this.phiTarget;
      this.radius = this.radiusTarget;
      this.target.copy(this.targetGoal);
    } else {
      this.theta = dampAngle(this.theta, this.thetaTarget, 7, this.lastDt || 0.016);
      this.phi = damp(this.phi, this.phiTarget, 7, this.lastDt || 0.016);
      this.radius = damp(this.radius, this.radiusTarget, 6, this.lastDt || 0.016);
      this.target.x = damp(this.target.x, this.targetGoal.x, 6, this.lastDt || 0.016);
      this.target.y = damp(this.target.y, this.targetGoal.y, 6, this.lastDt || 0.016);
      this.target.z = damp(this.target.z, this.targetGoal.z, 6, this.lastDt || 0.016);
    }

    const sinPhi = Math.sin(this.phi);
    this.camera.position.set(
      this.target.x + this.radius * sinPhi * Math.cos(this.theta),
      this.target.y + this.radius * Math.cos(this.phi),
      this.target.z + this.radius * sinPhi * Math.sin(this.theta),
    );
    this.camera.lookAt(this.target);
  }

  update(dt) {
    this.lastDt = dt;

    const keyboardActive = this.enabled && this.keys.size > 0;
    if (keyboardActive) {
      const zoomStep = dt * 14;
      const rotStep = dt * 1.4;
      if (this.keys.has('w')) this.radiusTarget = clamp(this.radiusTarget - zoomStep, LIMITS.zoom.min, LIMITS.zoom.max);
      if (this.keys.has('s')) this.radiusTarget = clamp(this.radiusTarget + zoomStep, LIMITS.zoom.min, LIMITS.zoom.max);
      if (this.keys.has('a')) this.thetaTarget -= rotStep;
      if (this.keys.has('d')) this.thetaTarget += rotStep;
      if (this.keys.has('q')) this.targetGoal.y = clamp(this.targetGoal.y + dt * 3, -6, 6);
      if (this.keys.has('e')) this.targetGoal.y = clamp(this.targetGoal.y - dt * 3, -6, 6);
      this.lastInteraction = performance.now();
    }

    if (Math.abs(this.gestureSteer) > 0.0001) {
      this.thetaTarget += this.gestureSteer * dt;
    }
    if (Math.abs(this.gestureZoom) > 0.0001) {
      this.radiusTarget = clamp(this.radiusTarget + this.gestureZoom * dt * 26, LIMITS.zoom.min, LIMITS.zoom.max);
    }
    if (Math.abs(this.gestureTilt) > 0.0001) {
      this.phiTarget = clamp(this.phiTarget + this.gestureTilt * dt * 0.9, LIMITS.phi.min, LIMITS.phi.max);
    }

    const idle = performance.now() - this.lastInteraction > 2600;
    if (this.autoRotate && !this.reducedMotion && idle && this.pointers.size === 0) {
      this.thetaTarget += dt * 0.045;
    }

    this.apply();
  }

  setMouseEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) this.pointers.clear();
  }

  setGestureInput({ steer = 0, zoom = 0, tilt = 0 } = {}) {
    this.gestureSteer = steer;
    this.gestureZoom = zoom;
    this.gestureTilt = tilt;
  }

  getDistance() {
    return this.radius;
  }

  dispose() {
    this.dom.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
    this.dom.removeEventListener('wheel', this.onWheel);
    this.dom.removeEventListener('contextmenu', this.onContextMenu);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }
}

