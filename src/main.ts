import './styles/app.css';
import { Game } from './core/Game';
import { LocalRunStore } from './data/LocalRunStore';
import { loadGameConfig } from './data/GameConfig';

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
const bootStatus = document.querySelector<HTMLDivElement>('#boot-status');

if (!canvas) {
  throw new Error('Missing #game-canvas element.');
}

const store = new LocalRunStore();

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
