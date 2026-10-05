import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const LENS_SHADER = {
  uniforms: {
    tDiffuse: { value: null },
    uAmount: { value: 0 },
    uWarp: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uAmount;
    uniform float uWarp;
    varying vec2 vUv;
    void main() {
      vec2 c = vUv - 0.5;
      float r2 = dot(c, c);
      vec2 uv = 0.5 + c * (1.0 + uWarp * r2 * 0.85);
      vec2 shift = c * uAmount * (0.4 + r2 * 2.6);
      float r = texture2D(tDiffuse, uv + shift).r;
      float g = texture2D(tDiffuse, uv).g;
      float b = texture2D(tDiffuse, uv - shift).b;
      gl_FragColor = vec4(r, g, b, 1.0);
    }
  `,
};

export class PostFX {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.enabled = true;
    this.available = true;
    this.cinematic = true;
    this.baseChroma = 0.0016;

    try {
      const size = renderer.getSize(new THREE.Vector2());
      this.composer = new EffectComposer(renderer);
      this.renderPass = new RenderPass(scene, camera);
      this.bloomPass = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.4, 0.4, 0.55);
      this.lensPass = new ShaderPass(LENS_SHADER);
      this.outputPass = new OutputPass();
      this.composer.addPass(this.renderPass);
      this.composer.addPass(this.bloomPass);
      this.composer.addPass(this.lensPass);
      this.composer.addPass(this.outputPass);
      this.composer.setSize(size.x, size.y);
    } catch (error) {
      this.available = false;
      this.enabled = false;
    }
  }

  setEnabled(enabled) {
    this.enabled = enabled && this.available;
    if (this.lensPass) this.lensPass.enabled = this.enabled;
  }

  setGlow(strength) {
    if (!this.bloomPass) return;
    this.bloomPass.strength = 0.15 + strength * 0.28;
  }

  setCinematic(active) {
    this.cinematic = active;
    this._syncLens();
  }

  setWarp(amount) {
    if (!this.lensPass) return;
    this.lensPass.uniforms.uWarp.value = amount;
  }

  _syncLens() {
    if (!this.lensPass) return;
    this.lensPass.uniforms.uAmount.value = this.cinematic ? this.baseChroma : 0;
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
    this.lensPass?.dispose?.();
    this.outputPass?.dispose?.();
  }
}
