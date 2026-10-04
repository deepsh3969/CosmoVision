import { clamp, damp } from './utils.js';

const BASS_BINS = [1, 5];
const MID_BINS = [5, 42];
const HIGH_BINS = [42, 130];

export class AudioEngine {
  constructor() {
    this.context = null;
    this.master = null;
    this.analyser = null;
    this.frequencyData = null;
    this.sources = [];
    this.started = false;
    this.enabled = false;
    this.volume = 0.5;
    this.reactivity = true;
    this.available = typeof window !== 'undefined' && Boolean(window.AudioContext || window.webkitAudioContext);

    this.bands = { bass: 0, mid: 0, high: 0, mix: 0 };
    this._targets = { bass: 0, mid: 0, high: 0 };
    this.errorMessage = '';
  }

  async start() {
    if (!this.available) {
      this.errorMessage = 'Web Audio is not supported in this browser. Audio reactivity is disabled.';
      return false;
    }
    try {
      if (!this.context) this._createGraph();
      if (this.context.state === 'suspended') await this.context.resume();
      this.enabled = true;
      this.started = true;
      this.master.gain.cancelScheduledValues(this.context.currentTime);
      this.master.gain.linearRampToValueAtTime(this.volume * 0.5, this.context.currentTime + 1.4);
      if (this.sources.length === 0) this._buildDrone();
      return true;
    } catch (error) {
      this.errorMessage = 'Audio could not start. The experience continues silently.';
      this.enabled = false;
      return false;
    }
  }

  stop() {
    this.enabled = false;
    if (!this.context || !this.master) return;
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(0.0001, now + 0.6);
  }

  setVolume(value) {
    this.volume = clamp(value, 0, 1);
    if (this.context && this.master && this.enabled) {
      this.master.gain.setTargetAtTime(this.volume * 0.5, this.context.currentTime, 0.15);
    }
  }

  setReactivity(enabled) {
    this.reactivity = enabled;
    if (!enabled) {
      this.bands.bass = 0;
      this.bands.mid = 0;
      this.bands.high = 0;
      this.bands.mix = 0;
    }
  }

  _createGraph() {
    const Context = window.AudioContext || window.webkitAudioContext;
    this.context = new Context();
    this.master = this.context.createGain();
    this.master.gain.value = 0.0001;
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.82;
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    this.master.connect(this.analyser);
    this.analyser.connect(this.context.destination);
  }

  _buildDrone() {
    const ctx = this.context;
    const bus = ctx.createGain();
    bus.gain.value = 0.7;
    bus.connect(this.master);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    filter.Q.value = 4;
    filter.connect(bus);

    const sweep = ctx.createOscillator();
    sweep.frequency.value = 0.05;
    const sweepGain = ctx.createGain();
    sweepGain.gain.value = 260;
    sweep.connect(sweepGain);
    sweepGain.connect(filter.frequency);
    sweep.start();

    const voices = [
      { freq: 55, type: 'sine', gain: 0.28, detune: -5 },
      { freq: 82.41, type: 'sine', gain: 0.19, detune: 6 },
      { freq: 110, type: 'triangle', gain: 0.12, detune: 3 },
      { freq: 164.81, type: 'sine', gain: 0.07, detune: -8 },
    ];

    for (const voice of voices) {
      const osc = ctx.createOscillator();
      osc.type = voice.type;
      osc.frequency.value = voice.freq;
      osc.detune.value = voice.detune;

      const gain = ctx.createGain();
      gain.gain.value = voice.gain;

      const trem = ctx.createOscillator();
      trem.frequency.value = 0.07 + Math.random() * 0.11;
      const tremGain = ctx.createGain();
      tremGain.gain.value = voice.gain * 0.4;
      trem.connect(tremGain);
      tremGain.connect(gain.gain);

      osc.connect(gain);
      gain.connect(filter);
      osc.start();
      trem.start();
      this.sources.push(osc, trem);
    }

    const noiseBuffer = this._createNoiseBuffer(4);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 1400;
    noiseFilter.Q.value = 0.7;

    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.035;

    const noiseLfo = ctx.createOscillator();
    noiseLfo.frequency.value = 0.03;
    const noiseLfoGain = ctx.createGain();
    noiseLfoGain.gain.value = 0.025;
    noiseLfo.connect(noiseLfoGain);
    noiseLfoGain.connect(noiseGain.gain);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(bus);
    noise.start();
    noiseLfo.start();
    this.sources.push(noise, noiseLfo);

    this._noiseGain = noiseGain;
    this._filter = filter;
  }

  _createNoiseBuffer(seconds) {
    const ctx = this.context;
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      last = 0.98 * last + 0.02 * white;
      data[i] = last * 3.2;
    }
    return buffer;
  }

  update(dt) {
    if (!this.enabled || !this.analyser || !this.reactivity) {
      const fade = Math.exp(-4 * dt);
      this.bands.bass *= fade;
      this.bands.mid *= fade;
      this.bands.high *= fade;
      this.bands.mix = damp(this.bands.mix, 0, 3, dt);
      return this.bands;
    }

    this.analyser.getByteFrequencyData(this.frequencyData);
    const total = this.frequencyData.length;

    const average = (range) => {
      const start = clamp(range[0], 0, total - 1);
      const end = clamp(range[1], 0, total);
      let sum = 0;
      for (let i = start; i < end; i += 1) sum += this.frequencyData[i];
      return end > start ? sum / ((end - start) * 255) : 0;
    };

    this._targets.bass = clamp(average(BASS_BINS) * 1.5, 0, 1);
    this._targets.mid = clamp(average(MID_BINS) * 2.4, 0, 1);
    this._targets.high = clamp(average(HIGH_BINS) * 3.6, 0, 1);

    this.bands.bass = damp(this.bands.bass, this._targets.bass, 6, dt);
    this.bands.mid = damp(this.bands.mid, this._targets.mid, 5, dt);
    this.bands.high = damp(this.bands.high, this._targets.high, 4, dt);
    this.bands.mix = damp(this.bands.mix, 1, 3, dt);
    return this.bands;
  }

  dispose() {
    this.stop();
    for (const source of this.sources) {
      try {
        source.stop();
      } catch {
        /* source may already be stopped */
      }
    }
    this.sources = [];
    this.context?.close?.();
    this.context = null;
  }
}
