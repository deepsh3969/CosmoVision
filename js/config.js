export const DEFAULT_GALAXY = {
  particles: 45000,
  radius: 12,
  armCount: 4,
  armTightness: 0.55,
  armSpread: 0.3,
  coreRadius: 1.7,
  particleSize: 1,
  rotationSpeed: 0.14,
  coreIntensity: 1,
  energy: 0.55,
  galaxyScale: 1,
};

export const DEFAULT_VISUALS = {
  glow: 1,
  fog: 0.55,
  exposure: 1.05,
  starDensity: 1,
  nebulaDensity: 1,
};

export const DEFAULT_INTERACTION = {
  mouse: true,
  gesture: true,
  autoRotate: true,
  reducedMotion: false,
};

export const DEFAULT_AUDIO = {
  enabled: false,
  volume: 0.5,
  reactivity: true,
};

export const LIMITS = {
  energy: { min: 0.1, max: 1.6 },
  zoom: { min: 6, max: 70 },
  phi: { min: 0.12, max: 1.52 },
  galaxyScale: { min: 0.55, max: 1.75 },
  particleRange: { min: 20000, max: 60000 },
};

export const COLOR_THEMES = {
  default: {
    coreColor: '#ffd9a0',
    innerColor: '#fff4e2',
    armColor: '#7fb4ff',
    edgeColor: '#3a5fd0',
    dustColor: '#7a5f8f',
    nebulaColor: '#5b7ff5',
    ringColor: '#ffc98a',
  },
  deepSpace: {
    coreColor: '#cfe3ff',
    innerColor: '#ffffff',
    armColor: '#5f8dff',
    edgeColor: '#1b2f8f',
    dustColor: '#3a4a7a',
    nebulaColor: '#2b48c8',
    ringColor: '#9fc3ff',
  },
  blueNebula: {
    coreColor: '#dff3ff',
    innerColor: '#f4fdff',
    armColor: '#57c8ff',
    edgeColor: '#1a56c9',
    dustColor: '#2f6c9a',
    nebulaColor: '#33a8ff',
    ringColor: '#8fe0ff',
  },
  purpleNebula: {
    coreColor: '#f3e0ff',
    innerColor: '#fff2ff',
    armColor: '#b98bff',
    edgeColor: '#5b25c9',
    dustColor: '#6a3f9a',
    nebulaColor: '#a05cff',
    ringColor: '#dcb4ff',
  },
  solar: {
    coreColor: '#ffe08a',
    innerColor: '#fff7d6',
    armColor: '#ffb35c',
    edgeColor: '#c95a1a',
    dustColor: '#9a6234',
    nebulaColor: '#ff8f3c',
    ringColor: '#ffd27a',
  },
  energyStorm: {
    coreColor: '#ffffff',
    innerColor: '#f0ffff',
    armColor: '#7dfff0',
    edgeColor: '#0f7fe0',
    dustColor: '#3f7fa0',
    nebulaColor: '#39e0ff',
    ringColor: '#a6fff4',
  },
  minimal: {
    coreColor: '#ffffff',
    innerColor: '#ffffff',
    armColor: '#c9d4e6',
    edgeColor: '#6d7a94',
    dustColor: '#4a5266',
    nebulaColor: '#7f8aa3',
    ringColor: '#e6ecf7',
  },
};

export const PRESETS = {
  DEFAULT: {
    theme: 'default',
    galaxy: { ...DEFAULT_GALAXY },
    visuals: { ...DEFAULT_VISUALS },
  },
  'DEEP SPACE': {
    theme: 'deepSpace',
    galaxy: {
      ...DEFAULT_GALAXY,
      particles: 52000,
      radius: 15,
      armCount: 3,
      armTightness: 0.7,
      armSpread: 0.3,
      rotationSpeed: 0.08,
      coreIntensity: 0.8,
      energy: 0.45,
    },
    visuals: { glow: 0.85, fog: 0.75, exposure: 0.9, starDensity: 1.4, nebulaDensity: 0.7 },
  },
  'BLUE NEBULA': {
    theme: 'blueNebula',
    galaxy: {
      ...DEFAULT_GALAXY,
      particles: 48000,
      armCount: 4,
      armTightness: 0.5,
      armSpread: 0.5,
      particleSize: 1.1,
      rotationSpeed: 0.12,
      energy: 0.65,
    },
    visuals: { glow: 1.2, fog: 0.5, exposure: 1.1, starDensity: 1, nebulaDensity: 1.4 },
  },
  'PURPLE NEBULA': {
    theme: 'purpleNebula',
    galaxy: {
      ...DEFAULT_GALAXY,
      particles: 50000,
      armCount: 5,
      armTightness: 0.45,
      armSpread: 0.55,
      particleSize: 1.05,
      coreIntensity: 1.15,
      energy: 0.6,
    },
    visuals: { glow: 1.25, fog: 0.55, exposure: 1.05, starDensity: 0.9, nebulaDensity: 1.5 },
  },
  SOLAR: {
    theme: 'solar',
    galaxy: {
      ...DEFAULT_GALAXY,
      particles: 44000,
      armCount: 2,
      armTightness: 0.62,
      armSpread: 0.36,
      rotationSpeed: 0.18,
      coreIntensity: 1.3,
      energy: 0.7,
    },
    visuals: { glow: 1.3, fog: 0.4, exposure: 1.15, starDensity: 0.8, nebulaDensity: 0.9 },
  },
  'ENERGY STORM': {
    theme: 'energyStorm',
    galaxy: {
      ...DEFAULT_GALAXY,
      particles: 60000,
      armCount: 6,
      armTightness: 0.35,
      armSpread: 0.62,
      particleSize: 1.2,
      rotationSpeed: 0.42,
      coreIntensity: 1.5,
      energy: 0.95,
    },
    visuals: { glow: 1.5, fog: 0.3, exposure: 1.2, starDensity: 1.2, nebulaDensity: 1.3 },
  },
  MINIMAL: {
    theme: 'minimal',
    galaxy: {
      ...DEFAULT_GALAXY,
      particles: 24000,
      armCount: 3,
      armTightness: 0.6,
      armSpread: 0.26,
      particleSize: 0.85,
      rotationSpeed: 0.06,
      coreIntensity: 0.7,
      energy: 0.4,
    },
    visuals: { glow: 0.7, fog: 0.35, exposure: 0.95, starDensity: 0.6, nebulaDensity: 0.4 },
  },
};

export const QUALITY = {
  low: { dpr: 1, bloom: false, particleScale: 0.55, haloScale: 0.5 },
  medium: { dpr: 1.5, bloom: true, particleScale: 0.8, haloScale: 0.8 },
  high: { dpr: 2, bloom: true, particleScale: 1, haloScale: 1 },
  ultra: { dpr: 2, bloom: true, particleScale: 1, haloScale: 1 },
};

export const SCHEMA = {
  galaxy: [
    { key: 'particles', label: 'Particle Count', min: 20000, max: 60000, step: 1000, format: (v) => v.toLocaleString('en-US'), rebuild: true },
    { key: 'radius', label: 'Galaxy Radius', min: 8, max: 18, step: 0.5, format: (v) => v.toFixed(1), rebuild: true },
    { key: 'armCount', label: 'Arm Count', min: 2, max: 6, step: 1, format: (v) => `${v}`, rebuild: true },
    { key: 'armTightness', label: 'Arm Tightness', min: 0.2, max: 0.9, step: 0.01, format: (v) => v.toFixed(2), rebuild: true },
    { key: 'particleSize', label: 'Particle Size', min: 0.5, max: 2, step: 0.05, format: (v) => v.toFixed(2), rebuild: false },
    { key: 'rotationSpeed', label: 'Rotation Speed', min: 0, max: 0.6, step: 0.01, format: (v) => v.toFixed(2), rebuild: false },
    { key: 'coreIntensity', label: 'Core Intensity', min: 0.3, max: 2, step: 0.05, format: (v) => v.toFixed(2), rebuild: false },
    { key: 'energy', label: 'Energy', min: 0.1, max: 1.6, step: 0.01, format: (v) => v.toFixed(2), rebuild: false },
  ],
  visuals: [
    { key: 'glow', label: 'Glow', min: 0.3, max: 1.8, step: 0.05, format: (v) => v.toFixed(2), rebuild: false },
    { key: 'fog', label: 'Fog', min: 0, max: 1.5, step: 0.05, format: (v) => v.toFixed(2), rebuild: false },
    { key: 'exposure', label: 'Exposure', min: 0.5, max: 1.8, step: 0.05, format: (v) => v.toFixed(2), rebuild: false },
    { key: 'starDensity', label: 'Star Density', min: 0.3, max: 1.8, step: 0.05, format: (v) => v.toFixed(2), rebuild: true },
    { key: 'nebulaDensity', label: 'Nebula Density', min: 0, max: 2, step: 0.05, format: (v) => v.toFixed(2), rebuild: true },
  ],
};

export const STORAGE_KEYS = {
  welcome: 'cosmovision.welcome.dismissed',
  settings: 'cosmovision.settings.v1',
  params: 'cosmovision.params.v1',
};

export const KEY_HINTS = [
  ['W / S', 'Zoom in / out'],
  ['A / D', 'Rotate left / right'],
  ['Q / E', 'Move up / down'],
  ['R', 'Reset camera'],
  ['SPACE', 'Pause / resume'],
];

export const GESTURE_HINTS = [
  ['Open palm', 'Increase galaxy energy'],
  ['Fist', 'Decrease galaxy energy'],
  ['Index point', 'Steer galaxy rotation'],
  ['Pinch', 'Zoom camera'],
  ['Move hand', 'Rotate galaxy'],
  ['Two hands apart', 'Expand galaxy'],
  ['Two hands together', 'Compress galaxy'],
];
