import { GALAXY_LIMITS, GALAXY_PRESETS, THEMES } from '../data/galaxyPresets';
import type { GalaxyParamKey } from '../data/galaxyPresets';
import { useAppStore } from '../store/useAppStore';

const SLIDER_KEYS: GalaxyParamKey[] = [
  'particles',
  'radius',
  'armCount',
  'armTightness',
  'armSpread',
  'coreRadius',
  'particleSize',
  'rotationSpeed',
  'coreIntensity',
  'energy',
];

const KEY_LABELS: Record<GalaxyParamKey, string> = {
  particles: 'Particles',
  radius: 'Radius',
  armCount: 'Arms',
  armTightness: 'Arm tightness',
  armSpread: 'Arm spread',
  coreRadius: 'Core radius',
  particleSize: 'Particle size',
  rotationSpeed: 'Rotation speed',
  coreIntensity: 'Core intensity',
  energy: 'Energy',
};

/** Procedural galaxy editor — every parameter maps 1:1 to the shader-driven generator. */
export function GalaxyExplorer() {
  const galaxy = useAppStore((state) => state.galaxy);
  const themeId = useAppStore((state) => state.themeId);
  const setGalaxyParam = useAppStore((state) => state.setGalaxyParam);
  const setTheme = useAppStore((state) => state.setTheme);
  const applyPreset = useAppStore((state) => state.applyGalaxyPreset);
  const closePanel = useAppStore((state) => state.closePanel);

  return (
    <div className="panel" role="region" aria-label="Galaxy explorer">
      <div className="panel__header">
        <h2 className="panel__title">Galaxy explorer</h2>
        <button type="button" className="icon-button" onClick={closePanel} aria-label="Close panel">
          ✕
        </button>
      </div>
      <div className="panel__body">
        <p className="info__description">
          The Milky Way is generated procedurally from these parameters. Values are illustrative —
          arm count and spread are inspired by observed spiral structure, not measured star positions.
        </p>

        <h3>Presets</h3>
        <div className="preset-row">
          {GALAXY_PRESETS.map((preset) => (
            <button key={preset.id} type="button" onClick={() => applyPreset(preset.id)}>
              {preset.label}
            </button>
          ))}
        </div>

        <h3>Theme</h3>
        <div className="preset-row">
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              type="button"
              className={theme.id === themeId ? 'is-active' : undefined}
              aria-pressed={theme.id === themeId}
              onClick={() => setTheme(theme.id)}
            >
              {theme.label}
            </button>
          ))}
        </div>

        <h3>Parameters</h3>
        <div className="field-grid">
          {SLIDER_KEYS.map((key) => {
            const limits = GALAXY_LIMITS[key];
            return (
              <label key={key} className="field">
                <span className="field__label">
                  {KEY_LABELS[key]}
                  <span className="field__value">{galaxy[key]}</span>
                </span>
                <input
                  type="range"
                  min={limits.min}
                  max={limits.max}
                  step={limits.step}
                  value={galaxy[key]}
                  onChange={(event) => setGalaxyParam(key, Number(event.target.value))}
                />
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
