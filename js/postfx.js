import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export class PostFX {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.enabled = true;
    this.available = true;

    try {
      const size = renderer.getSize(new THREE.Vector2());
      this.composer = new EffectComposer(renderer);
      this.renderPass = new RenderPass(scene, camera);
      this.bloomPass = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.4, 0.4, 0.55);
      this.outputPass = new OutputPass();
      this.composer.addPass(this.renderPass);
      this.composer.addPass(this.bloomPass);
      this.composer.addPass(this.outputPass);
      this.composer.setSize(size.x, size.y);
    } catch (error) {
      this.available = false;
      this.enabled = false;
    }
  }

  setEnabled(enabled) {
    this.enabled = enabled && this.available;
  }

  setGlow(strength) {
    if (!this.bloomPass) return;
    this.bloomPass.strength = 0.15 + strength * 0.28;
  }

  setResolution(width, height, pixelRatio) {
    if (!this.composer) return;
    this.composer.setPixelRatio?.(pixelRatio);
    this.composer.setSize(width, height);
    this.bloomPass?.resolution.set(width, height);
  }

  render(delta) {
    if (this.enabled && this.available) {
      this.composer.render(delta);
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  dispose() {
    this.composer?.dispose?.();
    this.bloomPass?.dispose?.();
    this.renderPass?.dispose?.();
    this.outputPass?.dispose?.();
  }
}
