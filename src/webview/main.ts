import { Game } from './engine/Game';

const canvas = document.getElementById('game') as HTMLCanvasElement;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

resize();
window.addEventListener('resize', resize);

const game = new Game(canvas);
game.start();
