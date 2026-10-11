import { useAppStore } from '../store/useAppStore';
import type { PanelId } from '../types';

interface PanelButton {
  id: PanelId;
  label: string;
  title: string;
}

const PANEL_BUTTONS: PanelButton[] = [
  { id: 'info', label: 'Info', title: 'Object information' },
  { id: 'galaxy', label: 'Galaxy', title: 'Galaxy explorer' },
  { id: 'compare', label: 'Compare', title: 'Compare objects' },
  { id: 'journal', label: 'Journal', title: 'Journal and bookmarks' },
  { id: 'tour', label: 'Tours', title: 'Discovery tours' },
  { id: 'performance', label: 'Perf', title: 'Performance' },
  { id: 'settings', label: 'Settings', title: 'Settings' },
];

/** Global header: brand, simulation status chips, search and panel toggles. */
export function TopBar() {
  const activePanel = useAppStore((state) => state.activePanel);
  const togglePanel = useAppStore((state) => state.togglePanel);
  const setSearchOpen = useAppStore((state) => state.setSearchOpen);
  const setHelp = useAppStore((state) => state.setHelp);
  const playing = useAppStore((state) => state.playing);
  const simSpeed = useAppStore((state) => state.simSpeed);
  const webgl = useAppStore((state) => state.webgl);

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand__name">COSMOVISION</span>
        <span className="brand__tag">3D space explorer</span>
      </div>

      <span className={`chip ${playing ? 'chip--good' : ''}`} aria-live="off">
        {playing ? `running ${simSpeed} d/s` : 'paused'}
      </span>
      <span
        className={`chip ${webgl === 'ok' ? 'chip--good' : webgl === 'failed' ? 'chip--danger' : 'chip--warn'}`}
      >
        WebGL {webgl}
      </span>

      <div className="topbar__spacer" />

      <div className="topbar__group">
        <button type="button" onClick={() => setSearchOpen(true)} title="Search (/)">
          Search /
        </button>
        {PANEL_BUTTONS.map((button) => (
          <button
            key={button.id}
            type="button"
            title={button.title}
            className={activePanel === button.id ? 'is-active' : undefined}
            aria-pressed={activePanel === button.id}
            onClick={() => togglePanel(button.id)}
          >
            {button.label}
          </button>
        ))}
        <button type="button" onClick={() => setHelp(true)} title="Help (?)">
          ?
        </button>
      </div>
    </header>
  );
}
