import { describe, expect, it } from 'vitest';

import {
  NavigationHistory,
  canGoBack,
  historyBack,
  historyDepth,
  historyVisit,
  initialHistory,
} from '../../src/navigation/history';

describe('history navigation', () => {
  it('starts at home with nothing to go back to', () => {
    const state = initialHistory();
    expect(state.present).toBeNull();
    expect(canGoBack(state)).toBe(false);
  });

  it('records visits and steps back', () => {
    let state = initialHistory();
    state = historyVisit(state, 'earth');
    state = historyVisit(state, 'luna');
    expect(state.present).toBe('luna');
    expect(historyDepth(state)).toBe(2);

    state = historyBack(state);
    expect(state.present).toBe('earth');
    state = historyBack(state);
    expect(state.present).toBeNull();
    expect(canGoBack(state)).toBe(false);
  });

  it('treats re-visiting the current location as a no-op', () => {
    let state = historyVisit(initialHistory(), 'mars');
    state = historyVisit(state, 'mars');
    expect(historyDepth(state)).toBe(1);
  });
});

describe('NavigationHistory wrapper', () => {
  it('supports visit / back / home / reset', () => {
    const history = new NavigationHistory();
    history.visit('venus');
    history.visit('earth');
    expect(history.present).toBe('earth');
    expect(history.back()).toBe('venus');
    expect(history.home()).toBeNull();
    expect(history.canBack).toBe(true);
    history.reset();
    expect(history.present).toBeNull();
    expect(history.canBack).toBe(false);
  });
});
