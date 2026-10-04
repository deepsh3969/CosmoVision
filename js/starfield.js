import * as THREE from 'three';
import { mulberry32, gaussian, clamp, hexToRgb, mixRgb } from './utils.js';

const VERTEX_SHADER = `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uEnergy;
  uniform float uHigh;
  uniform float uAudioMix;

  attribute vec3 aColor;
  attribute float aSize;
  attribute float aSeed;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float depth = max(-mv.z, 0.001);

    float twinkle = 0.72 + 0.28 * sin(uTime * (0.6 + aSeed * 2.2) + aSeed * 51.0);
    twinkle *= 1.0 + uHigh * uAudioMix * 0.8 * sin(uTime * 5.0 + aSeed * 30.0);

    gl_PointSize = clamp(aSize * uPixelRatio * (420.0 / depth), 0.6, 8.0);
    vColor = aColor;
    vAlpha = twinkle * (0.35 + 0.35 * uEnergy);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float falloff = 1.0 - d * 2.0;
    gl_FragColor = vec4(vColor * (0.6 + 1.5 * falloff), vAlpha * falloff * falloff);
  }
`;

export class Starfield {
  constructor() {
    this.uniforms = {
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uEnergy: { value: 0.55 },
      uHigh: { value: 0 },
      uAudioMix: { value: 0 },
    };

    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.geometry = new THREE.BufferGeometry();
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.group = new THREE.Group();
    this.group.add(this.points);
    this.count = 0;
  }

  build(density, theme, quality) {
    const random = mulberry32(90210);
    const count = Math.round(clamp(density, 0.3, 1.8) * 5200 * (quality.haloScale ?? 1));

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const seeds = new Float32Array(count);

    const cool = hexToRgb('#cfe0ff');
    const warm = hexToRgb('#ffe6c4');
    const accent = hexToRgb(theme.armColor);

    for (let i = 0; i < count; i += 1) {
      const i3 = i * 3;
      const dir = {
        x: gaussian(random),
        y: gaussian(random),
        z: gaussian(random),
      };
      const len = Math.hypot(dir.x, dir.y, dir.z) || 1;
      const dist = 160 + random() * 520;
      positions[i3] = (dir.x / len) * dist;
      positions[i3 + 1] = (dir.y / len) * dist;
      positions[i3 + 2] = (dir.z / len) * dist;

      const pick = random();
      const base = pick < 0.62 ? cool : pick < 0.9 ? warm : accent;
      const tint = mixRgb(base, { r: 255, g: 255, b: 255 }, 0.25 * random());
      colors[i3] = tint.r / 255;
      colors[i3 + 1] = tint.g / 255;
      colors[i3 + 2] = tint.b / 255;

      sizes[i] = 0.8 + Math.pow(random(), 3) * 3.4;
      seeds[i] = random();
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    this.geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    this.geometry.computeBoundingSphere();
    this.count = count;
  }

  update({ time, pixelRatio, energy, audio }) {
    this.uniforms.uTime.value = time;
    this.uniforms.uPixelRatio.value = pixelRatio;
    this.uniforms.uEnergy.value = energy;
    this.uniforms.uHigh.value = audio.high;
    this.uniforms.uAudioMix.value = audio.mix;
    this.group.rotation.y = time * 0.004;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
