import { useAppStore } from '../store/useAppStore';

const SHORTCUTS: { keys: string; action: string }[] = [
  { keys: '/', action: 'Open search' },
  { keys: 'Space', action: 'Play / pause simulation' },
  { keys: 'Esc', action: 'Close panel, exit focus or cancel' },
  { keys: 'Home', action: 'Return to the galaxy view' },
  { keys: 'Backspace', action: 'Go back in navigation history' },
  { keys: '+ / −', action: 'Zoom in / out' },
  { keys: 'R', action: 'Reset camera orientation' },
  { keys: 'L', action: 'Toggle object labels' },
  { keys: 'T', action: 'Toggle orbit trails' },
  { keys: '← → ↑ ↓', action: 'Orbit the camera' },
  { keys: 'Drag', action: 'Orbit (shift-drag or right-drag pans)' },
  { keys: 'Wheel', action: 'Zoom' },
  { keys: 'Click', action: 'Select an object' },
  { keys: 'Double-click', action: 'Focus an object' },
];

/** Keyboard/mouse reference plus honesty notes about data and rendering. */
export function HelpDialog() {
  const setHelp = useAppStore((state) => state.setHelp);

  return (
    <div
      className="dialog-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Help"
      onClick={(event) => {
        if (event.target === event.currentTarget) setHelp(false);
      }}
    >
      <div className="dialog">
        <div className="dialog__header">
          <h2>Help — exploring CosmoVision</h2>
          <button type="button" className="icon-button" onClick={() => setHelp(false)} aria-label="Close help">
            ✕
          </button>
        </div>

        <h3>Controls</h3>
        <dl className="shortcut-grid">
          {SHORTCUTS.map((entry) => (
            <div key={entry.keys} style={{ display: 'contents' }}>
              <dt>
                <kbd>{entry.keys}</kbd>
              </dt>
              <dd style={{ margin: 0 }}>{entry.action}</dd>
            </div>
          ))}
        </dl>

        <h3>Data honesty</h3>
        <p>
          Measurements come from NASA fact sheets, NASA Solar System pages, the Hubble heritage
          site and the IAU. Orbit radii and periods in the animation are <em>compressed</em> so
          every planet is visible at once — turn on Science mode in Settings to see the measured
          values with their precision labels.
        </p>
        <p>
          Surfaces, the Milky Way and the asteroid belts are procedural illustrations, not
          photographs. No AI generation is used anywhere in this app.
        </p>
      </div>
    </div>
  );
}
