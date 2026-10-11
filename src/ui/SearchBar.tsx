import { useEffect, useMemo, useRef, useState } from 'react';

import { categoryLabel } from '../data/celestialObjects';
import { searchObjects } from '../lib/search';
import { useAppStore } from '../store/useAppStore';

/**
 * Full-screen search overlay. Keyboard-first: arrow keys move, Enter focuses,
 * Escape closes. `/` and Ctrl/Cmd+K open it from anywhere.
 */
export function SearchBar() {
  const query = useAppStore((state) => state.searchQuery);
  const setQuery = useAppStore((state) => state.setSearchQuery);
  const setSearchOpen = useAppStore((state) => state.setSearchOpen);
  const focusObject = useAppStore((state) => state.focusObject);
  const categoryFilter = useAppStore((state) => state.categoryFilter);
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const results = useMemo(
    () => searchObjects(query, { categories: categoryFilter, limit: 12 }),
    [query, categoryFilter],
  );

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const commit = (id: string) => {
    focusObject(id);
    setSearchOpen(false);
    setQuery('');
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      const target = results[activeIndex];
      if (target) commit(target.id);
    } else if (event.key === 'Escape') {
      setSearchOpen(false);
    }
  };

  return (
    <div
      className="search-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Search celestial objects"
      onClick={(event) => {
        if (event.target === event.currentTarget) setSearchOpen(false);
      }}
    >
      <div className="search-box">
        <input
          ref={inputRef}
          type="search"
          value={query}
          placeholder="Search planets, moons, belts, types…"
          aria-label="Search query"
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={onKeyDown}
        />
        {results.length > 0 ? (
          <ul className="search-results" role="listbox" aria-label="Search results">
            {results.map((object, index) => (
              <li key={object.id} role="option" aria-selected={index === activeIndex}>
                <button
                  type="button"
                  className={index === activeIndex ? 'is-active' : undefined}
                  onClick={() => commit(object.id)}
                >
                  <span>{object.name}</span>
                  <span className="search-results__type">{categoryLabel(object.category)}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="search-empty">No objects match “{query}”. Try “mars”, “gas giant” or “belt”.</p>
        )}
        <div className="search-box__footer">
          <span>
            <kbd>↑</kbd> <kbd>↓</kbd> navigate
          </span>
          <span>
            <kbd>Enter</kbd> focus
          </span>
          <span>
            <kbd>Esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
