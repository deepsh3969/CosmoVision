import * as THREE from 'three';

// Raycast selection with a camera-facing reticle ring + glow for the active object.
export class SelectionManager {
  constructor(camera, canvas, callbacks = {}) {
    this.camera = camera;
    this.canvas = canvas;
    this.callbacks = callbacks;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Points.threshold = 0.05;
    this.targets = [];
    this.selectedId = null;
    this.hoveredId = null;
    this.enabled = true;

    this._pointer = new THREE.Vector2();
    this._down = { x: 0, y: 0, at: 0, moved: false };
    this._world = new THREE.Vector3();
    this._hoverWorld = new THREE.Vector3();
    this._resolveWorld = null;
    this._hoverCooldown = 0;
    this._lastTap = { id: null, at: 0 };

    const ringGeometry = new THREE.RingGeometry(1, 1.075, 72);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: '#7ee7ff',
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });
    this.ring = new THREE.Mesh(ringGeometry, ringMaterial);
    this.ring.renderOrder = 20;
    this.ring.visible = false;
    this.ring.frustumCulled = false;

    const tickMaterial = ringMaterial.clone();
    tickMaterial.color = new THREE.Color('#a78bfa');
    this.innerRing = new THREE.Mesh(new THREE.RingGeometry(0.86, 0.885, 4, 1), tickMaterial);
    this.innerRing.renderOrder = 20;
    this.innerRing.visible = false;
    this.innerRing.frustumCulled = false;

    this._group = new THREE.Group();
    this._group.add(this.ring, this.innerRing);

    // Hover glow: thin ring that tracks whatever the pointer is over.
    const hoverMaterial = ringMaterial.clone();
    hoverMaterial.color = new THREE.Color('#7ee7ff');
    hoverMaterial.opacity = 0.55;
    this.hoverRing = new THREE.Mesh(new THREE.RingGeometry(1, 1.04, 64), hoverMaterial);
    this.hoverRing.renderOrder = 19;
    this.hoverRing.visible = false;
    this.hoverRing.frustumCulled = false;
    this._hoverGroup = new THREE.Group();
    this._hoverGroup.add(this.hoverRing);

    this._bind();
  }

  attachTo(scene) {
    scene.add(this._group, this._hoverGroup);
  }

  setTargets(groups) {
    this.targets = groups;
  }

  _bind() {
    this.onPointerDown = (event) => {
      if (event.button !== 0 || event.target !== this.canvas) return;
      this._down.x = event.clientX;
      this._down.y = event.clientY;
      this._down.at = performance.now();
      this._down.moved = false;
    };
    this.onPointerMove = (event) => {
      if (this._down.at === 0) return;
      if (Math.hypot(event.clientX - this._down.x, event.clientY - this._down.y) > 6) this._down.moved = true;
    };
    this.onPointerUp = (event) => {
      if (event.button !== 0) return;
      // UI buttons and panels must not trigger raycast selection.
      if (event.target !== this.canvas) {
        this._down.at = 0;
        return;
      }
      if (!this.enabled) return;
      const quick = performance.now() - this._down.at < 450;
      const isTap = !this._down.moved && quick && this._down.at > 0;
      this._down.at = 0;
      if (!isTap) return;
      const id = this.selectAt(event.clientX, event.clientY);
      // Second tap/click on the same object within 400ms = focus request.
      const now = performance.now();
      if (id && id === this._lastTap.id && now - this._lastTap.at < 400) {
        this._lastTap = { id: null, at: 0 };
        this.callbacks.onDoubleClick?.(id);
      } else {
        this._lastTap = { id, at: now };
      }
    };
    window.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove, { passive: true });
    window.addEventListener('pointerup', this.onPointerUp);
  }

  _cast(clientX, clientY) {
    if (typeof clientX !== 'number') return null;
    this._pointer.x = (clientX / window.innerWidth) * 2 - 1;
    this._pointer.y = -((clientY / window.innerHeight) * 2 - 1);
    this.raycaster.setFromCamera(this._pointer, this.camera);
    const meshes = [];
    for (const group of this.targets) {
      for (const mesh of typeof group === 'function' ? group() : group) {
        if (mesh.visible && mesh.userData.objectId) meshes.push(mesh);
      }
    }
    const hits = this.raycaster.intersectObjects(meshes, false);
    if (!hits.length) return null;
    const hit = hits[0];
    return {
      id: hit.object.userData.objectId,
      point: hit.point.clone(),
      instanceId: hit.instanceId,
    };
  }

  selectAt(clientX, clientY) {
    const hit = this._cast(clientX, clientY);
    if (!hit) {
      this.clear('deselect');
      return null;
    }
    return this.selectId(hit.id);
  }

  selectId(id, resolver) {
    if (!id) {
      this.clear('deselect');
      return null;
    }
    this.selectedId = id;
    this._resolveWorld = resolver || this._resolveWorld;
    if (resolver) this._updateWorld();
    this.ring.visible = true;
    this.innerRing.visible = true;
    this.callbacks.onSelect?.(id);
    return id;
  }

  setResolver(resolver) {
    this._resolveWorld = resolver;
    this._updateWorld();
  }

  _updateWorld() {
    if (!this._resolveWorld) return false;
    const position = this._resolveWorld(this.selectedId, this._world);
    if (!position) return false;
    this._group.position.copy(position);
    return true;
  }

  clear(reason = 'clear') {
    if (!this.selectedId) return;
    this.selectedId = null;
    this.ring.visible = false;
    this.innerRing.visible = false;
    this.callbacks.onSelect?.(null, reason);
  }

  update(dt, objectRadius = 0.05) {
    // Reticle framing scales with the focused object size.
    const hasWorld = this._updateWorld();
    if (!this.selectedId || !hasWorld) {
      if (this.selectedId && !hasWorld) {
        // Resolver momentarily unavailable (e.g. rebuilt) — hide but keep state.
        this.ring.visible = false;
        this.innerRing.visible = false;
      }
      return;
    }
    this.ring.visible = true;
    this.innerRing.visible = true;
    this._group.quaternion.copy(this.camera.quaternion);
    const pulse = 1 + Math.sin(performance.now() * 0.004) * 0.045;
    const scale = objectRadius * 2.4 * pulse;
    this.ring.scale.setScalar(scale);
    this.innerRing.scale.setScalar(scale);
    this.innerRing.rotation.z += dt * 0.7;
  }

  // Cheap hover affordance (throttled by caller).
  hoverCheck(clientX, clientY) {
    const hit = this._cast(clientX, clientY);
    const id = hit ? hit.id : null;
    if (id !== this.hoveredId) {
      this.hoveredId = id;
      this.canvas.style.cursor = id ? 'pointer' : '';
      this.callbacks.onHover?.(id);
    }
    return id;
  }

  // Hover glow ring (throttled by caller); hidden while the object is selected.
  updateHover(objectRadius = 0.05) {
    const id = this.hoveredId;
    if (!id || id === this.selectedId || !this._resolveWorld) {
      this.hoverRing.visible = false;
      return;
    }
    const position = this._resolveWorld(id, this._hoverWorld);
    if (!position) {
      this.hoverRing.visible = false;
      return;
    }
    this._hoverGroup.position.copy(position);
    this._hoverGroup.quaternion.copy(this.camera.quaternion);
    this.hoverRing.scale.setScalar(Math.max(objectRadius * 2.6, 0.02));
    this.hoverRing.visible = true;
  }

  dispose() {
    window.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    this.ring.geometry.dispose();
    this.ring.material.dispose();
    this.innerRing.geometry.dispose();
    this.innerRing.material.dispose();
    this.hoverRing.geometry.dispose();
    this.hoverRing.material.dispose();
    this._group.removeFromParent();
    this._hoverGroup.removeFromParent();
  }
}
