import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { CELESTIAL_OBJECTS, getObject, WORLD } from '../data/celestialObjects';
import { getQualityProfile } from '../data/galaxyPresets';
import { degToRad } from '../lib/math';
import { arcPoints, orbitAngle, phaseFor, spinAngle } from '../simulation/orbits';
import { simulationClock, useAppStore } from '../store/useAppStore';
import type { CelestialObject } from '../types';
import { createGlowTexture, getEarthCloudTexture, getPlanetTexture, getRingTexture } from './textures';
import { objectLocalPosition, objectWorldPosition } from './objectPosition';
import { registerObject, unregisterObject } from './registry';
import { ObjectLabel } from './ObjectLabel';
import { Selectable } from './Selectable';

const ANCHOR = new THREE.Vector3(...WORLD.systemPosition);

const unitCircleGeometry = (() => {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i < 160; i += 1) {
    const angle = (i / 160) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)));
  }
  return new THREE.BufferGeometry().setFromPoints(points);
})();

const unitArcGeometry = (() => {
  const points: THREE.Vector3[] = [];
  const raw = arcPoints({ radius: 1, start: 0, sweep: 1 }, 32);
  for (let i = 0; i < raw.length; i += 3) {
    points.push(new THREE.Vector3(raw[i], raw[i + 1], raw[i + 2]));
  }
  return new THREE.BufferGeometry().setFromPoints(points);
})();

const TRAIL_SWEEP = Math.PI * 0.5;

function createTrailLine(color: string): THREE.Line {
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });
  return new THREE.Line(unitArcGeometry, material);
}

/** RingGeometry ships with planar UVs; rings need radial UVs so the band texture wraps correctly. */
function createRingGeometry(inner: number, outer: number, segments = 96): THREE.RingGeometry {
  const geometry = new THREE.RingGeometry(inner, outer, segments, 1);
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);
    const radius = Math.sqrt(x * x + y * y);
    uv.setXY(i, (radius - inner) / (outer - inner), 0.5);
  }
  uv.needsUpdate = true;
  return geometry;
}

function OrbitPath({ radius, inclination, color }: { radius: number; inclination: number; color: string }) {
  return (
    <group rotation={[-degToRad(inclination), 0, 0]}>
      <lineLoop geometry={unitCircleGeometry} scale={[radius, 1, radius]}>
        <lineBasicMaterial color={color} transparent opacity={0.35} depthWrite={false} />
      </lineLoop>
    </group>
  );
}

function TrailArc({
  radius,
  inclination,
  color,
  angleRef,
}: {
  radius: number;
  inclination: number;
  color: string;
  angleRef: { current: number };
}) {
  const line = useMemo(() => createTrailLine(color), [color]);
  useFrame(() => {
    line.rotation.y = TRAIL_SWEEP - angleRef.current;
  });
  useEffect(() => () => line.dispose(), [line]);
  return (
    <group rotation={[-degToRad(inclination), 0, 0]} scale={[radius, 1, radius]}>
      <primitive object={line} />
    </group>
  );
}

interface BodyNodeProps {
  object: CelestialObject;
}

function useBodyRegistration(object: CelestialObject) {
  const live = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => {
    objectWorldPosition(object, simulationClock.simDays, live);
    registerObject(object.id, {
      radius: object.visualRadius,
      getPosition: (out) => out.copy(live),
    });
    return () => unregisterObject(object.id);
  }, [object, live]);
  return live;
}

function PlanetNode({ object }: BodyNodeProps) {
  const live = useBodyRegistration(object);
  const groupRef = useRef<THREE.Group>(null!);
  const spinRef = useRef<THREE.Mesh>(null!);
  const cloudRef = useRef<THREE.Mesh>(null!);
  const trails = useAppStore((state) => state.trails);
  const labels = useAppStore((state) => state.labels);
  const selected = useAppStore((state) => state.selectedId === object.id);
  const angleRef = useRef(0);

  const texture = useMemo(() => (object.texture ? getPlanetTexture(object.texture) : null), [object.texture]);
  const cloudTexture = useMemo(() => (object.id === 'earth' ? getEarthCloudTexture() : null), [object.id]);
  const ringTexture = useMemo(
    () => (object.ring ? getRingTexture(object.ring.color, object.ring.faint) : null),
    [object.ring],
  );
  const ringGeometry = useMemo(
    () => (object.ring ? createRingGeometry(object.ring.inner, object.ring.outer) : null),
    [object.ring],
  );
  useEffect(() => () => ringGeometry?.dispose(), [ringGeometry]);

  const orbit = object.orbit;
  const inclination = orbit?.inclinationDeg ?? 0;

  useFrame(() => {
    const days = simulationClock.simDays;
    const local = objectLocalPosition(object, days);
    if (groupRef.current) groupRef.current.position.set(local.x, local.y, local.z);
    live.set(local.x + ANCHOR.x, local.y + ANCHOR.y, local.z + ANCHOR.z);
    angleRef.current = orbit ? orbitAngle(days, orbit.visualPeriodDays, phaseFor(object.id)) : 0;
    if (spinRef.current) spinRef.current.rotation.y = spinAngle(days, object.visualSpinRate ?? 0.2, phaseFor(object.id));
    if (cloudRef.current) cloudRef.current.rotation.y = spinRef.current.rotation.y * 1.2 + 0.6;
  });

  const hitRadius = object.visualRadius * 2.1 + 0.004;

  return (
    <>
      {orbit && <OrbitPath radius={orbit.visualRadius} inclination={inclination} color={object.color} />}
      {trails && orbit && (
        <TrailArc radius={orbit.visualRadius} inclination={inclination} color={object.color} angleRef={angleRef} />
      )}
      <group ref={groupRef}>
        <Selectable id={object.id} hitRadius={hitRadius}>
          <group rotation={[0, 0, -degToRad(object.axialTiltDeg ?? 0)]}>
            <mesh ref={spinRef} scale={object.visualRadius}>
              <sphereGeometry args={[1, 48, 32]} />
              <meshStandardMaterial
                map={texture ?? undefined}
                color={texture ? '#ffffff' : object.color}
                roughness={0.95}
                metalness={0}
                emissive={selected ? new THREE.Color(object.color) : new THREE.Color('#000000')}
                emissiveIntensity={selected ? 0.35 : 0}
              />
            </mesh>
            {cloudTexture && (
              <mesh ref={cloudRef} scale={object.visualRadius * 1.018}>
                <sphereGeometry args={[1, 32, 24]} />
                <meshStandardMaterial
                  map={cloudTexture}
                  transparent
                  opacity={0.75}
                  depthWrite={false}
                  roughness={1}
                />
              </mesh>
            )}
            {object.id === 'earth' && (
              <mesh scale={object.visualRadius * 1.055}>
                <sphereGeometry args={[1, 32, 24]} />
                <meshBasicMaterial
                  color="#5aa2ff"
                  transparent
                  opacity={0.16}
                  side={THREE.BackSide}
                  blending={THREE.AdditiveBlending}
                  depthWrite={false}
                />
              </mesh>
            )}
            {ringTexture && ringGeometry && (
              <mesh rotation={[-Math.PI / 2, 0, 0]} scale={object.visualRadius}>
                <primitive object={ringGeometry} attach="geometry" />
                <meshStandardMaterial
                  map={ringTexture}
                  transparent
                  opacity={object.ring?.faint ? 0.55 : 0.92}
                  side={THREE.DoubleSide}
                  depthWrite={false}
                  roughness={1}
                />
              </mesh>
            )}
          </group>
          {labels && <ObjectLabel id={object.id} name={object.name} />}
        </Selectable>
      </group>
    </>
  );
}

function MoonNode({ object }: BodyNodeProps) {
  const live = useBodyRegistration(object);
  const groupRef = useRef<THREE.Group>(null!);
  const ringGroupRef = useRef<THREE.Group>(null!);
  const spinRef = useRef<THREE.Mesh>(null!);
  const labels = useAppStore((state) => state.labels);
  const focusedId = useAppStore((state) => state.focusedId);
  const showLabel = labels && (focusedId === object.id || focusedId === object.parent);
  const selected = useAppStore((state) => state.selectedId === object.id);

  const texture = useMemo(() => (object.texture ? getPlanetTexture(object.texture) : null), [object.texture]);
  const orbit = object.orbit;
  const parent = getObject(object.parent ?? undefined);

  useFrame(() => {
    const days = simulationClock.simDays;
    const local = objectLocalPosition(object, days);
    if (groupRef.current) groupRef.current.position.set(local.x, local.y, local.z);
    live.set(local.x + ANCHOR.x, local.y + ANCHOR.y, local.z + ANCHOR.z);
    if (parent && ringGroupRef.current) {
      const base = objectLocalPosition(parent, days);
      ringGroupRef.current.position.set(base.x, base.y, base.z);
    }
    if (spinRef.current) spinRef.current.rotation.y = spinAngle(days, object.visualSpinRate ?? 0.1, phaseFor(object.id));
  });

  return (
    <>
      {orbit && parent && (
        <group ref={ringGroupRef}>
          <OrbitPath radius={orbit.visualRadius} inclination={orbit.inclinationDeg} color={object.color} />
        </group>
      )}
      <group ref={groupRef}>
        <Selectable id={object.id} hitRadius={object.visualRadius * 3 + 0.006}>
          <mesh ref={spinRef} scale={object.visualRadius}>
            <sphereGeometry args={[1, 32, 24]} />
            <meshStandardMaterial
              map={texture ?? undefined}
              color={texture ? '#ffffff' : object.color}
              roughness={1}
              metalness={0}
              emissive={selected ? new THREE.Color(object.color) : new THREE.Color('#000000')}
              emissiveIntensity={selected ? 0.3 : 0}
            />
          </mesh>
          {showLabel && <ObjectLabel id={object.id} name={object.name} small />}
        </Selectable>
      </group>
    </>
  );
}

function SunNode({ object }: BodyNodeProps) {
  const live = useBodyRegistration(object);
  const glowTexture = useMemo(() => createGlowTexture(256, 'rgba(255,236,190,1)', 'rgba(255,180,90,0)'), []);
  const labels = useAppStore((state) => state.labels);
  const selected = useAppStore((state) => state.selectedId === object.id);

  useFrame(() => {
    live.copy(ANCHOR);
  });

  return (
    <group>
      <pointLight intensity={6} decay={0} distance={0} color="#fff3df" />
      <Selectable id={object.id} hitRadius={object.visualRadius * 2.2 + 0.006}>
        <mesh scale={object.visualRadius}>
          <sphereGeometry args={[1, 48, 32]} />
          <meshBasicMaterial color={selected ? '#ffffff' : '#ffe6a8'} />
        </mesh>
        <sprite scale={object.visualRadius * 7.5}>
          <spriteMaterial
            map={glowTexture}
            color="#ffcf82"
            transparent
            opacity={0.85}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
        <sprite scale={object.visualRadius * 16}>
          <spriteMaterial
            map={glowTexture}
            color="#ff9d4d"
            transparent
            opacity={0.28}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
        {labels && <ObjectLabel id={object.id} name={object.name} />}
      </Selectable>
      <ambientLight intensity={0.12} />
    </group>
  );
}

interface BeltSpec {
  inner: number;
  outer: number;
  count: number;
  minSize: number;
  maxSize: number;
  periodDays: number;
  seed: number;
}

function Belt({ object, spec }: { object: CelestialObject; spec: BeltSpec }) {
  const quality = useAppStore((state) => state.quality);
  const profile = getQualityProfile(quality);
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const groupRef = useRef<THREE.Group>(null!);
  const live = useBodyRegistration(object);

  const count = Math.max(48, Math.round(spec.count * profile.beltScale));
  const geometry = useMemo(() => new THREE.DodecahedronGeometry(1, 0), []);
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color: object.color, roughness: 1, metalness: 0, flatShading: true }),
    [object.color],
  );

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    let seed = spec.seed;
    const random = (): number => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const euler = new THREE.Euler();
    for (let i = 0; i < count; i += 1) {
      const t = random();
      const radius = spec.inner + (spec.outer - spec.inner) * Math.sqrt(t);
      const angle = random() * Math.PI * 2;
      position.set(Math.cos(angle) * radius, (random() - 0.5) * 0.06, Math.sin(angle) * radius);
      const size = spec.minSize + random() * (spec.maxSize - spec.minSize);
      scale.set(size, size * (0.7 + random() * 0.6), size);
      euler.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
      quaternion.setFromEuler(euler);
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.count = count;
    mesh.computeBoundingSphere();
  }, [count, spec]);

  useFrame(() => {
    const days = simulationClock.simDays;
    if (groupRef.current) groupRef.current.rotation.y = (Math.PI * 2 * days) / spec.periodDays;
    live.copy(ANCHOR);
  });

  return (
    <group ref={groupRef}>
      <Selectable
        id={object.id}
        hitRadius={0}
        band={{ radius: (spec.inner + spec.outer) / 2, tube: (spec.outer - spec.inner) / 2 + 0.08 }}
      >
        <instancedMesh ref={meshRef} args={[geometry, material, count]} frustumCulled={false} />
      </Selectable>
    </group>
  );
}

function SystemMarker() {
  const [visible, setVisible] = useState(true);
  const glowTexture = useMemo(() => createGlowTexture(128, 'rgba(170,215,255,1)', 'rgba(80,140,255,0)'), []);
  const labels = useAppStore((state) => state.labels);

  useFrame(({ camera }) => {
    const distance = camera.position.distanceTo(ANCHOR);
    const next = distance > 5;
    if (next !== visible) setVisible(next);
  });

  if (!visible) return null;

  return (
    <group position={[0, 0.85, 0]}>
      <Selectable id="solar-system" hitRadius={0.3}>
        <sprite scale={[0.55, 0.55, 1]}>
          <spriteMaterial
            map={glowTexture}
            color="#9fd0ff"
            transparent
            opacity={0.9}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
        {labels && <ObjectLabel id="solar-system" name="Solar System" />}
      </Selectable>
    </group>
  );
}

const BELT_SPECS: Record<string, BeltSpec> = {
  'main-belt': { inner: 1.75, outer: 2.15, count: 900, minSize: 0.005, maxSize: 0.017, periodDays: 1680, seed: 1337 },
  'kuiper-belt': { inner: 6.3, outer: 7.1, count: 650, minSize: 0.004, maxSize: 0.013, periodDays: 90000, seed: 90210 },
};

/**
 * The Solar System: Sun, eight planets, five moons, two instanced asteroid belts,
 * orbit paths, optional trails and selection targets — all driven by the simulation clock.
 */
export function SolarSystem() {
  const planets = useMemo(() => CELESTIAL_OBJECTS.filter((object) => object.category === 'planet'), []);
  const moons = useMemo(() => CELESTIAL_OBJECTS.filter((object) => object.category === 'moon'), []);
  const belts = useMemo(() => CELESTIAL_OBJECTS.filter((object) => object.category === 'belt'), []);
  const sun = useMemo(() => getObject('sol'), []);
  const liveSystem = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    liveSystem.copy(ANCHOR);
    registerObject('solar-system', {
      radius: getObject('solar-system')?.visualRadius ?? 7.4,
      getPosition: (out) => out.copy(liveSystem),
    });
    return () => unregisterObject('solar-system');
  }, [liveSystem]);

  if (!sun) return null;

  return (
    <group position={WORLD.systemPosition}>
      <SunNode object={sun} />
      <SystemMarker />
      {planets.map((planet) => (
        <PlanetNode key={planet.id} object={planet} />
      ))}
      {moons.map((moon) => (
        <MoonNode key={moon.id} object={moon} />
      ))}
      {belts.map((belt) => {
        const spec = BELT_SPECS[belt.id];
        return spec ? <Belt key={belt.id} object={belt} spec={spec} /> : null;
      })}
    </group>
  );
}
