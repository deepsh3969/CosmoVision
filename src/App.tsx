import { useEffect } from 'react';

import { getObject } from './data/celestialObjects';
import { SceneRoot } from './scene/SceneRoot';
import { useAppStore } from './store/useAppStore';
import { Breadcrumbs } from './ui/Breadcrumbs';
import { CategoryFilters } from './ui/CategoryFilters';
import { ComparisonPanel } from './ui/ComparisonPanel';
import { GalaxyExplorer } from './ui/GalaxyExplorer';
import { HelpDialog } from './ui/HelpDialog';
import { InfoPanel } from './ui/InfoPanel';
import { JournalPanel } from './ui/JournalPanel';
import { LoadingScreen } from './ui/LoadingScreen';
import { NavControls } from './ui/NavControls';
import { PerformancePanel } from './ui/PerformancePanel';
import { SearchBar } from './ui/SearchBar';
import { SettingsPanel } from './ui/SettingsPanel';
import { SimControls } from './ui/SimControls';
import { TopBar } from './ui/TopBar';
import { TourPanel } from './ui/TourPanel';
import { useKeyboardShortcuts } from './ui/useKeyboardShortcuts';

const PANELS = {
  info: InfoPanel,
  galaxy: GalaxyExplorer,
  compare: ComparisonPanel,
  journal: JournalPanel,
  tour: TourPanel,
  performance: PerformancePanel,
  settings: SettingsPanel,
} as const;

function ActivePanel() {
  const activePanel = useAppStore((state) => state.activePanel);
  if (!activePanel) return null;
  const Panel = PANELS[activePanel as keyof typeof PANELS];
  return Panel ? <Panel /> : null;
}

export default function App() {
  useKeyboardShortcuts();

  const bootReady = useAppStore((state) => state.bootReady);
  const searchOpen = useAppStore((state) => state.searchOpen);
  const helpOpen = useAppStore((state) => state.helpOpen);
  const reducedMotion = useAppStore((state) => state.reducedMotion);
  const selectedId = useAppStore((state) => state.selectedId);

  useEffect(() => {
    document.body.classList.toggle('reduce-motion', reducedMotion);
  }, [reducedMotion]);

  const selected = getObject(selectedId);
  const announcement = selected
    ? `${selected.name} selected. ${selected.typeLabel}. ${selected.category}.`
    : '';

  return (
    <div className="app">
      <SceneRoot />
      <TopBar />
      <CategoryFilters />
      <ActivePanel />
      {searchOpen && <SearchBar />}
      {helpOpen && <HelpDialog />}

      <footer className="bottombar">
        <div className="bottombar__group">
          <Breadcrumbs />
        </div>
        <div className="bottombar__group">
          <SimControls />
        </div>
        <div className="bottombar__group">
          <NavControls />
        </div>
      </footer>

      <div className="visually-hidden" role="status" aria-live="polite">
        {announcement}
      </div>

      {!bootReady && <LoadingScreen />}
    </div>
  );
}
