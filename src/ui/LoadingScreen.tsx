import { useEffect } from 'react';

import { useAppStore } from '../store/useAppStore';

const STAGES = [
  { at: 120, stage: 1, label: 'Preparing renderer' },
  { at: 420, stage: 2, label: 'Generating galaxy' },
  { at: 780, stage: 3, label: 'Loading object catalogue' },
];

/**
 * Boot overlay. Advances the store's boot stage on a short timer so the first
 * heavy WebGL frames do not stack on top of an unstyled document.
 */
export function LoadingScreen() {
  const bootStage = useAppStore((state) => state.bootStage);
  const setBootStage = useAppStore((state) => state.setBootStage);
  const finishBoot = useAppStore((state) => state.finishBoot);

  useEffect(() => {
    const timers = STAGES.map(({ at, stage }) => window.setTimeout(() => setBootStage(stage), at));
    const done = window.setTimeout(() => finishBoot(), 1050);
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(done);
    };
  }, [setBootStage, finishBoot]);

  const label = STAGES.find((entry) => entry.stage === bootStage)?.label ?? 'Ready';
  const progress = Math.min(100, Math.max(8, bootStage * 25));

  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <h1 className="loading-screen__title">COSMOVISION</h1>
      <p className="loading-screen__stage">{label}</p>
      <div className="loading-bar" aria-hidden="true">
        <div className="loading-bar__fill" style={{ width: `${progress}%` }} />
      </div>
      <p className="loading-screen__stage">Interactive 3D space exploration — NASA-sourced facts</p>
    </div>
  );
}
