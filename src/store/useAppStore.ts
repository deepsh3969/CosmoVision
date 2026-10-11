import { create } from 'zustand';

import {
  CELESTIAL_OBJECTS,
  breadcrumbPath,
  getObject,
} from '../data/celestialObjects';
import {
  DEFAULT_GALAXY,
  GALAXY_PRESETS,
  getTheme,
} from '../data/galaxyPresets';
import { TOURS } from '../data/tours';
import { loadJson, saveJson } from '../lib/storage';
import {
  canGoBack,
  historyBack,
  historyVisit,
  initialHistory,
  type HistoryState,
  type Location,
} from '../navigation/history';
import { SimulationClock } from '../simulation/clock';
import type {
  GalaxyParams,
  JournalEntry,
  ObjectCategory,
  PanelId,
  PerfSnapshot,
  QualityTier,
  WebGLStatus,
} from '../types';

export const COMPARE_LIMIT = 4;
export const RECENTS_LIMIT = 8;

const SETTINGS_KEY = 'cosmovision.settings.v3';
const JOURNAL_KEY = 'cosmovision.journal.v3';
const GALAXY_KEY = 'cosmovision.galaxy.v3';
const RECENTS_KEY = 'cosmovision.recents.v3';

export const simulationClock = new SimulationClock();

interface PersistedSettings {
  quality: QualityTier;
  labels: boolean;
  scienceMode: boolean;
  reducedMotion: boolean;
  trails: boolean;
}

interface PersistedGalaxy {
  galaxy: GalaxyParams;
  themeId: string;
}

const defaultSettings: PersistedSettings = {
  quality: 'high',
  labels: true,
  scienceMode: false,
  reducedMotion: false,
  trails: true,
};

function readSettings(): PersistedSettings {
  const stored = loadJson<Partial<PersistedSettings>>(SETTINGS_KEY, {});
  return { ...defaultSettings, ...stored };
}

function readGalaxy(): PersistedGalaxy {
  const stored = loadJson<Partial<PersistedGalaxy>>(GALAXY_KEY, {});
  const galaxy = { ...DEFAULT_GALAXY, ...(stored.galaxy ?? {}) };
  const themeId = stored.themeId ?? 'default';
  return { galaxy, themeId: getTheme(themeId).id };
}

export interface AppState {
  bootStage: number;
  bootReady: boolean;
  webgl: WebGLStatus;
  error: string | null;

  activePanel: PanelId | null;
  helpOpen: boolean;
  searchOpen: boolean;
  searchQuery: string;
  settingsOpen: boolean;

  labels: boolean;
  scienceMode: boolean;
  reducedMotion: boolean;
  trails: boolean;
  quality: QualityTier;

  selectedId: string | null;
  hoveredId: string | null;
  focusedId: string | null;
  history: HistoryState;

  playing: boolean;
  simSpeed: number;
  simDays: number;

  galaxy: GalaxyParams;
  themeId: string;

  recents: string[];
  journal: JournalEntry[];

  activeTourId: string | null;
  tourStep: number;

  compareIds: string[];
  categoryFilter: ObjectCategory[];

  perf: PerfSnapshot | null;

  setBootStage: (stage: number) => void;
  finishBoot: () => void;
  setWebgl: (status: WebGLStatus) => void;
  setError: (message: string | null) => void;

  openPanel: (panel: PanelId) => void;
  closePanel: () => void;
  togglePanel: (panel: PanelId) => void;
  setHelp: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;

  setLabels: (value: boolean) => void;
  setScienceMode: (value: boolean) => void;
  setReducedMotion: (value: boolean) => void;
  setTrails: (value: boolean) => void;
  setQuality: (tier: QualityTier) => void;

  select: (id: string | null) => void;
  setHover: (id: string | null) => void;
  focusObject: (id: string) => void;
  focusLocation: (location: Location) => void;
  exitFocus: () => void;
  goBack: () => void;
  goHome: () => void;

  togglePlay: () => void;
  setPlaying: (value: boolean) => void;
  setSimSpeed: (speed: number) => void;
  resetSimulation: () => void;
  publishSimDays: (days: number) => void;

  setGalaxyParam: (key: keyof GalaxyParams, value: number) => void;
  applyGalaxyPreset: (id: string) => void;
  setTheme: (id: string) => void;

  toggleBookmark: (id: string) => void;
  setNote: (id: string, note: string) => void;
  removeJournalEntry: (id: string) => void;
  clearJournal: () => void;
  markVisited: (id: string) => void;

  startTour: (id: string) => void;
  exitTour: () => void;
  nextTourStep: () => void;
  prevTourStep: () => void;

  toggleCompare: (id: string) => void;
  clearCompare: () => void;
  toggleCategoryFilter: (category: ObjectCategory) => void;
  clearCategoryFilter: () => void;

  setPerf: (snapshot: PerfSnapshot) => void;
}

function applyLocation(location: Location): Pick<AppState, 'focusedId' | 'selectedId' | 'activePanel'> {
  return {
    focusedId: location,
    selectedId: location,
    activePanel: location ? 'info' : null,
  };
}

const initialSettings = readSettings();
const initialGalaxy = readGalaxy();

export const useAppStore = create<AppState>()((set, get) => ({
  bootStage: 0,
  bootReady: false,
  webgl: 'pending',
  error: null,

  activePanel: null,
  helpOpen: false,
  searchOpen: false,
  searchQuery: '',
  settingsOpen: false,

  labels: initialSettings.labels,
  scienceMode: initialSettings.scienceMode,
  reducedMotion: initialSettings.reducedMotion,
  trails: initialSettings.trails,
  quality: initialSettings.quality,

  selectedId: null,
  hoveredId: null,
  focusedId: null,
  history: initialHistory(),

  playing: simulationClock.playing,
  simSpeed: simulationClock.speed,
  simDays: 0,

  galaxy: initialGalaxy.galaxy,
  themeId: initialGalaxy.themeId,

  recents: loadJson<string[]>(RECENTS_KEY, []),
  journal: loadJson<JournalEntry[]>(JOURNAL_KEY, []),

  activeTourId: null,
  tourStep: 0,

  compareIds: [],
  categoryFilter: [],

  perf: null,

  setBootStage: (stage) => set({ bootStage: stage }),
  finishBoot: () => set({ bootReady: true, bootStage: 4 }),
  setWebgl: (status) => set({ webgl: status }),
  setError: (message) => set({ error: message }),

  openPanel: (panel) => set({ activePanel: panel }),
  closePanel: () => set({ activePanel: null }),
  togglePanel: (panel) => set((state) => ({ activePanel: state.activePanel === panel ? null : panel })),
  setHelp: (open) => set({ helpOpen: open }),
  setSearchOpen: (open) =>
    set((state) => ({
      searchOpen: open,
      activePanel: open ? 'search' : state.activePanel === 'search' ? null : state.activePanel,
    })),
  setSearchQuery: (query) => set({ searchQuery: query }),

  setLabels: (value) => set({ labels: value }),
  setScienceMode: (value) => set({ scienceMode: value }),
  setReducedMotion: (value) => set({ reducedMotion: value }),
  setTrails: (value) => set({ trails: value }),
  setQuality: (tier) => set({ quality: tier }),

  select: (id) => {
    if (!id) {
      set({ selectedId: null });
      return;
    }
    const recents = [id, ...get().recents.filter((entry) => entry !== id)].slice(0, RECENTS_LIMIT);
    set({ selectedId: id, activePanel: 'info', recents });
    get().markVisited(id);
  },

  setHover: (id) => {
    if (get().hoveredId !== id) set({ hoveredId: id });
  },

  focusObject: (id) => {
    const state = get();
    const history = historyVisit(state.history, id);
    const recents = [id, ...state.recents.filter((entry) => entry !== id)].slice(0, RECENTS_LIMIT);
    set({
      selectedId: id,
      focusedId: id,
      activePanel: 'info',
      history,
      recents,
    });
    state.markVisited(id);
  },

  focusLocation: (location) => {
    const state = get();
    const history = historyVisit(state.history, location);
    set({ ...applyLocation(location), history });
  },

  exitFocus: () => {
    const state = get();
    const history = historyVisit(state.history, null);
    set({ focusedId: null, history, selectedId: state.selectedId });
  },

  goBack: () => {
    const state = get();
    if (!canGoBack(state.history)) return;
    const history = historyBack(state.history);
    set({ ...applyLocation(history.present), history, searchOpen: false });
  },

  goHome: () => {
    const state = get();
    const history = historyVisit(state.history, null);
    set({
      ...applyLocation(null),
      history,
      activeTourId: null,
      searchOpen: false,
      selectedId: null,
    });
  },

  togglePlay: () => {
    const playing = simulationClock.toggle();
    set({ playing });
  },
  setPlaying: (value) => {
    if (value) simulationClock.play();
    else simulationClock.pause();
    set({ playing: value });
  },
  setSimSpeed: (speed) => {
    const next = simulationClock.setSpeed(speed);
    set({ simSpeed: next, playing: simulationClock.playing });
  },
  resetSimulation: () => {
    simulationClock.reset();
    set({ simDays: 0 });
  },
  publishSimDays: (days) => set({ simDays: days }),

  setGalaxyParam: (key, value) =>
    set((state) => ({ galaxy: { ...state.galaxy, [key]: value } })),
  applyGalaxyPreset: (id) => {
    const preset = GALAXY_PRESETS.find((entry) => entry.id === id);
    if (!preset) return;
    set((state) => ({
      galaxy: { ...state.galaxy, ...preset.galaxy },
      themeId: preset.themeId,
    }));
  },
  setTheme: (id) => set({ themeId: getTheme(id).id }),

  markVisited: (id) => {
    const journal = get().journal;
    const existing = journal.find((entry) => entry.objectId === id);
    const next: JournalEntry[] = existing
      ? journal.map((entry) => (entry.objectId === id ? { ...entry, visitedAt: Date.now() } : entry))
      : [...journal, { objectId: id, visitedAt: Date.now(), bookmarked: false }];
    next.sort((a, b) => b.visitedAt - a.visitedAt);
    set({ journal: next.slice(0, 120) });
  },

  toggleBookmark: (id) => {
    const journal = get().journal;
    const existing = journal.find((entry) => entry.objectId === id);
    if (existing) {
      set({
        journal: journal.map((entry) =>
          entry.objectId === id ? { ...entry, bookmarked: !entry.bookmarked } : entry,
        ),
      });
      return;
    }
    set({ journal: [{ objectId: id, visitedAt: Date.now(), bookmarked: true }, ...journal] });
  },

  setNote: (id, note) => {
    const journal = get().journal;
    const existing = journal.find((entry) => entry.objectId === id);
    if (existing) {
      set({ journal: journal.map((entry) => (entry.objectId === id ? { ...entry, note } : entry)) });
      return;
    }
    set({ journal: [{ objectId: id, visitedAt: Date.now(), bookmarked: false, note }, ...journal] });
  },

  removeJournalEntry: (id) =>
    set((state) => ({ journal: state.journal.filter((entry) => entry.objectId !== id) })),

  clearJournal: () => set({ journal: [], recents: [] }),

  startTour: (id) => {
    const tour = TOURS.find((entry) => entry.id === id);
    if (!tour) return;
    set({ activeTourId: id, tourStep: 0 });
    get().focusObject(tour.steps[0].objectId);
  },

  exitTour: () => set({ activeTourId: null, tourStep: 0 }),

  nextTourStep: () => {
    const { activeTourId, tourStep } = get();
    const tour = TOURS.find((entry) => entry.id === activeTourId);
    if (!tour) return;
    const next = Math.min(tourStep + 1, tour.steps.length - 1);
    set({ tourStep: next });
    get().focusObject(tour.steps[next].objectId);
  },

  prevTourStep: () => {
    const { activeTourId, tourStep } = get();
    const tour = TOURS.find((entry) => entry.id === activeTourId);
    if (!tour) return;
    const prev = Math.max(tourStep - 1, 0);
    set({ tourStep: prev });
    get().focusObject(tour.steps[prev].objectId);
  },

  toggleCompare: (id) => {
    const object = getObject(id);
    if (!object) return;
    if (!['planet', 'star', 'moon'].includes(object.category)) return;
    const current = get().compareIds;
    if (current.includes(id)) {
      set({ compareIds: current.filter((entry) => entry !== id) });
      return;
    }
    if (current.length >= COMPARE_LIMIT) return;
    set({ compareIds: [...current, id] });
  },

  clearCompare: () => set({ compareIds: [] }),

  toggleCategoryFilter: (category) =>
    set((state) => ({
      categoryFilter: state.categoryFilter.includes(category)
        ? state.categoryFilter.filter((entry) => entry !== category)
        : [...state.categoryFilter, category],
    })),

  clearCategoryFilter: () => set({ categoryFilter: [] }),

  setPerf: (snapshot) => set({ perf: snapshot }),
}));

/** Selector helpers kept next to the store so components share one definition. */
export function selectBreadcrumbs(state: AppState) {
  return breadcrumbPath(state.focusedId ?? 'milky-way');
}

export function selectCanGoBack(state: AppState): boolean {
  return canGoBack(state.history);
}

export function selectObjectCount(): number {
  return CELESTIAL_OBJECTS.length;
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;

function schedulePersist(state: AppState): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveJson(SETTINGS_KEY, {
      quality: state.quality,
      labels: state.labels,
      scienceMode: state.scienceMode,
      reducedMotion: state.reducedMotion,
      trails: state.trails,
    } satisfies PersistedSettings);
    saveJson(JOURNAL_KEY, state.journal);
    saveJson(RECENTS_KEY, state.recents);
    saveJson(GALAXY_KEY, { galaxy: state.galaxy, themeId: state.themeId } satisfies PersistedGalaxy);
  }, 400);
}

useAppStore.subscribe((state) => schedulePersist(state));
