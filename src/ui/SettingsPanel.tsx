import type { QualityTier } from '../types';
import { useAppStore } from '../store/useAppStore';

const QUALITY_TIERS: QualityTier[] = ['low', 'medium', 'high'];

/** Display settings: quality, labels, trails, science annotations and reduced motion. */
export function SettingsPanel() {
  const quality = useAppStore((state) => state.quality);
  const labels = useAppStore((state) => state.labels);
  const trails = useAppStore((state) => state.trails);
  const scienceMode = useAppStore((state) => state.scienceMode);
  const reducedMotion = useAppStore((state) => state.reducedMotion);
  const setQuality = useAppStore((state) => state.setQuality);
  const setLabels = useAppStore((state) => state.setLabels);
  const setTrails = useAppStore((state) => state.setTrails);
  const setScienceMode = useAppStore((state) => state.setScienceMode);
  const setReducedMotion = useAppStore((state) => state.setReducedMotion);
  const closePanel = useAppStore((state) => state.closePanel);

  return (
    <div className="panel" role="region" aria-label="Settings">
      <div className="panel__header">
        <h2 className="panel__title">Settings</h2>
        <button type="button" className="icon-button" onClick={closePanel} aria-label="Close panel">
          ✕
        </button>
      </div>
      <div className="panel__body">
        <div className="field">
          <span className="field__label">Render quality</span>
          <div className="preset-row" role="group" aria-label="Render quality">
            {QUALITY_TIERS.map((tier) => (
              <button
                key={tier}
                type="button"
                className={tier === quality ? 'is-active' : undefined}
                aria-pressed={tier === quality}
                onClick={() => setQuality(tier)}
              >
                {tier}
              </button>
            ))}
          </div>
        </div>

        <div className="toggle-row">
          <span>Object labels</span>
          <button type="button" aria-pressed={labels} onClick={() => setLabels(!labels)}>
            {labels ? 'On' : 'Off'}
          </button>
        </div>
        <div className="toggle-row">
          <span>Orbit trails</span>
          <button type="button" aria-pressed={trails} onClick={() => setTrails(!trails)}>
            {trails ? 'On' : 'Off'}
          </button>
        </div>
        <div className="toggle-row">
          <span>Science mode (data provenance)</span>
          <button type="button" aria-pressed={scienceMode} onClick={() => setScienceMode(!scienceMode)}>
            {scienceMode ? 'On' : 'Off'}
          </button>
        </div>
        <div className="toggle-row">
          <span>Reduced motion</span>
          <button type="button" aria-pressed={reducedMotion} onClick={() => setReducedMotion(!reducedMotion)}>
            {reducedMotion ? 'On' : 'Off'}
          </button>
        </div>

        <p className="info__description" style={{ marginTop: '14px' }}>
          Settings, journal notes and galaxy parameters are stored locally in your browser — nothing
          is uploaded.
        </p>
      </div>
    </div>
  );
}
