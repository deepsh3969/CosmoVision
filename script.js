import * as THREE from 'three';
import { Galaxy } from './js/galaxy.js';
import { Starfield } from './js/starfield.js';
import { CosmicCore } from './js/core.js';
import { OrbitController } from './js/controls.js';
import { GestureEngine } from './js/gestures.js';
import { AudioEngine } from './js/audio.js';
import { PostFX } from './js/postfx.js';
import { PerformanceManager } from './js/performance.js';
import { UIController } from './js/ui.js';
import { SolarSystem, createNebulaSprites } from './js/solarSystem.js';
import { AsteroidField } from './js/asteroids.js';
import { StationManager } from './js/stations.js';
import { WormholeManager } from './js/wormholes.js';
import { SpacecraftController } from './js/spacecraft.js';
import { CameraRig } from './js/cameraRig.js';
import { SelectionManager } from './js/selection.js';
import { SpeedEffects } from './js/effects.js';
import { Minimap } from './js/minimap.js';
import { HUD } from './js/hud.js';
import {
  DEFAULT_GALAXY,
  DEFAULT_VISUALS,
  DEFAULT_INTERACTION,
  DEFAULT_SIM,
  PRESETS,
  COLOR_THEMES,
  LIMITS,
  STORAGE_KEYS,
} from './js/config.js';
import {
  CELESTIAL_OBJECTS,
  OBJECT_BY_ID,
  PLANETS,
  SCALE,
  SIM_SPEEDS,
  formatDistance,
  formatAltitude,
  focusDistanceFor,
} from './js/data/celestialObjects.js';
import { clamp, damp, safeStorageGet, safeStorageSet } from './js/utils.js';

const NAV_SEQUENCE = ['milky-way', 'solaris', 'earth', 'mars', 'jupiter', 'saturn', 'wormhole-alpha', 'station-alpha'];
const CAMERA_MODES = ['orbit', 'flight', 'follow', 'cinematic'];

class Experience {
  constructor() {
    this.galaxyParams = { ...DEFAULT_GALAXY };
    this.visuals = { ...DEFAULT_VISUALS };
    this.interaction = { ...DEFAULT_INTERACTION };
    this.theme = { ...COLOR_THEMES.default };
    this.presetName = 'DEFAULT';
    this.particleMode = 'auto';

    this.timeScale = DEFAULT_SIM.timeScale;
    this.cinematicFx = DEFAULT_SIM.cinematicFx;
    this.minimapVisible = DEFAULT_SIM.minimap;
    this.focusId = null;
    this.targetId = null;
    this.warpPulse = 0;
    this.flightInfo = { speed: 0, boosting: false };
    this.orbitSpeed = 0;
    this._prevRadius = 0;
    this._frameStats = { calls: 0, tris: 0 };

    this.paused = false;
    this.running = false;
    this.simTime = 0;
    this.lastFrame = 0;
    this.rafHandle = 0;
    this.syncCounter = 0;
    this._lastHudAt = 0;
    this.galaxyScaleTarget = DEFAULT_GALAXY.galaxyScale;
    this.galaxyScale = DEFAULT_GALAXY.galaxyScale;
    this.pointer = new THREE.Vector2();
    this.rebuildTimer = 0;
    this.resizePending = false;
    this.audioBands = { bass: 0, mid: 0, high: 0, mix: 0 };

    this.perf = new PerformanceManager({
      onSample: () => {},
      onDegrade: () => this._onDegrade(),
      onQualityChange: () => this._applyQuality(),
    });

    this.ui = new UIController(this._handlers());
    this.gesture = new GestureEngine();
    this.audio = new AudioEngine();
  }

  _handlers() {
    return {
      onParamChange: (group, key, value, rebuild) => this._onParamChange(group, key, value, rebuild),
      onPreset: (name) => this.applyPreset(name),
      onReset: () => this.resetAll(),
      onMouseToggle: (checked) => this._onMouseToggle(checked),
      onGestureToggle: (checked) => this._onGestureToggle(checked),
      onAutoRotateToggle: (checked) => {
        this.interaction.autoRotate = checked;
        if (this.controls) this.controls.autoRotate = checked;
        this._persistParams();
      },
      onAudioToggle: (checked) => this._onAudioToggle(checked),
      onVolumeChange: (value) => this.audio.setVolume(value),
      onReactivityToggle: (checked) => {
        this.audio.setReactivity(checked);
        this._persistSettings();
      },
      onQualityChange: (level) => this._onQualityChange(level),
      onParticlePreset: (value) => this._onParticlePreset(value),
      onPostToggle: (checked) => {
        this.postfx?.setEnabled(checked);
        this._persistSettings();
      },
      onReducedMotion: (checked) => this._onReducedMotion(checked),
      onEnter: () => this._onEnter(),
      onFocus: (id) => this.focusObject(id),
      onExplore: (id) => this.exploreObject(id),
      onTarget: (id) => this.toggleTarget(id),
      onEnterWormhole: (id) => this.enterWormhole(id),
      onSimSpeed: (value) => this.setSimSpeed(value),
      onCameraMode: (mode) => this.setCameraMode(mode),
      onCinematicToggle: () => this.toggleCinematic(),
      onMinimapToggle: () => this.toggleMinimap(),
      onSearchSelect: (id) => this.focusObject(id),
      onNavigate: (id) => this.navigateBreadcrumb(id),
    };
  }

  async boot() {
    if (!this._webglAvailable()) {
      this.ui.setLoadStep('WebGL unavailable', 100, 4);
      this.ui.showToast('WebGL is unavailable in this browser. CosmoVision cannot start.', 'error', 12000);
      return;
    }

    this._restoreParams();

    await this._stage('Initializing renderer', 12, 0, () => this._initRenderer());
    await this._stage('Generating galaxy', 34, 1, () => this._buildSceneObjects());
    await this._stage('Loading solar system', 58, 2, () => this._buildUniverse());
    await this._stage('Initializing navigation', 80, 3, () => this._initNavigation());
    await this._stage('Preparing spacecraft', 100, 4, () => this._startSimulation());

    this.running = true;
    this.lastFrame = performance.now();
    this.rafHandle = requestAnimationFrame((time) => this._loop(time));

    setTimeout(() => {
      this.ui.hideLoading();
      this._syncStatus();
      this.ui.showToast('Welcome aboard, pilot. Press H for controls, / to search the object database.', 'info', 6000);
    }, 500);
  }

  _webglAvailable() {
    try {
      const canvas = document.createElement('canvas');
      return Boolean(window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')));
    } catch {
      return false;
    }
  }

  async _stage(label, percent, stepIndex, work) {
    this.ui.setLoadStep(label, percent, stepIndex);
    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 70)));
    work();
  }

  _initRenderer() {
    const canvas = document.getElementById('scene');
    this.canvas = canvas;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: this.perf.quality !== 'low',
      alpha: false,
      powerPreference: 'high-performance',
      logarithmicDepthBuffer: true,
    });
    this.renderer.info.autoReset = false;
    this.renderer.setPixelRatio(this.perf.pixelRatioCap());
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = this.visuals.exposure;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#04060d');

    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.01, 3000);
    this.camera.position.set(16, 12, 16);

    this._syncPixelRatio();

    window.addEventListener('resize', () => {
      this.resizePending = true;
    });
    window.addEventListener(
      'pointermove',
      (event) => {
        this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.pointer.y = -((event.clientY / window.innerHeight) * 2 - 1);
        this.pointerClientX = event.clientX;
        this.pointerClientY = event.clientY;
      },
      { passive: true },
    );
  }

  _syncPixelRatio() {
    if (!this.renderer) return;
    const ratio = this.renderer.getPixelRatio();
    if (this.galaxy) this.galaxy.uniforms.uPixelRatio.value = ratio;
    if (this.starfield) this.starfield.uniforms.uPixelRatio.value = ratio;
    if (this.core) this.core.haloUniforms.uPixelRatio.value = ratio;
  }

  _buildSceneObjects() {
    this.galaxy = new Galaxy();
    this.starfield = new Starfield();
    this.core = new CosmicCore();
    this._rebuildGalaxy(true);
    this.core.innerMesh.userData.objectId = 'milky-way';
    this.scene.add(this.galaxy.group, this.starfield.group, this.core.group);
    this._syncPixelRatio();
  }

  _buildUniverse() {
    this.nebula = createNebulaSprites();
    this.scene.add(this.nebula);

    const profile = this.perf.getProfile();
    this.system = new SolarSystem();
    this.system.build(profile);
    this.scene.add(this.system.group);

    this.belts = new AsteroidField(this.system.group);
    this.belts.build(profile);

    this.stations = new StationManager(this.system);
    this.stations.build();

    this.wormholes = new WormholeManager();
    this.wormholes.build(this.system.group, this.scene);

    this.effects = new SpeedEffects(this.camera, profile);
    this.effects.attach(this.scene);
  }

  _initNavigation() {
    this.controls = new OrbitController(this.camera, this.canvas, {
      onTogglePause: () => this.togglePause(),
      onHover: (x, y) => {
        this.pointer.x = (x / window.innerWidth) * 2 - 1;
        this.pointer.y = -((y / window.innerHeight) * 2 - 1);
      },
      onReset: () => this.ui.showToast('Camera reset.', 'info', 1800),
    });
    this.controls.autoRotate = this.interaction.autoRotate;
    this.controls.reducedMotion = this.interaction.reducedMotion;
    this.controls.setMouseEnabled(this.interaction.mouse);
    this._prevRadius = this.controls.radius;

    this.spacecraft = new SpacecraftController(this.camera, this.canvas);
    this.rig = new CameraRig(this.camera, this.controls, this.spacecraft, {
      onFocusStart: (id) => this._onFocusStart(id),
      onFocusEnd: () => this._onFocusEnd(),
      onModeChange: (mode) => this._onModeChange(mode),
    });

    this.selection = new SelectionManager(this.camera, this.canvas, {
      onSelect: (id) => this._onSelect(id),
      onHover: (id) => {
        this.canvas.style.pointerEvents = 'auto';
        if (id) this.canvas.dataset.hover = id;
        else delete this.canvas.dataset.hover;
      },
    });
    this.selection.attachTo(this.scene);
    this.selection.setResolver((id, out) => this.resolveWorld(id, out));
    this.selection.setTargets([
      () => [this.core.innerMesh],
      () => this.system.getSelectableMeshes(),
      () => this.belts.getSelectableMeshes(),
      () => this.stations.getSelectableMeshes(),
      () => this.wormholes.getSelectableMeshes(),
    ]);

    this.minimap = new Minimap(document.getElementById('minimapCanvas'));
    this.minimap.setVisible(this.minimapVisible);

    this.hud = new HUD({
      onFocus: (id) => this.focusObject(id),
      onExplore: (id) => this.exploreObject(id),
      onTarget: (id) => this.toggleTarget(id),
      onEnterWormhole: (id) => this.enterWormhole(id),
      onSimSpeed: (value) => this.setSimSpeed(value),
      onCameraMode: (mode) => this.setCameraMode(mode),
      onCinematicToggle: () => this.toggleCinematic(),
      onMinimapToggle: () => this.toggleMinimap(),
      onSearchSelect: (id) => this.focusObject(id),
      onNavigate: (id) => this.navigateBreadcrumb(id),
    });

    this.hud.setSimSpeed(this.timeScale);
    this.hud.setCinematic(this.cinematicFx);
    this.hud.setMinimap(this.minimapVisible);
    this.hud.setCameraMode('orbit', { hasFocus: false });
    this.hud.setInfo(null);
    this.hud.setBreadcrumb('milky-way');

    window.addEventListener('keydown', (event) => this._onKeyDown(event));
  }

  _initGesture() {
    this.gesture.attach({
      video: this.ui.dom.handVideo,
      overlay: this.ui.dom.handOverlay,
      onStatus: () => this._syncStatus(),
      onError: (message) => {
        this.ui.showToast(message, 'warning', 6500);
        this.interaction.gesture = false;
        this.ui.setToggle('gesture', false);
        this.ui.setGesturePreview(false);
        this._syncStatus();
      },
    });

    if (!this.gesture.isSupported()) {
      this.interaction.gesture = false;
      this.ui.setToggle('gesture', false);
      return;
    }

    this.gesture.prepare().catch(() => {
      this.ui.showToast('Gesture engine unavailable. CosmoVision continues in mouse-control mode.', 'warning', 6500);
    });
  }

  _startSimulation() {
    this.postfx = new PostFX(this.renderer, this.scene, this.camera);
    const settings = this.ui.readSettings();
    this.postfx.setEnabled(settings.postProcessing !== false && this.perf.bloomEnabled());
    this.postfx.setGlow(this.visuals.glow);
    this.postfx.setCinematic(this.cinematicFx);
    this.postfx.setResolution(window.innerWidth, window.innerHeight, this.renderer.getPixelRatio());

    this.ui.setToggle('mouse', this.interaction.mouse);
    this.ui.setToggle('gesture', this.interaction.gesture);
    this.ui.setToggle('autoRotate', this.interaction.autoRotate);
    this.ui.setToggle('audioEnabled', this.audio.enabled);
    this.ui.setToggle('audioReactivity', this.audio.reactivity);
    this.ui.setControlValue('audio', 'volume', this.audio.volume);
    this.ui.setActivePreset(this.presetName);
    this.ui.setParticlePreset(this.particleMode);
    this.ui.dom.qualityBadge.textContent = `GRAPHICS ${this.perf.quality.toUpperCase()}`;

    this.hud.setTelemetry({ status: 'ORBIT' });
    this._initGesture();
  }

  // ------------------------------------------------------------------
  // World position resolver (used by focus, selection, minimap, HUD)
  // ------------------------------------------------------------------
  resolveWorld(id, target = new THREE.Vector3()) {
    if (!id) return null;
    if (id === 'milky-way') return target.set(0, 0, 0);
    if (id === 'asteroid-belt') return target.copy(this.system.sunWorld).add(new THREE.Vector3(1.95, 0, 0));
    if (id === 'kuiper-belt') return target.copy(this.system.sunWorld).add(new THREE.Vector3(6.7, 0, 0));
    if (this.system?.byId.has(id)) return this.system.getWorldPosition(id, target);
    if (id.startsWith('station-')) return this.stations?.getWorldPosition(id, target) || null;
    if (id.startsWith('wormhole-')) return this.wormholes?.getWorldPosition(id, target) || null;
    return null;
  }

  _objectRadius(def) {
    if (!def) return 0.05;
    if (def.id === 'milky-way') return 6;
    if (def.id === 'solaris' || def.id === 'sol') return 0.15;
    if (def.type === 'Wormhole') return 0.55;
    if (def.type === 'Asteroid Field') return def.id === 'kuiper-belt' ? 6.7 : 1.95;
    return Math.max(def.size || 0.02, 0.012);
  }

  // ------------------------------------------------------------------
  // Navigation actions
  // ------------------------------------------------------------------
  focusObject(id) {
    const def = OBJECT_BY_ID.get(id);
    if (!def || !this.rig) return false;
    const distance = focusDistanceFor(def);
    const resolver = (out) => this.resolveWorld(id, out);
    const ok = this.rig.focusOn(id, resolver, distance);
    if (!ok) {
      this.ui.showToast(`${def.name} is not available yet.`, 'warning', 2600);
      return false;
    }
    this.selection.selectId(id, (resolveId, out) => this.resolveWorld(resolveId, out));
    this.hud.setInfo(def);
    this._syncNav();
    this.ui.showToast(`Focus: ${def.name}`, 'info', 1700);
    return true;
  }

  exploreObject(id) {
    const def = OBJECT_BY_ID.get(id);
    if (!def || !this.rig) return;
    const pos = this.resolveWorld(id, new THREE.Vector3());
    if (!pos) return;

    const distance = Math.max(focusDistanceFor(def) * 1.7, 0.12);
    const dir = this.camera.position.clone().sub(pos);
    if (dir.lengthSq() < 1e-8) dir.set(0.6, 0.3, 1);
    dir.normalize().multiplyScalar(distance);
    this.camera.position.copy(pos).add(dir);
    this.camera.lookAt(pos);
    this.rig.transition = null;
    this.controls.setInputBlocked(false);
    this.rig.setMode('flight');
    this.hud.setInfo(def);
    this._syncNav();
    this.ui.showToast(`Free flight near ${def.name} — WASD to fly, SPACE to brake.`, 'info', 4200);
  }

  enterWormhole(id) {
    const def = OBJECT_BY_ID.get(id);
    if (!def || def.type !== 'Wormhole') return;
    const destId = def.destination;
    const dest = OBJECT_BY_ID.get(destId);
    this.warpPulse = 0.55;
    this.focusObject(destId);
    this.ui.showToast(`Wormhole transit complete — emerged at ${dest?.name || destId}.`, 'info', 4600);
  }

  toggleTarget(id) {
    const chosen = id || this.selection?.selectedId || this.focusId;
    if (!chosen) {
      this.targetId = null;
      this.hud.setTarget(null);
      this.ui.showToast('Target cleared.', 'info', 1500);
      return;
    }
    if (this.targetId === chosen) {
      this.targetId = null;
      this.hud.setTarget(null);
      this.ui.showToast('Target cleared.', 'info', 1500);
      return;
    }
    const def = OBJECT_BY_ID.get(chosen);
    if (!def) return;
    this.targetId = chosen;
    this.hud.setTarget(def.name);
    this.ui.showToast(`Target locked: ${def.name}`, 'info', 2200);
  }

  navigateBreadcrumb(id) {
    this.focusObject(id === 'universe' ? 'milky-way' : id);
  }

  setSimSpeed(value) {
    if (!SIM_SPEEDS.includes(value)) return;
    this.timeScale = value;
    this.hud.setSimSpeed(value);
    if (value === 0) this.ui.showToast('Simulation paused.', 'info', 1400);
    else if (value === 1) this.ui.showToast('Simulation resumed.', 'info', 1400);
    else this.ui.showToast(`Simulation speed: ${value}x`, 'info', 1400);
    this._syncStatus();
  }

  setCameraMode(mode) {
    if (!CAMERA_MODES.includes(mode) || !this.rig) return;
    if (mode === 'follow' && !this.rig.inFocus) {
      this.ui.showToast('Focus an object first to follow it.', 'warning', 2400);
      return;
    }
    this.rig.setMode(mode);
    this.hud.setCameraMode(mode, { hasFocus: this.rig.inFocus });
    if (mode === 'flight') this.ui.showToast('Flight mode — WASD/QE, SHIFT boost, SPACE brake.', 'info', 4200);
  }

  toggleCinematic() {
    this.cinematicFx = !this.cinematicFx;
    this.hud.setCinematic(this.cinematicFx);
    this.postfx?.setCinematic(this.cinematicFx);
    this.ui.showToast(`Cinematic FX ${this.cinematicFx ? 'enabled' : 'disabled'}.`, 'info', 1600);
  }

  toggleMinimap() {
    this.minimapVisible = !this.minimapVisible;
    this.minimap?.setVisible(this.minimapVisible);
    this.hud.setMinimap(this.minimapVisible);
  }

  // ------------------------------------------------------------------
  // Focus / selection callbacks
  // ------------------------------------------------------------------
  _onFocusStart(id) {
    this.focusId = id;
    this.hud.setCameraMode(this.rig.mode, { hasFocus: true });
    this._syncNav();
  }

  _onFocusEnd() {
    this.focusId = null;
    this.hud.setCameraMode(this.rig.mode, { hasFocus: false });
    this._syncNav();
  }

  _onModeChange(mode) {
    this.hud.setCameraMode(mode, { hasFocus: this.rig.inFocus });
    this._syncStatus();
  }

  _onSelect(id) {
    if (id) {
      const def = OBJECT_BY_ID.get(id);
      if (def) this.hud.setInfo(def);
    } else {
      this.hud.setInfo(null);
    }
    this._syncNav();
  }

  _syncNav() {
    const id = this.selection?.selectedId || this.rig?.focusId || 'milky-way';
    this.hud?.setBreadcrumb(id);
  }

  // ------------------------------------------------------------------
  // Input
  // ------------------------------------------------------------------
  _onKeyDown(event) {
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return;

    const key = event.key;
    const lower = key.toLowerCase();

    if (key === 'Escape') {
      this._handleEscape();
      return;
    }
    if (key === '/' || ((event.ctrlKey || event.metaKey) && lower === 'k')) {
      event.preventDefault();
      this.hud.toggleSearch(true);
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    const inFlight = this.rig?.mode === 'flight';

    switch (lower) {
      case 'h':
        this.ui.openModal('helpModal');
        break;
      case 'm':
        this.toggleMinimap();
        break;
      case 'c':
        this.toggleCinematic();
        break;
      case 'f': {
        const id = this.selection?.selectedId || this.focusId || this.targetId;
        if (id) this.focusObject(id);
        else this.ui.showToast('Select an object first.', 'warning', 2000);
        break;
      }
      case 't':
        this.toggleTarget();
        break;
      case 'g':
        if (inFlight) break;
        this.focusObject('milky-way');
        break;
      case 's':
        if (inFlight) break;
        this.focusObject('solaris');
        break;
      case 'p': {
        if (inFlight) break;
        const current = OBJECT_BY_ID.get(this.focusId || '');
        const isPlanet = current && PLANETS.some((planet) => planet.id === current.id);
        this.focusObject(isPlanet ? current.id : 'earth');
        break;
      }
      case 'r':
        if (inFlight) {
          this.rig.setMode('orbit');
          this.controls.reset();
          this.ui.showToast('Camera reset — orbit mode.', 'info', 2000);
        }
        break;
      case 'tab':
        event.preventDefault();
        this._cycleCameraMode();
        break;
      default:
        break;
    }
  }

  _cycleCameraMode() {
    const available = CAMERA_MODES.filter((mode) => mode !== 'follow' || this.rig?.inFocus);
    const index = available.indexOf(this.rig?.mode || 'orbit');
    const next = available[(index + 1) % available.length];
    this.setCameraMode(next);
  }

  _handleEscape() {
    if (!this.ui.dom.helpModal.classList.contains('hidden')) {
      this.ui.closeModal('helpModal');
      return;
    }
    if (!this.ui.dom.settingsModal.classList.contains('hidden')) {
      this.ui.closeModal('settingsModal');
      return;
    }
    if (this.hud?.isSearchOpen()) {
      this.hud.toggleSearch(false);
      return;
    }
    if (this.rig?.mode === 'flight') {
      this.rig.setMode('orbit');
      this.ui.showToast('Flight mode ended — orbit controls restored.', 'info', 2400);
      return;
    }
    if (this.rig?.inFocus || this.selection?.selectedId) {
      this.rig?.clearFocus();
      this.selection?.clear('escape');
      this.hud?.setInfo(null);
      this._syncNav();
      return;
    }
    this.controls?.reset();
  }

  // ------------------------------------------------------------------
  // Loop
  // ------------------------------------------------------------------
  _loop(now) {
    this.rafHandle = requestAnimationFrame((time) => this._loop(time));
    const dt = clamp((now - this.lastFrame) / 1000, 0.0001, 0.1);
    this.lastFrame = now;

    this._handleResize();
    this.renderer.info.reset();

    const reduced = this.interaction.reducedMotion;
    const effScale = this.paused ? 0 : reduced ? Math.min(this.timeScale, 1) : this.timeScale;
    this.simTime += dt * clamp(effScale, 0, 4);

    const gestureState = this.gesture.enabled ? this.gesture.update(dt) : null;
    if (gestureState) this._applyGesture(gestureState, dt);

    const bands = this.audio.update(dt);
    this.audioBands = reduced
      ? { bass: bands.bass * 0.4, mid: bands.mid * 0.4, high: bands.high * 0.3, mix: bands.mix }
      : bands;

    if (reduced && Math.abs(this.galaxyScaleTarget - DEFAULT_GALAXY.galaxyScale) > 0.001) {
      this.galaxyScaleTarget = damp(this.galaxyScaleTarget, DEFAULT_GALAXY.galaxyScale, 2, dt);
    }
    this.galaxyScale = damp(this.galaxyScale, this.galaxyScaleTarget, 4, dt);

    // Camera rig owns pose; orbit controller only runs when it is in charge.
    this.rig.update(dt);
    if (this.rig.orbitActive) this.controls.update(dt);
    this.flightInfo = this.spacecraft.update(dt);

    const radiusDelta = Math.abs(this.controls.radius - this._prevRadius) / dt;
    this._prevRadius = this.controls.radius;
    this.orbitSpeed = damp(this.orbitSpeed, this.rig.mode === 'flight' ? 0 : clamp(radiusDelta, 0, 10), 5, dt);
    const effSpeed = this.rig.mode === 'flight' ? this.flightInfo.speed : this.orbitSpeed;

    const pixelRatio = this.renderer.getPixelRatio();
    const camDist = this.camera.position.distanceTo(this.system.sunWorld);

    this.galaxy.update({
      time: this.simTime,
      pixelRatio,
      visuals: this.visuals,
      params: this.galaxyParams,
      audio: this.audioBands,
    });
    this.galaxy.group.scale.setScalar(this.galaxyScale);

    this.starfield.update({
      time: this.simTime,
      pixelRatio,
      energy: this.galaxyParams.energy,
      audio: this.audioBands,
    });

    this.core.update({
      dt,
      time: this.simTime,
      params: this.galaxyParams,
      audio: this.audioBands,
      cameraDistance: this.controls.getDistance(),
      pointer: this.pointer,
      pixelRatio,
      glow: this.visuals.glow,
    });

    this.system.update({ dt, timeScale: effScale, cameraDistance: camDist });
    this.belts.update(dt, effScale);
    this.stations.update(dt, effScale);
    this.wormholes.update({ dt, timeScale: effScale, cameraPosition: this.camera.position });

    this.renderer.toneMappingExposure = this.visuals.exposure;
    this.perf.tick(dt);

    // Cinematic effects + lens warp (proximity to Sol + wormhole transit pulse).
    this.effects.update(dt, effSpeed, this.cinematicFx, reduced);
    this.warpPulse = damp(this.warpPulse, 0, 1.6, dt);
    const proximityWarp = clamp(1 - (camDist - 0.4) / 5, 0, 0.4);
    this.postfx?.setWarp(clamp(proximityWarp + this.warpPulse, 0, 0.55));
    this.effects.beginFrame(dt, effSpeed, this.cinematicFx, reduced);

    // Selection reticle + telemetry + radar (HUD updates are wall-clock throttled).
    const selectedDef = OBJECT_BY_ID.get(this.selection?.selectedId || '');
    this.selection.update(dt, this._objectRadius(selectedDef));
    if (now - this._lastHudAt > 260) {
      this._lastHudAt = now;
      this.selection.hoverCheck(this.pointerClientX ?? -1, this.pointerClientY ?? -1);
      this._updateTelemetry(effScale, effSpeed, camDist);
      this._updatePerfLine();
    }
    this._renderMinimap(dt, camDist);

    this.ui.updateStats({
      fps: this.perf.fps,
      particles: this.galaxy.particleCount,
      hands: this.gesture.enabled ? this.gesture.handsCount : 0,
      gesture: this.gesture.enabled ? this.gesture.gesture : 'NONE',
    });

    if (this.gesture.enabled) this.gesture.drawOverlay();
    this.syncCounter += 1;

    this.postfx.render(dt);
    this.effects.endFrame();

    this._frameStats.calls = this.renderer.info.render.calls;
    this._frameStats.tris = this.renderer.info.render.triangles;
  }

  _updateTelemetry(effScale, effSpeed, camDist) {
    const inSystem = camDist < 60;
    const flight = this.rig.mode === 'flight';
    const navId = this.selection?.selectedId || this.focusId;
    const navDef = OBJECT_BY_ID.get(navId || '');
    const targetDef = OBJECT_BY_ID.get(this.targetId || '');

    const distanceId = targetDef ? this.targetId : navId;
    const distancePos = distanceId ? this.resolveWorld(distanceId, this._teleVec || (this._teleVec = new THREE.Vector3())) : null;
    const cameraDistance = distancePos ? this.camera.position.distanceTo(distancePos) : camDist;

    let status;
    if (this.paused || effScale === 0) status = 'PAUSED';
    else if (flight) status = this.flightInfo.boosting ? 'BOOSTING' : 'FLIGHT';
    else if (this.rig.mode === 'cinematic') status = 'CINEMATIC';
    else if (this.rig.inFocus) status = 'TRACKING';
    else status = 'ORBIT';

    this.hud.setTelemetry({
      velocity: `${(effSpeed * SCALE.kmsPerUnit).toFixed(0)} km/s`,
      altitude: inSystem ? formatAltitude(camDist, true) : formatAltitude(this.camera.position.length(), false),
      target: targetDef ? targetDef.name : navDef ? navDef.name : '—',
      distance: distanceId ? formatDistance(cameraDistance, inSystem) : '—',
      system: inSystem ? 'SOLARIS' : 'MILKY WAY',
      object: navDef ? navDef.name : '—',
      fuel: this.spacecraft.fuel,
      status,
    });
  }

  _updatePerfLine() {
    const memory = performance.memory
      ? `${(performance.memory.usedJSHeapSize / 1048576).toFixed(0)} MB`
      : '—';
    this.hud.setPerf({
      ms: `${(1000 / Math.max(this.perf.fps, 1)).toFixed(1)}ms`,
      calls: this._frameStats.calls.toLocaleString('en-US'),
      tris: this._frameStats.tris.toLocaleString('en-US'),
      mem: memory,
    });
  }

  _renderMinimap(dt, camDist) {
    if (!this.minimapVisible || !this.system) return;
    const entries = [];
    const add = (id, color, kind) => {
      const pos = this.resolveWorld(id, this._mapVec || (this._mapVec = new THREE.Vector3()));
      if (pos) entries.push({ id, pos: pos.clone(), color, kind });
    };
    add('sol', '#ffd9a0', 'star');
    for (const def of PLANETS) add(def.id, def.color, 'planet');
    add('station-alpha', '#7ee7ff', 'station');
    add('station-beta', '#ffb35c', 'station');
    add('station-omega', '#a78bfa', 'station');
    add('wormhole-alpha', '#a78bfa', 'wormhole');
    add('wormhole-beta', '#7ee7ff', 'wormhole');

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const heading = Math.atan2(forward.x, forward.z);
    const range = clamp(camDist * 2.6, 4, 90);
    const inSystem = camDist < 60;

    this.minimap.render({
      dt,
      playerPos: this.camera.position,
      heading,
      entries,
      targetId: this.targetId || this.selection?.selectedId || null,
      range,
      scaleLabel: `${range.toFixed(range < 10 ? 1 : 0)} ${inSystem ? 'AU' : 'kly·sc'}`,
    });
  }

  // ------------------------------------------------------------------
  // Gestures
  // ------------------------------------------------------------------
  _applyGesture(state, dt) {
    if (this.rig?.orbitActive) {
      this.controls.setGestureInput({ steer: state.steer, zoom: state.zoom, tilt: state.tilt });
    } else {
      this.spacecraft?.setGestureSteer(state.steer, state.tilt);
    }

    if (state.action) this._handleGestureAction(state.action, state);
  }

  _handleGestureAction(action, state) {
    switch (action) {
      case 'PAUSE':
        this.togglePause();
        break;
      case 'SELECT':
        if (typeof state.selectX === 'number') this.selection?.selectAt(state.selectX, state.selectY);
        break;
      case 'CONFIRM':
        if (this.selection?.selectedId) this.focusObject(this.selection.selectedId);
        else this.ui.showToast('Point at an object to select it first.', 'warning', 2400);
        break;
      case 'CANCEL':
        this._handleEscape();
        break;
      case 'SWIPE_RIGHT':
      case 'SWIPE_LEFT': {
        const index = Math.max(NAV_SEQUENCE.indexOf(this.focusId || this.selection?.selectedId || ''), 0);
        const delta = action === 'SWIPE_RIGHT' ? 1 : -1;
        const next = NAV_SEQUENCE[(index + delta + NAV_SEQUENCE.length) % NAV_SEQUENCE.length];
        this.focusObject(next);
        break;
      }
      default:
        break;
    }
  }

  // ------------------------------------------------------------------
  // Resize / config plumbing (v1 behaviour preserved)
  // ------------------------------------------------------------------
  _handleResize() {
    if (!this.resizePending) return;
    this.resizePending = false;
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(this.perf.pixelRatioCap());
    this.renderer.setSize(width, height, false);
    this.postfx.setResolution(width, height, this.renderer.getPixelRatio());
    this._syncPixelRatio();
  }

  _onParamChange(group, key, value, rebuild) {
    const target = group === 'galaxy' ? this.galaxyParams : this.visuals;
    target[key] = value;
    this.presetName = 'CUSTOM';
    this.ui.setActivePreset('');

    if (group === 'visuals' && key === 'exposure') this.renderer.toneMappingExposure = value;
    if (group === 'visuals' && key === 'glow') this.postfx?.setGlow(value);
    if (group === 'galaxy' && key === 'particles') this.particleMode = String(value);

    if (rebuild) this._scheduleRebuild();
    this._persistParams();
  }

  _scheduleRebuild() {
    clearTimeout(this.rebuildTimer);
    this.rebuildTimer = setTimeout(() => this._rebuildGalaxy(), 260);
  }

  _rebuildGalaxy(initial = false) {
    const profile = this.perf.getProfile();
    if (this.particleMode === 'auto') {
      const autoCount = Math.round(DEFAULT_GALAXY.particles * this.perf.particleScale());
      this.galaxyParams.particles = autoCount;
      if (!initial) this.ui.setControlValue('galaxy', 'particles', autoCount);
    }

    this.galaxy.build(this.galaxyParams, this.visuals, this.theme, profile);
    this.starfield.build(this.visuals.starDensity, this.theme, profile);
    if (!initial) this._persistParams();
  }

  applyPreset(name) {
    const preset = PRESETS[name];
    if (!preset) return;
    this.presetName = name;
    this.galaxyParams = { ...preset.galaxy, galaxyScale: this.galaxyScaleTarget };
    this.visuals = { ...preset.visuals };
    this.theme = { ...COLOR_THEMES[preset.theme] };

    for (const [key, value] of Object.entries(this.galaxyParams)) this.ui.setControlValue('galaxy', key, value);
    for (const [key, value] of Object.entries(this.visuals)) this.ui.setControlValue('visuals', key, value);

    this.ui.setActivePreset(name);
    this.core.setTheme(this.theme);
    this.renderer.toneMappingExposure = this.visuals.exposure;
    this.postfx?.setGlow(this.visuals.glow);
    this._rebuildGalaxy();
    this.ui.showToast(`${name} preset loaded.`, 'info', 2400);
  }

  resetAll() {
    this.applyPreset('DEFAULT');
    this.controls?.reset();
    this.rig?.clearFocus();
    this.selection?.clear('reset');
    this.hud?.setInfo(null);
    this.targetId = null;
    this.hud?.setTarget(null);
    this.galaxyScaleTarget = DEFAULT_GALAXY.galaxyScale;
    this.timeScale = DEFAULT_SIM.timeScale;
    this.hud?.setSimSpeed(this.timeScale);
    this.interaction.autoRotate = true;
    this.interaction.reducedMotion = false;
    this.ui.setToggle('autoRotate', true);
    this.ui.dom.setReducedMotion.checked = false;
    if (this.controls) this.controls.autoRotate = true;
    this.paused = false;
    this._syncNav();
    this._syncStatus();
    this.ui.showToast('Simulation reset to defaults.', 'info', 2400);
  }

  togglePause() {
    this.paused = !this.paused;
    this._syncStatus();
    this.ui.showToast(this.paused ? 'Simulation paused.' : 'Simulation resumed.', 'info', 1600);
  }

  _onMouseToggle(checked) {
    this.interaction.mouse = checked;
    this.controls?.setMouseEnabled(checked);
    this._syncStatus();
    this._persistParams();
  }

  async _onGestureToggle(checked) {
    if (checked) {
      this.ui.showToast('Requesting camera access for local hand tracking...', 'info', 3200);
      const started = await this.gesture.start();
      if (!started) {
        this.interaction.gesture = false;
        this.ui.setToggle('gesture', false);
        return;
      }
      this.interaction.gesture = true;
      this.ui.setGesturePreview(true);
      this.ui.showToast('Hand control active. Point to select, palm to pause, fist to steer.', 'info', 4800);
    } else {
      this.gesture.stop();
      this.interaction.gesture = false;
      this.ui.setGesturePreview(false);
      this.ui.setToggle('gesture', false);
    }
    this._syncStatus();
    this._persistParams();
  }

  async _onAudioToggle(checked) {
    if (checked) {
      const started = await this.audio.start();
      if (!started) {
        this.ui.setToggle('audioEnabled', false);
        this.ui.showToast(this.audio.errorMessage || 'Audio could not start.', 'warning', 4200);
        return;
      }
      this.ui.setToggle('audioEnabled', true);
      this.ui.showToast('Ambient audio enabled.', 'info', 2200);
    } else {
      this.audio.stop();
      this.ui.setToggle('audioEnabled', false);
    }
    this._persistSettings();
  }

  _onQualityChange(level) {
    this.perf.setQuality(level);
    this._applyQuality();
    this._persistSettings();
  }

  _applyQuality() {
    if (!this.renderer) return;
    const settings = this.ui.readSettings();
    this.renderer.setPixelRatio(this.perf.pixelRatioCap());
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.postfx?.setEnabled(settings.postProcessing !== false && this.perf.bloomEnabled());
    this.postfx?.setResolution(window.innerWidth, window.innerHeight, this.renderer.getPixelRatio());
    this._syncPixelRatio();
    this.ui.dom.qualityBadge.textContent = `GRAPHICS ${this.perf.quality.toUpperCase()}`;
    if (this.belts) {
      this.belts.dispose();
      this.belts.build(this.perf.getProfile());
    }
    this.effects?.setProfile(this.perf.getProfile());
    this._scheduleRebuild();
  }

  _onDegrade() {
    if (!this.renderer) return;
    this.renderer.setPixelRatio(this.perf.pixelRatioCap());
    this._syncPixelRatio();
    this._scheduleRebuild();
    this.ui.showToast('Performance adaptive mode reduced visual load.', 'info', 3200);
  }

  _onParticlePreset(value) {
    this.particleMode = value;
    this.galaxyParams.particles =
      value === 'auto'
        ? Math.round(DEFAULT_GALAXY.particles * this.perf.particleScale())
        : Number(value);
    this.ui.setControlValue('galaxy', 'particles', this.galaxyParams.particles);
    this._scheduleRebuild();
    this._persistSettings();
  }

  _onReducedMotion(checked) {
    this.interaction.reducedMotion = checked;
    if (this.controls) this.controls.reducedMotion = checked;
    this._persistSettings();
  }

  _onEnter() {
    this.ui.showToast('Press H for the full control map, / to search objects, TAB to cycle camera modes.', 'info', 5600);
  }

  _syncStatus() {
    if (this.paused || this.timeScale === 0) {
      this.ui.setStatus('PAUSED', 'online');
      return;
    }
    if (this.rig?.mode === 'flight') {
      this.ui.setStatus('FLIGHT MODE', 'gesture');
      return;
    }
    if (this.interaction.gesture && this.gesture.status === 'active') {
      this.ui.setStatus('HAND CONTROL ACTIVE', 'gesture');
      return;
    }
    if (this.gesture.status === 'denied' || this.gesture.status === 'unavailable') {
      this.ui.setStatus('MOUSE CONTROL ACTIVE', 'error');
      return;
    }
    this.ui.setStatus('MOUSE CONTROL ACTIVE', 'online');
  }

  _persistParams() {
    const payload = {
      galaxy: this.galaxyParams,
      visuals: this.visuals,
      preset: this.presetName,
      particleMode: this.particleMode,
      interaction: this.interaction,
      sim: { timeScale: this.timeScale, cinematicFx: this.cinematicFx, minimap: this.minimapVisible },
    };
    safeStorageSet(STORAGE_KEYS.params, JSON.stringify(payload));
  }

  _persistSettings() {
    const current = this.ui.readSettings();
    safeStorageSet(STORAGE_KEYS.settings, JSON.stringify(current));
  }

  _restoreParams() {
    const stored = safeStorageGet(STORAGE_KEYS.params);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.galaxy) this.galaxyParams = { ...DEFAULT_GALAXY, ...data.galaxy };
        if (data.visuals) this.visuals = { ...DEFAULT_VISUALS, ...data.visuals };
        if (data.preset && PRESETS[data.preset]) this.presetName = data.preset;
        if (data.particleMode) this.particleMode = data.particleMode;
        if (data.interaction) this.interaction = { ...DEFAULT_INTERACTION, ...data.interaction };
        if (data.sim?.timeScale !== undefined && SIM_SPEEDS.includes(data.sim.timeScale)) this.timeScale = data.sim.timeScale;
        if (typeof data.sim?.cinematicFx === 'boolean') this.cinematicFx = data.sim.cinematicFx;
        if (typeof data.sim?.minimap === 'boolean') this.minimapVisible = data.sim.minimap;
      } catch {
        /* ignore malformed stored parameters */
      }
    }

    this.galaxyScaleTarget = this.galaxyParams.galaxyScale ?? DEFAULT_GALAXY.galaxyScale;
    this.galaxyScale = this.galaxyScaleTarget;

    for (const [key, value] of Object.entries(this.galaxyParams)) this.ui.setControlValue('galaxy', key, value);
    for (const [key, value] of Object.entries(this.visuals)) this.ui.setControlValue('visuals', key, value);
    this.ui.setActivePreset(this.presetName);

    const settings = this.ui.readSettings();
    if (typeof settings.reducedMotion === 'boolean') {
      this.interaction.reducedMotion = settings.reducedMotion;
    } else if (this.perf.isReducedMotionPreferred()) {
      this.interaction.reducedMotion = true;
      this.ui.dom.setReducedMotion.checked = true;
    }
    this.interaction.gesture = false;
    this.ui.setToggle('gesture', false);
  }

  dispose() {
    cancelAnimationFrame(this.rafHandle);
    this.controls?.dispose();
    this.gesture?.dispose();
    this.audio?.dispose();
    this.postfx?.dispose();
    this.selection?.dispose();
    this.spacecraft?.dispose();
    this.effects?.dispose();
    this.wormholes?.dispose();
    this.stations?.dispose();
    this.belts?.dispose();
    this.system?.dispose();
    this.galaxy?.dispose();
    this.starfield?.dispose();
    this.core?.dispose();
    this.renderer?.dispose();
  }
}

function installErrorGuard(ui) {
  let lastNotice = 0;
  const notify = (message) => {
    const now = Date.now();
    if (now - lastNotice < 8000) return;
    lastNotice = now;
    ui.showToast(message, 'warning', 5200);
  };

  window.addEventListener('error', (event) => {
    if (event.error && /WebGL|THREE|MediaPipe/i.test(String(event.error))) {
      notify('A graphics module reported an issue. The experience may be simplified.');
    }
  });

  window.addEventListener('unhandledrejection', () => {
    notify('An optional feature could not load. Core controls remain available.');
  });
}

const experience = new Experience();
installErrorGuard(experience.ui);
experience.boot();

experience.objects = CELESTIAL_OBJECTS;
experience.objectById = OBJECT_BY_ID;
experience.focus = (id) => experience.focusObject(id);
experience.select = (id) => {
  experience.selection?.selectId(id, (resolveId, out) => experience.resolveWorld(resolveId, out));
  const def = OBJECT_BY_ID.get(id);
  if (def) experience.hud?.setInfo(def);
  experience._syncNav();
};
experience.resolveWorld = experience.resolveWorld.bind(experience);
window.cosmovision = experience;

window.addEventListener('pagehide', () => experience.dispose());
