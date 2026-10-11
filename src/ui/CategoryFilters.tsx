import { CATEGORIES, categoryLabel } from '../data/celestialObjects';
import type { ObjectCategory } from '../types';
import { useAppStore } from '../store/useAppStore';

/** Quick visibility filters for object categories (planet, moon, belt…). */
export function CategoryFilters() {
  const active = useAppStore((state) => state.categoryFilter);
  const toggle = useAppStore((state) => state.toggleCategoryFilter);

  return (
    <div className="category-filters" role="group" aria-label="Category filters">
      {CATEGORIES.map((category: ObjectCategory) => {
        const isActive = active.includes(category);
        return (
          <button
            key={category}
            type="button"
            className={isActive ? 'is-active' : undefined}
            aria-pressed={isActive}
            onClick={() => toggle(category)}
          >
            {categoryLabel(category)}
          </button>
        );
      })}
    </div>
  );
}
