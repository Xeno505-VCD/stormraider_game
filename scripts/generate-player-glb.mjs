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
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

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
  color: '#1fb8dc',
  emissive: '#0b3f66',
  emissiveIntensity: 0.42,
  flatShading: true,
  metalness: 0.42,
  roughness: 0.72
});

const armorMaterial = new MeshStandardMaterial({
  color: '#13233a',
  emissive: '#071a36',
  emissiveIntensity: 0.22,
  flatShading: true,
  metalness: 0.46,
  roughness: 0.74
});

const coreMaterial = new MeshStandardMaterial({
  color: '#9b5cff',
  emissive: '#5e28ff',
  emissiveIntensity: 1.08,
  flatShading: true,
  metalness: 0.22,
  roughness: 0.56
});

const nozzleMaterial = new MeshStandardMaterial({
  color: '#1b2132',
  emissive: '#091121',
  emissiveIntensity: 0.26,
  flatShading: true,
  metalness: 0.62,
  roughness: 0.76
});

const weaponMaterial = new MeshStandardMaterial({
  color: '#d83f91',
  emissive: '#721747',
  emissiveIntensity: 0.96,
  flatShading: true,
  metalness: 0.52,
  roughness: 0.66
});

const goldMaterial = new MeshStandardMaterial({
  color: '#d7a953',
  emissive: '#b84a18',
  emissiveIntensity: 0.55,
  flatShading: true,
  metalness: 0.58,
  roughness: 0.7
});

const ceramicMaterial = new MeshStandardMaterial({
  color: '#c8d6e8',
  emissive: '#1b3a5d',
  emissiveIntensity: 0.2,
  flatShading: true,
  metalness: 0.12,
  roughness: 0.82
});

const bracketMaterial = new MeshStandardMaterial({
  color: '#070b14',
  emissive: '#10192b',
  emissiveIntensity: 0.1,
  flatShading: true,
  metalness: 0.64,
  roughness: 0.78
});

const ship = new Group();
ship.name = 'stormraider_player_ship_v12_shield_escort_modules';

addMesh('hull_core', new BoxGeometry(0.34, 1.46, 0.17), hullMaterial, [0, -0.12, 0.02], [0, 0, 0]);
addMesh('belly_shadow_layer', new BoxGeometry(0.48, 1.14, 0.08), armorMaterial, [0, -0.24, -0.08], [0, 0, 0]);
addMesh('nose_needle', new ConeGeometry(0.18, 0.82, 5), hullMaterial, [0, 1.02, 0.04], [0, 0, 0]);
addMesh('nose_keel', new BoxGeometry(0.14, 0.92, 0.09), armorMaterial, [0, 0.55, -0.02], [0, 0, 0]);
addMesh('center_lightning_spine', new BoxGeometry(0.12, 1.08, 0.08), coreMaterial, [0, -0.08, 0.16], [0, 0, 0]);
addMesh('forward_sensor_eye', new BoxGeometry(0.12, 0.12, 0.08), goldMaterial, [0, 0.86, 0.25], [0, 0, Math.PI / 4]);
addMesh('lower_nose_ridge', new BoxGeometry(0.08, 0.7, 0.06), armorMaterial, [0, 0.76, -0.09], [0, 0, 0]);
addMesh('left_forward_canard', new BoxGeometry(0.08, 0.36, 0.07), coreMaterial, [-0.34, 0.68, 0.08], [0, 0, -0.54]);
addMesh('right_forward_canard', new BoxGeometry(0.08, 0.36, 0.07), coreMaterial, [0.34, 0.68, 0.08], [0, 0, 0.54]);
addMesh('nose_ultra_socket', new BoxGeometry(0.1, 0.16, 0.08), weaponMaterial, [0, 1.08, 0.18], [0, 0, Math.PI / 4]);
addMesh('nose_splitter_prism_left', new BoxGeometry(0.07, 0.2, 0.07), coreMaterial, [-0.12, 0.98, 0.23], [0, 0, -0.32]);
addMesh('nose_splitter_prism_right', new BoxGeometry(0.07, 0.2, 0.07), coreMaterial, [0.12, 0.98, 0.23], [0, 0, 0.32]);
addMesh('chin_rail_muzzle', new CylinderGeometry(0.035, 0.055, 0.34, 6), weaponMaterial, [0, 1.22, 0.02], [Math.PI / 2, 0, 0]);
addMesh('left_nose_upgrade_bus', new BoxGeometry(0.05, 0.34, 0.05), goldMaterial, [-0.16, 0.76, 0.2], [0, 0, -0.18]);
addMesh('right_nose_upgrade_bus', new BoxGeometry(0.05, 0.34, 0.05), goldMaterial, [0.16, 0.76, 0.2], [0, 0, 0.18]);
addMesh('nose_capacitor_lens', new BoxGeometry(0.08, 0.08, 0.06), coreMaterial, [0, 0.62, 0.28], [0, 0, Math.PI / 4]);
addMesh('nose_ceramic_bridge_plate', new BoxGeometry(0.18, 0.1, 0.045), ceramicMaterial, [0, 0.76, 0.31], [0, 0, 0]);
addMirroredMesh('nose_recessed_fastener_front', new BoxGeometry(0.045, 0.045, 0.035), bracketMaterial, 0.115, 0.84, 0.34, Math.PI / 4);
addMirroredMesh('nose_recessed_fastener_rear', new BoxGeometry(0.04, 0.04, 0.035), bracketMaterial, 0.145, 0.62, 0.26, Math.PI / 4);
addMirroredMesh('nose_side_armor_tile', new BoxGeometry(0.08, 0.2, 0.045), ceramicMaterial, 0.24, 0.55, 0.18, 0.28);
addMirroredMesh('nose_rail_outer_shroud', new BoxGeometry(0.075, 0.44, 0.055), bracketMaterial, 0.24, 0.9, 0.27, 0.16);
addMirroredMesh('nose_rail_ceramic_cheek', new BoxGeometry(0.06, 0.24, 0.04), ceramicMaterial, 0.31, 0.82, 0.22, 0.22);
addMirroredMesh('nose_muzzle_micro_lens', new BoxGeometry(0.055, 0.055, 0.05), coreMaterial, 0.21, 1.16, 0.24, Math.PI / 4);
addMirroredMesh('nose_rail_heat_sink', new BoxGeometry(0.04, 0.18, 0.04), goldMaterial, 0.3, 0.66, 0.27, 0.2);
addMesh('cockpit_front_canopy', new BoxGeometry(0.2, 0.28, 0.12), coreMaterial, [0, 0.3, 0.22], [0, 0, Math.PI / 4]);
addMesh('cockpit_rear_canopy', new BoxGeometry(0.24, 0.26, 0.12), coreMaterial, [0, 0.02, 0.18], [0, 0, Math.PI / 4]);
addMesh('cockpit_front_retainer', new BoxGeometry(0.28, 0.045, 0.045), bracketMaterial, [0, 0.44, 0.3], [0, 0, 0]);
addMesh('cockpit_rear_retainer', new BoxGeometry(0.32, 0.045, 0.045), bracketMaterial, [0, -0.13, 0.26], [0, 0, 0]);
addMesh('left_upper_armor', new BoxGeometry(0.13, 0.88, 0.09), armorMaterial, [-0.2, -0.14, 0.12], [0, 0, -0.18]);
addMesh('right_upper_armor', new BoxGeometry(0.13, 0.88, 0.09), armorMaterial, [0.2, -0.14, 0.12], [0, 0, 0.18]);
addMirroredMesh('upper_layered_chevron_plate', new BoxGeometry(0.08, 0.24, 0.045), ceramicMaterial, 0.18, -0.32, 0.24, 0.28);
addMirroredMesh('upper_service_hatch', new BoxGeometry(0.075, 0.16, 0.04), bracketMaterial, 0.17, 0.05, 0.29, 0.22);
addMesh('left_canopy_cheek_plate', new BoxGeometry(0.08, 0.42, 0.08), armorMaterial, [-0.18, 0.18, 0.25], [0, 0, -0.22]);
addMesh('right_canopy_cheek_plate', new BoxGeometry(0.08, 0.42, 0.08), armorMaterial, [0.18, 0.18, 0.25], [0, 0, 0.22]);
addMesh('left_shield_projector_node', new BoxGeometry(0.09, 0.16, 0.08), goldMaterial, [-0.3, 0.04, 0.3], [0, 0, -0.34]);
addMesh('right_shield_projector_node', new BoxGeometry(0.09, 0.16, 0.08), goldMaterial, [0.3, 0.04, 0.3], [0, 0, 0.34]);
addMesh('left_shield_arc_socket', new BoxGeometry(0.07, 0.18, 0.06), coreMaterial, [-0.42, -0.08, 0.24], [0, 0, -0.42]);
addMesh('right_shield_arc_socket', new BoxGeometry(0.07, 0.18, 0.06), coreMaterial, [0.42, -0.08, 0.24], [0, 0, 0.42]);
addMirroredMesh('shield_generator_outer_leaf', new BoxGeometry(0.07, 0.3, 0.055), ceramicMaterial, 0.5, 0.02, 0.34, 0.56);
addMirroredMesh('shield_generator_black_retainer', new BoxGeometry(0.045, 0.24, 0.04), bracketMaterial, 0.56, -0.12, 0.32, 0.64);
addMirroredMesh('shield_capacitor_lens', new BoxGeometry(0.065, 0.065, 0.055), coreMaterial, 0.46, 0.16, 0.38, Math.PI / 4);
addMirroredMesh('shield_relay_heat_sink', new BoxGeometry(0.04, 0.18, 0.04), goldMaterial, 0.36, -0.18, 0.31, 0.42);

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
addMesh('left_wing_armor_rib_outer', new BoxGeometry(0.08, 0.52, 0.08), armorMaterial, [-1.08, -0.46, 0.14], [0, 0, -0.42]);
addMesh('right_wing_armor_rib_outer', new BoxGeometry(0.08, 0.52, 0.08), armorMaterial, [1.08, -0.46, 0.14], [0, 0, 0.42]);
addMesh('left_wing_fold_hinge', new BoxGeometry(0.09, 0.18, 0.07), goldMaterial, [-0.62, -0.28, 0.18], [0, 0, -0.36]);
addMesh('right_wing_fold_hinge', new BoxGeometry(0.09, 0.18, 0.07), goldMaterial, [0.62, -0.28, 0.18], [0, 0, 0.36]);
addMesh('left_wing_power_bus', new BoxGeometry(0.05, 0.48, 0.05), coreMaterial, [-0.78, -0.48, 0.19], [0, 0, -0.48]);
addMesh('right_wing_power_bus', new BoxGeometry(0.05, 0.48, 0.05), coreMaterial, [0.78, -0.48, 0.19], [0, 0, 0.48]);
addMirroredMesh('wing_root_ceramic_doubler', new BoxGeometry(0.16, 0.28, 0.04), ceramicMaterial, 0.52, -0.34, 0.24, 0.34);
addMirroredMesh('wing_outer_access_panel', new BoxGeometry(0.11, 0.2, 0.04), ceramicMaterial, 1.05, -0.62, 0.2, 0.46);
addMirroredMesh('wing_hinge_pin_top', new BoxGeometry(0.045, 0.08, 0.045), bracketMaterial, 0.6, -0.19, 0.25, Math.PI / 4);
addMirroredMesh('wing_hinge_pin_bottom', new BoxGeometry(0.045, 0.08, 0.045), bracketMaterial, 0.68, -0.38, 0.22, Math.PI / 4);
addMesh('left_ultra_capacitor_mount', new BoxGeometry(0.1, 0.18, 0.08), weaponMaterial, [-1.28, -0.82, 0.18], [0, 0, -0.34]);
addMesh('right_ultra_capacitor_mount', new BoxGeometry(0.1, 0.18, 0.08), weaponMaterial, [1.28, -0.82, 0.18], [0, 0, 0.34]);
addMesh('left_wing_aux_cannon_barrel', new CylinderGeometry(0.035, 0.05, 0.46, 6), weaponMaterial, [-1.04, -0.42, 0.2], [Math.PI / 2, 0, -0.28]);
addMesh('right_wing_aux_cannon_barrel', new CylinderGeometry(0.035, 0.05, 0.46, 6), weaponMaterial, [1.04, -0.42, 0.2], [Math.PI / 2, 0, 0.28]);
addMesh('left_wing_aux_cannon_tip', new BoxGeometry(0.08, 0.08, 0.07), goldMaterial, [-1.1, -0.22, 0.22], [0, 0, -0.28]);
addMesh('right_wing_aux_cannon_tip', new BoxGeometry(0.08, 0.08, 0.07), goldMaterial, [1.1, -0.22, 0.22], [0, 0, 0.28]);
addMirroredMesh('wing_aux_barrel_shroud', new BoxGeometry(0.12, 0.24, 0.055), bracketMaterial, 1.02, -0.42, 0.28, 0.28);
addMirroredMesh('wing_aux_heat_slot_front', new BoxGeometry(0.035, 0.13, 0.035), ceramicMaterial, 1.0, -0.28, 0.34, 0.34);
addMirroredMesh('wing_aux_heat_slot_rear', new BoxGeometry(0.035, 0.13, 0.035), ceramicMaterial, 0.94, -0.56, 0.32, 0.26);
addMirroredMesh('wing_storm_rail_spine', new BoxGeometry(0.085, 0.54, 0.055), bracketMaterial, 1.2, -0.38, 0.3, 0.5);
addMirroredMesh('wing_splitter_blade_emitter', new BoxGeometry(0.08, 0.3, 0.055), coreMaterial, 1.34, -0.16, 0.28, 0.7);
addMirroredMesh('wing_capacitor_ceramic_cap', new BoxGeometry(0.12, 0.1, 0.045), ceramicMaterial, 1.2, -0.68, 0.3, 0.5);
addMirroredMesh('wing_outer_muzzle_lens', new BoxGeometry(0.065, 0.065, 0.055), goldMaterial, 1.36, 0.02, 0.3, Math.PI / 4);
addMesh('left_wing_aux_cooling_fin_front', new BoxGeometry(0.05, 0.24, 0.06), armorMaterial, [-0.96, -0.22, 0.27], [0, 0, -0.34]);
addMesh('right_wing_aux_cooling_fin_front', new BoxGeometry(0.05, 0.24, 0.06), armorMaterial, [0.96, -0.22, 0.27], [0, 0, 0.34]);
addMesh('left_wing_aux_cooling_fin_rear', new BoxGeometry(0.05, 0.22, 0.06), armorMaterial, [-0.92, -0.55, 0.25], [0, 0, -0.26]);
addMesh('right_wing_aux_cooling_fin_rear', new BoxGeometry(0.05, 0.22, 0.06), armorMaterial, [0.92, -0.55, 0.25], [0, 0, 0.26]);
addMesh('left_outer_micro_fin', new BoxGeometry(0.07, 0.42, 0.08), goldMaterial, [-1.39, -0.5, 0.12], [0, 0, -0.52]);
addMesh('right_outer_micro_fin', new BoxGeometry(0.07, 0.42, 0.08), goldMaterial, [1.39, -0.5, 0.12], [0, 0, 0.52]);
addMesh('left_underwing_hardpoint', new BoxGeometry(0.14, 0.32, 0.1), weaponMaterial, [-0.86, -0.48, -0.08], [0, 0, -0.22]);
addMesh('right_underwing_hardpoint', new BoxGeometry(0.14, 0.32, 0.1), weaponMaterial, [0.86, -0.48, -0.08], [0, 0, 0.22]);
addMesh('left_underwing_pylon_front', new BoxGeometry(0.06, 0.22, 0.07), goldMaterial, [-0.72, -0.34, -0.13], [0, 0, -0.18]);
addMesh('right_underwing_pylon_front', new BoxGeometry(0.06, 0.22, 0.07), goldMaterial, [0.72, -0.34, -0.13], [0, 0, 0.18]);
addMesh('left_underwing_pylon_rear', new BoxGeometry(0.06, 0.2, 0.07), goldMaterial, [-0.98, -0.58, -0.13], [0, 0, -0.28]);
addMesh('right_underwing_pylon_rear', new BoxGeometry(0.06, 0.2, 0.07), goldMaterial, [0.98, -0.58, -0.13], [0, 0, 0.28]);
addMirroredMesh('underwing_black_bracket_front', new BoxGeometry(0.08, 0.08, 0.04), bracketMaterial, 0.74, -0.34, -0.2, 0.18);
addMirroredMesh('underwing_black_bracket_rear', new BoxGeometry(0.08, 0.08, 0.04), bracketMaterial, 1.0, -0.58, -0.2, 0.28);
addMesh('left_aux_weapon_muzzle', new BoxGeometry(0.08, 0.18, 0.08), goldMaterial, [-0.88, -0.28, 0.04], [0, 0, -0.18]);
addMesh('right_aux_weapon_muzzle', new BoxGeometry(0.08, 0.18, 0.08), goldMaterial, [0.88, -0.28, 0.04], [0, 0, 0.18]);
addMesh('left_aux_feed_rail', new BoxGeometry(0.06, 0.34, 0.06), weaponMaterial, [-0.64, -0.44, 0.13], [0, 0, -0.28]);
addMesh('right_aux_feed_rail', new BoxGeometry(0.06, 0.34, 0.06), weaponMaterial, [0.64, -0.44, 0.13], [0, 0, 0.28]);
addMesh('left_aux_ammo_cell', new BoxGeometry(0.11, 0.18, 0.08), weaponMaterial, [-0.74, -0.52, 0.02], [0, 0, -0.22]);
addMesh('right_aux_ammo_cell', new BoxGeometry(0.11, 0.18, 0.08), weaponMaterial, [0.74, -0.52, 0.02], [0, 0, 0.22]);
addMesh('left_aux_ammo_lens', new BoxGeometry(0.06, 0.06, 0.06), coreMaterial, [-0.72, -0.4, 0.09], [0, 0, Math.PI / 4]);
addMesh('right_aux_ammo_lens', new BoxGeometry(0.06, 0.06, 0.06), coreMaterial, [0.72, -0.4, 0.09], [0, 0, Math.PI / 4]);
addMesh('left_drone_docking_rail', new BoxGeometry(0.11, 0.44, 0.08), armorMaterial, [-1.04, -0.78, 0.14], [0, 0, -0.44]);
addMesh('right_drone_docking_rail', new BoxGeometry(0.11, 0.44, 0.08), armorMaterial, [1.04, -0.78, 0.14], [0, 0, 0.44]);
addMesh('left_drone_outer_guide', new BoxGeometry(0.07, 0.38, 0.07), armorMaterial, [-1.32, -0.86, 0.12], [0, 0, -0.56]);
addMesh('right_drone_outer_guide', new BoxGeometry(0.07, 0.38, 0.07), armorMaterial, [1.32, -0.86, 0.12], [0, 0, 0.56]);
addMesh('left_drone_lock_claw', new BoxGeometry(0.08, 0.18, 0.07), goldMaterial, [-1.16, -0.92, 0.18], [0, 0, -0.5]);
addMesh('right_drone_lock_claw', new BoxGeometry(0.08, 0.18, 0.07), goldMaterial, [1.16, -0.92, 0.18], [0, 0, 0.5]);
addMirroredMesh('drone_dock_backstop_plate', new BoxGeometry(0.13, 0.08, 0.05), bracketMaterial, 1.16, -1.06, 0.2, 0.5);
addMirroredMesh('drone_dock_outer_bolt_top', new BoxGeometry(0.04, 0.04, 0.035), bracketMaterial, 1.36, -0.7, 0.2, Math.PI / 4);
addMirroredMesh('drone_dock_outer_bolt_bottom', new BoxGeometry(0.04, 0.04, 0.035), bracketMaterial, 1.42, -0.96, 0.18, Math.PI / 4);
addMesh('left_drone_power_socket', new BoxGeometry(0.08, 0.08, 0.08), coreMaterial, [-1.26, -0.76, 0.24], [0, 0, Math.PI / 4]);
addMesh('right_drone_power_socket', new BoxGeometry(0.08, 0.08, 0.08), coreMaterial, [1.26, -0.76, 0.24], [0, 0, Math.PI / 4]);
addMesh('left_escort_release_tab', new BoxGeometry(0.08, 0.2, 0.06), goldMaterial, [-1.5, -0.88, 0.16], [0, 0, -0.6]);
addMesh('right_escort_release_tab', new BoxGeometry(0.08, 0.2, 0.06), goldMaterial, [1.5, -0.88, 0.16], [0, 0, 0.6]);
addMesh('left_drone_charge_cable', new BoxGeometry(0.05, 0.34, 0.05), coreMaterial, [-1.2, -0.62, 0.2], [0, 0, -0.64]);
addMesh('right_drone_charge_cable', new BoxGeometry(0.05, 0.34, 0.05), coreMaterial, [1.2, -0.62, 0.2], [0, 0, 0.64]);
addMesh('left_drone_sync_beacon', new BoxGeometry(0.07, 0.07, 0.07), goldMaterial, [-1.42, -0.72, 0.19], [0, 0, Math.PI / 4]);
addMesh('right_drone_sync_beacon', new BoxGeometry(0.07, 0.07, 0.07), goldMaterial, [1.42, -0.72, 0.19], [0, 0, Math.PI / 4]);
addMirroredMesh('escort_launch_sleeve', new BoxGeometry(0.1, 0.36, 0.07), bracketMaterial, 1.5, -0.86, 0.22, 0.58);
addMirroredMesh('escort_weapon_pivot', new BoxGeometry(0.075, 0.16, 0.06), weaponMaterial, 1.62, -0.68, 0.24, 0.66);
addMirroredMesh('escort_refuel_probe', new BoxGeometry(0.04, 0.26, 0.04), goldMaterial, 1.28, -0.52, 0.26, 0.62);
addMirroredMesh('escort_lock_beacon', new BoxGeometry(0.06, 0.06, 0.055), coreMaterial, 1.56, -1.04, 0.24, Math.PI / 4);
addMirroredMesh('escort_service_panel', new BoxGeometry(0.1, 0.14, 0.04), ceramicMaterial, 1.18, -0.82, 0.24, 0.48);
addMesh('left_air_intake', new BoxGeometry(0.14, 0.32, 0.11), armorMaterial, [-0.33, -0.72, 0.04], [0, 0, -0.08]);
addMesh('right_air_intake', new BoxGeometry(0.14, 0.32, 0.11), armorMaterial, [0.33, -0.72, 0.04], [0, 0, 0.08]);
addMesh('left_intake_glow_slit', new BoxGeometry(0.08, 0.24, 0.06), coreMaterial, [-0.43, -0.66, 0.12], [0, 0, -0.12]);
addMesh('right_intake_glow_slit', new BoxGeometry(0.08, 0.24, 0.06), coreMaterial, [0.43, -0.66, 0.12], [0, 0, 0.12]);

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
addMesh('tail_spine_ceramic_cap', new BoxGeometry(0.18, 0.18, 0.045), ceramicMaterial, [0, -1.04, 0.31], [0, 0, 0]);
addMesh('left_tail_fin', new BoxGeometry(0.09, 0.48, 0.12), coreMaterial, [-0.18, -1.06, 0.12], [0, 0, -0.2]);
addMesh('right_tail_fin', new BoxGeometry(0.09, 0.48, 0.12), coreMaterial, [0.18, -1.06, 0.12], [0, 0, 0.2]);
addMesh('left_tail_heat_sink', new BoxGeometry(0.08, 0.36, 0.12), goldMaterial, [-0.46, -1.0, 0.12], [0, 0, -0.34]);
addMesh('right_tail_heat_sink', new BoxGeometry(0.08, 0.36, 0.12), goldMaterial, [0.46, -1.0, 0.12], [0, 0, 0.34]);
addMirroredMesh('tail_heat_sink_fin_upper', new BoxGeometry(0.045, 0.2, 0.04), ceramicMaterial, 0.52, -0.9, 0.23, 0.36);
addMirroredMesh('tail_heat_sink_fin_lower', new BoxGeometry(0.045, 0.18, 0.04), ceramicMaterial, 0.55, -1.08, 0.2, 0.4);
addMesh('rear_energy_capacitor', new BoxGeometry(0.18, 0.18, 0.1), weaponMaterial, [0, -0.92, 0.29], [0, 0, Math.PI / 4]);
addMesh('tail_overdrive_bridge', new BoxGeometry(0.44, 0.1, 0.08), goldMaterial, [0, -1.18, 0.22], [0, 0, 0]);
addMesh('tail_overdrive_black_retainer', new BoxGeometry(0.5, 0.045, 0.04), bracketMaterial, [0, -1.25, 0.28], [0, 0, 0]);
addMirroredMesh('rear_external_weapon_pylon', new BoxGeometry(0.08, 0.34, 0.07), bracketMaterial, 0.72, -1.1, 0.12, 0.24);
addMirroredMesh('rear_external_ordnance_pod', new BoxGeometry(0.22, 0.58, 0.16), armorMaterial, 0.82, -1.34, 0.02, 0.08);
addMirroredMesh('rear_ordnance_ceramic_face', new BoxGeometry(0.18, 0.12, 0.045), ceramicMaterial, 0.82, -1.06, 0.12, 0.08);
addMirroredMesh('rear_ordnance_black_retainer', new BoxGeometry(0.24, 0.045, 0.04), bracketMaterial, 0.82, -1.58, 0.12, 0.08);
addMirroredMesh('rear_ordnance_muzzle_core', new BoxGeometry(0.09, 0.09, 0.07), weaponMaterial, 0.82, -1.68, 0.08, Math.PI / 4);
addMirroredMesh('rear_pod_heat_slot_outer', new BoxGeometry(0.045, 0.22, 0.04), goldMaterial, 0.96, -1.34, 0.12, 0.08);
addMirroredMesh('rear_pod_heat_slot_inner', new BoxGeometry(0.04, 0.18, 0.04), coreMaterial, 0.68, -1.34, 0.14, 0.08);
addMesh('tail_upgrade_bus_left', new BoxGeometry(0.06, 0.28, 0.06), coreMaterial, [-0.12, -1.12, 0.3], [0, 0, -0.18]);
addMesh('tail_upgrade_bus_right', new BoxGeometry(0.06, 0.28, 0.06), coreMaterial, [0.12, -1.12, 0.3], [0, 0, 0.18]);
addMesh('tail_afterburner_vane_left', new BoxGeometry(0.08, 0.34, 0.08), coreMaterial, [-0.18, -1.34, 0.16], [0, 0, -0.22]);
addMesh('tail_afterburner_vane_right', new BoxGeometry(0.08, 0.34, 0.08), coreMaterial, [0.18, -1.34, 0.16], [0, 0, 0.22]);
addMesh('left_engine_pod', new BoxGeometry(0.26, 0.46, 0.2), armorMaterial, [-0.31, -1.04, -0.05], [0, 0, -0.07]);
addMesh('right_engine_pod', new BoxGeometry(0.26, 0.46, 0.2), armorMaterial, [0.31, -1.04, -0.05], [0, 0, 0.07]);
addMirroredMesh('engine_side_mount_strut', new BoxGeometry(0.055, 0.2, 0.055), bracketMaterial, 0.46, -1.14, 0.02, 0.22);
addMirroredMesh('engine_ceramic_service_panel', new BoxGeometry(0.12, 0.16, 0.04), ceramicMaterial, 0.31, -0.92, 0.08, 0.08);
addMesh('left_engine_nozzle_lip', new CylinderGeometry(0.12, 0.15, 0.08, 7), nozzleMaterial, [-0.31, -1.28, -0.05], [Math.PI / 2, 0, 0]);
addMesh('right_engine_nozzle_lip', new CylinderGeometry(0.12, 0.15, 0.08, 7), nozzleMaterial, [0.31, -1.28, -0.05], [Math.PI / 2, 0, 0]);
addMesh('left_engine_nozzle_core', new CylinderGeometry(0.06, 0.09, 0.06, 7), coreMaterial, [-0.31, -1.33, -0.05], [Math.PI / 2, 0, 0]);
addMesh('right_engine_nozzle_core', new CylinderGeometry(0.06, 0.09, 0.06, 7), coreMaterial, [0.31, -1.33, -0.05], [Math.PI / 2, 0, 0]);

await mkdir(dirname(outputPath), { recursive: true });
const exporter = new GLTFExporter();
const glb = await exporter.parseAsync(bakeByMaterial(ship), { binary: true, onlyVisible: true, trs: false });
await writeFile(outputPath, Buffer.from(glb));

console.log(`Generated ${outputPath}`);

function addMesh(name, geometry, material, position, rotation) {
  const mesh = new Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(position[0], position[1], position[2]);
  mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
  ship.add(mesh);
}

function addMirroredMesh(baseName, geometry, material, x, y, z, rotationZ) {
  addMesh(`left_${baseName}`, geometry.clone(), material, [-x, y, z], [0, 0, -rotationZ]);
  addMesh(`right_${baseName}`, geometry.clone(), material, [x, y, z], [0, 0, rotationZ]);
}

function bakeByMaterial(source) {
  const baked = new Group();
  baked.name = `${source.name}_material_baked`;
  source.updateMatrixWorld(true);

  const buckets = new Map();
  for (const child of source.children) {
    if (!child.isMesh) {
      continue;
    }
    const geometry = child.geometry.clone();
    geometry.applyMatrix4(child.matrixWorld);
    normalizeGeometryForMerge(geometry);
    const bucket = buckets.get(child.material) ?? [];
    bucket.push(geometry);
    buckets.set(child.material, bucket);
  }

  let groupIndex = 0;
  for (const [material, geometries] of buckets) {
    const merged = mergeGeometries(geometries, false);
    if (!merged) {
      throw new Error(`Failed to merge player geometry bucket ${groupIndex}`);
    }
    const mesh = new Mesh(merged, material);
    mesh.name = `player_material_group_${groupIndex}`;
    baked.add(mesh);
    groupIndex += 1;
  }

  return baked;
}

function normalizeGeometryForMerge(geometry) {
  for (const attribute of Object.keys(geometry.attributes)) {
    if (attribute !== 'position' && attribute !== 'normal') {
      geometry.deleteAttribute(attribute);
    }
  }
  if (!geometry.getAttribute('normal')) {
    geometry.computeVertexNormals();
  }
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
