import * as THREE from 'three';
import { clamp } from './utils.js';

// Newtonian-feel flight model: acceleration, inertia, damping, boost, brake.
export class SpacecraftController {
  constructor(camera, domElement) {
    this.camera = camera;
    this.dom = domElement;
    this.active = false;

    this.velocity = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.roll = 0;
    this.keys = new Set();
    this.fuel = 100;
    this.speed = 0;
    this.boosting = false;
    this.gestureSteer = 0;
    this.gestureTilt = 0;

    this._dragging = false;
    this._lastX = 0;
    this._lastY = 0;
    this._yawTarget = 0;
    this._pitchTarget = 0;
    this._rollTarget = 0;
    this._euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this._forward = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._up = new THREE.Vector3();

    this.maxSpeed = 8;
    this.boostSpeed = 15;
    this.thrust = 5.2;

    this._bind();
  }

  _bind() {
    this.onPointerDown = (event) => {
      if (!this.active || event.button !== 0) return;
      this._dragging = true;
      this._lastX = event.clientX;
      this._lastY = event.clientY;
    };
    this.onPointerMove = (event) => {
      if (!this.active || !this._dragging) return;
      const dx = event.clientX - this._lastX;
      const dy = event.clientY - this._lastY;
      this._lastX = event.clientX;
      this._lastY = event.clientY;
      this._yawTarget -= dx * 0.0034;
      this._pitchTarget = clamp(this._pitchTarget - dy * 0.0034, -1.5, 1.5);
    };
    this.onPointerUp = () => {
      this._dragging = false;
    };
    this.onWheel = (event) => {
      if (!this.active) return;
      event.preventDefault();
      this._collectOrientation();
      const impulse = -clamp(event.deltaY, -240, 240) * 0.0016;
      this.velocity.addScaledVector(this._forward, impulse * 3.2);
    };
    this.onKeyDown = (event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      const key = event.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'q', 'e', 'shift', ' '].includes(key)) {
        if (key === ' ' && this.active) event.preventDefault();
        this.keys.add(key);
      }
    };
    this.onKeyUp = (event) => this.keys.delete(event.key.toLowerCase());
    this.onBlur = () => this.keys.clear();

    this.dom.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove, { passive: true });
    window.addEventListener('pointerup', this.onPointerUp);
    this.dom.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }

  _collectOrientation() {
    this._euler.setFromQuaternion(this.camera.quaternion, 'YXZ');
    this.yaw = this._euler.y;
    this.pitch = this._euler.x;
    this.roll = this._euler.z;
    this._yawTarget = this.yaw;
    this._pitchTarget = this.pitch;
    this._rollTarget = this.roll;
  }

  enter() {
    this.active = true;
    this.velocity.set(0, 0, 0);
    this._collectOrientation();
    this._dragging = false;
  }

  exit() {
    this.active = false;
    this.velocity.set(0, 0, 0);
    this.keys.clear();
    this._dragging = false;
  }

  setGestureSteer(steer, tilt) {
    this.gestureSteer = steer;
    this.gestureTilt = tilt;
  }

  update(dt) {
    if (!this.active) return { speed: 0, boosting: false };

    this._yawTarget += this.gestureSteer * dt * 0.8;
    this._pitchTarget = clamp(this._pitchTarget - this.gestureTilt * dt * 0.7, -1.5, 1.5);

    this.yaw += (this._yawTarget - this.yaw) * (1 - Math.exp(-9 * dt));
    this.pitch += (this._pitchTarget - this.pitch) * (1 - Math.exp(-9 * dt));

    if (this.keys.has('q')) this._rollTarget -= dt * 1.7;
    if (this.keys.has('e')) this._rollTarget += dt * 1.7;
    this.roll += (this._rollTarget - this.roll) * (1 - Math.exp(-6 * dt));

    this._euler.set(this.pitch, this.yaw, this.roll, 'YXZ');
    this.camera.quaternion.setFromEuler(this._euler);

    this._forward.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
    this._right.set(1, 0, 0).applyQuaternion(this.camera.quaternion);
    this._up.set(0, 1, 0).applyQuaternion(this.camera.quaternion);

    const wantsBoost = this.keys.has('shift') && this.fuel > 0.5;
    this.boosting = wantsBoost && (this.keys.has('w') || this.keys.has('s') || this.keys.has('a') || this.keys.has('d'));
    const power = this.thrust * (this.boosting ? 3.4 : 1);

    let thrusting = false;
    if (this.keys.has('w')) {
      this.velocity.addScaledVector(this._forward, power * dt);
      thrusting = true;
    }
    if (this.keys.has('s')) {
      this.velocity.addScaledVector(this._forward, -power * 0.7 * dt);
      thrusting = true;
    }
    if (this.keys.has('a')) {
      this.velocity.addScaledVector(this._right, -power * 0.75 * dt);
      thrusting = true;
    }
    if (this.keys.has('d')) {
      this.velocity.addScaledVector(this._right, power * 0.75 * dt);
      thrusting = true;
    }

    // Space brake + gentle interstellar drag keep the craft controllable.
    if (this.keys.has(' ')) this.velocity.multiplyScalar(Math.exp(-3.6 * dt));
    this.velocity.multiplyScalar(Math.exp(-0.34 * dt));

    const max = this.boosting ? this.boostSpeed : this.maxSpeed;
    const speed = this.velocity.length();
    if (speed > max) this.velocity.multiplyScalar(max / speed);

    this.camera.position.addScaledVector(this.velocity, dt);
    this.speed = this.velocity.length();

    if (this.boosting) this.fuel = clamp(this.fuel - 7 * dt, 0, 100);
    else if (thrusting) this.fuel = clamp(this.fuel - 1.1 * dt, 0, 100);
    else this.fuel = clamp(this.fuel + 2.4 * dt, 0, 100);

    return { speed: this.speed, boosting: this.boosting };
  }

  dispose() {
    this.dom.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    this.dom.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
  }
}
