import * as THREE from 'three';
import { WORMHOLES } from './data/celestialObjects.js';
import { createGlowTexture } from './utils.js';

const TUNNEL_VERT = /* glsl */ `
  attribute float aSeed;
  attribute float aDepth;
  uniform float uTime;
  varying float vDepth;
  varying float vSeed;
  void main() {
    vDepth = aDepth;
    vSeed = aSeed;
    float angle = aSeed * 6.2831 + uTime * (1.4 + aSeed * 1.6);
    float radius = mix(1.25, 0.16, aDepth) * (0.86 + 0.28 * sin(aSeed * 43.0));
    vec3 pos = vec3(cos(angle) * radius, sin(angle) * radius, -aDepth * 5.2 + 0.6);
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = (26.0 * (0.4 + aDepth * 0.9)) / max(-mv.z, 0.4);
    gl_PointSize = clamp(gl_PointSize, 1.0, 22.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const TUNNEL_FRAG = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying float vDepth;
  varying float vSeed;
  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float d = length(p);
    if (d > 0.5) discard;
    float glow = pow(1.0 - d * 2.0, 2.2);
    vec3 col = mix(uColorB, uColorA, vDepth) * (0.7 + vSeed * 0.6);
    gl_FragColor = vec4(col * glow, glow * 0.9);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const DISC_FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    if (r > 1.0) discard;
    float a = atan(p.y, p.x);
    float swirl = sin(a * 3.0 - uTime * 3.2 + r * 9.0) * 0.5 + 0.5;
    float bands = sin(a * 7.0 + uTime * 2.0 - r * 14.0) * 0.5 + 0.5;
    vec3 col = mix(uColorB, uColorA, swirl) * (0.3 + bands * 0.55);
    float hole = smoothstep(0.0, 0.42, r);
    float rim = smoothstep(1.0, 0.72, r);
    col *= hole * (0.32 + rim * 0.85);
    float alpha = smoothstep(1.0, 0.9, r) * 0.96;
    gl_FragColor = vec4(col, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const DISC_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export class WormholeManager {
  constructor() {
    this.group = new THREE.Group();
    this.holes = [];
    this.selectables = [];
    this._geometries = [];
    this._materials = [];
    this._textures = [];
    this._toCamera = new THREE.Vector3();
  }

  build(parentForSystemHoles, sceneRoot) {
    const glowCanvas = createGlowTexture(128, 'rgba(200,160,255,1)', 'rgba(80,40,200,0)');
    const glowTexture = new THREE.CanvasTexture(glowCanvas);
    this._textures.push(glowTexture);

    for (const def of WORMHOLES) {
      const root = new THREE.Group();
      root.name = def.id;

      const colorA = new THREE.Color(def.color);
      const colorB = new THREE.Color(def.color).lerp(new THREE.Color('#ffffff'), 0.35);

      const discMaterial = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uColorA: { value: colorA }, uColorB: { value: colorB } },
        vertexShader: DISC_VERT,
        fragmentShader: DISC_FRAG,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      this._materials.push(discMaterial);
      const discGeometry = new THREE.CircleGeometry(1.08, 48);
      this._geometries.push(discGeometry);
      const disc = new THREE.Mesh(discGeometry, discMaterial);
      root.add(disc);

      const count = 700;
      const positions = new Float32Array(count * 3);
      const seeds = new Float32Array(count);
      const depths = new Float32Array(count);
      for (let i = 0; i < count; i += 1) {
        seeds[i] = Math.random();
        depths[i] = Math.random();
        positions[i * 3] = 0;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = 0;
      }
      const tunnelGeometry = new THREE.BufferGeometry();
      tunnelGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      tunnelGeometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
      tunnelGeometry.setAttribute('aDepth', new THREE.BufferAttribute(depths, 1));
      tunnelGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -2), 6);
      this._geometries.push(tunnelGeometry);
      const tunnelMaterial = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uColorA: { value: colorA }, uColorB: { value: colorB } },
        vertexShader: TUNNEL_VERT,
        fragmentShader: TUNNEL_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      this._materials.push(tunnelMaterial);
      const tunnel = new THREE.Points(tunnelGeometry, tunnelMaterial);
      tunnel.frustumCulled = false;
      root.add(tunnel);

      const ringMaterial = new THREE.MeshBasicMaterial({
        color: def.color,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      this._materials.push(ringMaterial);
      const ringGeometry = new THREE.TorusGeometry(1.16, 0.045, 8, 64);
      this._geometries.push(ringGeometry);
      const ringA = new THREE.Mesh(ringGeometry, ringMaterial);
      root.add(ringA);
      const ringGeometryB = new THREE.TorusGeometry(1.3, 0.02, 6, 64);
      this._geometries.push(ringGeometryB);
      const ringB = new THREE.Mesh(ringGeometryB, ringMaterial);
      root.add(ringB);

      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.7 }));
      glow.scale.setScalar(3.6);
      root.add(glow);

      disc.userData.objectId = def.id;
      ringA.userData.objectId = def.id;
      this.selectables.push(disc, ringA);

      if (def.localPosition) {
        root.position.set(...def.localPosition);
        parentForSystemHoles.add(root);
      } else {
        root.position.set(...def.worldPosition);
        sceneRoot.add(root);
      }

      this.holes.push({ def, root, discMaterial, tunnelMaterial, ringA, ringB });
    }
  }

  update({ dt, timeScale, cameraPosition }) {
    const step = dt * timeScale;
    for (const hole of this.holes) {
      hole.discMaterial.uniforms.uTime.value += step;
      hole.tunnelMaterial.uniforms.uTime.value += step;
      hole.ringA.rotation.z += step * 0.5;
      hole.ringB.rotation.z -= step * 0.32;
      // Face the portal toward the camera (yaw only — tunnel stays on axis).
      this._toCamera.subVectors(cameraPosition, hole.root.position).normalize();
      hole.root.rotation.y = Math.atan2(this._toCamera.x, this._toCamera.z);
    }
  }

  get(id) {
    return this.holes.find((hole) => hole.def.id === id) || null;
  }

  getWorldPosition(id, target = new THREE.Vector3()) {
    const hole = this.get(id);
    if (!hole) return null;
    return hole.root.getWorldPosition(target);
  }

  getSelectableMeshes() {
    return this.selectables;
  }

  dispose() {
    for (const geometry of this._geometries) geometry.dispose?.();
    for (const material of this._materials) material.dispose?.();
    for (const texture of this._textures) texture.dispose?.();
    for (const hole of this.holes) hole.root.removeFromParent();
    this.holes.length = 0;
    this.selectables.length = 0;
  }
}
