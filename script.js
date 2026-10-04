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
import {
  DEFAULT_GALAXY,
  DEFAULT_VISUALS,
  DEFAULT_INTERACTION,
  PRESETS,
  COLOR_THEMES,
  LIMITS,
  STORAGE_KEYS,
} from './js/config.js';
import { clamp, damp, safeStorageGet, safeStorageSet } from './js/utils.js';

class Experience {
  constructor() {
    this.galaxyParams = { ...DEFAULT_GALAXY };
    this.visuals = { ...DEFAULT_VISUALS };
    this.interaction = { ...DEFAULT_INTERACTION };
    this.theme = { ...COLOR_THEMES.default };
    this.presetName = 'DEFAULT';
    this.particleMode = 'auto';

    this.paused = false;
    this.running = false;
    this.simTime = 0;
    this.lastFrame = 0;
    this.rafHandle = 0;
    this.syncCounter = 0;
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
    };
  }

  async boot() {
    if (!this._webglAvailable()) {
      this.ui.setLoadStep('WebGL unavailable', 100, 3);
      this.ui.showToast('WebGL is unavailable in this browser. CosmoVision cannot start.', 'error', 12000);
      return;
    }

    this._restoreParams();

    await this._stage('Preparing particles', 15, 0, () => this._buildSceneObjects());
    await this._stage('Initializing WebGL', 45, 1, () => this._initRenderer());
    await this._stage('Initializing gesture engine', 75, 2, () => this._initGesture());
    await this._stage('Starting simulation', 100, 3, () => this._startSimulation());

    this.running = true;
    this.lastFrame = performance.now();
    this.rafHandle = requestAnimationFrame((time) => this._loop(time));

    setTimeout(() => {
      this.ui.hideLoading();
      this._syncStatus();
      this.ui.showToast('Drag to orbit, scroll to zoom, press ? for controls.', 'info', 5200);
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

  _buildSceneObjects() {
    this.galaxy = new Galaxy();
    this.starfield = new Starfield();
    this.core = new CosmicCore();
    this._rebuildGalaxy(true);
  }

  _initRenderer() {
    const canvas = document.getElementById('scene');
    this.canvas = canvas;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: this.perf.quality !== 'low',
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(this.perf.pixelRatioCap());
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = this.visuals.exposure;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#04060d');

    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1400);
    this.camera.position.set(16, 12, 16);

    this.scene.add(this.galaxy.group, this.starfield.group, this.core.group);
    this._syncPixelRatio();

    window.addEventListener('resize', () => {
      this.resizePending = true;
    });
    window.addEventListener(
      'pointermove',
      (event) => {
        this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.pointer.y = -((event.clientY / window.innerHeight) * 2 - 1);
      },
      { passive: true },
    );
  }

  _syncPixelRatio() {
    const ratio = this.renderer.getPixelRatio();
    this.galaxy.uniforms.uPixelRatio.value = ratio;
    this.starfield.uniforms.uPixelRatio.value = ratio;
    this.core.haloUniforms.uPixelRatio.value = ratio;
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

    this.postfx = new PostFX(this.renderer, this.scene, this.camera);
    const settings = this.ui.readSettings();
    this.postfx.setEnabled(settings.postProcessing !== false && this.perf.bloomEnabled());
    this.postfx.setGlow(this.visuals.glow);
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
  }

  _loop(now) {
    this.rafHandle = requestAnimationFrame((time) => this._loop(time));
    const dt = clamp((now - this.lastFrame) / 1000, 0.0001, 0.05);
    this.lastFrame = now;

    this._handleResize();

    if (!this.paused) {
      const timeScale = this.interaction.reducedMotion ? 0.4 : 1;
      this.simTime += dt * timeScale;
    }

    const gestureState = this.gesture.enabled ? this.gesture.update(dt) : null;
    if (gestureState) this._applyGesture(gestureState, dt);

    const bands = this.audio.update(dt);
    this.audioBands = this.interaction.reducedMotion
      ? { bass: bands.bass * 0.4, mid: bands.mid * 0.4, high: bands.high * 0.3, mix: bands.mix }
      : bands;

    if (this.interaction.reducedMotion && Math.abs(this.galaxyScaleTarget - DEFAULT_GALAXY.galaxyScale) > 0.001) {
      this.galaxyScaleTarget = damp(this.galaxyScaleTarget, DEFAULT_GALAXY.galaxyScale, 2, dt);
    }
    this.galaxyScale = damp(this.galaxyScale, this.galaxyScaleTarget, 4, dt);

    this.controls.update(dt);

    const pixelRatio = this.renderer.getPixelRatio();

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

    this.renderer.toneMappingExposure = this.visuals.exposure;
    this.perf.tick(dt);

    this.ui.updateStats({
      fps: this.perf.fps,
      particles: this.galaxy.particleCount,
      hands: this.gesture.enabled ? this.gesture.handsCount : 0,
      gesture: this.gesture.enabled ? this.gesture.gesture : 'NONE',
    });

    if (this.gesture.enabled) this.gesture.drawOverlay();

    if (this.gesture.enabled && this.gesture.handsCount > 0 && this.syncCounter % 30 === 0) {
      this.ui.setControlValue('galaxy', 'energy', Number(this.galaxyParams.energy.toFixed(2)));
    }
    this.syncCounter += 1;

    this.postfx.render(dt);
  }

  _applyGesture(state, dt) {
    if (Math.abs(state.energyRate) > 0.001) {
      this.galaxyParams.energy = clamp(
        this.galaxyParams.energy + state.energyRate * dt,
        LIMITS.energy.min,
        LIMITS.energy.max,
      );
    }

    this.controls.setGestureInput({ steer: state.steer, zoom: state.zoom, tilt: state.tilt });

    if (Math.abs(state.expand) > 0.001) {
      this.galaxyScaleTarget = clamp(
        this.galaxyScaleTarget + state.expand * dt * 0.75,
        LIMITS.galaxyScale.min,
        LIMITS.galaxyScale.max,
      );
    }
  }

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
    this.galaxyScaleTarget = DEFAULT_GALAXY.galaxyScale;
    this.interaction.autoRotate = true;
    this.interaction.reducedMotion = false;
    this.ui.setToggle('autoRotate', true);
    this.ui.dom.setReducedMotion.checked = false;
    if (this.controls) this.controls.autoRotate = true;
    this.paused = false;
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
      this.ui.showToast('Hand tracking active. Camera frames stay in your browser.', 'info', 4200);
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
    this.ui.showToast('Welcome aboard. Press ? anytime for the control map.', 'info', 4200);
  }

  _syncStatus() {
    if (this.paused) {
      this.ui.setStatus('PAUSED', 'online');
      return;
    }
    if (this.interaction.gesture && this.gesture.status === 'active') {
      this.ui.setStatus('GESTURE CONTROL ACTIVE', 'gesture');
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

window.cosmovision = experience;

window.addEventListener('pagehide', () => experience.dispose());
