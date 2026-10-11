import type { GalaxyParams, GalaxyTheme } from '../types';

export const DEFAULT_GALAXY: GalaxyParams = {
  particles: 42000,
  radius: 12,
  armCount: 4,
  armTightness: 0.55,
  armSpread: 0.3,
  coreRadius: 1.7,
  particleSize: 1,
  rotationSpeed: 0.14,
  coreIntensity: 1,
  energy: 0.55,
};

export const GALAXY_LIMITS = {
  particles: { min: 8000, max: 60000, step: 1000 },
  radius: { min: 8, max: 18, step: 0.5 },
  armCount: { min: 2, max: 6, step: 1 },
  armTightness: { min: 0.2, max: 0.9, step: 0.01 },
  armSpread: { min: 0.12, max: 0.7, step: 0.01 },
  coreRadius: { min: 0.8, max: 3, step: 0.1 },
  particleSize: { min: 0.5, max: 2, step: 0.05 },
  rotationSpeed: { min: 0, max: 0.6, step: 0.01 },
  coreIntensity: { min: 0.3, max: 2, step: 0.05 },
  energy: { min: 0.1, max: 1.6, step: 0.01 },
} as const;

export type GalaxyParamKey = keyof GalaxyParams;

export const THEMES: GalaxyTheme[] = [
  {
    id: 'default',
    label: 'Classic',
    coreColor: '#ffd9a0',
    armColor: '#7fb4ff',
    edgeColor: '#3a5fd0',
    dustColor: '#7a5f8f',
    nebulaColor: '#5b7ff5',
  },
  {
    id: 'deepSpace',
    label: 'Deep Space',
    coreColor: '#cfe3ff',
    armColor: '#5f8dff',
    edgeColor: '#1b2f8f',
    dustColor: '#3a4a7a',
    nebulaColor: '#2b48c8',
  },
  {
    id: 'blueNebula',
    label: 'Blue Nebula',
    coreColor: '#dff3ff',
    armColor: '#57c8ff',
    edgeColor: '#1a56c9',
    dustColor: '#2f6c9a',
    nebulaColor: '#33a8ff',
  },
  {
    id: 'purpleNebula',
    label: 'Violet Nebula',
    coreColor: '#f3e0ff',
    armColor: '#b98bff',
    edgeColor: '#5b25c9',
    dustColor: '#6a3f9a',
    nebulaColor: '#a05cff',
  },
  {
    id: 'solar',
    label: 'Solar Wind',
    coreColor: '#ffe08a',
    armColor: '#ffb35c',
    edgeColor: '#c95a1a',
    dustColor: '#9a6234',
    nebulaColor: '#ff8f3c',
  },
  {
    id: 'minimal',
    label: 'Monochrome',
    coreColor: '#ffffff',
    armColor: '#c9d4e6',
    edgeColor: '#6d7a94',
    dustColor: '#4a5266',
    nebulaColor: '#7f8aa3',
  },
];

export function getTheme(id: string): GalaxyTheme {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0];
}

export interface GalaxyPreset {
  id: string;
  label: string;
  themeId: string;
  galaxy: Partial<GalaxyParams>;
}

export const GALAXY_PRESETS: GalaxyPreset[] = [
  { id: 'default', label: 'Default', themeId: 'default', galaxy: {} },
  {
    id: 'deepSpace',
    label: 'Deep Space',
    themeId: 'deepSpace',
    galaxy: { particles: 52000, radius: 15, armCount: 3, armTightness: 0.7, rotationSpeed: 0.08, energy: 0.45 },
  },
  {
    id: 'blueNebula',
    label: 'Blue Nebula',
    themeId: 'blueNebula',
    galaxy: { particles: 46000, armCount: 4, armSpread: 0.5, particleSize: 1.1, energy: 0.65 },
  },
  {
    id: 'purpleNebula',
    label: 'Violet Nebula',
    themeId: 'purpleNebula',
    galaxy: { particles: 48000, armCount: 5, armTightness: 0.45, armSpread: 0.55, coreIntensity: 1.15, energy: 0.6 },
  },
  {
    id: 'tightArms',
    label: 'Tight Spiral',
    themeId: 'default',
    galaxy: { particles: 50000, armCount: 2, armTightness: 0.85, armSpread: 0.18, coreRadius: 2.2 },
  },
  {
    id: 'minimal',
    label: 'Minimal',
    themeId: 'minimal',
    galaxy: { particles: 14000, armCount: 3, armTightness: 0.6, particleSize: 0.85, rotationSpeed: 0.06, energy: 0.4 },
  },
];

export interface QualityProfile {
  id: 'low' | 'medium' | 'high';
  label: string;
  dpr: number;
  particleScale: number;
  nebulaScale: number;
  beltScale: number;
  labels: boolean;
  trails: boolean;
}

export const QUALITY_PROFILES: QualityProfile[] = [
  {
    id: 'low',
    label: 'Low',
    dpr: 1,
    particleScale: 0.45,
    nebulaScale: 0.4,
    beltScale: 0.35,
    labels: false,
    trails: false,
  },
  {
    id: 'medium',
    label: 'Medium',
    dpr: 1.5,
    particleScale: 0.75,
    nebulaScale: 0.75,
    beltScale: 0.7,
    labels: true,
    trails: true,
  },
  {
    id: 'high',
    label: 'High',
    dpr: 2,
    particleScale: 1,
    nebulaScale: 1,
    beltScale: 1,
    labels: true,
    trails: true,
  },
];

export function getQualityProfile(id: 'low' | 'medium' | 'high'): QualityProfile {
  return QUALITY_PROFILES.find((profile) => profile.id === id) ?? QUALITY_PROFILES[1];
}
