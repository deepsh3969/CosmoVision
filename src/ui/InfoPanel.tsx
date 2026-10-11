import { useEffect, useState } from 'react';

import { categoryLabel, getObject, relatedObjects } from '../data/celestialObjects';
import { SOURCES } from '../data/sources';
import { useAppStore } from '../store/useAppStore';
import type { DataPrecision } from '../types';

const PRECISION_LABEL: Record<DataPrecision, string> = {
  measured: 'measured',
  approximate: 'approximate',
  illustrative: 'illustrative',
  procedural: 'procedural',
};

function PrecisionBadge({ precision }: { precision: DataPrecision }) {
  return <span className={`precision precision--${precision}`}>{PRECISION_LABEL[precision]}</span>;
}

/** Everything we know about the selected object: source-backed facts, related objects, notes. */
export function InfoPanel() {
  const selectedId = useAppStore((state) => state.selectedId);
  const scienceMode = useAppStore((state) => state.scienceMode);
  const focusObject = useAppStore((state) => state.focusObject);
  const closePanel = useAppStore((state) => state.closePanel);
  const toggleCompare = useAppStore((state) => state.toggleCompare);
  const compareIds = useAppStore((state) => state.compareIds);
  const journal = useAppStore((state) => state.journal);
  const toggleBookmark = useAppStore((state) => state.toggleBookmark);
  const setNote = useAppStore((state) => state.setNote);

  const object = getObject(selectedId);
  const entry = journal.find((item) => item.objectId === selectedId);
  const [noteDraft, setNoteDraft] = useState(entry?.note ?? '');

  useEffect(() => {
    setNoteDraft(journal.find((item) => item.objectId === selectedId)?.note ?? '');
  }, [selectedId, journal]);

  if (!object) {
    return (
      <div className="panel" role="region" aria-label="Object information">
        <div className="panel__header">
          <h2 className="panel__title">Object info</h2>
          <button type="button" className="icon-button" onClick={closePanel} aria-label="Close panel">
            ✕
          </button>
        </div>
        <div className="panel__body">
          <p className="info__description">
            Nothing selected. Click any body in the scene, search with <kbd>/</kbd>, or pick a tour
            to start exploring.
          </p>
        </div>
      </div>
    );
  }

  const related = relatedObjects(object.id);
  const compared = compareIds.includes(object.id);

  return (
    <div className="panel" role="region" aria-label={`Information about ${object.name}`}>
      <div className="panel__header">
        <h2 className="panel__title">{object.name}</h2>
        <button type="button" className="icon-button" onClick={closePanel} aria-label="Close panel">
          ✕
        </button>
      </div>
      <div className="panel__body">
        <div className="info__meta">
          <span className="chip">{categoryLabel(object.category)}</span>
          <span className="chip">{object.typeLabel}</span>
          <span className={`chip ${object.provenance === 'real-data' ? 'chip--good' : 'chip--warn'}`}>
            {object.provenance === 'real-data' ? 'real data' : 'illustration'}
          </span>
        </div>

        <p className="info__description">{object.description}</p>

        <div className="info__section">
          <h3>Facts</h3>
          <table className="fact-table">
            <tbody>
              {object.facts.map((fact) => (
                <tr key={fact.label}>
                  <th scope="row">
                    {fact.label}
                    {scienceMode && <PrecisionBadge precision={fact.precision} />}
                  </th>
                  <td>
                    {fact.value}
                    {scienceMode && (
                      <span className="source-list__meta" style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        {SOURCES[fact.source]?.name}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {object.interesting.length > 0 && (
          <div className="info__section">
            <h3>Worth knowing</h3>
            <ul className="interesting-list">
              {object.interesting.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="info__section">
          <h3>Sources</h3>
          <ul className="source-list">
            {object.sources.map((sourceId) => {
              const source = SOURCES[sourceId];
              if (!source) return null;
              return (
                <li key={source.id}>
                  <a href={source.url} target="_blank" rel="noreferrer">
                    {source.name}
                  </a>
                  <span className="source-note">{source.note}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {related.length > 0 && (
          <div className="info__section">
            <h3>Related objects</h3>
            <div className="related-chips">
              {related.map((item) => (
                <button key={item.id} type="button" onClick={() => focusObject(item.id)}>
                  {item.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="info__section">
          <h3>Journal note</h3>
          <textarea
            className="note-input"
            value={noteDraft}
            placeholder="Why is this object interesting to you?"
            aria-label={`Personal note about ${object.name}`}
            onChange={(event) => setNoteDraft(event.target.value)}
            onBlur={() => setNote(object.id, noteDraft)}
          />
        </div>
      </div>
      <div className="panel__footer">
        <button type="button" onClick={() => focusObject(object.id)}>
          Focus camera
        </button>
        <button
          type="button"
          onClick={() => toggleCompare(object.id)}
          aria-pressed={compared}
          disabled={!['planet', 'star', 'moon'].includes(object.category)}
        >
          {compared ? 'In comparison' : 'Compare'}
        </button>
        <button type="button" onClick={() => toggleBookmark(object.id)} aria-pressed={entry?.bookmarked}>
          {entry?.bookmarked ? 'Bookmarked' : 'Bookmark'}
        </button>
      </div>
    </div>
  );
}
