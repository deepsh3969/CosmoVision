import { PLANETS, BREADCRUMB_LABELS } from './data/celestialObjects.js';
import { systemLabelFor, planetIndexOf, objectLabel, nearbyFor } from './navigation.js';

const HINT_DELAY_MS = 9000;
const PLANET_GLYPHS = {
  mercury: '☿',
  venus: '♀',
  earth: '🌍',
  mars: '♂',
  jupiter: '♃',
  saturn: '♄',
  uranus: '♅',
  neptune: '♆',
};

// Owns every primary navigation surface: bottom dock, location/target readout,
// travel status, planet browser, nearby-objects strip and the fading hints.
export class NavigationUI {
  constructor(handlers = {}) {
    this.handlers = handlers;
    this.dom = {
      dock: document.getElementById('navDock'),
      back: document.getElementById('navBack'),
      home: document.getElementById('navHome'),
      galaxy: document.getElementById('navGalaxy'),
      system: document.getElementById('navSystem'),
      planets: document.getElementById('navPlanets'),
      focus: document.getElementById('navFocus'),
      search: document.getElementById('navSearch'),
      mode: document.getElementById('navMode'),
      stack: document.getElementById('navStack'),
      travel: document.getElementById('navTravel'),
      hint: document.getElementById('navHint'),
      hintHelp: document.getElementById('navHintHelp'),
      location: document.getElementById('navLocation'),
      target: document.getElementById('navTarget'),
      planetBar: document.getElementById('navPlanetBar'),
      planetList: document.getElementById('navPlanetList'),
      prevPlanet: document.getElementById('navPrevPlanet'),
      nextPlanet: document.getElementById('navNextPlanet'),
      nearby: document.getElementById('navNearby'),
      nearbyList: document.getElementById('navNearbyList'),
    };
    this.planetsVisible = false;
    this._hintTimer = 0;
    this._hintFadeTimer = 0;
    this._travelTimer = 0;
    this._contextId = null;

    this._buildPlanetList();
    this._bind();
  }

  _bind() {
    const h = this.handlers;
    this.dom.back?.addEventListener('click', () => h.onBack?.());
    this.dom.home?.addEventListener('click', () => h.onHome?.());
    this.dom.galaxy?.addEventListener('click', () => h.onGalaxy?.());
    this.dom.system?.addEventListener('click', () => h.onSystem?.());
    this.dom.planets?.addEventListener('click', () => h.onPlanets?.());
    this.dom.focus?.addEventListener('click', () => h.onFocus?.());
    this.dom.search?.addEventListener('click', () => h.onSearch?.());
    this.dom.hintHelp?.addEventListener('click', () => h.onHelp?.());

    this.dom.mode?.querySelectorAll('[data-nav-mode]').forEach((button) => {
      button.addEventListener('click', () => h.onMode?.(button.dataset.navMode));
    });

    this.dom.prevPlanet?.addEventListener('click', () => this._stepPlanet(-1));
    this.dom.nextPlanet?.addEventListener('click', () => this._stepPlanet(1));

    this.dom.planetList?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-planet]');
      if (button) h.onPlanet?.(button.dataset.planet);
    });

    this.dom.nearbyList?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-nearby]');
      if (button) h.onNearby?.(button.dataset.nearby);
    });
  }

  _buildPlanetList() {
    const list = this.dom.planetList;
    if (!list) return;
    list.innerHTML = '';
    for (const planet of PLANETS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'nav-planet';
      button.dataset.planet = planet.id;
      button.textContent = PLANET_GLYPHS[planet.id] || planet.name.charAt(0);
      button.title = planet.name;
      button.setAttribute('aria-label', `Focus ${planet.name}`);
      list.appendChild(button);
    }
  }

  _stepPlanet(delta) {
    const current = planetIndexOf(this._contextId);
    const next = PLANETS[(current + delta + PLANETS.length) % PLANETS.length];
    this.handlers.onPlanet?.(next.id);
  }

  // ------------------------------------------------------------------
  // Context: back availability, location readout, planet + nearby strips
  // ------------------------------------------------------------------
  setContext(id, canGoBack) {
    this._contextId = id;
    if (this.dom.back) {
      this.dom.back.disabled = !canGoBack;
      this.dom.back.setAttribute('aria-disabled', String(!canGoBack));
    }

    if (this.dom.location) this.dom.location.textContent = systemLabelFor(id);

    this.planetsVisible = Boolean(id) && systemLabelFor(id) === 'SOLARIS SYSTEM';
    this.dom.planetBar?.classList.toggle('hidden', !this.planetsVisible);
    this.dom.planetList?.querySelectorAll('[data-planet]').forEach((button) => {
      button.classList.toggle('active', button.dataset.planet === id);
      button.setAttribute('aria-pressed', String(button.dataset.planet === id));
    });

    this._setNearby(id);
  }

  _setNearby(id) {
    const container = this.dom.nearby;
    const list = this.dom.nearbyList;
    if (!container || !list) return;
    const entries = nearbyFor(id);
    if (!entries.length) {
      container.classList.add('hidden');
      return;
    }
    list.innerHTML = '';
    for (const entry of entries) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'nav-chip';
      button.dataset.nearby = entry.id;
      button.textContent = objectLabel(entry.id);
      button.title = `Go to ${entry.name}`;
      list.appendChild(button);
    }
    container.classList.remove('hidden');
  }

  setTarget(name) {
    if (this.dom.target) this.dom.target.textContent = name || 'NONE';
  }

  // ------------------------------------------------------------------
  // Travel status ("TRAVELING TO EARTH…")
  // ------------------------------------------------------------------
  showTravel(name) {
    const el = this.dom.travel;
    if (!el) return;
    clearTimeout(this._travelTimer);
    el.textContent = `TRAVELING TO ${(name || '').toUpperCase()}…`;
    el.classList.remove('hidden');
    requestAnimationFrame(() => el.classList.add('visible'));
  }

  hideTravel() {
    const el = this.dom.travel;
    if (!el) return;
    clearTimeout(this._travelTimer);
    el.classList.remove('visible');
    this._travelTimer = setTimeout(() => el.classList.add('hidden'), 320);
  }

  // ------------------------------------------------------------------
  // First-time / returning control hints
  // ------------------------------------------------------------------
  showHint() {
    const el = this.dom.hint;
    if (!el) return;
    clearTimeout(this._hintTimer);
    clearTimeout(this._hintFadeTimer);
    el.classList.remove('hidden', 'fading');
    this._hintTimer = setTimeout(() => {
      el.classList.add('fading');
      this._hintFadeTimer = setTimeout(() => el.classList.add('hidden'), 650);
    }, HINT_DELAY_MS);
  }

  hideHint() {
    clearTimeout(this._hintTimer);
    clearTimeout(this._hintFadeTimer);
    this.dom.hint?.classList.add('hidden');
  }

  // ------------------------------------------------------------------
  // Easy mode vs space flight
  // ------------------------------------------------------------------
  syncMode(rigMode) {
    const active = rigMode === 'flight' ? 'flight' : 'easy';
    this.dom.mode?.querySelectorAll('[data-nav-mode]').forEach((button) => {
      const on = button.dataset.navMode === active;
      button.classList.toggle('active', on);
      button.setAttribute('aria-pressed', String(on));
    });
  }

  isHintVisible() {
    const el = this.dom.hint;
    return Boolean(el) && !el.classList.contains('hidden');
  }
}
