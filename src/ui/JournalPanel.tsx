import { getObject } from '../data/celestialObjects';
import { useAppStore } from '../store/useAppStore';

/** Visit history with bookmarks and personal notes — persisted to localStorage. */
export function JournalPanel() {
  const journal = useAppStore((state) => state.journal);
  const focusObject = useAppStore((state) => state.focusObject);
  const toggleBookmark = useAppStore((state) => state.toggleBookmark);
  const removeJournalEntry = useAppStore((state) => state.removeJournalEntry);
  const clearJournal = useAppStore((state) => state.clearJournal);
  const closePanel = useAppStore((state) => state.closePanel);

  return (
    <div className="panel" role="region" aria-label="Journal">
      <div className="panel__header">
        <h2 className="panel__title">Journal</h2>
        <button type="button" className="icon-button" onClick={closePanel} aria-label="Close panel">
          ✕
        </button>
      </div>
      <div className="panel__body">
        {journal.length === 0 ? (
          <p className="info__description">
            Objects you visit appear here, newest first. Add bookmarks and notes from the info
            panel — everything stays in this browser.
          </p>
        ) : (
          <ul className="journal-list">
            {journal.map((entry) => {
              const object = getObject(entry.objectId);
              if (!object) return null;
              return (
                <li key={entry.objectId}>
                  <div>
                    <button
                      type="button"
                      style={{ padding: '2px 6px', background: 'transparent', borderColor: 'transparent' }}
                      onClick={() => focusObject(entry.objectId)}
                    >
                      {object.name}
                    </button>
                    <div className="journal-list__meta">
                      {new Date(entry.visitedAt).toLocaleString()}
                      {entry.note ? ` — ${entry.note}` : ''}
                      {entry.bookmarked ? ' ★' : ''}
                    </div>
                  </div>
                  <div className="journal-list__actions">
                    <button
                      type="button"
                      className="icon-button"
                      aria-pressed={entry.bookmarked}
                      aria-label={`Bookmark ${object.name}`}
                      onClick={() => toggleBookmark(entry.objectId)}
                    >
                      {entry.bookmarked ? '★' : '☆'}
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Remove ${object.name} from journal`}
                      onClick={() => removeJournalEntry(entry.objectId)}
                    >
                      ✕
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {journal.length > 0 && (
        <div className="panel__footer">
          <button type="button" onClick={clearJournal}>
            Clear journal
          </button>
        </div>
      )}
    </div>
  );
}
