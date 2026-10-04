import * as THREE from 'three';
import { createGlowTexture, hexToRgb, mulberry32, clamp, damp } from './utils.js';

const INNER_VERTEX_SHADER = `
  varying vec3 vNormalView;
  varying vec3 vViewDir;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vNormalView = normalize(normalMatrix * normal);
    vViewDir = normalize(-mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const INNER_FRAGMENT_SHADER = `
  uniform vec3 uCoreColor;
  uniform vec3 uInnerColor;
  uniform float uPulse;
  uniform float uIntensity;

  varying vec3 vNormalView;
  varying vec3 vViewDir;

  void main() {
    float facing = clamp(dot(normalize(vNormalView), normalize(vViewDir)), 0.0, 1.0);
    float rim = 1.0 - facing;
    vec3 color = mix(uInnerColor, uCoreColor, rim);
    float energy = (0.55 + 1.05 * uPulse) * uIntensity;
    float alpha = clamp(0.5 + 0.4 * pow(1.0 - rim, 2.0), 0.0, 1.0);
    gl_FragColor = vec4(color * energy, alpha);
  }
`;

const OUTER_VERTEX_SHADER = `
  varying vec3 vNormalView;
  varying vec3 vViewDir;
  varying vec3 vWorldPos;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vNormalView = normalize(normalMatrix * normal);
    vViewDir = normalize(-mvPosition.xyz);
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const OUTER_FRAGMENT_SHADER = `
  uniform vec3 uCoreColor;
  uniform float uPulse;
  uniform float uIntensity;
  uniform float uTime;

  varying vec3 vNormalView;
  varying vec3 vViewDir;
  varying vec3 vWorldPos;

  void main() {
    float rim = 1.0 - abs(dot(normalize(vNormalView), normalize(vViewDir)));
    float band = 0.5 + 0.5 * sin(vWorldPos.y * 6.0 + uTime * 1.6);
    float glow = pow(rim, 2.6) * (0.75 + 0.35 * band);
    float energy = (0.5 + 1.25 * uPulse) * uIntensity;
    gl_FragColor = vec4(uCoreColor * energy, clamp(glow * 0.85, 0.0, 1.0));
  }
`;

const HALO_VERTEX_SHADER = `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uPulse;

  attribute float aSeed;
  attribute float aSize;

  varying float vAlpha;

  void main() {
    vec3 pos = position;
    float spin = uTime * 0.32;
    float c = cos(spin);
    float s = sin(spin);
    pos.xz = mat2(c, -s, s, c) * pos.xz;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    float depth = max(-mv.z, 0.001);
    float twinkle = 0.6 + 0.4 * sin(uTime * (1.5 + aSeed * 3.0) + aSeed * 40.0);

    gl_PointSize = clamp(aSize * uPixelRatio * (300.0 / depth) * (0.85 + uPulse * 0.4), 0.7, 16.0);
    vAlpha = twinkle * (0.35 + uPulse * 0.5) * 0.7;
    gl_Position = projectionMatrix * mv;
  }
`;

const HALO_FRAGMENT_SHADER = `
  uniform vec3 uColor;
  varying float vAlpha;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float falloff = 1.0 - d * 2.0;
    gl_FragColor = vec4(uColor * (0.6 + 1.4 * falloff), vAlpha * falloff * falloff);
  }
`;

export class CosmicCore {
  constructor() {
    this.group = new THREE.Group();
    this.pulse = 0.5;
    this.intensity = 1;
    this.glowScale = 3.1;
    this.targetTilt = new THREE.Vector2();

    this.uniformsInner = {
      uCoreColor: { value: new THREE.Color('#ffd9a0') },
      uInnerColor: { value: new THREE.Color('#fff4e2') },
      uPulse: { value: 0.5 },
      uIntensity: { value: 1 },
    };

    this.uniformsOuter = {
      uCoreColor: { value: new THREE.Color('#ffd9a0') },
      uPulse: { value: 0.5 },
      uIntensity: { value: 1 },
      uTime: { value: 0 },
    };

    this.innerMaterial = new THREE.ShaderMaterial({
      uniforms: this.uniformsInner,
      vertexShader: INNER_VERTEX_SHADER,
      fragmentShader: INNER_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.outerMaterial = new THREE.ShaderMaterial({
      uniforms: this.uniformsOuter,
      vertexShader: OUTER_VERTEX_SHADER,
      fragmentShader: OUTER_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });

    this.innerMesh = new THREE.Mesh(new THREE.SphereGeometry(0.62, 48, 48), this.innerMaterial);
    this.outerMesh = new THREE.Mesh(new THREE.SphereGeometry(1.35, 48, 48), this.outerMaterial);

    this.ringGroup = new THREE.Group();
    const ringGeometry = new THREE.TorusGeometry(2.1, 0.028, 6, 160);
    this.ringMaterialA = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#ffc98a'),
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.ringMaterialB = this.ringMaterialA.clone();
    this.ringMaterialB.opacity = 0.45;

    this.ringA = new THREE.Mesh(ringGeometry, this.ringMaterialA);
    this.ringA.rotation.x = Math.PI / 2.35;
    this.ringB = new THREE.Mesh(new THREE.TorusGeometry(2.75, 0.02, 6, 160), this.ringMaterialB);
    this.ringB.rotation.x = Math.PI / 1.7;
    this.ringB.rotation.y = Math.PI / 5;
    this.ringGroup.add(this.ringA, this.ringB);

    this.haloUniforms = {
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uPulse: { value: 0.5 },
      uColor: { value: new THREE.Color('#ffd9a0') },
    };
    this.haloMaterial = new THREE.ShaderMaterial({
      uniforms: this.haloUniforms,
      vertexShader: HALO_VERTEX_SHADER,
      fragmentShader: HALO_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.haloPoints = new THREE.Points(this.buildHaloGeometry(), this.haloMaterial);
    this.haloPoints.frustumCulled = false;

    const glowCanvas = createGlowTexture(256, 'rgba(255,236,205,1)', 'rgba(255,200,140,0)');
    this.glowTexture = new THREE.CanvasTexture(glowCanvas);
    this.glowSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.glowTexture,
        color: new THREE.Color('#ffd0a0'),
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.glowSprite.renderOrder = 3;
    this.glowSprite.scale.setScalar(3.4);

    this.group.add(this.outerMesh, this.innerMesh, this.ringGroup, this.haloPoints, this.glowSprite);
    this.group.renderOrder = 2;
  }

  buildHaloGeometry() {
    const random = mulberry32(4242);
    const count = 1400;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i += 1) {
      const i3 = i * 3;
      const theta = random() * Math.PI * 2;
      const z = random() * 2 - 1;
      const r = 1.55 + Math.pow(random(), 1.6) * 1.9;
      const planar = Math.sqrt(Math.max(0, 1 - z * z));
      positions[i3] = Math.cos(theta) * planar * r;
      positions[i3 + 1] = z * r * 0.62;
      positions[i3 + 2] = Math.sin(theta) * planar * r;
      seeds[i] = random();
      sizes[i] = 0.5 + Math.pow(random(), 2) * 1.7;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.computeBoundingSphere();
    return geometry;
  }

  setTheme(theme) {
    const core = new THREE.Color(theme.coreColor);
    const inner = new THREE.Color(theme.innerColor);
    this.uniformsInner.uCoreColor.value.copy(core);
    this.uniformsInner.uInnerColor.value.copy(inner);
    this.uniformsOuter.uCoreColor.value.copy(core);
    this.haloUniforms.uColor.value.copy(core);
    this.ringMaterialA.color.set(theme.ringColor);
    this.ringMaterialB.color.set(theme.ringColor);
    this.glowSprite.material.color.set(theme.coreColor);
  }

  update(state) {
    const { dt, time, params, audio, cameraDistance, pointer, pixelRatio, glow } = state;
    const energy = params.energy;
    const bass = audio.bass * audio.mix;

    const distanceFactor = clamp(1.35 - (cameraDistance - 6) / 60, 0.75, 1.35);
    const target = clamp(0.35 + energy * 0.5 + bass * 0.45, 0, 1.4);
    this.pulse = damp(this.pulse, target, 6, dt);

    const breathe = 0.5 + 0.5 * Math.sin(time * 1.4);
    const pulseValue = clamp(this.pulse * 0.8 + breathe * 0.18, 0, 1.4);

    this.uniformsInner.uPulse.value = pulseValue;
    this.uniformsInner.uIntensity.value = params.coreIntensity * glow * distanceFactor;
    this.uniformsOuter.uPulse.value = pulseValue;
    this.uniformsOuter.uIntensity.value = params.coreIntensity * glow * distanceFactor;
    this.uniformsOuter.uTime.value = time;
    this.haloUniforms.uTime.value = time;
    this.haloUniforms.uPixelRatio.value = pixelRatio;
    this.haloUniforms.uPulse.value = pulseValue;

    const coreScale = 1 + pulseValue * 0.12 + bass * 0.08;
    this.innerMesh.scale.setScalar(coreScale);
    this.outerMesh.scale.setScalar(1 + pulseValue * 0.18);

    this.ringA.rotation.z += dt * (0.35 + energy * 0.5);
    this.ringB.rotation.z -= dt * (0.22 + energy * 0.4);
    this.ringGroup.rotation.y += dt * 0.12;
    this.ringGroup.rotation.x = damp(this.ringGroup.rotation.x, pointer.y * 0.25, 3, dt);
    this.ringGroup.rotation.z = damp(this.ringGroup.rotation.z, -pointer.x * 0.2, 3, dt);

    const spriteScale = this.glowScale * params.coreIntensity * (0.7 + pulseValue * 0.4) * glow * distanceFactor;
    this.glowSprite.scale.setScalar(damp(this.glowSprite.scale.x, spriteScale, 5, dt));
    this.glowSprite.material.opacity = clamp(0.4 + pulseValue * 0.35, 0, 0.8) * clamp(glow, 0.3, 1.3);
  }

  dispose() {
    this.innerMesh.geometry.dispose();
    this.outerMesh.geometry.dispose();
    this.ringA.geometry.dispose();
    this.ringB.geometry.dispose();
    this.haloPoints.geometry.dispose();
    this.innerMaterial.dispose();
    this.outerMaterial.dispose();
    this.ringMaterialA.dispose();
    this.ringMaterialB.dispose();
    this.haloMaterial.dispose();
    this.glowTexture.dispose();
    this.glowSprite.material.dispose();
  }
}
