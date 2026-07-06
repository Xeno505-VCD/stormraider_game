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
  darkHull: material('#121a32', '#071024', 0.42, 0.42),
  blueHull: material('#1f79b8', '#0d5c8f', 0.78, 0.32),
  violetHull: material('#5b2dd8', '#4a1cff', 1.05, 0.24),
  orangeArmor: material('#ff8a3d', '#8f3512', 0.95, 0.36),
  pinkCore: material('#ff3ea5', '#8f1556', 1.2, 0.18),
  cyanCore: material('#27d8ff', '#0d5c8f', 1.28, 0.2),
  whiteCore: material('#d8fbff', '#27d8ff', 1.55, 0.14),
  warningCore: material('#ffcf7a', '#ff5c14', 1.42, 0.22),
  blackArmor: material('#211827', '#10070f', 0.42, 0.5)
};

const bosses = [
  {
    filename: 'boss-01.glb',
    group: createBroadCannonBoss()
  },
  {
    filename: 'boss-02.glb',
    group: createArmoredCarrierBoss()
  },
  {
    filename: 'boss-03.glb',
    group: createSpineFlagshipBoss()
  }
];

for (const boss of bosses) {
  const outputPath = resolve('public/models/boss', boss.filename);
  await mkdir(dirname(outputPath), { recursive: true });
  const glb = await exporter.parseAsync(boss.group, { binary: true, onlyVisible: true, trs: false });
  await writeFile(outputPath, Buffer.from(glb));
  console.log(`Generated ${outputPath}`);
}

function createBroadCannonBoss() {
  const group = namedGroup('stormraider_boss_01_broad_cannon_blockout');
  addMesh(group, 'central_command_hull', new BoxGeometry(0.88, 1.72, 0.34), materials.blueHull, [0, 0.04, 0.08], [0, 0, 0]);
  addMesh(group, 'front_knife_nose', new ConeGeometry(0.34, 0.9, 6), materials.blueHull, [0, 1.23, 0.12], [0, 0, 0]);
  addMesh(group, 'rear_reactor_block', new BoxGeometry(1.22, 0.68, 0.34), materials.darkHull, [0, -0.86, 0.02], [0, 0, 0]);
  addPrism(group, 'left_broad_wing', [[-0.38, 0.56], [-1.72, 0.08], [-1.55, -0.86], [-0.48, -0.54]], 0.16, materials.violetHull, 0.02);
  addPrism(group, 'right_broad_wing', [[0.38, 0.56], [1.72, 0.08], [1.55, -0.86], [0.48, -0.54]], 0.16, materials.violetHull, 0.02);
  addPrism(group, 'left_inner_armor_plate', [[-0.28, 0.3], [-1.04, 0.02], [-0.96, -0.46], [-0.34, -0.34]], 0.12, materials.blackArmor, 0.18);
  addPrism(group, 'right_inner_armor_plate', [[0.28, 0.3], [1.04, 0.02], [0.96, -0.46], [0.34, -0.34]], 0.12, materials.blackArmor, 0.18);
  addMesh(group, 'center_rail_cannon', new CylinderGeometry(0.08, 0.12, 1.16, 7), materials.orangeArmor, [0, 0.72, 0.32], [0, 0, 0]);
  addMesh(group, 'center_cannon_muzzle_glow', new CylinderGeometry(0.12, 0.08, 0.16, 7), materials.warningCore, [0, 1.36, 0.34], [Math.PI / 2, 0, 0]);
  addMesh(group, 'left_cannon_pod', new BoxGeometry(0.28, 0.72, 0.18), materials.orangeArmor, [-0.66, 0.22, 0.22], [0, 0, -0.12]);
  addMesh(group, 'right_cannon_pod', new BoxGeometry(0.28, 0.72, 0.18), materials.orangeArmor, [0.66, 0.22, 0.22], [0, 0, 0.12]);
  addMesh(group, 'left_wingtip_emitter', new ConeGeometry(0.12, 0.36, 5), materials.whiteCore, [-1.56, -0.16, 0.16], [0, 0, -0.28]);
  addMesh(group, 'right_wingtip_emitter', new ConeGeometry(0.12, 0.36, 5), materials.whiteCore, [1.56, -0.16, 0.16], [0, 0, 0.28]);
  addMesh(group, 'reactor_eye', new BoxGeometry(0.3, 0.3, 0.14), materials.cyanCore, [0, 0.16, 0.34], [0, 0, Math.PI / 4]);
  addMesh(group, 'reactor_upper_lens', new BoxGeometry(0.18, 0.18, 0.1), materials.whiteCore, [0, 0.52, 0.39], [0, 0, Math.PI / 4]);
  addNozzles(group, [-0.42, 0, 0.42], -1.26, materials.blackArmor, materials.cyanCore);
  return group;
}

function createArmoredCarrierBoss() {
  const group = namedGroup('stormraider_boss_02_armored_carrier_blockout');
  addMesh(group, 'heavy_center_vault', new BoxGeometry(1.12, 1.82, 0.46), materials.orangeArmor, [0, -0.02, 0.08], [0, 0, 0]);
  addMesh(group, 'upper_armor_cap', new BoxGeometry(0.84, 1.22, 0.22), materials.blackArmor, [0, 0.1, 0.36], [0, 0, 0]);
  addMesh(group, 'blunt_nose_ram', new ConeGeometry(0.45, 0.74, 6), materials.orangeArmor, [0, 1.22, 0.18], [0, 0, 0]);
  addPrism(group, 'left_fortress_shoulder', [[-0.42, 0.54], [-1.48, 0.34], [-1.66, -0.5], [-0.58, -0.64]], 0.2, materials.blackArmor, 0.04);
  addPrism(group, 'right_fortress_shoulder', [[0.42, 0.54], [1.48, 0.34], [1.66, -0.5], [0.58, -0.64]], 0.2, materials.blackArmor, 0.04);
  addPrism(group, 'left_lower_slab', [[-0.48, -0.26], [-1.34, -0.56], [-1.16, -1.18], [-0.38, -0.78]], 0.16, materials.orangeArmor, -0.04);
  addPrism(group, 'right_lower_slab', [[0.48, -0.26], [1.34, -0.56], [1.16, -1.18], [0.38, -0.78]], 0.16, materials.orangeArmor, -0.04);
  addMesh(group, 'left_hangar_mouth', new BoxGeometry(0.44, 0.28, 0.18), materials.pinkCore, [-0.62, 0.52, 0.28], [0, 0, -0.08]);
  addMesh(group, 'right_hangar_mouth', new BoxGeometry(0.44, 0.28, 0.18), materials.pinkCore, [0.62, 0.52, 0.28], [0, 0, 0.08]);
  addMesh(group, 'center_siege_cannon', new CylinderGeometry(0.12, 0.17, 1.08, 8), materials.darkHull, [0, 0.66, 0.44], [0, 0, 0]);
  addMesh(group, 'siege_cannon_hot_core', new CylinderGeometry(0.13, 0.09, 0.16, 8), materials.warningCore, [0, 1.25, 0.46], [Math.PI / 2, 0, 0]);
  addMesh(group, 'left_broadside_turret', new CylinderGeometry(0.1, 0.13, 0.64, 7), materials.darkHull, [-1.05, -0.04, 0.3], [0, 0, -0.24]);
  addMesh(group, 'right_broadside_turret', new CylinderGeometry(0.1, 0.13, 0.64, 7), materials.darkHull, [1.05, -0.04, 0.3], [0, 0, 0.24]);
  addMesh(group, 'left_broadside_muzzle', new BoxGeometry(0.22, 0.16, 0.12), materials.warningCore, [-1.32, 0.06, 0.34], [0, 0, -0.24]);
  addMesh(group, 'right_broadside_muzzle', new BoxGeometry(0.22, 0.16, 0.12), materials.warningCore, [1.32, 0.06, 0.34], [0, 0, 0.24]);
  addMesh(group, 'carrier_command_lens', new BoxGeometry(0.26, 0.26, 0.14), materials.whiteCore, [0, -0.12, 0.52], [0, 0, Math.PI / 4]);
  addNozzles(group, [-0.58, -0.2, 0.2, 0.58], -1.28, materials.blackArmor, materials.pinkCore);
  return group;
}

function createSpineFlagshipBoss() {
  const group = namedGroup('stormraider_boss_03_spine_flagship_blockout');
  addMesh(group, 'long_black_keel', new BoxGeometry(0.66, 2.72, 0.32), materials.darkHull, [0, -0.02, 0.02], [0, 0, 0]);
  addMesh(group, 'raised_energy_spine', new BoxGeometry(0.28, 2.38, 0.18), materials.violetHull, [0, 0.02, 0.28], [0, 0, 0]);
  addMesh(group, 'needle_command_nose', new ConeGeometry(0.28, 0.94, 6), materials.violetHull, [0, 1.62, 0.12], [0, 0, 0]);
  addPrism(group, 'left_forward_blade', [[-0.26, 0.74], [-1.18, 0.42], [-1.02, -0.06], [-0.28, 0.14]], 0.12, materials.blueHull, 0.08);
  addPrism(group, 'right_forward_blade', [[0.26, 0.74], [1.18, 0.42], [1.02, -0.06], [0.28, 0.14]], 0.12, materials.blueHull, 0.08);
  addPrism(group, 'left_rear_blade', [[-0.26, -0.38], [-1.36, -0.84], [-1.08, -1.38], [-0.34, -0.86]], 0.12, materials.blackArmor, 0);
  addPrism(group, 'right_rear_blade', [[0.26, -0.38], [1.36, -0.84], [1.08, -1.38], [0.34, -0.86]], 0.12, materials.blackArmor, 0);
  addMesh(group, 'left_spine_fin', new BoxGeometry(0.16, 0.92, 0.24), materials.violetHull, [-0.36, -0.28, 0.24], [0, 0, -0.2]);
  addMesh(group, 'right_spine_fin', new BoxGeometry(0.16, 0.92, 0.24), materials.violetHull, [0.36, -0.28, 0.24], [0, 0, 0.2]);
  addMesh(group, 'front_prism_core', new BoxGeometry(0.24, 0.34, 0.16), materials.cyanCore, [0, 0.72, 0.42], [0, 0, Math.PI / 4]);
  addMesh(group, 'rear_prism_core', new BoxGeometry(0.28, 0.4, 0.16), materials.pinkCore, [0, -0.72, 0.38], [0, 0, Math.PI / 4]);
  addMesh(group, 'middle_spine_lens', new BoxGeometry(0.18, 0.28, 0.14), materials.whiteCore, [0, 0.02, 0.44], [0, 0, Math.PI / 4]);
  addMesh(group, 'split_forward_cannon_l', new CylinderGeometry(0.06, 0.09, 0.82, 7), materials.orangeArmor, [-0.22, 1.0, 0.3], [0, 0, -0.08]);
  addMesh(group, 'split_forward_cannon_r', new CylinderGeometry(0.06, 0.09, 0.82, 7), materials.orangeArmor, [0.22, 1.0, 0.3], [0, 0, 0.08]);
  addMesh(group, 'split_muzzle_l', new CylinderGeometry(0.08, 0.05, 0.14, 7), materials.warningCore, [-0.28, 1.44, 0.32], [Math.PI / 2, 0, -0.08]);
  addMesh(group, 'split_muzzle_r', new CylinderGeometry(0.08, 0.05, 0.14, 7), materials.warningCore, [0.28, 1.44, 0.32], [Math.PI / 2, 0, 0.08]);
  addMesh(group, 'left_rear_warning_fin', new BoxGeometry(0.14, 0.44, 0.12), materials.pinkCore, [-0.82, -1.08, 0.18], [0, 0, -0.28]);
  addMesh(group, 'right_rear_warning_fin', new BoxGeometry(0.14, 0.44, 0.12), materials.pinkCore, [0.82, -1.08, 0.18], [0, 0, 0.28]);
  addNozzles(group, [-0.28, 0, 0.28], -1.58, materials.blackArmor, materials.violetHull);
  return group;
}

function addNozzles(group, xs, y, shellMaterial, coreMaterial) {
  for (const x of xs) {
    addMesh(group, `engine_nozzle_${x.toFixed(2)}`, new CylinderGeometry(0.11, 0.15, 0.1, 7), shellMaterial, [x, y, -0.08], [Math.PI / 2, 0, 0]);
    addMesh(group, `engine_core_${x.toFixed(2)}`, new CylinderGeometry(0.06, 0.08, 0.08, 7), coreMaterial, [x, y - 0.06, -0.08], [Math.PI / 2, 0, 0]);
  }
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
