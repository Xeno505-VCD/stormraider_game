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
  muzzleCore: material('#ffcf7a', '#ff5c14', 1.35, 0.18),
  coldCore: material('#d8fbff', '#27d8ff', 1.38, 0.16),
  sentinelHull: material('#ff8a3d', '#8f3512', 0.92, 0.36),
  sentinelArmor: material('#251a21', '#12070c', 0.45, 0.48),
  bulwarkHull: material('#ff5c14', '#8f2107', 0.94, 0.42),
  bulwarkArmor: material('#2b160f', '#120704', 0.48, 0.55),
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
  },
  {
    filename: 'enemy-bulwark.glb',
    group: createBulwark()
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
  const group = namedGroup('stormraider_enemy_drone_s141_layered_sensor_winglets');
  addMesh(group, 'body_core', new ConeGeometry(0.22, 0.66, 5), materials.droneHull, [0, 0.16, 0.03], [0, 0, 0]);
  addMesh(group, 'rear_block', new BoxGeometry(0.36, 0.36, 0.16), materials.droneArmor, [0, -0.18, -0.02], [0, 0, 0]);
  addPrism(group, 'left_claw_wing', [[-0.12, 0.08], [-0.52, -0.02], [-0.42, -0.26], [-0.16, -0.16]], 0.08, materials.droneHull, 0.03);
  addPrism(group, 'right_claw_wing', [[0.12, 0.08], [0.52, -0.02], [0.42, -0.26], [0.16, -0.16]], 0.08, materials.droneHull, 0.03);
  addPrism(group, 'left_inner_winglet', [[-0.08, -0.08], [-0.36, -0.18], [-0.28, -0.32], [-0.1, -0.22]], 0.055, materials.droneArmor, 0.1);
  addPrism(group, 'right_inner_winglet', [[0.08, -0.08], [0.36, -0.18], [0.28, -0.32], [0.1, -0.22]], 0.055, materials.droneArmor, 0.1);
  addMesh(group, 'center_eye', new BoxGeometry(0.13, 0.13, 0.08), materials.skimmerCore, [0, 0.14, 0.16], [0, 0, Math.PI / 4]);
  addMesh(group, 'micro_muzzle', new CylinderGeometry(0.045, 0.06, 0.12, 6), materials.muzzleCore, [0, 0.5, 0.11], [Math.PI / 2, 0, 0]);
  addMesh(group, 'left_side_sensor', new BoxGeometry(0.08, 0.1, 0.06), materials.muzzleCore, [-0.22, 0.02, 0.15], [0, 0, -0.34]);
  addMesh(group, 'right_side_sensor', new BoxGeometry(0.08, 0.1, 0.06), materials.muzzleCore, [0.22, 0.02, 0.15], [0, 0, 0.34]);
  addMesh(group, 'left_wing_mark', new BoxGeometry(0.055, 0.12, 0.045), materials.muzzleCore, [-0.34, -0.1, 0.13], [0, 0, -0.42]);
  addMesh(group, 'right_wing_mark', new BoxGeometry(0.055, 0.12, 0.045), materials.muzzleCore, [0.34, -0.1, 0.13], [0, 0, 0.42]);
  addMesh(group, 'rear_antenna_fin', new BoxGeometry(0.06, 0.26, 0.06), materials.droneArmor, [0, -0.34, 0.12], [0, 0, 0.18]);
  addMesh(group, 'tail_signal_lens', new BoxGeometry(0.08, 0.06, 0.045), materials.skimmerCore, [0, -0.38, 0.15], [0, 0, Math.PI / 4]);
  addMesh(group, 'tail_nozzle', new CylinderGeometry(0.07, 0.1, 0.08, 6), materials.droneArmor, [0, -0.42, -0.02], [Math.PI / 2, 0, 0]);
  addMesh(group, 'matte_nose_clamp', new BoxGeometry(0.16, 0.07, 0.055), materials.droneArmor, [0, 0.38, 0.17], [0, 0, 0]);
  addMesh(group, 'left_panel_step', new BoxGeometry(0.055, 0.18, 0.045), materials.droneArmor, [-0.14, 0.1, 0.18], [0, 0, -0.18]);
  addMesh(group, 'right_panel_step', new BoxGeometry(0.055, 0.18, 0.045), materials.droneArmor, [0.14, 0.1, 0.18], [0, 0, 0.18]);
  addMesh(group, 'left_wing_edge_rail', new BoxGeometry(0.045, 0.2, 0.04), materials.droneArmor, [-0.43, -0.08, 0.12], [0, 0, -0.5]);
  addMesh(group, 'right_wing_edge_rail', new BoxGeometry(0.045, 0.2, 0.04), materials.droneArmor, [0.43, -0.08, 0.12], [0, 0, 0.5]);
  return group;
}

function createSkimmer() {
  const group = namedGroup('stormraider_enemy_skimmer_s141_cold_edge_layering');
  addMesh(group, 'needle_body', new BoxGeometry(0.2, 0.78, 0.13), materials.skimmerHull, [0, 0.02, 0.02], [0, 0, 0]);
  addMesh(group, 'nose_spike', new ConeGeometry(0.13, 0.42, 5), materials.skimmerHull, [0, 0.56, 0.04], [0, 0, 0]);
  addPrism(group, 'left_knife_wing', [[-0.08, 0.12], [-0.62, -0.12], [-0.74, -0.32], [-0.16, -0.2]], 0.07, materials.skimmerCore, 0.02);
  addPrism(group, 'right_knife_wing', [[0.08, 0.12], [0.62, -0.12], [0.74, -0.32], [0.16, -0.2]], 0.07, materials.skimmerCore, 0.02);
  addPrism(group, 'left_forward_canard', [[-0.06, 0.36], [-0.34, 0.22], [-0.28, 0.1], [-0.08, 0.2]], 0.05, materials.skimmerHull, 0.09);
  addPrism(group, 'right_forward_canard', [[0.06, 0.36], [0.34, 0.22], [0.28, 0.1], [0.08, 0.2]], 0.05, materials.skimmerHull, 0.09);
  addMesh(group, 'left_tip', new BoxGeometry(0.08, 0.24, 0.08), materials.skimmerHull, [-0.63, -0.28, 0.04], [0, 0, -0.36]);
  addMesh(group, 'right_tip', new BoxGeometry(0.08, 0.24, 0.08), materials.skimmerHull, [0.63, -0.28, 0.04], [0, 0, 0.36]);
  addMesh(group, 'needle_muzzle_glow', new CylinderGeometry(0.04, 0.055, 0.12, 6), materials.coldCore, [0, 0.74, 0.1], [Math.PI / 2, 0, 0]);
  addMesh(group, 'left_acceleration_slit', new BoxGeometry(0.06, 0.28, 0.06), materials.coldCore, [-0.18, 0.0, 0.12], [0, 0, -0.1]);
  addMesh(group, 'right_acceleration_slit', new BoxGeometry(0.06, 0.28, 0.06), materials.coldCore, [0.18, 0.0, 0.12], [0, 0, 0.1]);
  addMesh(group, 'left_cold_edge_node', new BoxGeometry(0.055, 0.1, 0.05), materials.coldCore, [-0.48, -0.16, 0.1], [0, 0, -0.48]);
  addMesh(group, 'right_cold_edge_node', new BoxGeometry(0.055, 0.1, 0.05), materials.coldCore, [0.48, -0.16, 0.1], [0, 0, 0.48]);
  addMesh(group, 'left_tail_vane', new BoxGeometry(0.07, 0.24, 0.06), materials.wraithDark, [-0.24, -0.42, 0.04], [0, 0, -0.34]);
  addMesh(group, 'right_tail_vane', new BoxGeometry(0.07, 0.24, 0.06), materials.wraithDark, [0.24, -0.42, 0.04], [0, 0, 0.34]);
  addMesh(group, 'tail_cold_lens', new BoxGeometry(0.08, 0.08, 0.05), materials.coldCore, [0, -0.38, 0.13], [0, 0, Math.PI / 4]);
  addMesh(group, 'rear_thruster', new CylinderGeometry(0.06, 0.09, 0.08, 6), materials.wraithDark, [0, -0.46, -0.02], [Math.PI / 2, 0, 0]);
  addMesh(group, 'black_service_spine', new BoxGeometry(0.08, 0.52, 0.045), materials.wraithDark, [0, 0.04, 0.16], [0, 0, 0]);
  addMesh(group, 'left_cold_edge_frame', new BoxGeometry(0.045, 0.32, 0.04), materials.wraithDark, [-0.57, -0.16, 0.12], [0, 0, -0.5]);
  addMesh(group, 'right_cold_edge_frame', new BoxGeometry(0.045, 0.32, 0.04), materials.wraithDark, [0.57, -0.16, 0.12], [0, 0, 0.5]);
  addMesh(group, 'front_capacitor_chip', new BoxGeometry(0.09, 0.08, 0.05), materials.coldCore, [0, 0.32, 0.18], [0, 0, Math.PI / 4]);
  return group;
}

function createSentinel() {
  const group = namedGroup('stormraider_enemy_sentinel_s141_braced_cannon_layering');
  addMesh(group, 'heavy_core', new BoxGeometry(0.42, 0.74, 0.22), materials.sentinelHull, [0, 0, 0.03], [0, 0, 0]);
  addMesh(group, 'front_armor', new ConeGeometry(0.24, 0.38, 5), materials.sentinelArmor, [0, 0.5, 0.05], [0, 0, 0]);
  addMesh(group, 'left_shoulder', new BoxGeometry(0.34, 0.32, 0.16), materials.sentinelArmor, [-0.34, -0.06, 0.02], [0, 0, -0.18]);
  addMesh(group, 'right_shoulder', new BoxGeometry(0.34, 0.32, 0.16), materials.sentinelArmor, [0.34, -0.06, 0.02], [0, 0, 0.18]);
  addPrism(group, 'left_guard_fin', [[-0.2, -0.18], [-0.64, -0.26], [-0.58, -0.52], [-0.2, -0.42]], 0.09, materials.sentinelHull, 0.06);
  addPrism(group, 'right_guard_fin', [[0.2, -0.18], [0.64, -0.26], [0.58, -0.52], [0.2, -0.42]], 0.09, materials.sentinelHull, 0.06);
  addMesh(group, 'center_cannon', new CylinderGeometry(0.06, 0.08, 0.46, 6), materials.droneArmor, [0, 0.28, 0.18], [Math.PI / 2, 0, 0]);
  addMesh(group, 'center_cannon_muzzle', new CylinderGeometry(0.07, 0.05, 0.13, 6), materials.muzzleCore, [0, 0.54, 0.18], [Math.PI / 2, 0, 0]);
  addMesh(group, 'left_side_cannon', new BoxGeometry(0.08, 0.34, 0.08), materials.droneArmor, [-0.24, 0.28, 0.18], [0, 0, -0.08]);
  addMesh(group, 'right_side_cannon', new BoxGeometry(0.08, 0.34, 0.08), materials.droneArmor, [0.24, 0.28, 0.18], [0, 0, 0.08]);
  addMesh(group, 'left_cannon_brace', new BoxGeometry(0.07, 0.3, 0.06), materials.sentinelArmor, [-0.16, 0.22, 0.15], [0, 0, -0.22]);
  addMesh(group, 'right_cannon_brace', new BoxGeometry(0.07, 0.3, 0.06), materials.sentinelArmor, [0.16, 0.22, 0.15], [0, 0, 0.22]);
  addMesh(group, 'left_warning_tick', new BoxGeometry(0.06, 0.11, 0.06), materials.muzzleCore, [-0.43, 0.08, 0.17], [0, 0, -0.34]);
  addMesh(group, 'right_warning_tick', new BoxGeometry(0.06, 0.11, 0.06), materials.muzzleCore, [0.43, 0.08, 0.17], [0, 0, 0.34]);
  addMesh(group, 'armor_warning_lens', new BoxGeometry(0.13, 0.13, 0.08), materials.muzzleCore, [0, -0.08, 0.2], [0, 0, Math.PI / 4]);
  addMesh(group, 'left_armor_buckle', new BoxGeometry(0.12, 0.16, 0.08), materials.muzzleCore, [-0.32, -0.22, 0.18], [0, 0, -0.18]);
  addMesh(group, 'right_armor_buckle', new BoxGeometry(0.12, 0.16, 0.08), materials.muzzleCore, [0.32, -0.22, 0.18], [0, 0, 0.18]);
  addMesh(group, 'left_rear_stabilizer', new BoxGeometry(0.08, 0.28, 0.08), materials.sentinelArmor, [-0.28, -0.48, 0.08], [0, 0, -0.4]);
  addMesh(group, 'right_rear_stabilizer', new BoxGeometry(0.08, 0.28, 0.08), materials.sentinelArmor, [0.28, -0.48, 0.08], [0, 0, 0.4]);
  addMesh(group, 'rear_nozzle_l', new CylinderGeometry(0.06, 0.09, 0.08, 6), materials.sentinelArmor, [-0.16, -0.46, -0.03], [Math.PI / 2, 0, 0]);
  addMesh(group, 'rear_nozzle_r', new CylinderGeometry(0.06, 0.09, 0.08, 6), materials.sentinelArmor, [0.16, -0.46, -0.03], [Math.PI / 2, 0, 0]);
  addMesh(group, 'left_cannon_heat_sink_a', new BoxGeometry(0.045, 0.16, 0.045), materials.muzzleCore, [-0.09, 0.38, 0.24], [0, 0, -0.12]);
  addMesh(group, 'right_cannon_heat_sink_a', new BoxGeometry(0.045, 0.16, 0.045), materials.muzzleCore, [0.09, 0.38, 0.24], [0, 0, 0.12]);
  addMesh(group, 'left_shoulder_service_plate', new BoxGeometry(0.12, 0.2, 0.055), materials.sentinelHull, [-0.42, -0.12, 0.16], [0, 0, -0.22]);
  addMesh(group, 'right_shoulder_service_plate', new BoxGeometry(0.12, 0.2, 0.055), materials.sentinelHull, [0.42, -0.12, 0.16], [0, 0, 0.22]);
  addMesh(group, 'rear_warning_bar', new BoxGeometry(0.3, 0.055, 0.05), materials.muzzleCore, [0, -0.38, 0.2], [0, 0, 0]);
  return group;
}

function createWraith() {
  const group = namedGroup('stormraider_enemy_wraith_s141_phase_blade_layering');
  addMesh(group, 'long_spine', new BoxGeometry(0.18, 1.04, 0.14), materials.wraithHull, [0, 0.02, 0.04], [0, 0, 0]);
  addMesh(group, 'black_keel', new BoxGeometry(0.3, 0.82, 0.08), materials.wraithDark, [0, -0.06, -0.04], [0, 0, 0]);
  addMesh(group, 'front_blade', new ConeGeometry(0.16, 0.5, 5), materials.wraithHull, [0, 0.66, 0.06], [0, 0, 0]);
  addPrism(group, 'left_ghost_wing', [[-0.1, 0.2], [-0.45, -0.08], [-0.38, -0.44], [-0.12, -0.26]], 0.06, materials.wraithDark, 0.06);
  addPrism(group, 'right_ghost_wing', [[0.1, 0.2], [0.45, -0.08], [0.38, -0.44], [0.12, -0.26]], 0.06, materials.wraithDark, 0.06);
  addMesh(group, 'violet_eye', new BoxGeometry(0.11, 0.16, 0.08), materials.wraithHull, [0, 0.24, 0.16], [0, 0, Math.PI / 4]);
  addMesh(group, 'phase_muzzle_l', new CylinderGeometry(0.035, 0.05, 0.13, 6), materials.coldCore, [-0.08, 0.58, 0.12], [Math.PI / 2, 0, -0.08]);
  addMesh(group, 'phase_muzzle_r', new CylinderGeometry(0.035, 0.05, 0.13, 6), materials.coldCore, [0.08, 0.58, 0.12], [Math.PI / 2, 0, 0.08]);
  addMesh(group, 'left_phase_beacon', new BoxGeometry(0.08, 0.08, 0.06), materials.coldCore, [-0.2, 0.06, 0.14], [0, 0, Math.PI / 4]);
  addMesh(group, 'right_phase_beacon', new BoxGeometry(0.08, 0.08, 0.06), materials.coldCore, [0.2, 0.06, 0.14], [0, 0, Math.PI / 4]);
  addMesh(group, 'left_outer_phase_vane', new BoxGeometry(0.06, 0.32, 0.05), materials.wraithHull, [-0.42, -0.22, 0.1], [0, 0, -0.44]);
  addMesh(group, 'right_outer_phase_vane', new BoxGeometry(0.06, 0.32, 0.05), materials.wraithHull, [0.42, -0.22, 0.1], [0, 0, 0.44]);
  addMesh(group, 'left_phase_arc_tip', new BoxGeometry(0.05, 0.22, 0.05), materials.coldCore, [-0.5, -0.1, 0.16], [0, 0, -0.62]);
  addMesh(group, 'right_phase_arc_tip', new BoxGeometry(0.05, 0.22, 0.05), materials.coldCore, [0.5, -0.1, 0.16], [0, 0, 0.62]);
  addMesh(group, 'left_spine_node', new BoxGeometry(0.06, 0.09, 0.05), materials.wraithHull, [-0.09, -0.18, 0.16], [0, 0, Math.PI / 4]);
  addMesh(group, 'right_spine_node', new BoxGeometry(0.06, 0.09, 0.05), materials.wraithHull, [0.09, -0.18, 0.16], [0, 0, Math.PI / 4]);
  addMesh(group, 'split_tail_l', new BoxGeometry(0.08, 0.32, 0.08), materials.wraithHull, [-0.1, -0.62, 0.06], [0, 0, -0.16]);
  addMesh(group, 'split_tail_r', new BoxGeometry(0.08, 0.32, 0.08), materials.wraithHull, [0.1, -0.62, 0.06], [0, 0, 0.16]);
  addMesh(group, 'rear_phase_socket', new CylinderGeometry(0.045, 0.07, 0.08, 6), materials.coldCore, [0, -0.68, 0.08], [Math.PI / 2, 0, 0]);
  addMesh(group, 'left_phase_mirror_frame', new BoxGeometry(0.055, 0.24, 0.045), materials.wraithDark, [-0.28, 0.12, 0.18], [0, 0, -0.38]);
  addMesh(group, 'right_phase_mirror_frame', new BoxGeometry(0.055, 0.24, 0.045), materials.wraithDark, [0.28, 0.12, 0.18], [0, 0, 0.38]);
  addMesh(group, 'front_phase_cap', new BoxGeometry(0.1, 0.08, 0.05), materials.coldCore, [0, 0.48, 0.18], [0, 0, Math.PI / 4]);
  addMesh(group, 'rear_black_retainer', new BoxGeometry(0.18, 0.06, 0.045), materials.wraithDark, [0, -0.44, 0.16], [0, 0, 0]);
  return group;
}

function createBulwark() {
  const group = namedGroup('stormraider_enemy_bulwark_s141_siege_plating_layered');
  addMesh(group, 'heavy_hex_core', new BoxGeometry(0.52, 0.68, 0.26), materials.bulwarkHull, [0, 0.02, 0.04], [0, 0, 0]);
  addMesh(group, 'front_plow_armor', new ConeGeometry(0.32, 0.46, 6), materials.bulwarkArmor, [0, 0.5, 0.08], [0, 0, 0]);
  addPrism(group, 'left_shield_slab', [[-0.2, 0.16], [-0.72, 0.0], [-0.66, -0.42], [-0.2, -0.34]], 0.14, materials.bulwarkArmor, 0.08);
  addPrism(group, 'right_shield_slab', [[0.2, 0.16], [0.72, 0.0], [0.66, -0.42], [0.2, -0.34]], 0.14, materials.bulwarkArmor, 0.08);
  addMesh(group, 'center_heavy_mortar', new CylinderGeometry(0.08, 0.12, 0.42, 7), materials.droneArmor, [0, 0.34, 0.24], [Math.PI / 2, 0, 0]);
  addMesh(group, 'mortar_hot_muzzle', new CylinderGeometry(0.09, 0.06, 0.14, 7), materials.muzzleCore, [0, 0.58, 0.24], [Math.PI / 2, 0, 0]);
  addMesh(group, 'left_pressure_vent', new BoxGeometry(0.08, 0.24, 0.08), materials.muzzleCore, [-0.34, -0.04, 0.22], [0, 0, -0.24]);
  addMesh(group, 'right_pressure_vent', new BoxGeometry(0.08, 0.24, 0.08), materials.muzzleCore, [0.34, -0.04, 0.22], [0, 0, 0.24]);
  addMesh(group, 'left_siege_rivet_front', new BoxGeometry(0.08, 0.08, 0.06), materials.muzzleCore, [-0.5, 0.02, 0.2], [0, 0, Math.PI / 4]);
  addMesh(group, 'right_siege_rivet_front', new BoxGeometry(0.08, 0.08, 0.06), materials.muzzleCore, [0.5, 0.02, 0.2], [0, 0, Math.PI / 4]);
  addMesh(group, 'left_siege_rivet_rear', new BoxGeometry(0.07, 0.07, 0.05), materials.muzzleCore, [-0.46, -0.28, 0.18], [0, 0, Math.PI / 4]);
  addMesh(group, 'right_siege_rivet_rear', new BoxGeometry(0.07, 0.07, 0.05), materials.muzzleCore, [0.46, -0.28, 0.18], [0, 0, Math.PI / 4]);
  addMesh(group, 'left_lower_tread_plate', new BoxGeometry(0.18, 0.4, 0.1), materials.bulwarkArmor, [-0.42, -0.34, 0.02], [0, 0, -0.18]);
  addMesh(group, 'right_lower_tread_plate', new BoxGeometry(0.18, 0.4, 0.1), materials.bulwarkArmor, [0.42, -0.34, 0.02], [0, 0, 0.18]);
  addMesh(group, 'left_lower_ram', new BoxGeometry(0.1, 0.28, 0.08), materials.bulwarkHull, [-0.28, -0.44, 0.11], [0, 0, -0.16]);
  addMesh(group, 'right_lower_ram', new BoxGeometry(0.1, 0.28, 0.08), materials.bulwarkHull, [0.28, -0.44, 0.11], [0, 0, 0.16]);
  addMesh(group, 'reactive_armor_lens', new BoxGeometry(0.14, 0.14, 0.08), materials.muzzleCore, [0, -0.12, 0.25], [0, 0, Math.PI / 4]);
  addMesh(group, 'rear_thrust_block', new BoxGeometry(0.34, 0.18, 0.16), materials.bulwarkArmor, [0, -0.48, -0.02], [0, 0, 0]);
  addMesh(group, 'rear_nozzle_left', new CylinderGeometry(0.06, 0.09, 0.08, 6), materials.bulwarkArmor, [-0.14, -0.58, -0.03], [Math.PI / 2, 0, 0]);
  addMesh(group, 'rear_nozzle_right', new CylinderGeometry(0.06, 0.09, 0.08, 6), materials.bulwarkArmor, [0.14, -0.58, -0.03], [Math.PI / 2, 0, 0]);
  addMesh(group, 'left_upper_armor_seam', new BoxGeometry(0.055, 0.32, 0.045), materials.bulwarkHull, [-0.22, 0.1, 0.24], [0, 0, -0.12]);
  addMesh(group, 'right_upper_armor_seam', new BoxGeometry(0.055, 0.32, 0.045), materials.bulwarkHull, [0.22, 0.1, 0.24], [0, 0, 0.12]);
  addMesh(group, 'left_track_lock', new BoxGeometry(0.08, 0.18, 0.055), materials.muzzleCore, [-0.52, -0.42, 0.12], [0, 0, -0.18]);
  addMesh(group, 'right_track_lock', new BoxGeometry(0.08, 0.18, 0.055), materials.muzzleCore, [0.52, -0.42, 0.12], [0, 0, 0.18]);
  addMesh(group, 'mortar_breach_block', new BoxGeometry(0.16, 0.12, 0.07), materials.bulwarkArmor, [0, 0.24, 0.3], [0, 0, 0]);
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
    roughness: 0.72
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
