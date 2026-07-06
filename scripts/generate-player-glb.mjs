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

const outputPath = resolve('public/models/player/stormraider-player.glb');

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

const hullMaterial = new MeshStandardMaterial({
  color: '#27d8ff',
  emissive: '#0d5c8f',
  emissiveIntensity: 0.55,
  flatShading: true,
  metalness: 0.28,
  roughness: 0.48
});

const armorMaterial = new MeshStandardMaterial({
  color: '#13233a',
  emissive: '#071a36',
  emissiveIntensity: 0.35,
  flatShading: true,
  metalness: 0.36,
  roughness: 0.54
});

const coreMaterial = new MeshStandardMaterial({
  color: '#9b5cff',
  emissive: '#5e28ff',
  emissiveIntensity: 1.35,
  flatShading: true,
  metalness: 0.18,
  roughness: 0.38
});

const nozzleMaterial = new MeshStandardMaterial({
  color: '#1b2132',
  emissive: '#091121',
  emissiveIntensity: 0.4,
  flatShading: true,
  metalness: 0.42,
  roughness: 0.5
});

const ship = new Group();
ship.name = 'stormraider_player_ship_v2_blockout';

addMesh('hull_core', new BoxGeometry(0.34, 1.46, 0.17), hullMaterial, [0, -0.12, 0.02], [0, 0, 0]);
addMesh('belly_shadow_layer', new BoxGeometry(0.48, 1.14, 0.08), armorMaterial, [0, -0.24, -0.08], [0, 0, 0]);
addMesh('nose_needle', new ConeGeometry(0.18, 0.82, 5), hullMaterial, [0, 1.02, 0.04], [0, 0, 0]);
addMesh('nose_keel', new BoxGeometry(0.14, 0.92, 0.09), armorMaterial, [0, 0.55, -0.02], [0, 0, 0]);
addMesh('center_lightning_spine', new BoxGeometry(0.12, 1.08, 0.08), coreMaterial, [0, -0.08, 0.16], [0, 0, 0]);
addMesh('cockpit_front_canopy', new BoxGeometry(0.2, 0.28, 0.12), coreMaterial, [0, 0.3, 0.22], [0, 0, Math.PI / 4]);
addMesh('cockpit_rear_canopy', new BoxGeometry(0.24, 0.26, 0.12), coreMaterial, [0, 0.02, 0.18], [0, 0, Math.PI / 4]);
addMesh('left_upper_armor', new BoxGeometry(0.13, 0.88, 0.09), armorMaterial, [-0.2, -0.14, 0.12], [0, 0, -0.18]);
addMesh('right_upper_armor', new BoxGeometry(0.13, 0.88, 0.09), armorMaterial, [0.2, -0.14, 0.12], [0, 0, 0.18]);

addPrism('left_swept_wing', [
  [-0.18, 0.02],
  [-1.26, -0.3],
  [-1.38, -0.82],
  [-0.36, -0.6]
], 0.1, coreMaterial, -0.02);

addPrism('right_swept_wing', [
  [0.18, 0.02],
  [1.26, -0.3],
  [1.38, -0.82],
  [0.36, -0.6]
], 0.1, coreMaterial, -0.02);

addPrism('left_inner_armor_wing', [
  [-0.18, -0.08],
  [-0.84, -0.34],
  [-0.98, -0.66],
  [-0.28, -0.52]
], 0.08, armorMaterial, 0.08);

addPrism('right_inner_armor_wing', [
  [0.18, -0.08],
  [0.84, -0.34],
  [0.98, -0.66],
  [0.28, -0.52]
], 0.08, armorMaterial, 0.08);

addMesh('left_wingtip_emitter', new BoxGeometry(0.13, 0.4, 0.1), hullMaterial, [-1.2, -0.68, 0.03], [0, 0, -0.32]);
addMesh('right_wingtip_emitter', new BoxGeometry(0.13, 0.4, 0.1), hullMaterial, [1.2, -0.68, 0.03], [0, 0, 0.32]);
addMesh('left_air_intake', new BoxGeometry(0.14, 0.32, 0.11), armorMaterial, [-0.33, -0.72, 0.04], [0, 0, -0.08]);
addMesh('right_air_intake', new BoxGeometry(0.14, 0.32, 0.11), armorMaterial, [0.33, -0.72, 0.04], [0, 0, 0.08]);

addPrism('left_rear_stabilizer', [
  [-0.14, -0.88],
  [-0.58, -1.02],
  [-0.5, -1.24],
  [-0.18, -1.12]
], 0.08, armorMaterial, 0.08);

addPrism('right_rear_stabilizer', [
  [0.14, -0.88],
  [0.58, -1.02],
  [0.5, -1.24],
  [0.18, -1.12]
], 0.08, armorMaterial, 0.08);

addMesh('tail_spine', new BoxGeometry(0.14, 0.66, 0.14), armorMaterial, [0, -1.02, 0.17], [0.24, 0, 0]);
addMesh('left_tail_fin', new BoxGeometry(0.09, 0.48, 0.12), coreMaterial, [-0.18, -1.06, 0.12], [0, 0, -0.2]);
addMesh('right_tail_fin', new BoxGeometry(0.09, 0.48, 0.12), coreMaterial, [0.18, -1.06, 0.12], [0, 0, 0.2]);
addMesh('left_engine_pod', new BoxGeometry(0.26, 0.46, 0.2), armorMaterial, [-0.31, -1.04, -0.05], [0, 0, -0.07]);
addMesh('right_engine_pod', new BoxGeometry(0.26, 0.46, 0.2), armorMaterial, [0.31, -1.04, -0.05], [0, 0, 0.07]);
addMesh('left_engine_nozzle_lip', new CylinderGeometry(0.12, 0.15, 0.08, 7), nozzleMaterial, [-0.31, -1.28, -0.05], [Math.PI / 2, 0, 0]);
addMesh('right_engine_nozzle_lip', new CylinderGeometry(0.12, 0.15, 0.08, 7), nozzleMaterial, [0.31, -1.28, -0.05], [Math.PI / 2, 0, 0]);
addMesh('left_engine_nozzle_core', new CylinderGeometry(0.06, 0.09, 0.06, 7), coreMaterial, [-0.31, -1.33, -0.05], [Math.PI / 2, 0, 0]);
addMesh('right_engine_nozzle_core', new CylinderGeometry(0.06, 0.09, 0.06, 7), coreMaterial, [0.31, -1.33, -0.05], [Math.PI / 2, 0, 0]);

await mkdir(dirname(outputPath), { recursive: true });
const exporter = new GLTFExporter();
const glb = await exporter.parseAsync(ship, { binary: true, onlyVisible: true, trs: false });
await writeFile(outputPath, Buffer.from(glb));

console.log(`Generated ${outputPath}`);

function addMesh(name, geometry, material, position, rotation) {
  const mesh = new Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(position[0], position[1], position[2]);
  mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
  ship.add(mesh);
}

function addPrism(name, points, thickness, material, zCenter) {
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
  addMesh(name, geometry, material, [0, 0, 0], [0, 0, 0]);
}
