/** Navigation location: an object id, or `null` for the galaxy overview (Home). */
export type Location = string | null;

export interface HistoryState {
  past: Location[];
  present: Location;
}

const MAX_DEPTH = 50;

export const HOME: Location = null;

export function initialHistory(): HistoryState {
  return { past: [], present: null };
}

/** Record a new location. Re-visiting the current location is a no-op. */
export function historyVisit(state: HistoryState, next: Location): HistoryState {
  if (state.present === next) return state;
  const past = [...state.past, state.present];
  if (past.length > MAX_DEPTH) past.shift();
  return { past, present: next };
}

/** Step back one location. Returns the same state when there is nothing to go back to. */
export function historyBack(state: HistoryState): HistoryState {
  if (state.past.length === 0) return state;
  const past = state.past.slice(0, -1);
  const present = state.past[state.past.length - 1] ?? null;
  return { past, present };
}

export function canGoBack(state: HistoryState): boolean {
  return state.past.length > 0;
}

export function historyDepth(state: HistoryState): number {
  return state.past.length;
}

/**
 * Thin object-oriented wrapper used by non-React code paths (keyboard shortcuts, tests).
 * The store keeps an equivalent plain state object.
 */
export class NavigationHistory {
  private state: HistoryState;

  constructor(initial: HistoryState = initialHistory()) {
    this.state = initial;
  }

  get present(): Location {
    return this.state.present;
  }

  get canBack(): boolean {
    return canGoBack(this.state);
  }

  snapshot(): HistoryState {
    return { past: [...this.state.past], present: this.state.present };
  }

  visit(location: Location): Location {
    this.state = historyVisit(this.state, location);
    return this.state.present;
  }

  back(): Location {
    this.state = historyBack(this.state);
    return this.state.present;
  }

  home(): Location {
    this.state = historyVisit(this.state, null);
    return this.state.present;
  }

  reset(): void {
    this.state = initialHistory();
  }
}
