import { formatSimDate } from '../lib/format';
import { SIM_SPEEDS } from '../simulation/clock';
import { useAppStore } from '../store/useAppStore';

/** Play/pause, speed presets, reset, trails and the live simulation date. */
export function SimControls() {
  const playing = useAppStore((state) => state.playing);
  const simSpeed = useAppStore((state) => state.simSpeed);
  const simDays = useAppStore((state) => state.simDays);
  const trails = useAppStore((state) => state.trails);
  const togglePlay = useAppStore((state) => state.togglePlay);
  const setSimSpeed = useAppStore((state) => state.setSimSpeed);
  const resetSimulation = useAppStore((state) => state.resetSimulation);
  const setTrails = useAppStore((state) => state.setTrails);

  return (
    <div className="sim-controls" role="group" aria-label="Simulation controls">
      <button
        type="button"
        onClick={togglePlay}
        aria-pressed={playing}
        title="Play / pause (Space)"
      >
        {playing ? '⏸ Pause' : '▶ Play'}
      </button>
      <label className="visually-hidden" htmlFor="sim-speed">
        Simulation speed (days per second)
      </label>
      <select
        id="sim-speed"
        value={simSpeed}
        onChange={(event) => setSimSpeed(Number(event.target.value))}
      >
        {SIM_SPEEDS.map((speed) => (
          <option key={speed} value={speed}>
            {speed} d/s
          </option>
        ))}
      </select>
      <button type="button" onClick={resetSimulation} title="Reset simulation clock">
        Reset
      </button>
      <button type="button" onClick={() => setTrails(!trails)} aria-pressed={trails} title="Orbit trails (T)">
        Trails {trails ? 'on' : 'off'}
      </button>
      <span className="sim-controls__date" aria-label="Simulation date">
        {formatSimDate(simDays)}
      </span>
    </div>
  );
}
