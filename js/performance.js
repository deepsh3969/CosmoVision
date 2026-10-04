import { clamp, safeStorageGet, safeStorageSet } from './utils.js';
import { QUALITY, STORAGE_KEYS } from './config.js';

export class PerformanceManager {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.fps = 60;
    this.samples = [];
    this.sampleAccumulator = 0;
    this.frameCount = 0;
    this.lowFpsStreak = 0;
    this.degradations = 0;
    this.maxDegradeSteps = 3;

    const stored = safeStorageGet(STORAGE_KEYS.settings);
    let savedQuality = 'auto';
    if (stored) {
      try {
        savedQuality = JSON.parse(stored).quality || 'auto';
      } catch {
        savedQuality = 'auto';
      }
    }
    this.requestedQuality = savedQuality;
    this.quality = this._resolveInitial(savedQuality);
  }

  _resolveInitial(requested) {
    if (requested !== 'auto' && QUALITY[requested]) return requested;
    const memory = navigator.deviceMemory || 4;
    const cores = navigator.hardwareConcurrency || 4;
    const mobile = this.isMobile();
    if (mobile) return cores >= 8 && memory >= 6 ? 'medium' : 'low';
    if (memory >= 8 && cores >= 8) return 'high';
    if (memory >= 4 && cores >= 4) return 'medium';
    return 'low';
  }

  isMobile() {
    const ua = navigator.userAgent || '';
    const coarse = window.matchMedia?.('(pointer: coarse)').matches;
    const smallScreen = Math.min(window.innerWidth, window.innerHeight) < 820;
    return coarse || /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || (coarse && smallScreen);
  }

  isReducedMotionPreferred() {
    return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  }

  setQuality(level) {
    this.requestedQuality = level;
    const resolved = level === 'auto' ? this._resolveInitial('auto') : level;
    if (resolved !== this.quality) {
      this.quality = resolved;
      this.degradations = 0;
      this.lowFpsStreak = 0;
      this.callbacks.onQualityChange?.(this.getProfile(), level);
    }
    this._persist();
  }

  getProfile() {
    return QUALITY[this.quality] || QUALITY.medium;
  }

  _persist() {
    const stored = safeStorageGet(STORAGE_KEYS.settings);
    let data = {};
    if (stored) {
      try {
        data = JSON.parse(stored);
      } catch {
        data = {};
      }
    }
    data.quality = this.requestedQuality;
    safeStorageSet(STORAGE_KEYS.settings, JSON.stringify(data));
  }

  tick(dt) {
    this.frameCount += 1;
    this.sampleAccumulator += dt;
    if (this.sampleAccumulator < 0.5) return;

    const fps = this.frameCount / this.sampleAccumulator;
    this.fps = fps;
    this.samples.push(fps);
    if (this.samples.length > 8) this.samples.shift();
    this.frameCount = 0;
    this.sampleAccumulator = 0;

    const average = this.samples.reduce((sum, value) => sum + value, 0) / this.samples.length;
    if (average < 42) {
      this.lowFpsStreak += 1;
    } else if (average > 55) {
      this.lowFpsStreak = 0;
    }

    if (this.lowFpsStreak >= 4 && this.degradations < this.maxDegradeSteps) {
      this.degradations += 1;
      this.lowFpsStreak = 0;
      this.callbacks.onDegrade?.(this.degradations, this.getProfile());
    }

    this.callbacks.onSample?.(fps);
  }

  pixelRatioCap() {
    const base = this.getProfile().dpr;
    const degraded = this.degradations > 0 ? Math.max(1, base - this.degradations * 0.25) : base;
    return clamp(Math.min(window.devicePixelRatio || 1, degraded), 0.75, 2);
  }

  particleScale() {
    const base = this.getProfile().particleScale;
    const penalty = this.degradations > 0 ? Math.pow(0.8, this.degradations) : 1;
    return clamp(base * penalty, 0.3, 1);
  }

  bloomEnabled() {
    return this.getProfile().bloom && this.degradations < 3;
  }
}
