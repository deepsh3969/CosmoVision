import { TOURS } from '../data/tours';
import { useAppStore } from '../store/useAppStore';

/**
 * Discovery Mode: pick a guided tour or drive the active one step by step.
 * Each step focuses through the normal navigation pipeline, so Back/Home keep working.
 */
export function TourPanel() {
  const activeTourId = useAppStore((state) => state.activeTourId);
  const tourStep = useAppStore((state) => state.tourStep);
  const startTour = useAppStore((state) => state.startTour);
  const exitTour = useAppStore((state) => state.exitTour);
  const nextTourStep = useAppStore((state) => state.nextTourStep);
  const prevTourStep = useAppStore((state) => state.prevTourStep);
  const closePanel = useAppStore((state) => state.closePanel);

  const activeTour = TOURS.find((tour) => tour.id === activeTourId);

  return (
    <div className="panel" role="region" aria-label="Discovery tours">
      <div className="panel__header">
        <h2 className="panel__title">Discovery tours</h2>
        <button type="button" className="icon-button" onClick={closePanel} aria-label="Close panel">
          ✕
        </button>
      </div>
      <div className="panel__body">
        {activeTour ? (
          <>
            <div className="tour-active__step">
              <h3>
                {activeTour.name} — step {tourStep + 1} of {activeTour.steps.length}
              </h3>
              <p className="tour-active__blurb">{activeTour.steps[tourStep].blurb}</p>
            </div>
            <div className="tour-progress" aria-hidden="true">
              {activeTour.steps.map((step, index) => (
                <span key={step.objectId + index} className={index <= tourStep ? 'is-done' : undefined} />
              ))}
            </div>
            <div className="preset-row">
              <button type="button" onClick={prevTourStep} disabled={tourStep === 0}>
                ← Previous
              </button>
              <button
                type="button"
                onClick={nextTourStep}
                disabled={tourStep === activeTour.steps.length - 1}
              >
                Next →
              </button>
              <button type="button" onClick={exitTour}>
                Exit tour
              </button>
            </div>
          </>
        ) : (
          TOURS.map((tour) => (
            <div className="tour-card" key={tour.id}>
              <h3>{tour.name}</h3>
              <p>{tour.subtitle}</p>
              <button type="button" onClick={() => startTour(tour.id)}>
                Start tour ({tour.steps.length} stops)
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
