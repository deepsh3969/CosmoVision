import { SCHEMA, KEY_HINTS, GESTURE_HINTS, STORAGE_KEYS } from './config.js';
import { safeStorageGet, safeStorageSet, formatNumber, clamp } from './utils.js';

const STATS_INTERVAL = 250;

export class UIController {
  constructor(handlers = {}) {
    this.handlers = handlers;
    this.dom = {};
    this.sliders = new Map();
    this.toggles = new Map();
    this.lastStatsAt = 0;
    this.toastTimer = 0;

    this._cache();
    this._buildPanels();
    this._bindHeader();
    this._bindTabs();
    this._bindPresets();
    this._bindInteraction();
    this._bindSettings();
    this._buildHelpContent();
    this._restoreState();

    if (window.innerWidth > 900) this.togglePanel(true);
  }

  _cache() {
    const ids = [
      'loader', 'loaderBar', 'loaderPercent', 'loaderStep', 'loaderSteps',
      'welcome', 'btnEnter', 'statusPill', 'statusText',
      'statFps', 'statParticles', 'statHands', 'statGesture',
      'controlPanel', 'panelTabs', 'panelBody', 'btnPanelToggle', 'btnPanelClose',
      'btnHelp', 'btnSettings', 'btnReset',
      'presets',
      'handPreview', 'handVideo', 'handOverlay', 'gestureTag',
      'helpModal', 'settingsModal', 'btnCloseHelp', 'btnCloseSettings',
      'toastHost', 'privacyNote',
      'setQuality', 'setParticles', 'setPost', 'setGesture', 'setAudio', 'setReducedMotion',
      'qualityBadge',
    ];
    for (const id of ids) this.dom[id] = document.getElementById(id);
  }

  _buildPanels() {
    for (const [group, entries] of Object.entries(SCHEMA)) {
      const section = document.createElement('section');
      section.className = 'control-group';
      section.dataset.group = group;

      const title = document.createElement('h3');
      title.textContent = group === 'galaxy' ? 'Galaxy' : 'Visuals';
      section.appendChild(title);

      for (const entry of entries) {
        const row = document.createElement('div');
        row.className = 'control-row';

        const head = document.createElement('div');
        head.className = 'control-head';

        const label = document.createElement('label');
        label.htmlFor = `ctl-${group}-${entry.key}`;
        label.textContent = entry.label;

        const value = document.createElement('span');
        value.className = 'control-value';
        value.id = `val-${group}-${entry.key}`;

        head.append(label, value);

        const input = document.createElement('input');
        input.type = 'range';
        input.id = `ctl-${group}-${entry.key}`;
        input.min = entry.min;
        input.max = entry.max;
        input.step = entry.step;
        input.setAttribute('aria-label', entry.label);

        input.addEventListener('input', () => {
          const numeric = Number(input.value);
          value.textContent = entry.format(numeric);
          this.handlers.onParamChange?.(group, entry.key, numeric, entry.rebuild);
        });

        row.append(head, input);
        section.appendChild(row);
        this.sliders.set(`${group}.${entry.key}`, { input, display: value, entry });
      }
      this.dom.panelBody.appendChild(section);
    }

    const interactionSection = document.createElement('section');
    interactionSection.className = 'control-group';
    interactionSection.dataset.group = 'interaction';
    const title = document.createElement('h3');
    title.textContent = 'Interaction';
    interactionSection.appendChild(title);

    for (const config of [
      { key: 'mouse', label: 'Mouse Control', handler: 'onMouseToggle' },
      { key: 'gesture', label: 'Gesture Control', handler: 'onGestureToggle' },
      { key: 'autoRotate', label: 'Auto Rotate', handler: 'onAutoRotateToggle' },
    ]) {
      interactionSection.appendChild(this._buildSwitch(config.label, config.key, (checked) => {
        this.handlers[config.handler]?.(checked);
      }));
    }
    this.dom.panelBody.appendChild(interactionSection);

    const audioSection = document.createElement('section');
    audioSection.className = 'control-group';
    audioSection.dataset.group = 'audio';
    const audioTitle = document.createElement('h3');
    audioTitle.textContent = 'Audio';
    audioSection.appendChild(audioTitle);

    audioSection.appendChild(this._buildSwitch('Audio', 'audioEnabled', (checked) => {
      this.handlers.onAudioToggle?.(checked);
    }));

    const volumeRow = document.createElement('div');
    volumeRow.className = 'control-row';
    const volumeHead = document.createElement('div');
    volumeHead.className = 'control-head';
    const volumeLabel = document.createElement('label');
    volumeLabel.htmlFor = 'ctl-audio-volume';
    volumeLabel.textContent = 'Volume';
    const volumeValue = document.createElement('span');
    volumeValue.className = 'control-value';
    volumeValue.id = 'val-audio-volume';
    volumeHead.append(volumeLabel, volumeValue);
    const volumeInput = document.createElement('input');
    volumeInput.type = 'range';
    volumeInput.id = 'ctl-audio-volume';
    volumeInput.min = 0;
    volumeInput.max = 1;
    volumeInput.step = 0.01;
    volumeInput.value = 0.5;
    volumeInput.setAttribute('aria-label', 'Volume');
    volumeInput.addEventListener('input', () => {
      const numeric = Number(volumeInput.value);
      volumeValue.textContent = `${Math.round(numeric * 100)}%`;
      this.handlers.onVolumeChange?.(numeric);
    });
    volumeRow.append(volumeHead, volumeInput);
    audioSection.appendChild(volumeRow);
    this.sliders.set('audio.volume', { input: volumeInput, display: volumeValue, entry: { format: (v) => `${Math.round(v * 100)}%` } });

    audioSection.appendChild(this._buildSwitch('Audio Reactivity', 'audioReactivity', (checked) => {
      this.handlers.onReactivityToggle?.(checked);
    }));
    this.dom.panelBody.appendChild(audioSection);
  }

  _buildSwitch(label, key, onChange) {
    const row = document.createElement('label');
    row.className = 'switch-row';

    const text = document.createElement('span');
    text.textContent = label;

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.role = 'switch';
    input.id = `sw-${key}`;
    input.setAttribute('aria-label', label);

    const track = document.createElement('span');
    track.className = 'switch-track';
    track.setAttribute('aria-hidden', 'true');

    input.addEventListener('change', () => onChange(input.checked));
    row.append(text, input, track);
    this.toggles.set(key, input);
    return row;
  }

  _bindHeader() {
    this.dom.btnHelp.addEventListener('click', () => this.openModal('helpModal'));
    this.dom.btnSettings.addEventListener('click', () => this.openModal('settingsModal'));
    this.dom.btnCloseHelp.addEventListener('click', () => this.closeModal('helpModal'));
    this.dom.btnCloseSettings.addEventListener('click', () => this.closeModal('settingsModal'));

    for (const modal of [this.dom.helpModal, this.dom.settingsModal]) {
      modal.addEventListener('click', (event) => {
        if (event.target === modal) this.closeModal(modal.id);
      });
    }

    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.closeModal('helpModal');
        this.closeModal('settingsModal');
      }
      if (event.key === '?' && !this._isTyping()) this.openModal('helpModal');
    });

    this.dom.btnPanelToggle.addEventListener('click', () => this.togglePanel());
    this.dom.btnPanelClose.addEventListener('click', () => this.togglePanel(false));
    this.dom.btnReset.addEventListener('click', () => this.handlers.onReset?.());
  }

  _isTyping() {
    const active = document.activeElement;
    return active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;
  }

  _bindTabs() {
    const tabs = [...this.dom.panelTabs.querySelectorAll('[role="tab"]')];
    for (const tab of tabs) {
      tab.addEventListener('click', () => {
        for (const item of tabs) {
          const active = item === tab;
          item.setAttribute('aria-selected', String(active));
          item.tabIndex = active ? 0 : -1;
        }
        for (const section of this.dom.panelBody.querySelectorAll('.control-group')) {
          section.hidden = section.dataset.group !== tab.dataset.tab;
        }
      });
      tab.addEventListener('keydown', (event) => {
        const index = tabs.indexOf(tab);
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
          event.preventDefault();
          const next = (index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
          tabs[next].focus();
          tabs[next].click();
        }
      });
    }
    tabs[0].click();
  }

  _bindPresets() {
    for (const chip of this.dom.presets.querySelectorAll('[data-preset]')) {
      chip.addEventListener('click', () => {
        for (const other of this.dom.presets.querySelectorAll('[data-preset]')) {
          other.classList.toggle('active', other === chip);
        }
        this.handlers.onPreset?.(chip.dataset.preset);
      });
    }
  }

  _bindInteraction() {
    this.dom.btnEnter.addEventListener('click', () => {
      safeStorageSet(STORAGE_KEYS.welcome, '1');
      this.dom.welcome.classList.add('hidden');
      this.handlers.onEnter?.();
    });
  }

  _bindSettings() {
    this.dom.setQuality.addEventListener('change', () => {
      this.handlers.onQualityChange?.(this.dom.setQuality.value);
      this._updateQualityBadge(this.dom.setQuality.value);
    });

    for (const button of this.dom.setParticles.querySelectorAll('[data-particles]')) {
      button.addEventListener('click', () => {
        for (const other of this.dom.setParticles.querySelectorAll('[data-particles]')) {
          other.classList.toggle('active', other === button);
        }
        this.handlers.onParticlePreset?.(button.dataset.particles);
      });
    }

    this.dom.setPost.addEventListener('change', () => this.handlers.onPostToggle?.(this.dom.setPost.checked));
    this.dom.setGesture.addEventListener('change', () => this.handlers.onGestureToggle?.(this.dom.setGesture.checked));
    this.dom.setAudio.addEventListener('change', () => this.handlers.onAudioToggle?.(this.dom.setAudio.checked));
    this.dom.setReducedMotion.addEventListener('change', () => this.handlers.onReducedMotion?.(this.dom.setReducedMotion.checked));
  }

  _buildHelpContent() {
    const mouseList = this.dom.helpModal.querySelector('[data-help="mouse"]');
    const keyList = this.dom.helpModal.querySelector('[data-help="keys"]');
    const gestureList = this.dom.helpModal.querySelector('[data-help="gestures"]');

    const mouseRows = [
      ['Drag', 'Rotate'],
      ['Scroll', 'Zoom'],
      ['Right drag', 'Pan'],
      ['Touch drag', 'Rotate'],
      ['Pinch', 'Zoom'],
    ];
    for (const [key, action] of mouseRows) mouseList.appendChild(this._helpRow(key, action));
    for (const [key, action] of KEY_HINTS) keyList.appendChild(this._helpRow(key, action));
    for (const [key, action] of GESTURE_HINTS) gestureList.appendChild(this._helpRow(key, action));
  }

  _helpRow(key, action) {
    const row = document.createElement('div');
    row.className = 'help-row';
    const kbd = document.createElement('kbd');
    kbd.textContent = key;
    const span = document.createElement('span');
    span.textContent = action;
    row.append(kbd, span);
    return row;
  }

  _restoreState() {
    const stored = safeStorageGet(STORAGE_KEYS.settings);
    if (!stored) return;
    try {
      const data = JSON.parse(stored);
      if (data.quality) this.dom.setQuality.value = data.quality;
      this._updateQualityBadge(data.quality || 'auto');
      if (data.particlePreset) {
        for (const button of this.dom.setParticles.querySelectorAll('[data-particles]')) {
          button.classList.toggle('active', button.dataset.particles === data.particlePreset);
        }
      }
      if (typeof data.postProcessing === 'boolean') this.dom.setPost.checked = data.postProcessing;
      if (typeof data.reducedMotion === 'boolean') this.dom.setReducedMotion.checked = data.reducedMotion;
      if (typeof data.gesture === 'boolean') this.dom.setGesture.checked = data.gesture;
      if (typeof data.audio === 'boolean') this.dom.setAudio.checked = data.audio;
      this._saveSettings();
    } catch {
      /* corrupted state is ignored, defaults apply */
    }
  }

  _saveSettings() {
    const data = {
      quality: this.dom.setQuality.value,
      particlePreset: this.dom.setParticles.querySelector('.active')?.dataset.particles || 'auto',
      postProcessing: this.dom.setPost.checked,
      reducedMotion: this.dom.setReducedMotion.checked,
      gesture: this.dom.setGesture.checked,
      audio: this.dom.setAudio.checked,
    };
    safeStorageSet(STORAGE_KEYS.settings, JSON.stringify(data));
    return data;
  }

  readSettings() {
    return this._saveSettings();
  }

  _updateQualityBadge(level) {
    this.dom.qualityBadge.textContent = `GRAPHICS ${String(level).toUpperCase()}`;
  }

  setControlValue(group, key, value) {
    const slider = this.sliders.get(`${group}.${key}`);
    if (!slider) return;
    slider.input.value = value;
    slider.display.textContent = slider.entry.format(Number(value));
  }

  setToggle(key, checked) {
    const toggle = this.toggles.get(key);
    if (toggle) toggle.checked = checked;
    if (key === 'gesture') this.dom.setGesture.checked = checked;
    if (key === 'audioEnabled') this.dom.setAudio.checked = checked;
  }

  setActivePreset(name) {
    for (const chip of this.dom.presets.querySelectorAll('[data-preset]')) {
      chip.classList.toggle('active', chip.dataset.preset === name);
    }
  }

  setParticlePreset(value) {
    for (const button of this.dom.setParticles.querySelectorAll('[data-particles]')) {
      button.classList.toggle('active', button.dataset.particles === value);
    }
  }

  showLoading() {
    this.dom.loader.classList.remove('hidden');
  }

  setLoadStep(label, percent, stepIndex = 0) {
    this.dom.loaderStep.textContent = label;
    this.dom.loaderBar.style.setProperty('--progress', `${percent}%`);
    this.dom.loaderPercent.textContent = `${Math.round(percent)}%`;
    const steps = [...this.dom.loaderSteps.querySelectorAll('li')];
    steps.forEach((step, index) => {
      step.classList.toggle('done', index < stepIndex);
      step.classList.toggle('active', index === stepIndex);
    });
  }

  hideLoading() {
    this.dom.loader.classList.add('hidden');
    const dismissed = safeStorageGet(STORAGE_KEYS.welcome);
    if (!dismissed) {
      setTimeout(() => this.dom.welcome.classList.remove('hidden'), 350);
    }
  }

  openModal(id) {
    const modal = this.dom[id];
    modal.classList.remove('hidden');
    modal.querySelector('button, [href], input')?.focus();
  }

  closeModal(id) {
    this.dom[id]?.classList.add('hidden');
  }

  togglePanel(force) {
    const panel = this.dom.controlPanel;
    const shouldOpen = typeof force === 'boolean' ? force : !panel.classList.contains('open');
    panel.classList.toggle('open', shouldOpen);
    this.dom.btnPanelToggle.setAttribute('aria-expanded', String(shouldOpen));
  }

  setStatus(text, mode = 'online') {
    this.dom.statusText.textContent = text;
    this.dom.statusPill.dataset.mode = mode;
  }

  setGesturePreview(visible) {
    this.dom.handPreview.classList.toggle('hidden', !visible);
    this.dom.gestureTag.classList.toggle('hidden', !visible);
  }

  showToast(message, tone = 'info', duration = 4200) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${tone}`;
    toast.setAttribute('role', 'status');
    toast.textContent = message;
    this.dom.toastHost.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, duration);
    while (this.dom.toastHost.children.length > 3) this.dom.toastHost.firstChild.remove();
  }

  updateStats(stats, now = performance.now()) {
    if (now - this.lastStatsAt < STATS_INTERVAL) return;
    this.lastStatsAt = now;
    this.dom.statFps.textContent = String(Math.round(stats.fps));
    this.dom.statFps.dataset.level = stats.fps >= 50 ? 'good' : stats.fps >= 35 ? 'fair' : 'low';
    this.dom.statParticles.textContent = formatNumber(stats.particles);
    this.dom.statHands.textContent = String(stats.hands);
    this.dom.statGesture.textContent = stats.gesture;
    this.dom.gestureTag.textContent = stats.gesture;
  }

  setPrivacyNote(text) {
    this.dom.privacyNote.textContent = text;
  }
}
