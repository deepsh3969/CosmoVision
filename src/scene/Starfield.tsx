import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

import { getQualityProfile } from '../data/galaxyPresets';
import { generateGlints, generateStarfield } from './galaxyGenerator';
import { applyBuffers, createPointMaterial, createPointUniforms } from './shaders';
import { useAppStore } from '../store/useAppStore';

function createGlintBuffers(count: number): {
  position: Float32Array;
  color: Float32Array;
  size: Float32Array;
  seed: Float32Array;
  radius: Float32Array;
  alpha: Float32Array;
} {
  const { positions, colors } = generateGlints(count);
  const size = new Float32Array(count);
  const seed = new Float32Array(count);
  const radius = new Float32Array(count);
  const alpha = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    size[i] = 2.4 + (i % 7) * 0.35;
    seed[i] = (i * 0.6180339887498949) % 1;
    radius[i] = Math.hypot(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
    alpha[i] = 0.9;
  }
  return { position: positions, color: colors, size, seed, radius, alpha };
}

/** Deep-field background: static distant stars plus a few brighter billboard glints. */
export function Starfield() {
  const quality = useAppStore((state) => state.quality);
  const profile = getQualityProfile(quality);

  const starCount = Math.max(1200, Math.round(5200 * profile.particleScale));
  const glintCount = Math.max(48, Math.round(220 * profile.particleScale));

  const starGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    applyBuffers(geometry, generateStarfield(starCount));
    return geometry;
  }, [starCount]);

  const glintGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    applyBuffers(geometry, createGlintBuffers(glintCount));
    return geometry;
  }, [glintCount]);

  const starMaterial = useMemo(() => {
    const uniforms = createPointUniforms(1200);
    uniforms.uRotation.value = 0;
    uniforms.uTwinkle.value = 0.12;
    uniforms.uEnergy.value = 0.5;
    uniforms.uGlow.value = 1.6;
    uniforms.uFogDensity.value = 0;
    uniforms.uOpacity.value = 0.85;
    return createPointMaterial(uniforms, { maxSize: 3.2, twinkle: 0.12 });
  }, []);

  const glintMaterial = useMemo(() => {
    const uniforms = createPointUniforms(850);
    uniforms.uRotation.value = 0;
    uniforms.uTwinkle.value = 0.45;
    uniforms.uEnergy.value = 0.6;
    uniforms.uGlow.value = 2.4;
    uniforms.uFogDensity.value = 0;
    uniforms.uOpacity.value = 0.9;
    return createPointMaterial(uniforms, { maxSize: 9, twinkle: 0.45 });
  }, []);

  useEffect(
    () => () => {
      starGeometry.dispose();
      glintGeometry.dispose();
      starMaterial.dispose();
      glintMaterial.dispose();
    },
    [starGeometry, glintGeometry, starMaterial, glintMaterial],
  );

  return (
    <group>
      <points geometry={starGeometry} material={starMaterial} frustumCulled={false} />
      <points geometry={glintGeometry} material={glintMaterial} frustumCulled={false} />
    </group>
  );
}
