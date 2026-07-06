import {
  BufferGeometry,
  Group,
  InstancedMesh,
  Material,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  Vector3
} from 'three';
import type { ModelDefinition } from '../data/GameConfig';
import type { EnemyRenderSnapshot } from '../gameplay/EnemyPool';

type EnemyModelSlots = Record<string, ModelDefinition>;

interface EnemyModelPartBatch {
  mesh: InstancedMesh;
  slotScale: number;
}

const ENEMY_MODEL_LIMIT = 48;
const Z_AXIS = new Vector3(0, 0, 1);
const ENEMY_SLOT_BY_VARIANT = new Map<number, string>([
  [0, 'enemy_drone'],
  [1, 'enemy_skimmer'],
  [2, 'enemy_sentinel'],
  [3, 'enemy_wraith'],
  [10, 'boss_01'],
  [11, 'boss_02'],
  [12, 'boss_03']
]);

export class EnemyModelBatch {
  readonly object = new Group();

  private readonly batches = new Map<number, EnemyModelPartBatch[]>();
  private readonly matrix = new Matrix4();
  private readonly position = new Vector3();
  private readonly rotation = new Quaternion();
  private readonly scale = new Vector3();
  private enabled = false;

  async load(slots: EnemyModelSlots): Promise<number[]> {
    const enabledEntries = [...ENEMY_SLOT_BY_VARIANT.entries()].filter(([, slotKey]) => slots[slotKey]?.enabled);
    if (enabledEntries.length === 0) {
      return [];
    }

    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
    const loader = new GLTFLoader();
    const loadedVariants: number[] = [];
    await Promise.all(
      enabledEntries.map(async ([variant, slotKey]) => {
        const slot = slots[slotKey];
        if (!slot) {
          return;
        }

        try {
          const gltf = await loader.loadAsync(resolveAssetUrl(slot.url));
          gltf.scene.rotation.set(slot.rotation[0], slot.rotation[1], slot.rotation[2]);
          gltf.scene.position.set(slot.offset[0], slot.offset[1], slot.offset[2]);
          gltf.scene.updateMatrixWorld(true);
          const batches = createPartBatches(gltf.scene, slot.scale);
          if (batches.length === 0) {
            return;
          }

          this.batches.set(variant, batches);
          for (const batch of batches) {
            this.object.add(batch.mesh);
          }
          loadedVariants.push(variant);
          this.enabled = true;
        } catch (error) {
          console.warn(`Enemy model slot ${slotKey} failed to load. Keeping procedural fallback.`, error);
        }
      })
    );
    return loadedVariants;
  }

  update(snapshots: EnemyRenderSnapshot[], count: number): void {
    if (!this.enabled) {
      return;
    }

    const writeCounts = new Map<number, number>();
    for (let i = 0; i < count; i += 1) {
      const snapshot = snapshots[i];
      if (!snapshot) {
        continue;
      }

      const batches = this.batches.get(snapshot.variant);
      if (!batches) {
        continue;
      }

      const nextIndex = writeCounts.get(snapshot.variant) ?? 0;
      if (nextIndex >= ENEMY_MODEL_LIMIT) {
        continue;
      }

      this.position.set(snapshot.x, snapshot.y, snapshot.z);
      this.rotation.setFromAxisAngle(Z_AXIS, snapshot.bank);
      for (const batch of batches) {
        this.scale.setScalar(snapshot.scale * batch.slotScale);
        this.matrix.compose(this.position, this.rotation, this.scale);
        batch.mesh.setMatrixAt(nextIndex, this.matrix);
      }
      writeCounts.set(snapshot.variant, nextIndex + 1);
    }

    for (const [variant, batches] of this.batches) {
      const instanceCount = writeCounts.get(variant) ?? 0;
      for (const batch of batches) {
        batch.mesh.count = instanceCount;
        batch.mesh.instanceMatrix.needsUpdate = true;
      }
    }
  }
}

function createPartBatches(root: Object3D, slotScale: number): EnemyModelPartBatch[] {
  const batches: EnemyModelPartBatch[] = [];
  root.traverse((child) => {
    if (!(child instanceof Mesh) || !child.geometry || !child.material) {
      return;
    }

    const geometry = child.geometry.clone() as BufferGeometry;
    geometry.applyMatrix4(child.matrixWorld);
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();

    const material = cloneFirstMaterial(child.material);
    const mesh = new InstancedMesh(geometry, material, ENEMY_MODEL_LIMIT);
    mesh.count = 0;
    mesh.frustumCulled = false;
    batches.push({ mesh, slotScale });
  });
  return batches;
}

function cloneFirstMaterial(material: Material | Material[]): Material {
  if (Array.isArray(material)) {
    return material[0]?.clone() ?? new MeshStandardMaterial({ color: '#ff3ea5', flatShading: true });
  }
  return material.clone();
}

function resolveAssetUrl(url: string): string {
  if (/^https?:\/\//.test(url) || url.startsWith('/')) {
    return url;
  }
  const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
  return `${base}${url.replace(/^\/+/, '')}`;
}
