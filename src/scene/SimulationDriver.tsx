import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

import { simulationClock, useAppStore } from '../store/useAppStore';

const PUBLISH_INTERVAL_MS = 125;

/**
 * Advances the deterministic simulation clock every frame and mirrors the current
 * simulation day into the store at ~8 Hz (enough for readouts, cheap on React).
 */
export function SimulationDriver() {
  const publish = useAppStore((state) => state.publishSimDays);
  const lastPublish = useRef(0);

  useFrame((_, delta) => {
    const days = simulationClock.tick(delta);
    const now = performance.now();
    if (now - lastPublish.current >= PUBLISH_INTERVAL_MS) {
      lastPublish.current = now;
      publish(days);
    }
  });

  return null;
}
