import * as THREE from 'three';
import { STATIONS } from './data/celestialObjects.js';
import { createGlowTexture } from './utils.js';

// Procedural stations: hub + rotating docking ring + solar panels + antenna + beacons.
export class StationManager {
  constructor(system) {
    this.system = system;
    this.group = new THREE.Group();
    system.group.add(this.group);
    this.stations = [];
    this.selectables = [];
    this._geometries = [];
    this._materials = [];
    this._textures = [];
    this._local = new THREE.Vector3();
    this._angle = 0;
  }

  _track(geometry, material) {
    if (geometry) this._geometries.push(geometry);
    if (material) this._materials.push(material);
  }

  build() {
    const glowCanvas = createGlowTexture(64, 'rgba(255,255,255,1)', 'rgba(255,255,255,0)');
    const glowTexture = new THREE.CanvasTexture(glowCanvas);
    this._textures.push(glowTexture);

    for (const def of STATIONS) {
      const root = new THREE.Group();
      root.name = def.id;
      const scale = def.size;

      const hullMat = new THREE.MeshStandardMaterial({ color: '#c8d2e4', roughness: 0.42, metalness: 0.75 });
      const darkMat = new THREE.MeshStandardMaterial({ color: '#3a4358', roughness: 0.6, metalness: 0.5 });
      const panelMat = new THREE.MeshStandardMaterial({
        color: '#12245c',
        emissive: '#1d3fa8',
        emissiveIntensity: 0.55,
        roughness: 0.35,
        metalness: 0.4,
      });
      this._track(null, hullMat);
      this._track(null, darkMat);
      this._track(null, panelMat);

      const hubGeo = new THREE.CylinderGeometry(scale * 0.3, scale * 0.3, scale * 1.15, 12);
      this._track(hubGeo, null);
      const hub = new THREE.Mesh(hubGeo, hullMat);
      hub.rotation.z = Math.PI / 2;
      root.add(hub);

      const coreGeo = new THREE.SphereGeometry(scale * 0.34, 18, 12);
      this._track(coreGeo, null);
      const coreMat = new THREE.MeshStandardMaterial({
        color: def.color,
        emissive: def.color,
        emissiveIntensity: 0.7,
        roughness: 0.3,
        metalness: 0.3,
      });
      this._track(null, coreMat);
      const core = new THREE.Mesh(coreGeo, coreMat);
      root.add(core);

      const ringPivot = new THREE.Group();
      const ringGeo = new THREE.TorusGeometry(scale * 0.85, scale * 0.085, 8, 42);
      this._track(ringGeo, null);
      const ring = new THREE.Mesh(ringGeo, hullMat);
      ring.rotation.x = Math.PI / 2;
      ringPivot.add(ring);
      for (let s = 0; s < 4; s += 1) {
        const spokeGeo = new THREE.BoxGeometry(scale * 0.06, scale * 0.06, scale * 0.85);
        this._track(spokeGeo, null);
        const spoke = new THREE.Mesh(spokeGeo, darkMat);
        spoke.position.z = -scale * 0.42;
        spoke.rotation.y = (s * Math.PI) / 2;
        const pivot = new THREE.Group();
        pivot.rotation.y = (s * Math.PI) / 2;
        pivot.add(spoke);
        spoke.position.set(0, 0, scale * 0.42);
        spoke.rotation.y = 0;
        ringPivot.add(pivot);
      }
      root.add(ringPivot);

      for (const side of [-1, 1]) {
        const panelGeo = new THREE.BoxGeometry(scale * 1.15, scale * 0.02, scale * 0.42);
        this._track(panelGeo, null);
        const panel = new THREE.Mesh(panelGeo, panelMat);
        panel.position.set(0, side * scale * 0.62, 0);
        root.add(panel);
        const armGeo = new THREE.BoxGeometry(scale * 0.04, scale * 0.5, scale * 0.04);
        this._track(armGeo, null);
        const arm = new THREE.Mesh(armGeo, darkMat);
        arm.position.set(0, side * scale * 0.36, 0);
        root.add(arm);
      }

      const mastGeo = new THREE.CylinderGeometry(scale * 0.02, scale * 0.03, scale * 0.8, 6);
      this._track(mastGeo, null);
      const mast = new THREE.Mesh(mastGeo, darkMat);
      mast.position.y = scale * 0.75;
      root.add(mast);
      const dishGeo = new THREE.SphereGeometry(scale * 0.12, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
      this._track(dishGeo, null);
      const dish = new THREE.Mesh(dishGeo, hullMat);
      dish.position.y = scale * 1.14;
      dish.rotation.x = Math.PI;
      root.add(dish);

      for (let b = 0; b < 3; b += 1) {
        const beaconGeo = new THREE.SphereGeometry(scale * 0.045, 8, 6);
        this._track(beaconGeo, null);
        const beaconMat = new THREE.MeshBasicMaterial({ color: b % 2 ? '#ffb35c' : '#7ee7ff' });
        this._track(null, beaconMat);
        const beacon = new THREE.Mesh(beaconGeo, beaconMat);
        const a = (b / 3) * Math.PI * 2;
        beacon.position.set(Math.cos(a) * scale * 0.85, 0, Math.sin(a) * scale * 0.85);
        ringPivot.add(beacon);
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
        glow.scale.setScalar(scale * 0.5);
        beacon.add(glow);
      }

      root.traverse((child) => {
        if (child.isMesh) {
          child.userData.objectId = def.id;
          this.selectables.push(child);
        }
      });

      this.group.add(root);
      this.stations.push({ def, root, ringPivot, orbitAngle: Math.random() * Math.PI * 2, spin: 0.4 + Math.random() * 0.4 });
    }
  }

  update(dt, timeScale) {
    const step = dt * timeScale;
    this._angle += step;
    for (const station of this.stations) {
      station.orbitAngle += station.def.speed * step;
      const anchor = this.system.getPlanetLocalPosition(station.def.anchor, this._local);
      if (anchor) {
        const r = station.def.anchorRadius;
        station.root.position.set(
          anchor.x + Math.cos(station.orbitAngle) * r,
          anchor.y + Math.sin(station.orbitAngle * 0.7) * r * 0.35 + r * 0.2,
          anchor.z - Math.sin(station.orbitAngle) * r,
        );
      }
      station.ringPivot.rotation.y += station.spin * step;
      station.root.rotation.y += 0.03 * step;
    }
  }

  getWorldPosition(id, target = new THREE.Vector3()) {
    const station = this.stations.find((entry) => entry.def.id === id);
    if (!station) return null;
    return station.root.getWorldPosition(target);
  }

  getSelectableMeshes() {
    return this.selectables;
  }

  dispose() {
    for (const geometry of this._geometries) geometry.dispose?.();
    for (const material of this._materials) material.dispose?.();
    for (const texture of this._textures) texture.dispose?.();
    this.group.clear();
    this.stations.length = 0;
    this.selectables.length = 0;
  }
}
