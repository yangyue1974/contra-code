import { Game } from './engine/Game';

const canvas = document.getElementById('game') as HTMLCanvasElement;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const game = new Game(canvas);
game.start();
