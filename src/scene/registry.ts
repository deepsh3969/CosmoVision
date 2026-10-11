import * as THREE from 'three';

/**
 * Bridge between React scene graph and non-React systems (camera rig, labels, HUD).
 * Scene nodes register a live world-position provider on mount and unregister on unmount.
 * Nothing here triggers React re-renders.
 */
export interface ObjectProvider {
  radius: number;
  getPosition: (out: THREE.Vector3) => THREE.Vector3;
}

const providers = new Map<string, ObjectProvider>();

export function registerObject(id: string, provider: ObjectProvider): void {
  providers.set(id, provider);
}

export function unregisterObject(id: string): void {
  providers.delete(id);
}

export function isRegistered(id: string): boolean {
  return providers.has(id);
}

export function providerCount(): number {
  return providers.size;
}

const scratch = new THREE.Vector3();

/** Live world position of a registered object, or `null` when it is not in the scene. */
export function getObjectWorldPosition(id: string | null | undefined, out: THREE.Vector3): THREE.Vector3 | null {
  if (!id) return null;
  const provider = providers.get(id);
  if (!provider) return null;
  return provider.getPosition(out);
}

export function getObjectWorldRadius(id: string | null | undefined): number | null {
  if (!id) return null;
  return providers.get(id)?.radius ?? null;
}

export function measureDistance(a: THREE.Vector3, id: string | null | undefined): number | null {
  const provider = id ? providers.get(id) : undefined;
  if (!provider) return null;
  return provider.getPosition(scratch).distanceTo(a);
}

export function clearRegistry(): void {
  providers.clear();
}
