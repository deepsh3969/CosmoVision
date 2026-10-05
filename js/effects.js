import * as THREE from 'three';
import { clamp } from './utils.js';

// Cinematic travel effects: velocity streaks + high-speed camera shake.
export class SpeedEffects {
  constructor(camera, profile = {}) {
    this.camera = camera;
    this.enabled = (profile.streaks ?? 0) > 0;
    this.group = new THREE.Group();
    this.group.frustumCulled = false;
    this.count = profile.streaks ?? 0;
    this._shakeOffset = new THREE.Vector3();
    this._shaking = false;

    if (this.count > 0) {
      const positions = new Float32Array(this.count * 6);
      const seeds = new Float32Array(this.count * 2);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
      geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -6), 40);
      this.geometry = geometry;

      const material = new THREE.LineBasicMaterial({
        color: '#cfe6ff',
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      this.material = material;
      this.lines = new THREE.LineSegments(geometry, material);
      this.lines.frustumCulled = false;
      this.group.add(this.lines);
      this._seed();
    }
  }

  attach(scene) {
    scene.add(this.group);
  }

  _seed() {
    const position = this.geometry.attributes.position;
    for (let i = 0; i < this.count; i += 1) {
      const x = (Math.random() - 0.5) * 14;
      const y = (Math.random() - 0.5) * 9;
      const z = -2 - Math.random() * 16;
      position.setXYZ(i * 2, x, y, z);
      position.setXYZ(i * 2 + 1, x, y, z);
    }
    position.needsUpdate = true;
  }

  setProfile(profile) {
    const wanted = profile.streaks ?? 0;
    this.enabled = wanted > 0 && this.count > 0;
    this.group.visible = this.enabled;
  }

  // speed in world units/s; returns true while streaks are visible.
  update(dt, speed, cinematic, reducedMotion) {
    const intensity = cinematic && !reducedMotion ? clamp((speed - 2.6) / 8, 0, 1) : 0;
    if (this.enabled) {
      this.group.position.copy(this.camera.position);
      this.group.quaternion.copy(this.camera.quaternion);
      this.material.opacity = intensity * 0.75;
      this.group.visible = intensity > 0.01;
      if (this.group.visible) {
        const position = this.geometry.attributes.position;
        const length = 0.5 + intensity * 7;
        for (let i = 0; i < this.count; i += 1) {
          const x = position.getX(i * 2);
          const y = position.getY(i * 2);
          const z = position.getZ(i * 2);
          position.setXYZ(i * 2 + 1, x, y, z + length);
        }
        position.needsUpdate = true;
      }
    }
    return intensity > 0.01;
  }

  // Call before rendering; pair with endFrame() after post-processing.
  beginFrame(dt, speed, cinematic, reducedMotion) {
    const shake = cinematic && !reducedMotion ? clamp((speed - 5.5) / 9, 0, 1) : 0;
    if (shake > 0.01) {
      const amplitude = shake * 0.03;
      this._shakeOffset.set(
        (Math.random() - 0.5) * amplitude,
        (Math.random() - 0.5) * amplitude,
        (Math.random() - 0.5) * amplitude,
      );
      this.camera.position.add(this._shakeOffset);
      this._shaking = true;
    } else if (this._shaking) {
      this._shaking = false;
      this._shakeOffset.set(0, 0, 0);
    }
    return shake;
  }

  endFrame() {
    if (this._shaking) {
      this.camera.position.sub(this._shakeOffset);
      this._shaking = false;
    }
  }

  dispose() {
    this.geometry?.dispose();
    this.material?.dispose();
    this.group.removeFromParent();
  }
}
