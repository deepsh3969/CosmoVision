import * as THREE from 'three';
import { SCALE, SOL, PLANETS, MOONS } from './data/celestialObjects.js';
import { getPlanetTexture, getEarthMaps, getRingTexture } from './textures.js';
import { createGlowTexture } from './utils.js';

const ATMOSPHERE_VERT = /* glsl */ `
  varying vec3 vNormalV;
  varying vec3 vWorld;
  void main() {
    vNormalV = normalize(normalMatrix * normal);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const ATMOSPHERE_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uStrength;
  varying vec3 vNormalV;
  varying vec3 vWorld;
  void main() {
    float rim = pow(1.0 - abs(dot(normalize(vNormalV), vec3(0.0, 0.0, 1.0))), 2.4);
    vec3 col = uColor * rim * uStrength;
    gl_FragColor = vec4(col, rim * uStrength);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const EARTH_VERT = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vWorld;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const EARTH_FRAG = /* glsl */ `
  uniform sampler2D uDay;
  uniform sampler2D uNight;
  uniform vec3 uSunPos;
  uniform vec3 uAtmo;
  varying vec3 vNormalW;
  varying vec3 vWorld;
  varying vec2 vUv;
  void main() {
    vec3 n = normalize(vNormalW);
    vec3 sunDir = normalize(uSunPos - vWorld);
    float lambert = dot(n, sunDir);
    float dayMix = smoothstep(-0.15, 0.3, lambert);
    vec3 day = texture2D(uDay, vUv).rgb * (0.16 + 1.05 * max(lambert, 0.0));
    vec3 night = texture2D(uNight, vUv).rgb * 1.6;
    vec3 col = mix(night, day, dayMix);
    vec3 viewDir = normalize(cameraPosition - vWorld);
    float rim = pow(1.0 - max(dot(n, viewDir), 0.0), 2.6);
    col += uAtmo * rim * (0.3 + 0.55 * dayMix);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function patchRingGeometry(inner, outer, segments = 128) {
  const geometry = new THREE.RingGeometry(inner, outer, segments, 1);
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  const vertex = new THREE.Vector3();
  for (let i = 0; i < position.count; i += 1) {
    vertex.fromBufferAttribute(position, i);
    const radius = vertex.length();
    uv.setXY(i, (radius - inner) / (outer - inner), 0.5);
  }
  uv.needsUpdate = true;
  return geometry;
}

export class SolarSystem {
  constructor() {
    this.group = new THREE.Group();
    this.group.position.set(...SCALE.systemPosition);
    this.built = false;
    this.planets = [];
    this.moons = [];
    this.orbitLines = [];
    this.selectables = [];
    this.byId = new Map();
    this.sunWorld = new THREE.Vector3();
    this._v = new THREE.Vector3();
    this._textures = [];
    this._materials = [];
    this._geometries = [];
  }

  build(profile = {}) {
    if (this.built) return;
    this.built = true;
    this._buildStar();
    for (const def of PLANETS) this._buildPlanet(def, profile);
    this._buildOrbitLines();
    this.group.updateWorldMatrix(true, true);
    this.group.getWorldPosition(this.sunWorld);
    this.byId.set('solaris', { def: { id: 'solaris', name: 'SOLARIS' }, object: this.group });
  }

  _track(item) {
    if (item.geometry) this._geometries.push(item.geometry);
    if (item.material) {
      const list = Array.isArray(item.material) ? item.material : [item.material];
      for (const material of list) this._materials.push(material);
    }
    return item;
  }

  _register(def, object) {
    object.traverse((child) => {
      if (child.isMesh) {
        child.userData.objectId = def.id;
        this.selectables.push(child);
      }
    });
    this.byId.set(def.id, { def, object });
  }

  _makeAtmosphere(radius, color, strength) {
    const material = this._track(
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(color) },
          uStrength: { value: strength },
        },
        vertexShader: ATMOSPHERE_VERT,
        fragmentShader: ATMOSPHERE_FRAG,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    );
    const shell = this._track(new THREE.Mesh(this._track(new THREE.SphereGeometry(radius, 32, 20)), material));
    shell.renderOrder = 3;
    return shell;
  }

  _buildStar() {
    const group = new THREE.Group();
    group.name = 'sol';

    const surface = this._track(
      new THREE.Mesh(
        this._track(new THREE.SphereGeometry(SOL.size, 40, 26)),
        this._track(new THREE.MeshBasicMaterial({ color: '#fff3d0' })),
      ),
    );
    group.add(surface);

    const coronaMaterial = this._track(
      new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color('#ffb45c') }, uStrength: { value: 1.5 } },
        vertexShader: ATMOSPHERE_VERT,
        fragmentShader: ATMOSPHERE_FRAG,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    );
    const corona = this._track(new THREE.Mesh(this._track(new THREE.SphereGeometry(SOL.size * 1.7, 32, 20)), coronaMaterial));
    group.add(corona);

    const glowTexture = new THREE.CanvasTexture(createGlowTexture(256, 'rgba(255,240,200,1)', 'rgba(255,150,40,0)'));
    glowTexture.colorSpace = THREE.SRGBColorSpace;
    const glow = this._track(
      new THREE.Sprite(
        this._track(new THREE.SpriteMaterial({ map: glowTexture, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })),
      ),
    );
    glow.scale.setScalar(SOL.size * 7);
    group.add(glow);

    const light = new THREE.PointLight('#ffe3b8', 14, 0, 1);
    group.add(light);
    this.sunLight = light;

    this.group.add(group);
    this.byId.set('sol', { def: SOL, object: group });
    this.selectables.push(surface);
    surface.userData.objectId = 'sol';
    this.sunGroup = group;
  }

  _buildPlanet(def, profile) {
    const pivot = new THREE.Object3D();
    pivot.rotation.z = def.orbit.tilt;

    const holder = new THREE.Object3D();
    holder.position.x = def.orbit.radius;
    pivot.add(holder);

    let material;
    if (def.id === 'earth') {
      const maps = getEarthMaps();
      this._textures.push(maps.day, maps.night, maps.clouds);
      material = this._track(
        new THREE.ShaderMaterial({
          uniforms: {
            uDay: { value: maps.day },
            uNight: { value: maps.night },
            uSunPos: { value: this.sunWorld },
            uAtmo: { value: new THREE.Color('#5fa8ff') },
          },
          vertexShader: EARTH_VERT,
          fragmentShader: EARTH_FRAG,
        }),
      );
    } else {
      const map = getPlanetTexture(def.texture);
      this._textures.push(map);
      material = this._track(
        new THREE.MeshStandardMaterial({ map, roughness: def.type === 'Gas Giant' || def.type === 'Ice Giant' ? 0.72 : 0.92, metalness: 0.02 }),
      );
    }

    const mesh = this._track(new THREE.Mesh(this._track(new THREE.SphereGeometry(def.size, 44, 30)), material));
    mesh.rotation.z = 0.12;
    holder.add(mesh);

    if (def.id === 'earth') {
      const clouds = getEarthMaps().clouds;
      const cloudMesh = this._track(
        new THREE.Mesh(
          this._track(new THREE.SphereGeometry(def.size * 1.017, 40, 26)),
          this._track(new THREE.MeshLambertMaterial({ map: clouds, transparent: true, opacity: 0.88, depthWrite: false })),
        ),
      );
      holder.add(cloudMesh);
      holder.userData.clouds = cloudMesh;
      holder.add(this._makeAtmosphere(def.size * 1.28, '#4f8fdc', 0.85));
    } else if (def.id === 'venus') {
      holder.add(this._makeAtmosphere(def.size * 1.2, '#ffd9a0', 0.7));
    } else if (def.type === 'Gas Giant' || def.type === 'Ice Giant') {
      holder.add(this._makeAtmosphere(def.size * 1.12, def.color, 0.4));
    }

    if (def.ring) {
      const geometry = this._track(patchRingGeometry(def.size * def.ring.inner, def.size * def.ring.outer));
      const map = getRingTexture(def.ring.color, def.ring.faint);
      this._textures.push(map);
      const ringMaterial = this._track(
        new THREE.MeshBasicMaterial({ map, transparent: true, side: THREE.DoubleSide, depthWrite: false, opacity: 0.95 }),
      );
      const ring = this._track(new THREE.Mesh(geometry, ringMaterial));
      ring.rotation.x = Math.PI / 2;
      holder.add(ring);
    }

    // Moons
    const moons = MOONS.filter((moon) => moon.parent === def.id);
    for (const moonDef of moons) {
      const moonPivot = new THREE.Object3D();
      moonPivot.rotation.z = moonDef.orbit.tilt;
      const moonHolder = new THREE.Object3D();
      moonHolder.position.x = moonDef.orbit.radius;
      moonPivot.add(moonHolder);
      const moonMaterial = this._track(new THREE.MeshStandardMaterial({ map: getPlanetTexture(moonDef.texture), roughness: 0.95 }));
      const moonMesh = this._track(new THREE.Mesh(this._track(new THREE.SphereGeometry(moonDef.size, 26, 18)), moonMaterial));
      moonHolder.add(moonMesh);
      if (moonDef.id === 'luna') {
        moonHolder.add(this._makeAtmosphere(moonDef.size * 1.4, '#8fb4d8', 0.25));
      }
      holder.add(moonPivot);
      const entry = { def: moonDef, pivot: moonPivot, holder: moonHolder, mesh: moonMesh, angle: Math.random() * Math.PI * 2 };
      this.moons.push(entry);
      this.byId.set(moonDef.id, { def: moonDef, object: moonMesh });
      moonMesh.userData.objectId = moonDef.id;
      this.selectables.push(moonMesh);
    }

    this.group.add(pivot);
    const planet = { def, pivot, holder, mesh, angle: Math.random() * Math.PI * 2 };
    this.planets.push(planet);
    this._register(def, mesh);
    mesh.userData.objectId = def.id;
    this._setPlanetAngle(planet, planet.angle);
  }

  _setPlanetAngle(planet, angle) {
    planet.pivot.rotation.y = angle;
    planet.angle = angle;
  }

  _buildOrbitLines() {
    for (const planet of this.planets) {
      if (planet.def.orbit.radius <= 0) continue;
      const points = [];
      const segments = 160;
      for (let i = 0; i <= segments; i += 1) {
        const a = (i / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(a) * planet.def.orbit.radius, 0, -Math.sin(a) * planet.def.orbit.radius));
      }
      const geometry = this._track(new THREE.BufferGeometry().setFromPoints(points));
      const material = this._track(
        new THREE.LineBasicMaterial({ color: planet.def.color, transparent: true, opacity: 0.22, depthWrite: false }),
      );
      const line = new THREE.Line(geometry, material);
      line.rotation.z = planet.def.orbit.tilt;
      this.group.add(line);
      this.orbitLines.push(line);
    }

    for (const moon of this.moons) {
      const points = [];
      const segments = 72;
      for (let i = 0; i <= segments; i += 1) {
        const a = (i / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(a) * moon.def.orbit.radius, 0, -Math.sin(a) * moon.def.orbit.radius));
      }
      const geometry = this._track(new THREE.BufferGeometry().setFromPoints(points));
      const material = this._track(new THREE.LineBasicMaterial({ color: '#9fb4d8', transparent: true, opacity: 0.16 }));
      const line = new THREE.Line(geometry, material);
      line.rotation.z = moon.def.orbit.tilt;
      moon.holder.add(line);
      this.orbitLines.push(line);
    }
  }

  update({ dt, timeScale, cameraDistance }) {
    const step = dt * timeScale;
    for (const planet of this.planets) {
      this._setPlanetAngle(planet, planet.angle + planet.def.orbit.speed * step);
      planet.mesh.rotation.y += planet.def.spin * step;
      const clouds = planet.holder.userData.clouds;
      if (clouds) clouds.rotation.y += 0.055 * step;
    }
    for (const moon of this.moons) {
      moon.angle += moon.def.orbit.speed * step;
      moon.pivot.rotation.y = moon.angle;
      moon.mesh.rotation.y += moon.def.spin * step;
    }
    const showOrbits = cameraDistance < 16;
    for (const line of this.orbitLines) line.visible = showOrbits;
    if (this.sunGroup) this.sunGroup.rotation.y += 0.02 * step;
  }

  // Local-space position (inside system group) of a planet pivot holder.
  getPlanetLocalPosition(id, target) {
    const planet = this.planets.find((entry) => entry.def.id === id);
    if (!planet) return null;
    planet.pivot.updateMatrix();
    return target.copy(planet.holder.position).applyMatrix4(planet.pivot.matrix);
  }

  getMoonLocalPosition(id, target) {
    const moon = this.moons.find((entry) => entry.def.id === id);
    if (!moon) return null;
    moon.holder.getWorldPosition(target);
    return this.group.worldToLocal(target);
  }

  getWorldPosition(id, target = new THREE.Vector3()) {
    const entry = this.byId.get(id);
    if (!entry) return null;
    if (id === 'solaris' || id === 'sol') return target.copy(this.sunWorld);
    entry.object.getWorldPosition(target);
    return target;
  }

  getObject(id) {
    return this.byId.get(id)?.object || null;
  }

  getSelectableMeshes() {
    return this.selectables;
  }

  dispose() {
    for (const geometry of this._geometries) geometry.dispose?.();
    for (const material of this._materials) material.dispose?.();
    for (const texture of this._textures) texture.dispose?.();
    this.group.clear();
    this.planets.length = 0;
    this.moons.length = 0;
    this.selectables.length = 0;
    this.byId.clear();
  }
}

// Deep-space nebula billboards for parallax in galaxy view (3 sprites, 1 texture each).
export function createNebulaSprites() {
  const group = new THREE.Group();
  const specs = [
    { pos: [-13, 5, -16], color: 'rgba(150,90,255,0.5)', size: 26 },
    { pos: [16, -6, 14], color: 'rgba(60,140,255,0.45)', size: 30 },
    { pos: [-4, 8, 22], color: 'rgba(255,110,180,0.35)', size: 22 },
  ];
  for (const spec of specs) {
    const texture = new THREE.CanvasTexture(createGlowTexture(256, spec.color, 'rgba(0,0,0,0)'));
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({ map: texture, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.22 });
    const sprite = new THREE.Sprite(material);
    sprite.position.set(...spec.pos);
    sprite.scale.setScalar(spec.size);
    group.add(sprite);
  }
  return group;
}
