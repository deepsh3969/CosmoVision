import * as THREE from 'three';
import { mulberry32, gaussian, clamp, hexToRgb, mixRgb } from './utils.js';

const GENERATION_SEED = 20261004;

const POINT_VERTEX_SHADER = `
  uniform float uTime;
  uniform float uSize;
  uniform float uRotation;
  uniform float uEnergy;
  uniform float uPixelRatio;
  uniform float uFogDensity;
  uniform float uGlow;
  uniform float uBass;
  uniform float uMid;
  uniform float uHigh;
  uniform float uAudioMix;
    uniform float uMaxSize;
    uniform float uTwinkle;
    uniform float uRadius;

  attribute vec3 aColor;
  attribute float aSize;
  attribute float aSeed;
  attribute float aRadius;
  attribute float aAlpha;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec3 pos = position;

    float radial = clamp(aRadius / max(uRadius, 0.001), 0.0, 1.0);
    float spin = uTime * uRotation * (1.0 + 0.08 * (1.0 - radial));
    float c = cos(spin);
    float s = sin(spin);
    pos.xz = mat2(c, -s, s, c) * pos.xz;

    pos.y += sin(uTime * 0.45 + aSeed * 6.2831) * 0.03 * (1.0 + uEnergy * 0.4);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    float depth = max(-mv.z, 0.001);

    float audioHigh = uHigh * uAudioMix;
    float twinkle = 1.0 - uTwinkle * 0.5 + uTwinkle * 0.5 * sin(uTime * (1.1 + aSeed * 2.7) + aSeed * 43.0);
    twinkle *= 1.0 + audioHigh * 0.9 * sin(uTime * 6.0 + aSeed * 20.0);

    float audioMid = uMid * uAudioMix;
    float bassPulse = 1.0 + uBass * uAudioMix * 0.25;

    float size = aSize * uSize * uPixelRatio * (170.0 / depth) * bassPulse;
    gl_PointSize = clamp(size, 0.7, uMaxSize);

    float fog = exp(-max(depth - 16.0, 0.0) * uFogDensity);
    float brightness = (0.32 + 0.55 * uEnergy) * uGlow * (1.0 + audioMid * 0.55);
    float centerSoftening = mix(0.12, 1.0, smoothstep(0.0, uRadius * 0.14, aRadius));

    vColor = aColor;
    vAlpha = aAlpha * twinkle * fog * brightness * centerSoftening * 0.4;
    gl_Position = projectionMatrix * mv;
  }
`;

const POINT_FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float falloff = 1.0 - d * 2.0;
    float soft = falloff * falloff;
    float hot = pow(falloff, 6.0);
    vec3 col = vColor * (0.5 + 1.15 * soft) + vColor * hot * 0.55;
    gl_FragColor = vec4(col, vAlpha * soft);
  }
`;

function createPointMaterial(uniforms, maxSize, twinkle) {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...uniforms,
      uMaxSize: { value: maxSize },
      uTwinkle: { value: twinkle },
    },
    vertexShader: POINT_VERTEX_SHADER,
    fragmentShader: POINT_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
  });
}

export class Galaxy {
  constructor() {
    this.group = new THREE.Group();
    this.uniforms = {
      uTime: { value: 0 },
      uSize: { value: 1 },
      uRotation: { value: 0.14 },
      uEnergy: { value: 0.55 },
      uPixelRatio: { value: 1 },
      uFogDensity: { value: 0.0066 },
      uGlow: { value: 1 },
      uBass: { value: 0 },
      uMid: { value: 0 },
      uHigh: { value: 0 },
      uAudioMix: { value: 0 },
      uRadius: { value: 12 },
    };

    this.coreMaterial = createPointMaterial(this.uniforms, 46, 0.9);
    this.nebulaMaterial = createPointMaterial(this.uniforms, 340, 0.35);

    this.coreGeometry = new THREE.BufferGeometry();
    this.nebulaGeometry = new THREE.BufferGeometry();

    this.corePoints = new THREE.Points(this.coreGeometry, this.coreMaterial);
    this.nebulaPoints = new THREE.Points(this.nebulaGeometry, this.nebulaMaterial);

    this.corePoints.frustumCulled = false;
    this.nebulaPoints.frustumCulled = false;
    this.corePoints.renderOrder = 1;
    this.nebulaPoints.renderOrder = 0;

    this.group.add(this.nebulaPoints, this.corePoints);
    this.particleCount = 0;
    this.nebulaCount = 0;
  }

  build(galaxyParams, visuals, theme, quality) {
    this.params = galaxyParams;
    this.visuals = visuals;
    this.theme = theme;
    this.quality = quality;
    const random = mulberry32(GENERATION_SEED);
    const total = Math.round(clamp(galaxyParams.particles, 20000, 60000) * (quality.particleScale ?? 1));
    const radius = galaxyParams.radius;
    const armCount = Math.max(2, Math.round(galaxyParams.armCount));
    const tightness = galaxyParams.armTightness;
    const spreadBase = galaxyParams.armSpread;
    const coreRadius = galaxyParams.coreRadius;

    const spiralCount = Math.round(total * 0.66);
    const bulgeCount = Math.round(total * 0.11);
    const dustCount = Math.round(total * 0.13);
    const floaterCount = total - spiralCount - bulgeCount - dustCount;

    const coreColor = hexToRgb(theme.coreColor);
    const armColor = hexToRgb(theme.armColor);
    const edgeColor = hexToRgb(theme.edgeColor);
    const dustColor = hexToRgb(theme.dustColor);

    const positions = new Float32Array(total * 3);
    const colors = new Float32Array(total * 3);
    const sizes = new Float32Array(total);
    const seeds = new Float32Array(total);
    const radii = new Float32Array(total);
    const alphas = new Float32Array(total);

    let index = 0;

    const write = (x, y, z, color, size, radius, alpha) => {
      const i3 = index * 3;
      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;
      colors[i3] = color.r / 255;
      colors[i3 + 1] = color.g / 255;
      colors[i3 + 2] = color.b / 255;
      sizes[index] = size;
      seeds[index] = random();
      radii[index] = radius;
      alphas[index] = alpha;
      index += 1;
    };

    const colorForRadius = (t) => {
      const warm = mixRgb(coreColor, armColor, clamp(t / 0.3, 0, 1));
      return mixRgb(warm, edgeColor, clamp((t - 0.55) / 0.45, 0, 1));
    };

    const jitter = (color, amount) => {
      const k = 1 - amount / 2 + random() * amount;
      return {
        r: clamp(color.r * k + (random() - 0.5) * 8, 0, 255),
        g: clamp(color.g * k + (random() - 0.5) * 8, 0, 255),
        b: clamp(color.b * k + (random() - 0.5) * 8, 0, 255),
      };
    };

    for (let i = 0; i < spiralCount; i += 1) {
      const t = Math.pow(random(), 1.35);
      const r = t * radius;
      const arm = i % armCount;
      const branch = (arm / armCount) * Math.PI * 2;
      const spin = r * (0.2 + tightness * 0.75);
      const angle = branch + spin;
      const scatter = spreadBase * (0.25 + t * 0.85);
      const x = Math.cos(angle) * r + gaussian(random) * scatter;
      const z = Math.sin(angle) * r + gaussian(random) * scatter;
      const thickness = (0.34 + t * 0.9) * (1 - t * 0.55);
      const y = gaussian(random) * thickness;
      write(x, y, z, jitter(colorForRadius(t), 0.3), 0.4 + random() * 0.95, r, 1);
    }

    for (let i = 0; i < bulgeCount; i += 1) {
      const t = Math.pow(random(), 2.4);
      const r = t * coreRadius * 1.8;
      const dir = {
        x: gaussian(random),
        y: gaussian(random) * 0.55,
        z: gaussian(random),
      };
      const len = Math.hypot(dir.x, dir.y, dir.z) || 1;
      write(
        (dir.x / len) * r,
        (dir.y / len) * r,
        (dir.z / len) * r,
        jitter(colorForRadius(t * 0.35), 0.22),
        0.35 + random() * 1.0,
        r,
        0.85,
      );
    }

    for (let i = 0; i < dustCount; i += 1) {
      const t = 0.25 + Math.pow(random(), 1.2) * 0.75;
      const r = t * radius * 1.02;
      const arm = i % armCount;
      const branch = (arm / armCount) * Math.PI * 2 + 0.42;
      const spin = r * (0.2 + tightness * 0.75);
      const angle = branch + spin;
      const scatter = spreadBase * (0.6 + t * 1.5);
      const x = Math.cos(angle) * r + gaussian(random) * scatter;
      const z = Math.sin(angle) * r + gaussian(random) * scatter;
      const y = gaussian(random) * (0.5 + t * 0.7);
      write(x, y, z, jitter(dustColor, 0.35), 1.4 + random() * 2.6, r, 0.2);
    }

    for (let i = 0; i < floaterCount; i += 1) {
      const t = random();
      const r = radius * (0.45 + t * 1.1);
      const angle = random() * Math.PI * 2;
      const x = Math.cos(angle) * r + gaussian(random) * 1.4;
      const z = Math.sin(angle) * r + gaussian(random) * 1.4;
      const y = gaussian(random) * (1.4 + t * 3.2);
      write(x, y, z, jitter(colorForRadius(0.3 + t * 0.6), 0.4), 0.4 + random() * 0.9, r, 0.75);
    }

    this.coreGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.coreGeometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    this.coreGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    this.coreGeometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    this.coreGeometry.setAttribute('aRadius', new THREE.BufferAttribute(radii, 1));
    this.coreGeometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
    this.coreGeometry.computeBoundingSphere();
    this.particleCount = total;

    this.buildNebula(visuals, theme, quality, mulberry32(GENERATION_SEED + 7), radius);
  }

  buildNebula(visuals, theme, quality, random, radius) {
    const count = Math.round(1400 * clamp(visuals.nebulaDensity, 0, 2) * (quality.haloScale ?? 1));
    const nebulaColor = hexToRgb(theme.nebulaColor);
    const coreColor = hexToRgb(theme.coreColor);

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const seeds = new Float32Array(count);
    const radii = new Float32Array(count);
    const alphas = new Float32Array(count);

    for (let i = 0; i < count; i += 1) {
      const t = Math.pow(random(), 1.4);
      const r = t * radius * 1.15;
      const angle = random() * Math.PI * 2;
      const i3 = i * 3;
      positions[i3] = Math.cos(angle) * r + gaussian(random) * radius * 0.22;
      positions[i3 + 1] = gaussian(random) * (1.2 + t * 3.4);
      positions[i3 + 2] = Math.sin(angle) * r + gaussian(random) * radius * 0.22;

      const tint = mixRgb(nebulaColor, coreColor, clamp(1 - t, 0, 1) * 0.35);
      colors[i3] = tint.r / 255;
      colors[i3 + 1] = tint.g / 255;
      colors[i3 + 2] = tint.b / 255;

      sizes[i] = 18 + random() * 54;
      seeds[i] = random();
      radii[i] = r;
      alphas[i] = 0.018 + random() * 0.032;
    }

    this.nebulaGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.nebulaGeometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    this.nebulaGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    this.nebulaGeometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    this.nebulaGeometry.setAttribute('aRadius', new THREE.BufferAttribute(radii, 1));
    this.nebulaGeometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
    this.nebulaGeometry.computeBoundingSphere();
    this.nebulaCount = count;
  }

  setTheme(theme) {
    this.build(this.params, this.visuals, theme, this.quality);
  }

  update({ time, pixelRatio, visuals, params, audio }) {
    const u = this.uniforms;
    u.uTime.value = time;
    u.uSize.value = params.particleSize;
    u.uRotation.value = params.rotationSpeed;
    u.uEnergy.value = params.energy;
    u.uPixelRatio.value = pixelRatio;
    u.uFogDensity.value = visuals.fog * 0.012;
    u.uGlow.value = visuals.glow;
    u.uRadius.value = params.radius;
    u.uBass.value = audio.bass;
    u.uMid.value = audio.mid;
    u.uHigh.value = audio.high;
    u.uAudioMix.value = audio.mix;
  }

  dispose() {
    this.coreGeometry.dispose();
    this.nebulaGeometry.dispose();
    this.coreMaterial.dispose();
    this.nebulaMaterial.dispose();
  }
}
