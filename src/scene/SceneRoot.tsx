import { Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';

import { getQualityProfile } from '../data/galaxyPresets';
import { useAppStore } from '../store/useAppStore';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { WebGLFallback } from '../ui/WebGLFallback';
import { CameraRig } from './CameraRig';
import { MilkyWay } from './MilkyWay';
import { PerfMonitor } from './PerfMonitor';
import { SimulationDriver } from './SimulationDriver';
import { SolarSystem } from './SolarSystem';
import { Starfield } from './Starfield';

/** Matches `initialCameraState()` (radius 34, theta 0.75, phi 1.15) so the first frame is stable. */
const INITIAL_CAMERA_POSITION: [number, number, number] = [21.2, 13.9, 22.8];

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    return context !== null;
  } catch {
    return false;
  }
}

/**
 * The whole 3D application: canvas, quality-scaled DPR, scene contents and the
 * camera/simulation/perf drivers. A WebGL failure degrades to the data-only view.
 */
export function SceneRoot() {
  const webgl = useAppStore((state) => state.webgl);
  const quality = useAppStore((state) => state.quality);
  const profile = getQualityProfile(quality);

  useEffect(() => {
    const store = useAppStore.getState();
    if (store.webgl !== 'pending') return;
    store.setWebgl(detectWebGL() ? 'ok' : 'failed');
  }, []);

  if (webgl === 'failed') {
    return (
      <div className="scene-root">
        <WebGLFallback />
      </div>
    );
  }

  return (
    <div className="scene-root">
      <ErrorBoundary
        onError={() => useAppStore.getState().setWebgl('failed')}
        fallback={
          <div className="scene-root">
            <WebGLFallback />
          </div>
        }
      >
        <Canvas
          dpr={[1, profile.dpr]}
          camera={{ fov: 50, near: 0.003, far: 4000, position: INITIAL_CAMERA_POSITION }}
          gl={{ logarithmicDepthBuffer: true, antialias: true, powerPreference: 'high-performance' }}
          onPointerMissed={() => useAppStore.getState().select(null)}
        >
          <color attach="background" args={['#02030a']} />
          <ambientLight intensity={0.08} />
          <Suspense fallback={null}>
            <Starfield />
            <MilkyWay />
            <SolarSystem />
          </Suspense>
          <CameraRig />
          <SimulationDriver />
          <PerfMonitor />
        </Canvas>
      </ErrorBoundary>
    </div>
  );
}
