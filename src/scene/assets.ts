// Loads Tripo GLB models listed in public/models/manifest.json. Missing models fall back to procedural props.
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface ModelEntry {
  file: string;
  /** For the creature: clip names per role, head bone name. */
  roles?: Record<string, string>;
  headBone?: string;
}
export type Manifest = Record<string, ModelEntry>;

export const models = new Map<string, GLTF>();
export let manifest: Manifest = {};

export async function loadModels(onProgress?: (done: number, total: number) => void): Promise<void> {
  try {
    const res = await fetch('./models/manifest.json', { cache: 'no-cache' });
    if (!res.ok) return;
    manifest = (await res.json()) as Manifest;
  } catch {
    return;
  }
  const loader = new GLTFLoader();
  const entries = Object.entries(manifest);
  let done = 0;
  await Promise.all(
    entries.map(async ([key, e]) => {
      try {
        const gltf = await loader.loadAsync('./models/' + e.file);
        models.set(key, gltf);
      } catch (err) {
        console.warn('model failed', key, err);
      }
      onProgress?.(++done, entries.length);
    }),
  );
}

/** A normalized copy of a static model: base on y = 0, centred in XZ, scaled to `height` (or `width`). */
export function propInstance(key: string, size: { height?: number; width?: number; rotX?: number }): THREE.Object3D | null {
  const g = models.get(key);
  if (!g) return null;
  const inner = g.scene.clone(true);
  const obj = new THREE.Group();
  obj.add(inner);
  // Optional tilt correction (e.g. the Tripo nest's opening leans forward).
  if (size.rotX) inner.rotation.x = size.rotX;
  const box = new THREE.Box3().setFromObject(obj);
  const s = box.getSize(new THREE.Vector3());
  const k = size.height ? size.height / s.y : (size.width ?? 1) / Math.max(s.x, s.z);
  obj.scale.multiplyScalar(k);
  const box2 = new THREE.Box3().setFromObject(obj);
  const c = box2.getCenter(new THREE.Vector3());
  obj.position.set(-c.x, -box2.min.y, -c.z);
  const wrap = new THREE.Group();
  wrap.add(obj);
  wrap.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return wrap;
}
