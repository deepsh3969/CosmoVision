import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';

import { focusDistanceFor, getObject, minDistanceFor } from '../data/celestialObjects';
import {
  cameraLookTarget,
  cameraPosition,
  clampPan,
  DEFAULT_LIMITS,
  DEFAULT_PHI,
  DEFAULT_RADIUS,
  DEFAULT_THETA,
  initialCameraState,
  intentFrom,
  orbitDrag,
  pinchZoom,
  stepCamera,
  zoomBy,
  type CameraIntent,
  type CameraLimits,
  type CameraState,
} from '../navigation/cameraMath';
import { simulationClock, useAppStore } from '../store/useAppStore';
import { objectWorldPosition } from './objectPosition';
import { getObjectWorldPosition } from './registry';

export interface CameraCommandHandlers {
  reset: () => void;
  zoom: (notches: number) => void;
  orbit: (dx: number, dy: number) => void;
  tilt: (dy: number) => void;
}

/**
 * UI and keyboard shortcuts talk to the camera through this handle so React panels
 * never have to reach into the render loop.
 */
export const cameraCommands: {
  handlers: CameraCommandHandlers | null;
  register(handlers: CameraCommandHandlers): () => void;
  reset(): void;
  zoom(notches: number): void;
  orbit(dx: number, dy: number): void;
  tilt(dy: number): void;
} = {
  handlers: null,
  register(handlers) {
    this.handlers = handlers;
    return () => {
      if (this.handlers === handlers) this.handlers = null;
    };
  },
  reset() {
    this.handlers?.reset();
  },
  zoom(notches: number) {
    this.handlers?.zoom(notches);
  },
  orbit(dx: number, dy: number) {
    this.handlers?.orbit(dx, dy);
  },
  tilt(dy: number) {
    this.handlers?.tilt(dy);
  },
};

const scratch = new THREE.Vector3();

function resolveWorldPosition(id: string, out: THREE.Vector3): THREE.Vector3 {
  const live = getObjectWorldPosition(id, out);
  if (live) return live;
  const object = getObject(id);
  if (!object) return out.set(0, 0, 0);
  return objectWorldPosition(object, simulationClock.simDays, out);
}

/**
 * Frame-rate independent camera: spherical orbit around a damped focus point.
 *  - pointer drag orbits, wheel/pinch zooms, right-drag pans (overview only)
 *  - focusing retargets the orbit point and clamps distance to the body radius,
 *    so the camera can never enter a planet or get stuck in geometry
 *  - the camera always *looks at* the live object position, which keeps the
 *    destination visually centred for the whole transition
 */
export function CameraRig() {
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const focusedId = useAppStore((state) => state.focusedId);

  const stateRef = useRef<CameraState>(initialCameraState());
  const intentRef = useRef<CameraIntent>(intentFrom(initialCameraState()));
  const limitsRef = useRef<CameraLimits>({ ...DEFAULT_LIMITS });
  const lookIdRef = useRef<string | null>(null);
  const frameLookRef = useRef(new THREE.Vector3());
  const frameTargetRef = useRef(new THREE.Vector3());

  useEffect(() => {
    const intent = intentRef.current;
    const limits = limitsRef.current;
    const object = getObject(focusedId);

    if (!object) {
      lookIdRef.current = null;
      intent.tx = 0;
      intent.ty = 0;
      intent.tz = 0;
      intent.radius = DEFAULT_RADIUS;
      intent.theta = DEFAULT_THETA;
      intent.phi = DEFAULT_PHI;
      intent.panX = 0;
      intent.panY = 0;
      intent.panZ = 0;
      limits.minRadius = 1;
      limits.maxRadius = 150;
      return;
    }

    const target = resolveWorldPosition(object.id, scratch);
    intent.tx = target.x;
    intent.ty = target.y;
    intent.tz = target.z;
    intent.radius = focusDistanceFor(object);
    intent.panX = 0;
    intent.panY = 0;
    intent.panZ = 0;
    limits.minRadius = minDistanceFor(object);
    limits.maxRadius = object.category === 'galaxy' ? 150 : 60;
    lookIdRef.current = object.id;
  }, [focusedId]);

  useEffect(() => {
    const element = gl.domElement;
    const pointers = new Map<number, { x: number; y: number }>();
    let mode: 'none' | 'orbit' | 'pan' | 'pinch' = 'none';
    let last = { x: 0, y: 0 };
    let pinchStart = 0;
    let radiusStart = 0;
    let moveHandler: ((event: PointerEvent) => void) | null = null;
    let upHandler: ((event: PointerEvent) => void) | null = null;

    const detachWindow = () => {
      if (moveHandler) window.removeEventListener('pointermove', moveHandler);
      if (upHandler) window.removeEventListener('pointerup', upHandler);
      if (upHandler) window.removeEventListener('pointercancel', upHandler);
      moveHandler = null;
      upHandler = null;
    };

    const applyPan = (dx: number, dy: number) => {
      const state = stateRef.current;
      const target = frameTargetRef.current.set(
        state.tx + state.panX,
        state.ty + state.panY,
        state.tz + state.panZ,
      );
      const forward = scratch.copy(target).sub(camera.position).normalize();
      const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
      const up = new THREE.Vector3().crossVectors(right, forward).normalize();
      const k = state.radius * 0.0016;
      const pan = clampPan([
        state.panX - right.x * dx * k + up.x * dy * k,
        state.panY - right.y * dx * k + up.y * dy * k,
        state.panZ - right.z * dx * k + up.z * dy * k,
      ]);
      intentRef.current.panX = pan[0];
      intentRef.current.panY = pan[1];
      intentRef.current.panZ = pan[2];
    };

    const onPointerDown = (event: PointerEvent) => {
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size === 1) {
        last = { x: event.clientX, y: event.clientY };
        const wantsPan =
          (event.button === 2 || event.button === 1 || event.shiftKey) && !useAppStore.getState().focusedId;
        mode = wantsPan ? 'pan' : 'orbit';
        moveHandler = onPointerMove;
        upHandler = onPointerUp;
        window.addEventListener('pointermove', moveHandler);
        window.addEventListener('pointerup', upHandler);
        window.addEventListener('pointercancel', upHandler);
      } else if (pointers.size === 2) {
        mode = 'pinch';
        const [a, b] = [...pointers.values()];
        pinchStart = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
        radiusStart = intentRef.current.radius;
      }
    };

    function onPointerMove(event: PointerEvent) {
      if (!pointers.has(event.pointerId)) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (mode === 'pinch' && pointers.size >= 2) {
        const [a, b] = [...pointers.values()];
        const distance = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
        const limits = limitsRef.current;
        intentRef.current.radius = pinchZoom(
          radiusStart,
          distance / pinchStart,
          limits.minRadius,
          limits.maxRadius,
        );
        return;
      }

      const dx = event.clientX - last.x;
      const dy = event.clientY - last.y;
      last = { x: event.clientX, y: event.clientY };

      if (mode === 'orbit') {
        const next = orbitDrag(intentRef.current.theta, intentRef.current.phi, dx, dy, 0.005, limitsRef.current);
        intentRef.current.theta = next.theta;
        intentRef.current.phi = next.phi;
      } else if (mode === 'pan') {
        applyPan(dx, dy);
      }
    }

    function onPointerUp(event: PointerEvent) {
      pointers.delete(event.pointerId);
      if (pointers.size === 0) {
        mode = 'none';
        detachWindow();
        return;
      }
      if (pointers.size === 1) {
        mode = 'orbit';
        const [only] = [...pointers.values()];
        last = { ...only };
      }
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const limits = limitsRef.current;
      intentRef.current.radius = zoomBy(
        intentRef.current.radius,
        -event.deltaY * 0.01,
        limits.minRadius,
        limits.maxRadius,
      );
    };

    const onContextMenu = (event: Event) => event.preventDefault();

    element.addEventListener('pointerdown', onPointerDown);
    element.addEventListener('wheel', onWheel, { passive: false });
    element.addEventListener('contextmenu', onContextMenu);

    return () => {
      element.removeEventListener('pointerdown', onPointerDown);
      element.removeEventListener('wheel', onWheel);
      element.removeEventListener('contextmenu', onContextMenu);
      detachWindow();
      pointers.clear();
    };
  }, [camera, gl]);

  useEffect(() => {
    const handlers: CameraCommandHandlers = {
      reset: () => {
        const intent = intentRef.current;
        intent.theta = DEFAULT_THETA;
        intent.phi = DEFAULT_PHI;
        intent.panX = 0;
        intent.panY = 0;
        intent.panZ = 0;
        const object = getObject(lookIdRef.current);
        intent.radius = object ? focusDistanceFor(object) : DEFAULT_RADIUS;
      },
      zoom: (notches) => {
        const limits = limitsRef.current;
        intentRef.current.radius = zoomBy(intentRef.current.radius, notches, limits.minRadius, limits.maxRadius);
      },
      orbit: (dx, dy) => {
        const next = orbitDrag(intentRef.current.theta, intentRef.current.phi, dx, dy, 0.005, limitsRef.current);
        intentRef.current.theta = next.theta;
        intentRef.current.phi = next.phi;
      },
      tilt: (dy) => {
        const next = orbitDrag(intentRef.current.theta, intentRef.current.phi, 0, dy, 0.005, limitsRef.current);
        intentRef.current.phi = next.phi;
      },
    };
    return cameraCommands.register(handlers);
  }, []);

  useFrame((_, delta) => {
    const intent = intentRef.current;

    if (lookIdRef.current) {
      const live = getObjectWorldPosition(lookIdRef.current, frameLookRef.current);
      if (live) {
        intent.tx = live.x;
        intent.ty = live.y;
        intent.tz = live.z;
      }
    }

    const next = stepCamera(stateRef.current, intent, limitsRef.current, delta);
    stateRef.current = next;

    const [px, py, pz] = cameraPosition(next);
    camera.position.set(px, py, pz);

    if (lookIdRef.current) {
      const live = getObjectWorldPosition(lookIdRef.current, frameLookRef.current);
      if (live) {
        camera.lookAt(live);
        return;
      }
    }

    const [lx, ly, lz] = cameraLookTarget(next);
    camera.lookAt(lx, ly, lz);
  });

  return null;
}
