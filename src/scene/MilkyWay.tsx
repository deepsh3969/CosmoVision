import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { WORLD } from '../data/celestialObjects';
import { getQualityProfile, getTheme } from '../data/galaxyPresets';
import { useAppStore } from '../store/useAppStore';
import { generateGalaxy, generateNebula } from './galaxyGenerator';
import { ObjectLabel } from './ObjectLabel';
import { registerObject, unregisterObject } from './registry';
import { Selectable } from './Selectable';
import { applyBuffers, createPointMaterial, createPointUniforms } from './shaders';
import { createGlowTexture } from './textures';

const SYSTEM_ANCHOR = new THREE.Vector3(...WORLD.systemPosition);

/** Galaxy-scale point clouds fade out once the camera dives into the solar system. */
function fadeNearSystem(camera: THREE.Camera): number {
  const distance = camera.position.distanceTo(SYSTEM_ANCHOR);
  return THREE.MathUtils.smoothstep(distance, 6, 22);
}

/**
 * The Milky Way: procedural spiral galaxy + volumetric haze + galactic core glow,
 * centered on the origin with differential rotation resolved in the vertex shader.
 */
export function MilkyWay() {
  const galaxy = useAppStore((state) => state.galaxy);
  const themeId = useAppStore((state) => state.themeId);
  const quality = useAppStore((state) => state.quality);
  const labels = useAppStore((state) => state.labels);
  const profile = getQualityProfile(quality);
  const theme = useMemo(() => getTheme(themeId), [themeId]);

  const uniformsRef = useRef<ReturnType<typeof createPointUniforms> | null>(null);
  const nebulaUniformsRef = useRef<ReturnType<typeof createPointUniforms> | null>(null);

  const galaxyGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    applyBuffers(geometry, generateGalaxy(galaxy, theme, profile.particleScale));
    return geometry;
  }, [galaxy, theme, profile.particleScale]);

  const nebulaGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    applyBuffers(geometry, generateNebula(theme, galaxy.radius, profile.nebulaScale));
    return geometry;
  }, [theme, galaxy.radius, profile.nebulaScale]);

  const galaxyMaterial = useMemo(() => {
    const uniforms = createPointUniforms(galaxy.radius);
    uniformsRef.current = uniforms;
    return createPointMaterial(uniforms, { maxSize: 38, twinkle: 0.25 });
  }, []);

  const nebulaMaterial = useMemo(() => {
    const uniforms = createPointUniforms(galaxy.radius);
    uniforms.uSize.value = 0.55;
    uniforms.uGlow.value = 0.8;
    uniforms.uTwinkle.value = 0.05;
    uniforms.uRotation.value = galaxy.rotationSpeed * 0.4;
    nebulaUniformsRef.current = uniforms;
    return createPointMaterial(uniforms, { maxSize: 180, twinkle: 0.05 });
  }, [galaxy.radius, galaxy.rotationSpeed]);

  const coreTexture = useMemo(
    () => createGlowTexture(256, 'rgba(255,240,214,1)', 'rgba(120,140,255,0)'),
    [],
  );

  const coreRef = useRef<THREE.Sprite>(null);
  const galaxyRef = useRef<THREE.Points>(null);
  const nebulaRef = useRef<THREE.Points>(null);

  useEffect(() => {
    registerObject('milky-way', {
      radius: galaxy.radius,
      getPosition: (out) => out.set(0, 0, 0),
    });
    return () => unregisterObject('milky-way');
  }, [galaxy.radius]);

  useEffect(
    () => () => {
      galaxyGeometry.dispose();
      nebulaGeometry.dispose();
      galaxyMaterial.dispose();
      nebulaMaterial.dispose();
    },
    [galaxyGeometry, nebulaGeometry, galaxyMaterial, nebulaMaterial],
  );

  useFrame(({ clock, camera }) => {
    const uniforms = uniformsRef.current;
    const nebulaUniforms = nebulaUniformsRef.current;
    if (!uniforms || !nebulaUniforms) return;
    uniforms.uTime.value = clock.elapsedTime;
    nebulaUniforms.uTime.value = clock.elapsedTime;
    uniforms.uRotation.value = galaxy.rotationSpeed;
    uniforms.uEnergy.value = galaxy.energy;
    uniforms.uSize.value = galaxy.particleSize;
    uniforms.uGlow.value = 0.85 * galaxy.coreIntensity;
    const fade = fadeNearSystem(camera);
    uniforms.uOpacity.value = fade;
    nebulaUniforms.uOpacity.value = fade * 0.9;
    if (coreRef.current) {
      const material = coreRef.current.material as THREE.SpriteMaterial;
      material.opacity = 0.5 * galaxy.coreIntensity * fade;
      coreRef.current.scale.setScalar(4 + galaxy.coreIntensity * 2.5);
    }
    if (galaxyRef.current) galaxyRef.current.visible = fade > 0.01;
    if (nebulaRef.current) nebulaRef.current.visible = fade > 0.01;
  });

  return (
    <group>
      <points ref={galaxyRef} geometry={galaxyGeometry} material={galaxyMaterial} frustumCulled={false} />
      <points ref={nebulaRef} geometry={nebulaGeometry} material={nebulaMaterial} frustumCulled={false} />
      <sprite ref={coreRef}>
        <spriteMaterial
          map={coreTexture}
          color="#ffe2b0"
          transparent
          opacity={0.5}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <Selectable id="milky-way" hitRadius={0.45}>
        {labels && <ObjectLabel id="milky-way" name="Milky Way" small />}
      </Selectable>
    </group>
  );
}
