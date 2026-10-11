import { breadcrumbPath } from '../data/celestialObjects';
import { useAppStore } from '../store/useAppStore';

/** Hierarchical path from the Milky Way down to the focused object; each crumb navigates. */
export function Breadcrumbs() {
  const focusedId = useAppStore((state) => state.focusedId);
  const focusLocation = useAppStore((state) => state.focusLocation);
  const crumbs = breadcrumbPath(focusedId ?? 'milky-way');

  return (
    <nav className="breadcrumbs" aria-label="Object path">
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        return (
          <span key={crumb.id} style={{ display: 'contents' }}>
            {index > 0 && (
              <span className="breadcrumbs__sep" aria-hidden="true">
                ›
              </span>
            )}
            {isLast ? (
              <span className="breadcrumbs__current" aria-current="page">
                {crumb.name}
              </span>
            ) : (
              <button type="button" onClick={() => focusLocation(crumb.id)}>
                {crumb.name}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}
