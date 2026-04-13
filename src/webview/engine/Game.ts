import { Input } from './Input';

export type GameState = 'title' | 'playing' | 'dead';

export class Game {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly input = new Input();

  state: GameState = 'title';
  private lastTime = 0;
  private running = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;

    window.addEventListener('keydown', (e) => {
      e.preventDefault();
      this.input.handleKeyDown(e.code);
    });
    window.addEventListener('keyup', (e) => {
      e.preventDefault();
      this.input.handleKeyUp(e.code);
    });
  }

  start() {
    this.state = 'playing';
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  stop() {
    this.running = false;
  }

  private loop(time: number) {
    if (!this.running) return;
    const dt = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;
    this.update(dt);
    this.render();
    this.input.endFrame();
    requestAnimationFrame((t) => this.loop(t));
  }

  private update(dt: number) {
    // Placeholder — will be filled in Task 10
  }

  private render() {
    const { ctx, canvas } = this;
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#00ff00';
    ctx.font = '16px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`State: ${this.state}`, 10, 24);
  }
}
