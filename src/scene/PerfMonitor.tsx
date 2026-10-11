import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

import { useAppStore } from '../store/useAppStore';

const SAMPLE_INTERVAL_MS = 500;

/** Samples real FPS and renderer statistics twice a second for the performance panel. */
export function PerfMonitor() {
  const gl = useThree((state) => state.gl);
  const setPerf = useAppStore((state) => state.setPerf);
  const frames = useRef(0);
  const lastSample = useRef(performance.now());

  useFrame(() => {
    frames.current += 1;
    const now = performance.now();
    const elapsed = now - lastSample.current;
    if (elapsed < SAMPLE_INTERVAL_MS) return;
    const fps = (frames.current * 1000) / elapsed;
    frames.current = 0;
    lastSample.current = now;
    const info = gl.info;
    setPerf({
      fps: Math.round(fps),
      frameMs: Math.round((1000 / Math.max(fps, 1)) * 10) / 10,
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
      points: info.render.points,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      dpr: gl.getPixelRatio(),
    });
  });

  return null;
}
