import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  BoxGeometry,
  BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial
} from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

globalThis.FileReader ??= class {
  result = null;
  onloadend = null;
  onerror = null;

  async readAsArrayBuffer(blob) {
    try {
      this.result = await blob.arrayBuffer();
      this.onloadend?.({ target: this });
    } catch (error) {
      this.onerror?.(error);
    }
  }
};

const exporter = new GLTFExporter();

const materials = {
  droneHull: material('#ff3ea5', '#8f1556', 0.82, 0.24),
  droneArmor: material('#35152e', '#17061a', 0.45, 0.36),
  skimmerHull: material('#27d8ff', '#0d5c8f', 0.62, 0.22),
  skimmerCore: material('#9b5cff', '#4a1cff', 1.18, 0.18),
  sentinelHull: material('#ff8a3d', '#8f3512', 0.92, 0.36),
  sentinelArmor: material('#251a21', '#12070c', 0.45, 0.48),
  wraithHull: material('#9b5cff', '#4a1cff', 1.05, 0.2),
  wraithDark: material('#121a32', '#071024', 0.42, 0.4)
};

const enemies = [
  {
    filename: 'enemy-drone.glb',
    group: createDrone()
  },
  {
    filename: 'enemy-skimmer.glb',
    group: createSkimmer()
  },
  {
    filename: 'enemy-sentinel.glb',
    group: createSentinel()
  },
  {
    filename: 'enemy-wraith.glb',
    group: createWraith()
  }
];

for (const enemy of enemies) {
  const outputPath = resolve('public/models/enemies', enemy.filename);
  await mkdir(dirname(outputPath), { recursive: true });
  const glb = await exporter.parseAsync(enemy.group, { binary: true, onlyVisible: true, trs: false });
  await writeFile(outputPath, Buffer.from(glb));
  console.log(`Generated ${outputPath}`);
}

function createDrone() {
  const group = namedGroup('stormraider_enemy_drone_blockout');
  addMesh(group, 'body_core', new ConeGeometry(0.22, 0.66, 5), materials.droneHull, [0, 0.16, 0.03], [0, 0, 0]);
  addMesh(group, 'rear_block', new BoxGeometry(0.36, 0.36, 0.16), materials.droneArmor, [0, -0.18, -0.02], [0, 0, 0]);
  addPrism(group, 'left_claw_wing', [[-0.12, 0.08], [-0.52, -0.02], [-0.42, -0.26], [-0.16, -0.16]], 0.08, materials.droneHull, 0.03);
  addPrism(group, 'right_claw_wing', [[0.12, 0.08], [0.52, -0.02], [0.42, -0.26], [0.16, -0.16]], 0.08, materials.droneHull, 0.03);
  addMesh(group, 'center_eye', new BoxGeometry(0.13, 0.13, 0.08), materials.skimmerCore, [0, 0.14, 0.16], [0, 0, Math.PI / 4]);
  addMesh(group, 'tail_nozzle', new CylinderGeometry(0.07, 0.1, 0.08, 6), materials.droneArmor, [0, -0.42, -0.02], [Math.PI / 2, 0, 0]);
  return group;
}

function createSkimmer() {
  const group = namedGroup('stormraider_enemy_skimmer_blockout');
  addMesh(group, 'needle_body', new BoxGeometry(0.2, 0.78, 0.13), materials.skimmerHull, [0, 0.02, 0.02], [0, 0, 0]);
  addMesh(group, 'nose_spike', new ConeGeometry(0.13, 0.42, 5), materials.skimmerHull, [0, 0.56, 0.04], [0, 0, 0]);
  addPrism(group, 'left_knife_wing', [[-0.08, 0.12], [-0.62, -0.12], [-0.74, -0.32], [-0.16, -0.2]], 0.07, materials.skimmerCore, 0.02);
  addPrism(group, 'right_knife_wing', [[0.08, 0.12], [0.62, -0.12], [0.74, -0.32], [0.16, -0.2]], 0.07, materials.skimmerCore, 0.02);
  addMesh(group, 'left_tip', new BoxGeometry(0.08, 0.24, 0.08), materials.skimmerHull, [-0.63, -0.28, 0.04], [0, 0, -0.36]);
  addMesh(group, 'right_tip', new BoxGeometry(0.08, 0.24, 0.08), materials.skimmerHull, [0.63, -0.28, 0.04], [0, 0, 0.36]);
  addMesh(group, 'rear_thruster', new CylinderGeometry(0.06, 0.09, 0.08, 6), materials.wraithDark, [0, -0.46, -0.02], [Math.PI / 2, 0, 0]);
  return group;
}

function createSentinel() {
  const group = namedGroup('stormraider_enemy_sentinel_blockout');
  addMesh(group, 'heavy_core', new BoxGeometry(0.42, 0.74, 0.22), materials.sentinelHull, [0, 0, 0.03], [0, 0, 0]);
  addMesh(group, 'front_armor', new ConeGeometry(0.24, 0.38, 5), materials.sentinelArmor, [0, 0.5, 0.05], [0, 0, 0]);
  addMesh(group, 'left_shoulder', new BoxGeometry(0.34, 0.32, 0.16), materials.sentinelArmor, [-0.34, -0.06, 0.02], [0, 0, -0.18]);
  addMesh(group, 'right_shoulder', new BoxGeometry(0.34, 0.32, 0.16), materials.sentinelArmor, [0.34, -0.06, 0.02], [0, 0, 0.18]);
  addPrism(group, 'left_guard_fin', [[-0.2, -0.18], [-0.64, -0.26], [-0.58, -0.52], [-0.2, -0.42]], 0.09, materials.sentinelHull, 0.06);
  addPrism(group, 'right_guard_fin', [[0.2, -0.18], [0.64, -0.26], [0.58, -0.52], [0.2, -0.42]], 0.09, materials.sentinelHull, 0.06);
  addMesh(group, 'center_cannon', new CylinderGeometry(0.06, 0.08, 0.46, 6), materials.droneArmor, [0, 0.28, 0.18], [Math.PI / 2, 0, 0]);
  addMesh(group, 'rear_nozzle_l', new CylinderGeometry(0.06, 0.09, 0.08, 6), materials.sentinelArmor, [-0.16, -0.46, -0.03], [Math.PI / 2, 0, 0]);
  addMesh(group, 'rear_nozzle_r', new CylinderGeometry(0.06, 0.09, 0.08, 6), materials.sentinelArmor, [0.16, -0.46, -0.03], [Math.PI / 2, 0, 0]);
  return group;
}

function createWraith() {
  const group = namedGroup('stormraider_enemy_wraith_blockout');
  addMesh(group, 'long_spine', new BoxGeometry(0.18, 1.04, 0.14), materials.wraithHull, [0, 0.02, 0.04], [0, 0, 0]);
  addMesh(group, 'black_keel', new BoxGeometry(0.3, 0.82, 0.08), materials.wraithDark, [0, -0.06, -0.04], [0, 0, 0]);
  addMesh(group, 'front_blade', new ConeGeometry(0.16, 0.5, 5), materials.wraithHull, [0, 0.66, 0.06], [0, 0, 0]);
  addPrism(group, 'left_ghost_wing', [[-0.1, 0.2], [-0.45, -0.08], [-0.38, -0.44], [-0.12, -0.26]], 0.06, materials.wraithDark, 0.06);
  addPrism(group, 'right_ghost_wing', [[0.1, 0.2], [0.45, -0.08], [0.38, -0.44], [0.12, -0.26]], 0.06, materials.wraithDark, 0.06);
  addMesh(group, 'violet_eye', new BoxGeometry(0.11, 0.16, 0.08), materials.wraithHull, [0, 0.24, 0.16], [0, 0, Math.PI / 4]);
  addMesh(group, 'split_tail_l', new BoxGeometry(0.08, 0.32, 0.08), materials.wraithHull, [-0.1, -0.62, 0.06], [0, 0, -0.16]);
  addMesh(group, 'split_tail_r', new BoxGeometry(0.08, 0.32, 0.08), materials.wraithHull, [0.1, -0.62, 0.06], [0, 0, 0.16]);
  return group;
}

function namedGroup(name) {
  const group = new Group();
  group.name = name;
  return group;
}

function material(color, emissive, emissiveIntensity, metalness) {
  return new MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity,
    flatShading: true,
    metalness,
    roughness: 0.5
  });
}

function addMesh(group, name, geometry, mat, position, rotation) {
  const mesh = new Mesh(geometry, mat);
  mesh.name = name;
  mesh.position.set(position[0], position[1], position[2]);
  mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
  group.add(mesh);
}

function addPrism(group, name, points, thickness, mat, zCenter) {
  const half = thickness / 2;
  const topZ = zCenter + half;
  const bottomZ = zCenter - half;
  const positions = [];
  for (const [x, y] of points) {
    positions.push(x, y, topZ);
  }
  for (const [x, y] of points) {
    positions.push(x, y, bottomZ);
  }

  const indices = [
    0, 1, 2, 0, 2, 3,
    7, 6, 5, 7, 5, 4,
    0, 4, 5, 0, 5, 1,
    1, 5, 6, 1, 6, 2,
    2, 6, 7, 2, 7, 3,
    3, 7, 4, 3, 4, 0
  ];
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  addMesh(group, name, geometry, mat, [0, 0, 0], [0, 0, 0]);
}
