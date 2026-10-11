import { SOURCE_LIST } from '../data/sources';

/**
 * Accessible stand-in when WebGL is unavailable or the renderer crashes.
 * Every fact shown here comes from the same source-backed dataset as the 3D view.
 */
export function WebGLFallback() {
  return (
    <div className="webgl-fallback" role="region" aria-label="3D view unavailable">
      <div className="webgl-fallback__panel">
        <h1>3D view unavailable</h1>
        <p>
          CosmoVision needs WebGL to render the galaxy. This browser or device could not start a WebGL
          context, so the guided data view below is shown instead. The information, sources and tours
          all still work.
        </p>
        <p className="webgl-fallback__hint">
          Try a different browser, enable hardware acceleration, or update your graphics driver, then
          reload.
        </p>
        <h2>Start here</h2>
        <ul>
          <li>The Milky Way holds our Solar System roughly 26,000 light-years from the galactic centre.</li>
          <li>Light from the Sun reaches Earth in about 8 minutes 20 seconds.</li>
          <li>Jupiter is about 11.2 times Earth&apos;s diameter and hosts the Great Red Spot storm.</li>
        </ul>
        <h2>Sources</h2>
        <ul>
          {SOURCE_LIST.map((source) => (
            <li key={source.id}>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.name}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
