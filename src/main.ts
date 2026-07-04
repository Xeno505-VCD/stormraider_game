import './styles/app.css';
import { Game } from './core/Game';
import { LocalRunStore } from './data/LocalRunStore';
import { loadGameConfig } from './data/GameConfig';
import { BUILD_ID, BUILD_LABEL } from './data/BuildInfo';

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
const bootStatus = document.querySelector<HTMLDivElement>('#boot-status');
const buildBadge = document.querySelector<HTMLDivElement>('#build-badge');
const resultBuild = document.querySelector<HTMLElement>('#result-build');

if (!canvas) {
  throw new Error('Missing #game-canvas element.');
}

const store = new LocalRunStore();

document.documentElement.dataset.buildId = BUILD_ID;
if (buildBadge) {
  buildBadge.textContent = BUILD_LABEL;
  buildBadge.title = BUILD_ID;
}
if (resultBuild) {
  resultBuild.textContent = BUILD_LABEL;
  resultBuild.title = BUILD_ID;
}

loadGameConfig()
  .then((config) => {
    const game = new Game(canvas, store, config);
    return game.start();
  })
  .then(() => {
    bootStatus?.remove();
  })
  .catch((error: unknown) => {
    console.error(error);
    if (bootStatus) {
      bootStatus.textContent = 'BOOT FAILED';
      bootStatus.classList.add('boot-status--error');
    }
  });
