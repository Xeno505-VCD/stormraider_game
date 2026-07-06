import '../styles/model-lab.css';
import {
  AmbientLight,
  Box3,
  BoxGeometry,
  BufferGeometry,
  Color,
  ConeGeometry,
  DirectionalLight,
  GridHelper,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { ModelDefinition } from '../data/GameConfig';

type ModelSlots = Record<string, ModelDefinition>;

const CONFIG_URL = `${import.meta.env.BASE_URL}config/models.json`.replace(/\/config/, '/config');
const canvas = requireElement<HTMLCanvasElement>('model-canvas');
const stage = requireElement<HTMLElement>('model-stage');
const slotSelect = requireElement<HTMLSelectElement>('model-slot');
const fileInput = requireElement<HTMLInputElement>('model-file');
const loadConfigButton = requireElement<HTMLButtonElement>('load-config-model');
const resetButton = requireElement<HTMLButtonElement>('reset-transform');
const copyButton = requireElement<HTMLButtonElement>('copy-config');
const downloadConfigButton = requireElement<HTMLButtonElement>('download-config');
const screenshotButton = requireElement<HTMLButtonElement>('save-screenshot');
const viewGameButton = requireElement<HTMLButtonElement>('view-game');
const viewTopButton = requireElement<HTMLButtonElement>('view-top');
const viewSideButton = requireElement<HTMLButtonElement>('view-side');
const scaleInput = requireElement<HTMLInputElement>('model-scale');
const rotateXInput = requireElement<HTMLInputElement>('model-rotate-x');
const rotateYInput = requireElement<HTMLInputElement>('model-rotate-y');
const rotateZInput = requireElement<HTMLInputElement>('model-rotate-z');
const offsetXInput = requireElement<HTMLInputElement>('model-offset-x');
const offsetYInput = requireElement<HTMLInputElement>('model-offset-y');
const offsetZInput = requireElement<HTMLInputElement>('model-offset-z');
const wireframeInput = requireElement<HTMLInputElement>('toggle-wireframe');
const rotateInput = requireElement<HTMLInputElement>('toggle-rotate');
const mobileFrameInput = requireElement<HTMLInputElement>('toggle-mobile-frame');
const meshesOutput = requireElement<HTMLElement>('model-meshes');
const trianglesOutput = requireElement<HTMLElement>('model-triangles');
const boundsOutput = requireElement<HTMLElement>('model-bounds');
const qualityPanel = requireElement<HTMLElement>('model-quality-status').closest('.model-lab__quality') as HTMLElement;
const qualityStatusOutput = requireElement<HTMLElement>('model-quality-status');
const budgetOutput = requireElement<HTMLElement>('model-budget');
const fitOutput = requireElement<HTMLElement>('model-fit');
const scaleSuggestionOutput = requireElement<HTMLElement>('model-scale-suggestion');
const qualityNoteOutput = requireElement<HTMLElement>('model-quality-note');
const jsonOutput = requireElement<HTMLTextAreaElement>('model-json');
const statusOutput = requireElement<HTMLElement>('model-status');

const SLOT_TARGETS: Record<string, { width: number; depth: number; height: number }> = {
  player_ship: { width: 1.62, depth: 1.8, height: 0.6 },
  enemy_drone: { width: 0.86, depth: 0.92, height: 0.45 },
  enemy_skimmer: { width: 1.02, depth: 0.88, height: 0.42 },
  enemy_sentinel: { width: 1.18, depth: 1.05, height: 0.54 },
  enemy_wraith: { width: 0.84, depth: 1.22, height: 0.5 },
  boss_01: { width: 3.35, depth: 2.3, height: 0.9 },
  boss_02: { width: 3.5, depth: 2.45, height: 1 },
  boss_03: { width: 2.95, depth: 3.05, height: 1 }
};

const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setClearColor(new Color('#070a12'), 1);

const scene = new Scene();
const camera = new PerspectiveCamera(46, 1, 0.1, 100);
camera.position.set(0, -7.4, 5.7);
camera.lookAt(0, 0, 0.35);
scene.add(camera);

scene.add(new AmbientLight('#78dfff', 0.82));
const keyLight = new DirectionalLight('#d8c5ff', 3.4);
keyLight.position.set(3.2, -4, 7);
scene.add(keyLight);

const grid = new GridHelper(8, 16, '#275a88', '#13233a');
grid.rotation.x = Math.PI / 2;
scene.add(grid);

const modelRoot = new Group();
scene.add(modelRoot);

const placeholder = createPlaceholder();
modelRoot.add(placeholder);

const mobileFrame = createMobileFrame();
scene.add(mobileFrame);

let modelSlots: ModelSlots = {};
let currentModel: Object3D | null = placeholder;
let objectUrl: string | null = null;
let animationFrame = 0;

init().catch((error: unknown) => {
  setStatus(error instanceof Error ? error.message : 'Model lab failed to initialize.');
});

async function init(): Promise<void> {
  modelSlots = await fetchJson<ModelSlots>(CONFIG_URL);
  for (const key of Object.keys(modelSlots)) {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = key;
    slotSelect.append(option);
  }
  slotSelect.value = Object.keys(modelSlots)[0] ?? '';
  applySlotToControls();
  bindEvents();
  resize();
  animate();
  setStatus('Ready. Choose a slot or load a local model file.');
}

function bindEvents(): void {
  window.addEventListener('resize', resize);
  slotSelect.addEventListener('change', applySlotToControls);
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) {
      return;
    }
    loadLocalFile(file);
  });
  loadConfigButton.addEventListener('click', () => {
    const slot = modelSlots[slotSelect.value];
    if (!slot) {
      setStatus('No model slot selected.');
      return;
    }
    void loadModelFromUrl(resolveAssetUrl(slot.url), slot.url);
  });
  resetButton.addEventListener('click', applySlotToControls);
  copyButton.addEventListener('click', () => {
    void navigator.clipboard.writeText(jsonOutput.value);
    setStatus('Config snippet copied.');
  });
  downloadConfigButton.addEventListener('click', downloadConfig);
  screenshotButton.addEventListener('click', saveScreenshot);
  viewGameButton.addEventListener('click', () => setCameraView('game'));
  viewTopButton.addEventListener('click', () => setCameraView('top'));
  viewSideButton.addEventListener('click', () => setCameraView('side'));

  for (const input of transformInputs()) {
    input.addEventListener('input', () => {
      applyTransform();
      updateJson();
    });
  }
  wireframeInput.addEventListener('change', applyWireframe);
  mobileFrameInput.addEventListener('change', () => {
    mobileFrame.visible = mobileFrameInput.checked;
  });
  stage.addEventListener('dragover', (event) => {
    event.preventDefault();
    stage.classList.add('is-dragging');
  });
  stage.addEventListener('dragleave', () => {
    stage.classList.remove('is-dragging');
  });
  stage.addEventListener('drop', (event) => {
    event.preventDefault();
    stage.classList.remove('is-dragging');
    const file = event.dataTransfer?.files[0];
    if (!file) {
      return;
    }
    loadLocalFile(file);
  });
}

function loadLocalFile(file: File): void {
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
  }
  objectUrl = URL.createObjectURL(file);
  void loadModelFromUrl(objectUrl, file.name);
}

function applySlotToControls(): void {
  const slot = modelSlots[slotSelect.value];
  if (!slot) {
    return;
  }
  scaleInput.value = String(slot.scale);
  rotateXInput.value = String(slot.rotation[0]);
  rotateYInput.value = String(slot.rotation[1]);
  rotateZInput.value = String(slot.rotation[2]);
  offsetXInput.value = String(slot.offset[0]);
  offsetYInput.value = String(slot.offset[1]);
  offsetZInput.value = String(slot.offset[2]);
  applyTransform();
  updateJson();
  setStatus(slot.enabled ? `Slot URL is enabled: ${slot.url}` : `Slot URL is disabled. Local file preview is available.`);
}

async function loadModelFromUrl(url: string, label: string): Promise<void> {
  setStatus(`Loading ${label}...`);
  try {
    const gltf = await new GLTFLoader().loadAsync(url);
    replaceModel(gltf.scene);
    applyTransform();
    applyWireframe();
    updateStats();
    setStatus(`Loaded ${label}.`);
  } catch (error) {
    replaceModel(placeholder);
    applyTransform();
    updateStats();
    console.warn(error);
    setStatus(`Could not load ${label}. Showing placeholder.`);
  }
}

function setCameraView(view: 'game' | 'top' | 'side'): void {
  if (view === 'top') {
    camera.position.set(0, 0, 7.2);
    camera.lookAt(0, 0, 0);
  } else if (view === 'side') {
    camera.position.set(0, -8, 1.2);
    camera.lookAt(0, 0, 0.3);
  } else {
    camera.position.set(0, -7.4, 5.7);
    camera.lookAt(0, 0, 0.35);
  }
  camera.updateProjectionMatrix();
  setStatus(`${viewLabel(view)} selected.`);
}

function downloadConfig(): void {
  downloadBlob(
    new Blob([jsonOutput.value], { type: 'application/json' }),
    `${slotSelect.value || 'model-slot'}-config.json`
  );
  setStatus('Config JSON downloaded.');
}

function saveScreenshot(): void {
  renderer.render(scene, camera);
  canvas.toBlob((blob) => {
    if (!blob) {
      setStatus('Screenshot failed.');
      return;
    }
    downloadBlob(blob, `${slotSelect.value || 'model'}-preview.png`);
    setStatus('Screenshot saved.');
  }, 'image/png');
}

function replaceModel(next: Object3D): void {
  if (currentModel && currentModel !== placeholder) {
    modelRoot.remove(currentModel);
  }
  if (next !== placeholder) {
    placeholder.visible = false;
    modelRoot.add(next);
  } else {
    placeholder.visible = true;
  }
  currentModel = next;
}

function applyTransform(): void {
  modelRoot.scale.setScalar(readNumber(scaleInput, 1));
  modelRoot.rotation.set(readNumber(rotateXInput, 0), readNumber(rotateYInput, 0), readNumber(rotateZInput, 0));
  modelRoot.position.set(readNumber(offsetXInput, 0), readNumber(offsetYInput, 0), readNumber(offsetZInput, 0));
  updateStats();
}

function applyWireframe(): void {
  const enabled = wireframeInput.checked;
  if (!currentModel) {
    return;
  }
  currentModel.traverse((child) => {
    const mesh = child as Mesh;
    if (!mesh.isMesh) {
      return;
    }
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      if ('wireframe' in material) {
        material.wireframe = enabled;
      }
    }
  });
}

function updateJson(): void {
  const current = modelSlots[slotSelect.value];
  const slot = {
    enabled: current?.enabled ?? false,
    url: current?.url ?? 'models/player/stormraider-player.glb',
    fallback: 'procedural',
    scale: readNumber(scaleInput, 1),
    rotation: [readNumber(rotateXInput, 0), readNumber(rotateYInput, 0), readNumber(rotateZInput, 0)],
    offset: [readNumber(offsetXInput, 0), readNumber(offsetYInput, 0), readNumber(offsetZInput, 0)],
    maxTriangles: current?.maxTriangles ?? 2500,
    notes: current?.notes ?? ''
  };
  jsonOutput.value = JSON.stringify({ [slotSelect.value || 'model_slot']: slot }, null, 2);
}

function updateStats(): void {
  if (!currentModel) {
    return;
  }
  let meshes = 0;
  let triangles = 0;
  currentModel.traverse((child) => {
    const mesh = child as Mesh;
    if (!mesh.isMesh) {
      return;
    }
    meshes += 1;
    triangles += countTriangles(mesh.geometry);
  });
  const bounds = new Box3().setFromObject(modelRoot);
  const size = bounds.getSize(new Vector3());
  meshesOutput.textContent = String(meshes);
  trianglesOutput.textContent = String(Math.round(triangles));
  boundsOutput.textContent = `${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)}`;
  updateQuality(triangles, size);
}

function updateQuality(triangles: number, size: Vector3): void {
  const slot = modelSlots[slotSelect.value];
  const maxTriangles = Math.max(1, slot?.maxTriangles ?? 2500);
  const target = SLOT_TARGETS[slotSelect.value] ?? SLOT_TARGETS.player_ship;
  const isPlaceholder = currentModel === placeholder;
  const triangleRatio = triangles / maxTriangles;
  const fitRatio = Math.max(
    safeRatio(size.x, target.width),
    safeRatio(size.y, target.depth),
    safeRatio(size.z, target.height)
  );
  const smallestFitRatio = Math.min(
    safeRatio(size.x, target.width),
    safeRatio(size.y, target.depth),
    safeRatio(size.z, target.height)
  );
  const currentScale = readNumber(scaleInput, 1);
  const suggestedScale = fitRatio > 0 ? currentScale / fitRatio : currentScale;
  const quality = getQualityLevel(triangleRatio, fitRatio, smallestFitRatio);

  qualityPanel.classList.remove('is-pass', 'is-warn', 'is-fail');
  budgetOutput.textContent = `${Math.round(triangles)} / ${maxTriangles}`;
  scaleSuggestionOutput.textContent = `${suggestedScale.toFixed(2)}x`;

  if (isPlaceholder) {
    qualityStatusOutput.textContent = 'Preview';
    fitOutput.textContent = 'Reference';
    qualityNoteOutput.textContent = 'This is the built-in placeholder. Import or load a GLB/GLTF file to run asset acceptance checks.';
    return;
  }

  qualityPanel.classList.add(`is-${quality.level}`);
  qualityStatusOutput.textContent = quality.label;
  fitOutput.textContent = getFitLabel(fitRatio, smallestFitRatio);
  qualityNoteOutput.textContent = getQualityNote(quality.level, triangleRatio, fitRatio, smallestFitRatio);
}

function animate(): void {
  if (rotateInput.checked) {
    modelRoot.rotation.z += 0.004;
    rotateZInput.value = modelRoot.rotation.z.toFixed(3);
    updateJson();
  }
  renderer.render(scene, camera);
  animationFrame = requestAnimationFrame(animate);
}

function resize(): void {
  const width = canvas.clientWidth || window.innerWidth;
  const height = canvas.clientHeight || window.innerHeight;
  camera.aspect = width / Math.max(1, height);
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

function createPlaceholder(): Group {
  const group = new Group();
  const bodyMaterial = new MeshStandardMaterial({
    color: '#27d8ff',
    emissive: '#104f8f',
    emissiveIntensity: 0.55,
    roughness: 0.42,
    metalness: 0.3,
    flatShading: true
  });
  const wingMaterial = new MeshStandardMaterial({
    color: '#9b5cff',
    emissive: '#2b0f6c',
    emissiveIntensity: 0.68,
    flatShading: true
  });
  const body = new Mesh(new ConeGeometry(0.32, 1.55, 5), bodyMaterial);
  body.rotation.x = Math.PI / 2;
  body.position.y = 0.12;
  const core = new Mesh(new BoxGeometry(0.5, 1.25, 0.22), bodyMaterial);
  core.position.y = -0.34;
  const leftWing = new Mesh(new BoxGeometry(1.35, 0.18, 0.14), wingMaterial);
  leftWing.position.set(-0.74, -0.34, -0.02);
  leftWing.rotation.z = -0.34;
  const rightWing = leftWing.clone();
  rightWing.position.x = 0.74;
  rightWing.rotation.z = 0.34;
  group.add(body, core, leftWing, rightWing);
  return group;
}

function createMobileFrame(): LineSegments {
  const geometry = new BufferGeometry().setFromPoints([
    new Vector3(-1.6, -1.7, 0.02),
    new Vector3(1.6, -1.7, 0.02),
    new Vector3(1.6, -1.7, 0.02),
    new Vector3(1.6, 1.7, 0.02),
    new Vector3(1.6, 1.7, 0.02),
    new Vector3(-1.6, 1.7, 0.02),
    new Vector3(-1.6, 1.7, 0.02),
    new Vector3(-1.6, -1.7, 0.02)
  ]);
  const material = new LineBasicMaterial({ color: '#ff8a3d' });
  const frame = new LineSegments(geometry, material);
  frame.visible = true;
  return frame;
}

function countTriangles(geometry: BufferGeometry): number {
  if (geometry.index) {
    return geometry.index.count / 3;
  }
  const position = geometry.getAttribute('position');
  return position ? position.count / 3 : 0;
}

function safeRatio(value: number, target: number): number {
  if (target <= 0) {
    return 0;
  }
  return value / target;
}

function getQualityLevel(
  triangleRatio: number,
  largestFitRatio: number,
  smallestFitRatio: number
): { level: 'pass' | 'warn' | 'fail'; label: string } {
  if (triangleRatio > 1.25 || largestFitRatio > 1.4 || smallestFitRatio < 0.22) {
    return { level: 'fail', label: 'Fix' };
  }
  if (triangleRatio > 1 || largestFitRatio > 1.12 || smallestFitRatio < 0.38) {
    return { level: 'warn', label: 'Review' };
  }
  return { level: 'pass', label: 'Pass' };
}

function getFitLabel(largestFitRatio: number, smallestFitRatio: number): string {
  if (largestFitRatio > 1.4) {
    return 'Too large';
  }
  if (largestFitRatio > 1.12) {
    return 'Large';
  }
  if (smallestFitRatio < 0.22) {
    return 'Tiny';
  }
  if (smallestFitRatio < 0.38) {
    return 'Small';
  }
  return 'Good';
}

function getQualityNote(
  level: 'pass' | 'warn' | 'fail',
  triangleRatio: number,
  largestFitRatio: number,
  smallestFitRatio: number
): string {
  if (triangleRatio > 1.25) {
    return 'Triangle count is well over budget. Decimate or simplify before enabling this slot.';
  }
  if (largestFitRatio > 1.4) {
    return 'Model is too large for the selected slot. Use the suggested scale, then recheck mobile framing.';
  }
  if (smallestFitRatio < 0.22) {
    return 'Model is much smaller than the selected slot. Scale up or export at a larger unit size.';
  }
  if (level === 'warn') {
    return 'Usable for preview, but adjust budget or scale before committing this model into the game.';
  }
  return 'Model is within the current triangle and size targets for this slot.';
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }
  return (await response.json()) as T;
}

function transformInputs(): HTMLInputElement[] {
  return [scaleInput, rotateXInput, rotateYInput, rotateZInput, offsetXInput, offsetYInput, offsetZInput];
}

function readNumber(input: HTMLInputElement, fallback: number): number {
  const value = Number(input.value);
  return Number.isFinite(value) ? value : fallback;
}

function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing #${id}.`);
  }
  return element as T;
}

function setStatus(message: string): void {
  statusOutput.textContent = message;
}

function resolveAssetUrl(url: string): string {
  if (/^https?:\/\//.test(url) || url.startsWith('/') || url.startsWith('blob:')) {
    return url;
  }
  const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
  return `${base}${url.replace(/^\/+/, '')}`;
}

window.addEventListener('beforeunload', () => {
  cancelAnimationFrame(animationFrame);
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
  }
});

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function viewLabel(view: 'game' | 'top' | 'side'): string {
  return view === 'top' ? 'Top view' : view === 'side' ? 'Side view' : 'Game view';
}
