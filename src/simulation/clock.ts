export const SIM_SPEEDS = [0.1, 1, 10, 100, 1000] as const;
export const DEFAULT_SPEED = 10;
/** Frame time is clamped so a background tab or a stall never teleports the simulation. */
export const MAX_FRAME_DT = 0.05;

export type SimSpeed = (typeof SIM_SPEEDS)[number];

export function isSimSpeed(value: number): value is SimSpeed {
  return (SIM_SPEEDS as readonly number[]).includes(value);
}

export function clampSpeed(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SPEED;
  if (value <= 0) return 0;
  const min = SIM_SPEEDS[0];
  const max = SIM_SPEEDS[SIM_SPEEDS.length - 1];
  return Math.min(Math.max(value, min), max);
}

/**
 * Deterministic simulation clock.
 * `speed` is expressed in simulated days per real second, so motion is tied to elapsed
 * time rather than to frame counts: a 30 FPS laptop and a 144 Hz monitor see the same sky.
 */
export class SimulationClock {
  simDays = 0;
  speed: number = DEFAULT_SPEED;
  playing = true;

  /** Advance the clock; returns the new simulation time in days. */
  tick(dtRealSeconds: number): number {
    if (!this.playing || !Number.isFinite(dtRealSeconds) || dtRealSeconds <= 0) return this.simDays;
    const dt = Math.min(dtRealSeconds, MAX_FRAME_DT);
    this.simDays += dt * this.speed;
    return this.simDays;
  }

  advance(days: number): number {
    if (Number.isFinite(days)) this.simDays += days;
    return this.simDays;
  }

  setSpeed(speed: number): number {
    this.speed = clampSpeed(speed);
    if (this.speed > 0) this.playing = true;
    return this.speed;
  }

  play(): void {
    this.playing = true;
  }

  pause(): void {
    this.playing = false;
  }

  toggle(): boolean {
    this.playing = !this.playing;
    return this.playing;
  }

  reset(): number {
    this.simDays = 0;
    return this.simDays;
  }
}

export function formatSpeed(speed: number): string {
  if (speed >= 1) return `${speed}×`;
  return `${speed}×`;
}
