import { OBJECT_BY_ID, NAV_PATHS, BREADCRUMB_LABELS, PLANETS, CELESTIAL_OBJECTS } from './data/celestialObjects.js';

const HISTORY_LIMIT = 60;

// Browser-style history: entries[i] always stores the camera/state snapshot of
// the moment we last left that view, so BACK restores the real pose.
export class HistoryManager {
  constructor() {
    this.entries = [];
    this.index = -1;
  }

  seed(entry) {
    this.entries = [entry];
    this.index = 0;
  }

  get current() {
    return this.entries[this.index] || null;
  }

  get canGoBack() {
    return this.index > 0;
  }

  // Save the outgoing state into the current slot, then push the destination.
  record(currentSnapshot, destinationId) {
    if (this.index < 0) {
      this.entries = [currentSnapshot];
      this.index = 0;
    } else {
      this.entries[this.index] = currentSnapshot;
    }
    if (this.entries[this.index]?.id === destinationId) return false;
    this.entries.length = this.index + 1;
    this.entries.push({ id: destinationId });
    this.index = this.entries.length - 1;
    if (this.entries.length > HISTORY_LIMIT) {
      const removed = this.entries.length - HISTORY_LIMIT;
      this.entries.splice(0, removed);
      this.index -= removed;
    }
    return true;
  }

  back(currentSnapshot) {
    if (this.index <= 0) return null;
    if (currentSnapshot) this.entries[this.index] = currentSnapshot;
    this.index -= 1;
    return this.entries[this.index];
  }
}

// Navigation manager: history, BACK/HOME travel and the "TRAVELING TO …" status.
// Camera work is delegated to injected handlers so the module stays reusable.
export class NavigationManager {
  constructor({ currentId, snapshot, restore, onTravelStart, onTravelEnd } = {}) {
    this.history = new HistoryManager();
    this._currentId = currentId;
    this._snapshot = snapshot;
    this._restore = restore;
    this.onTravelStart = onTravelStart;
    this.onTravelEnd = onTravelEnd;
    this.travelId = null;
    this._travelTimer = 0;
    this._visible = false;
  }

  seed() {
    this.history.seed(this.snapshot());
  }

  clear() {
    this.endTravel();
    this.history.seed(this.snapshot());
  }

  snapshot() {
    return this._snapshot?.() || { id: this.currentId };
  }

  get currentId() {
    return this._currentId?.() || 'milky-way';
  }

  get canGoBack() {
    return this.history.canGoBack;
  }

  record(destinationId) {
    return this.history.record(this.snapshot(), destinationId);
  }

  back() {
    const entry = this.history.back(this.snapshot());
    if (!entry) return false;
    this.endTravel();
    this._restore?.(entry);
    return true;
  }

  beginTravel(id) {
    const def = OBJECT_BY_ID.get(id);
    this.travelId = id;
    this._visible = true;
    clearTimeout(this._travelTimer);
    this._travelTimer = setTimeout(() => this.endTravel(), 6500);
    this.onTravelStart?.(def?.name || id);
  }

  endTravel() {
    clearTimeout(this._travelTimer);
    this._travelTimer = 0;
    if (!this._visible) return;
    this._visible = false;
    this.travelId = null;
    this.onTravelEnd?.();
  }
}

// Static helpers shared by the navigation UI (readout, strips, planet browser).
export function systemLabelFor(id) {
  const path = NAV_PATHS[id];
  if (path && path.includes('solaris')) return 'SOLARIS SYSTEM';
  return 'MILKY WAY';
}

export function planetIndexOf(id) {
  return PLANETS.findIndex((planet) => planet.id === id);
}

export function objectLabel(id) {
  const def = OBJECT_BY_ID.get(id);
  if (!def) return (id || '').toUpperCase();
  return BREADCRUMB_LABELS[def.id] || def.name.toUpperCase();
}

// Children first, then the parent ("up"), then siblings — capped for the strip.
export function nearbyFor(id) {
  const def = OBJECT_BY_ID.get(id);
  if (!def) return [];
  const kids = CELESTIAL_OBJECTS.filter((object) => object.parent === id);
  const parent = def.parent ? OBJECT_BY_ID.get(def.parent) : null;
  const siblings = CELESTIAL_OBJECTS.filter(
    (object) => def.parent && object.parent === def.parent && object.id !== id,
  );
  const seen = new Set([id]);
  const list = [];
  for (const candidate of [...kids, ...(parent ? [parent] : []), ...siblings]) {
    if (seen.has(candidate.id)) continue;
    seen.add(candidate.id);
    list.push(candidate);
    if (list.length >= 6) break;
  }
  return list;
}
