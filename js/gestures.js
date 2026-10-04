import { clamp, damp } from './utils.js';

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

const TIPS = [4, 8, 12, 16, 20];
const VISION_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs';
const VISION_WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const distance2D = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function handScale(landmarks) {
  return Math.max(distance2D(landmarks[0], landmarks[9]), 0.001);
}

function extendedFingerCount(landmarks) {
  const wrist = landmarks[0];
  const checks = [
    [8, 6],
    [12, 10],
    [16, 14],
    [20, 18],
  ];
  let count = 0;
  for (const [tip, pip] of checks) {
    if (distance2D(landmarks[tip], wrist) > distance2D(landmarks[pip], wrist) * 1.12) count += 1;
  }
  return count;
}

function palmCenter(landmarks) {
  const ids = [0, 5, 9, 13, 17];
  let x = 0;
  let y = 0;
  for (const id of ids) {
    x += landmarks[id].x;
    y += landmarks[id].y;
  }
  return { x: x / ids.length, y: y / ids.length };
}

export class GestureEngine {
  constructor() {
    this.status = 'idle';
    this.enabled = false;
    this.landmarks = [];
    this.handsCount = 0;
    this.gesture = 'NONE';
    this.previousGesture = 'NONE';
    this.errorMessage = '';

    this.video = null;
    this.overlay = null;
    this.overlayContext = null;
    this.stream = null;
    this.landmarker = null;
    this.loopHandle = 0;
    this.lastDetectTime = 0;
    this.lastVideoTime = -1;
    this.modelReady = false;

    this.pinchStrength = 0;
    this.energyRate = 0;
    this.steer = 0;
    this.tilt = 0;
    this.zoom = 0;
    this.expand = 0;
    this.palmX = 0.5;
    this.palmY = 0.5;

    this.output = {
      hands: 0,
      gesture: 'NONE',
      energyRate: 0,
      steer: 0,
      tilt: 0,
      zoom: 0,
      expand: 0,
    };

    this._instant = { energyRate: 0, steer: 0, tilt: 0, zoom: 0, expand: 0 };
    this._previousSpread = 0;
    this._spreadVelocity = 0;
    this._onStatus = () => {};
    this._onError = () => {};
  }

  attach({ video, overlay, onStatus, onError }) {
    this.video = video;
    this.overlay = overlay;
    this.overlayContext = overlay ? overlay.getContext('2d') : null;
    this._onStatus = onStatus || this._onStatus;
    this._onError = onError || this._onError;
  }

  async prepare() {
    try {
      const module = await import(/* @vite-ignore */ VISION_URL);
      const { FilesetResolver, HandLandmarker } = module;
      const fileset = await FilesetResolver.forVisionTasks(VISION_WASM);
      const options = {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      };
      try {
        this.landmarker = await HandLandmarker.createFromOptions(fileset, options);
      } catch {
        options.baseOptions.delegate = 'CPU';
        this.landmarker = await HandLandmarker.createFromOptions(fileset, options);
      }
      this.modelReady = true;
      this._onStatus('model-ready');
      return true;
    } catch (error) {
      this.status = 'unavailable';
      this.errorMessage = 'Gesture engine unavailable. CosmoVision continues in mouse-control mode.';
      this._onError(this.errorMessage, error);
      return false;
    }
  }

  async start() {
    if (this.enabled) return true;
    if (!this.modelReady) {
      const ready = await this.prepare();
      if (!ready) return false;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      this.status = 'unavailable';
      this._onError('Camera API unavailable. CosmoVision continues in mouse-control mode.');
      return false;
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
    } catch (error) {
      this.status = 'denied';
      this.errorMessage = 'Camera unavailable. CosmoVision will continue in mouse-control mode.';
      this._onError(this.errorMessage, error);
      return false;
    }

    this.video.srcObject = this.stream;
    try {
      await this.video.play();
    } catch {
      /* autoplay of muted inline video is normally permitted */
    }

    this.enabled = true;
    this.status = 'active';
    this._onStatus('active');
    this._scheduleDetect();
    return true;
  }

  stop() {
    this.enabled = false;
    this.status = 'idle';
    cancelAnimationFrame(this.loopHandle);
    if (this.stream) {
      for (const track of this.stream.getTracks()) track.stop();
      this.stream = null;
    }
    if (this.video) this.video.srcObject = null;
    this.landmarks = [];
    this.handsCount = 0;
    this.gesture = 'NONE';
    this._resetOutput();
    this.clearOverlay();
    this._onStatus('stopped');
  }

  _resetOutput() {
    this._instant = { energyRate: 0, steer: 0, tilt: 0, zoom: 0, expand: 0 };
    this.output = { hands: 0, gesture: 'NONE', energyRate: 0, steer: 0, tilt: 0, zoom: 0, expand: 0 };
    this._spreadVelocity = 0;
    this._previousSpread = 0;
  }

  _scheduleDetect() {
    const loop = () => {
      if (!this.enabled) return;
      this.loopHandle = requestAnimationFrame(loop);
      const now = performance.now();
      if (now - this.lastDetectTime < 33) return;
      if (!this.video || this.video.readyState < 2 || document.hidden) return;
      this.lastDetectTime = now;
      if (this.video.currentTime === this.lastVideoTime) return;
      this.lastVideoTime = this.video.currentTime;
      try {
        const results = this.landmarker.detectForVideo(this.video, now);
        this._processResults(results);
      } catch {
        this.status = 'error';
        this.errorMessage = 'Hand tracking paused. CosmoVision continues in mouse-control mode.';
        this._onError(this.errorMessage);
        this.stop();
      }
    };
    this.loopHandle = requestAnimationFrame(loop);
  }

  _processResults(results) {
    const hands = results.landmarks || [];
    this.landmarks = hands;
    this.handsCount = hands.length;

    if (hands.length === 0) {
      this.previousGesture = this.gesture;
      this.gesture = 'NONE';
      this._instant = { energyRate: 0, steer: 0, tilt: 0, zoom: 0, expand: 0 };
      this.pinchStrength = damp(this.pinchStrength, 0, 8, 0.05);
      return;
    }

    const first = hands[0];
    const center = palmCenter(first);
    this.palmX = center.x;
    this.palmY = center.y;

    const scale = handScale(first);
    const pinchRatio = distance2D(first[4], first[8]) / scale;
    const pinchActive = pinchRatio < 0.55;
    const strength = clamp((0.95 - pinchRatio) / 0.7, 0, 1);
    this.pinchStrength = damp(this.pinchStrength, strength, 10, 0.05);

    const extended = extendedFingerCount(first);

    let gesture = 'NEUTRAL';
    if (hands.length === 2) {
      gesture = 'TWO HANDS';
      this._handleTwoHands(hands);
    } else {
      this._instant.expand = 0;
      if (pinchActive && extended < 3) {
        gesture = 'PINCH';
        this._instant.zoom = (0.5 - this.pinchStrength) * 1.6;
        this._instant.steer = 0;
        this._instant.tilt = 0;
        this._instant.energyRate = 0;
      } else if (extended >= 4) {
        gesture = 'OPEN PALM';
        this._instant.energyRate = 0.55;
        this._steerTilt(center, 0.9);
        this._instant.zoom = 0;
      } else if (extended === 0) {
        gesture = 'FIST';
        this._instant.energyRate = -0.55;
        this._steerTilt(center, 1.1);
        this._instant.zoom = 0;
      } else if (extended === 1 && this._indexExtended(first)) {
        gesture = 'POINT';
        this._steerTilt(center, 2.2);
        this._instant.zoom = 0;
        this._instant.energyRate = 0;
      } else {
        gesture = 'NEUTRAL';
        this._steerTilt(center, 1.0);
        this._instant.zoom = 0;
        this._instant.energyRate = 0;
      }
    }

    this.previousGesture = this.gesture;
    this.gesture = gesture;
  }

  _indexExtended(landmarks) {
    const wrist = landmarks[0];
    return distance2D(landmarks[8], wrist) > distance2D(landmarks[6], wrist) * 1.12;
  }

  _steerTilt(center, gain) {
    this._instant.steer = clamp((center.x - 0.5) * -2.4 * gain, -1.6, 1.6);
    this._instant.tilt = clamp((center.y - 0.5) * 2.2 * gain, -1.4, 1.4);
  }

  _handleTwoHands(hands) {
    const a = palmCenter(hands[0]);
    const b = palmCenter(hands[1]);
    const spread = Math.hypot(a.x - b.x, a.y - b.y);
    if (this._previousSpread > 0) {
      const velocity = (spread - this._previousSpread) * 26;
      this._spreadVelocity = damp(this._spreadVelocity, clamp(velocity, -3, 3), 8, 0.05);
    }
    this._previousSpread = spread;

    const bothPinching = hands.every((hand) => distance2D(hand[4], hand[8]) / handScale(hand) < 0.55);
    const avgX = (a.x + b.x) / 2;
    const avgY = (a.y + b.y) / 2;

    this._instant.expand = clamp(this._spreadVelocity * 0.5, -1.4, 1.4);
    this._instant.steer = clamp((avgX - 0.5) * -2.6, -1.8, 1.8);
    this._instant.tilt = clamp((avgY - 0.5) * 2.4, -1.4, 1.4);
    this._instant.zoom = bothPinching ? clamp(this._spreadVelocity * 0.9, -2.4, 2.4) : 0;
    this._instant.energyRate = 0;
    this.palmX = avgX;
    this.palmY = avgY;
  }

  update(dt) {
    const lambda = 5.5;
    this.output.hands = this.handsCount;
    this.output.gesture = this.enabled ? this.gesture : 'NONE';
    this.output.energyRate = damp(this.output.energyRate, this._instant.energyRate, lambda, dt);
    this.output.steer = damp(this.output.steer, this._instant.steer, lambda, dt);
    this.output.tilt = damp(this.output.tilt, this._instant.tilt, lambda, dt);
    this.output.zoom = damp(this.output.zoom, this._instant.zoom, lambda, dt);
    this.output.expand = damp(this.output.expand, this._instant.expand, lambda, dt);
    return this.output;
  }

  drawOverlay() {
    if (!this.overlayContext || !this.overlay) return;
    const ctx = this.overlayContext;
    const canvas = this.overlay;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    if (this.enabled && this.video && this.video.readyState >= 2) {
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      const videoRatio = this.video.videoWidth / this.video.videoHeight || 4 / 3;
      let drawW = width;
      let drawH = width / videoRatio;
      if (drawH < height) {
        drawH = height;
        drawW = height * videoRatio;
      }
      ctx.drawImage(this.video, (width - drawW) / 2, (height - drawH) / 2, drawW, drawH);
      ctx.restore();
    }

    if (!this.enabled || this.landmarks.length === 0) return;

    for (const hand of this.landmarks) {
      const mapped = hand.map((point) => ({ x: (1 - point.x) * width, y: point.y * height }));

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const point of mapped) {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      }

      ctx.strokeStyle = 'rgba(120, 220, 255, 0.85)';
      ctx.lineWidth = 1.5;
      for (const [from, to] of HAND_CONNECTIONS) {
        ctx.beginPath();
        ctx.moveTo(mapped[from].x, mapped[from].y);
        ctx.lineTo(mapped[to].x, mapped[to].y);
        ctx.stroke();
      }

      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      for (const point of mapped) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = 'rgba(255, 200, 120, 1)';
      for (const tip of TIPS) {
        ctx.beginPath();
        ctx.arc(mapped[tip].x, mapped[tip].y, 3.4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = 'rgba(160, 130, 255, 0.9)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.2;
      ctx.strokeRect(minX - 8, minY - 8, maxX - minX + 16, maxY - minY + 16);
      ctx.setLineDash([]);
    }
    return this.gesture;
  }

  clearOverlay() {
    if (!this.overlayContext || !this.overlay) return;
    this.overlayContext.setTransform(1, 0, 0, 1, 0, 0);
    this.overlayContext.clearRect(0, 0, this.overlay.width, this.overlay.height);
  }

  isSupported() {
    return Boolean(navigator.mediaDevices?.getUserMedia);
  }

  dispose() {
    this.stop();
    this.landmarker?.close?.();
    this.landmarker = null;
  }
}
