import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { getObject } from '../data/celestialObjects';
import { formatAu, formatDays, formatKm } from '../lib/format';
import { useAppStore } from '../store/useAppStore';

/** Side-by-side comparison of up to three planets, moons or stars, with a diameter chart. */
export function ComparisonPanel() {
  const compareIds = useAppStore((state) => state.compareIds);
  const clearCompare = useAppStore((state) => state.clearCompare);
  const closePanel = useAppStore((state) => state.closePanel);
  const focusObject = useAppStore((state) => state.focusObject);

  const objects = compareIds.map((id) => getObject(id)).filter((object) => object !== undefined);

  const chartData = objects
    .filter((object) => object.diameterKm !== undefined)
    .map((object) => ({ name: object.name, diameterKm: object.diameterKm }));

  return (
    <div className="panel" role="region" aria-label="Comparison">
      <div className="panel__header">
        <h2 className="panel__title">Compare objects</h2>
        <button type="button" className="icon-button" onClick={closePanel} aria-label="Close panel">
          ✕
        </button>
      </div>
      <div className="panel__body">
        {objects.length === 0 ? (
          <p className="info__description">
            Add up to three planets, moons or stars from the info panel to compare measured values
            side by side.
          </p>
        ) : (
          <>
            {chartData.length > 1 && (
              <div className="compare-chart" aria-label="Diameter comparison chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fill: '#9fb0d8', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#9fb0d8', fontSize: 11 }} width={54} />
                    <Tooltip
                      contentStyle={{ background: '#0a1022', border: '1px solid rgba(140,170,255,0.3)' }}
                      formatter={(value) => [formatKm(Number(value)), 'Diameter']}
                    />
                    <Bar dataKey="diameterKm" fill="#6fa8ff" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <table className="compare-table">
              <thead>
                <tr>
                  <th scope="col">Property</th>
                  {objects.map((object) => (
                    <th key={object.id} scope="col">
                      <button
                        type="button"
                        style={{ padding: '2px 6px', fontSize: '0.82rem' }}
                        onClick={() => focusObject(object.id)}
                      >
                        {object.name}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Type</th>
                  {objects.map((object) => (
                    <td key={object.id}>{object.typeLabel}</td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Diameter</th>
                  {objects.map((object) => (
                    <td key={object.id}>{object.diameterKm ? formatKm(object.diameterKm) : '—'}</td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Distance from Sun</th>
                  {objects.map((object) => (
                    <td key={object.id}>
                      {object.orbit ? formatAu(object.orbit.realSemiMajorAU) : '—'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Orbital period</th>
                  {objects.map((object) => (
                    <td key={object.id}>
                      {object.orbit ? formatDays(object.orbit.realPeriodDays) : '—'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Day length</th>
                  {objects.map((object) => (
                    <td key={object.id}>
                      {object.rotationPeriodHours !== undefined
                        ? `${Math.abs(object.rotationPeriodHours).toFixed(1)} h${
                            object.rotationPeriodHours < 0 ? ' (retrograde)' : ''
                          }`
                        : '—'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Axial tilt</th>
                  {objects.map((object) => (
                    <td key={object.id}>
                      {object.axialTiltDeg !== undefined ? `${object.axialTiltDeg}°` : '—'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </>
        )}
      </div>
      {objects.length > 0 && (
        <div className="panel__footer">
          <button type="button" onClick={clearCompare}>
            Clear comparison
          </button>
        </div>
      )}
    </div>
  );
}
