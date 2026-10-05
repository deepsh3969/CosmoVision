import {
  CELESTIAL_OBJECTS,
  NAV_PATHS,
  BREADCRUMB_LABELS,
  SIM_SPEEDS,
} from './data/celestialObjects.js';

const SPEED_LABELS = {
  0: 'PAUSED',
  0.1: '0.1x',
  0.5: '0.5x',
  1: '1x',
  2: '2x',
  10: '10x',
  100: '100x',
  1000: '1000x',
};

export class HUD {
  constructor(handlers = {}) {
    this.handlers = handlers;
    this.dom = {
      velocity: document.getElementById('hudVelocity'),
      altitude: document.getElementById('hudAltitude'),
      target: document.getElementById('hudTarget'),
      distance: document.getElementById('hudDistance'),
      system: document.getElementById('hudSystem'),
      object: document.getElementById('hudObject'),
      status: document.getElementById('hudStatus'),
      fuelFill: document.getElementById('fuelFill'),
      fuelText: document.getElementById('fuelText'),
      breadcrumb: document.getElementById('breadcrumb'),
      simSpeedLabel: document.getElementById('simSpeedLabel'),
      perfLine: document.getElementById('perfLine'),
      infoPanel: document.getElementById('infoPanel'),
      infoName: document.getElementById('infoName'),
      infoType: document.getElementById('infoType'),
      infoRows: document.getElementById('infoRows'),
      infoDesc: document.getElementById('infoDesc'),
      btnFocus: document.getElementById('btnFocus'),
      btnExplore: document.getElementById('btnExplore'),
      btnTarget: document.getElementById('btnTarget'),
      btnCloseInfo: document.getElementById('btnCloseInfo'),
      btnWormholeEnter: document.getElementById('btnWormholeEnter'),
      btnCinematic: document.getElementById('btnCinematic'),
      btnMinimap: document.getElementById('btnToggleMinimap'),
      btnSearch: document.getElementById('btnSearch'),
      searchModal: document.getElementById('searchModal'),
      searchInput: document.getElementById('searchInput'),
      searchResults: document.getElementById('searchResults'),
      btnSearchClose: document.getElementById('btnSearchClose'),
      camModes: document.getElementById('cameraModes'),
      simSpeeds: document.getElementById('simSpeeds'),
    };
    this.selectedDef = null;
    this._bind();
  }

  _bind() {
    const h = this.handlers;
    this.dom.btnFocus?.addEventListener('click', () => this.selectedDef && h.onFocus?.(this.selectedDef.id));
    this.dom.btnExplore?.addEventListener('click', () => this.selectedDef && h.onExplore?.(this.selectedDef.id));
    this.dom.btnTarget?.addEventListener('click', () => this.selectedDef && h.onTarget?.(this.selectedDef.id));
    this.dom.btnCloseInfo?.addEventListener('click', () => h.onClose?.());
    this.dom.btnWormholeEnter?.addEventListener('click', () => this.selectedDef && h.onEnterWormhole?.(this.selectedDef.id));
    this.dom.btnCinematic?.addEventListener('click', () => h.onCinematicToggle?.());
    this.dom.btnMinimap?.addEventListener('click', () => h.onMinimapToggle?.());
    this.dom.btnSearch?.addEventListener('click', () => this.toggleSearch());
    this.dom.btnSearchClose?.addEventListener('click', () => this.toggleSearch(false));

    this.dom.searchModal?.addEventListener('click', (event) => {
      if (event.target === this.dom.searchModal) this.toggleSearch(false);
    });
    this.dom.searchInput?.addEventListener('input', () => this.buildResults(this.dom.searchInput.value));
    this.dom.searchInput?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        const first = this.dom.searchResults?.querySelector('button');
        if (first) first.click();
      }
      if (event.key === 'Escape') this.toggleSearch(false);
    });

    this.dom.camModes?.querySelectorAll('[data-camera-mode]').forEach((button) => {
      button.addEventListener('click', () => h.onCameraMode?.(button.dataset.cameraMode));
    });
    this.dom.simSpeeds?.querySelectorAll('[data-sim-speed]').forEach((button) => {
      button.addEventListener('click', () => h.onSimSpeed?.(Number(button.dataset.simSpeed)));
    });
  }

  setTelemetry({ velocity = '—', altitude = '—', target = '—', distance = '—', system = '—', object = '—', fuel = 100, status = '—' } = {}) {
    if (this.dom.velocity) this.dom.velocity.textContent = velocity;
    if (this.dom.altitude) this.dom.altitude.textContent = altitude;
    if (this.dom.target) this.dom.target.textContent = target;
    if (this.dom.distance) this.dom.distance.textContent = distance;
    if (this.dom.system) this.dom.system.textContent = system;
    if (this.dom.object) this.dom.object.textContent = object;
    if (this.dom.status) this.dom.status.textContent = status;
    const pct = Math.max(0, Math.min(100, fuel));
    if (this.dom.fuelFill) this.dom.fuelFill.style.width = `${pct}%`;
    if (this.dom.fuelText) this.dom.fuelText.textContent = `${pct.toFixed(0)}%`;
    if (this.dom.fuelFill) this.dom.fuelFill.dataset.low = pct < 20 ? 'true' : 'false';
  }

  setBreadcrumb(id) {
    const el = this.dom.breadcrumb;
    if (!el) return;
    const path = ['universe', ...(NAV_PATHS[id] || ['milky-way'])];
    el.innerHTML = '';
    path.forEach((crumbId, index) => {
      if (index > 0) {
        const sep = document.createElement('span');
        sep.className = 'crumb-sep';
        sep.textContent = '›';
        el.appendChild(sep);
      }
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'crumb' + (index === path.length - 1 ? ' current' : '');
      button.dataset.crumb = crumbId;
      button.textContent = crumbId === 'universe' ? 'UNIVERSE' : BREADCRUMB_LABELS[crumbId] || crumbId.toUpperCase();
      button.addEventListener('click', () => this.handlers.onNavigate?.(crumbId));
      el.appendChild(button);
    });
  }

  setSimSpeed(value) {
    if (this.dom.simSpeedLabel) this.dom.simSpeedLabel.textContent = `SIMULATION SPEED: ${SPEED_LABELS[value] ?? `${value}x`}`;
    this.dom.simSpeeds?.querySelectorAll('[data-sim-speed]').forEach((button) => {
      button.classList.toggle('active', Number(button.dataset.simSpeed) === value);
      button.setAttribute('aria-pressed', String(Number(button.dataset.simSpeed) === value));
    });
  }

  setCameraMode(mode, { hasFocus = false } = {}) {
    this.dom.camModes?.querySelectorAll('[data-camera-mode]').forEach((button) => {
      const value = button.dataset.cameraMode;
      const active = value === mode || (mode === 'follow' && value === 'follow');
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
      if (value === 'follow') button.disabled = !hasFocus;
    });
  }

  setCinematic(active) {
    this.dom.btnCinematic?.classList.toggle('active', active);
    this.dom.btnCinematic?.setAttribute('aria-pressed', String(active));
  }

  setMinimap(active) {
    this.dom.btnMinimap?.classList.toggle('active', active);
    this.dom.btnMinimap?.setAttribute('aria-pressed', String(active));
  }

  setInfo(def) {
    this.selectedDef = def;
    if (!this.dom.infoPanel) return;
    if (!def) {
      this.dom.infoPanel.classList.add('collapsed');
      this.dom.infoPanel.setAttribute('aria-hidden', 'true');
      return;
    }
    this.dom.infoPanel.classList.remove('collapsed');
    this.dom.infoPanel.setAttribute('aria-hidden', 'false');
    this.dom.infoName.textContent = def.name;
    this.dom.infoType.textContent = def.type;

    const rows = [];
    const push = (label, value) => {
      if (value === undefined || value === null || value === '' || value === '—') return;
      rows.push(`<div class="info-row"><dt>${label}</dt><dd>${value}</dd></div>`);
    };
    if (def.type === 'Wormhole') {
      push('DESTINATION', def.destinationName);
      push('DISTANCE', def.destinationDistance);
      push('STATUS', def.status);
    } else {
      push('TYPE', def.type);
      if (def.radiusKm) push('RADIUS', `${def.radiusKm.toLocaleString('en-US')} km`);
      push('MASS', def.mass);
      push('DAY', def.day);
      push('YEAR', def.year);
      push('MOONS', typeof def.moons === 'number' ? String(def.moons) : null);
      if (typeof def.distanceAU === 'number' && def.distanceAU > 0) {
        push('DISTANCE', def.distanceAU < 0.1 ? `${(def.distanceAU * 149597870.7 / 1e6).toFixed(2)} million km` : `${def.distanceAU} AU`);
      }
      push('ATMOSPHERE', def.atmosphere);
      push('TEMPERATURE', def.temperature);
      push('STATUS', def.status);
    }
    this.dom.infoRows.innerHTML = rows.join('');
    if (this.dom.infoDesc) this.dom.infoDesc.textContent = def.description || '';
    if (this.dom.btnWormholeEnter) this.dom.btnWormholeEnter.hidden = def.type !== 'Wormhole';
    if (this.dom.btnExplore) {
      this.dom.btnExplore.hidden = def.id === 'milky-way';
      this.dom.btnExplore.textContent = `Explore ${def.name}`;
    }
  }

  setTarget(name) {
    if (this.dom.target) this.dom.target.textContent = name || '—';
    if (this.dom.btnTarget) this.dom.btnTarget.textContent = name ? 'Clear Target' : 'Set Target';
  }

  setPerf({ ms = '—', calls = '—', tris = '—', mem = '—' } = {}) {
    if (this.dom.perfLine) this.dom.perfLine.textContent = `FRAME ${ms} · DRAW ${calls} · TRIS ${tris} · MEM ${mem}`;
  }

  setCameraButtons(mode) {
    this.setCameraMode(mode, { hasFocus: this.selectedDef !== null });
  }

  toggleSearch(force) {
    const modal = this.dom.searchModal;
    if (!modal) return;
    const open = force !== undefined ? force : modal.classList.contains('hidden');
    modal.classList.toggle('hidden', !open);
    if (open) {
      this.dom.searchInput.value = '';
      this.buildResults('');
      setTimeout(() => this.dom.searchInput.focus(), 40);
    }
  }

  buildResults(query) {
    const container = this.dom.searchResults;
    if (!container) return;
    const q = (query || '').trim().toLowerCase();
    const matches = CELESTIAL_OBJECTS.filter((object) => {
      if (!q) return ['milky-way', 'solaris', 'earth', 'mars', 'jupiter', 'saturn', 'wormhole-alpha', 'station-alpha'].includes(object.id);
      return (
        object.name.toLowerCase().includes(q) ||
        object.type.toLowerCase().includes(q) ||
        object.id.includes(q)
      );
    }).slice(0, 8);

    if (!matches.length) {
      container.innerHTML = '<p class="search-empty">No objects match your query.</p>';
      return;
    }
    container.innerHTML = '';
    for (const object of matches) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'search-result';
      const system = NAV_PATHS[object.id]?.includes('solaris') ? 'SOLARIS SYSTEM' : 'MILKY WAY';
      button.innerHTML = `<span class="result-name">${object.name.toUpperCase()}</span><span class="result-meta">${system}</span><span class="result-type">${object.type.toUpperCase()}</span>`;
      button.addEventListener('click', () => {
        this.toggleSearch(false);
        this.handlers.onSearchSelect?.(object.id);
      });
      container.appendChild(button);
    }
  }

  isSearchOpen() {
    return Boolean(this.dom.searchModal) && !this.dom.searchModal.classList.contains('hidden');
  }

  get speedLabels() {
    return SIM_SPEEDS;
  }
}
