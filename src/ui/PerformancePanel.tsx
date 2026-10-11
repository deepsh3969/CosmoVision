import { formatInt } from '../lib/format';
import { useAppStore } from '../store/useAppStore';

/** Live renderer statistics sampled by `PerfMonitor` inside the canvas. */
export function PerformancePanel() {
  const perf = useAppStore((state) => state.perf);
  const closePanel = useAppStore((state) => state.closePanel);

  return (
    <div className="panel" role="region" aria-label="Performance">
      <div className="panel__header">
        <h2 className="panel__title">Performance</h2>
        <button type="button" className="icon-button" onClick={closePanel} aria-label="Close panel">
          ✕
        </button>
      </div>
      <div className="panel__body">
        <div className="perf-grid">
          <div className="perf-card">
            <div className="perf-card__value">{perf ? perf.fps : '—'}</div>
            <div className="perf-card__label">FPS</div>
          </div>
          <div className="perf-card">
            <div className="perf-card__value">{perf ? perf.frameMs.toFixed(1) : '—'}</div>
            <div className="perf-card__label">ms / frame</div>
          </div>
          <div className="perf-card">
            <div className="perf-card__value">{perf ? formatInt(perf.drawCalls) : '—'}</div>
            <div className="perf-card__label">Draw calls</div>
          </div>
          <div className="perf-card">
            <div className="perf-card__value">{perf ? formatInt(perf.triangles) : '—'}</div>
            <div className="perf-card__label">Triangles</div>
          </div>
          <div className="perf-card">
            <div className="perf-card__value">{perf ? formatInt(perf.points) : '—'}</div>
            <div className="perf-card__label">Points</div>
          </div>
          <div className="perf-card">
            <div className="perf-card__value">{perf ? perf.dpr.toFixed(2) : '—'}</div>
            <div className="perf-card__label">Pixel ratio</div>
          </div>
          <div className="perf-card">
            <div className="perf-card__value">{perf ? formatInt(perf.geometries) : '—'}</div>
            <div className="perf-card__label">Geometries</div>
          </div>
          <div className="perf-card">
            <div className="perf-card__value">{perf ? formatInt(perf.textures) : '—'}</div>
            <div className="perf-card__label">Textures</div>
          </div>
        </div>
        <p className="info__description">
          Lower the quality tier in Settings if the frame rate drops. Quality scales device pixel
          ratio, galaxy particles, nebula density and belt instance counts.
        </p>
      </div>
    </div>
  );
}
