import * as THREE from 'three';
import { BELTS } from './data/celestialObjects.js';
import { mulberry32 } from './utils.js';

// GPU-friendly asteroid fields: one InstancedMesh per belt, CPU-updated matrices.
export class AsteroidField {
  constructor(parentGroup) {
    this.group = new THREE.Group();
    parentGroup.add(this.group);
    this.meshes = [];
    this.belts = [];
    this.count = 0;
    this._geometries = [];
    this._materials = [];
    this._matrix = new THREE.Matrix4();
    this._position = new THREE.Vector3();
    this._quaternion = new THREE.Quaternion();
    this._scale = new THREE.Vector3();
    this._color = new THREE.Color();
  }

  build(profile = {}) {
    const beltScale = profile.beltScale ?? 1;
    const random = mulberry32(515151);
    const base = new THREE.IcosahedronGeometry(1, 0);
    this._geometries.push(base);

    for (const def of BELTS) {
      const count = Math.max(120, Math.round(def.count * beltScale));
      const material = new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.95, metalness: 0.06, flatShading: true });
      this._materials.push(material);
      const mesh = new THREE.InstancedMesh(base, material, count);
      mesh.frustumCulled = false;
      mesh.userData.objectId = def.id;

      const data = new Array(count);
      for (let i = 0; i < count; i += 1) {
        const t = random();
        const radius = def.inner + t * (def.outer - def.inner);
        const angle = random() * Math.PI * 2;
        const y = (random() - 0.5) * (0.12 + t * 0.1);
        const speed = (0.09 / Math.sqrt(radius)) * (0.8 + random() * 0.5);
        const size = 0.0035 + random() * random() * 0.022;
        this._quaternion.setFromEuler(new THREE.Euler(random() * Math.PI, random() * Math.PI, random() * Math.PI));
        this._scale.set(size * (0.7 + random() * 0.7), size * (0.6 + random() * 0.8), size * (0.7 + random() * 0.6));
        const shade = 0.72 + random() * 0.5;
        this._color.set(def.color).multiplyScalar(shade);
        this._position.set(Math.cos(angle) * radius, y, -Math.sin(angle) * radius);
        this._matrix.compose(this._position, this._quaternion, this._scale);
        mesh.setMatrixAt(i, this._matrix);
        mesh.setColorAt(i, this._color);
        data[i] = { radius, angle, y, speed };
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      this.group.add(mesh);
      this.meshes.push(mesh);
      this.belts.push({ def, data });
      this.count += count;
    }
  }

  update(dt, timeScale) {
    const step = dt * timeScale;
    if (step === 0) return;
    for (let b = 0; b < this.belts.length; b += 1) {
      const { data } = this.belts[b];
      const mesh = this.meshes[b];
      for (let i = 0; i < data.length; i += 1) {
        const rock = data[i];
        rock.angle += rock.speed * step;
        mesh.getMatrixAt(i, this._matrix);
        this._matrix.decompose(this._position, this._quaternion, this._scale);
        this._position.set(Math.cos(rock.angle) * rock.radius, rock.y, -Math.sin(rock.angle) * rock.radius);
        this._matrix.compose(this._position, this._quaternion, this._scale);
        mesh.setMatrixAt(i, this._matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  getSelectableMeshes() {
    return this.meshes;
  }

  getDef(id) {
    return BELTS.find((belt) => belt.id === id) || null;
  }

  dispose() {
    for (const geometry of this._geometries) geometry.dispose?.();
    for (const material of this._materials) material.dispose?.();
    this.group.clear();
    this.meshes.length = 0;
    this.belts.length = 0;
  }
}
