import {
  BufferGeometry,
  DynamicDrawUsage,
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
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
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
  [4, 'enemy_bulwark'],
  [10, 'boss_01'],
  [11, 'boss_02'],
  [12, 'boss_03']
]);

export class EnemyModelBatch {
  readonly object = new Group();

  private readonly batches = new Map<number, EnemyModelPartBatch[]>();
  private readonly matrix = new Matrix4();
  private readonly warmupMatrix = new Matrix4();
  private readonly position = new Vector3();
  private readonly rotation = new Quaternion();
  private readonly scale = new Vector3();
  private readonly writeCounts = new Uint16Array(16);
  private readonly previousCounts = new Uint16Array(16);
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

    this.writeCounts.fill(0);
    for (let i = 0; i < count; i += 1) {
      const snapshot = snapshots[i];
      if (!snapshot) {
        continue;
      }

      const batches = this.batches.get(snapshot.variant);
      if (!batches) {
        continue;
      }

      const nextIndex = this.writeCounts[snapshot.variant] ?? 0;
      if (nextIndex >= ENEMY_MODEL_LIMIT) {
        continue;
      }

      this.position.set(snapshot.x, snapshot.y, snapshot.z);
      this.rotation.setFromAxisAngle(Z_AXIS, snapshot.bank);
      this.scale.setScalar(snapshot.scale * batches[0].slotScale);
      this.matrix.compose(this.position, this.rotation, this.scale);
      for (const batch of batches) {
        batch.mesh.setMatrixAt(nextIndex, this.matrix);
      }
      this.writeCounts[snapshot.variant] = nextIndex + 1;
    }

    for (const [variant, batches] of this.batches) {
      const instanceCount = this.writeCounts[variant] ?? 0;
      const previousCount = this.previousCounts[variant] ?? 0;
      if (instanceCount === 0 && previousCount === 0) {
        continue;
      }

      for (const batch of batches) {
        batch.mesh.count = instanceCount;
        if (instanceCount > 0) {
          batch.mesh.instanceMatrix.needsUpdate = true;
        }
      }
      this.previousCounts[variant] = instanceCount;
    }
  }

  primeForRenderWarmup(): void {
    this.warmupMatrix.makeScale(0.001, 0.001, 0.001);
    this.warmupMatrix.setPosition(9999, 9999, -9999);
    for (const batches of this.batches.values()) {
      for (const batch of batches) {
        batch.mesh.count = 1;
        batch.mesh.setMatrixAt(0, this.warmupMatrix);
        batch.mesh.instanceMatrix.needsUpdate = true;
      }
    }
    this.previousCounts.fill(1);
  }

  clearRenderWarmup(): void {
    for (const batches of this.batches.values()) {
      for (const batch of batches) {
        batch.mesh.count = 0;
      }
    }
    this.previousCounts.fill(0);
  }
}

function createPartBatches(root: Object3D, slotScale: number): EnemyModelPartBatch[] {
  const groupedParts = new Map<string, { geometries: BufferGeometry[]; material: Material }>();
  root.traverse((child) => {
    if (!(child instanceof Mesh) || !child.geometry || !child.material) {
      return;
    }

    const geometry = child.geometry.clone() as BufferGeometry;
    geometry.applyMatrix4(child.matrixWorld);
    normalizeBatchGeometry(geometry);
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();

    const material = cloneFirstMaterial(child.material);
    const key = materialBatchKey(material);
    const group = groupedParts.get(key);
    if (group) {
      group.geometries.push(geometry);
      return;
    }
    groupedParts.set(key, { geometries: [geometry], material });
  });

  const batches: EnemyModelPartBatch[] = [];
  for (const group of groupedParts.values()) {
    const geometry = group.geometries.length === 1
      ? group.geometries[0]
      : mergeGeometries(group.geometries, false);
    if (!geometry) {
      continue;
    }
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();
    const mesh = new InstancedMesh(geometry, group.material, ENEMY_MODEL_LIMIT);
    mesh.count = 0;
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    batches.push({ mesh, slotScale });
  }
  return batches;
}

function normalizeBatchGeometry(geometry: BufferGeometry): void {
  const attributeNames = Object.keys(geometry.attributes);
  for (const name of attributeNames) {
    if (name !== 'position' && name !== 'normal') {
      geometry.deleteAttribute(name);
    }
  }
  if (!geometry.getAttribute('normal')) {
    geometry.computeVertexNormals();
  }
}

function cloneFirstMaterial(material: Material | Material[]): Material {
  if (Array.isArray(material)) {
    return material[0]?.clone() ?? new MeshStandardMaterial({ color: '#ff3ea5', flatShading: true });
  }
  return material.clone();
}

function materialBatchKey(material: Material): string {
  if (material instanceof MeshStandardMaterial) {
    return [
      'standard',
      material.color.getHexString(),
      material.emissive.getHexString(),
      material.emissiveIntensity.toFixed(2),
      material.metalness.toFixed(2),
      material.roughness.toFixed(2),
      material.opacity.toFixed(2),
      material.transparent ? 't' : 'o'
    ].join('|');
  }
  return `${material.type}|${material.name || material.uuid}`;
}

function resolveAssetUrl(url: string): string {
  if (/^https?:\/\//.test(url) || url.startsWith('/')) {
    return url;
  }
  const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
  return `${base}${url.replace(/^\/+/, '')}`;
}
